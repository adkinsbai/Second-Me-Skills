"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";

type UserInfo = {
  name: string;
  avatar: string;
  bio: string;
  shortId: string | null;
  photos: string[];
};

const PROMPT_STORAGE_KEY = "qiubi_profile_prompts";
const PROMPT_LABELS: Record<string, { icon: string; label: string }> = {
  song: { icon: "🎵", label: "最能代表我的一首歌" },
  weekend: { icon: "🌴", label: "我的理想周末" },
  dealbreaker: { icon: "🚫", label: "绝对不能接受的事" },
  drama: { icon: "📺", label: "我最近在追的剧" },
  trivia: { icon: "🧊", label: "一个关于我的冷知识" },
  values: { icon: "💎", label: "我最看重的价值观" },
  firstdate: { icon: "☕", label: "我理想的第一次约会" },
  superpower: { icon: "⚡", label: "我的超能力是" },
};

function calcCompleteness(info: UserInfo | null, promptAnswers: Record<string, string>): number {
  if (!info) return 0;
  let score = 0;
  let total = 5; // name, bio, avatar, photo, prompts

  if (info.name?.trim()) score++;
  if (info.bio?.trim()) score++;
  if (info.avatar?.trim()) score++;
  if (info.photos?.some((p) => !!p)) score++;
  // Prompts: at least 2 answered = 1 point
  if (Object.keys(promptAnswers).length >= 2) score++;

  return Math.round((score / total) * 100);
}

