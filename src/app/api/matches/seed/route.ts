import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildDemoReport } from "@/lib/demoMatchReport";
import { getScheduleWindow } from "@/lib/matchSchedule";
import { inferUserModel, scoreCompatibility } from "@/lib/userModeling";

function normScore(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

async function getDynamicThreshold(userId: string, baseThreshold: number) {
  const recent = await prisma.match.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 8,
    include: {
      scores: { orderBy: { createdAt: "desc" }, take: 1 },
      messages: { where: { senderType: "user_self" }, select: { id: true } },
    },
  });

  const recentConnectedNoChat = recent
    .filter((m) => m.status === "connected")
    .slice(0, 3)
    .every((m) => m.messages.length === 0);
  const recentNoPass = recent
    .slice(0, 5)
    .every((m) => (m.scores[0]?.totalScore ?? 0) < baseThreshold);

  let next = baseThreshold;
  let hint = "";
  if (recentConnectedNoChat && recent.length >= 3) {
    next = Math.min(90, baseThreshold + 5);
    hint = "检测到最近解锁后互动较少，系统已帮你提高一点阈值，减少无效解锁。";
  } else if (recentNoPass && recent.length >= 5) {
    next = Math.max(55, baseThreshold - 5);
    hint = "你最近匹配偏少，系统已为你放宽一点点阈值，提升发现机会。";
  }
  return { threshold: next, hint };
}

