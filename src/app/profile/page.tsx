"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { Toast } from "@/components/Toast";
import { BottomNav } from "@/components/BottomNav";
import type { ToastType } from "@/components/Toast";

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
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [promptAnswers, setPromptAnswers] = useState<Record<string, string>>({});
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const avatarRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((msg: string, type: ToastType) => {
    setToast({ msg, type });
  }, []);

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

    // Load prompt answers from server API
    fetch("/api/user/prompts", { credentials: "include" })
      .then((r) => r.json())
      .then((result) => {
        if (result?.code === 0 && Array.isArray(result.data)) {
          const map: Record<string, string> = {};
          for (const p of result.data) {
            if (p.promptKey && p.answer) map[p.promptKey] = p.answer;
          }
          setPromptAnswers(map);
        }
      })
      .catch(() => {
        // Fallback: try localStorage
        try {
          const raw = localStorage.getItem(PROMPT_STORAGE_KEY);
          if (raw) setPromptAnswers(JSON.parse(raw));
        } catch {
          // ignore
        }
      });
  }, []);

  /** Upload a file to /api/user/upload, return the resulting URL. */
  const uploadFile = async (file: File, type: string): Promise<string | null> => {
    const form = new FormData();
    form.append("file", file);
    form.append("type", type);

    setUploading((prev) => ({ ...prev, [type]: true }));
    try {
      const res = await fetch("/api/user/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.code !== 0) {
        showToast(data?.message || "上传失败", "error");
        return null;
      }
      return data.data.url as string;
    } catch {
      showToast("网络异常，上传失败", "error");
      return null;
    } finally {
      setUploading((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleFile = async (index: number, files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];

    // Validate size client-side (5 MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast("图片不能超过 5MB", "error");
      return;
    }

    const type = `photo${index + 1}`;
    const url = await uploadFile(file, type);
    if (url) {
      setPhotoSlots((prev) => {
        const next = [...prev];
        next[index] = url;
        return next;
      });
      showToast(`照片 ${index + 1} 已上传`, "success");
    }
  };

  const handleAvatarFile = async (files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];

    if (file.size > 5 * 1024 * 1024) {
      showToast("图片不能超过 5MB", "error");
      return;
    }

    const url = await uploadFile(file, "avatar");
    if (url) {
      setAvatarUrl(url);
      showToast("头像已上传", "success");
    }
  };

  const save = async () => {
    setSaving(true);
    setToast(null);
    try {
      const [photo1, photo2, photo3] = photoSlots.map((photo) => photo ?? null);
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio, avatarUrl, photo1, photo2, photo3 }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.code !== 0) {
        showToast(data?.message || "保存失败", "error");
      } else {
        showToast("资料已保存", "success");
        setInfo((prev) => (prev ? { ...prev, name, bio, avatar: avatarUrl } : prev));
      }
    } catch {
      showToast("网络异常，请稍后再试", "error");
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
    <div className="page-shell min-h-screen pb-20">
      <AppHeader backHref="/matches" title="个人资料" />

      {toast ? (
        <Toast
          message={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      ) : null}

      <main className="mx-auto max-w-[780px] space-y-5 px-4 py-6">
        {/* Quick access: 小镇 + 我的画像 */}
        <section className="grid grid-cols-2 gap-3">
          <Link
            href="/town"
            className="group relative flex h-28 items-center overflow-hidden rounded-2xl border-2 border-[var(--ink)] bg-[var(--ink)] p-4 shadow-[6px_6px_0_var(--ink)] transition hover:-translate-y-1"
          >
            <div className="absolute -right-4 -top-4 flex h-20 w-20 rotate-12 items-center justify-center border-2 border-[var(--ink)] text-4xl opacity-80" style={{ background: "var(--love)" }}>
              🏘️
            </div>
            <div className="relative">
              <p className="text-lg font-black text-[var(--paper)]">小镇广场</p>
              <p className="mt-1 text-xs font-bold text-[var(--paper)]/70">发布需求，找搭子</p>
            </div>
          </Link>
          <Link
            href="/portrait"
            className="group relative flex h-28 items-center overflow-hidden rounded-2xl border-2 border-[var(--ink)] bg-[var(--ink)] p-4 shadow-[6px_6px_0_var(--ink)] transition hover:-translate-y-1"
          >
            <div className="absolute -right-4 -top-4 flex h-20 w-20 rotate-12 items-center justify-center border-2 border-[var(--ink)] text-4xl opacity-80" style={{ background: "var(--c-purple)" }}>
              🪞
            </div>
            <div className="relative">
              <p className="text-lg font-black text-[var(--paper)]">我的画像</p>
              <p className="mt-1 text-xs font-bold text-[var(--paper)]/70">看看丘比怎么理解你</p>
            </div>
          </Link>
        </section>

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
          <p className="mb-4 text-xs font-bold text-[var(--muted-ink)]">最多 3 张，选择图片上传。</p>
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((index) => {
              const typeKey = `photo${index + 1}`;
              const isUploading = uploading[typeKey];
              return (
                <div key={index} className="relative aspect-square">
                  <button
                    type="button"
                    onClick={() => refs[index].current?.click()}
                    disabled={isUploading}
                    className={`h-full w-full overflow-hidden rounded-2xl border-2 border-[var(--ink)] transition active:scale-95 ${
                      isUploading ? "opacity-50" : ""
                    } ${
                      photoSlots[index] ? "bg-[var(--paper)]" : "border-dashed bg-[var(--paper-2)] hover:bg-[var(--brand)]"
                    }`}
                  >
                    {isUploading ? (
                      <div className="flex h-full w-full items-center justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--ink)] border-t-[var(--brand)]" />
                      </div>
                    ) : photoSlots[index] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoSlots[index]!} alt={`photo ${index + 1}`} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-[var(--ink)]">
                        <span className="text-3xl font-black">+</span>
                        <span className="text-xs font-black">上传</span>
                      </div>
                    )}
                  </button>
                  {photoSlots[index] && !isUploading ? (
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
              );
            })}
          </div>
        </section>

        <section className="glass-card space-y-4 rounded-3xl p-5">
          <p className="text-sm font-black text-[var(--ink)]">基本资料</p>
          <label className="block">
            <span className="mb-1.5 block text-xs font-black text-[var(--muted-ink)]">昵称</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="你的昵称" className="luxury-input w-full px-4 py-3 text-sm" />
          </label>
          <div>
            <span className="mb-1.5 block text-xs font-black text-[var(--muted-ink)]">头像</span>
            <div className="flex items-center gap-3">
              {uploading["avatar"] ? (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-[var(--paper)]">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--ink)] border-t-[var(--brand)]" />
                </div>
              ) : avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="头像预览" className="h-14 w-14 rounded-xl border-2 border-[var(--ink)] object-cover shadow-[3px_3px_0_var(--ink)]" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-dashed border-[var(--ink)] bg-[var(--paper-2)] text-xl font-black text-[var(--ink)]">
                  ?
                </div>
              )}
              <button
                type="button"
                onClick={() => avatarRef.current?.click()}
                disabled={uploading["avatar"]}
                className="luxury-btn-secondary px-4 py-2 text-xs disabled:opacity-40"
              >
                上传头像
              </button>
              {avatarUrl ? (
                <button
                  type="button"
                  onClick={() => {
                    setAvatarUrl("");
                    if (avatarRef.current) avatarRef.current.value = "";
                  }}
                  className="rounded-lg border-2 border-[var(--ink)] bg-[var(--love)] px-3 py-2 text-xs font-black text-white shadow-[2px_2px_0_var(--ink)] transition hover:-translate-y-0.5"
                >
                  清除
                </button>
              ) : null}
            </div>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleAvatarFile(event.target.files)} />
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-black text-[var(--muted-ink)]">一句话介绍</span>
            <textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={3} placeholder="简单介绍自己" className="luxury-input w-full px-4 py-3 text-sm" />
          </label>
        </section>

        <div className="flex items-center justify-end gap-3">
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

        <Link href="/settings" className="glass-card group flex items-center justify-between rounded-3xl p-5 transition hover:-translate-y-1">
          <div>
            <p className="font-black text-[var(--ink)]">⚙️ 设置</p>
            <p className="mt-1 text-sm font-bold text-[var(--muted-ink)]">匹配偏好、数据导出、账号安全</p>
          </div>
          <span className="rounded-xl border-2 border-[var(--ink)] bg-[var(--paper-2)] px-3 py-1 text-xs font-black shadow-[3px_3px_0_var(--ink)]">进入</span>
        </Link>
      </main>

      <BottomNav />
    </div>
  );
}
