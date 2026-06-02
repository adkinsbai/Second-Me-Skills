import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendPush } from "@/lib/send-push";

// GET/POST /api/cron/re-engagement — 每日回流推送（由 cron 触发）
// 需在请求头携带 CRON_SECRET 以验证调用来源
export async function GET(request: NextRequest) {
  return handleReEngagement(request);
}
export async function POST(request: NextRequest) {
  return handleReEngagement(request);
}

async function handleReEngagement(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ code: 401, message: "未授权" }, { status: 401 });
  }

  const now = new Date();

  // ─── 3-day inactive users ───
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // We'll process in three tiers
  const tiers = [
    {
      label: "3day",
      cutoff: threeDaysAgo,
      minAge: fourteenDaysAgo, // registered at least 14 days ago
      title: "有人在等你哦~",
      body: "回来丘比看看吧，说不定有心动的人在等你 💕",
      days: 3,
    },
    {
      label: "7day",
      cutoff: sevenDaysAgo,
      minAge: sevenDaysAgo, // registered at least 7 days ago
      title: "你的丘比想你了！",
      body: "", // Will be filled dynamically with new match count
      days: 7,
    },
    {
      label: "14day",
      cutoff: fourteenDaysAgo,
      minAge: fourteenDaysAgo,
      title: "好久不见！",
      body: "你的画像更新了，快来看看 AI 怎么理解你的 ✨",
      days: 14,
    },
  ];

  let totalSent = 0;
  let totalSkipped = 0;

  for (const tier of tiers) {
    // Find users inactive since the tier cutoff, registered before minAge
    const inactiveUsers = await prisma.user.findMany({
      where: {
        updatedAt: { lt: tier.cutoff },
        createdAt: { lt: tier.minAge },
        deletedAt: null,
        authProvider: { not: "guest" },
      },
      select: {
        id: true,
        name: true,
        updatedAt: true,
      },
      take: 500,
    });

    for (const user of inactiveUsers) {
      // Check notification settings
      const settings = await prisma.notificationSettings.findUnique({
        where: { userId: user.id },
      });

      // Skip if push disabled or re-engagement disabled
      if (settings && !settings.pushEnabled) { totalSkipped++; continue; }
      if (settings && !settings.reEngagement) { totalSkipped++; continue; }

      // Check quiet hours
      if (settings) {
        const quietStart = settings.quietHoursStart ?? 23;
        const quietEnd = settings.quietHoursEnd ?? 8;
        const utcHour = now.getUTCHours();
        const localHour = (utcHour + 8) % 24;
        const inQuiet = quietStart <= quietEnd
          ? localHour >= quietStart && localHour < quietEnd
          : localHour >= quietStart || localHour < quietEnd;
        if (inQuiet) { totalSkipped++; continue; }
      }

      // Avoid spam: check last re-engagement notification sent
      const lastEvent = await prisma.userEvent.findFirst({
        where: {
          userId: user.id,
          eventType: "re_engagement_push",
        },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });

      if (lastEvent) {
        const daysSinceLastPush = (now.getTime() - lastEvent.createdAt.getTime()) / (24 * 60 * 60 * 1000);
        if (daysSinceLastPush < 3) {
          totalSkipped++;
          continue;
        }
      }

      // Build personalized message for 7-day tier
      let body = tier.body;
      if (tier.label === "7day") {
        const newMatchCount = await prisma.match.count({
          where: {
            userId: user.id,
            createdAt: { gte: tier.cutoff },
          },
        });
        body = newMatchCount > 0
          ? `这周有 ${newMatchCount} 个新匹配等你翻牌，回来看看吧！`
          : "回来丘比看看吧，新朋友在等你~";
      }

      // Send push notification (fire-and-forget)
      sendPush(user.id, tier.title, body, "/").catch(() => {});

      // Record event to prevent spam
      await prisma.userEvent.create({
        data: {
          userId: user.id,
          eventType: "re_engagement_push",
          payload: { tier: tier.label, days: tier.days },
        },
      }).catch(() => {});

      totalSent++;
    }
  }

  return NextResponse.json({
    code: 0,
    message: "回流推送完成",
    data: { totalSent, totalSkipped },
  });
}
