"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";

const QUESTIONS = [
  "你理想中的一次约会/见面是什么样的？",
  "做什么事会让你觉得「和这个人很合拍」？",
  "你希望对方最了解你的哪一面？",
  "一段让你舒服的关系，最重要的是什么？",
];

export default function IntroQuizPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const currentQ = QUESTIONS[step];
  const isLast = step === QUESTIONS.length - 1;

  const submitAnswer = () => {
    const text = input.trim();
    if (!text) return;
    const next = [...answers, text];
    setAnswers(next);
    setInput("");
    if (isLast) {
      setSubmitting(true);
      fetch("/api/intro/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: next }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.code === 0) router.replace("/matches");
          setSubmitting(false);
        })
        .catch(() => setSubmitting(false));
    } else {
      setStep(step + 1);
    }
  };

  return (
    <main className="page-shell">
      <AppHeader backHref="/matches" title="让我更了解你" />
      <div className="app-container max-w-xl py-8">
        <p className="mb-2 text-sm text-gray-400">第 {step + 1} / {QUESTIONS.length} 题</p>
        <p className="mb-6 text-lg font-medium text-gray-900">{currentQ}</p>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="请简单写几句～"
          rows={4}
          className="luxury-input w-full rounded-xl px-4 py-3 placeholder:text-gray-300"
        />
        <button
          type="button"
          onClick={submitAnswer}
          disabled={!input.trim() || submitting}
          className="luxury-btn mt-4 w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
        >
          {submitting ? "保存中…" : isLast ? "完成并更新介绍" : "下一题"}
        </button>
      </div>
    </main>
  );
}
