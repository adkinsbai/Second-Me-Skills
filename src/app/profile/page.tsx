"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";

type UserInfo = { name: string; avatar: string; bio: string; shortId: string | null; photos: string[] };

export default function ProfilePage() {
  const [info, setInfo] = useState<UserInfo | null>(null);
  const [name, setName] = useState(""); const [bio, setBio] = useState(""); const [avatarUrl, setAvatarUrl] = useState("");
  const [photoSlots, setPhotoSlots] = useState<(string | null)[]>([null, null, null]);
  const [saving, setSaving] = useState(false);
  const [tip, setTip] = useState<{ msg: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  useEffect(() => {
    fetch("/api/user/info").then(r => r.json()).then(res => {
      if (res?.code === 0 && res?.data) {
        const d = res.data as UserInfo;
        setInfo(d); setName(d.name ?? ""); setBio(d.bio ?? ""); setAvatarUrl(d.avatar ?? "");
        const s: (string | null)[] = [null, null, null];
        (d.photos ?? []).slice(0, 3).forEach((p, i) => { s[i] = p || null; });
        setPhotoSlots(s);
      }
    }).catch(() => null).finally(() => setLoading(false));
  }, []);

  const handleFile = async (idx: number, files: FileList | null) => {
    if (!files?.length) return;
    const f = files[0];
    if (f.size > 200 * 1024) { setTip({ msg: "图片超过 200KB，请换一张", ok: false }); return; }
    const url = await new Promise<string>((res, rej) => {
      const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(); r.readAsDataURL(f);
    });
    setPhotoSlots(p => { const n = [...p]; n[idx] = url; return n; });
  };

  const save = async () => {
    setSaving(true); setTip(null);
    try {
      const [photo1, photo2, photo3] = photoSlots.map(p => p ?? null);
      const res = await fetch("/api/user/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, bio, avatarUrl, photo1, photo2, photo3 }) });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.code !== 0) setTip({ msg: data?.message || "保存失败", ok: false });
      else { setTip({ msg: "已保存", ok: true }); setInfo(p => p ? { ...p, name, bio, avatar: avatarUrl } : p); }
    } catch { setTip({ msg: "网络异常", ok: false }); } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="page-shell flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[var(--brand)]" />
    </div>
  );

  return (
    <div className="page-shell min-h-screen">
      <AppHeader backHref="/matches" title="个人主页" />

      <div className="mx-auto max-w-[780px] space-y-5 px-4 py-6">

        {/* 用户卡 */}
        <div className="poster-panel flex items-center gap-4 overflow-hidden p-5">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl ring-2 ring-[var(--brand)]/30"
            style={{ boxShadow: "0 0 20px rgba(29,255,143,0.15)" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand)] to-teal-500" />
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="absolute inset-0 h-full w-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-3xl font-black text-black">
                {(name?.[0] ?? "?").toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="text-xl font-black tracking-tight text-white">{name || "未设置昵称"}</p>
            {info?.shortId && (
              <p className="mt-1 inline-flex items-center gap-1 rounded-full border border-[var(--border-mid)] bg-[var(--surface-2)] px-2.5 py-0.5 text-xs font-mono text-[var(--fg-4)]">
                <span className="text-[var(--brand)]">#</span>{info.shortId}
              </p>
            )}
          </div>
        </div>

        {/* 照片区 */}
        <div className="glass-card rounded-3xl p-5">
          <p className="mb-1 text-sm font-bold text-white">我的照片</p>
          <p className="mb-4 text-xs text-[var(--fg-4)]">最多 3 张 · 每张 ≤ 200 KB</p>
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map(idx => (
              <div key={idx} className="relative aspect-square">
                <button type="button" onClick={() => refs[idx].current?.click()}
                  className={`h-full w-full overflow-hidden rounded-2xl border transition active:scale-95 ${
                    photoSlots[idx]
                      ? "border-[var(--border-mid)]"
                      : "border-dashed border-[var(--border-mid)] bg-[var(--surface-2)] hover:border-[var(--brand)] hover:bg-[var(--brand-light)]"
                  }`}>
                  {photoSlots[idx] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoSlots[idx]!} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-mid)] bg-[var(--surface-3)] text-2xl font-light text-[var(--fg-4)]">+</div>
                      <span className="text-[10px] text-[var(--fg-4)]">上传</span>
                    </div>
                  )}
                </button>
                {photoSlots[idx] && (
                  <button type="button"
                    onClick={e => { e.stopPropagation(); setPhotoSlots(p => { const n=[...p]; n[idx]=null; return n; }); if (refs[idx].current) refs[idx].current!.value=""; }}
                    className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-[11px] text-white hover:bg-[var(--love)]">×</button>
                )}
                <input ref={refs[idx]} type="file" accept="image/*" className="hidden" onChange={e => handleFile(idx, e.target.files)} />
              </div>
            ))}
          </div>
        </div>

        {/* 表单 */}
        <div className="glass-card rounded-3xl p-5 space-y-4">
          <p className="text-sm font-bold text-white">基本资料</p>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-[var(--fg-4)]">昵称</span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="你的昵称" className="luxury-input w-full px-4 py-3 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-[var(--fg-4)]">头像 URL（可选）</span>
            <input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://example.com/avatar.jpg" className="luxury-input w-full px-4 py-3 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-[var(--fg-4)]">一句话介绍</span>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="简单介绍自己" className="luxury-input w-full px-4 py-3 text-sm" />
          </label>
        </div>

        <div className="flex items-center justify-between">
          {tip ? (
            <span className={`text-sm ${tip.ok ? "text-[var(--brand)]" : "text-[var(--love)]"}`}>{tip.ok ? "✓ " : ""}{tip.msg}</span>
          ) : <span />}
          <button type="button" onClick={save} disabled={saving}
            className="luxury-btn px-7 py-2.5 text-sm disabled:opacity-40">{saving ? "保存中…" : "保存资料"}</button>
        </div>

        {/* 答题入口 */}
        <Link
          href="/onboarding/questionnaire"
          className="glass-card group flex items-center justify-between overflow-hidden rounded-3xl p-5 transition hover:-translate-y-1"
          style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-light)] text-2xl">
              📋
            </div>
            <div>
              <p className="font-bold text-white">完善我的档案</p>
              <p className="mt-0.5 text-sm text-[var(--fg-4)]">回答几个问题，让丘比更了解你</p>
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
            className="shrink-0 text-[var(--fg-4)] transition group-hover:translate-x-0.5 group-hover:text-[var(--brand)]">
            <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>

        <div className="h-8" />
      </div>
    </div>
  );
}
