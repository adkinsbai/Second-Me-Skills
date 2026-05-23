"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { TownScaffold } from "@/components/TownScaffold";
import { TownPostEngagement } from "@/components/TownPostEngagement";
import { EmojiMartPopover } from "@/components/EmojiMartPopover";

type Author = { id: string; name: string | null; avatarUrl: string | null };
type TownPost = {
  id: string;
  userId: string;
  title: string;
  content: string;
  categories: string[];
  createdAt: string;
  author: Author;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

type Candidate = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
  totalScore: number;
};

function defaultOpener(postCategories: string[], postContent: string, candidateName: string | null) {
  const cats = postCategories.slice(0, 3);
  const catText = cats.length ? cats.join("、") : "合拍的方向";
  const snippet = postContent.trim().slice(0, 28);
  const who = candidateName ? `“${candidateName}”` : "你";
  return `你好 ${who}，我在小镇发布的需求是：${catText}。正文里我提到：${snippet}${snippet.length >= 28 ? "…" : ""}。想先聊聊看节奏合不合适～`;
}

export default function TownMyNeedsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [posts, setPosts] = useState<TownPost[]>([]);
  const [content, setContent] = useState("");

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [matchPostId, setMatchPostId] = useState<string | null>(null);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  const [openerOpen, setOpenerOpen] = useState(false);
  const [openerPostId, setOpenerPostId] = useState<string | null>(null);
  const [openerCandidateId, setOpenerCandidateId] = useState<string | null>(null);
  const [openerText, setOpenerText] = useState("");
  const [openerCandidateName, setOpenerCandidateName] = useState<string | null>(null);
  const [startingChat, setStartingChat] = useState(false);

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

  const refreshPosts = async () => {
    const r = await fetch("/api/town/posts?mine=1", { credentials: "include" });
    const d = await r.json().catch(() => null);
    const list = (d?.data?.posts ?? []) as Record<string, unknown>[];
    setPosts(
      list.map((p) => ({
        ...(p as unknown as TownPost),
        likeCount: Number(p.likeCount ?? 0),
        commentCount: Number(p.commentCount ?? 0),
        likedByMe: !!p.likedByMe,
      }))
    );
  };

  useEffect(() => {
    if (checking) return;
    void refreshPosts();
  }, [checking]);

  const categoriesAll = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => p.categories.forEach((c) => set.add(c)));
    return Array.from(set);
  }, [posts]);
  void categoriesAll;

  const createPost = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      const r = await fetch("/api/town/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || d?.code !== 0) {
        setCreateError(d?.message || "发布失败，请稍后重试");
        return;
      }
      setContent("");
      await refreshPosts();
    } finally {
      setCreating(false);
    }
  };

  const openCandidates = async (postId: string) => {
    setMatchPostId(postId);
    setCandidates([]);
    setCandidateLoading(true);
    try {
      const r = await fetch(`/api/town/posts/${postId}/candidates`, {
        method: "POST",
        credentials: "include",
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || d?.code !== 0) return;
      setCandidates(d.data.candidates as Candidate[]);
    } finally {
      setCandidateLoading(false);
    }
  };

  const refreshCandidates = async () => {
    if (!matchPostId) return;
    await openCandidates(matchPostId);
  };

  const openOpener = (postId: string, c: Candidate) => {
    setOpenerPostId(postId);
    setOpenerCandidateId(c.id);
    setOpenerCandidateName(c.name);

    const post = posts.find((p) => p.id === postId);
    const cats = post?.categories ?? [];
    setOpenerText(defaultOpener(cats, post?.content ?? "", c.name));
    setOpenerOpen(true);
  };

  const startChat = async () => {
    if (!openerPostId || !openerCandidateId) return;
    setStartingChat(true);
    try {
      const r = await fetch(`/api/town/posts/${openerPostId}/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          candidateUserId: openerCandidateId,
          openerMessage: openerText,
        }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || d?.code !== 0) return;
      const conversationId = d.data.conversationId as string;
      setOpenerOpen(false);
      router.push(`/town/conversations/${conversationId}`);
    } finally {
      setStartingChat(false);
    }
  };

  if (checking) {
    return (
      <TownScaffold>
        <div className="town-on-light">
          <AppHeader backHref="/town" title="发布" />
          <div className="app-container py-12">
            <p className="text-sm text-gray-500">加载中…</p>
          </div>
        </div>
      </TownScaffold>
    );
  }

  return (
    <TownScaffold>
      <div className="town-on-light">
        <AppHeader backHref="/town" title="发布" />

        <div className="app-container py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="luxury-title text-xl font-semibold">发帖找人</h1>
            <p className="mt-1 text-sm text-slate-600">正文一段即可：AI 自动生成标题 + 分类</p>
          </div>
          <Link
            href="/town/messages"
            className="rounded-2xl border border-slate-300/90 bg-white/80 px-4 py-2 text-sm font-medium text-slate-800 shadow-sm backdrop-blur-md transition hover:bg-white"
          >
            消息中心
          </Link>
        </div>

          <section className="glass-card rounded-3xl p-5 mb-6">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="写你想找什么样的人，比如：比赛队友 / 创业伙伴 / 旅行搭子…"
              className="luxury-input min-h-[120px] w-full rounded-3xl px-4 py-3 text-sm"
            />
            {createError ? <p className="mt-2 text-xs text-rose-300">{createError}</p> : null}
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={createPost}
                disabled={creating || !content.trim()}
                className="luxury-btn rounded-2xl px-6 py-3 text-sm font-semibold disabled:opacity-60"
              >
                {creating ? "发布中…" : "发布"}
              </button>
              <button
                type="button"
                onClick={() => setContent("")}
                disabled={creating || !content}
                className="luxury-btn-secondary rounded-2xl px-6 py-3 text-sm font-semibold disabled:opacity-60"
              >
                清空
              </button>
            </div>
          </section>

          <section className="space-y-4">
            {posts.length === 0 ? (
              <div className="glass-card rounded-3xl p-8 text-center">
                <p className="text-sm text-gray-500">你还没有发布需求</p>
                <p className="mt-2 text-sm text-gray-500">先发布一条，AI 会自动分类并生成 10 个候选</p>
              </div>
            ) : (
              posts.map((p) => (
                <article key={p.id} className="glass-card rounded-3xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold text-gray-900">{p.title}</h2>
                      <p className="mt-1 text-sm text-gray-500 whitespace-pre-wrap">{p.content}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {p.categories.map((c) => (
                          <span key={c} className="luxury-chip text-[11px]">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <button
                        type="button"
                        onClick={() => openCandidates(p.id)}
                        disabled={candidateLoading}
                        className="luxury-btn rounded-2xl px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
                      >
                        {candidateLoading && matchPostId === p.id ? "匹配中…" : "匹配"}
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-gray-400">发布于 {new Date(p.createdAt).toLocaleString()}</div>
                  <TownPostEngagement
                    postId={p.id}
                    likeCount={p.likeCount}
                    commentCount={p.commentCount}
                    likedByMe={p.likedByMe}
                    emojiTheme="dark"
                  />
                </article>
              ))
            )}
          </section>
        </div>
      </div>

      {/* 候选弹窗 */}
        {matchPostId ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 p-4 backdrop-blur-sm">
            <div className="w-full max-w-3xl rounded-3xl bg-[#0c111b]/90 p-5 shadow-2xl">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-gray-400">Candidates</p>
                  <h3 className="mt-2 text-lg font-semibold text-gray-900">10 位候选人</h3>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={refreshCandidates}
                    disabled={candidateLoading}
                    className="luxury-btn-secondary rounded-2xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
                  >
                    换一批
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMatchPostId(null);
                      setCandidates([]);
                    }}
                    className="luxury-btn-secondary rounded-2xl px-4 py-2.5 text-sm font-semibold"
                  >
                    关闭
                  </button>
                </div>
              </div>

              <div className="max-h-[60vh] overflow-y-auto">
                {candidateLoading ? (
                  <p className="text-sm text-gray-500">正在生成候选…</p>
                ) : candidates.length === 0 ? (
                  <p className="text-sm text-gray-500">没有候选（请换一批）</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {candidates.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => openOpener(matchPostId, c)}
                        className="text-left rounded-2xl border border-gray-200 bg-gray-50 p-4 transition hover:border-gray-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-14 w-14 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                            {c.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={c.avatarUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
                                {(c.name?.[0] ?? "?").toString()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-gray-900">{c.name ?? "未设置昵称"}</p>
                            <p className="mt-1 text-xs text-gray-400 truncate">{c.bio ?? ""}</p>
                          </div>
                          <div className="shrink-0 rounded-full border border-gray-200 bg-amber-200/10 px-2 py-1 text-[11px] text-[var(--brand-text)]/90">
                            {c.totalScore}
                          </div>
                        </div>
                        <div className="mt-3 text-xs text-gray-400">点击选择并发送开场信息</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* 开场信息弹窗 */}
        {openerOpen && openerPostId && openerCandidateId ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-3xl bg-[#0c111b]/90 p-5 shadow-2xl">
              <div className="mb-4">
                <p className="text-xs uppercase tracking-[0.32em] text-gray-400">Opener</p>
                <h3 className="mt-2 text-lg font-semibold text-gray-900">
                  给 {openerCandidateName ?? "对方"} 的开场信息
                </h3>
              </div>
              <textarea
                value={openerText}
                onChange={(e) => setOpenerText(e.target.value)}
                maxLength={800}
                className="luxury-input min-h-[140px] w-full rounded-3xl px-4 py-3 text-sm"
              />
              <div className="mt-2 flex justify-end">
                <EmojiMartPopover
                  theme="dark"
                  label="表情"
                  onEmojiSelect={(s) => setOpenerText((t) => (t + s).slice(0, 800))}
                />
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setOpenerOpen(false)}
                  disabled={startingChat}
                  className="luxury-btn-secondary flex-1 rounded-2xl px-5 py-3 text-sm font-semibold disabled:opacity-60"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={startChat}
                  disabled={startingChat || !openerText.trim()}
                  className="luxury-btn flex-1 rounded-2xl px-5 py-3 text-sm font-semibold disabled:opacity-60"
                >
                  {startingChat ? "发送中…" : "发送并开始对话"}
                </button>
              </div>
              <p className="mt-3 text-xs text-gray-400">
                你的开场信息会发送到对方的小镇「消息中心」，对方不会在原来的聊天栏收到。
              </p>
            </div>
          </div>
        ) : null}
    </TownScaffold>
  );
}

