"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";

type Detail = {
  id: string;
  status: string;
  targetUser: { id: string; name: string | null; avatarUrl: string | null; bio: string | null };
  latestScore: {
    summary: string;
    matchReason: string;
  } | null;
  canUnlockChat: boolean;
};

export default function MatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/matches/${id}`)
      .then((response) => response.json())
      .then((result) => {
        if (result.code === 0) setDetail(result.data);
        else if (result.code === 404) router.replace("/matches");
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [id, router]);

  const unlock = () => {
    setUnlocking(true);
    fetch(`/api/matches/${id}/unlock`, { method: "POST" })
      .then((response) => response.json())
      .then((result) => {
        if (result.code === 0) setDetail((prev) => (prev ? { ...prev, status: "connected", canUnlockChat: true } : null));
      })
      .catch(() => null)
      .finally(() => setUnlocking(false));
  };

  if (loading || !detail) {
    return (
      <main className="page-shell flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--ink)] border-t-[var(--brand)]" />
      </main>
    );
  }

  return (
    <main className="page-shell">
      <AppHeader backHref="/matches" title={detail.targetUser.name ?? "匹配详情"} />
      <div className="app-container max-w-2xl space-y-6 py-8">
        <section className="poster-panel flex gap-4 p-5">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-[var(--ink)] bg-[var(--brand)] shadow-[5px_5px_0_var(--ink)]">
            {detail.targetUser.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={detail.targetUser.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-black text-[var(--ink)]">
                {detail.targetUser.name?.[0] ?? "?"}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="poster-kicker">Matched User</p>
            <h1 className="truncate text-2xl font-black text-[var(--paper)]">{detail.targetUser.name ?? "未设置昵称"}</h1>
            <p className="mt-2 text-sm font-bold leading-6 text-[var(--paper)]/80">
              {detail.targetUser.bio ?? "TA 还没有填写简介。"}
            </p>
          </div>
        </section>

        {detail.latestScore ? (
          <section className="glass-card p-5">
            <p className="poster-kicker text-[var(--muted-ink)]">Match Reason</p>
            <h2 className="mt-2 text-xl font-black text-[var(--ink)]">丘比为什么推荐 TA</h2>
            <p className="mt-3 text-sm font-bold leading-7 text-[var(--muted-ink)]">{detail.latestScore.matchReason}</p>
          </section>
        ) : (
          <section className="glass-card p-5">
            <h2 className="text-xl font-black text-[var(--ink)]">匹配报告准备中</h2>
            <p className="mt-2 text-sm font-bold text-[var(--muted-ink)]">
              生成匹配后，这里会展示推荐理由和下一步建议。
            </p>
          </section>
        )}

        <div className="grid gap-3">
          {detail.latestScore ? (
            <Link href={`/matches/${id}/report`} className="glass-card block p-5 transition hover:-translate-y-1">
              <p className="font-black text-[var(--ink)]">查看合拍报告</p>
              <p className="mt-1 text-sm font-bold text-[var(--muted-ink)]">{detail.latestScore.summary}</p>
            </Link>
          ) : null}

          {detail.status === "connected" ? (
            <>
              <Link href={`/matches/${id}/chat`} className="glass-card block border-2 border-[var(--ink)] bg-[var(--brand)] p-5 text-left shadow-[5px_5px_0_var(--ink)] transition hover:-translate-y-1">
                <p className="font-black text-[var(--ink)]">和 TA 聊天</p>
                <p className="mt-1 text-sm font-bold text-[var(--ink)]/75">
                  已连接，可以直接进入真实聊天。
                </p>
              </Link>
              <Link href={`/matches/${id}/relationship`} className="glass-card block p-5 transition hover:-translate-y-1">
                <p className="font-black text-[var(--ink)]">关系沉淀</p>
                <p className="mt-1 text-sm font-bold text-[var(--muted-ink)]">
                  查看共同记忆、话题建议和下一步计划。
                </p>
              </Link>
              <Link href={`/users/${detail.targetUser.id}`} className="glass-card block p-5 transition hover:-translate-y-1">
                <p className="font-black text-[var(--ink)]">查看 TA 的主页</p>
                <p className="mt-1 text-sm font-bold text-[var(--muted-ink)]">
                  了解照片、简介和公开资料。
                </p>
              </Link>
            </>
          ) : detail.canUnlockChat ? (
            <button type="button" onClick={unlock} disabled={unlocking} className="luxury-btn w-full rounded-2xl p-4 text-left text-sm disabled:opacity-50">
              {unlocking ? "正在准备聊天入口..." : "开始和 TA 聊天"}
            </button>
          ) : (
            <div className="glass-card p-5">
              <p className="font-black text-[var(--ink)]">聊天入口准备中</p>
              <p className="mt-1 text-sm font-bold text-[var(--muted-ink)]">
                准备好后，你就能查看更多资料并开始聊天。
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
