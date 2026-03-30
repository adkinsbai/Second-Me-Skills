"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoginButton } from "@/components/LoginButton";

export default function AuthPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return;
        if (d?.user?.id) {
          router.replace("/");
          return;
        }
        setChecking(false);
      })
      .catch(() => setChecking(false));
    return () => {
      mounted = false;
    };
  }, [router]);

  if (checking) {
    return (
      <main className="page-shell flex items-center justify-center px-4">
        <p className="luxury-subtitle text-sm">正在加载登录页…</p>
      </main>
    );
  }

  return (
    <main className="page-shell px-4 py-12">
      <div className="mx-auto w-full max-w-md space-y-4">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.32em] text-amber-100/50">Qiubi</p>
          <h1 className="luxury-title mt-2 text-3xl font-semibold">丘比</h1>
          <p className="mt-2 text-sm text-amber-100/70">
            登录或注册你的账号，开始匹配真实同频的人。
          </p>
        </div>
        <LoginButton redirectTo="/" />
      </div>
    </main>
  );
}
