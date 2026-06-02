"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppHeader, AppHeaderNavRight } from "@/components/AppHeader";
import { LoginButton } from "@/components/LoginButton";
import { UserProfileEditor } from "@/components/UserProfileEditor";
import { ChatWindow } from "@/components/ChatWindow";
import { MatchNetworkGlobe } from "@/components/MatchNetworkGlobe";
import { BottomNav } from "@/components/BottomNav";

function HomeContent() {
  const searchParams = useSearchParams();
  const updateIntro = searchParams.get("updateIntro") === "1";
  const [user, setUser] = useState<{
    id: string;
    name: string | null;
    avatarUrl: string | null;
    email?: string | null;
    authProvider?: string;
    hasSecondMe?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me")
      .then((response) => response.json())
      .then((data) => {
        setUser(data.user ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const logout = () => {
    fetch("/api/auth/logout", { method: "POST" }).then(() => setUser(null));
  };

  if (loading) {
    return (
      <main className="page-shell flex min-h-screen flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--ink)] border-t-[var(--brand)]" />
          <p className="text-sm font-black text-[var(--muted-ink)]">正在准备你的匹配主页...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="page-shell flex min-h-screen flex-col items-center justify-center px-4 py-16">
        <section className="mb-8 flex max-w-sm flex-col items-center gap-4 text-center">
          <div className="flex h-20 w-20 rotate-[-6deg] items-center justify-center rounded-3xl border-2 border-[var(--ink)] bg-[var(--brand)] shadow-[8px_8px_0_var(--ink)]">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="black" aria-hidden="true">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
          <div>
            <p className="poster-kicker text-[var(--muted-ink)]">Qiubi Social Intelligence</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-[var(--ink)]">丘比</h1>
            <p className="mt-3 text-sm font-bold leading-7 text-[var(--muted-ink)]">
              用资料、偏好和真实互动帮你减少无效社交，把更值得认识的人放到你面前。
            </p>
          </div>
        </section>
        <div className="w-full max-w-sm">
          <LoginButton />
        </div>
      </main>
    );
  }

  if (updateIntro) {
    return (
      <main className="page-shell min-h-screen">
        <AppHeader right={<AppHeaderNavRight onLogout={logout} />} />
        <div className="app-container space-y-6 py-8">
          {!user.hasSecondMe && user.authProvider !== "guest" ? (
            <div className="glass-card rounded-2xl px-4 py-3 text-sm font-bold text-[var(--muted-ink)]">
              💡 可选：绑定 SecondMe 解锁更多 AI 能力
              <a href="/api/auth/login" className="ml-1 font-black text-[var(--c-blue)] underline underline-offset-2">
                了解更多
              </a>
            </div>
          ) : null}
          <UserProfileEditor />
          <div className="glass-card rounded-2xl px-4 py-3 text-sm font-bold text-[var(--muted-ink)]">
            你可以直接告诉丘比想补充的自我介绍、边界、兴趣和相处习惯。它会沉淀到你的资料理解里，用于后续推荐。
          </div>
          <ChatWindow />
        </div>
      </main>
    );
  }

  return (
    <>
      <MatchNetworkGlobe backHref="/settings/heartbeat" title="开始匹配" />
      <BottomNav />
    </>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="page-shell flex min-h-screen items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-[var(--ink)] border-t-[var(--brand)]" />
        </main>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
