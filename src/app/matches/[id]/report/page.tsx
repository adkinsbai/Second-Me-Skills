"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import type { DemoDimensionBlock } from "@/lib/demoMatchReport";

type ReportData = {
  targetUser: { name: string | null; avatarUrl: string | null; bio: string | null };
  totalScore?: number;
  interestScore?: number;
  personalityScore?: number;
  valuesScore?: number;
  lifeStoryScore?: number;
  futureScore?: number;
  summary?: string;
  report: Record<string, unknown> | null;
  consistencyPrediction?: {
    score: number;
    level: "高" | "中" | "低";
    overlapRate: number;
    contradictions: number;
    hint: string;
  };
  expectationNote?: string;
  riskNote?: string;
  starterTopics?: string[];
  actionPlan?: string[];
  relationshipProgress?: { steps: string[]; current: number };
  dateSuggestion?: string;
  relationshipNotes?: { memories?: string[]; nextPlan?: string };
  matchExplain?: {
    rhythm: number;
    emotion: number;
    values: number;
    attachment: number;
    vectorSimilarity: number;
  } | null;
  recommendationReasons?: string[];
};

const DIMENSIONS = [
  { key: "interestScore", label: "兴趣爱好", reportKey: "interest" },
  { key: "personalityScore", label: "性格 / MBTI", reportKey: "personality" },
  { key: "valuesScore", label: "价值观 / 人生观", reportKey: "values" },
  { key: "lifeStoryScore", label: "人生经历", reportKey: "lifeStory" },
  { key: "futureScore", label: "对未来的期许", reportKey: "future" },
] as const;

function isFacet(x: unknown): x is { label: string; observation: string } {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return typeof o.label === "string" && typeof o.observation === "string";
}

/** 兼容旧版 string-only reportJson */
function parseDimension(raw: unknown): DemoDimensionBlock | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    return {
      summary: raw,
      facets: [],
      bullets: [],
      caution: "",
      nextStep: "",
    };
  }
  if (typeof raw === "object" && raw !== null && "summary" in raw) {
    const o = raw as Record<string, unknown>;
    if (typeof o.summary !== "string") return null;
    return {
      summary: o.summary,
      facets: Array.isArray(o.facets) ? o.facets.filter(isFacet) : [],
      bullets: Array.isArray(o.bullets)
        ? o.bullets.filter((b): b is string => typeof b === "string")
        : [],
      caution: typeof o.caution === "string" ? o.caution : "",
      nextStep: typeof o.nextStep === "string" ? o.nextStep : "",
    };
  }
  return null;
}

