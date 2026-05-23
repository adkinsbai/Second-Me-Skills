"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/* ─── Types ──────────────────────────────────────────────────── */
type Answers = Record<string, string | string[] | number>;
type StepWithOptions = {
  field: string;
  options: Array<{ value: string; label: string; icon?: string; sub?: string }>;
  min?: number;
};
type StepWithFields = {
  fields: Array<{ key: string; label: string; type: string; placeholder?: string; min?: number; max?: number }>;
};

/* ─── Question Definitions ──────────────────────────────────── */

const STEPS = [
  {
    id: "gender",
    headline: "你是",
    hint: "选择你的性别身份",
    type: "single-card" as const,
    field: "gender",
    options: [
      { value: "male",     label: "男士",       icon: "🦁" },
      { value: "female",   label: "女士",       icon: "🌸" },
      { value: "nonbinary",label: "非二元性别",  icon: "✨" },
    ],
  },
  {
    id: "lookingFor",
    headline: "你在寻找什么",
    hint: "让丘比更准确地为你匹配",
    type: "single-card" as const,
    field: "lookingFor",
    options: [
      { value: "serious",  label: "认真的关系", icon: "💍" },
      { value: "casual",   label: "轻松随意",   icon: "🎲" },
      { value: "friends",  label: "志同道合的朋友", icon: "🤝" },
      { value: "explore",  label: "还在探索",   icon: "🧭" },
    ],
  },
  {
    id: "expectedGender",
    headline: "你对谁感兴趣",
    hint: "可用于匹配筛选",
    type: "single-card" as const,
    field: "expectedGender",
    options: [
      { value: "male",    label: "男士",     icon: "🦁" },
      { value: "female",  label: "女士",     icon: "🌸" },
      { value: "any",     label: "不设限",   icon: "🌈" },
    ],
  },
  {
    id: "basicInfo",
    headline: "基本信息",
    hint: "帮助丘比更了解你",
    type: "form" as const,
    fields: [
      { key: "age",        label: "年龄",   type: "number", placeholder: "你今年多少岁", min: 16, max: 80 },
      { key: "occupation", label: "职业",   type: "text",   placeholder: "例如：产品经理、设计师、学生" },
    ],
  },
  {
    id: "education",
    headline: "你的学历",
    hint: "以最高学历为准",
    type: "single-pill" as const,
    field: "education",
    options: [
      { value: "high_school", label: "高中" },
      { value: "college",     label: "大专" },
      { value: "bachelor",    label: "本科" },
      { value: "master",      label: "硕士" },
      { value: "phd",         label: "博士" },
      { value: "other",       label: "其他" },
    ],
  },
  {
    id: "personality",
    headline: "你的性格",
    hint: "可多选，选出最像你的",
    type: "multi-pill" as const,
    field: "personality",
    min: 1,
    options: [
      { value: "outgoing",   label: "⚡ 开朗外向" },
      { value: "introverted",label: "🌙 安静内敛" },
      { value: "adventurous",label: "🏔️ 爱冒险" },
      { value: "creative",   label: "🎨 艺术创意" },
      { value: "analytical", label: "🔬 理性分析" },
      { value: "empathetic", label: "💗 感性直觉" },
      { value: "athletic",   label: "🏃 运动热血" },
      { value: "homebody",   label: "🛋️ 宅家舒适" },
      { value: "ambitious",  label: "🚀 野心勃勃" },
      { value: "easygoing",  label: "🍃 随遇而安" },
    ],
  },
  {
    id: "interests",
    headline: "你的兴趣爱好",
    hint: "至少选 3 个",
    type: "multi-icon" as const,
    field: "interests",
    min: 3,
    options: [
      { value: "music",    label: "音乐",   icon: "🎵" },
      { value: "film",     label: "电影",   icon: "🎬" },
      { value: "reading",  label: "阅读",   icon: "📚" },
      { value: "travel",   label: "旅行",   icon: "✈️" },
      { value: "sports",   label: "运动",   icon: "🏋️" },
      { value: "food",     label: "美食",   icon: "🍜" },
      { value: "gaming",   label: "游戏",   icon: "🎮" },
      { value: "art",      label: "艺术",   icon: "🎨" },
      { value: "tech",     label: "科技",   icon: "💻" },
      { value: "outdoor",  label: "户外",   icon: "🌲" },
      { value: "pets",     label: "宠物",   icon: "🐶" },
      { value: "photo",    label: "摄影",   icon: "📷" },
      { value: "dance",    label: "舞蹈",   icon: "💃" },
      { value: "fitness",  label: "健身",   icon: "🏃" },
      { value: "coffee",   label: "咖啡",   icon: "☕" },
      { value: "cooking",  label: "烹饪",   icon: "👨‍🍳" },
    ],
  },
  {
    id: "sparks",
    headline: "什么让你怦然心动",
    hint: "可多选 · 诚实作答，丘比用它来匹配真正合拍的人",
    type: "multi-card-sub" as const,
    field: "sparks",
    min: 1,
    options: [
      { value: "immersive_date",  label: "沉浸约会",   sub: "心无旁骛，唯有你我",         icon: "☕" },
      { value: "slow_romance",    label: "慢热浪漫",   sub: "细水长流，情意渐浓",         icon: "🌊" },
      { value: "sapiosexual",     label: "智性恋",     sub: "聪明的大脑无法抵挡",         icon: "🧠" },
      { value: "fantasy",         label: "幻想",       sub: "感官白日梦需要创造力",       icon: "💭" },
      { value: "primal",          label: "最原始",     sub: "返璞归真，纯粹直接",         icon: "🔥" },
      { value: "healing",         label: "心灵疗愈",   sub: "灵魂连接，深度陪伴",         icon: "💗" },
      { value: "outdoor_secret",  label: "户外密会",   sub: "清风作伴，心猿意马",         icon: "🌲" },
      { value: "dining",          label: "用餐愉快",   sub: "让我当你的私人主厨",         icon: "🍽️" },
      { value: "adrenaline",      label: "肾上腺素",   sub: "更快、更高、更强",           icon: "⚡" },
      { value: "dirty_talk",      label: "语言的艺术", sub: "说出口，更美妙",             icon: "💬" },
      { value: "vintage_love",    label: "复古情怀",   sub: "旧物与新欢的交融",           icon: "🎭" },
      { value: "no_limits",       label: "爱本无界",   sub: "庆祝多元与美丽",             icon: "🌈" },
      { value: "dominant",        label: "我是主宰者", sub: "今天由我说了算",             icon: "👑" },
      { value: "hotel_vibes",     label: "酒店",       sub: "知情同意的私密空间",         icon: "🏨" },
    ],
  },
  {
    id: "lifestyle",
    headline: "你的生活方式",
    hint: "诚实作答，找到真正合适的人",
    type: "lifestyle" as const,
    groups: [
      {
        key: "drinking",
        label: "饮酒习惯",
        options: [
          { value: "never",      label: "不喝酒" },
          { value: "socially",   label: "偶尔社交" },
          { value: "regularly",  label: "经常喝" },
        ],
      },
      {
        key: "smoking",
        label: "吸烟习惯",
        options: [
          { value: "never",      label: "不抽烟" },
          { value: "occasionally",label: "偶尔抽" },
          { value: "regularly",  label: "经常抽" },
        ],
      },
      {
        key: "sleep",
        label: "作息习惯",
        options: [
          { value: "early",  label: "早起型 🌅" },
          { value: "night",  label: "夜猫子 🌙" },
          { value: "mixed",  label: "随心所欲" },
        ],
      },
      {
        key: "exercise",
        label: "运动频率",
        options: [
          { value: "never",   label: "很少运动" },
          { value: "weekly",  label: "每周锻炼" },
          { value: "daily",   label: "每天运动" },
        ],
      },
    ],
  },
  {
    id: "bio",
    headline: "用一句话介绍你自己",
    hint: "让第一次相遇变得有意义",
    type: "textarea" as const,
    field: "bio",
    placeholder: "例如：上海的产品设计师，喜欢在周末探索城市里新开的咖啡馆，热爱爵士乐和徒步……",
    maxLength: 200,
  },
];

