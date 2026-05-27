import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getActionPlan, getDateSuggestion, getRelationshipProgress } from "@/lib/relationshipInsights";

function extractMatchReason(report: Record<string, unknown> | null, summary: string) {
  const reason = report?.matchReason;
  return typeof reason === "string" && reason.trim() ? reason : summary;
}

function stringList(value: unknown, limit = 5) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, limit);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });
  const { id } = await params;
  const match = await prisma.match.findFirst({
    where: { id, userId: user.id },
    include: {
      targetUser: { select: { id: true, name: true, avatarUrl: true, bio: true } },
      scores: { orderBy: { createdAt: "desc" }, take: 1 },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!match) return NextResponse.json({ code: 404 }, { status: 404 });
  const score = match.scores[0];
  if (!score)
    return NextResponse.json({ code: 0, data: { targetUser: match.targetUser, report: null } });
  let report: Record<string, unknown> | null = null;
  if (score.reportJson) {
    try {
      report = JSON.parse(score.reportJson) as Record<string, unknown>;
    } catch {
      report = null;
    }
  }
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { preference: { select: { meetPreference: true } } },
  });
  const userChatCount = match.messages.filter((m) => m.senderType === "user_self").length;
  const actionPlan = getActionPlan(score.totalScore);
  const progress = getRelationshipProgress(score.totalScore, userChatCount);
  const dateSuggestion = getDateSuggestion({
    interestScore: score.interestScore,
    lifeStoryScore: score.lifeStoryScore,
    meetPreference: dbUser?.preference?.meetPreference ?? null,
  });

  const expectationNote =
    score.personalityScore >= 75
      ? "你们的表达方式和相处节奏初步合拍，但仍建议在真人聊天里确认作息、回复频率和生活安排。"
      : "你们的聊天氛围还有观察空间，建议先用轻量话题继续校准相处节奏。";
  const riskNote =
    score.valuesScore >= 70
      ? "当前没有明显价值观冲突，重点留意边界、承诺节奏和线下安排是否一致。"
      : "价值观仍有不确定项，真人阶段建议优先聊长期关系期待和冲突处理方式。";

  const rawExplain = report?.matchExplain as
    | { rhythm?: number; emotion?: number; values?: number; attachment?: number; vectorSimilarity?: number }
    | undefined;
  const matchExplain = rawExplain
    ? {
        rhythm: Number(rawExplain.rhythm ?? 0),
        emotion: Number(rawExplain.emotion ?? 0),
        values: Number(rawExplain.values ?? 0),
        attachment: Number(rawExplain.attachment ?? 0),
        vectorSimilarity: Number(rawExplain.vectorSimilarity ?? 0),
      }
    : null;
  const recommendationReasons = Array.isArray(report?.recommendationReasons)
    ? report!.recommendationReasons
        .filter((x): x is string => typeof x === "string")
        .slice(0, 6)
    : [];
  const starterTopics = stringList(report?.starterTopics, 6);

  return NextResponse.json({
    code: 0,
    data: {
      targetUser: match.targetUser,
      totalScore: score.totalScore,
      interestScore: score.interestScore,
      personalityScore: score.personalityScore,
      valuesScore: score.valuesScore,
      lifeStoryScore: score.lifeStoryScore,
      futureScore: score.futureScore,
      summary: score.summary,
      matchReason: extractMatchReason(report, score.summary),
      report,
      expectationNote,
      riskNote,
      actionPlan,
      relationshipProgress: progress,
      dateSuggestion,
      starterTopics,
      matchExplain,
      recommendationReasons,
      relationshipNotes: {
        memories: match.messages
          .filter((m) => m.senderType === "user_self" || m.senderType === "user_target")
          .slice(-3)
          .map((m) => m.content)
          .slice(0, 3),
        nextPlan: actionPlan[0] ?? "继续轻量了解",
      },
    },
  });
}
