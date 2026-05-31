"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import {
  AchievementBadge,
  ACHIEVEMENT_DEFS,
  type UserAchievement,
} from "@/components/AchievementBadge";

type ServerAchievement = {
  badgeKey: string;
  unlockedAt: string;
};

export default function AchievementsPage() {
  const [userAchs, setUserAchs] = useState<Record<string, UserAchievement>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch achievements from server API
    fetch("/api/achievements", { credentials: "include" })
      .then((r) => r.json())
      .then((result) => {
        if (result?.code === 0 && Array.isArray(result.data)) {
          const map: Record<string, UserAchievement> = {};
          // Initialize all as locked
          ACHIEVEMENT_DEFS.forEach((def) => {
            map[def.id] = { id: def.id, progress: 0, unlocked: false };
          });
          // Mark unlocked ones from server
          for (const ach of result.data as ServerAchievement[]) {
            if (map[ach.badgeKey]) {
              map[ach.badgeKey] = {
                id: ach.badgeKey,
                progress: ACHIEVEMENT_DEFS.find((d) => d.id === ach.badgeKey)?.target ?? 1,
                unlocked: true,
                unlockedAt: ach.unlockedAt,
              };
            }
          }
          setUserAchs(map);
        }
      })
      .catch(() => {
        // Initialize defaults on error
        const map: Record<string, UserAchievement> = {};
        ACHIEVEMENT_DEFS.forEach((def) => {
          map[def.id] = { id: def.id, progress: 0, unlocked: false };
        });
        setUserAchs(map);
      })
      .finally(() => setLoading(false));
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

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-[var(--ink)] border-t-[var(--brand)]" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ACHIEVEMENT_DEFS.map((def) => (
              <AchievementBadge
                key={def.id}
                def={def}
                userAch={userAchs[def.id]}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
