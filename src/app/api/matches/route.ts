import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getScheduleWindow } from "@/lib/matchSchedule";

function extractMatchReason(reportJson?: string | null, summary?: string | null) {
  if (reportJson) {
    try {
      const parsed = JSON.parse(reportJson) as { matchReason?: unknown };
      if (typeof parsed.matchReason === "string" && parsed.matchReason.trim()) return parsed.matchReason;
    } catch {
      // ignore legacy report payloads
    }
  }
  return summary ?? "";
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });
  const matches = await prisma.match.findMany({
    where: { userId: user.id },
    include: {
      targetUser: { select: { id: true, name: true, avatarUrl: true, bio: true } },
      scores: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });
  const prefs = await prisma.userPreference.findUnique({
    where: { userId: user.id },
  });
  const dailyMatchLimit = 3;
  const schedule = getScheduleWindow({
    time: prefs?.dailyMatchTime ?? "21:00",
    timezone: prefs?.dailyMatchTimezone ?? "Asia/Shanghai",
  });
  const todayMatchedCount = await prisma.match.count({
    where: { userId: user.id, createdAt: { gte: schedule.todayStartUtc, lt: schedule.tomorrowStartUtc } },
  });
  const matchIds = matches.map((m) => m.id);
  const reads = await prisma.matchRead.findMany({
    where: { userId: user.id, matchId: { in: matchIds } },
    select: { matchId: true, lastReadAt: true },
  });
  const lastReadMap = new Map(reads.map((r) => [r.matchId, r.lastReadAt]));

  const list = await Promise.all(
    matches.map(async (m) => {
      const latest = m.scores[0];
      const lastReadAt = lastReadMap.get(m.id) ?? new Date(0);
      const unreadCount = await prisma.matchMessage.count({
        where: {
          matchId: m.id,
          senderType: "user_target",
          createdAt: { gt: lastReadAt },
        },
      });

      // Calculate star stats
      const userMessages = await prisma.matchMessage.findMany({
        where: { matchId: m.id, senderType: { startsWith: "user_" } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      });
      const chatDates = userMessages.map((msg) => msg.createdAt.toISOString().split("T")[0]);
      const chatDayCount = new Set(chatDates).size;
      const isStarLit = chatDayCount >= 1;
      // Calculate consecutive days
      let starDays = 0;
      if (chatDates.length > 0) {
        const sorted = Array.from(new Set(chatDates)).sort().reverse();
        const today = new Date().toISOString().split("T")[0];
        if (sorted[0] === today) {
          starDays = 1;
          for (let i = 1; i < sorted.length; i++) {
            const prev = new Date(sorted[i - 1]);
            const curr = new Date(sorted[i]);
            if ((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24) === 1) {
              starDays++;
            } else {
              break;
            }
          }
        }
      }

      return {
        id: m.id,
        status: m.status,
        targetUser: m.targetUser,
        matchReason: latest ? extractMatchReason(latest.reportJson, latest.summary) : "",
        unreadCount,
        starDays,
        starLitAt: m.starLitAt?.toISOString() ?? null,
        chatDayCount,
        isStarLit,
        updatedAt: m.updatedAt.toISOString(),
      };
    })
  );
  return NextResponse.json({
    code: 0,
    data: {
      list,
      dailyMatchLimit,
      dailyMatchTime: schedule.time,
      dailyMatchTimezone: schedule.timezone,
      todayMatchedCount,
      nextDispatchAt: schedule.isBeforeDispatch
        ? schedule.dispatchAtUtc.toISOString()
        : new Date(schedule.dispatchAtUtc.getTime() + 24 * 3600 * 1000).toISOString(),
    },
  });
}
