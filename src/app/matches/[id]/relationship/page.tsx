"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";

type RelationshipData = {
  starterTopics?: string[];
  relationshipNotes?: { memories?: string[]; nextPlan?: string };
  actionPlan?: string[];
  relationshipProgress?: { steps: string[]; current: number };
  dateSuggestion?: string;
  recommendationReasons?: string[];
};

type GuidanceData = {
  openerSuggestions?: string[];
  nextActions?: string[];
  reflectionPrompts?: string[];
  relationshipProgress?: { steps: string[]; current: number };
  dateSuggestion?: string;
  recentMemories?: string[];
  messageCount?: number;
};

export default function RelationshipPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<RelationshipData | null>(null);
  const [guidance, setGuidance] = useState<GuidanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoading(true);
    Promise.all([
      fetch(`/api/matches/${id}/report`)
        .then((response) => response.json())
        .catch(() => null),
      fetch(`/api/matches/${id}/guidance`)
        .then((response) => response.json())
        .catch(() => null),
    ])
      .then(([reportResult, guidanceResult]) => {
        if (!alive) return;
        if (reportResult?.code === 0) setData(reportResult.data ?? null);
        if (guidanceResult?.code === 0) setGuidance(guidanceResult.data ?? null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <main className="page-shell flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--ink)] border-t-[var(--brand)]" />
      </main>
    );
  }

  const topics = guidance?.openerSuggestions?.length
    ? guidance.openerSuggestions
    : data?.starterTopics?.length
      ? data.starterTopics
      : ["从最近最有共鸣的话题开始，先保持轻松节奏。"];
  const memories = guidance?.recentMemories?.length
    ? guidance.recentMemories
    : data?.relationshipNotes?.memories?.length
      ? data.relationshipNotes.memories
      : ["你们刚刚建立连接，后续有共鸣的聊天片段会沉淀在这里。"];
  const nextActions = guidance?.nextActions?.length
    ? guidance.nextActions
    : data?.actionPlan?.length
      ? data.actionPlan
      : ["继续轻量互动，并在 2-3 天后复盘是否继续推进。"];
  const progress = guidance?.relationshipProgress ?? data?.relationshipProgress;
  const dateSuggestion = guidance?.dateSuggestion ?? data?.dateSuggestion;

  return (
    <main className="page-shell">
      <AppHeader backHref={`/matches/${id}`} title="关系沉淀" />
      <div className="app-container max-w-3xl space-y-5 py-8">
        <section className="poster-panel overflow-hidden">
          <div className="poster-stripe h-4 border-b-2 border-[var(--ink)]" />
          <div className="p-5">
            <p className="poster-kicker">Relationship OS</p>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-[var(--paper)]">把聊天推进成关系线索</h1>
                <p className="mt-2 max-w-xl text-sm font-bold leading-6 text-[var(--paper)]/75">
                  丘比把合拍报告、真实聊天和你的反馈放在一起，给出下一轮更具体的行动。
                </p>
              </div>
              <Link href={`/matches/${id}/chat`} className="luxury-btn px-4 py-2 text-sm">
                去聊天
              </Link>
            </div>
          </div>
        </section>

        {progress && (
          <section className="glass-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="poster-kicker">Progress</p>
                <h2 className="mt-3 text-xl font-black text-[var(--ink)]">关系进度</h2>
              </div>
              <span className="rounded-full border-2 border-[var(--ink)] bg-[#FF2D8D] px-3 py-1 text-xs font-black text-white shadow-[3px_3px_0_var(--ink)]">
                {guidance?.messageCount ?? 0} 条互动
              </span>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-5">
              {progress.steps.map((step, index) => {
                const active = index <= progress.current;
                return (
                  <div
                    key={step}
                    className={`min-h-[72px] rounded-xl border-2 border-[var(--ink)] p-3 text-sm font-black shadow-[3px_3px_0_var(--ink)] ${
                      active ? "bg-[#C7FF00]" : "bg-[#FFFDF2]"
                    }`}
                  >
                    <p className="text-xs opacity-60">0{index + 1}</p>
                    <p className="mt-1">{step}</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="grid gap-4 md:grid-cols-[1.15fr_.85fr]">
          <div className="glass-card p-5">
            <p className="poster-kicker">Openers</p>
            <h2 className="mt-3 text-xl font-black text-[var(--ink)]">可以继续聊的话题</h2>
            <div className="mt-4 grid gap-2">
              {topics.slice(0, 5).map((item, index) => (
                <Link
                  key={`${item}-${index}`}
                  href={`/matches/${id}/chat`}
                  className="rounded-xl border-2 border-[var(--ink)] bg-[#FFE500] px-3 py-2 text-sm font-bold leading-6 text-[var(--ink)] shadow-[3px_3px_0_var(--ink)] transition hover:-translate-y-0.5 hover:bg-[#C7FF00]"
                >
                  {item}
                </Link>
              ))}
            </div>
          </div>

          <div className="glass-card p-5">
            <p className="poster-kicker">Memory</p>
            <h2 className="mt-3 text-xl font-black text-[var(--ink)]">重要对话片段</h2>
            <ul className="mt-4 space-y-2 text-sm font-bold leading-6 text-[var(--muted-ink)]">
              {memories.slice(0, 4).map((item, index) => (
                <li key={`${item}-${index}`} className="rounded-xl border-2 border-[var(--ink)] bg-[#FFFDF2] px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="glass-card p-5">
          <p className="poster-kicker">Next Step</p>
          <h2 className="mt-3 text-xl font-black text-[var(--ink)]">下一步行动</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {nextActions.slice(0, 3).map((item, index) => (
              <div
                key={`${item}-${index}`}
                className="min-h-[86px] rounded-xl border-2 border-[var(--ink)] bg-[#C7FF00] px-3 py-3 text-sm font-black leading-6 shadow-[3px_3px_0_var(--ink)]"
              >
                <span className="text-xs opacity-60">Action {index + 1}</span>
                <p className="mt-1">{item}</p>
              </div>
            ))}
          </div>
          {dateSuggestion && (
            <p className="mt-4 rounded-xl border-2 border-[var(--ink)] bg-[#174BFF] px-3 py-2 text-sm font-bold leading-6 text-white shadow-[3px_3px_0_var(--ink)]">
              {dateSuggestion}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
