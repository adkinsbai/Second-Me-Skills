"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { TownScaffold } from "@/components/TownScaffold";
import { TownPostEngagement } from "@/components/TownPostEngagement";

type Author = { id: string; name: string | null; avatarUrl: string | null };
type TownPost = {
  id: string;
  userId: string;
  title: string;
  content: string;
  categories: string[];
  author: Author;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

export default function TownExplorePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [posts, setPosts] = useState<TownPost[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("全部");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/me", { credentials: "include" });
        const d = await r.json().catch(() => null);
        if (cancelled) return;
        if (!d?.user?.id) {
          router.replace("/auth");
          return;
        }
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
        const r = await fetch("/api/town/posts", { credentials: "include" });
        const d = await r.json().catch(() => null);
        if (cancelled) return;
        if (!d?.data?.posts) return;
        const raw = d.data.posts as Record<string, unknown>[];
        setPosts(
          raw.map((p) => ({
            ...(p as TownPost),
            likeCount: Number(p.likeCount ?? 0),
            commentCount: Number(p.commentCount ?? 0),
            likedByMe: !!p.likedByMe,
          }))
        );
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [checking]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => p.categories.forEach((c) => set.add(c)));
    return ["全部", ...Array.from(set)];
  }, [posts]);

  const filtered = useMemo(() => {
    if (activeCategory === "全部") return posts;
    return posts.filter((p) => p.categories.includes(activeCategory));
  }, [posts, activeCategory]);

  if (checking) {
    return (
      <TownScaffold>
        <div className="town-on-light">
          <AppHeader backHref="/town" title="探索" />
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
        <AppHeader backHref="/town" title="探索" />

        <div className="app-container py-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="luxury-title text-xl font-semibold">帖子广场</h1>
            <p className="mt-1 text-sm text-slate-600">AI 会自动分类，支持按主题筛选</p>
          </div>
          <Link
            href="/town/my-needs"
            className="rounded-2xl border border-slate-300/90 bg-white/80 px-4 py-2 text-sm font-medium text-slate-800 shadow-sm backdrop-blur-md transition hover:bg-white"
          >
            去发布
          </Link>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActiveCategory(c)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                c === activeCategory
                  ? "border-slate-700 bg-slate-800 text-white shadow-sm"
                  : "border-slate-300/90 bg-white/75 text-slate-700 shadow-sm hover:bg-white"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="glass-card rounded-3xl p-8 text-center">
              <p className="text-sm text-gray-500">暂无匹配需求</p>
              <p className="mt-2 text-sm text-gray-500">换个分类看看，或去发布你的需求</p>
              <div className="mt-5">
                <Link href="/town/my-needs" className="luxury-btn inline-block rounded-2xl px-6 py-3 text-sm font-semibold">
                  发布
                </Link>
              </div>
            </div>
          ) : (
            filtered.map((p) => (
              <article key={p.id} className="glass-card rounded-3xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-gray-900">{p.title}</h2>
                    <p
                      className="mt-1 overflow-hidden text-ellipsis text-sm text-gray-500 [display:-webkit-box] [WebkitLineClamp:3] [WebkitBoxOrient:vertical]"
                    >
                      {p.content}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {p.categories.map((c) => (
                        <span key={c} className="luxury-chip text-[11px]">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <div className="h-12 w-12 overflow-hidden rounded-full border border-gray-200 bg-gray-50">
                      {p.author.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.author.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
                          {(p.author.name?.[0] ?? "?").toString()}
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-center text-xs text-gray-400">{p.author.name ?? "匿名"}</p>
                  </div>
                </div>
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
        </div>
      </div>
      </div>
    </TownScaffold>
  );
}
