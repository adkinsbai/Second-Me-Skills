import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { extractProfileTraits } from "@/lib/matchStory";
import { inferUserModel } from "@/lib/userModeling";

type RefreshWindow = {
  start: Date;
  end: Date;
};

function topCounts(items: string[], limit = 12) {
  const counts = new Map<string, number>();
  for (const raw of items) {
    const item = raw.trim();
    if (!item) continue;
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }));
}

function tagsFromSnapshot(raw: Prisma.JsonValue | null) {
  if (!raw || typeof raw !== "object") return [];
  const traits = (raw as { traits?: { tags?: unknown; professions?: unknown; cities?: unknown } }).traits;
  if (!traits) return [];
  return [
    ...(Array.isArray(traits.tags) ? traits.tags.map(String) : []),
    ...(Array.isArray(traits.professions) ? traits.professions.map(String) : []),
    ...(Array.isArray(traits.cities) ? traits.cities.map(String) : []),
  ];
}

function previousDayWindow(now = new Date()): RefreshWindow {
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 1);
  return { start, end };
}

export async function refreshUserProfile(userId: string, window = previousDayWindow()) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { preference: true },
  });
  if (!user) return { userId, refreshed: false, reason: "missing_user" };

  const [factsRows, matchMessages, townMessages, swipes] = await Promise.all([
    prisma.ownerFact.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 80,
      select: { content: true },
    }),
    prisma.matchMessage.findMany({
      where: {
        senderType: "user_self",
        match: { userId },
      },
      orderBy: { createdAt: "desc" },
      take: 120,
      select: { content: true, createdAt: true },
    }),
    prisma.townConversationMessage.findMany({
      where: { senderUserId: userId },
      orderBy: { createdAt: "desc" },
      take: 120,
      select: { content: true, createdAt: true },
    }),
    prisma.userSwipeDecision.findMany({
      where: { viewerId: userId, createdAt: { gte: window.start, lt: window.end } },
      select: { action: true, targetSnapshotJson: true, createdAt: true },
    }),
  ]);

  const userMessages = [...matchMessages, ...townMessages]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 160);

  const model = inferUserModel({
    userId,
    bio: user.bio,
    keywords: user.preference?.keywords ?? null,
    matchTypes: user.preference?.matchTypes ?? null,
    chatPace: user.preference?.chatPace ?? null,
    meetPreference: user.preference?.meetPreference ?? null,
    emotionStyle: user.preference?.emotionStyle ?? null,
    activityTags: user.preference?.activityTags ?? null,
    ownerFacts: factsRows.map((x) => x.content),
    userMessages: userMessages.map((x) => x.content),
    userMessageCreatedAt: userMessages.map((x) => x.createdAt),
  });

  const likedTags = swipes.flatMap((s) => (s.action === "like" ? tagsFromSnapshot(s.targetSnapshotJson) : []));
  const unlikedTags = swipes.flatMap((s) => (s.action === "unlike" ? tagsFromSnapshot(s.targetSnapshotJson) : []));
  const likedTraits = topCounts(likedTags);
  const unlikedTraits = topCounts(unlikedTags);
  const ownTraits = extractProfileTraits(user);

  await Promise.all([
    prisma.userMatchingProfile.upsert({
      where: { userId },
      create: {
        userId,
        summaryJson: {
          relationshipGoal: model.relationshipGoal,
          communicationPace: model.communicationPace,
          talkStyle: model.talkStyle,
          qualityFlags: model.qualityFlags,
        },
        traitsJson: {
          ...ownTraits,
          valuePriority: model.valuePriority,
          topicPref: model.topicPref,
        },
        signalsJson: {
          facts: factsRows.length,
          matchMessages: matchMessages.length,
          townMessages: townMessages.length,
          swipes: swipes.length,
        },
        embeddingJson: model.embedding1024 as unknown as Prisma.InputJsonValue,
        lastRefreshedAt: new Date(),
      },
      update: {
        summaryJson: {
          relationshipGoal: model.relationshipGoal,
          communicationPace: model.communicationPace,
          talkStyle: model.talkStyle,
          qualityFlags: model.qualityFlags,
        },
        traitsJson: {
          ...ownTraits,
          valuePriority: model.valuePriority,
          topicPref: model.topicPref,
        },
        signalsJson: {
          facts: factsRows.length,
          matchMessages: matchMessages.length,
          townMessages: townMessages.length,
          swipes: swipes.length,
        },
        embeddingJson: model.embedding1024 as unknown as Prisma.InputJsonValue,
        lastRefreshedAt: new Date(),
      },
    }),
    prisma.userPreferenceSignal.upsert({
      where: { userId },
      create: {
        userId,
        likedTraitsJson: { tags: likedTraits },
        unlikedTraitsJson: { tags: unlikedTraits },
        photoPreferenceJson: { likedWithPhotos: swipes.filter((s) => s.action === "like").length },
        geoPreferenceJson: { windowStart: window.start.toISOString(), windowEnd: window.end.toISOString() },
        professionPreferenceJson: { tags: likedTraits.filter((x) => /设计|产品|工程|艺术|创业/.test(x.tag)) },
      },
      update: {
        likedTraitsJson: { tags: likedTraits },
        unlikedTraitsJson: { tags: unlikedTraits },
        photoPreferenceJson: { likedWithPhotos: swipes.filter((s) => s.action === "like").length },
        geoPreferenceJson: { windowStart: window.start.toISOString(), windowEnd: window.end.toISOString() },
        professionPreferenceJson: { tags: likedTraits.filter((x) => /设计|产品|工程|艺术|创业/.test(x.tag)) },
      },
    }),
  ]);

  await prisma.userEmbedding.upsert({
    where: { userId },
    create: {
      userId,
      source: "nightly_profile_refresh",
      dims: model.embedding1024.length,
      values: model.embedding1024 as unknown as Prisma.InputJsonValue,
    },
    update: {
      source: "nightly_profile_refresh",
      dims: model.embedding1024.length,
      values: model.embedding1024 as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    userId,
    refreshed: true,
    swipes: swipes.length,
    matchMessages: matchMessages.length,
    townMessages: townMessages.length,
  };
}

export async function refreshActiveUsers(window = previousDayWindow(), userId?: string) {
  const userIds = userId
    ? [userId]
    : Array.from(
        new Set([
          ...(await prisma.userSwipeDecision.findMany({
            where: { createdAt: { gte: window.start, lt: window.end } },
            select: { viewerId: true },
          })).map((x) => x.viewerId),
          ...(await prisma.matchMessage.findMany({
            where: { createdAt: { gte: window.start, lt: window.end }, senderType: "user_self" },
            select: { match: { select: { userId: true } } },
          })).map((x) => x.match.userId),
          ...(await prisma.townConversationMessage.findMany({
            where: { createdAt: { gte: window.start, lt: window.end } },
            select: { senderUserId: true },
          })).map((x) => x.senderUserId),
        ])
      );

  const results = [];
  for (const id of userIds) {
    results.push(await refreshUserProfile(id, window));
  }
  return { window, results };
}
