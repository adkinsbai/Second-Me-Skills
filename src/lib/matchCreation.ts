import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { buildDemoReport } from "@/lib/demoMatchReport";
import { buildMatchStory, type UserWithPreference } from "@/lib/matchStory";
import { inferUserModel, scoreCompatibility } from "@/lib/userModeling";

function normScore(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

async function buildModelForUser(user: UserWithPreference) {
  const factsRows = await prisma.ownerFact.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { content: true },
  });
  const msgRows = await prisma.matchMessage.findMany({
    where: { senderType: "user_self", match: { userId: user.id } },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: { content: true, createdAt: true },
  });
  return inferUserModel({
    userId: user.id,
    bio: user.bio,
    keywords: user.preference?.keywords ?? null,
    matchTypes: user.preference?.matchTypes ?? null,
    chatPace: user.preference?.chatPace ?? null,
    meetPreference: user.preference?.meetPreference ?? null,
    emotionStyle: user.preference?.emotionStyle ?? null,
    activityTags: user.preference?.activityTags ?? null,
    ownerFacts: factsRows.map((x) => x.content),
    userMessages: msgRows.map((x) => x.content),
    userMessageCreatedAt: msgRows.map((x) => x.createdAt),
  });
}

async function ensureScore(
  matchId: string,
  self: UserWithPreference,
  target: UserWithPreference,
  selfModel: Awaited<ReturnType<typeof buildModelForUser>>,
  targetModel: Awaited<ReturnType<typeof buildModelForUser>>
) {
  const existing = await prisma.matchScore.findFirst({ where: { matchId } });
  if (existing) return;

  const scored = scoreCompatibility(selfModel, targetModel);
  const matchReason = buildMatchStory(self, target);
  const lifeStoryScore = normScore((selfModel.dialogDepth + targetModel.dialogDepth) / 2);
  const metrics = {
    totalScore: scored.finalScore,
    interestScore: normScore(scored.explain.vectorSimilarity * 100 * 0.65 + scored.explain.rhythm * 0.35),
    personalityScore: scored.explain.emotion,
    valuesScore: scored.explain.values,
    lifeStoryScore,
    futureScore: scored.explain.attachment,
  };
  const report = {
    ...buildDemoReport("success"),
    matchExplain: scored.explain,
    matchReason,
    recommendationReasons: [
      "你们的生活线索里有可以彼此认出的光。",
      "你们对关系与相处的期待，有机会从同一个方向开始生长。",
      "丘比想让这次相遇不只是推荐，而像一个故事的第一句。",
    ],
  };

  await prisma.matchScore.create({
    data: {
      matchId,
      totalScore: metrics.totalScore,
      interestScore: metrics.interestScore,
      personalityScore: metrics.personalityScore,
      valuesScore: metrics.valuesScore,
      lifeStoryScore: metrics.lifeStoryScore,
      futureScore: metrics.futureScore,
      summary: matchReason,
      reportJson: JSON.stringify(report),
    },
  });
}

export async function createConnectedMatchPair(userId: string, targetUserId: string) {
  const [self, target] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, include: { preference: true } }),
    prisma.user.findUnique({ where: { id: targetUserId }, include: { preference: true } }),
  ]);
  if (!self || !target) throw new Error("match users not found");

  const [selfModel, targetModel] = await Promise.all([
    buildModelForUser(self as UserWithPreference),
    buildModelForUser(target as UserWithPreference),
  ]);

  const [match, reciprocal] = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    let ownerMatch = await tx.match.findFirst({
      where: { userId, targetUserId },
    });
    if (!ownerMatch) {
      ownerMatch = await tx.match.create({ data: { userId, targetUserId, status: "connected" } });
    } else if (ownerMatch.status !== "connected") {
      ownerMatch = await tx.match.update({ where: { id: ownerMatch.id }, data: { status: "connected" } });
    }

    let targetMatch = await tx.match.findFirst({
      where: { userId: targetUserId, targetUserId: userId },
    });
    if (!targetMatch) {
      targetMatch = await tx.match.create({ data: { userId: targetUserId, targetUserId: userId, status: "connected" } });
    } else if (targetMatch.status !== "connected") {
      targetMatch = await tx.match.update({ where: { id: targetMatch.id }, data: { status: "connected" } });
    }

    return [ownerMatch, targetMatch] as const;
  });

  await Promise.all([
    ensureScore(match.id, self as UserWithPreference, target as UserWithPreference, selfModel, targetModel),
    ensureScore(reciprocal.id, target as UserWithPreference, self as UserWithPreference, targetModel, selfModel),
  ]);

  return { matchId: match.id, reciprocalMatchId: reciprocal.id };
}
