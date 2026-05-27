import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildDemoReport } from "@/lib/demoMatchReport";
import { getScheduleWindow } from "@/lib/matchSchedule";
import { runMatchPipeline } from "@/lib/matchPipeline";
import { buildMatchStory, type UserWithPreference } from "@/lib/matchStory";
import { preferenceSignalHits } from "@/lib/preferenceSignals";

const DAILY_MATCH_LIMIT = 3;

function normScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401, message: "请先登录" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { preference: true, preferenceSignal: true },
  });
  if (!dbUser) return NextResponse.json({ code: 404, message: "用户不存在" }, { status: 404 });

  const schedule = getScheduleWindow({
    time: dbUser.preference?.dailyMatchTime ?? "21:00",
    timezone: dbUser.preference?.dailyMatchTimezone ?? "Asia/Shanghai",
  });
  const todayCount = await prisma.match.count({
    where: { userId: user.id, createdAt: { gte: schedule.todayStartUtc, lt: schedule.tomorrowStartUtc } },
  });

  if (todayCount >= DAILY_MATCH_LIMIT) {
    return NextResponse.json({
      code: 0,
      data: {
        message: `今天的匹配机会已经用完（${DAILY_MATCH_LIMIT}/${DAILY_MATCH_LIMIT}）。先和已有匹配聊聊，明天再来刷新。`,
        alreadyMatchedToday: true,
        pipeline: null,
      },
    });
  }

  const matchedTargetIds = await prisma.match.findMany({
    where: { userId: user.id },
    select: { targetUserId: true },
  });
  const excludeIds = [user.id, ...matchedTargetIds.map((x) => x.targetUserId)];

  const { stages, ranked, selfModel, dimensions, infoSources } = await runMatchPipeline(user.id, excludeIds);

  const remainingSlots = Math.max(0, DAILY_MATCH_LIMIT - todayCount);
  const picks = ranked.slice(0, Math.min(1, remainingSlots));
  const finalStages = [
    ...stages,
    {
      id: "best_pick",
      title: "本轮最佳推荐",
      detail: "从排序结果里保留当前最值得认识的一位。",
      count: picks.length,
    },
  ];

  if (picks.length === 0) {
    return NextResponse.json({
      code: 0,
      data: {
        message:
          ranked.length === 0
            ? "当前候选池里暂时没有同时满足双向偏好且合拍度足够的对象。可以先完善资料或放宽匹配偏好，稍后再试。"
            : "今天暂时没有新的匹配机会，请晚点再试。",
        noQualifiedCandidates: true,
        pipeline: { stages: finalStages, dimensions, infoSources, searchedUserCount: stages[0]?.count ?? 0 },
      },
    });
  }

  const createdMatchIds: string[] = [];
  const selfWithPref = dbUser as UserWithPreference;
  const firstReason = buildMatchStory(selfWithPref, picks[0].candidate as UserWithPreference);

  for (const pick of picks) {
    const status = "connected";
    const outcome = "success";
    const matchReason = buildMatchStory(selfWithPref, pick.candidate as UserWithPreference);
    const lifeStoryScore = normScore((selfModel.dialogDepth + pick.targetModel.dialogDepth) / 2);
    const metrics = {
      totalScore: pick.scored.finalScore,
      interestScore: normScore(pick.scored.explain.vectorSimilarity * 100 * 0.65 + pick.scored.explain.rhythm * 0.35),
      personalityScore: pick.scored.explain.emotion,
      valuesScore: pick.scored.explain.values,
      lifeStoryScore,
      futureScore: pick.scored.explain.attachment,
    };
    const demoReport = buildDemoReport(outcome);
    const signalHits = preferenceSignalHits(dbUser.preferenceSignal, pick.candidate as UserWithPreference);
    const preferenceReasons = signalHits.liked.map((tag) => `你之前对「${tag}」这类特征反馈更积极。`);
    const modelReasons = [
      pick.scored.explain.rhythm >= 75 ? "你们的沟通节奏接近，开始对话的阻力较低。" : "",
      pick.scored.explain.values >= 75 ? "价值观模型显示你们在长期关系里的关键权重较接近。" : "",
      pick.scored.explain.emotion >= 75 ? "情绪表达稳定度接近，适合逐步进入更真实的交流。" : "",
    ].filter(Boolean);
    const mergedReport = {
      ...demoReport,
      matchExplain: pick.scored.explain,
      matchReason,
      recommendationReasons: [
        ...preferenceReasons,
        ...modelReasons,
        "双方关系期待没有明显冲突，适合从轻量但真诚的对话开始。",
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
        summary: matchReason,
        reportJson: JSON.stringify(mergedReport),
      },
    });
    createdMatchIds.push(match.id);
  }

  const matchedName = picks[0].candidate.name ?? "未设置昵称";
  return NextResponse.json({
    code: 0,
    data: {
      createdCount: createdMatchIds.length,
      matchIds: createdMatchIds,
      matchId: createdMatchIds[0] ?? null,
      matchedUser: {
        id: picks[0].candidate.id,
        name: picks[0].candidate.name,
        avatarUrl: picks[0].candidate.avatarUrl,
        bio: picks[0].candidate.bio,
        matchReason: firstReason,
        explain: picks[0].scored.explain,
      },
      message: `已为你找到本轮最值得认识的人：${matchedName}。今天还剩 ${Math.max(0, remainingSlots - 1)} 次匹配机会。`,
      pipeline: { stages: finalStages, dimensions, infoSources, searchedUserCount: stages[0]?.count ?? 0 },
    },
  });
}
