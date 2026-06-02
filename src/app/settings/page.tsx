"use client";

import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";

export default function SettingsPage() {
  const handleExportData = async () => {
    try {
      const res = await fetch("/api/user/export-data");
      if (!res.ok) {
        alert("导出失败，请稍后再试");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qiubi-data-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("网络异常，请稍后再试");
    }
  };

  return (
    <div className="page-shell min-h-screen">
      <AppHeader backHref="/profile" title="设置" />

      <main className="mx-auto max-w-lg px-4 py-6 space-y-4">
        {/* Notification preferences */}
        <Link
          href="/settings/notifications"
          className="glass-card group flex items-center justify-between rounded-3xl p-5 transition hover:-translate-y-1"
        >
          <div>
            <p className="font-black text-[var(--ink)]">🔔 通知设置</p>
            <p className="mt-1 text-sm text-[var(--muted-ink)]">管理推送通知、免打扰时段</p>
          </div>
          <span className="rounded-xl border-2 border-[var(--ink)] bg-[var(--c-pink)] px-3 py-1 text-xs font-black shadow-[3px_3px_0_var(--ink)]">
            设置
          </span>
        </Link>

        {/* Matching preferences */}
        <Link
          href="/settings/heartbeat"
          className="glass-card group flex items-center justify-between rounded-3xl p-5 transition hover:-translate-y-1"
        >
          <div>
            <p className="font-black text-[var(--ink)]">💜 匹配偏好</p>
            <p className="mt-1 text-sm text-[var(--muted-ink)]">设置匹配时间、偏好类型等</p>
          </div>
          <span className="rounded-xl border-2 border-[var(--ink)] bg-[var(--brand)] px-3 py-1 text-xs font-black shadow-[3px_3px_0_var(--ink)]">
            进入
          </span>
        </Link>

        {/* Data export (PIPL compliance) */}
        <button
          type="button"
          onClick={handleExportData}
          className="glass-card group flex w-full items-center justify-between rounded-3xl p-5 text-left transition hover:-translate-y-1"
        >
          <div>
            <p className="font-black text-[var(--ink)]">📦 导出我的数据</p>
            <p className="mt-1 text-sm text-[var(--muted-ink)]">
              依据《个人信息保护法》下载你的所有个人数据
            </p>
          </div>
          <span className="rounded-xl border-2 border-[var(--ink)] bg-[var(--c-blue)] px-3 py-1 text-xs font-black text-white shadow-[3px_3px_0_var(--ink)]">
            导出
          </span>
        </button>

        {/* Account & Security section */}
        <section className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--muted-ink)] px-1">
            账号与安全
          </p>

          <Link
            href="/auth/forgot-password"
            className="glass-card group flex items-center justify-between rounded-3xl p-5 transition hover:-translate-y-1"
          >
            <div>
              <p className="font-black text-[var(--ink)]">🔑 修改密码</p>
              <p className="mt-1 text-sm text-[var(--muted-ink)]">通过邮箱重置密码</p>
            </div>
            <span className="rounded-xl border-2 border-[var(--ink)] bg-[var(--paper-2)] px-3 py-1 text-xs font-black shadow-[3px_3px_0_var(--ink)]">
              前往
            </span>
          </Link>

          {/* Delete account - danger zone */}
          <Link
            href="/settings/delete-account"
            className="group flex items-center justify-between rounded-3xl border-2 border-[var(--love)] bg-[var(--love)]/5 p-5 transition hover:-translate-y-1 hover:border-[var(--ink)]"
          >
            <div>
              <p className="font-black text-[var(--love)]">🗑️ 注销账号</p>
              <p className="mt-1 text-sm text-[var(--muted-ink)]">
                删除你的账号及所有个人数据（个保法第四十七条）
              </p>
            </div>
            <span className="rounded-xl border-2 border-[var(--love)] bg-[var(--love)] px-3 py-1 text-xs font-black text-white shadow-[3px_3px_0_var(--ink)]">
              注销
            </span>
          </Link>
        </section>

        <p className="text-center text-[10px] text-[var(--muted-ink)] pt-4">
          丘比 Qiubi · 依据《个人信息保护法》保障你的数据权利
        </p>
      </main>
    </div>
  );
}
