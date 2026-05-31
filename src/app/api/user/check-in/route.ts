import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkAchievements } from "@/lib/achievements";

// POST /api/user/check-in — 每日签到，连续签到 +1，断签重置
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { dailyStreak: true, lastCheckIn: true },
  });
  if (!dbUser) return NextResponse.json({ code: 404, message: "用户不存在" }, { status: 404 });

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (dbUser.lastCheckIn) {
    const lastDate = new Date(dbUser.lastCheckIn);
    const lastDay = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
    const diffDays = Math.floor((today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return NextResponse.json({ code: 0, message: "今天已签到", data: { dailyStreak: dbUser.dailyStreak, alreadyCheckedIn: true } });
    }

    if (diffDays === 1) {
      // 连续签到
      const newStreak = dbUser.dailyStreak + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: { dailyStreak: newStreak, lastCheckIn: now },
      });
      // Check achievements after check-in
      await checkAchievements(user.id).catch(() => {});
      return NextResponse.json({ code: 0, message: "签到成功", data: { dailyStreak: newStreak, alreadyCheckedIn: false } });
    }

    // 断签，重置为 1
    await prisma.user.update({
      where: { id: user.id },
      data: { dailyStreak: 1, lastCheckIn: now },
    });
    await checkAchievements(user.id).catch(() => {});
    return NextResponse.json({ code: 0, message: "签到成功（断签重置）", data: { dailyStreak: 1, alreadyCheckedIn: false } });
  }

  // 首次签到
  await prisma.user.update({
    where: { id: user.id },
    data: { dailyStreak: 1, lastCheckIn: now },
  });
  await checkAchievements(user.id).catch(() => {});
  return NextResponse.json({ code: 0, message: "首次签到成功", data: { dailyStreak: 1, alreadyCheckedIn: false } });
}
