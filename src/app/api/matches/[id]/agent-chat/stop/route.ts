import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });

  const match = await prisma.match.findFirst({
    where: { id: params.id, userId: user.id },
    select: { id: true },
  });
  if (!match) return NextResponse.json({ code: 404 }, { status: 404 });

  const body = (await request.json().catch(() => null)) as { reason?: string } | null;
  const reason = body?.reason;
  if (!reason || !["low", "high", "cleared"].includes(reason)) {
    return NextResponse.json({ code: 400, message: "invalid reason" }, { status: 400 });
  }

  const agentMsgCount = await prisma.matchMessage.count({
    where: { matchId: params.id, senderType: { in: ["agent_self", "agent_target"] } },
  });

  await prisma.agentChatGenerationJob.upsert({
    where: { matchId: params.id },
    create: {
      matchId: params.id,
      ownerUserId: user.id,
      status: "stopped",
      stopReason: reason,
      generatedCount: agentMsgCount,
    },
    update: {
      status: "stopped",
      stopReason: reason,
      generatedCount: agentMsgCount,
      lastTurnAt: new Date(),
    },
  });

  return NextResponse.json({ code: 0, data: { status: "stopped", stopReason: reason, generatedCount: agentMsgCount } });
}

