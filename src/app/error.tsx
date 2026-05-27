"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6" style={{ background: "#07090F" }}>
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-white/10 text-3xl">
          !
        </div>
        <h2 className="text-xl font-black text-white">出了点问题</h2>
        <p className="text-sm font-bold text-white/50">
          页面加载时遇到异常，请稍后再试。
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-2 rounded-xl px-6 py-2.5 text-sm font-black text-white transition hover:opacity-80"
          style={{ background: "#F43F5E" }}
        >
          重试
        </button>
      </div>
    </div>
  );
}
