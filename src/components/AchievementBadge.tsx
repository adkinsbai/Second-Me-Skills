"use client";

export type AchievementDef = {
  id: string;
  name: string;
  icon: string;
  description: string;
  target: number; // total needed
};

export type UserAchievement = {
  id: string;
  progress: number;
  unlocked: boolean;
  unlockedAt?: string;
};

const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: "first_match", name: "初次匹配", icon: "💘", description: "完成第一次匹配", target: 1 },
  { id: "chat_7days", name: "连续聊7天", icon: "💬", description: "与同一人连续聊 7 天", target: 7 },
  { id: "icebreaker", name: "破冰达人", icon: "🧊", description: "向 5 位不同的人发送第一条消息", target: 5 },
  { id: "popular", name: "人气之星", icon: "⭐", description: "收到 10 次匹配", target: 10 },
  { id: "checkin_streak", name: "签到达人", icon: "🔥", description: "连续签到 7 天", target: 7 },
  { id: "profile_master", name: "资料达人", icon: "📝", description: "完善所有资料项", target: 1 },
  { id: "first_photo", name: "上镜达人", icon: "📷", description: "上传第一张照片", target: 1 },
  { id: "social_butterfly", name: "社交蝴蝶", icon: "🦋", description: "同时保持 3 个活跃对话", target: 3 },
];

export { ACHIEVEMENT_DEFS };

export function AchievementBadge({
  def,
  userAch,
}: {
  def: AchievementDef;
  userAch?: UserAchievement;
}) {
  const unlocked = userAch?.unlocked ?? false;
  const progress = userAch?.progress ?? 0;
  const pct = Math.min(100, Math.round((progress / def.target) * 100));

  return (
    <div
      className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 border-[var(--ink)] p-4 shadow-[4px_4px_0_var(--ink)] transition ${
        unlocked ? "bg-[var(--brand)]" : "bg-[var(--card)] opacity-60 grayscale"
      }`}
      style={unlocked ? { animation: "badge-pop 0.5s ease-out" } : undefined}
    >
      {unlocked && (
        <div className="absolute -right-1 -top-1 rounded-full border-2 border-[var(--ink)] bg-[var(--c-gold)] px-1.5 py-0.5 text-[9px] font-black shadow-[2px_2px_0_var(--ink)]">
          ✓
        </div>
      )}
      <span
        className="text-4xl"
        style={
          unlocked
            ? { filter: "drop-shadow(0 0 8px rgba(255,215,0,0.6))" }
            : undefined
        }
      >
        {def.icon}
      </span>
      <p className="text-xs font-black text-[var(--ink)]">{def.name}</p>
      <p className="text-center text-[10px] font-bold text-[var(--ink)]/70 leading-tight">
        {def.description}
      </p>

      {!unlocked && (
        <div className="w-full">
          <div className="h-2 overflow-hidden rounded-full border border-[var(--ink)] bg-[var(--paper)]">
            <div
              className="h-full rounded-full bg-[var(--c-blue)]"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-0.5 text-center text-[9px] font-bold text-[var(--muted-ink)]">
            {progress}/{def.target}
          </p>
        </div>
      )}

      {unlocked && userAch?.unlockedAt && (
        <p className="text-[9px] font-bold text-[var(--ink)]/50">
          {new Date(userAch.unlockedAt).toLocaleDateString("zh-CN")}
        </p>
      )}

      <style jsx>{`
        @keyframes badge-pop {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
