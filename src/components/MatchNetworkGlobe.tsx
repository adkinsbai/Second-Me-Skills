"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader, AppHeaderNavRight } from "@/components/AppHeader";
import { FloatingHeartsBackground } from "@/components/FloatingHeartsBackground";
import { QiubiCenterMark } from "@/components/QiubiCenterMark";

type Phase = "idle" | "running" | "success" | "fail";

export function MatchNetworkGlobe({
  backHref = "/settings/heartbeat",
  title = "开始匹配",
}: {
  backHref?: string;
  title?: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("点击开启匹配，让丘比从真实用户池里为你寻找合拍的人。");
  const navigateTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const clearTimers = () => {
    if (navigateTimerRef.current != null) {
      window.clearTimeout(navigateTimerRef.current);
      navigateTimerRef.current = null;
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimers();
    };
  }, []);

  const onStart = async () => {
    if (phase !== "idle") return;
    clearTimers();
    setPhase("running");
    setMessage("正在从真实用户池匹配，并为你们准备 Agent 初识对话…");

    let seedRes: { code?: number; data?: { matchId?: string }; message?: string } | null;
    try {
      const r = await fetch("/api/matches/seed", {
        method: "POST",
        credentials: "include",
      });
      seedRes = await r.json().catch(() => null);
      if (!r.ok || seedRes?.code !== 0) {
        const msg = seedRes?.message ? String(seedRes.message) : "生成失败，请稍后重试";
        if (!mountedRef.current) return;
        setPhase("fail");
        setMessage(msg);
        return;
      }
    } catch {
      if (!mountedRef.current) return;
      setPhase("fail");
      setMessage("网络错误，请稍后重试");
      return;
    }

    const id = seedRes?.data?.matchId ? String(seedRes.data.matchId) : null;
    if (!id) {
      if (!mountedRef.current) return;
      setPhase("fail");
      setMessage("匹配生成失败，请稍后重试");
      return;
    }

    if (!mountedRef.current) return;
    setPhase("success");
    setMessage("匹配成功！正在打开双方 Agent 初识对话…");

    navigateTimerRef.current = window.setTimeout(() => {
      navigateTimerRef.current = null;
      if (!mountedRef.current) return;
      router.push(`/matches/${id}/agent-chat`);
    }, 1200);
  };

  return (
    <main className="page-shell relative overflow-hidden">
      <FloatingHeartsBackground />

      <div className="relative z-10">
        <AppHeader backHref={backHref} title={title} right={<AppHeaderNavRight />} />

        <div className="app-container flex flex-col items-center py-10">
          <div className="glass-card w-full max-w-[520px] rounded-3xl p-8">
            <div className="flex flex-col items-center gap-8">
              <div className="text-center">
                <h2 className="bg-gradient-to-r from-amber-200 via-rose-200 to-sky-200 bg-clip-text text-xl font-semibold text-transparent">
                  丘比 · 心动匹配
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-amber-100/75">{message}</p>
              </div>

              <div className="relative flex min-h-[280px] w-full flex-col items-center justify-center">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-64 w-64 rounded-full bg-gradient-to-br from-amber-200/20 via-rose-200/20 to-sky-200/20 blur-3xl" />
                </div>
                <div
                  className={`glass-card relative flex h-52 w-52 items-center justify-center rounded-[40%] ring-2 ring-amber-200/30 ${
                    phase === "running" ? "animate-pulse" : ""
                  }`}
                >
                  <QiubiCenterMark className="h-[85%] w-[85%]" />
                </div>
                <p className="relative mt-4 text-sm font-medium tracking-wide text-amber-50/90">丘比</p>

                {phase === "success" && (
                  <div className="qiubi-love-collision" aria-hidden>
                    <span className="heart-left">❤</span>
                    <span className="heart-right">❤</span>
                    <span className="heart-pop">❤</span>
                    <span className="heart-ring" />
                  </div>
                )}

                {phase !== "idle" && (
                  <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-1">
                    <div className="rounded-2xl border border-amber-200/30 bg-black/35 px-4 py-2 text-sm text-amber-50 shadow-sm backdrop-blur">
                      {phase === "running" ? "匹配中…" : phase === "success" ? "请稍候" : "暂无匹配"}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex w-full flex-col items-stretch justify-center gap-3 sm:items-center">
                <button
                  type="button"
                  onClick={onStart}
                  disabled={phase === "running"}
                  className="luxury-btn rounded-2xl px-8 py-3 text-sm font-semibold disabled:opacity-60"
                >
                  {phase === "running" ? "开启匹配中…" : "开启匹配"}
                </button>
                <Link
                  href="/town"
                  className="w-full rounded-2xl border-2 border-rose-400/80 bg-rose-950/55 py-3 text-center text-sm font-bold text-rose-50 shadow-lg backdrop-blur-sm transition hover:bg-rose-950/75 sm:max-w-sm"
                >
                  丘比小镇：帖子广场 / 发布找人
                </Link>
              </div>

              {phase === "fail" && (
                <div className="glass-card w-full rounded-2xl p-4 text-sm text-amber-50/90">
                  <div className="font-medium text-amber-100">提示</div>
                  <div className="mt-2 text-amber-100/80">{message}</div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => router.push("/settings/heartbeat")}
                      className="luxury-btn-secondary rounded-xl px-4 py-2 text-sm"
                    >
                      回到心动设置
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        clearTimers();
                        setPhase("idle");
                        setMessage("点击开启匹配，让丘比从真实用户池里为你寻找合拍的人。");
                      }}
                      className="luxury-btn rounded-xl px-4 py-2 text-sm font-semibold"
                    >
                      再试一次
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
