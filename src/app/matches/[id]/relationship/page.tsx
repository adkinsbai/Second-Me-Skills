"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";

type RelationshipData = {
  starterTopics?: string[];
  relationshipNotes?: { memories?: string[]; nextPlan?: string };
  actionPlan?: string[];
};

export default function RelationshipPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<RelationshipData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/matches/${id}/report`)
      .then((r) => r.json())
      .then((d) => {
        if (d.code === 0) setData(d.data ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <main className="page-shell app-container py-10">
        <p className="text-sm text-gray-500">加载中…</p>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <AppHeader backHref={`/matches/${id}`} title="关系沉淀" />
      <div className="app-container max-w-2xl space-y-4 py-8">
        <section className="glass-card rounded-2xl p-4">
          <h2 className="text-base font-semibold text-gray-900">共同兴趣</h2>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-600">
            {(data?.starterTopics?.length ? data.starterTopics : ["继续从你们最近最有共鸣的话题开始，先保持轻松节奏。"]).map(
              (x, i) => (
                <li key={i}>{x}</li>
              )
            )}
          </ul>
        </section>

        <section className="glass-card rounded-2xl p-4">
          <h2 className="text-base font-semibold text-gray-900">重要对话片段</h2>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-600">
            {(data?.relationshipNotes?.memories?.length
              ? data.relationshipNotes.memories
              : ["你们刚刚开始建立连接，后续可把有共鸣的话收藏在这里。"]
            ).map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </section>

        <section className="glass-card rounded-2xl border border-sky-400/25 p-4">
          <h2 className="text-base font-semibold text-sky-100">下一步计划</h2>
          <p className="mt-2 text-sm text-sky-100/85">
            {data?.relationshipNotes?.nextPlan ?? data?.actionPlan?.[0] ?? "继续轻互动，并在 2-3 天后复盘是否继续推进。"}
          </p>
        </section>
      </div>
    </main>
  );
}

