"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/error-report";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, {
      component: "global-error-boundary",
      level: "error",
      extra: { digest: error.digest },
    });
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
        {error.digest ? (
          <p className="break-all rounded-lg bg-white/5 px-3 py-1.5 text-[10px] font-mono text-white/30">
            错误ID: {error.digest}
          </p>
        ) : null}
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
