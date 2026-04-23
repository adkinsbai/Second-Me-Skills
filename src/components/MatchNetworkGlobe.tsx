"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader, AppHeaderNavRight } from "@/components/AppHeader";
import { FloatingHeartsBackground } from "@/components/FloatingHeartsBackground";
import { QiubiCenterMark } from "@/components/QiubiCenterMark";

type Phase = "idle" | "running" | "animating" | "success" | "fail" | "notice";

type PipelineStage = { id: string; title: string; detail: string; count: number };

type SeedData = {
  matchId?: string | null;
  matchIds?: string[];
  message?: string;
  waitingUntil?: string;
  alreadyMatchedToday?: boolean;
  noQualifiedCandidates?: boolean;
  pipeline?: { stages: PipelineStage[] } | null;
};

const STEP_MS = 520;
const POST_ANIM_MS = 380;

export function MatchNetworkGlobe({
  backHref = "/settings/heartbeat",
  title = "开始匹配",
}: {
  backHref?: string;
  title?: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("点击开启匹配：丘比会按你们的心动设置双向筛选，再在向量空间里找最合拍的人。");
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [activeStep, setActiveStep] = useState(-1);
  const navigateTimerRef = useRef<number | null>(null);
  const stepTimersRef = useRef<number[]>([]);
  const mountedRef = useRef(true);

  const clearTimers = () => {
    if (navigateTimerRef.current != null) {
      window.clearTimeout(navigateTimerRef.current);
      navigateTimerRef.current = null;
    }
    for (const t of stepTimersRef.current) window.clearTimeout(t);
    stepTimersRef.current = [];
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimers();
    };
  }, []);

  const runStepAnimation = useCallback(
    (nextStages: PipelineStage[], matchId: string | null | undefined, apiMessage: string) => {
      setStages(nextStages);
      setActiveStep(-1);
      setPhase("animating");
      setMessage("正在为你可视化匹配流水线…");

      const n = nextStages.length;
      for (let i = 0; i < n; i++) {
        const t = window.setTimeout(() => {
          if (!mountedRef.current) return;
          setActiveStep(i);
        }, i * STEP_MS);
        stepTimersRef.current.push(t);
      }

      const doneT = window.setTimeout(() => {
        if (!mountedRef.current) return;
        clearTimers();
        if (matchId) {
          setPhase("success");
          setMessage(apiMessage || "匹配成功！正在打开详情页…");
          navigateTimerRef.current = window.setTimeout(() => {
            navigateTimerRef.current = null;
            if (!mountedRef.current) return;
            router.push(`/matches/${matchId}`);
          }, POST_ANIM_MS + 900);
        } else {
          setPhase("fail");
          setMessage(
            apiMessage ||
              "本轮没有同时满足双向心动阈值的对象，可先完善资料与心动设置，或稍后再试。"
          );
        }
      }, n * STEP_MS + POST_ANIM_MS);
      stepTimersRef.current.push(doneT);
    },
    [router]
  );

  const onStart = async () => {
    if (phase !== "idle" && phase !== "fail" && phase !== "notice") return;
    clearTimers();
    setPhase("running");
    setStages([]);
    setActiveStep(-1);
    setMessage("正在连接匹配引擎，读取心动池与向量索引…");

    let seedRes: { code?: number; data?: SeedData; message?: string } | null;
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

    const data = seedRes?.data;
    const apiMessage = typeof data?.message === "string" ? data.message : "";

    if (!data?.pipeline?.stages?.length) {
      if (!mountedRef.current) return;
      setPhase("notice");
      setMessage(apiMessage || "暂时无法开始匹配流程。");
      return;
    }

    const matchId = data.matchId ? String(data.matchId) : null;
    runStepAnimation(data.pipeline.stages, matchId, apiMessage);
  };

  const busy = phase === "running" || phase === "animating";

  return (
    <main className="page-shell relative overflow-hidden">
      <FloatingHeartsBackground />

      <div className="relative z-10">
        <AppHeader backHref={backHref} title={title} right={<AppHeaderNavRight />} />

        <div className="app-container flex flex-col items-center py-10">
          <div className="glass-card w-full max-w-[560px] rounded-3xl p-6 sm:p-8">
            <div className="flex flex-col items-center gap-6">
              <div className="text-center">
                <h2 className="bg-gradient-to-r from-amber-200 via-rose-200 to-sky-200 bg-clip-text text-xl font-semibold text-transparent">
                  丘比 · 真实心动匹配
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-amber-100/75">{message}</p>
              </div>

              <div className="relative flex min-h-[300px] w-full flex-col items-center justify-center">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className={`match-pipeline-aurora h-72 w-72 rounded-full blur-3xl ${busy || phase === "success" ? "match-pipeline-aurora--on" : ""}`}
                  />
                </div>

                <div
                  className={`match-pipeline-ring glass-card relative flex h-52 w-52 items-center justify-center rounded-[40%] ring-2 ring-amber-200/30 ${
                    busy ? "match-pipeline-ring--pulse" : ""
                  } ${phase === "success" ? "match-pipeline-ring--win" : ""}`}
                >
                  <QiubiCenterMark className="h-[85%] w-[85%]" />
                </div>
                <p className="relative mt-4 text-sm font-medium tracking-wide text-amber-50/90">丘比核心</p>

                {phase === "success" && (
                  <div className="qiubi-love-collision" aria-hidden>
                    <span className="heart-left">{"\u2764"}</span>
                    <span className="heart-right">{"\u2764"}</span>
                    <span className="heart-pop">{"\u2764"}</span>
                    <span className="heart-ring" />
                  </div>
                )}

                {busy && (
                  <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-1">
                    <div className="match-pipeline-chip rounded-2xl px-4 py-2 text-sm text-amber-50 shadow-sm backdrop-blur">
                      {phase === "running" ? "请求匹配引擎…" : "流水线演算中…"}
                    </div>
                  </div>
                )}
              </div>

              {(phase === "animating" || phase === "success") && stages.length > 0 && (
                <div className="match-pipeline-steps w-full space-y-2">
                  {stages.map((s, i) => {
                    const done = activeStep > i || phase === "success";
                    const active = i === activeStep && phase === "animating";
                    return (
                      <div
                        key={s.id}
                        className={`match-pipeline-step rounded-2xl border px-4 py-3 transition duration-500 ${
                          done
                            ? "match-pipeline-step--done border-emerald-400/35 bg-emerald-950/20"
                            : active
                              ? "match-pipeline-step--active border-amber-200/55 bg-amber-950/25"
                              : "border-white/10 bg-black/20 opacity-45"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 text-left">
                            <p className="text-sm font-semibold text-amber-50">{s.title}</p>
                            <p className="mt-0.5 text-xs text-amber-100/65">{s.detail}</p>
                          </div>
                          <div
                            className={`shrink-0 rounded-xl px-3 py-1 text-lg font-bold tabular-nums ${
                              done || active ? "text-rose-200" : "text-amber-100/40"
                            }`}
                          >
                            {done || active ? s.count : "—"}
                          </div>
                        </div>
                        {active && <div className="match-pipeline-step-scan mt-2 h-0.5 overflow-hidden rounded-full" />}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex w-full flex-col items-stretch justify-center gap-3 sm:items-center">
                <button
                  type="button"
                  onClick={onStart}
                  disabled={busy}
                  className="luxury-btn rounded-2xl px-8 py-3 text-sm font-semibold disabled:opacity-60"
                >
                  {busy ? "匹配进行中…" : "开启匹配"}
                </button>
                <Link
                  href="/town"
                  className="w-full rounded-2xl border-2 border-rose-400/80 bg-rose-950/55 py-3 text-center text-sm font-bold text-rose-50 shadow-lg backdrop-blur-sm transition hover:bg-rose-950/75 sm:max-w-sm"
                >
                  丘比小镇：帖子广场 / 发布找人
                </Link>
              </div>

              {(phase === "fail" || phase === "notice") && (
                <div className="glass-card w-full rounded-2xl p-4 text-sm text-amber-50/90">
                  <div className="font-medium text-amber-100">{phase === "notice" ? "提示" : "未匹配成功"}</div>
                  <div className="mt-2 text-amber-100/80">{message}</div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => router.push("/settings/heartbeat")}
                      className="luxury-btn-secondary rounded-xl px-4 py-2 text-sm"
                    >
                      心动设置
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        clearTimers();
                        setPhase("idle");
                        setStages([]);
                        setActiveStep(-1);
                        setMessage(
                          "点击开启匹配：丘比会按你们的心动设置双向筛选，再在向量空间里找最合拍的人。"
                        );
                      }}
                      className="luxury-btn rounded-xl px-4 py-2 text-sm font-semibold"
                    >
                      知道了
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
