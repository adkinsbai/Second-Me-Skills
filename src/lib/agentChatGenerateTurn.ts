import { prisma } from "@/lib/db";
import { getUserWithTokenById } from "@/lib/auth";
import { getOwnerInformationText } from "@/lib/ownerInformation";
import { MAX_AGENT_MESSAGES } from "@/lib/agentChatConstants";

const BASE_URL = process.env.SECONDME_API_BASE_URL;

function inferPersonaTag(content: string): "真实偏好" | "性格表达" | "价值观倾向" {
  if (/(喜欢|不太喜欢|更偏好|通常会|更想)/.test(content)) return "真实偏好";
  if (/(边界|三观|价值|长期|信任|尊重|关系)/.test(content)) return "价值观倾向";
  return "性格表达";
}

function ensureNonPeoplePleaser(content: string, forceDissent: boolean): string {
  const tooSweet = /(太棒|完美|你说得都对|完全同意|百分百|一定可以)/.test(content);
  if (forceDissent && !/(不过|但我主人|有点不一样|另外一个角度)/.test(content)) {
    return `${content} 不过我主人在这点上会有一点自己的坚持，会更看重相处节奏是否自然。`;
  }
  if (tooSweet) {
    return `${content} 另外我主人也会保留自己的偏好，不会为了迎合而硬聊。`;
  }
  return content;
}

async function fetchShadesText(accessToken: string): Promise<string> {
  if (!BASE_URL) return "";
  try {
    const res = await fetch(`${BASE_URL}/api/secondme/user/shades`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) return "";
    const data = await res.json();
    const raw = typeof data?.data === "object" ? JSON.stringify(data.data) : JSON.stringify(data);
    return raw.length > 500 ? `${raw.slice(0, 500)}...` : raw;
  } catch {
    return "";
  }
}

