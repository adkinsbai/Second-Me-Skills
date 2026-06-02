"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";

type NotificationSettings = {
  pushEnabled: boolean;
  quietHoursStart: number;
  quietHoursEnd: number;
  dailyRecommendation: boolean;
  reEngagement: boolean;
  matchNotification: boolean;
  messageNotification: boolean;
};

const DEFAULT_SETTINGS: NotificationSettings = {
  pushEnabled: true,
  quietHoursStart: 23,
  quietHoursEnd: 8,
  dailyRecommendation: true,
  reEngagement: true,
  matchNotification: true,
  messageNotification: true,
};

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex-1">
        <p className="font-black text-[var(--ink)] text-sm">{label}</p>
        {description ? (
          <p className="mt-0.5 text-xs font-bold text-[var(--muted-ink)]">{description}</p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-[var(--ink)] transition-colors ${
          checked ? "bg-[var(--c-pink)]" : "bg-[var(--paper-2)]"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full border-2 border-[var(--ink)] bg-white shadow-[2px_2px_0_var(--ink)] transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function TimePicker({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-black text-[var(--muted-ink)] w-16">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="luxury-input px-3 py-2 text-sm font-bold"
      >
        {Array.from({ length: 24 }, (_, i) => (
          <option key={i} value={i}>
            {String(i).padStart(2, "0")}:00
          </option>
        ))}
      </select>
    </div>
  );
}

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    fetch("/api/user/notification-settings")
      .then((res) => res.json())
      .then((result) => {
        if (result.code === 0 && result.data) {
          setSettings({
            pushEnabled: result.data.pushEnabled ?? true,
            quietHoursStart: result.data.quietHoursStart ?? 23,
            quietHoursEnd: result.data.quietHoursEnd ?? 8,
            dailyRecommendation: result.data.dailyRecommendation ?? true,
            reEngagement: result.data.reEngagement ?? true,
            matchNotification: result.data.matchNotification ?? true,
            messageNotification: result.data.messageNotification ?? true,
          });
        }
      })
      .catch(() => null)
      .finally(() => setLoaded(true));
  }, []);

  const update = <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setToast(null);
  };

  const save = () => {
    setSaving(true);
    setToast(null);
    fetch("/api/user/notification-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    })
      .then((res) => res.json())
      .then((result) => {
        setToast(result.code === 0 ? "success" : "error");
      })
      .catch(() => setToast("error"))
      .finally(() => setSaving(false));
  };

  if (!loaded) {
    return (
      <main className="page-shell flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--ink)] border-t-[var(--brand)]" />
      </main>
    );
  }

  return (
    <main className="page-shell pb-24">
      <AppHeader backHref="/settings" title="通知设置" />

      <div className="app-container max-w-lg space-y-5 py-6">
        {/* Hero */}
        <section className="poster-panel p-5">
          <p className="poster-kicker">Notification Center</p>
          <h1 className="mt-4 text-3xl font-black leading-9 text-[var(--brand)]">
            你的消息，你做主
          </h1>
          <p className="mt-3 text-sm font-bold leading-6 text-[var(--paper)]">
            控制丘比什么时候可以打扰你，什么消息值得收到推送。
          </p>
        </section>

        {/* Master toggle */}
        <section className="glass-card rounded-2xl p-4">
          <Toggle
            checked={settings.pushEnabled}
            onChange={(v) => update("pushEnabled", v)}
            label="🔔 推送通知总开关"
            description="关闭后将不再收到任何推送"
          />
        </section>

        {/* Individual notification types */}
        <section className={`glass-card rounded-2xl p-4 space-y-1 ${!settings.pushEnabled ? "opacity-50 pointer-events-none" : ""}`}>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--muted-ink)] px-1 pb-2">
            通知类型
          </p>
          <Toggle
            checked={settings.dailyRecommendation}
            onChange={(v) => update("dailyRecommendation", v)}
            label="💫 每日推荐"
            description="每天为你推荐一位心动对象"
          />
          <div className="border-t border-[var(--ink)]/10" />
          <Toggle
            checked={settings.matchNotification}
            onChange={(v) => update("matchNotification", v)}
            label="💕 匹配通知"
            description="新匹配、成就解锁、星星升级"
          />
          <div className="border-t border-[var(--ink)]/10" />
          <Toggle
            checked={settings.messageNotification}
            onChange={(v) => update("messageNotification", v)}
            label="💬 消息通知"
            description="收到新消息时提醒"
          />
          <div className="border-t border-[var(--ink)]/10" />
          <Toggle
            checked={settings.reEngagement}
            onChange={(v) => update("reEngagement", v)}
            label="💌 回流提醒"
            description="长时间未登录时温柔提醒"
          />
        </section>

        {/* Quiet hours */}
        <section className={`glass-card rounded-2xl p-4 space-y-4 ${!settings.pushEnabled ? "opacity-50 pointer-events-none" : ""}`}>
          <div>
            <p className="font-black text-[var(--ink)] text-sm">🌙 免打扰时段</p>
            <p className="mt-0.5 text-xs font-bold text-[var(--muted-ink)]">
              在此期间不会发送推送通知
            </p>
          </div>
          <div className="flex items-center gap-4">
            <TimePicker
              value={settings.quietHoursStart}
              onChange={(v) => update("quietHoursStart", v)}
              label="开始"
            />
            <span className="text-[var(--muted-ink)] font-black">→</span>
            <TimePicker
              value={settings.quietHoursEnd}
              onChange={(v) => update("quietHoursEnd", v)}
              label="结束"
            />
          </div>
          <p className="text-[10px] text-[var(--muted-ink)] font-bold">
            当前免打扰：{String(settings.quietHoursStart).padStart(2, "0")}:00 - {String(settings.quietHoursEnd).padStart(2, "0")}:00
          </p>
        </section>

        {/* Toast */}
        {toast === "success" ? (
          <div className="luxury-alert luxury-alert-success text-center">保存成功 ✅</div>
        ) : null}
        {toast === "error" ? (
          <div className="luxury-alert luxury-alert-error text-center">保存失败，请稍后再试</div>
        ) : null}

        {/* Save button */}
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="luxury-btn w-full py-3 text-sm disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存通知设置"}
        </button>

        {/* Link to push permission */}
        <Link
          href="/settings"
          className="block text-center text-xs font-bold text-[var(--muted-ink)] hover:text-[var(--brand)] transition"
        >
          ← 返回设置
        </Link>
      </div>
    </main>
  );
}
