"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { useNightMode } from "@/components/NightMode";

type Question = {
  id: number;
  question: string;
  options: [string, string];
  emoji: string;
};

type QuizData = {
  questions: Question[];
  selfAnswers: Record<string, number>;
  targetAnswers: Record<string, number>;
  selfDone: boolean;
  targetDone: boolean;
  compatibilityScore: number | null;
};

const RESULT_DESCS: { threshold: number; text: string; emoji: string }[] = [
  { threshold: 90, text: "天作之合！你们的心灵完全同步 💫", emoji: "💑" },
  { threshold: 70, text: "默契十足！很多方面都高度一致 🌟", emoji: "🥰" },
  { threshold: 50, text: "还挺合拍！有些小差异让你们更有趣 ✨", emoji: "😊" },
  { threshold: 30, text: "互补型！不同之处让关系更有张力 🎭", emoji: "🤗" },
  { threshold: 0, text: "你们很不同，但差异也是一种吸引力！🔥", emoji: "💪" },
];

function getResultDesc(score: number) {
  for (const d of RESULT_DESCS) {
    if (score >= d.threshold) return d;
  }
  return RESULT_DESCS[RESULT_DESCS.length - 1];
}

export default function CompatibilityPage() {
  const params = useParams();
  const id = params.id as string;
  const { isNight } = useNightMode();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<QuizData | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [myAnswers, setMyAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [animatingSelect, setAnimatingSelect] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/matches/${id}/compatibility`, { credentials: "include" })
      .then((r) => r.json())
      .then((res) => {
        if (res?.code === 0) {
          setData(res.data);
          if (res.data.selfDone) {
            setSubmitted(true);
            if (res.data.compatibilityScore !== null) {
              setShowResult(true);
            }
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleSelect = useCallback(
    (optionIndex: number) => {
      if (submitted || !data) return;
      const question = data.questions[currentQ];
      setAnimatingSelect(optionIndex);
      setMyAnswers((prev) => ({ ...prev, [question.id]: optionIndex }));

      // Auto-advance after a brief delay
      setTimeout(() => {
        setAnimatingSelect(null);
        if (currentQ < data.questions.length - 1) {
          setCurrentQ((prev) => prev + 1);
        }
      }, 400);
    },
    [currentQ, data, submitted]
  );

  const handleSubmit = useCallback(async () => {
    if (submitting || !id) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/matches/${id}/compatibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ answers: myAnswers }),
      }).then((r) => r.json());

      if (res?.code === 0) {
        setSubmitted(true);
        setData((prev) =>
          prev
            ? {
                ...prev,
                selfDone: true,
                targetDone: res.data.targetDone,
                targetAnswers: res.data.targetAnswers,
                compatibilityScore: res.data.compatibilityScore,
              }
            : prev
        );
        if (res.data.compatibilityScore !== null) {
          setTimeout(() => setShowResult(true), 300);
        }
      }
    } finally {
      setSubmitting(false);
    }
  }, [id, myAnswers, submitting]);

  if (loading) {
    return (
      <main className="page-shell flex min-h-dvh flex-col">
        <AppHeader backHref={`/matches/${id}`} title="默契测试" />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-lg font-black text-[var(--ink)]">加载中...</div>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="page-shell flex min-h-dvh flex-col">
        <AppHeader backHref={`/matches/${id}`} title="默契测试" />
        <div className="flex flex-1 items-center justify-center">
          <p className="font-bold text-[var(--ink)]/60">加载失败</p>
        </div>
      </main>
    );
  }

  const questions = data.questions;
  const allAnswered = Object.keys(myAnswers).length >= 10;
  const currentQuestion = questions[currentQ];

  return (
    <main className={`page-shell flex min-h-dvh flex-col ${isNight ? "night-mode" : ""}`}>
      <AppHeader
        backHref={`/matches/${id}`}
        title={
          <span className="flex items-center gap-2">
            💕 默契测试
          </span>
        }
      />

      <div className="app-container flex-1 py-4">
        {/* Result display */}
        {showResult && data.compatibilityScore !== null && (
          <section className="mb-6 animate-[fadeUp_0.6s_ease-out] overflow-hidden rounded-[1.5rem] border-2 border-[var(--ink)] bg-[var(--paper)] shadow-[6px_6px_0_var(--ink)]">
            <div className="bg-[var(--c-pink)] px-6 py-4 text-center">
              <p className="text-[11px] font-black uppercase tracking-widest text-white/80">
                默契指数
              </p>
            </div>
            <div className="flex flex-col items-center px-6 py-8">
              {/* Score circle */}
              <div className="relative mb-4 flex h-36 w-36 items-center justify-center">
                <svg className="absolute inset-0 h-full w-full -rotate-90">
                  <circle
                    cx="72"
                    cy="72"
                    r="64"
                    fill="none"
                    stroke="var(--ink)"
                    strokeWidth="6"
                    opacity="0.1"
                  />
                  <circle
                    cx="72"
                    cy="72"
                    r="64"
                    fill="none"
                    stroke="var(--c-pink)"
                    strokeWidth="6"
                    strokeDasharray={`${(data.compatibilityScore / 100) * 402} 402`}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="text-center">
                  <span className="text-4xl font-black text-[var(--ink)]">
                    {data.compatibilityScore}
                  </span>
                  <span className="text-lg font-black text-[var(--ink)]">%</span>
                </div>
              </div>

              {/* Result description */}
              <p className="mb-4 text-center text-base font-bold text-[var(--ink)]">
                {getResultDesc(data.compatibilityScore).emoji}{" "}
                {getResultDesc(data.compatibilityScore).text}
              </p>

              {/* Answer comparison */}
              <div className="w-full space-y-2">
                {questions.map((q) => {
                  const selfA = data.selfAnswers[q.id] ?? myAnswers[q.id];
                  const targetA = data.targetAnswers[q.id];
                  const match = selfA === targetA;

                  return (
                    <div
                      key={q.id}
                      className="flex items-center gap-2 rounded-xl border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2 shadow-[2px_2px_0_var(--ink)]"
                    >
                      <span className="text-sm">{q.emoji}</span>
                      <span className="min-w-0 flex-1 truncate text-xs font-bold text-[var(--ink)]">
                        {q.question}
                      </span>
                      {targetA !== undefined ? (
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black border-2 border-[var(--ink)] ${
                            match
                              ? "bg-[var(--brand)] text-[var(--ink)]"
                              : "bg-[var(--paper-2)] text-[var(--ink)]/60"
                          } shadow-[1px_1px_0_var(--ink)]`}
                        >
                          {match ? "你们都选了A!" : "这次不一样哦"}
                        </span>
                      ) : (
                        <span className="shrink-0 text-[10px] font-bold text-[var(--ink)]/40">
                          等对方回答
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t-2 border-[var(--ink)] bg-[var(--paper-2)] px-6 py-4 text-center">
              {!data.targetDone && (
                <p className="text-xs font-bold text-[var(--ink)]/60">
                  对方还没完成测试，结果揭晓后会通知你哦 ✨
                </p>
              )}
              <Link
                href={`/matches/${id}/chat`}
                className="luxury-btn mt-3 inline-block px-6 py-2 text-sm"
              >
                回到聊天
              </Link>
            </div>
          </section>
        )}

        {/* Quiz in progress */}
        {!submitted && (
          <>
            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[var(--ink)]/50">
                  {currentQ + 1} / {questions.length}
                </span>
                <span className="text-xs font-bold text-[var(--ink)]/40">
                  {Object.keys(myAnswers).length} 题已答
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full border-2 border-[var(--ink)] bg-[var(--paper)]">
                <div
                  className="h-full rounded-full bg-[var(--c-pink)] transition-all duration-500"
                  style={{ width: `${(Object.keys(myAnswers).length / 10) * 100}%` }}
                />
              </div>
            </div>

            {/* Current question */}
            <div className="mb-6 rounded-[1.5rem] border-2 border-[var(--ink)] bg-[var(--paper)] shadow-[6px_6px_0_var(--ink)]">
              <div className="bg-[var(--c-gold)] px-5 py-3 text-center">
                <span className="text-2xl">{currentQuestion.emoji}</span>
                <p className="mt-1 text-sm font-black text-[var(--ink)]">
                  {currentQuestion.question}
                </p>
              </div>
              <div className="grid gap-3 p-4">
                {currentQuestion.options.map((opt, idx) => {
                  const selected = myAnswers[currentQuestion.id] === idx;
                  const isAnimating = animatingSelect === idx;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelect(idx)}
                      className={`luxury-option relative flex items-center gap-3 px-5 py-4 text-left transition ${
                        selected ? "luxury-option-active" : ""
                      } ${isAnimating ? "scale-[0.97]" : ""}`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[var(--ink)] text-sm font-black ${
                          selected ? "bg-[var(--c-pink)] text-white" : "bg-[var(--paper)] text-[var(--ink)]"
                        } shadow-[2px_2px_0_var(--ink)]`}
                      >
                        {idx === 0 ? "A" : "B"}
                      </span>
                      <span className="text-sm font-bold">{opt}</span>
                      {selected && (
                        <span className="ml-auto text-lg">✨</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Question nav dots */}
            <div className="mb-4 flex flex-wrap justify-center gap-1.5">
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentQ(i)}
                  className={`h-3 w-3 rounded-full border-2 border-[var(--ink)] shadow-[1px_1px_0_var(--ink)] transition ${
                    myAnswers[q.id] !== undefined
                      ? "bg-[var(--c-pink)]"
                      : i === currentQ
                      ? "bg-[var(--brand)]"
                      : "bg-[var(--paper)]"
                  }`}
                  title={`第${i + 1}题`}
                />
              ))}
            </div>

            {/* Submit button */}
            {allAnswered && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="luxury-btn px-8 py-3 text-base disabled:opacity-50"
                >
                  {submitting ? "提交中..." : "揭晓答案 💕"}
                </button>
              </div>
            )}
          </>
        )}

        {/* Waiting for result after submit */}
        {submitted && !showResult && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 text-5xl">💌</div>
            <p className="text-lg font-black text-[var(--ink)]">答案已提交！</p>
            <p className="mt-2 text-sm font-bold text-[var(--ink)]/60">
              {data.targetDone
                ? "正在计算你们的默契指数..."
                : "等对方也完成测试后，结果就会揭晓 ✨"}
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}
