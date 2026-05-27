import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** 演示用：模拟对方回复一条消息（写入 user_target） */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (process.env.NODE_ENV === 'production') return NextResponse.json({ code: 404, message: 'Not found' }, { status: 404 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });
  const { id: matchId } = await params;
  const match = await prisma.match.findFirst({
    where: { id: matchId, userId: user.id },
  });
  if (!match) return NextResponse.json({ code: 404 }, { status: 404 });
  if (match.status !== "connected") {
    return NextResponse.json({ code: 403, message: "请先解锁与对方的聊天" }, { status: 403 });
  }
  const body = await request.json();
  const content = String(body?.content ?? "你好呀，很高兴和你聊天～").trim().slice(0, 200000);
  const msg = await prisma.matchMessage.create({
    data: { matchId, senderType: "user_target", content },
  });

  // 镜像到对方视角，便于联调和双方可见
  let reciprocal = await prisma.match.findFirst({
    where: { userId: match.targetUserId, targetUserId: match.userId },
    select: { id: true, status: true },
  });
  if (!reciprocal) {
    reciprocal = await prisma.match.create({
      data: { userId: match.targetUserId, targetUserId: match.userId, status: "connected" },
      select: { id: true, status: true },
    });
  } else if (reciprocal.status !== "connected") {
    await prisma.match.update({ where: { id: reciprocal.id }, data: { status: "connected" } });
  }
  const reciprocalMatches = await prisma.match.findMany({
    where: { userId: match.targetUserId, targetUserId: match.userId },
    select: { id: true },
  });
  const targetIds = reciprocalMatches.length > 0 ? reciprocalMatches.map((x) => x.id) : [reciprocal.id];
  await prisma.matchMessage.createMany({
    data: targetIds.map((targetMatchId) => ({
      matchId: targetMatchId,
      senderType: "user_self",
      content,
    })),
  });

  return NextResponse.json({
    code: 0,
    data: { id: msg.id, senderType: msg.senderType, content: msg.content, createdAt: msg.createdAt.toISOString() },
  });
}
