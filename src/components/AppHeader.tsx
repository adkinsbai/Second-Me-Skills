"use client";

import Link from "next/link";

type AppHeaderNavRightProps = {
  /** 传入时用按钮 + 客户端回调；不传则用表单 POST /api/auth/logout */
  onLogout?: () => void;
};

/** 顶栏右侧：个人主页 / 心动设置 / 丘比小镇 / 退出（供各页与默认 AppHeader 共用） */
export function AppHeaderNavRight({ onLogout }: AppHeaderNavRightProps = {}) {
  return (
    <nav
      className="flex shrink-0 items-center justify-end gap-x-2 whitespace-nowrap"
      aria-label="账户与小镇"
    >
      <Link href="/matches" className="text-sm text-amber-100/85 transition hover:text-amber-50">
        个人主页
      </Link>
      <Link href="/settings/heartbeat" className="text-sm text-amber-100/70 transition hover:text-amber-50">
        心动设置
      </Link>
      <Link
        href="/town"
        className="rounded-full bg-gradient-to-r from-rose-600 to-pink-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-md shadow-rose-900/30 ring-1 ring-white/25 transition hover:brightness-110"
      >
        丘比小镇
      </Link>
      {onLogout != null ? (
        <button
          type="button"
          onClick={onLogout}
          className="text-sm text-amber-200/65 transition hover:text-amber-100"
        >
          退出登录
        </button>
      ) : (
        <form action="/api/auth/logout" method="POST" className="inline">
          <button type="submit" className="text-sm text-amber-200/65 transition hover:text-amber-100">
            退出登录
          </button>
        </form>
      )}
    </nav>
  );
}

type Props = {
  title?: string;
  backHref?: string;
  right?: React.ReactNode;
};

export function AppHeader({ title, backHref, right }: Props) {
  const showTitle = typeof title === "string" && title.trim().length > 0;
  return (
    <header className="sticky top-0 z-20 border-b border-amber-200/20 bg-[#0c111b]/70 backdrop-blur-xl">
      <div className="app-container flex min-h-16 items-center justify-between gap-x-3 py-2 sm:min-h-[4rem] sm:py-0">
        <div className="flex min-w-0 max-w-full flex-1 items-center gap-3 sm:max-w-[min(55%,28rem)] sm:flex-none">
          {backHref != null ? (
            <Link
              href={backHref}
              className="shrink-0 rounded-full border border-amber-100/20 px-3 py-1 text-sm text-amber-100/85 transition hover:border-amber-100/40 hover:text-amber-50"
            >
              返回
            </Link>
          ) : (
            <Link href="/" className="shrink-0 font-semibold tracking-wide text-amber-50 transition hover:opacity-90">
              丘比
            </Link>
          )}
          {showTitle && (
            <span className="min-w-0 truncate text-sm font-medium tracking-wide text-amber-100/90">{title}</span>
          )}
        </div>
        {right !== undefined ? right : <AppHeaderNavRight />}
      </div>
    </header>
  );
}
