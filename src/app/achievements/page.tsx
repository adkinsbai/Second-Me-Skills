"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import {
  AchievementBadge,
  ACHIEVEMENT_DEFS,
  type UserAchievement,
} from "@/components/AchievementBadge";

const STORAGE_KEY = "qiubi_achievements";

function loadUserAchievements(): Record<string, UserAchievement> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export default function AchievementsPage() {
  const [userAchs, setUserAchs] = useState<Record<string, UserAchievement>>({});

  useEffect(() => {
    const stored = loadUserAchievements();

    // Initialize defaults for any missing achievements
    let changed = false;
    ACHIEVEMENT_DEFS.forEach((def) => {
      if (!stored[def.id]) {
        stored[def.id] = { id: def.id, progress: 0, unlocked: false };
        changed = true;
      }
    });

    // Demo: auto-detect some achievements based on localStorage data
    try {
      // Check-in streak
      const checkinRaw = localStorage.getItem("qiubi_checkin_data");
      if (checkinRaw) {
        const checkin = JSON.parse(checkinRaw);
        if (checkin.dates?.length > 0) {
          const checkinAch = stored["checkin_streak"];
          if (checkinAch && !checkinAch.unlocked) {
            // Count streak
            const sorted = [...checkin.dates].sort().reverse();
            let streak = 0;
            const today = new Date();
            for (let i = 0; i < 30; i++) {
              const d = new Date(today.getTime() - i * 86400000);
              const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
              if (sorted.includes(ds)) streak++;
              else break;
            }
            checkinAch.progress = streak;
            if (streak >= 7) {
              checkinAch.unlocked = true;
              checkinAch.unlockedAt = new Date().toISOString();
            }
            changed = true;
          }
        }
      }
    } catch {
      // ignore
    }

    if (changed) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    }
    setUserAchs(stored);
  }, []);

  const unlocked = Object.values(userAchs).filter((a) => a.unlocked).length;
  const total = ACHIEVEMENT_DEFS.length;

  return (
    <div className="page-shell min-h-screen">
      <AppHeader backHref="/matches" title="成就" />

      <main className="mx-auto max-w-[780px] px-4 py-6">
        <section className="poster-panel mb-6 p-5">
          <p className="poster-kicker">Achievements</p>
          <h1 className="mt-1 text-2xl font-black text-[var(--paper)]">
            🏆 我的成就
          </h1>
          <p className="mt-2 text-sm font-bold text-[var(--paper)]/75">
            已解锁 {unlocked}/{total}
          </p>
          <div className="mt-3 h-3 overflow-hidden rounded-full border-2 border-[var(--ink)] bg-[var(--paper)]">
            <div
              className="h-full rounded-full bg-[var(--brand)] transition-all duration-700"
              style={{ width: `${total > 0 ? (unlocked / total) * 100 : 0}%` }}
            />
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ACHIEVEMENT_DEFS.map((def) => (
            <AchievementBadge
              key={def.id}
              def={def}
              userAch={userAchs[def.id]}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
