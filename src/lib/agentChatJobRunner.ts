import { prisma } from "@/lib/db";
import { MAX_AGENT_MESSAGES } from "@/lib/agentChatConstants";
import { generateAgentChatNextTurn } from "@/lib/agentChatGenerateTurn";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 服务端生成循环（用于替代浏览器 keep-alive）。
 * 生成结果写入 `MatchMessage`，页面只负责轮询展示进度。
 */
export async function runAgentChatGenerationJob(matchId: string): Promise<void> {
  try {
    // 允许重入：每轮都重新读取 job 状态，确保 stop/clear 生效。
    // 注意：这是“单进程后台循环”的实现；如部署在会回收 worker 的环境，仍建议用 DB 状态 + 页面恢复展示。
    // Hackathon 场景下一般足够满足“浏览器关掉也不中断”的体验目标。
    while (true) {
      const job = await prisma.agentChatGenerationJob.findUnique({ where: { matchId } });
      if (!job) return;

      if (job.status !== "running") return;

      // 安全兜底：即使 job 状态没更新，也避免超过上限
      const agentMsgCount = await prisma.matchMessage.count({
        where: { matchId, senderType: { in: ["agent_self", "agent_target"] } },
      });
      if (agentMsgCount >= MAX_AGENT_MESSAGES) {
        await prisma.agentChatGenerationJob.update({
          where: { matchId },
          data: { status: "done", generatedCount: agentMsgCount, lastTurnAt: new Date(), stopReason: job.stopReason ?? null },
        });
        return;
      }

      const result = await generateAgentChatNextTurn({
        matchId,
        viewerId: job.ownerUserId,
      });

      const nextCount = agentMsgCount + (result.msg ? 1 : 0);
      if (result.shouldStop) {
        await prisma.agentChatGenerationJob.update({
          where: { matchId },
          data: {
            status: "done",
            generatedCount: Math.max(agentMsgCount, nextCount),
            lastTurnAt: new Date(),
            stopReason: result.reason ?? null,
          },
        });
        return;
      }

      await prisma.agentChatGenerationJob.update({
        where: { matchId },
        data: {
          status: "running",
          generatedCount: nextCount,
          lastTurnAt: new Date(),
        },
      });

      // 生成间隔：避免触发 Second Me 速率限制
      await sleep(2200 + Math.random() * 1800);
    }
  } catch (e) {
    console.error("runAgentChatGenerationJob error", e);
    await prisma.agentChatGenerationJob.updateMany({
      where: { matchId },
      data: {
        status: "failed",
        errorMessage: e instanceof Error ? e.message.slice(0, 500) : "unknown_error",
        lastTurnAt: new Date(),
      },
    });
  }
}

