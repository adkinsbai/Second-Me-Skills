"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { TownScaffold } from "@/components/TownScaffold";

type TownConversationGroup = {
  post: { id: string; title: string; categories: string[] };
  conversations: Array<{
    conversationId: string;
    otherUser: { id: string; name: string | null; avatarUrl: string | null };
    lastMessage: { content: string; createdAt: string } | null;
    unreadCount: number;
  }>;
};

export default function TownMessagesPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [groups, setGroups] = useState<TownConversationGroup[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/me", { credentials: "include" });
        const d = await r.json().catch(() => null);
        if (cancelled) return;
        if (!d?.user?.id) router.replace("/auth");
      } catch {
        // ignore
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (checking) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/town/conversations", { credentials: "include" });
        const d = await r.json().catch(() => null);
        if (cancelled) return;
        const list = d?.data?.groups ?? [];
        setGroups(list as TownConversationGroup[]);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [checking]);

  if (checking) {
    return (
      <TownScaffold>
        <div className="town-on-light">
          <AppHeader backHref="/town" title="消息中心" />
          <div className="app-container py-12">
            <p className="luxury-subtitle text-sm">加载中…</p>
          </div>
        </div>
      </TownScaffold>
    );
  }

  return (
    <TownScaffold>
      <div className="town-on-light">
        <AppHeader backHref="/town" title="消息中心" />

        <div className="app-container py-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="luxury-title text-xl font-semibold">消息中心</h1>
            <p className="mt-1 text-sm text-slate-600">会话按帖子分组，点开即聊天</p>
          </div>
          <Link
            href="/town/explore"
            className="rounded-2xl border border-slate-300/90 bg-white/80 px-4 py-2 text-sm font-medium text-slate-800 shadow-sm backdrop-blur-md transition hover:bg-white"
          >
            返回探索
          </Link>
        </div>

        {groups.length === 0 ? (
          <div className="glass-card rounded-3xl p-8 text-center">
            <p className="luxury-subtitle text-sm">暂无小镇会话</p>
            <p className="mt-2 text-sm text-amber-100/70">去“发布”匹配候选并开始对话吧</p>
            <div className="mt-5">
              <Link href="/town/my-needs" className="luxury-btn inline-block rounded-2xl px-6 py-3 text-sm font-semibold">
                去发布
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((g) => (
              <section key={g.post.id} className="glass-card rounded-3xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-amber-50">{g.post.title}</h2>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {g.post.categories.map((c) => (
                        <span key={c} className="luxury-chip text-[11px]">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-amber-100/45">{g.conversations.length} 个会话</div>
                </div>

                <div className="mt-4 space-y-2">
                  {g.conversations.map((c) => (
                    <button
                      key={c.conversationId}
                      type="button"
                      onClick={() => router.push(`/town/conversations/${c.conversationId}`)}
                      className="w-full rounded-2xl border border-amber-200/15 bg-black/25 p-4 text-left transition hover:border-amber-200/35"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="h-12 w-12 overflow-hidden rounded-full border border-amber-200/20 bg-black/30">
                            {c.otherUser.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={c.otherUser.avatarUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-sm text-amber-100/60">
                                {(c.otherUser.name?.[0] ?? "?").toString()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-amber-50">{c.otherUser.name ?? "未设置昵称"}</p>
                            <p className="mt-1 truncate text-sm text-amber-100/60">
                              {c.lastMessage?.content ?? "暂无消息，先开口吧"}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {c.unreadCount > 0 ? (
                            <span className="rounded-full border border-amber-200/25 bg-amber-200/15 px-2 py-1 text-[11px] text-amber-50">
                              未读 {c.unreadCount}
                            </span>
                          ) : (
                            <span className="text-[11px] text-amber-100/40">已读</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
      </div>
    </TownScaffold>
  );
}
