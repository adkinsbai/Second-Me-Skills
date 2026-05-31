"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";

const PROMPTS = [
  { id: "song", question: "最能代表我的一首歌", icon: "🎵", placeholder: "比如：周杰伦《晴天》" },
  { id: "weekend", question: "我的理想周末", icon: "🌴", placeholder: "比如：睡到自然醒，下午去看展..." },
  { id: "dealbreaker", question: "绝对不能接受的事", icon: "🚫", placeholder: "比如：不尊重他人" },
  { id: "drama", question: "我最近在追的剧", icon: "📺", placeholder: "比如：《繁花》" },
  { id: "trivia", question: "一个关于我的冷知识", icon: "🧊", placeholder: "比如：我左手写字" },
  { id: "values", question: "我最看重的价值观", icon: "💎", placeholder: "比如：真诚、独立" },
  { id: "firstdate", question: "我理想的第一次约会", icon: "☕", placeholder: "比如：一起喝咖啡聊天" },
  { id: "superpower", question: "我的超能力是", icon: "⚡", placeholder: "比如：永远能找到好吃的店" },
];

type PromptAnswers = Record<string, string>;

export default function ProfilePromptsPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<PromptAnswers>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load from server on mount
  useEffect(() => {
    fetch("/api/user/prompts", { credentials: "include" })
      .then((r) => r.json())
      .then((result) => {
        if (result?.code === 0 && Array.isArray(result.data)) {
          const map: PromptAnswers = {};
          for (const p of result.data) {
            if (p.promptKey && p.answer) map[p.promptKey] = p.answer;
          }
          setAnswers(map);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const startEdit = useCallback(
    (id: string) => {
      setEditingId(id);
      setEditValue(answers[id] ?? "");
    },
    [answers]
  );

  const saveEdit = useCallback(async () => {
    if (!editingId) return;
    const trimmed = editValue.trim();
    setSaving(true);
    try {
      if (trimmed) {
        // Save to server
        const res = await fetch("/api/user/prompts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ promptKey: editingId, answer: trimmed }),
        });
        const result = await res.json().catch(() => null);
        if (result?.code === 0) {
          setAnswers((prev) => ({ ...prev, [editingId]: trimmed }));
        }
      } else {
        // Empty answer = delete (POST empty string to remove)
        setAnswers((prev) => {
          const next = { ...prev };
          delete next[editingId];
          return next;
        });
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
      setEditingId(null);
      setEditValue("");
    }
  }, [editingId, editValue]);

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="page-shell min-h-screen">
      <AppHeader backHref="/profile" title="个性问答" />

      <main className="mx-auto max-w-[780px] px-4 py-6">
        <section className="poster-panel mb-6 p-5">
          <p className="poster-kicker">Profile Prompts</p>
          <h1 className="mt-1 text-2xl font-black text-[var(--paper)]">
            ✨ 展示真实的你
          </h1>
          <p className="mt-2 text-sm font-bold text-[var(--paper)]/75">
            回答这些问题，让别人更好地了解你。已回答 {answeredCount}/{PROMPTS.length}
          </p>
          <div className="mt-3 h-3 overflow-hidden rounded-full border-2 border-[var(--ink)] bg-[var(--paper)]">
            <div
              className="h-full rounded-full bg-[var(--brand)] transition-all duration-700"
              style={{
                width: `${PROMPTS.length > 0 ? (answeredCount / PROMPTS.length) * 100 : 0}%`,
              }}
            />
          </div>
        </section>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-[var(--ink)] border-t-[var(--brand)]" />
          </div>
        ) : (
          <div className="space-y-3">
            {PROMPTS.map((prompt) => {
              const answer = answers[prompt.id];
              const isEditing = editingId === prompt.id;

              return (
                <div
                  key={prompt.id}
                  className={`rounded-2xl border-2 border-[var(--ink)] p-4 shadow-[4px_4px_0_var(--ink)] transition ${
                    answer ? "bg-[var(--card)]" : "bg-[var(--paper)]"
                  }`}
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <p className="text-xs font-black text-[var(--ink)]">
                        {prompt.icon} {prompt.question}
                      </p>
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder={prompt.placeholder}
                        rows={2}
                        autoFocus
                        className="luxury-input w-full px-3 py-2 text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={saveEdit}
                          disabled={saving}
                          className="luxury-btn px-4 py-1.5 text-xs disabled:opacity-50"
                        >
                          {saving ? "保存中..." : "保存"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setEditValue("");
                          }}
                          className="luxury-btn-secondary px-4 py-1.5 text-xs"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(prompt.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-black text-[var(--ink)]/60">
                            {prompt.icon} {prompt.question}
                          </p>
                          {answer ? (
                            <p className="mt-1 text-sm font-bold text-[var(--ink)]">
                              {answer}
                            </p>
                          ) : (
                            <p className="mt-1 text-sm font-bold text-[var(--muted-ink)] italic">
                              点击添加回答...
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 rounded-lg border-2 border-[var(--ink)] bg-[var(--brand)] px-2 py-0.5 text-[10px] font-black shadow-[2px_2px_0_var(--ink)]">
                          {answer ? "编辑" : "添加"}
                        </span>
                      </div>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => router.push("/profile")}
            className="luxury-btn px-6 py-2.5 text-sm"
          >
            返回个人资料
          </button>
        </div>
      </main>
    </div>
  );
}
