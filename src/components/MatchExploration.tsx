"use client";

import { useEffect, useState } from "react";

const EXPLORATION_MESSAGES = [
  "正在分析你的特质...",
  "探索你的偏好模式...",
  "寻找合拍的灵魂...",
  "计算默契度...",
  "锁定心动目标...",
];

export function MatchExploration({ onComplete }: { onComplete?: () => void }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % EXPLORATION_MESSAGES.length);
    }, 1800);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          clearInterval(messageInterval);
          onComplete?.();
          return 100;
        }
        return prev + 2;
      });
    }, 80);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <style jsx global>{`
        @keyframes exploration-pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes exploration-ring-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes exploration-glow {
          0%, 100% { box-shadow: 0 0 20px var(--brand), 0 0 40px var(--brand), 0 0 60px var(--brand); }
          50% { box-shadow: 0 0 30px var(--brand), 0 0 60px var(--brand), 0 0 90px var(--brand); }
        }
        @keyframes exploration-dot {
          0%, 80%, 100% { opacity: 0; }
          40% { opacity: 1; }
        }
        .exploration-orb {
          animation: exploration-pulse 2s ease-in-out infinite, exploration-glow 3s ease-in-out infinite;
        }
        .exploration-ring {
          animation: exploration-ring-spin 3s linear infinite;
        }
        .exploration-dot-1 { animation: exploration-dot 1.4s ease-in-out infinite 0s; }
        .exploration-dot-2 { animation: exploration-dot 1.4s ease-in-out infinite 0.2s; }
        .exploration-dot-3 { animation: exploration-dot 1.4s ease-in-out infinite 0.4s; }
        @keyframes message-enter {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .exploration-message {
          animation: message-enter 0.4s ease-out;
        }
      `}</style>

      <div className="relative flex h-40 w-40 items-center justify-center">
        <div className="exploration-ring absolute inset-0 rounded-full border-4 border-transparent border-t-[var(--brand)] border-r-[var(--c-pink)] opacity-60" />
        <div className="exploration-ring absolute inset-2 rounded-full border-4 border-transparent border-b-[var(--c-gold)] border-l-[var(--c-blue)] opacity-40" style={{ animationDirection: "reverse", animationDuration: "2.5s" }} />
        <div className="exploration-orb h-24 w-24 rounded-full bg-gradient-to-br from-[var(--brand)] to-[var(--c-pink)]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">Q</span>
        </div>
      </div>

      <div className="exploration-message text-center" key={messageIndex}>
        <p className="text-lg font-black text-[var(--paper)]">
          {EXPLORATION_MESSAGES[messageIndex]}
        </p>
        <div className="mt-1 flex justify-center gap-1">
          <span className="exploration-dot-1 h-1.5 w-1.5 rounded-full bg-[var(--brand)]" />
          <span className="exploration-dot-2 h-1.5 w-1.5 rounded-full bg-[var(--brand)]" />
          <span className="exploration-dot-3 h-1.5 w-1.5 rounded-full bg-[var(--brand)]" />
        </div>
      </div>

      <div className="w-full max-w-[280px]">
        <div className="h-3 overflow-hidden rounded-full border-2 border-[var(--ink)] bg-[var(--paper)]">
          <div
            className="h-full rounded-full transition-all duration-200 ease-out"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, var(--brand), var(--c-pink), var(--c-gold))",
            }}
          />
        </div>
        <p className="mt-2 text-center text-xs font-bold text-[var(--muted-ink)]">
          {progress}% 完成
        </p>
      </div>
    </div>
  );
}