export async function POST() {
  const DAILY_MATCH_LIMIT = 6;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401, message: "请先登录" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { preference: true },
  });
  if (!dbUser) return NextResponse.json({ code: 404, message: "用户不存在" }, { status: 404 });

  const thresholdBase = dbUser.preference?.heartThreshold ?? 80;
  const dynamic = await getDynamicThreshold(user.id, thresholdBase);
  const threshold = dynamic.threshold;
  if (threshold !== thresholdBase) {
    await prisma.userPreference.upsert({
      where: { userId: user.id },
      create: { userId: user.id, heartThreshold: threshold },
      update: { heartThreshold: threshold },
    });
  }

  const schedule = getScheduleWindow({
    time: dbUser.preference?.dailyMatchTime ?? "21:00",
    timezone: dbUser.preference?.dailyMatchTimezone ?? "Asia/Shanghai",
  });
  if (schedule.isBeforeDispatch) {
    return NextResponse.json({
      code: 0,
      data: {
        message: `小丘比还在认真挑选中～今晚 ${schedule.time} 见，我会把更合拍的人悄悄放进你的主页里。`,
        waitingUntil: schedule.dispatchAtUtc.toISOString(),
      },
    });
  }

  const todayCount = await prisma.match.count({
    where: { userId: user.id, createdAt: { gte: schedule.todayStartUtc, lt: schedule.tomorrowStartUtc } },
  });
  if (todayCount >= DAILY_MATCH_LIMIT) {
    return NextResponse.json({
      code: 0,
      data: {
        message: `今天的心动额度已经用完啦（${DAILY_MATCH_LIMIT}/${DAILY_MATCH_LIMIT}）～先去和喜欢的人聊聊，明天再来拆新盲盒叭！`,
        alreadyMatchedToday: true,
      },
    });
  }

  const matchedTargetIds = await prisma.match.findMany({
    where: { userId: user.id },
    select: { targetUserId: true },
  });
  const excludeIds = [user.id, ...matchedTargetIds.map((x) => x.targetUserId)];

  const selfFactsRows = await prisma.ownerFact.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { content: true },
  });
  const selfMsgRows = await prisma.matchMessage.findMany({
    where: { senderType: "user_self", match: { userId: user.id } },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: { content: true, createdAt: true },
  });
  const selfModel = inferUserModel({
    userId: user.id,
    bio: dbUser.bio,
    keywords: dbUser.preference?.keywords ?? null,
    matchTypes: dbUser.preference?.matchTypes ?? null,
    chatPace: dbUser.preference?.chatPace ?? null,
    meetPreference: dbUser.preference?.meetPreference ?? null,
    emotionStyle: dbUser.preference?.emotionStyle ?? null,
    activityTags: dbUser.preference?.activityTags ?? null,
    ownerFacts: selfFactsRows.map((x) => x.content),
    userMessages: selfMsgRows.map((x) => x.content),
    userMessageCreatedAt: selfMsgRows.map((x) => x.createdAt),
  });

  const poolCandidates = await prisma.user.findMany({
    where: {
      id: { notIn: excludeIds },
      authProvider: { not: "" },
    },
    include: { preference: true },
    take: 40,
  });

  const rankedRaw = await Promise.all(
    poolCandidates.map(async (candidate) => {
      const selfRegion = dbUser.preference?.region?.trim().toLowerCase() ?? "";
      const targetRegion = candidate.preference?.region?.trim().toLowerCase() ?? "";
      if (selfRegion && targetRegion && selfRegion !== targetRegion) return null;
      const a1 = dbUser.preference?.ageMin;
      const a2 = dbUser.preference?.ageMax;
      const b1 = candidate.preference?.ageMin;
      const b2 = candidate.preference?.ageMax;
      if (a1 != null && a2 != null && b1 != null && b2 != null && Math.max(a1, b1) > Math.min(a2, b2)) {
        return null;
      }
      const factsRows = await prisma.ownerFact.findMany({
        where: { userId: candidate.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { content: true },
      });
      const msgRows = await prisma.matchMessage.findMany({
        where: { senderType: "user_self", match: { userId: candidate.id } },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: { content: true, createdAt: true },
      });
      const targetModel = inferUserModel({
        userId: candidate.id,
        bio: candidate.bio,
        keywords: candidate.preference?.keywords ?? null,
        matchTypes: candidate.preference?.matchTypes ?? null,
        chatPace: candidate.preference?.chatPace ?? null,
        meetPreference: candidate.preference?.meetPreference ?? null,
        emotionStyle: candidate.preference?.emotionStyle ?? null,
        activityTags: candidate.preference?.activityTags ?? null,
        ownerFacts: factsRows.map((x) => x.content),
        userMessages: msgRows.map((x) => x.content),
        userMessageCreatedAt: msgRows.map((x) => x.createdAt),
      });
      const scored = scoreCompatibility(selfModel, targetModel);
      if (scored.hardRejectReasons.length > 0) return null;
      return { candidate, targetModel, scored };
    })
  );
  const remainingSlots = Math.max(0, DAILY_MATCH_LIMIT - todayCount);
  const ranked = rankedRaw
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => b.scored.finalScore - a.scored.finalScore)
    .slice(0, Math.min(3, remainingSlots));

  if (ranked.length === 0) {
    return NextResponse.json({
      code: 0,
      data: {
        message: "呜噜～今天暂时没遇到特别对味的人，我再努力找找，晚点或明天来看看新的小惊喜呀。",
        noQualifiedCandidates: true,
      },
    });
  }

  const createdMatchIds: string[] = [];
  for (const pick of ranked) {
    const targetThreshold = pick.candidate.preference?.heartThreshold ?? 70;
    const status =
      pick.scored.finalScore >= threshold && pick.scored.finalScore >= targetThreshold
        ? "connected"
        : "screening";
    const outcome = status === "connected" ? "success" : "fail";
    const lifeStoryScore = normScore((selfModel.dialogDepth + pick.targetModel.dialogDepth) / 2);
    const metrics = {
      totalScore: pick.scored.finalScore,
      interestScore: normScore(
        pick.scored.explain.vectorSimilarity * 100 * 0.65 + pick.scored.explain.rhythm * 0.35
      ),
      personalityScore: pick.scored.explain.emotion,
      valuesScore: pick.scored.explain.values,
      lifeStoryScore,
      futureScore: pick.scored.explain.attachment,
    };
    const demoReport = buildDemoReport(outcome);
    const mergedReport = {
      ...demoReport,
      matchExplain: pick.scored.explain,
      recommendationReasons: [
        `沟通节奏匹配度 ${pick.scored.explain.rhythm}%`,
        `情绪互补度 ${pick.scored.explain.emotion}%`,
        `价值观契合度 ${pick.scored.explain.values}%`,
        `依恋类型兼容度 ${pick.scored.explain.attachment}%`,
      ],
    };
    const match = await prisma.match.create({
      data: { userId: user.id, targetUserId: pick.candidate.id, status },
    });
    await prisma.matchScore.create({
      data: {
        matchId: match.id,
        totalScore: metrics.totalScore,
        interestScore: metrics.interestScore,
        personalityScore: metrics.personalityScore,
        valuesScore: metrics.valuesScore,
        lifeStoryScore: metrics.lifeStoryScore,
        futureScore: metrics.futureScore,
        summary:
          outcome === "success"
            ? "你们在兴趣、节奏与价值表达上有较高重合，建议进入真人阶段做真实验证。"
            : "当前匹配仍在观察区，建议通过更多真实对话确认边界与长期节奏。",
        reportJson: JSON.stringify(mergedReport),
      },
    });
    createdMatchIds.push(match.id);
  }

  return NextResponse.json({
    code: 0,
    data: {
      createdCount: createdMatchIds.length,
      matchIds: createdMatchIds,
      matchId: createdMatchIds[0] ?? null,
      message: `叮咚！今天先给你安排了 ${createdMatchIds.length} 位心动候选，慢慢看，不着急，喜欢最重要～`,
      thresholdAdjustedTo: threshold,
      thresholdHint: dynamic.hint || null,
    },
  });
}
