import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserWithToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOwnerInformationText } from "@/lib/ownerInformation";

const BASE_URL = process.env.SECONDME_API_BASE_URL;

async function summarizeWithSecondMe(accessToken: string, source: string): Promise<string | null> {
  if (!BASE_URL || !source.trim()) return null;
  const systemPrompt =
    "你是一名中文文案助手。请基于下面的用户介绍，用中文、偏酷一点，只输出一句话，不超过 30 个汉字，不要使用英文，不要加引号，不要解释。";
  const message = `用户自我介绍如下：${source}`;

  const res = await fetch(`${BASE_URL}/api/secondme/chat/stream`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      systemPrompt,
    }),
  });

  if (!res.ok || !res.body) return null;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let summary = "";
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
        if (delta) summary += delta;
      } catch {
        // ignore parse errors
      }
    }
  }

  const cleaned = summary.replace(/\s+/g, " ").trim();
  return cleaned || null;
}

export async function POST(_request: NextRequest) {
  const user = await getCurrentUserWithToken();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { accessToken: true, bio: true, name: true },
  });
  if (!dbUser?.accessToken) {
    return NextResponse.json({ code: 400, message: "缺少 SecondMe 访问令牌" }, { status: 400 });
  }

  const ownerInformationText = await getOwnerInformationText(user.id);
  // 优先使用我们在首页“主人信息库”里沉淀的内容；没有再回退到数据库 bio
  const source = ownerInformationText.trim() ? ownerInformationText : dbUser.bio || "";
  let summary = await summarizeWithSecondMe(dbUser.accessToken, source);
  if (!summary) {
    summary = "还在加载中的有趣灵魂，暂时保留一点神秘。";
  }

  return NextResponse.json({ code: 0, data: { summary } });
}

