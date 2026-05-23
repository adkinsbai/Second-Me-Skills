"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoginButton } from "@/components/LoginButton";

export default function AuthPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch("/api/me").then(r => r.json()).then(d => {
      if (!mounted) return;
      if (d?.user?.id) { router.replace("/"); return; }
      setChecking(false);
    }).catch(() => setChecking(false));
    return () => { mounted = false; };
  }, [router]);

  if (checking) return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[var(--brand)]" />
    </main>
  );

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg)] px-4">
      {/* 背景光晕 */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle,rgba(29,255,143,0.08),transparent 70%)" }} />
        <div className="absolute left-1/4 top-2/3 h-64 w-64 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle,rgba(255,45,109,0.06),transparent 70%)" }} />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--brand)] shadow-[0_0_40px_rgba(29,255,143,0.4)]">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="black">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">丘比</h1>
          <p className="mt-2 text-sm text-[var(--fg-4)]">遇见真正同频的人</p>
        </div>

        <LoginButton redirectTo="/" />

        <p className="mt-6 text-center text-xs text-[var(--fg-4)]">
          登录即代表同意服务协议与隐私政策
        </p>
      </div>
    </main>
  );
}
