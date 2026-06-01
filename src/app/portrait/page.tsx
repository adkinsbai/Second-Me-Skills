"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { PortraitPoster } from "@/components/PortraitPoster";

type PortraitFact = {
  content: string;
  source: string;
  createdAt: string;
};

type PortraitPersonality = {
  relationshipGoal: string;
  communicationPace: string;
  talkStyle: string;
  valuePriority: { career: number; family: number; freedom: number; growth: number } | null;
  topicPref: { life: number; emotion: number; work: number; entertainment: number } | null;
  qualityFlags: string[];
};

type PortraitPreferences = {
  expectedGender: string | null;
  ageRange: string | null;
  region: string | null;
  matchTypes: string | null;
  chatPace: string | null;
  meetPreference: string | null;
  emotionStyle: string | null;
  activityTags: string | null;
  keywords: string | null;
};

type PortraitIdealPartner = {
  likedTraits: { tag: string; count: number }[];
  unlikedTraits: { tag: string; count: number }[];
};

type PortraitData = {
  userFacts: PortraitFact[];
  personality: PortraitPersonality;
  preferences: PortraitPreferences;
  idealPartner: PortraitIdealPartner;
  dataCounts: {
    factsCount: number;
    hasProfile: boolean;
    hasSignals: boolean;
    hasPreferences: boolean;
    lastRefreshedAt: string | null;
    signals: Record<string, unknown>;
  };
};

function parseJsonArray(val: string | null): string[] {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) return parsed.map(String);
    return [];
  } catch {
    return val.split(",").map((s) => s.trim()).filter(Boolean);
  }
}

function goalEmoji(goal: string): string {
  if (goal.includes("结婚")) return "💍";
  if (goal.includes("恋爱")) return "💕";
  if (goal.includes("灵魂")) return "✨";
  if (goal.includes("陪伴")) return "🤝";
  return "❓";
}

function paceEmoji(pace: string): string {
  if (pace.includes("慢")) return "🐢";
  if (pace.includes("快")) return "⚡";
  return "🎯";
}

function talkStyleEmoji(style: string): string {
  if (style.includes("理性")) return "🧠";
  if (style.includes("感性")) return "💗";
  if (style.includes("幽默")) return "😄";
  if (style.includes("犀利")) return "⚡";
  return "⚖️";
}

function meetEmoji(pref: string): string {
  if (pref === "online") return "💻";
  if (pref === "offline") return "🏃";
  return "🌐";
}

