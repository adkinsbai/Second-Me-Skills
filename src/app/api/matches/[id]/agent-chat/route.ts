import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });
  const { id } = params;
  const match = await prisma.match.findFirst({
    where: { id, userId: user.id },
  });
  if (!match) return NextResponse.json({ code: 404 }, { status: 404 });
  const messages = await prisma.matchMessage.findMany({
    where: { matchId: id, senderType: { in: ["agent_self", "agent_target"] } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({
    code: 0,
    data: messages.map((m) => ({
      id: m.id,
      senderType: m.senderType,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });
  const { id: matchId } = params;
  const match = await prisma.match.findFirst({
    where: { id: matchId, userId: user.id },
  });
  if (!match) return NextResponse.json({ code: 404 }, { status: 404 });
  const body = await request.json();
  const { senderType, content } = body as { senderType: string; content: string };
  if (!senderType || !content) return NextResponse.json({ code: 400 }, { status: 400 });
  const msg = await prisma.matchMessage.create({
    data: {
      matchId,
      senderType: senderType === "agent_target" ? "agent_target" : "agent_self",
      content: String(content).slice(0, 10000),
    },
  });
  return NextResponse.json({
    code: 0,
    data: { id: msg.id, senderType: msg.senderType, content: msg.content, createdAt: msg.createdAt.toISOString() },
  });
}

// 清空当前匹配下的 Agent 对话记录（仅删除 agent_self / agent_target）
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });
  const { id: matchId } = params;

  const match = await prisma.match.findFirst({
    where: { id: matchId, userId: user.id },
  });
  if (!match) return NextResponse.json({ code: 404 }, { status: 404 });

  await prisma.matchMessage.deleteMany({
    where: {
      matchId,
      senderType: { in: ["agent_self", "agent_target"] },
    },
  });

  // 清空对话时也同步停止/重置队列进度
  await prisma.agentChatGenerationJob.upsert({
    where: { matchId },
    create: {
      matchId,
      ownerUserId: user.id,
      status: "stopped",
      stopReason: "cleared",
      generatedCount: 0,
    },
    update: {
      status: "stopped",
      stopReason: "cleared",
      generatedCount: 0,
      lastTurnAt: new Date(),
    },
  });

  return NextResponse.json({ code: 0 });
}