const TOTAL = STEPS.length;

/* ─── Helper Components ─────────────────────────────────────── */

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 px-5 pt-5">
      <div className="flex-1 overflow-hidden rounded-full bg-white/8 h-1">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${((step + 1) / TOTAL) * 100}%`,
            background: "linear-gradient(90deg,var(--brand),#0EA5E9)",
          }}
        />
      </div>
      <span className="shrink-0 text-xs font-mono text-[var(--fg-4)]">{step + 1} / {TOTAL}</span>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────── */

export default function QuestionnairePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entryAnim, setEntryAnim] = useState(true);

  // Load existing answers
  useEffect(() => {
    fetch("/api/user/questionnaire", { credentials: "include" })
      .then(r => r.json())
      .then(res => { if (res.code === 0 && res.data?.answers) setAnswers(res.data.answers as Answers); })
      .catch(() => {});
  }, []);

  const current = STEPS[step];
  if (!current) return null;

  const setField = (key: string, val: string | string[] | number) => {
    setAnswers(a => ({ ...a, [key]: val }));
  };

  const toggleMulti = (field: string, val: string) => {
    const cur = (answers[field] ?? []) as string[];
    if (cur.includes(val)) setField(field, cur.filter(x => x !== val));
    else setField(field, [...cur, val]);
  };

  const canNext = (): boolean => {
    if (!current) return false;
    if (current.type === "single-card" || current.type === "single-pill") {
      return !!answers[(current as { field: string }).field];
    }
    if (current.type === "multi-pill" || current.type === "multi-icon" || current.type === "multi-card-sub") {
      const min = (current as { min?: number }).min ?? 1;
      const field = (current as { field: string }).field;
      return ((answers[field] ?? []) as string[]).length >= min;
    }
    if (current.type === "form") {
      const c = current as { fields: { key: string; type: string; min?: number; max?: number }[] };
      return c.fields.every(f => {
        const v = answers[f.key];
        if (!v && v !== 0) return false;
        if (f.type === "number") {
          const n = Number(v);
          if (f.min && n < f.min) return false;
          if (f.max && n > f.max) return false;
        }
        return true;
      });
    }
    if (current.type === "lifestyle") {
      const c = current as { groups: { key: string }[] };
      return c.groups.every(g => !!answers[g.key]);
    }
    if (current.type === "textarea") {
      const field = (current as { field: string }).field;
      return String(answers[field] ?? "").trim().length >= 5;
    }
    return true;
  };

  const goNext = async () => {
    if (step < TOTAL - 1) {
      setEntryAnim(false);
      setTimeout(() => { setStep(s => s + 1); setEntryAnim(true); }, 80);
    } else {
      await submit();
    }
  };

  const goBack = () => {
    if (step > 0) {
      setEntryAnim(false);
      setTimeout(() => { setStep(s => s - 1); setEntryAnim(true); }, 80);
    }
  };

  const submit = async () => {
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/user/questionnaire", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      }).then(r => r.json());
      if (res.code === 0) {
        router.push("/matches");
      } else {
        setError(res.message ?? "保存失败");
      }
    } catch {
      setError("网络异常，请重试");
    } finally {
      setSaving(false);
    }
  };

  const isLast = step === TOTAL - 1;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        <button
          type="button"
          onClick={step === 0 ? () => router.back() : goBack}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-mid)] bg-[var(--surface)] text-[var(--fg-3)] transition hover:text-white"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          type="button"
          onClick={() => router.push("/matches")}
          className="text-xs text-[var(--fg-4)] hover:text-[var(--fg-3)] transition"
        >
          跳过
        </button>
      </div>

      <ProgressBar step={step} />

      {/* Main content */}
      <div
        className="flex-1 overflow-y-auto px-5 pt-8 pb-4"
        style={{
          opacity: entryAnim ? 1 : 0,
          transform: entryAnim ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 220ms ease, transform 220ms ease",
        }}
      >
        {/* Step header */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
            第 {step + 1} 步 / {TOTAL}
          </p>
          <h1 className="mt-2 text-[1.75rem] font-black leading-tight tracking-tight text-white">
            {current.headline}
          </h1>
          <p className="mt-1.5 text-sm text-[var(--fg-4)]">{current.hint}</p>
        </div>

        {/* Single card (large illustrated) */}
        {current.type === "single-card" && (
          <div className="grid grid-cols-2 gap-3">
            {(current as StepWithOptions).options.map(opt => {
              const selected = answers[(current as StepWithOptions).field] === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setField((current as StepWithOptions).field, opt.value)}
                  className="flex flex-col items-center justify-center gap-3 rounded-3xl border p-5 transition active:scale-95"
                  style={{
                    minHeight: 140,
                    border: selected ? "2px solid var(--brand)" : "1px solid var(--border-mid)",
                    background: selected
                      ? "linear-gradient(135deg,rgba(29,255,143,0.12),rgba(29,255,143,0.04))"
                      : "var(--surface)",
                    boxShadow: selected ? "0 0 24px rgba(29,255,143,0.15)" : "none",
                  }}
                >
                  <span style={{ fontSize: "3.5rem", lineHeight: 1 }}>{opt.icon}</span>
                  <span className={`text-sm font-bold ${selected ? "text-[var(--brand)]" : "text-[var(--fg-2)]"}`}>
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Single pill */}
        {current.type === "single-pill" && (
          <div className="flex flex-wrap gap-2.5">
            {(current as StepWithOptions).options.map(opt => {
              const selected = answers[(current as StepWithOptions).field] === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setField((current as StepWithOptions).field, opt.value)}
                  className="rounded-full border px-5 py-2.5 text-sm font-semibold transition active:scale-95"
                  style={{
                    border: selected ? "1.5px solid var(--brand)" : "1px solid var(--border-mid)",
                    background: selected ? "rgba(29,255,143,0.12)" : "var(--surface)",
                    color: selected ? "var(--brand)" : "var(--fg-2)",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Multi pill */}
        {current.type === "multi-pill" && (
          <>
            <div className="flex flex-wrap gap-2.5">
              {(current as StepWithOptions).options.map(opt => {
                const field = (current as StepWithOptions).field;
                const selected = ((answers[field] ?? []) as string[]).includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleMulti(field, opt.value)}
                    className="rounded-full border px-4 py-2 text-sm font-semibold transition active:scale-95"
                    style={{
                      border: selected ? "1.5px solid var(--brand)" : "1px solid var(--border-mid)",
                      background: selected ? "rgba(29,255,143,0.12)" : "var(--surface)",
                      color: selected ? "var(--brand)" : "var(--fg-2)",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-[var(--fg-4)]">
              已选 {((answers[(current as StepWithOptions).field] ?? []) as string[]).length} 项
            </p>
          </>
        )}

        {/* Multi icon grid */}
        {current.type === "multi-icon" && (
          <>
            <div className="grid grid-cols-4 gap-2.5">
              {(current as StepWithOptions).options.map(opt => {
                const field = (current as StepWithOptions).field;
                const selected = ((answers[field] ?? []) as string[]).includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleMulti(field, opt.value)}
                    className="flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition active:scale-95"
                    style={{
                      border: selected ? "1.5px solid var(--brand)" : "1px solid var(--border-mid)",
                      background: selected ? "rgba(29,255,143,0.10)" : "var(--surface)",
                    }}
                  >
                    <span style={{ fontSize: "1.75rem" }}>{opt.icon}</span>
                    <span className="text-[11px] font-semibold" style={{ color: selected ? "var(--brand)" : "var(--fg-3)" }}>
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-[var(--fg-4)]">
              已选 {((answers[(current as StepWithOptions).field] ?? []) as string[]).length} / 至少 {(current as StepWithOptions).min} 项
            </p>
          </>
        )}

        {/* Multi card with subtitle (Pure-style "什么让你怦然心动") */}
        {current.type === "multi-card-sub" && (() => {
          type CardSubStep = { field: string; min?: number; options: { value: string; label: string; sub: string; icon: string }[] };
          const c = current as unknown as CardSubStep;
          const selected = (answers[c.field] ?? []) as string[];
          return (
            <>
              <div className="grid grid-cols-2 gap-3">
                {c.options.map(opt => {
                  const isSelected = selected.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleMulti(c.field, opt.value)}
                      className="flex flex-col items-start gap-2 rounded-3xl border p-4 text-left transition active:scale-[.97]"
                      style={{
                        border: isSelected ? "1.5px solid var(--brand)" : "1px solid var(--border-mid)",
                        background: isSelected
                          ? "linear-gradient(135deg,rgba(29,255,143,0.13),rgba(29,255,143,0.04))"
                          : "var(--surface)",
                        boxShadow: isSelected ? "0 0 18px rgba(29,255,143,0.12)" : "none",
                      }}
                    >
                      <span style={{ fontSize: "2rem", lineHeight: 1 }}>{opt.icon}</span>
                      <div>
                        <p className="text-[13px] font-bold" style={{ color: isSelected ? "var(--brand)" : "var(--fg)" }}>
                          {opt.label}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-4" style={{ color: isSelected ? "rgba(29,255,143,0.65)" : "var(--fg-4)" }}>
                          {opt.sub}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-[var(--fg-4)]">已选 {selected.length} 项</p>
            </>
          );
        })()}

        {/* Form fields */}
        {current.type === "form" && (
          <div className="space-y-4">
            {(current as StepWithFields).fields.map(f => (
              <div key={f.key}>
                <label className="mb-1.5 block text-sm font-semibold text-[var(--fg-2)]">{f.label}</label>
                <input
                  type={f.type}
                  min={f.min}
                  max={f.max}
                  placeholder={f.placeholder}
                  value={String(answers[f.key] ?? "")}
                  onChange={e => setField(f.key, f.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
                  className="luxury-input w-full px-4 py-3 text-sm"
                />
              </div>
            ))}
          </div>
        )}

        {/* Lifestyle grouped pills */}
        {current.type === "lifestyle" && (() => {
          type LifestyleStep = { groups: { key: string; label: string; options: { value: string; label: string }[] }[] };
          const c = current as unknown as LifestyleStep;
          return (
            <div className="space-y-6">
              {c.groups.map(g => (
                <div key={g.key}>
                  <p className="mb-2.5 text-sm font-bold text-[var(--fg-2)]">{g.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {g.options.map(opt => {
                      const sel = answers[g.key] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setField(g.key, opt.value)}
                          className="rounded-full border px-4 py-2 text-sm font-medium transition active:scale-95"
                          style={{
                            border: sel ? "1.5px solid var(--brand)" : "1px solid var(--border-mid)",
                            background: sel ? "rgba(29,255,143,0.12)" : "var(--surface)",
                            color: sel ? "var(--brand)" : "var(--fg-2)",
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Textarea */}
        {current.type === "textarea" && (() => {
          type TextareaStep = { field: string; placeholder: string; maxLength: number };
          const c = current as unknown as TextareaStep;
          const val = String(answers[c.field] ?? "");
          return (
            <div>
              <textarea
                placeholder={c.placeholder}
                value={val}
                maxLength={c.maxLength}
                onChange={e => setField(c.field, e.target.value)}
                rows={6}
                className="luxury-input w-full resize-none px-4 py-3 text-sm leading-relaxed"
              />
              <p className="mt-2 text-right text-xs text-[var(--fg-4)]">{val.length} / {c.maxLength}</p>
            </div>
          );
        })()}


        {error && (
          <div className="mt-4 luxury-alert luxury-alert-error">{error}</div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="px-5 pb-8 pt-3">
        <button
          type="button"
          onClick={goNext}
          disabled={!canNext() || saving}
          className="w-full rounded-2xl py-4 text-[15px] font-black text-black transition active:scale-[.98] disabled:opacity-35"
          style={{
            background: canNext() && !saving ? "var(--brand)" : "var(--surface-3)",
            color: canNext() && !saving ? "#000" : "var(--fg-4)",
            boxShadow: canNext() && !saving ? "0 0 28px rgba(29,255,143,0.35)" : "none",
          }}
        >
          {saving ? "保存中…" : isLast ? "完成，开始匹配 💚" : "下一步"}
        </button>
      </div>
    </div>
  );
}
