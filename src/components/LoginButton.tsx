"use client";

import { useState } from "react";
import Link from "next/link";

export function LoginButton({ redirectTo = "/" }: { redirectTo?: string }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  const submit = async () => {
    if (!email.trim()) {
      setError("请输入邮箱");
      return;
    }
    if (!password) {
      setError("请输入密码");
      return;
    }
    if (mode === "register") {
      if (!name.trim()) {
        setError("请填写昵称");
        return;
      }
      if (password !== confirmPassword) {
        setError("两次密码不一致");
        return;
      }
      if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        setError("密码至少 8 位，并包含字母和数字");
        return;
      }
    }

    setLoading(true);
    setError("");
    const url = mode === "register" ? "/api/auth/register" : "/api/auth/local-login";
    const body = mode === "register" ? { email, password, name: name.trim(), rememberMe } : { email, password, rememberMe };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as { code?: number; message?: string } | null;
      if (!res.ok || data?.code !== 0) {
        setError(data?.message || (res.status >= 500 ? `服务器错误(${res.status})` : "操作失败"));
      } else {
        window.location.href = mode === "register" ? "/onboarding/questionnaire" : redirectTo;
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  const guestLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/guest", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.code !== 0) setError(data?.message || "游客进入失败");
      else window.location.href = redirectTo;
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-3xl border-2 border-[var(--ink)] bg-[var(--paper)] shadow-[8px_8px_0_var(--ink)]">
      <div className="h-3 w-full poster-stripe" />
      <div className="space-y-4 p-5">
        <div className="flex rounded-2xl border-2 border-[var(--ink)] bg-[var(--paper-2)] p-1">
          {(["login", "register"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setMode(item);
                setError("");
              }}
              className={`flex-1 rounded-xl py-2 text-sm font-black transition ${
                mode === item ? "bg-[var(--brand)] text-[var(--ink)] shadow-[3px_3px_0_var(--ink)]" : "text-[var(--ink)] hover:bg-white"
              }`}
            >
              {item === "login" ? "登录" : "注册"}
            </button>
          ))}
        </div>

        <div className="space-y-2.5">
          {mode === "register" ? (
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="昵称（必填）"
              className="luxury-input w-full px-4 py-3 text-sm"
            />
          ) : null}
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="邮箱"
            className="luxury-input w-full px-4 py-3 text-sm"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={mode === "register" ? "密码（至少 8 位，含字母和数字）" : "密码"}
            className="luxury-input w-full px-4 py-3 text-sm"
          />
          {mode === "register" ? (
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="确认密码"
              className="luxury-input w-full px-4 py-3 text-sm"
            />
          ) : null}
        </div>

        {mode === "login" ? (
          <div className="flex items-center justify-between text-xs">
            <label className="inline-flex cursor-pointer items-center gap-2 font-bold text-[var(--ink)]">
              <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="accent-[var(--brand)]" />
              记住我（30 天）
            </label>
            <Link href="/auth/forgot-password" className="font-black text-[var(--love)] hover:underline">
              忘记密码？
            </Link>
          </div>
        ) : null}

        {error ? <div className="rounded-xl border-2 border-[var(--ink)] bg-[var(--love)] px-3.5 py-2.5 text-sm font-bold text-white">{error}</div> : null}

        <button type="button" onClick={submit} disabled={loading} className="luxury-btn inline-flex w-full items-center justify-center py-3.5 text-sm disabled:opacity-40">
          {loading ? "处理中..." : mode === "register" ? "创建账号" : "登录"}
        </button>

        <a
          href="/api/auth/login"
          className="inline-flex w-full items-center justify-center rounded-2xl border-2 border-[var(--ink)] bg-[var(--c-blue)] py-3 text-sm font-black text-white shadow-[4px_4px_0_var(--ink)] transition hover:-translate-y-0.5"
        >
          使用 SecondMe 登录
        </a>

        <button
          type="button"
          onClick={guestLogin}
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-2xl border-2 border-dashed border-[var(--ink)] bg-[var(--paper-2)] py-3 text-sm font-black text-[var(--ink)] transition hover:bg-[var(--c-amber)] disabled:opacity-50"
        >
          先逛逛（无需注册）
        </button>
      </div>
    </div>
  );
}
