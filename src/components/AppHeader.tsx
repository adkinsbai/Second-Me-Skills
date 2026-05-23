"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/matches",            label: "主页" },
  { href: "/profile",            label: "个人主页" },
  { href: "/settings/heartbeat", label: "心动设置" },
  { href: "/discover",           label: "翻牌" },
  { href: "/town",               label: "小镇" },
];

type AppHeaderNavRightProps = { onLogout?: () => void };

export function AppHeaderNavRight({ onLogout }: AppHeaderNavRightProps = {}) {
  const pathname = usePathname();
  return (
    <nav className="flex shrink-0 items-center gap-0.5" aria-label="主导航">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
        if (item.href === "/town") {
          return (
            <Link
              key={item.href}
              href={item.href}
              className="ml-1 rounded-xl border-2 border-[var(--ink)] bg-[var(--love)] px-3.5 py-1.5 text-xs font-black text-white shadow-[3px_3px_0_var(--ink)] transition hover:-translate-y-0.5"
            >
              {item.label}
            </Link>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-xl border-2 px-3 py-1.5 text-xs font-black transition ${
              isActive
                ? "border-[var(--ink)] bg-[var(--brand)] text-[var(--ink)] shadow-[3px_3px_0_var(--ink)]"
                : "border-transparent text-[var(--ink)] hover:border-[var(--ink)] hover:bg-[var(--paper-2)]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
      {onLogout != null ? (
        <button
          type="button"
          onClick={onLogout}
          className="ml-1 rounded-xl px-3 py-1.5 text-xs font-bold text-[var(--muted-ink)] transition hover:bg-[var(--ink)] hover:text-[var(--brand)]"
        >
          退出
        </button>
      ) : (
        <form action="/api/auth/logout" method="POST" className="inline">
          <button type="submit" className="ml-1 rounded-xl px-3 py-1.5 text-xs font-bold text-[var(--muted-ink)] transition hover:bg-[var(--ink)] hover:text-[var(--brand)]">
            退出
          </button>
        </form>
      )}
    </nav>
  );
}

type Props = { title?: string; backHref?: string; right?: React.ReactNode };

export function AppHeader({ title, backHref, right }: Props) {
  const showTitle = typeof title === "string" && title.trim().length > 0;
  return (
    <header className="sticky top-0 z-20 border-b-2 border-[var(--ink)] bg-[var(--paper)]/90 backdrop-blur-xl">
      <div className="app-container flex min-h-[3.5rem] items-center justify-between gap-x-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {backHref != null ? (
            <Link
              href={backHref}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border-2 border-[var(--ink)] bg-[var(--paper-2)] px-3 py-1.5 text-xs font-black text-[var(--ink)] shadow-[3px_3px_0_var(--ink)] transition hover:bg-[var(--brand)]"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              返回
            </Link>
          ) : (
            <Link href="/" className="flex shrink-0 items-center gap-2 group">
              <div className="flex h-8 w-8 rotate-[-6deg] items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-[var(--brand)] shadow-[3px_3px_0_var(--ink)] transition group-hover:rotate-3">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="black">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </div>
              <span className="text-sm font-black tracking-tight text-white">丘比</span>
            </Link>
          )}
          {showTitle && (
            <span className="min-w-0 truncate text-sm font-black text-[var(--ink)]">{title}</span>
          )}
        </div>
        {right !== undefined ? right : <AppHeaderNavRight />}
      </div>
    </header>
  );
}
