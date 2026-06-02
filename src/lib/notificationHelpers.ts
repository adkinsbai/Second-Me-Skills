import { prisma } from "@/lib/db";
import { sendPush } from "@/lib/send-push";

/**
 * Fire-and-forget helper: send push notification without blocking the caller.
 * Errors are silently swallowed to avoid disrupting business logic.
 */
export function sendPushFireAndForget(
  userId: string,
  title: string,
  body: string,
  url?: string,
): void {
  sendPush(userId, title, body, url).catch(() => {});
}

/**
 * Check if the user has notifications enabled for a specific type.
 * Returns true by default if no settings exist (opt-out model).
 */
export async function isNotificationEnabled(
  userId: string,
  type: "dailyRecommendation" | "reEngagement" | "matchNotification" | "messageNotification",
): Promise<boolean> {
  const settings = await prisma.notificationSettings.findUnique({
    where: { userId },
  });
  if (!settings) return true; // Default: enabled
  if (!settings.pushEnabled) return false;
  return settings[type] ?? true;
}

/**
 * Check if current time is within the user's quiet hours.
 * Returns true if we should NOT send a notification right now.
 */
export async function isInQuietHours(userId: string): Promise<boolean> {
  const settings = await prisma.notificationSettings.findUnique({
    where: { userId },
  });
  if (!settings) return false;

  const start = settings.quietHoursStart;
  const end = settings.quietHoursEnd;

  // Default quiet hours: 23:00 - 08:00
  const quietStart = start ?? 23;
  const quietEnd = end ?? 8;

  // Get current hour in UTC+8 (Beijing time)
  const now = new Date();
  const utcHour = now.getUTCHours();
  const localHour = (utcHour + 8) % 24;

  if (quietStart <= quietEnd) {
    // Same day range, e.g. 1-7
    return localHour >= quietStart && localHour < quietEnd;
  } else {
    // Overnight range, e.g. 23-8
    return localHour >= quietStart || localHour < quietEnd;
  }
}

/**
 * Send push with quiet hours + notification type checks.
 * Combines all guards into one call.
 */
export async function sendPushWithGuards(
  userId: string,
  type: "dailyRecommendation" | "reEngagement" | "matchNotification" | "messageNotification",
  title: string,
  body: string,
  url?: string,
): Promise<void> {
  const [enabled, quiet] = await Promise.all([
    isNotificationEnabled(userId, type),
    isInQuietHours(userId),
  ]);
  if (!enabled || quiet) return;
  sendPushFireAndForget(userId, title, body, url);
}

/**
 * Badge key to friendly Chinese name mapping.
 */
const BADGE_NAMES: Record<string, string> = {
  first_match: "初次心动",
  chat_7days: "七日畅聊",
  icebreaker: "破冰达人",
  popular: "人气之星",
  checkin_streak: "连续签到",
  profile_master: "资料大师",
  first_photo: "第一张照片",
  social_butterfly: "社交蝴蝶",
};

/**
 * Send push when an achievement is unlocked.
 */
export function sendAchievementPush(userId: string, badgeKey: string): void {
  const name = BADGE_NAMES[badgeKey] ?? badgeKey;
  sendPushWithGuards(
    userId,
    "matchNotification",
    "🏆 解锁新成就！",
    `恭喜你解锁「${name}」！继续保持 ✨`,
    "/achievements",
  );
}

/**
 * Send push when a mutual match is created.
 */
export function sendMatchCreatedPush(
  userId: string,
  targetName: string | null,
): void {
  const name = targetName ?? "一位新朋友";
  sendPushWithGuards(
    userId,
    "matchNotification",
    "新的匹配！💕",
    `你和 ${name} 互相心动了，快去打个招呼吧！`,
    "/matches",
  );
}

/**
 * Send push when star days increase (consecutive chat milestone).
 */
export function sendStarUpgradePush(
  userId: string,
  starDays: number,
  targetName: string | null,
): void {
  const name = targetName ?? "你的匹配";
  sendPushWithGuards(
    userId,
    "matchNotification",
    `⭐ 连续聊天 ${starDays} 天！`,
    `你和 ${name} 已经连续聊了 ${starDays} 天，星星更亮了！`,
    "/matches",
  );
}
