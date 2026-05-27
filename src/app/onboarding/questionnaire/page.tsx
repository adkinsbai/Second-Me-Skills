"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Answers = Record<string, string | string[] | number>;

type Step =
  | {
      id: string;
      headline: string;
      hint: string;
      type: "single";
      field: string;
      options: Array<{ value: string; label: string; sub?: string }>;
    }
  | {
      id: string;
      headline: string;
      hint: string;
      type: "multi";
      field: string;
      min: number;
      options: Array<{ value: string; label: string }>;
    }
  | {
      id: string;
      headline: string;
      hint: string;
      type: "form";
      fields: Array<{ key: string; label: string; type: string; placeholder?: string; min?: number; max?: number }>;
    }
  | {
      id: string;
      headline: string;
      hint: string;
      type: "textarea";
      field: string;
      placeholder: string;
      maxLength: number;
    };

const STEPS: Step[] = [
  {
    id: "gender",
    headline: "你是谁",
    hint: "选择你的性别身份，用于更准确的推荐。",
    type: "single",
    field: "gender",
    options: [
      { value: "male", label: "男性" },
      { value: "female", label: "女性" },
      { value: "nonbinary", label: "非二元/其他" },
    ],
  },
  {
    id: "lookingFor",
    headline: "你想寻找什么关系",
    hint: "这会影响丘比推荐的关系类型。",
    type: "single",
    field: "lookingFor",
    options: [
      { value: "serious", label: "认真关系", sub: "希望长期了解和推进" },
      { value: "casual", label: "轻松认识", sub: "先聊聊，看感觉" },
      { value: "friends", label: "朋友/搭子", sub: "先从共同活动开始" },
      { value: "explore", label: "还在探索", sub: "开放一点，让推荐更灵活" },
    ],
  },
  {
    id: "expectedGender",
    headline: "你想认识谁",
    hint: "可以选择不限，后续也能在匹配偏好里修改。",
    type: "single",
    field: "expectedGender",
    options: [
      { value: "male", label: "男性" },
      { value: "female", label: "女性" },
      { value: "any", label: "不限" },
    ],
  },
  {
    id: "basicInfo",
    headline: "基本信息",
    hint: "年龄和职业会帮助推荐更贴近真实生活场景。",
    type: "form",
    fields: [
      { key: "age", label: "年龄", type: "number", placeholder: "例如：26", min: 16, max: 99 },
      { key: "occupation", label: "职业", type: "text", placeholder: "例如：产品经理、设计师、学生" },
    ],
  },
  {
    id: "personality",
    headline: "哪些词更像你",
    hint: "至少选 2 个，让丘比理解你的相处气质。",
    type: "multi",
    field: "personality",
    min: 2,
    options: [
      { value: "outgoing", label: "外向主动" },
      { value: "introverted", label: "安静慢热" },
      { value: "creative", label: "有创造力" },
      { value: "analytical", label: "理性分析" },
      { value: "empathetic", label: "共情力强" },
      { value: "easygoing", label: "松弛随和" },
      { value: "ambitious", label: "目标感强" },
      { value: "homebody", label: "享受宅家" },
    ],
  },
  {
    id: "interests",
    headline: "你的兴趣",
    hint: "至少选 3 个，后续会用于共同话题和活动推荐。",
    type: "multi",
    field: "interests",
    min: 3,
    options: [
      { value: "music", label: "音乐" },
      { value: "film", label: "电影" },
      { value: "reading", label: "阅读" },
      { value: "travel", label: "旅行" },
      { value: "sports", label: "运动" },
      { value: "food", label: "美食" },
      { value: "gaming", label: "游戏" },
      { value: "art", label: "艺术" },
      { value: "tech", label: "科技" },
      { value: "outdoor", label: "户外" },
      { value: "coffee", label: "咖啡" },
      { value: "photo", label: "摄影" },
    ],
  },
  {
    id: "sparks",
    headline: "什么会让你想继续了解",
    hint: "至少选 1 个，丘比会用它判断开场和相处方式。",
    type: "multi",
    field: "sparks",
    min: 1,
    options: [
      { value: "deep_talk", label: "能深聊" },
      { value: "humor", label: "有幽默感" },
      { value: "stable", label: "稳定真诚" },
      { value: "curious", label: "对世界好奇" },
      { value: "shared_rhythm", label: "生活节奏接近" },
      { value: "action_together", label: "能一起做事" },
    ],
  },
  {
    id: "bio",
    headline: "用一句话介绍你自己",
    hint: "真实一点，比完美更重要。",
    type: "textarea",
    field: "bio",
    placeholder: "例如：在上海做产品设计，周末喜欢看展、散步和找好喝的咖啡，也喜欢认真聊一些生活里的小事。",
    maxLength: 200,
  },
];

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 px-5 pt-5">
      <div className="h-2 flex-1 overflow-hidden rounded-full border-2 border-[var(--ink)] bg-[var(--paper)]">
        <div className="h-full rounded-full bg-[var(--brand)] transition-all duration-500" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>
      <span className="shrink-0 text-xs font-black text-[var(--ink)]">
        {step + 1}/{STEPS.length}
      </span>
    </div>
  );
}

