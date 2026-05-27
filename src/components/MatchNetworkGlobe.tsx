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
  message?: string;
  matchedUser?: { matchReason?: string } | null;
  pipeline?: { stages: PipelineStage[] } | null;
};

const STEP_MS = 520;
const POST_ANIM_MS = 380;
const SUCCESS_NAV_EXTRA_MS = 900;
const SUCCESS_NAV_STORY_MS = 4200;
const INITIAL_MESSAGE =
  "点击开始匹配后，丘比会结合你的资料、匹配偏好和候选用户池，挑出本轮最值得认识的人。";

export function MatchNetworkGlobe({
  backHref = "/settings/heartbeat",
  title = "开始匹配",
}: {
  backHref?: string;
  title?: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState(INITIAL_MESSAGE);
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
    for (const timer of stepTimersRef.current) window.clearTimeout(timer);
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
    (nextStages: PipelineStage[], matchId: string | null | undefined, apiMessage: string, storyParagraph?: string) => {
      setStages(nextStages);
      setActiveStep(-1);
      setPhase("animating");
      setMessage("正在可视化本轮匹配流程...");

      const count = nextStages.length;
      for (let index = 0; index < count; index++) {
        const timer = window.setTimeout(() => {
          if (!mountedRef.current) return;
          setActiveStep(index);
        }, index * STEP_MS);
        stepTimersRef.current.push(timer);
      }

      const doneTimer = window.setTimeout(() => {
        if (!mountedRef.current) return;
        clearTimers();
        if (matchId) {
          setPhase("success");
          const base = apiMessage || "匹配成功。";
          const story = typeof storyParagraph === "string" && storyParagraph.trim() ? storyParagraph.trim() : "";
          setMessage(story ? `${base}\n\n丘比写给你们的话：\n${story}` : `${base} 正在打开详情页...`);
          const navDelay = POST_ANIM_MS + (story ? SUCCESS_NAV_STORY_MS : SUCCESS_NAV_EXTRA_MS);
          navigateTimerRef.current = window.setTimeout(() => {
            navigateTimerRef.current = null;
            if (!mountedRef.current) return;
            router.push(`/matches/${matchId}`);
          }, navDelay);
        } else {
          setPhase("fail");
          setMessage(apiMessage || "本轮没有找到足够合适的对象。可以先完善资料与匹配偏好，稍后再试。");
        }
      }, count * STEP_MS + POST_ANIM_MS);
      stepTimersRef.current.push(doneTimer);
    },
    [router]
  );

  const onStart = async () => {
    if (phase !== "idle" && phase !== "fail" && phase !== "notice") return;
    clearTimers();
    setPhase("running");
    setStages([]);
    setActiveStep(-1);
    setMessage("正在连接匹配引擎，读取资料、偏好和候选用户池...");

    let seedRes: { code?: number; data?: SeedData; message?: string } | null;
    try {
      const response = await fetch("/api/matches/seed", { method: "POST", credentials: "include" });
      seedRes = await response.json().catch(() => null);
      if (!response.ok || seedRes?.code !== 0) {
        if (!mountedRef.current) return;
        setPhase("fail");
        setMessage(seedRes?.message ? String(seedRes.message) : "生成失败，请稍后再试。");
        return;
      }
    } catch {
      if (!mountedRef.current) return;
      setPhase("fail");
      setMessage("网络错误，请稍后再试。");
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
    const story = typeof data.matchedUser?.matchReason === "string" ? data.matchedUser.matchReason : "";
    runStepAnimation(data.pipeline.stages, matchId, apiMessage, story);
  };

  const busy = phase === "running" || phase === "animating";

  return (
    <main className="page-shell relative overflow-hidden">
      <FloatingHeartsBackground />
      <div className="relative z-10">
        <AppHeader backHref={backHref} title={title} right={<AppHeaderNavRight />} />

        <div className="app-container flex flex-col items-center py-10">
          <div className="poster-panel w-full max-w-[560px] overflow-hidden rounded-[2rem] p-6 sm:p-8">
            <div className="flex flex-col items-center gap-6">
              <div className="text-center">
                <div className="poster-kicker mx-auto mb-4">Match Radar</div>
                <h2 className="text-3xl font-black leading-9 text-[var(--brand)]">丘比真实匹配雷达</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm font-bold leading-relaxed text-[var(--paper)]">
                  {message}
                </p>
              </div>

              <div className="relative flex min-h-[300px] w-full flex-col items-center justify-center">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className={`match-pipeline-aurora h-72 w-72 rounded-full blur-3xl ${
                      busy || phase === "success" ? "match-pipeline-aurora--on" : ""
                    }`}
                  />
                </div>

                <div
                  className={`match-pipeline-ring relative flex h-52 w-52 rotate-[-5deg] items-center justify-center rounded-[34%] border-2 border-[var(--paper)] bg-[var(--brand)] shadow-[8px_8px_0_var(--love)] ${
                    busy ? "match-pipeline-ring--pulse" : ""
                  } ${phase === "success" ? "match-pipeline-ring--win" : ""}`}
                >
                  <QiubiCenterMark className="h-[85%] w-[85%]" />
                </div>
                <p className="relative mt-4 text-sm font-black tracking-wide text-[var(--paper)]">丘比核心</p>

                {phase === "success" ? (
                  <div className="qiubi-love-collision" aria-hidden>
                    <span className="heart-left">{"\u2764"}</span>
                    <span className="heart-right">{"\u2764"}</span>
                    <span className="heart-pop">{"\u2764"}</span>
                    <span className="heart-ring" />
                  </div>
                ) : null}

                {busy ? (
                  <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-1">
                    <div className="match-pipeline-chip rounded-2xl border-2 border-[var(--paper)] bg-[var(--c-amber)] px-4 py-2 text-sm font-black text-[var(--ink)] shadow-[4px_4px_0_var(--paper)]">
                      {phase === "running" ? "请求匹配引擎..." : "流程演算中..."}
                    </div>
                  </div>
                ) : null}
              </div>

              {(phase === "animating" || phase === "success") && stages.length > 0 ? (
                <div className="match-pipeline-steps w-full space-y-2">
                  {stages.map((stage, index) => {
                    const done = activeStep > index || phase === "success";
                    const active = index === activeStep && phase === "animating";
                    return (
                      <div
                        key={stage.id}
                        className={`match-pipeline-step rounded-2xl border px-4 py-3 transition duration-500 ${
                          done
                            ? "match-pipeline-step--done border-emerald-400/35 bg-emerald-950/20"
                            : active
                              ? "match-pipeline-step--active border-amber-200/55 bg-amber-950/25"
                              : "border-white/10 bg-gray-50 opacity-45"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 text-left">
                            <p className="text-sm font-black text-[var(--paper)]">{stage.title}</p>
                            <p className="mt-0.5 text-xs text-[var(--fg-3)]">{stage.detail}</p>
                          </div>
                          <div
                            className={`shrink-0 rounded-xl px-3 py-1 text-lg font-black tabular-nums ${
                              done || active ? "text-rose-200" : "text-gray-300"
                            }`}
                          >
                            {done || active ? stage.count : "..."}
                          </div>
                        </div>
                        {active ? <div className="match-pipeline-step-scan mt-2 h-0.5 overflow-hidden rounded-full" /> : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}

              <div className="flex w-full flex-col items-stretch justify-center gap-3 sm:items-center">
                <button
                  type="button"
                  onClick={onStart}
                  disabled={busy}
                  className="luxury-btn rounded-2xl px-8 py-3 text-sm font-black disabled:opacity-60"
                >
                  {busy ? "匹配进行中..." : "开启匹配"}
                </button>
                <Link
                  href="/town"
                  className="w-full rounded-2xl border-2 border-[var(--ink)] bg-[var(--love)] py-3 text-center text-sm font-black text-white shadow-[5px_5px_0_var(--ink)] transition hover:-translate-y-1 sm:max-w-sm"
                >
                  丘比小镇：发布需求 / 找搭子
                </Link>
              </div>

              {phase === "fail" || phase === "notice" ? (
                <div className="glass-card w-full rounded-2xl p-4 text-sm font-bold text-[var(--ink)]">
                  <div className="font-black">{phase === "notice" ? "提示" : "未匹配成功"}</div>
                  <div className="mt-2 text-[var(--muted-ink)]">{message}</div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => router.push("/settings/heartbeat")}
                      className="luxury-btn-secondary rounded-xl px-4 py-2 text-sm"
                    >
                      调整匹配偏好
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        clearTimers();
                        setPhase("idle");
                        setStages([]);
                        setActiveStep(-1);
                        setMessage(INITIAL_MESSAGE);
                      }}
                      className="luxury-btn rounded-xl px-4 py-2 text-sm font-black"
                    >
                      知道了
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
