import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MAX_AGENT_MESSAGES } from "@/lib/agentChatConstants";
import { runAgentChatGenerationJob } from "@/lib/agentChatJobRunner";

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
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

  const existing = await prisma.agentChatGenerationJob.findUnique({ where: { matchId: params.id } });

  // 已经到上限：直接返回 done，不再开启队列
  if (agentMsgCount >= MAX_AGENT_MESSAGES && existing?.status !== "running") {
    await prisma.agentChatGenerationJob.upsert({
      where: { matchId: params.id },
      create: {
        matchId: params.id,
        ownerUserId: user.id,
        status: "done",
        generatedCount: agentMsgCount,
        stopReason: existing?.stopReason ?? null,
      },
      update: { status: "done", generatedCount: agentMsgCount },
    });
    return NextResponse.json({
      code: 0,
      data: { status: "done", stopReason: existing?.stopReason ?? null, generatedCount: agentMsgCount },
    });
  }

  let shouldSpawn = false;
  if (!existing) {
    await prisma.agentChatGenerationJob.create({
      data: {
        matchId: params.id,
        ownerUserId: user.id,
        status: "running",
        generatedCount: agentMsgCount,
      },
    });
    shouldSpawn = true;
  } else if (existing.status === "running") {
    shouldSpawn = false;
  } else if (existing.status === "stopped") {
    // 只有 clear/reset 的情况下才允许重新开始
    if (existing.stopReason === "cleared") {
      await prisma.agentChatGenerationJob.update({
        where: { matchId: params.id },
        data: { status: "running", stopReason: null, generatedCount: agentMsgCount },
      });
      shouldSpawn = true;
    }
  } else if (existing.status === "queued" || existing.status === "failed") {
    await prisma.agentChatGenerationJob.update({
      where: { matchId: params.id },
      data: { status: "running", stopReason: null, generatedCount: agentMsgCount },
    });
    shouldSpawn = true;
  }

  if (shouldSpawn) {
    // 不等待：让队列在服务端继续跑
    void runAgentChatGenerationJob(params.id);
  }

  const job = await prisma.agentChatGenerationJob.findUnique({ where: { matchId: params.id } });
  return NextResponse.json({
    code: 0,
    data: {
      status: job?.status ?? "queued",
      stopReason: job?.stopReason ?? null,
      generatedCount: job?.generatedCount ?? agentMsgCount,
    },
  });
}

