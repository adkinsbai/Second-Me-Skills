import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/matches/[id]/reactions — 获取该 match 下所有消息的 reactions
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });

  const matchId = params.id;

  // Verify user is part of this match
  const match = await prisma.match.findFirst({
    where: {
      id: matchId,
      OR: [{ userId: user.id }, { targetUserId: user.id }],
    },
    select: { id: true },
  });
  if (!match) {
    return NextResponse.json({ code: 404, message: "匹配不存在" }, { status: 404 });
  }

  // Get all message IDs for this match
  const messages = await prisma.matchMessage.findMany({
    where: { matchId },
    select: { id: true },
  });
  const messageIds = messages.map((m) => m.id);

  if (messageIds.length === 0) {
    return NextResponse.json({ code: 0, data: {} });
  }

  // Get all reactions for these messages
  const reactions = await prisma.messageReaction.findMany({
    where: { messageId: { in: messageIds } },
    select: { messageId: true, emoji: true, userId: true },
  });

  // Group by messageId -> emoji -> userId[]
  const result: Record<string, Record<string, string[]>> = {};
  for (const r of reactions) {
    if (!result[r.messageId]) result[r.messageId] = {};
    if (!result[r.messageId][r.emoji]) result[r.messageId][r.emoji] = [];
    result[r.messageId][r.emoji].push(r.userId);
  }

  return NextResponse.json({ code: 0, data: result });
}

// POST /api/matches/[id]/reactions — 添加或移除一个 reaction
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });

  const matchId = params.id;
  const body = await request.json().catch(() => ({}));
  const messageId = typeof body?.messageId === "string" ? body.messageId : "";
  const emoji = typeof body?.emoji === "string" ? body.emoji : "";

  if (!messageId || !emoji) {
    return NextResponse.json({ code: 400, message: "messageId 和 emoji 必填" }, { status: 400 });
  }

  // Verify user is part of this match
  const match = await prisma.match.findFirst({
    where: {
      id: matchId,
      OR: [{ userId: user.id }, { targetUserId: user.id }],
    },
    select: { id: true },
  });
  if (!match) {
    return NextResponse.json({ code: 404, message: "匹配不存在" }, { status: 404 });
  }

  // Verify message belongs to this match
  const msg = await prisma.matchMessage.findFirst({
    where: { id: messageId, matchId },
    select: { id: true },
  });
  if (!msg) {
    return NextResponse.json({ code: 404, message: "消息不存在" }, { status: 404 });
  }

  // Toggle: if exists, delete; if not, create
  const existing = await prisma.messageReaction.findUnique({
    where: {
      messageId_userId_emoji: { messageId, userId: user.id, emoji },
    },
  });

  if (existing) {
    await prisma.messageReaction.delete({ where: { id: existing.id } });
    return NextResponse.json({ code: 0, data: { action: "removed", emoji } });
  }

  await prisma.messageReaction.create({
    data: { messageId, userId: user.id, emoji },
  });

  return NextResponse.json({ code: 0, data: { action: "added", emoji } });
}
