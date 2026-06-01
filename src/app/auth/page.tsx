"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();

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
        router.replace("/auth/login");
      })
      .catch(() => {
        if (mounted) router.replace("/auth/login");
      });
    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[var(--brand)]" />
    </main>
  );
}
