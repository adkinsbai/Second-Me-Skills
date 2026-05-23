"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";

// 期望关系类型灵感提示（用户可自由输入自己的）
const MATCH_TYPE_SUGGESTIONS = [
  "恋人",
  "灵魂朋友",
  "游戏搭子",
  "旅游搭子",
  "创业伙伴",
  "深夜聊废搭子",
  "固定饭搭子",
  "一起摸鱼搭子",
];

function suggestKeywords(types: string[]): string {
  const map: Record<string, string> = {
    恋人: "三观契合、相处舒服、长期关系",
    灵魂朋友: "深度交流、精神共鸣、信任",
    游戏搭子: "同款游戏、段位接近、时间合拍",
    旅游搭子: "目的地一致、节奏相似、预算接近",
    创业伙伴: "方向一致、能力互补、执行力",
    深夜聊废搭子: "夜猫子、话多不尴尬、情绪稳定",
    固定饭搭子: "口味相近、时间合拍、探店",
    一起摸鱼搭子: "懂得松弛、一起划水、互相打气",
  };
  if (types.length === 0) return "根据上方类型选择，AI 将生成匹配关键词";
  return types.map((t) => map[t] ?? t).join(" · ") || "—";
}

type AgeRangeSectionProps = {
  ageMin: number | "";
  ageMax: number | "";
  onChange: (min: number, max: number) => void;
};

