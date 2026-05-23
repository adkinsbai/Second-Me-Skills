"use client";

import { useState } from "react";

type Props = { matchId: string; open: boolean; onClose: () => void };

const STAR_MAX = 5;

export function MatchFeedbackModal({ matchId, open, onClose }: Props) {
  const [vibeScore, setVibeScore] = useState(0);
  const [valuesScore, setValuesScore] = useState(0);
  const [potentialScore, setPotentialScore] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = () => {
    setSubmitting(true);
    fetch(`/api/matches/${matchId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vibeScore,
        valuesScore,
        potentialScore,
        comment: comment.trim() || undefined,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.code === 0) {
          setDone(true);
          setTimeout(() => {
            onClose();
            setVibeScore(0);
            setValuesScore(0);
            setPotentialScore(0);
            setComment("");
            setDone(false);
          }, 1500);
        }
        setSubmitting(false);
      })
      .catch(() => setSubmitting(false));
  };

  if (!open) return null;

  const StarRow = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: number;
    onChange: (n: number) => void;
  }) => (
    <div>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <div className="mt-1 flex gap-1">
        {Array.from({ length: STAR_MAX }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="text-2xl leading-none text-[var(--brand-text)]/90 transition hover:scale-110"
          >
            {n <= value ? "★" : "☆"}
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-400">{value}/5</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 p-4 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md rounded-2xl p-6 shadow-2xl">
        {done ? (
          <p className="text-center text-[var(--brand-text)]">已保存，感谢反馈～</p>
        ) : (
          <>
            <h3 className="mb-4 text-lg font-medium text-gray-900">聊天后打分</h3>
            <div className="space-y-4">
              <StarRow label="聊天感觉" value={vibeScore} onChange={setVibeScore} />
              <StarRow label="价值观契合度" value={valuesScore} onChange={setValuesScore} />
              <StarRow label="未来发展潜力" value={potentialScore} onChange={setPotentialScore} />
              <div>
                <p className="text-sm font-medium text-gray-700">想对丘比说的话（可选）</p>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="好的地方或改进建议，会写入 Agent 记忆"
                  rows={3}
                  className="luxury-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button type="button" onClick={onClose} className="luxury-btn-secondary flex-1 rounded-xl py-2.5 text-sm">
                取消
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="luxury-btn flex-1 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                {submitting ? "提交中…" : "提交"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
