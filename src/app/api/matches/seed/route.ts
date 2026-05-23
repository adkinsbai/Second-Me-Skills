import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildDemoReport } from "@/lib/demoMatchReport";
import { getScheduleWindow } from "@/lib/matchSchedule";
import { runMatchPipeline } from "@/lib/matchPipeline";
import { buildMatchStory, type UserWithPreference } from "@/lib/matchStory";

function normScore(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

export async function POST() {
  const DAILY_MATCH_LIMIT = 3;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401, message: "请先登录" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { preference: true },
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
        message: `今天的心动额度已经用完啦（${DAILY_MATCH_LIMIT}/${DAILY_MATCH_LIMIT}）～先去和喜欢的人聊聊，明天再来拆新盲盒叭！`,
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
      title: "本次最合适的人",
      detail: "从排序结果里只保留当前最值得认识的一位",
      count: picks.length,
    },
  ];

  if (picks.length === 0) {
    return NextResponse.json({
      code: 0,
      data: {
        message:
          ranked.length === 0
            ? "呜噜～当前样本里没有同时满足「双向心动设置」且合拍度足够的对象，可先完善资料/心动设置，或晚点再试。"
            : "今天的匹配机会暂时不可用，请明天再试。",
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
      matchReason,
      recommendationReasons: [
        "你们的生活线索里有可以彼此认出的光。",
        "你们对关系与相处的期待，有机会从同一个方向开始生长。",
        "丘比想让这次相遇不只是推荐，而像一个故事的第一句。",
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
      message: `叮咚！本次从候选池里选出了当前最合适的 1 位：${picks[0].candidate.name ?? "未设置昵称"}。今天还剩 ${Math.max(0, remainingSlots - 1)} 次匹配机会。`,
      pipeline: { stages: finalStages, dimensions, infoSources, searchedUserCount: stages[0]?.count ?? 0 },
    },
  });
}
