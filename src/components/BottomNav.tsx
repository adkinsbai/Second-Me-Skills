"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type TabItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  matchPaths: string[];
};

const TABS: TabItem[] = [
  {
    href: "/search",
    label: "AI搜索",
    matchPaths: ["/search"],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    href: "/",
    label: "发现",
    matchPaths: ["/", "/discover"],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="currentColor" opacity="0.3"/>
        <path d="M13.5 5.5c1.09 0 2-.54 2.5-1.35C16.5 3.5 17 2 17 2s.5 1.5 1 2.15C18.5 5.5 19.5 6 20.5 6c0 0-1 .5-1.5 1.5S18 10 18 10l-2-1s-.5 1.5-1.5 2.5c0 0-1-.5-1-2.5s.5-3.5.5-3.5z" fill="currentColor"/>
        <path d="M8.13 14.13L6 18l3.87-2.13L12 12l-1.87-2.13L6 6l2.13 3.87L10 12l-1.87 2.13z" fill="currentColor"/>
        <circle cx="12" cy="12" r="2" fill="currentColor"/>
      </svg>
    ),
  },
  {
    href: "/matches",
    label: "消息",
    matchPaths: ["/matches"],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" fill="currentColor"/>
        <path d="M7 9h10v2H7V9zm0-3h10v2H7V6zm0 6h7v2H7v-2z" fill="currentColor" opacity="0.5"/>
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "我的",
    matchPaths: ["/profile", "/settings", "/achievements", "/onboarding"],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="8" r="4" fill="currentColor"/>
        <path d="M12 14c-6 0-8 3-8 5v1h16v-1c0-2-2-5-8-5z" fill="currentColor" opacity="0.7"/>
      </svg>
    ),
  },
];

type BottomNavProps = {
  unreadCount?: number;
};

export function BottomNav({ unreadCount = 0 }: BottomNavProps) {
  const pathname = usePathname();

  const isActive = (tab: TabItem) => {
    if (tab.href === "/") {
      return pathname === "/" || pathname === "/discover";
    }
    return tab.matchPaths.some(
      (p) => pathname === p || pathname?.startsWith(p + "/")
    );
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-[var(--ink)] bg-[var(--paper)]/95 backdrop-blur-xl"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        boxShadow: "0 -4px 16px rgba(16,16,20,0.12)",
      }}
      aria-label="底部导航"
    >
      <div className="mx-auto flex max-w-[780px] items-stretch justify-around px-2 py-1.5">
        {TABS.map((tab) => {
          const active = isActive(tab);
          const isMessages = tab.href === "/matches";

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-black transition ${
                active
                  ? "text-[var(--brand)]"
                  : "text-[var(--muted-ink)] hover:text-[var(--ink)]"
              }`}
            >
              {active && (
                <span className="absolute inset-0 rounded-xl border-2 border-[var(--ink)] bg-[var(--ink)] opacity-100" />
              )}
              <span className="relative flex items-center justify-center">
                {tab.icon}
                {isMessages && unreadCount > 0 ? (
                  <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--love)] px-0.5 text-[9px] font-black text-white shadow-[1px_1px_0_var(--ink)]">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </span>
              <span className="relative">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
