import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/user/export-data
 * 个保法 / PIPL — 数据可携带权
 * Returns all user data as a downloadable JSON.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
    }

    const userId = user.id;

    // Fetch all user-related data in parallel
    const [
      dbUser,
      ownerFacts,
      preference,
      matchesAsUser,
      matchesAsTarget,
      feedbacksGiven,
      profilePrompts,
      achievements,
      profileViewsGiven,
      profileViewsReceived,
      userEvents,
      townPosts,
      townConversationsAsRequester,
      townConversationsAsCandidate,
      userEmbedding,
      matchingProfile,
      preferenceSignal,
      pushSubscriptions,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          bio: true,
          gender: true,
          age: true,
          photo1: true,
          photo2: true,
          photo3: true,
          shortId: true,
          profileAnswers: true,
          profileCompleteness: true,
          dailyStreak: true,
          lastCheckIn: true,
          popularityScore: true,
          viewCount: true,
          authProvider: true,
          onboardingDone: true,
          privacyAcceptedAt: true,
          agentLearnConsent: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.ownerFact.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      prisma.userPreference.findUnique({ where: { userId } }),
      prisma.match.findMany({
        where: { userId },
        include: {
          scores: true,
          messages: { orderBy: { createdAt: "asc" } },
          feedbacks: true,
        },
      }),
      prisma.match.findMany({
        where: { targetUserId: userId },
        include: {
          scores: true,
          messages: { orderBy: { createdAt: "asc" } },
          feedbacks: true,
        },
      }),
      prisma.matchFeedback.findMany({ where: { raterUserId: userId } }),
      prisma.profilePrompt.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      prisma.achievement.findMany({ where: { userId }, orderBy: { unlockedAt: "asc" } }),
      prisma.profileView.findMany({ where: { viewerId: userId }, orderBy: { createdAt: "desc" } }),
      prisma.profileView.findMany({ where: { viewedId: userId }, orderBy: { createdAt: "desc" } }),
      prisma.userEvent.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 1000,
      }),
      prisma.townPost.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      prisma.townConversation.findMany({ where: { requesterId: userId } }),
      prisma.townConversation.findMany({ where: { candidateId: userId } }),
      prisma.userEmbedding.findUnique({ where: { userId } }),
      prisma.userMatchingProfile.findUnique({ where: { userId } }),
      prisma.userPreferenceSignal.findUnique({ where: { userId } }),
      prisma.pushSubscription.findMany({ where: { userId } }),
    ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      dataDescription: "丘比 (Qiubi) 个人数据导出 — 依据《个人信息保护法》(PIPL) 数据可携带权",
      user: dbUser,
      ownerFacts: ownerFacts.map((f) => ({
        source: f.source,
        content: f.content,
        createdAt: f.createdAt,
      })),
      preference,
      matches: matchesAsUser.map((m) => ({
        matchId: m.id,
        targetUserId: m.targetUserId,
        status: m.status,
        starDays: m.starDays,
        chatDayCount: m.chatDayCount,
        createdAt: m.createdAt,
        scores: m.scores,
        messages: m.messages.map((msg) => ({
          senderType: msg.senderType,
          content: msg.content,
          createdAt: msg.createdAt,
        })),
        feedbacks: m.feedbacks,
      })),
      receivedMatches: matchesAsTarget.map((m) => ({
        matchId: m.id,
        userId: m.userId,
        status: m.status,
        createdAt: m.createdAt,
      })),
      feedbacksGiven,
      profilePrompts: profilePrompts.map((p) => ({
        promptKey: p.promptKey,
        answer: p.answer,
        createdAt: p.createdAt,
      })),
      achievements: achievements.map((a) => ({
        badgeKey: a.badgeKey,
        unlockedAt: a.unlockedAt,
      })),
      profileViewsGiven: profileViewsGiven.map((v) => ({
        viewedId: v.viewedId,
        createdAt: v.createdAt,
      })),
      profileViewsReceived: profileViewsReceived.map((v) => ({
        viewerId: v.viewerId,
        createdAt: v.createdAt,
      })),
      recentEvents: userEvents.map((e) => ({
        eventType: e.eventType,
        payload: e.payload,
        createdAt: e.createdAt,
      })),
      townPosts: townPosts.map((p) => ({
        title: p.title,
        content: p.content,
        categoriesJson: p.categoriesJson,
        createdAt: p.createdAt,
      })),
      townConversationsAsRequester: townConversationsAsRequester.length,
      townConversationsAsCandidate: townConversationsAsCandidate.length,
      profileEmbedding: userEmbedding ? { source: userEmbedding.source, dims: userEmbedding.dims, updatedAt: userEmbedding.updatedAt } : null,
      matchingProfile: matchingProfile ? { lastRefreshedAt: matchingProfile.lastRefreshedAt } : null,
      preferenceSignal: preferenceSignal ? { updatedAt: preferenceSignal.updatedAt } : null,
      pushSubscriptions: pushSubscriptions.map((s) => ({ endpoint: s.endpoint, createdAt: s.createdAt })),
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="qiubi-data-export-${userId}.json"`,
      },
    });
  } catch (err) {
    console.error("[export-data]", err);
    return NextResponse.json(
      { code: 500, message: "数据导出失败，请稍后再试" },
      { status: 500 }
    );
  }
}
