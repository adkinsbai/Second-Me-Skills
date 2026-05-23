const TZ_OFFSET_HOURS: Record<string, number> = {
  "Asia/Shanghai": 8,
};

function getOffsetHours(tz?: string | null): number {
  if (!tz) return 8;
  return TZ_OFFSET_HOURS[tz] ?? 8;
}

export function getScheduleWindow(input: {
  now?: Date;
  time?: string | null;
  timezone?: string | null;
}) {
  const now = input.now ?? new Date();
  const timezone = input.timezone ?? "Asia/Shanghai";
  const time = input.time ?? "21:00";
  const offset = getOffsetHours(timezone);
  const [hRaw, mRaw] = time.split(":");
  const hour = Math.max(0, Math.min(23, Number(hRaw) || 21));
  const minute = Math.max(0, Math.min(59, Number(mRaw) || 0));

  const localNow = new Date(now.getTime() + offset * 3600 * 1000);
  const y = localNow.getUTCFullYear();
  const mon = localNow.getUTCMonth();
  const d = localNow.getUTCDate();

  const todayStartUtc = new Date(Date.UTC(y, mon, d, 0, 0, 0) - offset * 3600 * 1000);
  const tomorrowStartUtc = new Date(
    Date.UTC(y, mon, d + 1, 0, 0, 0) - offset * 3600 * 1000
  );
  const dispatchAtUtc = new Date(
    Date.UTC(y, mon, d, hour, minute, 0) - offset * 3600 * 1000
  );
  const minutesNow = localNow.getUTCHours() * 60 + localNow.getUTCMinutes();
  const minutesDispatch = hour * 60 + minute;

  return {
    timezone,
    time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    todayStartUtc,
    tomorrowStartUtc,
    dispatchAtUtc,
    isBeforeDispatch: minutesNow < minutesDispatch,
  };
}
