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
      .then((data) => {
        setUser(data.user ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const logout = () => {
    fetch("/api/auth/logout", { method: "POST" }).then(() => setUser(null));
  };

  const pageShell = "page-shell";

  if (loading) {
    return (
      <main className={`app-container flex flex-col items-center justify-center px-4 ${pageShell}`}>
        <div className="relative mb-10 flex h-64 w-64 items-center justify-center">
          <div className="absolute h-56 w-56 rounded-full bg-amber-100/20 blur-3xl" />
          <div className="glass-card relative flex h-56 w-56 items-center justify-center overflow-hidden rounded-[40%]">
            <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-label="丘比 Q 标识">
              <defs>
                <linearGradient id="qGradLoading" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ff2d55" />
                  <stop offset="25%" stopColor="#ff9f0a" />
                  <stop offset="50%" stopColor="#ffcc00" />
                  <stop offset="75%" stopColor="#34c759" />
                  <stop offset="100%" stopColor="#0a84ff" />
                </linearGradient>
              </defs>
              <text
                x="100"
                y="138"
                textAnchor="middle"
                fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
                fontSize="124"
                fontWeight="900"
                fill="url(#qGradLoading)"
              >
                Q
              </text>
            </svg>
          </div>
        </div>
        <p className="luxury-subtitle text-sm">正在准备你的匹配主页…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className={`app-container flex flex-col items-center justify-center px-4 ${pageShell}`}>
        <div className="relative mb-10 flex h-64 w-64 items-center justify-center">
          <div className="absolute h-56 w-56 rounded-full bg-amber-100/20 blur-3xl" />
          <div className="glass-card relative flex h-56 w-56 items-center justify-center overflow-hidden rounded-[40%]">
            {/* 用纯前端 SVG 替代缺失的静态图片，避免头像渲染异常 */}
            <svg
              viewBox="0 0 200 200"
              className="h-full w-full"
              role="img"
              aria-label="丘比 Q 标识"
            >
              <defs>
                <linearGradient id="qGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ff2d55" />
                  <stop offset="25%" stopColor="#ff9f0a" />
                  <stop offset="50%" stopColor="#ffcc00" />
                  <stop offset="75%" stopColor="#34c759" />
                  <stop offset="100%" stopColor="#0a84ff" />
                </linearGradient>
                <filter id="qGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {/* 发光底层 */}
              <text
                x="100"
                y="138"
                textAnchor="middle"
                fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
                fontSize="124"
                fontWeight="900"
                fill="url(#qGrad)"
                opacity="0.25"
                filter="url(#qGlow)"
              >
                Q
              </text>
              {/* 主字 */}
              <text
                x="100"
                y="138"
                textAnchor="middle"
                fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
                fontSize="124"
                fontWeight="900"
                fill="url(#qGrad)"
              >
                Q
              </text>
            </svg>
          </div>
        </div>
        <div className="text-center">
          <p className="mb-3 text-xs uppercase tracking-[0.32em] text-amber-100/55">Exclusive Social Intelligence</p>
          <h1 className="luxury-title mb-3 text-3xl font-semibold tracking-wide">丘比 · Second Me</h1>
          <p className="luxury-subtitle mb-8 max-w-md text-sm leading-relaxed">
            让你的 Agent 先替你出场，过滤无效社交，只把真正心动的那一位交到你手上。
          </p>
          <LoginButton />
        </div>
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
              <div className="glass-card rounded-2xl px-4 py-3 text-sm text-amber-50/85">
                你当前是邮箱账号。若要使用 Agent 实时能力，请先绑定 SecondMe：
                <a href="/api/auth/login" className="ml-1 font-medium text-amber-200 underline underline-offset-2">
                  立即绑定
                </a>
              </div>
            )}
            <UserProfileEditor />
            <div className="glass-card rounded-2xl px-4 py-2 text-sm text-amber-100/80">
              您可以直接在下方输入想更新的介绍，Agent 会结合您说的内容更新“主人信息库”。
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
  const gradientBg = "page-shell";
  return (
    <Suspense
      fallback={
        <main className={`app-container flex min-h-screen items-center justify-center px-4 ${gradientBg}`}>
          <p className="luxury-subtitle text-sm">加载中…</p>
        </main>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
