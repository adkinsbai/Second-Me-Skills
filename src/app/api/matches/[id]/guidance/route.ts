import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getActionPlan, getDateSuggestion, getRelationshipProgress } from "@/lib/relationshipInsights";
import { IMAGE_DATA_PREFIX } from "@/lib/utils";

type JsonMap = Record<string, unknown>;

function parseReport(raw?: string | null): JsonMap {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === "object" && parsed !== null ? (parsed as JsonMap) : {};
  } catch {
    return {};
  }
}

function stringsFrom(value: unknown, limit = 5) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, limit);
}

function compactText(value: string, limit = 88) {
  const text = (value.startsWith(IMAGE_DATA_PREFIX) ? "分享了一张图片" : value).replace(/\s+/g, " ").trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1)}…`;
}

function unique(items: string[], limit: number) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const text = item.trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    result.push(text);
    if (result.length >= limit) break;
  }
  return result;
}

function buildOpeners(input: {
  targetName: string;
  starterTopics: string[];
  recommendationReasons: string[];
  summary?: string | null;
  lastTargetMessage?: string | null;
}) {
  const targetName = input.targetName || "你";
  const starters = input.starterTopics.map((topic) =>
    topic.includes("？") || topic.includes("?") ? topic : `我看到一个挺适合聊的话题：${topic}。你会从哪里开始讲？`
  );
  const reasons = input.recommendationReasons.map((reason) => `丘比说我们有个共同点很明显：${reason}。我想听听你自己的版本。`);
  const followUp = input.lastTargetMessage
    ? [`刚才你提到“${compactText(input.lastTargetMessage, 34)}”，我有点好奇，这件事对你来说最重要的部分是什么？`]
    : [];

  return unique(
    [
      ...followUp,
      ...starters,
      ...reasons,
      `${targetName}，我刚看完我们的合拍报告，想先从一个轻松的问题开始：最近有什么事让你觉得“还挺值得”的？`,
      "我们别从模板寒暄开始吧。你最近最想认真投入的一件小事是什么？",
      input.summary ? `报告里有一句我挺在意：${compactText(input.summary, 42)}。你看到会觉得准吗？` : "",
    ],
    5
  );
}

function buildReflections(messages: Array<{ senderType: string; content: string }>) {
  const lastSelf = [...messages].reverse().find((message) => message.senderType === "user_self");
  const lastTarget = [...messages].reverse().find((message) => message.senderType === "user_target");
  return unique(
    [
      lastTarget ? `接住 TA 刚才的话题，再补一个自己的真实细节。` : "",
      lastSelf ? `观察 TA 是否回应了你提到的重点：${compactText(lastSelf.content, 34)}` : "",
      "这轮对话先验证聊天节奏，不急着判断关系结论。",
      "如果对方只给短回复，换一个更具体、低压力的问题。",
    ],
    4
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });

  const { id } = await params;
  const match = await prisma.match.findFirst({
    where: { id, userId: user.id },
    include: {
      targetUser: { select: { id: true, name: true, avatarUrl: true, bio: true } },
      scores: { orderBy: { createdAt: "desc" }, take: 1 },
      messages: {
        where: { senderType: { in: ["user_self", "user_target"] } },
        orderBy: { createdAt: "desc" },
        take: 16,
      },
      feedbacks: {
        where: { raterUserId: user.id },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!match) return NextResponse.json({ code: 404 }, { status: 404 });

  const score = match.scores[0];
  const report = parseReport(score?.reportJson);
  const messages = [...match.messages].reverse();
  const targetName = match.targetUser.name ?? "对方";
  const userChatCount = messages.filter((message) => message.senderType === "user_self").length;
  const targetChatCount = messages.filter((message) => message.senderType === "user_target").length;
  const lastTargetMessage = [...messages].reverse().find((message) => message.senderType === "user_target")?.content ?? null;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { preference: { select: { meetPreference: true } } },
  });

  const actionPlan = score
    ? getActionPlan(score.totalScore)
    : ["先用一个具体生活问题开场", "确认对方是否愿意继续聊", "根据回复节奏决定是否深入"];
  const relationshipProgress = score
    ? getRelationshipProgress(score.totalScore, userChatCount)
    : { steps: ["初识", "兴趣相投", "三观对齐", "可语音", "可见面"], current: userChatCount > 0 ? 1 : 0 };
  const dateSuggestion = score
    ? getDateSuggestion({
        interestScore: score.interestScore,
        lifeStoryScore: score.lifeStoryScore,
        meetPreference: dbUser?.preference?.meetPreference ?? null,
      })
    : "先完成一轮自然对话，再判断是否需要语音或线下见面。";

  const starterTopics = unique(stringsFrom(report.starterTopics, 5), 5);
  const recommendationReasons = unique(stringsFrom(report.recommendationReasons, 5), 5);
  const openerSuggestions = buildOpeners({
    targetName,
    starterTopics,
    recommendationReasons,
    summary: score?.summary ?? (typeof report.matchReason === "string" ? report.matchReason : null),
    lastTargetMessage,
  });
  const reflectionPrompts = buildReflections(messages);
  const recentMemories = unique(
    messages
      .filter((message) => !message.content.startsWith(IMAGE_DATA_PREFIX))
      .slice(-4)
      .map((message) => compactText(message.content, 72)),
    4
  );

  return NextResponse.json({
    code: 0,
    data: {
      targetUser: match.targetUser,
      openerSuggestions,
      nextActions: actionPlan,
      reflectionPrompts,
      relationshipProgress,
      dateSuggestion,
      starterTopics,
      recommendationReasons,
      recentMemories,
      messageCount: userChatCount + targetChatCount,
      userChatCount,
      targetChatCount,
      lastFeedbackAt: match.feedbacks[0]?.createdAt.toISOString() ?? null,
    },
  });
}
