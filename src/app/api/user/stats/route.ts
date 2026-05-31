import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/user/stats — 获取当前用户统计数据
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      viewCount: true,
      popularityScore: true,
      dailyStreak: true,
      profileCompleteness: true,
      lastCheckIn: true,
    },
  });

  const matchCount = await prisma.match.count({
    where: { userId: user.id },
  });

  const achievementCount = await prisma.achievement.count({
    where: { userId: user.id },
  });

  const promptCount = await prisma.profilePrompt.count({
    where: { userId: user.id },
  });

  // 计算收到的喜欢数（别人对我的 swipe like）
  const likedByCount = await prisma.userSwipeDecision.count({
    where: { targetUserId: user.id, action: "like" },
  });

  return NextResponse.json({
    code: 0,
    data: {
      viewCount: dbUser?.viewCount ?? 0,
      popularityScore: dbUser?.popularityScore ?? 0,
      dailyStreak: dbUser?.dailyStreak ?? 0,
      profileCompleteness: dbUser?.profileCompleteness ?? 0,
      lastCheckIn: dbUser?.lastCheckIn ?? null,
      matchCount,
      achievementCount,
      promptCount,
      likedByCount,
    },
  });
}
