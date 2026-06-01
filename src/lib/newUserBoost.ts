import { prisma } from '@/lib/db';
import { runMatchPipeline, MATCH_THRESHOLD } from '@/lib/matchPipeline';

const NEW_USER_DAYS = 7;
const NEW_USER_THRESHOLD = 50; // Lower threshold for new users
const MIN_MATCHES_FIRST_WEEK = 3;

/**
 * Check if a user is within the 7-day new-user protection window.
 */
export function isNewUser(createdAt: Date): boolean {
  const now = Date.now();
  const ageMs = now - createdAt.getTime();
  return ageMs < NEW_USER_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Get boosted candidates for a new user with relaxed threshold.
 */
export async function getBoostedCandidates(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  });
  if (!user || !isNewUser(user.createdAt)) return null;

  const existingMatches = await prisma.match.findMany({
    where: { userId },
    select: { targetUserId: true },
  });
  const excludeIds = existingMatches.map((m) => m.targetUserId);
  excludeIds.push(userId);

  const result = await runMatchPipeline(userId, excludeIds);

  // Apply relaxed threshold for new users
  const boosted = result.ranked.filter((r) => r.scored.finalScore >= NEW_USER_THRESHOLD);
  return { ...result, ranked: boosted, isNewUser: true, relaxedThreshold: NEW_USER_THRESHOLD };
}

/**
 * Returns the appropriate match threshold for a user.
 */
export async function getUserThreshold(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  });
  if (user && isNewUser(user.createdAt)) return NEW_USER_THRESHOLD;
  return MATCH_THRESHOLD;
}
