import { prisma } from "@/lib/db";
import { mergeWeightedTags } from "@/lib/preferenceSignals";

/**
 * Learn from chat patterns to build user preference signals.
 * Analyzes who the user chats with most and extracts common topics.
 */
export async function learnFromChats(userId: string) {
  const matches = await prisma.match.findMany({
    where: { userId },
    include: {
      messages: {
        where: { senderType: { startsWith: "user_" } },
        orderBy: { createdAt: "desc" },
        take: 500,
      },
      targetUser: {
        select: {
          id: true,
          name: true,
          bio: true,
          matchingProfile: {
            select: { traitsJson: true, summaryJson: true },
          },
        },
      },
    },
  });

  if (matches.length === 0) return { processed: 0, updated: false };

  // Count messages per match to calculate affinity
  const matchStats = matches
    .map((m) => ({
      matchId: m.id,
      targetUserId: m.targetUserId,
      targetUser: m.targetUser,
      messageCount: m.messages.length,
      lastMessageAt: m.messages[0]?.createdAt ?? null,
    }))
    .filter((s) => s.messageCount > 0)
    .sort((a, b) => b.messageCount - a.messageCount);

  if (matchStats.length === 0) return { processed: 0, updated: false };

  const totalMessages = matchStats.reduce((sum, s) => sum + s.messageCount, 0);

  // Extract traits from top chatted users (weighted by message count)
  const traitCounts = new Map<string, number>();
  for (const stat of matchStats) {
    const weight = Math.ceil((stat.messageCount / totalMessages) * 10);
    const traits = extractTraitsFromUser(stat.targetUser);
    for (const trait of traits) {
      traitCounts.set(trait, (traitCounts.get(trait) ?? 0) + weight);
    }
  }

  // Build sorted traits list
  const likedTraits = Array.from(traitCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 24)
    .map(([tag, count]) => ({ tag, count }));

  // Merge with existing signal
  const existing = await prisma.userPreferenceSignal.findUnique({
    where: { userId },
    select: { likedTraitsJson: true },
  });

  const existingTraits = existing?.likedTraitsJson ?? { tags: [] };
  const merged = mergeWeightedTags(
    existingTraits,
    likedTraits.map((t) => t.tag),
    2,
    24
  );

  await prisma.userPreferenceSignal.upsert({
    where: { userId },
    update: {
      likedTraitsJson: { tags: merged },
    },
    create: {
      userId,
      likedTraitsJson: { tags: merged },
      unlikedTraitsJson: { tags: [] },
    },
  });

  return {
    processed: matchStats.length,
    updated: true,
    topAffinities: matchStats.slice(0, 5).map((s) => ({
      targetUserId: s.targetUserId,
      messageCount: s.messageCount,
    })),
  };
}

function extractTraitsFromUser(
  user: {
    id: string;
    name: string | null;
    bio: string | null;
    matchingProfile: {
      traitsJson: unknown;
      summaryJson: unknown;
    } | null;
  }
): string[] {
  const traits: string[] = [];

  if (user.matchingProfile?.traitsJson) {
    try {
      const parsed = user.matchingProfile.traitsJson as Record<string, unknown>;
      if (Array.isArray(parsed)) {
        traits.push(...parsed.map(String));
      } else if (typeof parsed === "object" && parsed !== null) {
        for (const val of Object.values(parsed)) {
          if (Array.isArray(val)) traits.push(...val.map(String));
          else if (typeof val === "string" && val.trim()) traits.push(val.trim());
        }
      }
    } catch {
      // ignore
    }
  }

  if (user.matchingProfile?.summaryJson) {
    try {
      const parsed = user.matchingProfile.summaryJson as Record<string, unknown>;
      if (typeof parsed === "string") {
        traits.push(...extractKeywords(parsed));
      } else if (typeof parsed === "object" && parsed !== null) {
        for (const val of Object.values(parsed)) {
          if (typeof val === "string") traits.push(...extractKeywords(val));
        }
      }
    } catch {
      // ignore
    }
  }

  return traits.filter((t) => t.length > 0 && t.length <= 20);
}

function extractKeywords(text: string): string[] {
  // Extract meaningful Chinese/English keywords (simple approach)
  const keywords: string[] = [];
  const chinesePattern = /[\u4e00-\u9fff]{2,8}/g;
  const englishPattern = /[a-zA-Z]{3,15}/g;
  let match;
  while ((match = chinesePattern.exec(text)) !== null) {
    keywords.push(match[0]);
  }
  while ((match = englishPattern.exec(text)) !== null) {
    keywords.push(match[0].toLowerCase());
  }
  return Array.from(new Set(keywords)).slice(0, 10);
}
