"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";

type DimensionBlock = {
  summary: string;
  facets: { label: string; observation: string }[];
  bullets: string[];
  caution: string;
  nextStep: string;
};

type ReportData = {
  targetUser: { name: string | null; avatarUrl: string | null; bio: string | null };
  totalScore?: number;
  interestScore?: number;
  personalityScore?: number;
  valuesScore?: number;
  lifeStoryScore?: number;
  futureScore?: number;
  summary?: string;
  matchReason?: string;
  report: Record<string, unknown> | null;
  consistencyPrediction?: {
    score: number;
    level: string;
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

type ScoreKey =
  | "interestScore"
  | "personalityScore"
  | "valuesScore"
  | "lifeStoryScore"
  | "futureScore";

const DIMENSIONS: Array<{ key: ScoreKey; label: string; reportKey: string; tone: string }> = [
  { key: "interestScore", label: "兴趣与日常", reportKey: "interest", tone: "bg-[#C7FF00]" },
  { key: "personalityScore", label: "性格与表达", reportKey: "personality", tone: "bg-[#FFE500]" },
  { key: "valuesScore", label: "价值观", reportKey: "values", tone: "bg-[#FF2D8D] text-white" },
  { key: "lifeStoryScore", label: "生活经历", reportKey: "lifeStory", tone: "bg-[#174BFF] text-white" },
  { key: "futureScore", label: "未来节奏", reportKey: "future", tone: "bg-[#FFFDF2]" },
];

function isFacet(x: unknown): x is { label: string; observation: string } {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return typeof o.label === "string" && typeof o.observation === "string";
}

function parseDimension(raw: unknown): DimensionBlock | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    return { summary: raw, facets: [], bullets: [], caution: "", nextStep: "" };
  }
  if (typeof raw !== "object") return null;
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

function asScore(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;
}

function explainRows(data: ReportData) {
  if (!data.matchExplain) return [];
  return [
    ["聊天节奏", data.matchExplain.rhythm],
    ["情绪回应", data.matchExplain.emotion],
    ["价值重合", data.matchExplain.values],
    ["关系期待", data.matchExplain.attachment],
    ["资料相似", data.matchExplain.vectorSimilarity],
  ].map(([label, value]) => ({ label: String(label), value: asScore(value) ?? 0 }));
}

export default function ReportPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoading(true);
    fetch(`/api/matches/${id}/report`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d.code === 0) setData(d.data);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <main className="page-shell">
        <AppHeader backHref={`/matches/${id}`} title="合拍报告" />
        <div className="app-container py-10">
          <div className="glass-card p-6 text-sm font-semibold">丘比正在整理你们的合拍线索...</div>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="page-shell">
        <AppHeader backHref={`/matches/${id}`} title="合拍报告" />
        <div className="app-container py-10">
          <div className="glass-card space-y-3 p-6">
            <p className="text-lg font-black">报告暂时没有生成</p>
            <p className="text-sm leading-6 luxury-subtitle">
              可以先回到匹配详情页，继续完善资料或发起对话，丘比会在信息更充分后补全报告。
            </p>
            <Link href={`/matches/${id}`} className="luxury-btn inline-flex px-4 py-2 text-sm">
              返回匹配详情
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const totalScore = asScore(data.totalScore);
  const executiveBrief =
    data.report && typeof data.report.executiveBrief === "string" ? data.report.executiveBrief : null;
  const lead = data.matchReason ?? data.summary ?? executiveBrief;
  const explain = explainRows(data);

  return (
    <main className="page-shell">
      <AppHeader backHref={`/matches/${id}`} title="合拍报告" />
      <div className="app-container max-w-3xl space-y-7 py-8">
        <section className="poster-panel overflow-hidden">
          <div className="poster-stripe h-4 border-b-2 border-[var(--ink)]" />
          <div className="grid gap-5 p-5 sm:grid-cols-[auto_1fr] sm:p-6">
            <div className="h-24 w-24 overflow-hidden rounded-[1.2rem] border-2 border-[var(--paper)] bg-[#FFE500] shadow-[5px_5px_0_#F7F2E8]">
              {data.targetUser.avatarUrl ? (
                <img src={data.targetUser.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-black text-[var(--ink)]">
                  {(data.targetUser.name ?? "对方").trim()[0] ?? "Q"}
                </div>
              )}
            </div>
            <div>
              <p className="poster-kicker">Qiubi Match Report</p>
              <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-black leading-tight text-[var(--paper)] sm:text-4xl">
                    {data.targetUser.name ?? "对方"}
                  </h1>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-[rgba(247,242,232,.74)]">
                    {lead ?? "丘比还在等待更多互动线索，暂时先保留这个合拍席位。"}
                  </p>
                </div>
                {totalScore !== null && (
                  <div className="rounded-[1rem] border-2 border-[var(--paper)] bg-[#C7FF00] px-5 py-3 text-center text-[var(--ink)] shadow-[5px_5px_0_#F7F2E8]">
                    <p className="text-xs font-black uppercase">Score</p>
                    <p className="text-4xl font-black">{totalScore}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {executiveBrief && executiveBrief !== lead && (
          <section className="luxury-alert luxury-alert-info leading-7">
            <span className="font-black">丘比总览：</span>
            {executiveBrief}
          </section>
        )}

        <section className="grid gap-3 sm:grid-cols-5">
          {DIMENSIONS.map((item) => {
            const score = asScore(data[item.key]);
            return (
              <div key={item.key} className={`rounded-2xl border-2 border-[var(--ink)] p-3 shadow-[4px_4px_0_var(--ink)] ${item.tone}`}>
                <p className="text-xs font-black">{item.label}</p>
                <p className="mt-2 text-2xl font-black">{score ?? "--"}</p>
              </div>
            );
          })}
        </section>

        {data.consistencyPrediction && (
          <section className="glass-card grid gap-4 p-5 sm:grid-cols-[auto_1fr]">
            <div className="rounded-2xl border-2 border-[var(--ink)] bg-[#FFE500] px-5 py-4 text-center shadow-[4px_4px_0_var(--ink)]">
              <p className="text-xs font-black">真人一致性</p>
              <p className="text-3xl font-black">{asScore(data.consistencyPrediction.score) ?? "--"}</p>
              <p className="text-xs font-black">{data.consistencyPrediction.level}</p>
            </div>
            <div className="text-sm leading-7">
              <p className="font-black">预测提示</p>
              <p className="luxury-subtitle">{data.consistencyPrediction.hint}</p>
              <p className="mt-2 text-xs font-bold luxury-subtitle">
                资料重合 {Math.round(data.consistencyPrediction.overlapRate * 100)}% / 需要留意的差异{" "}
                {data.consistencyPrediction.contradictions} 处
              </p>
            </div>
          </section>
        )}

        {!!explain.length && (
          <section className="glass-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="poster-kicker">Signals</p>
                <h2 className="mt-3 text-xl font-black">丘比看到的线索</h2>
              </div>
              {!!data.recommendationReasons?.length && (
                <p className="max-w-sm text-sm leading-6 luxury-subtitle">{data.recommendationReasons[0]}</p>
              )}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-5">
              {explain.map((row) => (
                <div key={row.label} className="rounded-xl border-2 border-[var(--ink)] bg-[#FFFDF2] p-3">
                  <p className="text-xs font-black">{row.label}</p>
                  <div className="mt-3 h-2 rounded-full border border-[var(--ink)] bg-white">
                    <div className="h-full rounded-full bg-[#FF2D8D]" style={{ width: `${Math.min(100, Math.max(0, row.value))}%` }} />
                  </div>
                  <p className="mt-2 text-sm font-black">{row.value}</p>
                </div>
              ))}
            </div>
            {!!data.recommendationReasons?.slice(1).length && (
              <ul className="mt-4 grid gap-2 text-sm leading-6 sm:grid-cols-2">
                {data.recommendationReasons.slice(1, 5).map((item) => (
                  <li key={item} className="rounded-xl border-2 border-[var(--ink)] bg-[#C7FF00] px-3 py-2 font-bold">
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className="space-y-4">
          {DIMENSIONS.map(({ key, label, reportKey, tone }) => {
            const dim = parseDimension(data.report?.[reportKey]);
            const score = asScore(data[key]);
            return (
              <article key={key} className="glass-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-black">{label}</h2>
                  <span className={`rounded-full border-2 border-[var(--ink)] px-3 py-1 text-sm font-black shadow-[3px_3px_0_var(--ink)] ${tone}`}>
                    {score !== null ? `${score}/100` : "待补充"}
                  </span>
                </div>

                {dim ? (
                  <div className="mt-4 space-y-4 text-sm leading-7">
                    <p className="luxury-subtitle">{dim.summary}</p>
                    {!!dim.facets.length && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {dim.facets.map((facet) => (
                          <div key={facet.label} className="rounded-xl border-2 border-[var(--ink)] bg-[#FFFDF2] px-3 py-2">
                            <p className="font-black">{facet.label}</p>
                            <p className="luxury-subtitle">{facet.observation}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {!!dim.bullets.length && (
                      <ul className="space-y-2">
                        {dim.bullets.map((bullet) => (
                          <li key={bullet} className="rounded-xl border-2 border-[var(--ink)] bg-[#FFE500] px-3 py-2 font-bold">
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    )}
                    {dim.caution && (
                      <div className="luxury-alert luxury-alert-error leading-6">
                        <span className="font-black">留意：</span>
                        {dim.caution}
                      </div>
                    )}
                    {dim.nextStep && (
                      <div className="luxury-alert luxury-alert-info leading-6">
                        <span className="font-black">下一步：</span>
                        {dim.nextStep}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-sm luxury-subtitle">这个维度还没有足够线索，继续互动后会更准确。</p>
                )}
              </article>
            );
          })}
        </section>

        {(data.expectationNote || data.riskNote) && (
          <section className="grid gap-4 sm:grid-cols-2">
            {data.expectationNote && (
              <div className="glass-card p-5">
                <p className="poster-kicker">Expectation</p>
                <p className="mt-3 text-sm leading-7 luxury-subtitle">{data.expectationNote}</p>
              </div>
            )}
            {data.riskNote && (
              <div className="luxury-alert luxury-alert-error leading-7">
                <p className="font-black">需要提前说清楚</p>
                <p className="mt-1">{data.riskNote}</p>
              </div>
            )}
          </section>
        )}

        {data.relationshipProgress && (
          <section className="glass-card p-5">
            <h2 className="text-lg font-black">关系进度</h2>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
              {data.relationshipProgress.steps.map((step, index) => {
                const active = index <= data.relationshipProgress!.current;
                return (
                  <span
                    key={step}
                    className={`whitespace-nowrap rounded-full border-2 border-[var(--ink)] px-3 py-1 text-sm font-black shadow-[3px_3px_0_var(--ink)] ${
                      active ? "bg-[#C7FF00]" : "bg-[#FFFDF2]"
                    }`}
                  >
                    {step}
                  </span>
                );
              })}
            </div>
          </section>
        )}

        {!!data.actionPlan?.length && (
          <section className="glass-card p-5">
            <p className="poster-kicker">Action</p>
            <h2 className="mt-3 text-xl font-black">下一步行动</h2>
            <ul className="mt-4 space-y-2 text-sm leading-6">
              {data.actionPlan.map((item, index) => (
                <li key={item} className="rounded-xl border-2 border-[var(--ink)] bg-[#C7FF00] px-3 py-2 font-bold">
                  {index + 1}. {item}
                </li>
              ))}
            </ul>
          </section>
        )}

        {!!data.starterTopics?.length && (
          <section className="glass-card p-5">
            <p className="poster-kicker">Openers</p>
            <h2 className="mt-3 text-xl font-black">开场话题</h2>
            <ul className="mt-4 grid gap-2 text-sm leading-6 sm:grid-cols-2">
              {data.starterTopics.map((topic) => (
                <li key={topic} className="rounded-xl border-2 border-[var(--ink)] bg-[#FFE500] px-3 py-2 font-bold">
                  {topic}
                </li>
              ))}
            </ul>
          </section>
        )}

        {(data.dateSuggestion || data.relationshipNotes) && (
          <section className="grid gap-4 sm:grid-cols-2">
            {data.dateSuggestion && (
              <div className="glass-card p-5">
                <p className="poster-kicker">Date</p>
                <p className="mt-3 text-sm leading-7 luxury-subtitle">{data.dateSuggestion}</p>
              </div>
            )}
            {data.relationshipNotes && (
              <div className="glass-card p-5">
                <p className="poster-kicker">Memory</p>
                {!!data.relationshipNotes.memories?.length && (
                  <ul className="mt-3 space-y-2 text-sm leading-6 luxury-subtitle">
                    {data.relationshipNotes.memories.slice(0, 3).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
                {data.relationshipNotes.nextPlan && (
                  <p className="mt-3 text-sm font-bold">{data.relationshipNotes.nextPlan}</p>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