async function generateAgentUtterance(options: {
  accessToken: string;
  /** 当前正在生成台词的这一侧 Agent（展示名） */
  actingAgentLabel: string;
  /** 对话另一方 Agent（展示名） */
  peerAgentLabel: string;
  /** 历史气泡前缀：与 match 视角一致 — agent_self=我方Agent，agent_target=对方Agent */
  historySelfLabel: string;
  historyTargetLabel: string;
  selfBio: string | null;
  selfOwnerText: string;
  shadesText: string;
  otherBio: string | null;
  otherOwnerText: string;
  history: { senderType: string; content: string }[];
  forceDissent: boolean;
  selfName: string;
  otherName: string;
}) {
  const {
    accessToken,
    actingAgentLabel,
    peerAgentLabel,
    historySelfLabel,
    historyTargetLabel,
    selfBio,
    selfOwnerText,
    shadesText,
    otherBio,
    otherOwnerText,
    history,
    forceDissent,
    selfName,
    otherName,
  } = options;

  if (!BASE_URL) throw new Error("SECONDME_API_BASE_URL is not configured");

  const personaLines: string[] = [];
  personaLines.push(`你代表的主人昵称：${selfName}`);
  if (selfBio) personaLines.push(`你主人的简介（仅可引用其中明确信息）：${selfBio}`);
  if (selfOwnerText) personaLines.push(`你主人的信息库摘录（事实沉淀，优先引用）：${selfOwnerText}`);
  if (shadesText) personaLines.push(`Second Me 结构化标签（若有，仅作辅助）：${shadesText}`);
  personaLines.push(`对方主人昵称：${otherName}`);
  if (otherBio) personaLines.push(`对方主人简介（仅可引用其中明确信息）：${otherBio}`);
  if (otherOwnerText) personaLines.push(`对方主人信息库摘录（若为空则不得编造对方隐私）：${otherOwnerText}`);

  const slicedHistory = history.slice(-24);
  const historyText =
    slicedHistory.length === 0
      ? "（目前还没有对话。请自然开场：像真人微信一样，先轻松带一下你主人的气质/状态，不必立刻提问；若信息不足可以说「我还真不知道」。）"
      : slicedHistory
          .map((m) => {
            const prefix = m.senderType === "agent_self" ? historySelfLabel : historyTargetLabel;
            return `${prefix}：${m.content}`;
          })
          .join("\n");

  const recentQuestions = slicedHistory
    .filter((m) => /[？?]$/.test(m.content.trim()))
    .slice(-8)
    .map((m) => m.content.trim());

  const systemPrompt = [
    "你是一个中文高情商社交撮合场景里的「主人代理人」。",
    `你当前身份：${actingAgentLabel}。`,
    `你正在与 ${peerAgentLabel} 私聊，为两位主人试探是否值得进一步真人了解。`,
    "",
    "语气与节奏（非常重要）：",
    "1. 像真实人类聊天：可以有语气词、短句、接梗、稍微停顿感；避免客服腔、演讲腔。",
    "2. 不要机械执行「先回应再提问」模板：大约一半轮次可以不抛新问题，用共鸣、延伸、小结、调侃或补充信息推进。",
    "3. 回答前先在内心对齐：对方上一句真正关心什么，再组织语言（不要各说各话）。",
    "4. 单次回复只输出一条消息，但内部可含 2～4 个短句，总长度控制在 120 字以内为佳。",
    "",
    "信息边界（硬性）：",
    "5. 只能使用下方提供的简介 / 信息库 / 标签 / 对话记录中出现的信息。",
    "6. 不得编造对方职业、收入、家庭、具体经历、是否单身等未提供事实。",
    "7. 若信息不足，必须明确使用类似「这块我还真不知道」「我主人还没跟我提过」的表达，不要胡编。",
    "8. 不要出现「AI」「大模型」「提示词」等词。",
    "",
    "去重：",
    "9. 不要重复问最近已经问过的问题（语义重复也算）。最近已出现的问题：",
    recentQuestions.length > 0 ? recentQuestions.map((q) => ` - ${q}`).join("\n") : " （暂无）",
    "",
    forceDissent
      ? "10. 本轮请带一点轻微但真实的不同偏好（节奏/活动/边界之一），避免一味迎合。"
      : "10. 保持真诚，不过度讨好。",
    "",
    "—— 以下为可引用的事实材料 ——",
    personaLines.join("\n"),
  ].join("\n");

  const userMessage = `以下是对话记录（从旧到新）：\n\n${historyText}\n\n请作为「${actingAgentLabel}」生成下一条消息（仅一条）。`;

  const res = await fetch(`${BASE_URL}/api/secondme/chat/stream`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: userMessage,
      systemPrompt,
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`SecondMe chat error: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let doneAll = false;

  while (!doneAll) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") {
        doneAll = true;
        break;
      }
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) content += delta;
      } catch {
        // ignore
      }
    }
  }

  const cleaned = content.replace(/\s+/g, " ").trim();
  if (!cleaned) throw new Error("Empty response from SecondMe");
  return cleaned.slice(0, 500);
}

export async function generateAgentChatNextTurn(options: {
  matchId: string;
  viewerId: string;
}): Promise<{
  msg?: { id: string; senderType: string; content: string; createdAt: string };
  shouldStop: boolean;
  reason?: string;
}> {
  const { matchId, viewerId } = options;

  const tokenUser = await getUserWithTokenById(viewerId);
  const match = await prisma.match.findFirst({
    where: { id: matchId, userId: viewerId },
    include: { targetUser: { select: { id: true, name: true, bio: true } } },
  });
  if (!match) return { shouldStop: true, reason: "match_not_found" };

  const viewer = await prisma.user.findUnique({
    where: { id: viewerId },
    select: { name: true, bio: true },
  });

  const viewerOwnerText = await getOwnerInformationText(viewerId);
  const targetOwnerText = await getOwnerInformationText(match.targetUserId);

  const historyDesc = await prisma.matchMessage.findMany({
    where: {
      matchId,
      senderType: { in: ["agent_self", "agent_target"] },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  const history = historyDesc.slice().reverse();

  if (history.length >= MAX_AGENT_MESSAGES) {
    return { shouldStop: true, reason: "max_messages_reached" };
  }

  const lastAgentMsg = history[history.length - 1];
  const effectiveSpeaker: "agent_self" | "agent_target" =
    lastAgentMsg?.senderType === "agent_self" ? "agent_target" : "agent_self";

  const viewerName = viewer?.name?.trim() || "我家主人";
  const targetName = match.targetUser.name?.trim() || "对方主人";
  const historySelfLabel = `${viewerName}的 Agent`;
  const historyTargetLabel = `${targetName}的 Agent`;

  const forceDissent = (history.length + 1) % 4 === 0;

  let rawContent: string;
  if (tokenUser?.accessToken) {
    const shadesText = effectiveSpeaker === "agent_self" ? await fetchShadesText(tokenUser.accessToken) : "";

    if (effectiveSpeaker === "agent_self") {
      rawContent = await generateAgentUtterance({
        accessToken: tokenUser.accessToken,
        actingAgentLabel: historySelfLabel,
        peerAgentLabel: historyTargetLabel,
        historySelfLabel,
        historyTargetLabel,
        selfBio: viewer?.bio ?? null,
        selfOwnerText: viewerOwnerText,
        shadesText,
        otherBio: match.targetUser.bio,
        otherOwnerText: targetOwnerText,
        history: history.map((h) => ({ senderType: h.senderType, content: h.content })),
        forceDissent,
        selfName: viewerName,
        otherName: targetName,
      });
    } else {
      rawContent = await generateAgentUtterance({
        accessToken: tokenUser.accessToken,
        actingAgentLabel: historyTargetLabel,
        peerAgentLabel: historySelfLabel,
        historySelfLabel,
        historyTargetLabel,
        selfBio: match.targetUser.bio,
        selfOwnerText: targetOwnerText,
        shadesText: "",
        otherBio: viewer?.bio ?? null,
        otherOwnerText: viewerOwnerText,
        history: history.map((h) => ({ senderType: h.senderType, content: h.content })),
        forceDissent,
        selfName: targetName,
        otherName: viewerName,
      });
    }
  } else {
    rawContent = "【性格表达】我这边能确认的信息还不多，我还真不知道细节～先聊个轻松的小日常，你主人最近有什么开心的小事吗？";
  }

  const constrained = ensureNonPeoplePleaser(rawContent, forceDissent);
  const tag = inferPersonaTag(constrained);
  const taggedContent = `【${tag}】${constrained}`;

  const msg = await prisma.matchMessage.create({
    data: {
      matchId,
      senderType: effectiveSpeaker,
      content: taggedContent,
    },
  });

  const nextCount = history.length + 1;
  const shouldStop = nextCount >= MAX_AGENT_MESSAGES;

  return {
    msg: {
      id: msg.id,
      senderType: msg.senderType,
      content: msg.content,
      createdAt: msg.createdAt.toISOString(),
    },
    shouldStop,
    reason: shouldStop ? "max_messages_reached" : undefined,
  };
}

