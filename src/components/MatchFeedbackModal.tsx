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
          }, 1200);
        }
      })
      .finally(() => setSubmitting(false));
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
      <p className="text-sm font-black">{label}</p>
      <div className="mt-2 flex items-center gap-1">
        {Array.from({ length: STAR_MAX }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="text-2xl leading-none text-[#FF2D8D] transition hover:-translate-y-0.5"
            aria-label={`${label} ${n} 分`}
          >
            {n <= value ? "★" : "☆"}
          </button>
        ))}
        <span className="ml-2 text-sm font-black luxury-subtitle">{value}/5</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md p-6">
        {done ? (
          <div className="rounded-2xl border-2 border-[var(--ink)] bg-[#C7FF00] p-5 text-center text-sm font-black leading-6 shadow-[4px_4px_0_var(--ink)]">
            已保存。这次反馈已进入偏好学习，后续推荐会避开不合拍线索、强化真正有感觉的类型。
          </div>
        ) : (
          <>
            <p className="poster-kicker">Feedback</p>
            <h3 className="mt-3 text-xl font-black">聊完后的真实感受</h3>
            <div className="mt-5 space-y-5">
              <StarRow label="聊天感觉" value={vibeScore} onChange={setVibeScore} />
              <StarRow label="价值观合拍度" value={valuesScore} onChange={setValuesScore} />
              <StarRow label="继续发展的潜力" value={potentialScore} onChange={setPotentialScore} />
              <div>
                <p className="text-sm font-black">想补充给丘比的话</p>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="哪里合拍、哪里不适合、下次想被怎样推荐..."
                  rows={3}
                  className="luxury-input mt-2 w-full px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button type="button" onClick={onClose} className="luxury-btn-secondary flex-1 px-4 py-2.5 text-sm">
                取消
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="luxury-btn flex-1 px-4 py-2.5 text-sm disabled:opacity-50"
              >
                {submitting ? "提交中..." : "提交"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
