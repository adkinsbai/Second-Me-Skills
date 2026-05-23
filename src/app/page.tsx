"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppHeader, AppHeaderNavRight } from "@/components/AppHeader";
import { LoginButton } from "@/components/LoginButton";
import { UserProfileEditor } from "@/components/UserProfileEditor";
import { ChatWindow } from "@/components/ChatWindow";
import { MatchNetworkGlobe } from "@/components/MatchNetworkGlobe";

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
      .then((r) => r.json())
      .then((data) => { setUser(data.user ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const logout = () => {
    fetch("/api/auth/logout", { method: "POST" }).then(() => setUser(null));
  };

  const pageShell = "page-shell";

  if (loading) {
    return (
      <main className={`flex flex-col items-center justify-center px-4 ${pageShell}`} style={{ minHeight: "100vh" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[var(--brand)]" />
          <p className="text-sm text-gray-400">正在准备你的匹配主页…</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className={`flex flex-col items-center justify-center px-4 py-16 ${pageShell}`} style={{ minHeight: "100vh" }}>
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--brand)] shadow-lg shadow-[var(--brand)]/30">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Exclusive Social Intelligence</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">丘比</h1>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-500">
              让你的 Agent 先替你出场，过滤无效社交，只把真正心动的那一位交到你手上。
            </p>
          </div>
        </div>
        <LoginButton />
      </main>
    );
  }

  return (
    <>
      {updateIntro ? (
        <main className={pageShell}>
          <AppHeader right={<AppHeaderNavRight onLogout={logout} />} />
          <div className="app-container space-y-6 py-8">
            {!user?.hasSecondMe && (
              <div className="glass-card rounded-2xl px-4 py-3 text-sm text-gray-700">
                你当前是邮箱账号。若要使用 Agent 实时能力，请先绑定 SecondMe：
                <a href="/api/auth/login" className="ml-1 font-medium text-[var(--brand-text)] underline underline-offset-2">
                  立即绑定
                </a>
              </div>
            )}
            <UserProfileEditor />
            <div className="glass-card rounded-2xl px-4 py-3 text-sm text-gray-600">
              您可以直接在下方输入想更新的介绍，Agent 会结合您说的内容更新「主人信息库」。
            </div>
            <ChatWindow />
          </div>
        </main>
      ) : (
        <MatchNetworkGlobe backHref="/settings/heartbeat" title="开始匹配" />
      )}
    </>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center page-shell">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-[var(--brand)]" />
        </main>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
