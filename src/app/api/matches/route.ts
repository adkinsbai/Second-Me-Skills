import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getScheduleWindow } from "@/lib/matchSchedule";

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
  const threshold = prefs?.heartThreshold ?? 80;
  const dailyMatchLimit = 6;
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
      const total = latest?.totalScore ?? 0;
      const reached = total >= threshold;
      const lastReadAt = lastReadMap.get(m.id) ?? new Date(0);
      const unreadCount = await prisma.matchMessage.count({
        where: {
          matchId: m.id,
          senderType: "user_target",
          createdAt: { gt: lastReadAt },
        },
      });

      return {
        id: m.id,
        status: m.status,
        targetUser: m.targetUser,
        totalScore: latest ? total : null,
        reachedThreshold: latest ? reached : false,
        unreadCount,
        updatedAt: m.updatedAt.toISOString(),
      };
    })
  );
  return NextResponse.json({
    code: 0,
    data: {
      list,
      heartThreshold: threshold,
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
