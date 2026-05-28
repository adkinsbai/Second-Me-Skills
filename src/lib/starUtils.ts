/**
 * Shared consecutive-day streak calculation for the star system.
 * All dates are interpreted in the given timezone (default: Asia/Shanghai = UTC+8).
 */

const TZ_OFFSET_HOURS: Record<string, number> = {
  "Asia/Shanghai": 8,
  "Asia/Tokyo": 9,
  "America/New_York": -5,
  "America/Los_Angeles": -8,
  "Europe/London": 0,
};

function getOffsetHours(tz?: string | null): number {
  if (!tz) return 8;
  return TZ_OFFSET_HOURS[tz] ?? 8;
}

/**
 * Get the date string (YYYY-MM-DD) for a Date in the specified timezone.
 */
export function dateInTimezone(date: Date, tz?: string | null): string {
  const offset = getOffsetHours(tz);
  const local = new Date(date.getTime() + offset * 3600 * 1000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, "0");
  const d = String(local.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Get "today" in the specified timezone as YYYY-MM-DD.
 */
export function todayInTimezone(tz?: string | null): string {
  return dateInTimezone(new Date(), tz);
}

/**
 * Calculate consecutive chat days ending today (in the given timezone).
 * Returns 0 if there's no chat activity today.
 */
export function calcConsecutiveDays(dates: string[], tz?: string | null): number {
  if (dates.length === 0) return 0;
  const sorted = Array.from(new Set(dates)).sort().reverse();
  const today = todayInTimezone(tz);
  if (sorted[0] !== today) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + "T00:00:00Z");
    const curr = new Date(sorted[i] + "T00:00:00Z");
    const diffMs = prev.getTime() - curr.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Full star stats for a match given its chat message dates.
 */
export function computeStarStats(
  chatDates: string[],
  existingStarLitAt: Date | null,
  tz?: string | null
) {
  const chatDayCount = new Set(chatDates).size;
  const starDays = calcConsecutiveDays(chatDates, tz);
  const isStarLit = chatDayCount >= 1;
  // Preserve first-lit timestamp; set it now if this is the first chat day
  const starLitAt = isStarLit
    ? existingStarLitAt
      ? existingStarLitAt.toISOString()
      : new Date().toISOString()
    : null;

  return { starDays, chatDayCount, isStarLit, starLitAt };
}
