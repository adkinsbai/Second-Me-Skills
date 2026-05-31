"use client";

import { useCallback, useEffect, useState } from "react";

type CheckInData = {
  dates: string[]; // ISO date strings "YYYY-MM-DD"
  lastCheckIn: string | null;
};

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...dates].sort().reverse();
  const today = todayStr();
  const yesterday = new Date(Date.now() - 86400000);
  const yestStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

  if (sorted[0] !== today && sorted[0] !== yestStr) return 0;

  let streak = 0;
  let checkDate = sorted[0] === today ? new Date() : new Date(Date.now() - 86400000);

  for (let i = 0; i < 365; i++) {
    const ds = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}-${String(checkDate.getDate()).padStart(2, "0")}`;
    if (sorted.includes(ds)) {
      streak++;
      checkDate = new Date(checkDate.getTime() - 86400000);
    } else {
      break;
    }
  }
  return streak;
}

export function DailyCheckIn({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<CheckInData>({ dates: [], lastCheckIn: null });
  const [justChecked, setJustChecked] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load from server on mount
  useEffect(() => {
    setMounted(true);
    // Try to fetch server-side streak data
    fetch("/api/user/stats", { credentials: "include" })
      .then((r) => r.json())
      .then((result) => {
        if (result?.code === 0 && result?.data) {
          const { dailyStreak, lastCheckIn } = result.data;
          // Build dates array from streak info (best effort)
          const dates: string[] = [];
          if (dailyStreak > 0 && lastCheckIn) {
            const last = new Date(lastCheckIn);
            for (let i = 0; i < dailyStreak; i++) {
              const d = new Date(last.getTime() - i * 86400000);
              dates.push(
                `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
              );
            }
          }
          setData({
            dates,
            lastCheckIn: lastCheckIn
              ? `${new Date(lastCheckIn).getFullYear()}-${String(new Date(lastCheckIn).getMonth() + 1).padStart(2, "0")}-${String(new Date(lastCheckIn).getDate()).padStart(2, "0")}`
              : null,
          });
        }
      })
      .catch(() => {
        // Fallback: no data
      });
  }, []);

  const isCheckedToday = mounted && data.dates.includes(todayStr());
  const streak = mounted ? getStreak(data.dates) : 0;

  const checkIn = useCallback(async () => {
    if (isCheckedToday || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/user/check-in", {
        method: "POST",
        credentials: "include",
      });
      const result = await res.json().catch(() => null);
      if (result?.code === 0) {
        const today = todayStr();
        setData((prev) => ({
          dates: prev.dates.includes(today) ? prev.dates : [...prev.dates, today],
          lastCheckIn: today,
        }));
        setJustChecked(true);
        setTimeout(() => setJustChecked(false), 3000);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [isCheckedToday, loading]);

  // Generate calendar grid for current month
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border-2 border-[var(--ink)] bg-[var(--card)] px-4 py-3 shadow-[4px_4px_0_var(--ink)]">
        <span className="text-2xl">🔥</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black text-[var(--ink)]">连续签到 {streak} 天</p>
          {streak >= 5 && (
            <p className="text-[10px] font-bold text-[var(--c-gold)]">签到成功！连续 {streak} 天 🔥</p>
          )}
        </div>
        <button
          type="button"
          onClick={checkIn}
          disabled={isCheckedToday || loading}
          className={`rounded-xl border-2 border-[var(--ink)] px-3 py-1.5 text-xs font-black shadow-[3px_3px_0_var(--ink)] transition active:translate-x-0.5 active:translate-y-0.5 ${
            isCheckedToday
              ? "bg-[var(--paper-2)] text-[var(--muted-ink)]"
              : "bg-[var(--brand)] text-[var(--ink)] hover:-translate-y-0.5"
          }`}
        >
          {isCheckedToday ? "已签到" : loading ? "..." : "签到"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-[var(--ink)] bg-[var(--card)] p-4 shadow-[4px_4px_0_var(--ink)]">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔥</span>
          <div>
            <p className="text-sm font-black text-[var(--ink)]">每日签到</p>
            <p className="text-xs font-bold text-[var(--muted-ink)]">
              连续 {streak} 天
              {streak >= 5 && " · 签到成功！连续 " + streak + " 天 🔥"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={checkIn}
          disabled={isCheckedToday || loading}
          className={`rounded-xl border-2 border-[var(--ink)] px-4 py-2 text-xs font-black shadow-[3px_3px_0_var(--ink)] transition active:translate-x-0.5 active:translate-y-0.5 ${
            isCheckedToday
              ? "bg-[var(--paper-2)] text-[var(--muted-ink)]"
              : "bg-[var(--brand)] text-[var(--ink)] hover:-translate-y-0.5"
          }`}
        >
          {isCheckedToday ? "✓ 已签到" : loading ? "签到中..." : "签到"}
        </button>
      </div>

      {justChecked && (
        <div className="mb-3 rounded-xl border-2 border-[var(--ink)] bg-[var(--brand)] px-3 py-2 text-center text-xs font-black shadow-[3px_3px_0_var(--ink)]">
          🎉 签到成功！连续 {streak} 天 {streak >= 5 ? "🔥" : "✨"}
        </div>
      )}

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[var(--muted-ink)]">
        {["日", "一", "二", "三", "四", "五", "六"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const checked = data.dates.includes(ds);
          const isToday = ds === todayStr();
          return (
            <div
              key={ds}
              className={`flex h-7 w-full items-center justify-center rounded-lg border text-[10px] font-bold ${
                checked
                  ? "border-[var(--ink)] bg-[var(--brand)] text-[var(--ink)]"
                  : isToday
                    ? "border-[var(--c-blue)] text-[var(--c-blue)]"
                    : "border-transparent text-[var(--muted-ink)]"
              }`}
            >
              {day}
              {checked && "✓"}
            </div>
          );
        })}
      </div>
    </div>
  );
}
