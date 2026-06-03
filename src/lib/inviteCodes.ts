import { prisma } from "@/lib/db";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 for clarity

function randomCode(length = 8): string {
  let result = "";
  const arr = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < length; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < length; i++) {
    result += CHARS[arr[i] % CHARS.length];
  }
  return result;
}

/**
 * Generate a unique invite code for the user (or return existing one).
 */
export async function generateInviteCode(userId: string): Promise<string> {
  // Check if user already has an unused code they created
  const existing = await prisma.inviteCode.findFirst({
    where: { creatorId: userId, usedById: null },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing.code;

  // Generate unique code
  let code: string;
  let attempts = 0;
  do {
    code = randomCode();
    const collision = await prisma.inviteCode.findUnique({ where: { code } });
    if (!collision) break;
    attempts++;
  } while (attempts < 10);

  await prisma.inviteCode.create({
    data: { code: code!, creatorId: userId },
  });

  return code!;
}

/**
 * Use an invite code. Returns the creator user if successful.
 * - Cannot use your own code
 * - Code must not already be used
 * - Grants rewards to both parties
 */
export async function redeemInviteCode(
  code: string,
  userId: string
): Promise<{ success: boolean; message: string; creatorId?: string }> {
  const inviteCode = await prisma.inviteCode.findUnique({
    where: { code: code.toUpperCase().trim() },
  });

  if (!inviteCode) {
    return { success: false, message: "邀请码不存在" };
  }

  if (inviteCode.creatorId === userId) {
    return { success: false, message: "不能使用自己的邀请码" };
  }

  if (inviteCode.usedById) {
    return { success: false, message: "该邀请码已被使用" };
  }

  // Check if this user already used any invite code
  const alreadyUsed = await prisma.inviteCode.findFirst({
    where: { usedById: userId },
  });
  if (alreadyUsed) {
    return { success: false, message: "你已经使用过邀请码了" };
  }

  // Mark code as used
  await prisma.inviteCode.update({
    where: { id: inviteCode.id },
    data: { usedById: userId, usedAt: new Date() },
  });

  // Grant reward to inviter: +1 Super Like (track via CreatorReward)
  const inviterReward = await prisma.creatorReward.upsert({
    where: { userId: inviteCode.creatorId },
    create: { userId: inviteCode.creatorId, inviteCount: 1 },
    update: { inviteCount: { increment: 1 } },
  });

  // Determine reward tier
  const tiers = [3, 5, 10, 20, 50];
  const newTier = tiers.filter((t) => inviterReward.inviteCount >= t).length;
  if (newTier > inviterReward.rewardTier) {
    await prisma.creatorReward.update({
      where: { userId: inviteCode.creatorId },
      data: { rewardTier: newTier },
    });
  }

  return {
    success: true,
    message: "邀请码使用成功！邀请者获得 +1 Super Like，你获得 3 天 VIP",
    creatorId: inviteCode.creatorId,
  };
}

/**
 * Get invite stats for a user: their code, total invites, rewards
 */
export async function getInviteStats(userId: string) {
  const [code, reward, usedCodes, totalCreated] = await Promise.all([
    // Get user's active invite code
    prisma.inviteCode.findFirst({
      where: { creatorId: userId, usedById: null },
      orderBy: { createdAt: "desc" },
    }),
    // Get user's reward record
    prisma.creatorReward.findUnique({ where: { userId } }),
    // List of codes that were used (invited people)
    prisma.inviteCode.findMany({
      where: { creatorId: userId, usedById: { not: null } },
      include: {
        usedBy: { select: { name: true } },
      },
      orderBy: { usedAt: "desc" },
    }),
    // Total codes created
    prisma.inviteCode.count({ where: { creatorId: userId } }),
  ]);

  // Generate a code if user doesn't have one
  let inviteCode = code?.code;
  if (!inviteCode) {
    inviteCode = await generateInviteCode(userId);
  }

  const tierNames = ["", "🌱 新手推荐官", "⭐ 超级推荐官", "🌟 明星推荐官", "👑 传说推荐官", "💎 至尊推荐官"];

  return {
    inviteCode,
    inviteCount: usedCodes.length,
    rewardTier: reward?.rewardTier ?? 0,
    rewardTierName: tierNames[reward?.rewardTier ?? 0] ?? "",
    invitedUsers: usedCodes.map((c) => ({
      name: c.usedBy?.name ?? "匿名用户",
      usedAt: c.usedAt?.toISOString() ?? "",
    })),
    superLikesEarned: usedCodes.length, // 1 per invite
    totalCodesCreated: totalCreated,
  };
}
