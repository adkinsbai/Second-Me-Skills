import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MAX_AGENT_MESSAGES } from "@/lib/agentChatConstants";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });

  const match = await prisma.match.findFirst({
    where: { id: params.id, userId: user.id },
    select: { id: true },
  });
  if (!match) return NextResponse.json({ code: 404 }, { status: 404 });

  const agentMsgCount = await prisma.matchMessage.count({
    where: { matchId: params.id, senderType: { in: ["agent_self", "agent_target"] } },
  });

  const job = await prisma.agentChatGenerationJob.findUnique({ where: { matchId: params.id } });

  if (!job) {
    const status = agentMsgCount >= MAX_AGENT_MESSAGES ? "done" : "queued";
    return NextResponse.json({
      code: 0,
      data: {
        status,
        stopReason: null,
        generatedCount: agentMsgCount,
      },
    });
  }

  return NextResponse.json({
    code: 0,
    data: {
      status: job.status,
      stopReason: job.stopReason ?? null,
      generatedCount: job.generatedCount,
      agentMsgCount,
      errorMessage: job.errorMessage ?? null,
    },
  });
}