export default function QuestionnairePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = STEPS[step];

  useEffect(() => {
    fetch("/api/user/questionnaire", { credentials: "include" })
      .then((response) => response.json())
      .then((result) => {
        if (result.code === 0 && result.data?.answers) setAnswers(result.data.answers as Answers);
      })
      .catch(() => {});
  }, []);

  const setField = (key: string, value: string | string[] | number) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const toggleMulti = (field: string, value: string) => {
    const selected = (answers[field] ?? []) as string[];
    if (selected.includes(value)) setField(field, selected.filter((item) => item !== value));
    else setField(field, [...selected, value]);
  };

  const canNext = () => {
    if (current.type === "single") return Boolean(answers[current.field]);
    if (current.type === "multi") return ((answers[current.field] ?? []) as string[]).length >= current.min;
    if (current.type === "form") {
      return current.fields.every((field) => {
        const value = answers[field.key];
        if (value === "" || value == null) return false;
        if (field.type === "number") {
          const number = Number(value);
          if (field.min != null && number < field.min) return false;
          if (field.max != null && number > field.max) return false;
        }
        return true;
      });
    }
    if (current.type === "textarea") return String(answers[current.field] ?? "").trim().length >= 5;
    return true;
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await fetch("/api/user/questionnaire", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      }).then((response) => response.json());
      if (result.code === 0) router.push("/matches");
      else setError(result.message ?? "保存失败，请重试。");
    } catch {
      setError("网络异常，请重试。");
    } finally {
      setSaving(false);
    }
  };

  const goNext = async () => {
    if (step < STEPS.length - 1) setStep((value) => value + 1);
    else await submit();
  };

  const goBack = () => {
    if (step > 0) setStep((value) => value - 1);
    else router.back();
  };

  const isLast = step === STEPS.length - 1;

  return (
    <main className="page-shell flex min-h-screen flex-col">
      <div className="flex items-center justify-between px-5 pb-2 pt-5">
        <button type="button" onClick={goBack} className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] shadow-[3px_3px_0_var(--ink)]" aria-label="返回">
          ←
        </button>
        <button type="button" onClick={() => router.push("/matches")} className="text-xs font-black text-[var(--muted-ink)] hover:text-[var(--ink)]">
          跳过
        </button>
      </div>

      <ProgressBar step={step} />

      <section className="flex-1 overflow-y-auto px-5 pb-4 pt-8">
        <div className="mb-8">
          <p className="poster-kicker text-[var(--muted-ink)]">Step {step + 1}</p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-[var(--ink)]">{current.headline}</h1>
          <p className="mt-2 text-sm font-bold text-[var(--muted-ink)]">{current.hint}</p>
        </div>

        {current.type === "single" ? (
          <div className="grid gap-3">
            {current.options.map((option) => {
              const selected = answers[current.field] === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setField(current.field, option.value)}
                  className={`rounded-2xl border-2 border-[var(--ink)] p-4 text-left transition active:scale-95 ${
                    selected ? "bg-[var(--brand)] shadow-[5px_5px_0_var(--ink)]" : "bg-[var(--paper)] hover:bg-[var(--paper-2)]"
                  }`}
                >
                  <span className="block text-base font-black text-[var(--ink)]">{option.label}</span>
                  {option.sub ? <span className="mt-1 block text-xs font-bold text-[var(--muted-ink)]">{option.sub}</span> : null}
                </button>
              );
            })}
          </div>
        ) : null}

        {current.type === "multi" ? (
          <>
            <div className="flex flex-wrap gap-2.5">
              {current.options.map((option) => {
                const selected = ((answers[current.field] ?? []) as string[]).includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleMulti(current.field, option.value)}
                    className={`rounded-full border-2 border-[var(--ink)] px-4 py-2 text-sm font-black transition active:scale-95 ${
                      selected ? "bg-[var(--brand)] text-[var(--ink)] shadow-[3px_3px_0_var(--ink)]" : "bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-2)]"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs font-bold text-[var(--muted-ink)]">
              已选 {((answers[current.field] ?? []) as string[]).length} 项，至少 {current.min} 项
            </p>
          </>
        ) : null}

        {current.type === "form" ? (
          <div className="space-y-4">
            {current.fields.map((field) => (
              <label key={field.key} className="block">
                <span className="mb-1.5 block text-sm font-black text-[var(--ink)]">{field.label}</span>
                <input
                  type={field.type}
                  min={field.min}
                  max={field.max}
                  placeholder={field.placeholder}
                  value={String(answers[field.key] ?? "")}
                  onChange={(event) => setField(field.key, field.type === "number" ? (event.target.value === "" ? "" : Number(event.target.value)) : event.target.value)}
                  className="luxury-input w-full px-4 py-3 text-sm"
                />
              </label>
            ))}
          </div>
        ) : null}

        {current.type === "textarea" ? (
          <div>
            <textarea
              placeholder={current.placeholder}
              value={String(answers[current.field] ?? "")}
              maxLength={current.maxLength}
              onChange={(event) => setField(current.field, event.target.value)}
              rows={6}
              className="luxury-input w-full resize-none px-4 py-3 text-sm leading-relaxed"
            />
            <p className="mt-2 text-right text-xs font-bold text-[var(--muted-ink)]">
              {String(answers[current.field] ?? "").length} / {current.maxLength}
            </p>
          </div>
        ) : null}

        {error ? <div className="luxury-alert luxury-alert-error mt-4">{error}</div> : null}
      </section>

      <div className="px-5 pb-8 pt-3">
        <button type="button" onClick={goNext} disabled={!canNext() || saving} className="luxury-btn w-full py-4 text-[15px] disabled:opacity-35">
          {saving ? "保存中..." : isLast ? "完成，开始匹配" : "下一步"}
        </button>
      </div>
    </main>
  );
}
