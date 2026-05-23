"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const SKIP_PREFIXES = ["/auth", "/onboarding", "/privacy", "/api"];

export function OnboardingRedirect() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!pathname) return;
    if (SKIP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return;

    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/me", { credentials: "include" });
        const d = await r.json().catch(() => null);
        const u = d?.user;
        if (cancelled || !u?.id) return;
        if (u.onboardingDone === false) {
          const ret = encodeURIComponent(pathname || "/");
          router.replace(`/onboarding?return=${ret}`);
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return null;
}