function AgeRangeSection({ ageMin, ageMax, onChange }: AgeRangeSectionProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef<"min" | "max" | null>(null);

  // 将外部传入的值统一夹在 18~100 之间，避免出现 1 岁这类异常值把圆点拖出轨道
  const normalizeAge = (v: number | "") => {
    if (typeof v !== "number" || Number.isNaN(v)) return null;
    return Math.min(100, Math.max(18, v));
  };

  let effectiveMin = normalizeAge(ageMin);
  let effectiveMax = normalizeAge(ageMax);

  if (effectiveMin === null) effectiveMin = 18;
  if (effectiveMax === null) effectiveMax = 100;

  if (effectiveMin > effectiveMax) {
    const tmp = effectiveMin;
    effectiveMin = effectiveMax;
    effectiveMax = tmp;
  }

  const updateFromClientX = (clientX: number) => {
    if (!trackRef.current || !draggingRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    const raw = 18 + ratio * (100 - 18);
    const value = Math.min(100, Math.max(18, Math.round(raw)));

    if (draggingRef.current === "min") {
      const nextMin = Math.min(value, effectiveMax);
      onChange(nextMin, effectiveMax);
    } else {
      const nextMax = Math.max(value, effectiveMin);
      onChange(effectiveMin, nextMax);
    }
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!draggingRef.current) return;
      if (e instanceof MouseEvent) {
        updateFromClientX(e.clientX);
      } else if (e.touches[0]) {
        updateFromClientX(e.touches[0].clientX);
      }
    };
    const handleUp = () => {
      draggingRef.current = null;
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleMove);
    window.addEventListener("touchend", handleUp);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleUp);
    };
  }, [effectiveMin, effectiveMax]);

  const leftPercent = ((effectiveMin - 18) / (100 - 18)) * 100;
  const rightPercent = ((effectiveMax - 18) / (100 - 18)) * 100;

  return (
    <section className="glass-card rounded-2xl p-4">
      <h2 className="mb-3 font-medium text-gray-900">年龄范围</h2>
      <p className="mb-2 text-xs text-gray-400">
        一条线两个圆点，左边是最小年龄，右边是最大年龄。
      </p>
      <div className="mb-2 flex items-center justify-between text-sm text-gray-600">
        <span>
          {effectiveMin} 岁 ～ {effectiveMax} 岁
        </span>
      </div>
      <div
        ref={trackRef}
        className="relative mt-3 h-8 select-none"
      >
        <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-black/40 ring-1 ring-gray-200" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-amber-400/90 to-rose-500/80"
          style={{
            left: `${leftPercent}%`,
            width: `${rightPercent - leftPercent}%`,
          }}
        />
        {/* 左圆点 */}
        <div
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border-2 border-[#0c111b] bg-gradient-to-br from-amber-300 to-amber-600 shadow-[0_0_12px_rgba(251,191,36,0.45)]"
          style={{ left: `${leftPercent}%` }}
          onMouseDown={() => {
            draggingRef.current = "min";
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            draggingRef.current = "min";
          }}
        />
        {/* 右圆点 */}
        <div
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border-2 border-[#0c111b] bg-gradient-to-br from-amber-300 to-amber-600 shadow-[0_0_12px_rgba(251,191,36,0.45)]"
          style={{ left: `${rightPercent}%` }}
          onMouseDown={() => {
            draggingRef.current = "max";
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            draggingRef.current = "max";
          }}
        />
      </div>
    </section>
  );
}

export default function HeartbeatSettingsPage() {
  const router = useRouter();
  const [dailyMatchTime, setDailyMatchTime] = useState("21:00");
  const [expectedGender, setExpectedGender] =
    useState<"male" | "female" | "any">("any");
  const [ageMin, setAgeMin] = useState<number | "">("");
  const [ageMax, setAgeMax] = useState<number | "">("");
  const [region, setRegion] = useState("");

  const [matchTypes, setMatchTypes] = useState<string[]>([]);
  const [matchTypeInput, setMatchTypeInput] = useState("");

  // 新增 4 个偏好 state
  const [chatPace, setChatPace] = useState<"" | "low" | "medium" | "high">("");
  const [meetPreference, setMeetPreference] =
    useState<"" | "online" | "hybrid" | "offline">("");
  const [emotionStyle, setEmotionStyle] =
    useState<"" | "direct" | "slow" | "sensitive">("");
  const [activityTags, setActivityTags] = useState<string[]>([]);
  const [activityInput, setActivityInput] = useState("");

  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    fetch("/api/settings/heartbeat")
      .then((r) => r.json())
      .then((d) => {
        if (d.code === 0 && d.data) {
          const data = d.data;
          setDailyMatchTime(data.dailyMatchTime ?? "21:00");
          setExpectedGender(data.expectedGender ?? "any");
          setAgeMin(data.ageMin != null ? data.ageMin : "");
          setAgeMax(data.ageMax != null ? data.ageMax : "");
          setRegion(data.region ?? "");
          setMatchTypes(Array.isArray(data.matchTypes) ? data.matchTypes : []);
          setChatPace(data.chatPace ?? "");
          setMeetPreference(data.meetPreference ?? "");
          setEmotionStyle(data.emotionStyle ?? "");
          setActivityTags(Array.isArray(data.activityTags) ? data.activityTags : []);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const addTypesFromInput = () => {
    const raw = matchTypeInput.trim();
    if (!raw) return;
    const parts = raw
      .split(/[,，、\/\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    setMatchTypes((prev) => {
      const set = new Set(prev);
      parts.forEach((p) => set.add(p));
      return Array.from(set);
    });
    setMatchTypeInput("");
  };

  const removeType = (t: string) => {
    setMatchTypes((prev) => prev.filter((x) => x !== t));
  };

  const addSuggestion = (t: string) => {
    setMatchTypes((prev) => (prev.includes(t) ? prev : [...prev, t]));
  };

  const addActivityFromInput = () => {
    const raw = activityInput.trim();
    if (!raw) return;
    const parts = raw
      .split(/[,，、\/\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    setActivityTags((prev) => {
      const set = new Set(prev);
      parts.forEach((p) => set.add(p));
      return Array.from(set);
    });
    setActivityInput("");
  };

  const removeActivity = (t: string) => {
    setActivityTags((prev) => prev.filter((x) => x !== t));
  };

  const save = () => {
    setSaving(true);
    setToast(null);
    fetch("/api/settings/heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dailyMatchTime,
        dailyMatchTimezone: "Asia/Shanghai",
        expectedGender,
        ageMin: ageMin === "" ? undefined : ageMin,
        ageMax: ageMax === "" ? undefined : ageMax,
        region: region.trim() || undefined,
        matchTypes,
        chatPace,
        meetPreference,
        emotionStyle,
        activityTags,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.code === 0) {
          setToast("success");
          setTimeout(() => router.push("/"), 1200);
        } else setToast("error");
        setSaving(false);
      })
      .catch(() => {
        setToast("error");
        setSaving(false);
      });
  };

  if (!loaded) {
    return (
      <main className="page-shell app-container py-10">
        <p className="text-sm text-gray-500">加载中…</p>
      </main>
    );
  }

  const keywords = suggestKeywords(matchTypes);

  return (
    <main className="page-shell pb-24">
      <AppHeader backHref="/" title="心动设置" />
      <div className="app-container max-w-2xl space-y-6 py-8">
        <div className="poster-panel p-5">
          <p className="poster-kicker">Preference Poster</p>
          <h1 className="mt-4 text-4xl font-black leading-10 text-[var(--brand)]">把“合拍”说清楚</h1>
          <p className="mt-3 text-sm font-bold leading-6 text-[var(--paper)]">
            用关系类型、相处节奏和共同活动告诉丘比你想遇见怎样的人。这里不再强调阈值，只强调真实偏好。
          </p>
        </div>
        <section className="glass-card rounded-2xl p-4">
          <h2 className="mb-2 font-medium text-gray-900">每日匹配时间</h2>
          <p className="mb-3 text-sm text-gray-500">
            你设定一个时间点，丘比会在这个时刻提醒你开始匹配。当前每天最多 3 次机会，每次只给当前最合适的 1 位。
          </p>
          <div className="flex items-center gap-3">
            <input
              type="time"
              value={dailyMatchTime}
              onChange={(e) => setDailyMatchTime(e.target.value || "21:00")}
              className="luxury-input rounded-xl px-3 py-2 text-sm"
            />
            <span className="text-xs text-gray-400">时区：北京时间（UTC+8）</span>
          </div>
          <p className="mt-2 text-xs text-rose-200/85">
            温柔提醒：不是没人配你呀，而是丘比想把“更对的人”留给你，慢一点，反而更甜。
          </p>
        </section>

        {/* 期望找到谁 */}
        <section className="glass-card rounded-2xl p-4">
          <h2 className="mb-3 font-medium text-gray-900">期望找到谁</h2>
          <div className="flex gap-4 text-gray-700">
            {(["any", "male", "female"] as const).map((v) => (
              <label key={v} className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="gender"
                  checked={expectedGender === v}
                  onChange={() => setExpectedGender(v)}
                  className="accent-amber-400"
                />
                <span>{v === "any" ? "不限" : v === "male" ? "男性" : "女性"}</span>
              </label>
            ))}
          </div>
        </section>

        {/* 年龄范围 */}
        <AgeRangeSection
          ageMin={ageMin}
          ageMax={ageMax}
          onChange={(min, max) => {
            setAgeMin(min);
            setAgeMax(max);
          }}
        />

        {/* 地区 */}
        <section className="glass-card rounded-2xl p-4">
          <h2 className="mb-3 font-medium text-gray-900">地区</h2>
          <input
            type="text"
            placeholder="如：北京、上海、线上"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="luxury-input w-full rounded-xl px-3 py-2 text-sm"
          />
        </section>

        {/* 相处节奏偏好 */}
        <section className="glass-card rounded-2xl p-4">
          <h2 className="mb-3 font-medium text-gray-900">相处节奏偏好</h2>
          <div className="flex flex-col gap-2 text-sm">
            {[
              { key: "low", label: "低频但稳定", desc: "想聊时聊，不刷存在感" },
              { key: "medium", label: "日常小动态", desc: "偶尔分享日常、互报平安" },
              { key: "high", label: "高频互动", desc: "希望几乎每天都有互动" },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setChatPace(opt.key as "low" | "medium" | "high")}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
                  chatPace === opt.key ? "luxury-option-active" : "luxury-option"
                }`}
              >
                <span className="font-medium">{opt.label}</span>
                <span className="ml-2 text-xs text-gray-400">{opt.desc}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 线上 / 线下偏好 */}
        <section className="glass-card rounded-2xl p-4">
          <h2 className="mb-3 font-medium text-gray-900">线上 / 线下偏好</h2>
          <div className="flex flex-col gap-2 text-sm">
            {[
              { key: "online", label: "纯线上就好", desc: "更享受线上聊得来的感觉" },
              { key: "hybrid", label: "先线上，再看线下", desc: "顺其自然，有感觉再见" },
              { key: "offline", label: "更偏向线下体验", desc: "喜欢一起做事、一起出门" },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() =>
                  setMeetPreference(opt.key as "online" | "hybrid" | "offline")
                }
                className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
                  meetPreference === opt.key ? "luxury-option-active" : "luxury-option"
                }`}
              >
                <span className="font-medium">{opt.label}</span>
                <span className="ml-2 text-xs text-gray-400">{opt.desc}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 情绪表达风格 */}
        <section className="glass-card rounded-2xl p-4">
          <h2 className="mb-3 font-medium text-gray-900">情绪表达风格</h2>
          <div className="flex flex-col gap-2 text-sm">
            {[
              { key: "direct", label: "直接表达派", desc: "有想法会说出来，希望对方也是" },
              { key: "slow", label: "慢热观察派", desc: "需要一点时间熟悉，慢慢打开" },
              {
                key: "sensitive",
                label: "反应敏锐派",
                desc: "对情绪比较敏感，也会照顾对方感受",
              },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() =>
                  setEmotionStyle(opt.key as "direct" | "slow" | "sensitive")
                }
                className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
                  emotionStyle === opt.key ? "luxury-option-active" : "luxury-option"
                }`}
              >
                <span className="font-medium">{opt.label}</span>
                <span className="ml-2 text-xs text-gray-400">{opt.desc}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 期望关系类型 */}
        <section className="glass-card rounded-2xl p-4">
          <h2 className="mb-1 font-medium text-gray-900">期望关系类型</h2>
          <p className="mb-3 text-xs text-gray-400">
            可以随便写，比如「灵魂伴侣」「深夜吃粉搭子」「一起摆烂搭子」，回车生成标签。
          </p>
          <div className="mb-2 flex flex-wrap gap-2">
            {matchTypes.map((t) => (
              <span key={t} className="luxury-chip">
                {t}
                <button
                  type="button"
                  onClick={() => removeType(t)}
                  className="ml-1 text-[var(--brand-text)]/80 hover:text-gray-900"
                  aria-label={`移除 ${t}`}
                >
                  ×
                </button>
              </span>
            ))}
            {matchTypes.length === 0 && (
              <span className="text-xs text-gray-300">
                暂时还没有标签，下面输入一条试试
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={matchTypeInput}
              onChange={(e) => setMatchTypeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTypesFromInput();
                }
              }}
              placeholder="例如：灵魂伴侣、深夜吃粉搭子"
              className="luxury-input flex-1 rounded-xl px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={addTypesFromInput}
              className="luxury-btn rounded-xl px-3 py-2 text-sm font-semibold"
            >
              添加
            </button>
          </div>
          <div className="mt-3">
            <p className="mb-1 text-xs text-gray-400">
              不知道怎么写？可以点点这些灵感：
            </p>
            <div className="flex flex-wrap gap-2">
              {MATCH_TYPE_SUGGESTIONS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => addSuggestion(t)}
                  className="luxury-chip-muted rounded-full px-3 py-1 text-xs transition hover:border-gray-200 hover:text-gray-700"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            AI 根据类型生成匹配关键词：
          </p>
          <p className="mt-1 rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-700">
            {keywords}
          </p>
        </section>

        {/* 共同行动偏好 */}
        <section className="glass-card rounded-2xl p-4">
          <h2 className="mb-1 font-medium text-gray-900">共同行动偏好</h2>
          <p className="mb-3 text-xs text-gray-400">
            想和对方一起做些什么？可以自由写，比如「一起打 ARPG」「周末骑车」「一起开黑」。
          </p>
          <div className="mb-2 flex flex-wrap gap-2">
            {activityTags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-full border border-sky-400/35 bg-sky-950/35 px-3 py-1 text-xs text-sky-100"
              >
                {t}
                <button
                  type="button"
                  onClick={() => removeActivity(t)}
                  className="ml-1 text-sky-300 hover:text-sky-100"
                  aria-label={`移除 ${t}`}
                >
                  ×
                </button>
              </span>
            ))}
            {activityTags.length === 0 && (
              <span className="text-xs text-gray-300">
                还没有共同活动标签，可以下面随便写几个
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={activityInput}
              onChange={(e) => setActivityInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addActivityFromInput();
                }
              }}
              placeholder="例如：一起打游戏、周末逛展、刷剧陪伴"
              className="luxury-input flex-1 rounded-xl px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={addActivityFromInput}
              className="luxury-btn-secondary rounded-xl px-3 py-2 text-sm font-semibold"
            >
              添加
            </button>
          </div>
        </section>

        {toast === "success" && (
          <div className="luxury-alert luxury-alert-success text-center">保存成功，即将返回</div>
        )}
        {toast === "error" && (
          <div className="luxury-alert luxury-alert-error text-center">保存失败，请稍后重试</div>
        )}
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="luxury-btn w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
        >
          {saving ? "保存中…" : "保存设置"}
        </button>

        {/* 开始匹配 · 丘比小镇（与首页同一路由 /town，避免找不到入口） */}
        <div className="space-y-3 pt-4 text-center">
          <Link
            href="/"
            className="luxury-btn-secondary inline-block rounded-full px-8 py-3 text-sm font-semibold"
          >
            开始匹配 →
          </Link>
          <div>
            <Link
              href="/town"
              className="inline-block rounded-full bg-gradient-to-r from-rose-600 to-pink-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-900/30 ring-1 ring-white/20 transition hover:brightness-110"
            >
              丘比小镇 →
            </Link>
            <p className="mt-2 text-xs text-gray-400">发帖、广场探索、候选人消息（路径：/town）</p>
          </div>
        </div>
      </div>
    </main>
  );
}