export default function ReportPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/matches/${id}/report`)
      .then((r) => r.json())
      .then((d) => {
        if (d.code === 0) setData(d.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading || !data) {
    return (
      <main className="page-shell app-container py-10">
        <p className="luxury-subtitle text-sm">加载中…</p>
      </main>
    );
  }

  const hasScore = data.totalScore != null;
  const scores = {
    interestScore: data.interestScore ?? 0,
    personalityScore: data.personalityScore ?? 0,
    valuesScore: data.valuesScore ?? 0,
    lifeStoryScore: data.lifeStoryScore ?? 0,
    futureScore: data.futureScore ?? 0,
  };

  const executiveBrief =
    data.report && typeof data.report.executiveBrief === "string" ? data.report.executiveBrief : null;
  const consistency = data.consistencyPrediction;

  return (
    <main className="page-shell">
      <AppHeader backHref={`/matches/${id}`} title="多维度评分报告" />
      <div className="app-container max-w-2xl space-y-6 py-8">
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-4">
            {data.targetUser.avatarUrl && (
              <img
                src={data.targetUser.avatarUrl}
                alt=""
                className="h-16 w-16 rounded-full object-cover ring-2 ring-amber-200/30"
              />
            )}
            <div>
              <p className="font-medium text-amber-50">{data.targetUser.name ?? "对方"}</p>
              {hasScore ? (
                <>
                  <p className="bg-gradient-to-r from-amber-200 to-rose-200 bg-clip-text text-3xl font-semibold text-transparent">
                    {data.totalScore} 分
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-amber-100/80">{data.summary}</p>
                  {executiveBrief && (
                    <div className="luxury-alert luxury-alert-info mt-4 text-sm leading-relaxed">
                      <span className="font-medium">丘比总览 · </span>
                      {executiveBrief}
                    </div>
                  )}
                </>
              ) : (
                <p className="luxury-subtitle">暂无评分报告，完成 Agent 对话后将生成</p>
              )}
            </div>
          </div>
        </div>

        {!hasScore && (
          <p className="text-center text-sm text-amber-100/65">
            <Link href={`/matches/${id}/agent-chat`} className="text-amber-200 underline underline-offset-2">
              去看双方 Agent 初识对话
            </Link>
          </p>
        )}

        {hasScore && (
          <div className="space-y-5">
            {consistency && (
              <div
                className={`rounded-2xl border p-4 ${
                  consistency.score < 60
                    ? "border-red-400/35 bg-red-950/35 text-rose-50"
                    : consistency.score < 75
                      ? "border-amber-400/35 bg-amber-950/25 text-amber-50"
                      : "border-emerald-400/35 bg-emerald-950/30 text-emerald-50"
                }`}
              >
                <p className="text-sm font-semibold">
                  真人一致性预测：{consistency.level}（{consistency.score}%）
                </p>
                <p className="mt-1 text-sm text-amber-100/80">{consistency.hint}</p>
                <p className="mt-2 text-xs text-amber-100/50">
                  依据：信息重合度 {consistency.overlapRate}% · 矛盾点 {consistency.contradictions} 处
                </p>
              </div>
            )}

            {(data.expectationNote || data.riskNote) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {data.expectationNote && (
                  <div className="glass-card rounded-2xl p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-amber-100/45">预期管理</p>
                    <p className="mt-1 text-sm leading-relaxed text-amber-100/80">{data.expectationNote}</p>
                  </div>
                )}
                {data.riskNote && (
                  <div className="rounded-2xl border border-amber-400/35 bg-amber-950/25 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-amber-200/80">风险提示</p>
                    <p className="mt-1 text-sm leading-relaxed text-amber-50/95">{data.riskNote}</p>
                  </div>
                )}
              </div>
            )}

            {data.matchExplain && (
              <div className="glass-card rounded-2xl border border-violet-400/25 p-4">
                <p className="text-sm font-semibold text-violet-100">匹配度可解释面板</p>
                <div className="mt-3 grid gap-2 text-sm text-violet-100/85 sm:grid-cols-2">
                  <p>沟通节奏匹配度：{data.matchExplain.rhythm}%</p>
                  <p>情绪互补度：{data.matchExplain.emotion}%</p>
                  <p>价值观契合度：{data.matchExplain.values}%</p>
                  <p>依恋类型兼容度：{data.matchExplain.attachment}%</p>
                </div>
                <p className="mt-2 text-xs text-violet-200/75">
                  人格向量同频度：{Math.round(data.matchExplain.vectorSimilarity * 100)}%
                </p>
                {!!data.recommendationReasons?.length && (
                  <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-violet-100/90">
                    {data.recommendationReasons.slice(0, 4).map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {DIMENSIONS.map(({ key, label, reportKey }) => {
              const dim = parseDimension(data.report?.[reportKey]);
              const score = scores[key as keyof typeof scores];
              return (
                <div key={key} className="glass-card rounded-2xl p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-base font-semibold text-amber-50">{label}</span>
                    <span className="text-lg font-semibold text-amber-200">{score} 分</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/40 ring-1 ring-amber-100/15">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400/90 to-rose-500/90 transition-all"
                      style={{ width: `${score}%` }}
                    />
                  </div>

                  {dim && (
                    <div className="mt-4 space-y-4 text-sm text-amber-100/80">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-amber-100/45">维度综述</p>
                        <p className="mt-1 leading-relaxed">{dim.summary}</p>
                      </div>

                      {dim.facets.length > 0 && (
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-amber-100/45">细分观察</p>
                          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                            {dim.facets.map((f) => (
                              <li
                                key={f.label}
                                className="rounded-lg border border-amber-100/15 bg-black/30 px-3 py-2 leading-snug"
                              >
                                <span className="font-medium text-amber-50">{f.label}</span>
                                <span className="text-amber-100/65"> — {f.observation}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {dim.bullets.length > 0 && (
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-amber-100/45">对话证据与推论</p>
                          <ul className="mt-2 list-inside list-disc space-y-1.5 text-amber-100/70">
                            {dim.bullets.map((b, i) => (
                              <li key={i} className="leading-relaxed">
                                {b}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {dim.caution ? (
                        <div className="rounded-lg border border-amber-400/35 bg-amber-950/30 px-3 py-2 text-amber-50/95">
                          <span className="font-medium text-amber-200">风险提示 · </span>
                          {dim.caution}
                        </div>
                      ) : null}

                      {dim.nextStep ? (
                        <div className="luxury-alert luxury-alert-info px-3 py-2">
                          <span className="font-medium">建议下一步 · </span>
                          {dim.nextStep}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}

            {data.relationshipProgress && (
              <div className="glass-card rounded-2xl p-4">
                <p className="text-sm font-semibold text-amber-50">关系进度条</p>
                <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
                  {data.relationshipProgress.steps.map((s, i) => {
                    const active = i <= data.relationshipProgress!.current;
                    return (
                      <div key={s} className="flex items-center gap-2">
                        <span
                          className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${
                            active
                              ? "border border-amber-400/45 bg-amber-400/15 text-amber-50"
                              : "luxury-chip-muted"
                          }`}
                        >
                          {s}
                        </span>
                        {i < data.relationshipProgress!.steps.length - 1 && (
                          <span className="text-amber-100/30">→</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!!data.actionPlan?.length && (
              <div className="luxury-alert luxury-alert-info">
                <p className="text-sm font-semibold">下一步行动指南（3 选 1 立刻执行）</p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                  {data.actionPlan!.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}

            {!!data.starterTopics?.length && (
              <div className="glass-card rounded-2xl border border-indigo-400/25 p-4">
                <p className="text-sm font-semibold text-indigo-100">真人开场话题包</p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-indigo-100/85">
                  {data.starterTopics!.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            )}

            {data.dateSuggestion && (
              <div className="glass-card rounded-2xl border border-fuchsia-400/25 p-4">
                <p className="text-sm font-semibold text-fuchsia-100">约会建议</p>
                <p className="mt-1 text-sm text-fuchsia-100/85">{data.dateSuggestion}</p>
              </div>
            )}

            {data.relationshipNotes && (
              <div className="glass-card rounded-2xl p-4">
                <p className="text-sm font-semibold text-amber-50">关系沉淀</p>
                {!!data.relationshipNotes.memories?.length && (
                  <div className="mt-2">
                    <p className="text-xs uppercase tracking-wide text-amber-100/45">重要对话片段</p>
                    <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-amber-100/75">
                      {data.relationshipNotes.memories.slice(0, 3).map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {data.relationshipNotes.nextPlan && (
                  <p className="mt-2 text-sm text-amber-100/80">
                    <span className="font-medium text-amber-50">下一步计划：</span>
                    {data.relationshipNotes.nextPlan}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
