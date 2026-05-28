import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeStarStats, dateInTimezone } from "@/lib/starUtils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });

  const { id: matchId } = await params;
  const match = await prisma.match.findFirst({
    where: { id: matchId, userId: user.id },
  });
  if (!match) return NextResponse.json({ code: 404, message: "匹配不存在" }, { status: 404 });

  // Read user's timezone preference
  const pref = await prisma.userPreference.findUnique({
    where: { userId: user.id },
    select: { dailyMatchTimezone: true },
  });
  const tz = pref?.dailyMatchTimezone ?? "Asia/Shanghai";

  const messages = await prisma.matchMessage.findMany({
    where: {
      matchId,
      senderType: { startsWith: "user_" },
    },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const chatDates = messages.map((m) => dateInTimezone(m.createdAt, tz));
  const stats = computeStarStats(chatDates, match.starLitAt, tz);

  // Persist computed stats back to match record
  await prisma.match.update({
    where: { id: matchId },
    data: {
      starDays: stats.starDays,
      chatDayCount: stats.chatDayCount,
      starLitAt: stats.starLitAt ? new Date(stats.starLitAt) : null,
    },
  });

  return NextResponse.json({
    code: 0,
    data: stats,
  });
}
