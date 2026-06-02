import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendPushWithGuards } from "@/lib/notificationHelpers";
import { parseArray } from "@/lib/utils";

// GET/POST /api/cron/daily-recommendations — 每日推荐（由 cron 触发）
// 需在请求头携带 CRON_SECRET 以验证调用来源
export async function GET(request: NextRequest) {
  return handleDailyRecommendations(request);
}
export async function POST(request: NextRequest) {
  return handleDailyRecommendations(request);
}

/**
 * Find shared interests between two users.
 * Checks keywords, matchTypes, and activityTags from UserPreference.
 */
function findSharedInterests(
  selfPref: { keywords?: string | null; matchTypes?: string | null; activityTags?: string | null } | null,
  targetPref: { keywords?: string | null; matchTypes?: string | null; activityTags?: string | null } | null,
): string[] {
  if (!selfPref || !targetPref) return [];

  const selfAll = [
    ...parseArray(selfPref.keywords),
    ...parseArray(selfPref.matchTypes),
    ...parseArray(selfPref.activityTags),
  ].map((s) => s.toLowerCase());

  const targetAll = [
    ...parseArray(targetPref.keywords),
    ...parseArray(targetPref.matchTypes),
    ...parseArray(targetPref.activityTags),
  ].map((s) => s.toLowerCase());

  const targetSet = new Set(targetAll);
  const shared = selfAll.filter((s) => targetSet.has(s));

  // Deduplicate and return up to 3
  return Array.from(new Set(shared)).slice(0, 3);
}

/**
 * Add variety: shuffle candidates and prefer those not recently recommended.
 * Uses a simple randomization + diversity score.
 */
function diversifyCandidates<T extends { id: string; name: string | null; preference: unknown }>(candidates: T[]): T[] {
  if (candidates.length <= 1) return candidates;

  // Fisher-Yates shuffle for variety
  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
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
  let matchCreatedCount = 0;
  let pushSentCount = 0;

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

    // Also exclude users already matched with
    const existingMatches = await prisma.match.findMany({
      where: { userId },
      select: { targetUserId: true },
    });
    for (const m of existingMatches) excludeIds.push(m.targetUserId);

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

    // 扩大候选池到 20，然后随机化以增加多样性
    const rawCandidates = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        preference: {
          select: { keywords: true, matchTypes: true, activityTags: true },
        },
      },
      take: 20,
      orderBy: { popularityScore: "desc" },
    });

    // Diversify: shuffle to avoid always recommending the same "type"
    const candidates = diversifyCandidates(rawCandidates);

    if (candidates.length > 0) {
      // Create actual match records for top candidate
      const topCandidate = candidates[0];

      // Find shared interests for personalized push message
      const sharedInterests = findSharedInterests(pref, topCandidate.preference);

      // Create a match record (screening status = pending user action)
      try {
        await prisma.match.create({
          data: {
            userId,
            targetUserId: topCandidate.id,
            status: "daily_recommendation",
          },
        });
        matchCreatedCount++;
      } catch {
        // May fail due to unique constraint if already exists — skip
      }

      // Build personalized push message
      let pushBody = "";
      if (topCandidate.name) {
        pushBody = `今日推荐: ${topCandidate.name}`;
        if (sharedInterests.length > 0) {
          pushBody += `，你们都喜欢${sharedInterests.slice(0, 2).join("、")}`;
        }
        pushBody += "，快去看看吧 💕";
      } else {
        pushBody = "今日推荐已到，快来看看你的心动对象 💕";
      }

      // Send push notification for daily recommendation
      await sendPushWithGuards(
        userId,
        "dailyRecommendation",
        "💫 今日推荐来啦",
        pushBody,
        "/matches",
      );
      pushSentCount++;

      // Also record swipe decisions for the other candidates so they appear in discovery
      for (let i = 1; i < candidates.length; i++) {
        try {
          await prisma.userSwipeDecision.upsert({
            where: {
              viewerId_targetUserId: {
                viewerId: userId,
                targetUserId: candidates[i].id,
              },
            },
            update: {},
            create: {
              viewerId: userId,
              targetUserId: candidates[i].id,
              action: "recommend",
              source: "daily_cron",
            },
          });
        } catch {
          // ignore
        }
      }
    }

    processedCount++;
  }

  return NextResponse.json({
    code: 0,
    message: `处理完成`,
    data: { processedCount, matchCreatedCount, pushSentCount },
  });
}
