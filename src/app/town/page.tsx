"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { TownScaffold } from "@/components/TownScaffold";

export default function TownHomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

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

  if (checking) {
    return (
      <TownScaffold>
        <div className="town-on-light">
          <div className="app-container py-12">
            <p className="text-base font-semibold" style={{ color: "#0f172a" }}>
              正在确认登录…
            </p>
            <p className="mt-2 text-sm" style={{ color: "#475569" }}>
              若长时间停在这里，请检查是否已登录，或刷新页面。
            </p>
          </div>
        </div>
      </TownScaffold>
    );
  }

  return (
    <TownScaffold>
      <div className="town-on-light">
        <AppHeader backHref="/" title="丘比小镇" />

        <div className="app-container py-10">
          <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-slate-600">Chibi Town</p>
              <h1
                className="luxury-title mt-2 text-xl font-semibold"
                style={{ color: "#0f172a" }}
              >
                在小镇发布，AI 分类，10 位候选速配
              </h1>
            </div>
            <Link
              href="/town/messages"
              className="rounded-2xl border border-slate-300/90 bg-white/80 px-4 py-2 text-sm font-medium text-slate-800 shadow-sm backdrop-blur-md transition hover:bg-white"
            >
              消息中心
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Link
              href="/town/explore"
              className="group flex items-center justify-between rounded-3xl border border-slate-200/90 bg-white/85 p-6 shadow-md backdrop-blur-md transition hover:bg-white hover:shadow-lg"
            >
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-slate-500 group-hover:text-slate-700">Explore</p>
                <h2 className="mt-2 text-lg font-semibold text-slate-900">探索</h2>
                <p className="mt-1 text-sm text-slate-600">查看帖子广场与 AI 分类筛选</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-rose-200/80 to-amber-200/80 ring-1 ring-slate-200/80" />
            </Link>

            <Link
              href="/town/my-needs"
              className="group flex items-center justify-between rounded-3xl border border-slate-200/90 bg-white/85 p-6 shadow-md backdrop-blur-md transition hover:bg-white hover:shadow-lg"
            >
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-slate-500 group-hover:text-slate-700">Post</p>
                <h2 className="mt-2 text-lg font-semibold text-slate-900">发布</h2>
                <p className="mt-1 text-sm text-slate-600">发帖找人：自动标题 + 自动分类 + 10 候选</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-sky-200/80 to-violet-200/80 ring-1 ring-slate-200/80" />
            </Link>
          </div>
          </div>
        </div>
      </div>
    </TownScaffold>
  );
}
