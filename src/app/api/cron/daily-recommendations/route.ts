import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET/POST /api/cron/daily-recommendations — 每日推荐（由 cron 触发）
// 需在请求头携带 CRON_SECRET 以验证调用来源
export async function GET(request: NextRequest) {
  return handleDailyRecommendations(request);
}
export async function POST(request: NextRequest) {
  return handleDailyRecommendations(request);
}

async function handleDailyRecommendations(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ code: 401, message: "未授权" }, { status: 401 });
  }

  // 获取所有已开启每日推荐且设置了时间的用户
  const preferences = await prisma.userPreference.findMany({
    where: {
      dailyMatchTime: { not: null },
    },
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
  });

  let processedCount = 0;

  for (const pref of preferences) {
    const userId = pref.user.id;

    // 跳过没有完成基础资料的用户
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { profileCompleteness: true },
    });
    if (!user || user.profileCompleteness < 30) continue;

    // 获取该用户已 swipe 过的用户 ID
    const swipedIds = await prisma.userSwipeDecision.findMany({
      where: { viewerId: userId },
      select: { targetUserId: true },
    });
    const excludeIds = swipedIds.map((s) => s.targetUserId);
    excludeIds.push(userId); // 排除自己

    // 基础筛选条件
    const where: Record<string, unknown> = {
      id: { notIn: excludeIds },
      profileCompleteness: { gte: 30 },
    };

    if (pref.expectedGender && pref.expectedGender !== "any") {
      where.gender = pref.expectedGender;
    }
    if (pref.ageMin) {
      where.age = { ...((where.age as Record<string, number>) ?? {}), gte: pref.ageMin };
    }
    if (pref.ageMax) {
      where.age = { ...((where.age as Record<string, number>) ?? {}), lte: pref.ageMax };
    }

    // 简单推荐：随机取 5 个
    const candidates = await prisma.user.findMany({
      where,
      select: { id: true },
      take: 5,
      orderBy: { popularityScore: "desc" },
    });

    if (candidates.length > 0) {
      // 这里可以扩展为发送通知、创建推荐记录等
      console.log(`[daily-recommendations] User ${userId} got ${candidates.length} candidates`);
    }

    processedCount++;
  }

  return NextResponse.json({
    code: 0,
    message: `处理完成`,
    data: { processedCount },
  });
}
