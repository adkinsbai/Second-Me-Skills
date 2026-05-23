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
      .then((r) => r.json())
      .then((d) => {
        if (d.code === 0) setDetail(d.data);
        else if (d.code === 404) router.replace("/matches");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, router]);

  const unlock = () => {
    setUnlocking(true);
    fetch(`/api/matches/${id}/unlock`, { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (d.code === 0) {
          setDetail((prev) => (prev ? { ...prev, status: "connected", canUnlockChat: true } : null));
        }
        setUnlocking(false);
      })
      .catch(() => setUnlocking(false));
  };

  if (loading || !detail) {
    return (
      <main className="page-shell app-container py-10">
        <p className="text-sm text-gray-500">加载中…</p>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <AppHeader backHref="/matches" title={detail.targetUser.name ?? "匹配详情"} />
      <div className="app-container max-w-2xl space-y-6 py-8">
        <div className="glass-card flex gap-4 rounded-2xl p-4">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-amber-400/20 to-sky-400/15 ring-1 ring-gray-200">
            {detail.targetUser.avatarUrl ? (
              <img src={detail.targetUser.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl text-[var(--brand-text)]/50">
                {detail.targetUser.name?.[0] ?? "?"}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-900">{detail.targetUser.name ?? "未设置昵称"}</p>
            <p className="text-sm text-gray-500">{detail.targetUser.bio ?? "—"}</p>
            {detail.latestScore && (
              <p className="mt-2 text-sm leading-6 text-gray-600">{detail.latestScore.matchReason}</p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="glass-card rounded-2xl p-4 text-gray-500">
            <span className="font-medium text-gray-900">真实匹配</span>
            <p className="mt-1 text-sm">
              丘比会根据双方资料、偏好和信息库做真实用户匹配；匹配后直接进入真人聊天。
            </p>
          </div>
          {detail.latestScore ? (
            <Link
              href={`/matches/${id}/report`}
              className="glass-card block rounded-2xl p-4 text-left transition hover:border-amber-200/45"
            >
              <span className="font-medium text-gray-900">丘比写给你们的话</span>
              <p className="text-sm text-gray-500">{detail.latestScore.summary}</p>
            </Link>
          ) : (
            <div className="glass-card rounded-2xl p-4 text-gray-400">
              <span className="font-medium text-gray-700">丘比写给你们的话</span>
              <p className="text-sm">匹配生成后即可查看这段故事开场</p>
            </div>
          )}
          {detail.status === "connected" ? (
            <div className="space-y-3">
              <Link
                href={`/matches/${id}/chat`}
                className="glass-card block rounded-2xl border border-rose-400/25 p-4 text-left transition hover:border-rose-400/45"
              >
                <span className="font-medium text-rose-100">与对方聊天</span>
                <p className="text-sm text-rose-200/80">已解锁，去和 TA 说句话吧</p>
              </Link>
              <Link
                href={`/matches/${id}/relationship`}
                className="glass-card block rounded-2xl border border-indigo-400/25 p-4 text-left transition hover:border-indigo-400/45"
              >
                <span className="font-medium text-indigo-100">关系沉淀页</span>
                <p className="text-sm text-indigo-200/75">记录共同记忆、兴趣与下一步计划</p>
              </Link>
              <Link
                href={`/users/${detail.targetUser.id}`}
                className="glass-card block rounded-2xl border border-emerald-400/25 p-4 text-left transition hover:border-emerald-400/45"
              >
                <span className="font-medium text-emerald-100">进入对方主页</span>
                <p className="text-sm text-emerald-200/75">查看 TA 的照片与自我介绍</p>
              </Link>
              <div className="glass-card rounded-2xl border border-sky-400/20 p-4">
                <p className="text-sm font-medium text-sky-100">真人开场话题包（可直接用）</p>
                <ul className="mt-2 space-y-1 text-sm text-sky-100/80">
                  {["先聊今天一个小日常，再问 TA 最近最开心的一件事。", "从你们都提到的兴趣切入，问“最近最想做的一件小事”。", "先确认聊天节奏：你喜欢高频还是慢热？"].map((t, i) => (
                    <li key={i}>- {t}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : detail.canUnlockChat ? (
            <button
              type="button"
              onClick={unlock}
              disabled={unlocking}
              className="luxury-btn block w-full rounded-2xl p-4 text-left text-sm font-semibold disabled:opacity-50"
            >
              {unlocking ? "准备中…" : "点击开始与对方聊天"}
            </button>
          ) : (
            <div className="glass-card rounded-2xl p-4 text-gray-400">
              <span className="font-medium text-gray-700">与对方聊天</span>
              <p className="text-sm">正在准备聊天入口</p>
              <p className="mt-1 text-xs text-rose-200/80">准备好后可看更多真实资料与话题建议。</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