export default function ProfilePage() {
  const [info, setInfo] = useState<UserInfo | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [photoSlots, setPhotoSlots] = useState<(string | null)[]>([null, null, null]);
  const [saving, setSaving] = useState(false);
  const [tip, setTip] = useState<{ msg: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [promptAnswers, setPromptAnswers] = useState<Record<string, string>>({});
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  useEffect(() => {
    fetch("/api/user/info")
      .then((response) => response.json())
      .then((result) => {
        if (result?.code === 0 && result?.data) {
          const data = result.data as UserInfo;
          setInfo(data);
          setName(data.name ?? "");
          setBio(data.bio ?? "");
          setAvatarUrl(data.avatar ?? "");
          const slots: (string | null)[] = [null, null, null];
          (data.photos ?? []).slice(0, 3).forEach((photo, index) => {
            slots[index] = photo || null;
          });
          setPhotoSlots(slots);
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false));

    // Load prompt answers from localStorage
    try {
      const raw = localStorage.getItem(PROMPT_STORAGE_KEY);
      if (raw) setPromptAnswers(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const handleFile = async (index: number, files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];
    if (file.size > 200 * 1024) {
      setTip({ msg: "图片超过 200KB，请换一张更小的图。", ok: false });
      return;
    }
    const url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("read file failed"));
      reader.readAsDataURL(file);
    });
    setPhotoSlots((prev) => {
      const next = [...prev];
      next[index] = url;
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setTip(null);
    try {
      const [photo1, photo2, photo3] = photoSlots.map((photo) => photo ?? null);
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio, avatarUrl, photo1, photo2, photo3 }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.code !== 0) {
        setTip({ msg: data?.message || "保存失败", ok: false });
      } else {
        setTip({ msg: "已保存", ok: true });
        setInfo((prev) => (prev ? { ...prev, name, bio, avatar: avatarUrl } : prev));
      }
    } catch {
      setTip({ msg: "网络异常，请稍后再试", ok: false });
    } finally {
      setSaving(false);
    }
  };

  const completeness = calcCompleteness(info, promptAnswers);
  const answeredPromptIds = Object.keys(promptAnswers);

  if (loading) {
    return (
      <div className="page-shell flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--ink)] border-t-[var(--brand)]" />
      </div>
    );
  }

  return (
    <div className="page-shell min-h-screen">
      <AppHeader backHref="/matches" title="个人资料" />

      <main className="mx-auto max-w-[780px] space-y-5 px-4 py-6">
        {/* Profile completeness */}
        <section className="rounded-2xl border-2 border-[var(--ink)] bg-[var(--card)] p-4 shadow-[4px_4px_0_var(--ink)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-[var(--ink)]">资料完整度</p>
              <p className="text-xs font-bold text-[var(--muted-ink)]">
                {completeness >= 80 ? "太棒了！你的资料很完善 🎉" : "完善资料，让更多人看到你"}
              </p>
            </div>
            <span
              className={`text-2xl font-black ${
                completeness >= 80 ? "text-[var(--brand)]" : "text-[var(--c-amber)]"
              }`}
            >
              {completeness}%
            </span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full border-2 border-[var(--ink)] bg-[var(--paper)]">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${completeness}%`,
                background:
                  completeness >= 80
                    ? "linear-gradient(90deg,var(--brand),var(--c-gold))"
                    : "linear-gradient(90deg,var(--c-amber),var(--brand))",
              }}
            />
          </div>
          {completeness < 80 && (
            <Link
              href="/profile/prompts"
              className="mt-3 inline-flex items-center gap-1 rounded-xl border-2 border-[var(--ink)] bg-[var(--c-blue)] px-4 py-2 text-xs font-black text-white shadow-[3px_3px_0_var(--ink)] transition hover:-translate-y-0.5"
            >
              ✨ 完善资料
            </Link>
          )}
        </section>

        <section className="poster-panel flex items-center gap-4 overflow-hidden p-5">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-[var(--ink)] bg-[var(--brand)] shadow-[5px_5px_0_var(--ink)]">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={name || "user avatar"} className="absolute inset-0 h-full w-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-3xl font-black text-[var(--ink)]">
                {(name?.[0] ?? "?").toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="poster-kicker">Profile</p>
            <h1 className="truncate text-2xl font-black text-[var(--paper)]">{name || "未设置昵称"}</h1>
            {info?.shortId ? (
              <p className="mt-1 inline-flex items-center gap-1 rounded-full border-2 border-[var(--ink)] bg-[var(--brand)] px-2.5 py-0.5 text-xs font-black text-[var(--ink)]">
                #{info.shortId}
              </p>
            ) : null}
          </div>
        </section>

        {/* Answered prompts cards */}
        {answeredPromptIds.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--muted-ink)]">
                个性问答
              </p>
              <Link
                href="/profile/prompts"
                className="rounded-lg border-2 border-[var(--ink)] bg-[var(--brand)] px-2.5 py-0.5 text-[10px] font-black shadow-[2px_2px_0_var(--ink)]"
              >
                编辑
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {answeredPromptIds.map((pid) => {
                const meta = PROMPT_LABELS[pid];
                if (!meta) return null;
                return (
                  <div
                    key={pid}
                    className="rounded-2xl border-2 border-[var(--ink)] bg-[var(--card)] p-3 shadow-[3px_3px_0_var(--ink)]"
                  >
                    <p className="text-[10px] font-black text-[var(--ink)]/50">
                      {meta.icon} {meta.label}
                    </p>
                    <p className="mt-1 text-sm font-bold text-[var(--ink)]">
                      {promptAnswers[pid]}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="glass-card rounded-3xl p-5">
          <p className="mb-1 text-sm font-black text-[var(--ink)]">我的照片</p>
          <p className="mb-4 text-xs font-bold text-[var(--muted-ink)]">最多 3 张，每张不超过 200KB。正式上线后会升级为云存储上传。</p>
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((index) => (
              <div key={index} className="relative aspect-square">
                <button
                  type="button"
                  onClick={() => refs[index].current?.click()}
                  className={`h-full w-full overflow-hidden rounded-2xl border-2 border-[var(--ink)] transition active:scale-95 ${
                    photoSlots[index] ? "bg-[var(--paper)]" : "border-dashed bg-[var(--paper-2)] hover:bg-[var(--brand)]"
                  }`}
                >
                  {photoSlots[index] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoSlots[index]!} alt={`photo ${index + 1}`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-[var(--ink)]">
                      <span className="text-3xl font-black">+</span>
                      <span className="text-xs font-black">上传</span>
                    </div>
                  )}
                </button>
                {photoSlots[index] ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setPhotoSlots((prev) => {
                        const next = [...prev];
                        next[index] = null;
                        return next;
                      });
                      if (refs[index].current) refs[index].current.value = "";
                    }}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--love)] text-sm font-black text-white"
                    aria-label="删除照片"
                  >
                    ×
                  </button>
                ) : null}
                <input ref={refs[index]} type="file" accept="image/*" className="hidden" onChange={(event) => handleFile(index, event.target.files)} />
              </div>
            ))}
          </div>
        </section>

        <section className="glass-card space-y-4 rounded-3xl p-5">
          <p className="text-sm font-black text-[var(--ink)]">基本资料</p>
          <label className="block">
            <span className="mb-1.5 block text-xs font-black text-[var(--muted-ink)]">昵称</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="你的昵称" className="luxury-input w-full px-4 py-3 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-black text-[var(--muted-ink)]">头像 URL（可选）</span>
            <input value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://example.com/avatar.jpg" className="luxury-input w-full px-4 py-3 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-black text-[var(--muted-ink)]">一句话介绍</span>
            <textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={3} placeholder="简单介绍自己" className="luxury-input w-full px-4 py-3 text-sm" />
          </label>
        </section>

        <div className="flex items-center justify-between gap-3">
          {tip ? <span className={`text-sm font-black ${tip.ok ? "text-[var(--ink)]" : "text-[var(--love)]"}`}>{tip.msg}</span> : <span />}
          <button type="button" onClick={save} disabled={saving} className="luxury-btn px-7 py-2.5 text-sm disabled:opacity-40">
            {saving ? "保存中..." : "保存资料"}
          </button>
        </div>

        <Link href="/onboarding/questionnaire" className="glass-card group flex items-center justify-between rounded-3xl p-5 transition hover:-translate-y-1">
          <div>
            <p className="font-black text-[var(--ink)]">完善我的档案</p>
            <p className="mt-1 text-sm font-bold text-[var(--muted-ink)]">回答几个问题，让丘比更准确地理解你的关系偏好。</p>
          </div>
          <span className="rounded-xl border-2 border-[var(--ink)] bg-[var(--brand)] px-3 py-1 text-xs font-black text-[var(--ink)] shadow-[3px_3px_0_var(--ink)]">进入</span>
        </Link>

        <Link href="/profile/prompts" className="glass-card group flex items-center justify-between rounded-3xl p-5 transition hover:-translate-y-1">
          <div>
            <p className="font-black text-[var(--ink)]">✨ 个性问答</p>
            <p className="mt-1 text-sm font-bold text-[var(--muted-ink)]">
              回答有趣的问题，让别人更了解你。已答 {answeredPromptIds.length}/8
            </p>
          </div>
          <span className="rounded-xl border-2 border-[var(--ink)] bg-[var(--c-blue)] px-3 py-1 text-xs font-black text-white shadow-[3px_3px_0_var(--ink)]">去回答</span>
        </Link>
      </main>
    </div>
  );
}
