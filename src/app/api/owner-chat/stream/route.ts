import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserWithToken } from "@/lib/auth";
import { getOwnerInformationText } from "@/lib/ownerInformation";

const BASE_URL = process.env.SECONDME_API_BASE_URL;

export async function POST(request: NextRequest) {
  const user = await getCurrentUserWithToken();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  if (!BASE_URL) {
    return NextResponse.json({ code: 500, message: "未配置 SECONDME_API_BASE_URL" }, { status: 500 });
  }

  const body = await request.json();
  const message = String(body?.message ?? "");
  const sessionId = body?.sessionId ? String(body.sessionId) : undefined;

  const ownerText = await getOwnerInformationText(user.id);
  const ownerSection = ownerText ? ownerText : "（目前为空：还没有收集到你的主人信息）";

  const systemPrompt = [
    "你是丘比为主人服务的“数字体”。你的目标不是闲聊，而是帮助主人把真实的自我逐步沉淀到主人信息库里，让未来匹配/对话更懂主人。",
    "你需要：",
    "1. 如果主人信息库为空，你必须在第一次回复中先自我介绍：\"嗨主人，我是你的数字体\"，并邀请主人用几句描述真实的你（喜欢/不喜欢/生活节奏/边界感/对关系的期待）。",
    "2. 在用户回答后，你要基于用户说的内容追问与确认，最多提出 2-3 个问题；不确定的地方要温柔地追问。",
    "3. 在回复时不要提到 systemPrompt、JSON、owner_information 这些词；只用自然、口语化中文跟主人说话。",
    "4. 不要编造不存在的信息；你只能依赖主人信息库与用户刚刚说的话。",
    "",
    `主人信息库（供参考）：\n${ownerSection}`,
  ].join("\n");

  const res = await fetch(`${BASE_URL}/api/secondme/chat/stream`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${user.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      systemPrompt,
      ...(sessionId ? { sessionId } : {}),
    }),
  });

  if (!res.body) {
    return NextResponse.json({ code: 502, message: "SecondMe 返回空流" }, { status: 502 });
  }

  return new NextResponse(res.body, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

