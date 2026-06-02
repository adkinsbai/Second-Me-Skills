"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

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

  const submit = async () => {
    if (!name.trim()) {
      setError("请填写昵称");
      return;
    }
    if (!email.trim()) {
      setError("请输入邮箱");
      return;
    }
    if (!password) {
      setError("请输入密码");
      return;
    }
    if (password !== confirmPassword) {
      setError("两次密码不一致");
      return;
    }
    if (
      password.length < 8 ||
      !/[A-Za-z]/.test(password) ||
      !/\d/.test(password)
    ) {
      setError("密码至少 8 位，并包含字母和数字");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim(),
          rememberMe,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        code?: number;
        message?: string;
      } | null;
      if (!res.ok || data?.code !== 0) {
        setError(
          data?.message ||
            (res.status >= 500 ? `服务器错误(${res.status})` : "注册失败")
        );
      } else {
        window.location.href = "/onboarding/questionnaire";
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
      else window.location.href = "/";
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  if (checking)
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[var(--brand)]" />
      </main>
    );

  return (
    <main className="page-shell flex min-h-screen flex-col items-center justify-center px-4">
      {/* 背景光晕 */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle,rgba(199,255,0,0.08),transparent 70%)",
          }}
        />
        <div
          className="absolute right-1/4 top-2/3 h-64 w-64 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle,rgba(23,75,255,0.06),transparent 70%)",
          }}
        />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--brand)] shadow-[0_0_40px_rgba(199,255,0,0.4)]">
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="black"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[var(--ink)]">
            丘比
          </h1>
          <p className="mt-2 text-sm text-[var(--muted-ink)]">
            创建你的账号
          </p>
        </div>

        {/* Register Form */}
        <div className="overflow-hidden rounded-3xl border-2 border-[var(--ink)] bg-[var(--paper)] shadow-[8px_8px_0_var(--ink)]">
          <div className="h-3 w-full poster-stripe" />
          <div className="space-y-4 p-5">
            <h2 className="text-center text-lg font-black text-[var(--ink)]">
              注册
            </h2>

            <div className="space-y-2.5">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="昵称（必填）"
                className="luxury-input w-full px-4 py-3 text-sm"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="邮箱"
                className="luxury-input w-full px-4 py-3 text-sm"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="密码（至少 8 位，含字母和数字）"
                className="luxury-input w-full px-4 py-3 text-sm"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="确认密码"
                className="luxury-input w-full px-4 py-3 text-sm"
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
            </div>

            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-[var(--ink)]">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="accent-[var(--brand)]"
              />
              记住我（30 天）
            </label>

            {error ? (
              <div className="rounded-xl border-2 border-[var(--ink)] bg-[var(--love)] px-3.5 py-2.5 text-sm font-bold text-white">
                {error}
              </div>
            ) : null}

            <button
              type="button"
              onClick={submit}
              disabled={loading}
              className="luxury-btn inline-flex w-full items-center justify-center py-3.5 text-sm disabled:opacity-40"
            >
              {loading ? "处理中..." : "创建账号"}
            </button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--border)]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[var(--paper)] px-2 font-bold text-[var(--muted-ink)]">
                  或者
                </span>
              </div>
            </div>

            <a
              href="/api/auth/login"
              className="inline-flex w-full items-center justify-center rounded-2xl border-2 border-[var(--ink)] bg-[var(--c-blue)] py-3 text-sm font-black text-white shadow-[4px_4px_0_var(--ink)] transition hover:-translate-y-0.5"
            >
              用 SecondMe 登录
            </a>

            <button
              type="button"
              onClick={guestLogin}
              disabled={loading}
              className="inline-flex w-full items-center justify-center rounded-2xl border-2 border-dashed border-[var(--ink)] bg-[var(--paper-2)] py-3 text-sm font-black text-[var(--ink)] transition hover:bg-[var(--c-amber)] disabled:opacity-50"
            >
              先逛逛（无需注册）
            </button>

            <p className="text-center text-sm font-bold text-[var(--muted-ink)]">
              已有账号？{" "}
              <Link
                href="/auth/login"
                className="font-black text-[var(--brand-text)] underline underline-offset-2"
              >
                登录
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-[var(--muted-ink)]">
          注册即表示同意
          <Link href="/terms" className="font-black text-[var(--ink)] underline underline-offset-2">
            《用户服务协议》
          </Link>
          和
          <Link href="/privacy" className="font-black text-[var(--ink)] underline underline-offset-2">
            《隐私政策》
          </Link>
        </p>
      </div>
    </main>
  );
}
