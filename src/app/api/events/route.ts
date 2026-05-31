import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// POST /api/events — 记录用户行为事件（埋点）
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  const body = await request.json().catch(() => ({}));
  const eventType = typeof body?.eventType === "string" ? body.eventType.trim() : "";
  const payload = body?.payload ?? null;

  if (!eventType) {
    return NextResponse.json({ code: 400, message: "eventType 必填" }, { status: 400 });
  }

  // 允许的事件类型白名单（可扩展）
  const allowedEvents = [
    "page_view",
    "swipe",
    "match",
    "chat_send",
    "profile_edit",
    "prompt_answer",
    "check_in",
    "achievement_unlock",
    "discovery_open",
    "town_post",
    "town_like",
    "town_comment",
  ];

  if (!allowedEvents.includes(eventType)) {
    return NextResponse.json({ code: 400, message: `不支持的事件类型: ${eventType}` }, { status: 400 });
  }

  await prisma.userEvent.create({
    data: {
      userId: user?.id ?? null,
      eventType,
      payload: payload ?? undefined,
    },
  });

  return NextResponse.json({ code: 0, message: "事件已记录" });
}