function BarChart({ data, color }: { data: { label: string; value: number; emoji: string }[]; color: string }) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="w-6 text-center text-sm">{item.emoji}</span>
          <span className="w-14 shrink-0 text-xs font-bold text-[var(--paper)]">{item.label}</span>
          <div className="flex-1 h-4 overflow-hidden rounded-full border-2 border-[var(--ink)] bg-[var(--ink)]">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${(item.value / maxVal) * 100}%`, background: color }}
            />
          </div>
          <span className="w-8 text-right text-xs font-black text-[var(--paper)]">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function TraitTag({ label, count, variant = "liked" }: { label: string; count?: number; variant?: "liked" | "unliked" }) {
  const bg = variant === "liked" ? "var(--brand)" : "var(--ink)";
  const border = variant === "liked" ? "var(--ink)" : "var(--muted-ink)";
  const textColor = variant === "liked" ? "var(--ink)" : "var(--paper)";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border-2 px-3 py-1 text-xs font-black shadow-[2px_2px_0_var(--ink)]"
      style={{ background: bg, borderColor: border, color: textColor }}
    >
      {label}
      {count != null && count > 1 ? <span className="opacity-70">×{count}</span> : null}
    </span>
  );
}

export default function PortraitPage() {
  const [data, setData] = useState<PortraitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPoster, setShowPoster] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("/api/user/portrait", { credentials: "include" })
      .then((r) => r.json())
      .then((result) => {
        if (result.code === 0) {
          setData(result.data);
        } else {
          setError(result.message || "加载失败");
        }
      })
      .catch(() => setError("网络错误"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page-shell flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--ink)] border-t-[var(--brand)]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page-shell min-h-screen">
        <AppHeader />
        <main className="mx-auto max-w-[780px] px-4 py-10 text-center">
          <p className="text-lg font-black text-[var(--ink)]">😕 {error || "暂无数据"}</p>
          <Link href="/matches" className="mt-4 inline-block rounded-xl border-2 border-[var(--ink)] bg-[var(--brand)] px-4 py-2 text-sm font-black text-[var(--ink)] shadow-[4px_4px_0_var(--ink)]">
            返回主页
          </Link>
        </main>
      </div>
    );
  }

  const { personality, idealPartner, userFacts, preferences, dataCounts } = data;

  const meetLabel: Record<string, string> = { online: "线上为主", offline: "线下见面", hybrid: "线上线下都行" };
  const emotionLabel: Record<string, string> = { direct: "直来直去", slow: "慢热型", sensitive: "敏感细腻" };
  const genderLabel: Record<string, string> = { male: "男生", female: "女生", any: "不限" };

  const matchTypesArr = parseJsonArray(preferences.matchTypes);
  const activityArr = parseJsonArray(preferences.activityTags);
  const keywordsArr = parseJsonArray(preferences.keywords);

  const valueData = personality.valuePriority
    ? [
        { label: "事业", value: personality.valuePriority.career, emoji: "💼" },
        { label: "家庭", value: personality.valuePriority.family, emoji: "🏠" },
        { label: "自由", value: personality.valuePriority.freedom, emoji: "🕊️" },
        { label: "成长", value: personality.valuePriority.growth, emoji: "🌱" },
      ]
    : [];

  const topicData = personality.topicPref
    ? [
        { label: "生活", value: personality.topicPref.life, emoji: "☕" },
        { label: "情感", value: personality.topicPref.emotion, emoji: "💬" },
        { label: "工作", value: personality.topicPref.work, emoji: "💻" },
        { label: "娱乐", value: personality.topicPref.entertainment, emoji: "🎮" },
      ]
    : [];

  return (
    <div className="page-shell min-h-screen">
      <style jsx global>{`
        @keyframes portrait-shimmer {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
      <AppHeader />

      <main className="relative mx-auto max-w-[780px] px-4 pb-12 pt-6">
        {/* Hero */}
        <section className="poster-panel overflow-hidden" style={{ background: "linear-gradient(135deg, var(--ink) 0%, #1a1225 50%, var(--c-blue) 100%)" }}>
          <div className="h-3 w-full poster-stripe opacity-50" />
          <div className="p-5 text-center">
            <p className="poster-kicker text-[var(--paper)]">My Portrait</p>
            <h1 className="mt-2 text-3xl font-black text-[var(--brand)] drop-shadow-[3px_3px_0_var(--ink)]">我的画像</h1>
            <p className="mt-2 text-sm font-bold text-[var(--paper)]/70">丘比通过聊天、答题和你的行为，逐渐了解你</p>
            {dataCounts.lastRefreshedAt ? (
              <p className="mt-2 text-[10px] font-bold text-[var(--paper)]/50">
                上次更新: {new Date(dataCounts.lastRefreshedAt).toLocaleDateString("zh-CN", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            ) : null}
          </div>
        </section>

        {/* Data source badges */}
        <section className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full border-2 border-[var(--ink)] bg-[var(--paper-2)] px-3 py-1 text-[10px] font-black text-[var(--ink)]">
            📝 {dataCounts.factsCount} 条了解
          </span>
          {dataCounts.hasProfile ? (
            <span className="rounded-full border-2 border-[var(--ink)] bg-[var(--brand)] px-3 py-1 text-[10px] font-black text-[var(--ink)]">
              ✅ 画像已建立
            </span>
          ) : (
            <span className="rounded-full border-2 border-[var(--ink)] bg-[var(--paper-2)] px-3 py-1 text-[10px] font-black text-[var(--muted-ink)]">
              ⏳ 画像学习中
            </span>
          )}
        </section>

        {/* Section 1: What kind of person am I */}
        <section className="mt-7">
          <h2 className="mb-4 text-xl font-black text-[var(--ink)]">
            🪞 我是什么样的人
          </h2>

          <div className="space-y-4">
            {/* Core personality card */}
            <div className="poster-panel p-5">
              <p className="poster-kicker">Core Personality</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-xl border-2 border-[var(--ink)] bg-[var(--ink)] p-3 shadow-[3px_3px_0_var(--ink)]">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{goalEmoji(personality.relationshipGoal)}</span>
                    <div>
                      <p className="text-[10px] font-bold text-[var(--paper)]/60">关系目标</p>
                      <p className="text-sm font-black text-[var(--brand)]">{personality.relationshipGoal}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border-2 border-[var(--ink)] bg-[var(--ink)] p-3 shadow-[3px_3px_0_var(--ink)]">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{paceEmoji(personality.communicationPace)}</span>
                    <div>
                      <p className="text-[10px] font-bold text-[var(--paper)]/60">沟通节奏</p>
                      <p className="text-sm font-black text-[var(--c-blue)]">{personality.communicationPace}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border-2 border-[var(--ink)] bg-[var(--ink)] p-3 shadow-[3px_3px_0_var(--ink)]">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{talkStyleEmoji(personality.talkStyle)}</span>
                    <div>
                      <p className="text-[10px] font-bold text-[var(--paper)]/60">表达风格</p>
                      <p className="text-sm font-black text-[var(--love)]">{personality.talkStyle}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border-2 border-[var(--ink)] bg-[var(--ink)] p-3 shadow-[3px_3px_0_var(--ink)]">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{meetEmoji(preferences.meetPreference ?? "hybrid")}</span>
                    <div>
                      <p className="text-[10px] font-bold text-[var(--paper)]/60">见面偏好</p>
                      <p className="text-sm font-black text-[var(--c-gold)]">{meetLabel[preferences.meetPreference ?? "hybrid"] ?? "线上线下都行"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Value priorities */}
            {valueData.length > 0 ? (
              <div className="poster-panel p-5">
                <p className="poster-kicker">Value Priority</p>
                <p className="mt-1 text-sm font-bold text-[var(--paper)]">你最看重什么</p>
                <div className="mt-3">
                  <BarChart data={valueData} color="var(--brand)" />
                </div>
              </div>
            ) : null}

            {/* Topic preferences */}
            {topicData.length > 0 ? (
              <div className="poster-panel p-5">
                <p className="poster-kicker">Topic Preference</p>
                <p className="mt-1 text-sm font-bold text-[var(--paper)]">你聊什么最多</p>
                <div className="mt-3">
                  <BarChart data={topicData} color="var(--c-blue)" />
                </div>
              </div>
            ) : null}

            {/* Quality flags */}
            {personality.qualityFlags.length > 0 ? (
              <div className="rounded-2xl border-2 border-[var(--ink)] bg-[var(--c-amber)]/20 px-4 py-3 shadow-[4px_4px_0_var(--ink)]">
                <p className="text-xs font-black text-[var(--ink)]">⚠️ 丘比的温馨提示</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {personality.qualityFlags.map((flag) => (
                    <span key={flag} className="rounded-full border-2 border-[var(--ink)] bg-[var(--c-amber)] px-3 py-1 text-xs font-black text-[var(--ink)]">
                      {flag}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Known facts */}
            {userFacts.length > 0 ? (
              <div className="poster-panel p-5">
                <p className="poster-kicker">Things I Know About You</p>
                <p className="mt-1 text-sm font-bold text-[var(--paper)]">丘比记住了这些关于你的事</p>
                <div className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
                  {userFacts.slice(0, 20).map((fact, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg border-2 border-[var(--ink)] bg-[var(--ink)] px-3 py-2">
                      <span className="mt-0.5 shrink-0 text-xs text-[var(--brand)]">
                        {fact.source === "quiz" ? "📋" : fact.source === "chat" ? "💬" : "✏️"}
                      </span>
                      <p className="text-xs font-bold leading-5 text-[var(--paper)]">{fact.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {/* Section 2: What kind of person I like */}
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-black text-[var(--ink)]">
            💘 我喜欢的人
          </h2>

          <div className="space-y-4">
            {/* Explicit preferences */}
            <div className="poster-panel p-5">
              <p className="poster-kicker">My Preferences</p>
              <p className="mt-1 text-sm font-bold text-[var(--paper)]">你在设置里告诉丘比的偏好</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {preferences.expectedGender ? (
                  <TraitTag label={`${preferences.expectedGender === "male" ? "♂" : preferences.expectedGender === "female" ? "♀" : "⚥"} ${genderLabel[preferences.expectedGender] ?? preferences.expectedGender}`} />
                ) : null}
                {preferences.ageRange ? <TraitTag label={`📅 ${preferences.ageRange}`} /> : null}
                {preferences.region ? <TraitTag label={`📍 ${preferences.region}`} /> : null}
                {preferences.chatPace ? <TraitTag label={`${paceEmoji(preferences.chatPace)} ${preferences.chatPace === "low" ? "慢聊" : preferences.chatPace === "high" ? "快聊" : "适中"}`} /> : null}
                {preferences.emotionStyle ? <TraitTag label={`${emotionLabel[preferences.emotionStyle] ?? preferences.emotionStyle}`} /> : null}
                {matchTypesArr.map((t) => (
                  <TraitTag key={t} label={`💕 ${t}`} />
                ))}
                {activityArr.map((t) => (
                  <TraitTag key={t} label={`🎯 ${t}`} />
                ))}
                {keywordsArr.map((t) => (
                  <TraitTag key={t} label={`🔑 ${t}`} />
                ))}
                {!preferences.expectedGender && !preferences.ageRange && !preferences.region && matchTypesArr.length === 0 && activityArr.length === 0 ? (
                  <p className="text-xs font-bold text-[var(--paper)]/50">还没有设置偏好，去匹配偏好页面设置一下吧</p>
                ) : null}
              </div>
            </div>

            {/* Liked traits from swipes */}
            {idealPartner.likedTraits.length > 0 ? (
              <div className="poster-panel p-5">
                <p className="poster-kicker">Liked Traits</p>
                <p className="mt-1 text-sm font-bold text-[var(--paper)]">从你的「喜欢」行为中，丘比发现你偏爱这些特质</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {idealPartner.likedTraits.map((t) => (
                    <TraitTag key={t.tag} label={t.tag} count={t.count} variant="liked" />
                  ))}
                </div>
              </div>
            ) : null}

            {/* Unliked traits */}
            {idealPartner.unlikedTraits.length > 0 ? (
              <div className="poster-panel p-5">
                <p className="poster-kicker">Not My Type</p>
                <p className="mt-1 text-sm font-bold text-[var(--paper)]">这些特质似乎不太吸引你</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {idealPartner.unlikedTraits.map((t) => (
                    <TraitTag key={t.tag} label={t.tag} count={t.count} variant="unliked" />
                  ))}
                </div>
              </div>
            ) : null}

            {/* Empty state */}
            {idealPartner.likedTraits.length === 0 && idealPartner.unlikedTraits.length === 0 && matchTypesArr.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-[var(--ink)] bg-[var(--card)] px-6 py-10 text-center shadow-[4px_4px_0_var(--ink)]">
                <p className="text-2xl">🔍</p>
                <p className="mt-2 text-sm font-black text-[var(--ink)]">丘比还在学习你喜欢什么</p>
                <p className="mt-1 text-xs font-bold text-[var(--muted-ink)]">多去翻牌、聊天，丘比会越来越懂你</p>
              </div>
            ) : null}
          </div>
        </section>

        {/* Action buttons */}
        <section className="mt-10 space-y-3">
          <button
            onClick={() => setShowPoster(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[var(--ink)] bg-[var(--c-pink)] px-5 py-4 text-sm font-black text-white shadow-[6px_6px_0_var(--ink)] transition hover:-translate-y-1 active:translate-y-0"
          >
            <span>📤</span>
            <span>生成分享海报</span>
          </button>
          <Link
            href="/invite"
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-[var(--ink)] bg-[var(--c-gold)] px-5 py-4 text-sm font-black text-[var(--ink)] shadow-[6px_6px_0_var(--ink)] transition hover:-translate-y-1 active:translate-y-0"
          >
            <span>🎁</span>
            <span>邀请好友</span>
          </Link>
          <Link
            href="/intro/quiz"
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-[var(--ink)] bg-[var(--brand)] px-5 py-4 text-sm font-black text-[var(--ink)] shadow-[6px_6px_0_var(--ink)] transition hover:-translate-y-1 active:translate-y-0"
          >
            <span>📝</span>
            <span>通过答题更新画像</span>
          </Link>
          <Link
            href="/matches"
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-[var(--ink)] bg-[var(--card)] px-5 py-4 text-sm font-black text-[var(--ink)] shadow-[4px_4px_0_var(--ink)] transition hover:-translate-y-1 active:translate-y-0"
          >
            <span>💬</span>
            <span>通过聊天更新画像</span>
          </Link>
          <Link
            href="/settings/heartbeat"
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-[var(--ink)] bg-[var(--paper-2)] px-5 py-4 text-sm font-black text-[var(--ink)] shadow-[4px_4px_0_var(--ink)] transition hover:-translate-y-1 active:translate-y-0"
          >
            <span>⚙️</span>
            <span>调整匹配偏好</span>
          </Link>
        </section>
      </main>

      {showPoster && <PortraitPoster onClose={() => setShowPoster(false)} />}
    </div>
  );
}
