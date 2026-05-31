import { prisma } from "@/lib/db";

const ACHIEVEMENT_TARGETS: Record<string, number> = {
  first_match: 1,
  chat_7days: 7,
  icebreaker: 5,
  popular: 10,
  checkin_streak: 7,
  profile_master: 1,
  first_photo: 1,
  social_butterfly: 3,
};

/**
 * Unlock or update progress for an achievement.
 * If progress >= target, marks as unlocked.
 * Safe to call multiple times — uses upsert.
 */
export async function unlockAchievement(
  userId: string,
  badgeKey: string,
  progress?: number
): Promise<boolean> {
  const target = ACHIEVEMENT_TARGETS[badgeKey];
  if (!target) return false;

  const existing = await prisma.achievement.findUnique({
    where: { userId_badgeKey: { userId, badgeKey } },
  });

  if (existing) return false; // Already unlocked

  // If progress not provided, assume unlocking directly
  const shouldUnlock = progress === undefined || progress >= target;

  if (shouldUnlock) {
    await prisma.achievement.upsert({
      where: { userId_badgeKey: { userId, badgeKey } },
      update: { unlockedAt: new Date() },
      create: { userId, badgeKey },
    });
    return true;
  }

  return false;
}

/**
 * Check and unlock achievements based on current user state.
 * Call this after relevant actions (match creation, chat, check-in, etc.)
 */
export async function checkAchievements(userId: string): Promise<string[]> {
  const unlocked: string[] = [];

  // Check first_match
  const matchCount = await prisma.match.count({ where: { userId } });
  if (matchCount >= 1) {
    if (await unlockAchievement(userId, "first_match")) unlocked.push("first_match");
  }
  if (matchCount >= 10) {
    if (await unlockAchievement(userId, "popular")) unlocked.push("popular");
  }

  // Check icebreaker (sent first message to 5 different people)
  const distinctChats = await prisma.matchMessage.findMany({
    where: { match: { userId }, senderType: "user_self" },
    select: { matchId: true },
    distinct: ["matchId"],
  });
  if (distinctChats.length >= 5) {
    if (await unlockAchievement(userId, "icebreaker")) unlocked.push("icebreaker");
  }

  // Check social_butterfly (3 active conversations)
  const activeChats = await prisma.matchMessage.groupBy({
    by: ["matchId"],
    where: {
      match: { userId },
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    _count: { id: true },
  });
  if (activeChats.length >= 3) {
    if (await unlockAchievement(userId, "social_butterfly")) unlocked.push("social_butterfly");
  }

  // Check profile_master
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { profileCompleteness: true, photo1: true },
  });
  if (user?.profileCompleteness === 100) {
    if (await unlockAchievement(userId, "profile_master")) unlocked.push("profile_master");
  }

  // Check first_photo
  if (user?.photo1) {
    if (await unlockAchievement(userId, "first_photo")) unlocked.push("first_photo");
  }

  // Check checkin_streak
  if (user) {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { dailyStreak: true },
    });
    if (dbUser && dbUser.dailyStreak >= 7) {
      if (await unlockAchievement(userId, "checkin_streak")) unlocked.push("checkin_streak");
    }
  }

  return unlocked;
}
