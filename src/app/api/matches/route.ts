import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getScheduleWindow } from "@/lib/matchSchedule";
import { computeStarStats, dateInTimezone } from "@/lib/starUtils";

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

  // Batch-fetch all messages and unread counts to avoid N+1 queries
  const allMessages = matchIds.length > 0
    ? await prisma.matchMessage.findMany({
        where: { matchId: { in: matchIds }, senderType: { startsWith: "user_" } },
        select: { matchId: true, senderType: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      })
    : [];

  // Group messages by matchId
  const msgsByMatch = new Map<string, { senderType: string; createdAt: Date }[]>();
  for (const msg of allMessages) {
    const list = msgsByMatch.get(msg.matchId);
    if (list) list.push(msg);
    else msgsByMatch.set(msg.matchId, [msg]);
  }

  // Batch-fetch unread counts per match (messages from target since last read)
  const unreadCounts = matchIds.length > 0
    ? await Promise.all(
        matchIds.map(async (matchId) => {
          const lastReadAt = lastReadMap.get(matchId) ?? new Date(0);
          const count = await prisma.matchMessage.count({
            where: { matchId, senderType: "user_target", createdAt: { gt: lastReadAt } },
          });
          return [matchId, count] as const;
        })
      )
    : [];
  const unreadMap = new Map(unreadCounts);

  const list = matches.map((m) => {
    const latest = m.scores[0];
    const userMessages = msgsByMatch.get(m.id) ?? [];
    const chatDates = userMessages.map((msg) => dateInTimezone(msg.createdAt, prefs?.dailyMatchTimezone ?? "Asia/Shanghai"));
    const stats = computeStarStats(chatDates, m.starLitAt, prefs?.dailyMatchTimezone ?? "Asia/Shanghai");

    return {
      id: m.id,
      status: m.status,
      targetUser: m.targetUser,
      matchReason: latest ? extractMatchReason(latest.reportJson, latest.summary) : "",
      unreadCount: unreadMap.get(m.id) ?? 0,
      starDays: stats.starDays,
      starLitAt: stats.starLitAt,
      chatDayCount: stats.chatDayCount,
      isStarLit: stats.isStarLit,
      updatedAt: m.updatedAt.toISOString(),
    };
  });
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
