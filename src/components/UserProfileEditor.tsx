"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Toast } from "@/components/Toast";
import type { ToastType } from "@/components/Toast";

type UserInfo = {
  name?: string | null;
  avatar?: string;
  bio?: string | null;
  selfIntroduction?: string;
  photos?: string[];
};

export function UserProfileEditor() {
  const [info, setInfo] = useState<UserInfo | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoSlots, setPhotoSlots] = useState<(string | null)[]>([null, null, null]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const avatarRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/user/info")
      .then((response) => response.json())
      .then((result) => {
        if (result?.code === 0 && result?.data) {
          setInfo(result.data as UserInfo);
          setName(result.data.name ?? "");
          setBio(result.data.bio ?? "");
          setAvatarUrl(result.data.avatar ?? "");
          const p = Array.isArray(result.data.photos) ? result.data.photos : [];
          setPhotos(p);
          const slots: (string | null)[] = [null, null, null];
          p.slice(0, 3).forEach((photo: string, i: number) => {
            slots[i] = photo || null;
          });
          setPhotoSlots(slots);
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const previewPhotos = useMemo(() => {
    // Use the photoSlots (uploaded URLs) for preview
    const filled = photoSlots.filter((p): p is string => !!p);
    return filled.length > 0 ? filled : photos;
  }, [photoSlots, photos]);

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
        setToast({ msg: data?.message || "上传失败", type: "error" });
        return null;
      }
      return data.data.url as string;
    } catch {
      setToast({ msg: "网络异常，上传失败", type: "error" });
      return null;
    } finally {
      setUploading((prev) => ({ ...prev, [type]: false }));
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    setToast(null);
    try {
      const photo1 = photoSlots[0] ?? photos[0] ?? null;
      const photo2 = photoSlots[1] ?? photos[1] ?? null;
      const photo3 = photoSlots[2] ?? photos[2] ?? null;

      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio, avatarUrl, photo1, photo2, photo3 }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.code !== 0) {
        setToast({ msg: data?.message || "保存失败，请稍后再试。", type: "error" });
        return;
      }

      const nextPhotos = [photo1, photo2, photo3].filter((item): item is string => typeof item === "string" && item.trim().length > 0);
      setPhotos(nextPhotos);
      setInfo((prev) => (prev ? { ...prev, name, bio, avatar: avatarUrl, selfIntroduction: bio, photos: nextPhotos } : prev));
      setToast({ msg: "资料已保存", type: "success" });
      setEditing(false);
    } catch {
      setToast({ msg: "网络异常，请稍后再试。", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-sm font-bold text-[var(--muted-ink)]">加载中...</div>;
  if (!info) return null;

  return (
    <div className="glass-card rounded-2xl p-4">
      {toast ? (
        <Toast
          message={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      ) : null}

      <div className="flex items-center gap-3">
        {info.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={info.avatar} alt="" className="h-12 w-12 rounded-2xl border-2 border-[var(--ink)] object-cover shadow-[3px_3px_0_var(--ink)]" />
        ) : null}
        <div className="min-w-0">
          <p className="truncate font-black text-[var(--ink)]">{info.name ?? "未设置昵称"}</p>
          {info.bio ? <p className="truncate text-sm font-bold text-[var(--muted-ink)]">{info.bio}</p> : null}
        </div>
        <button type="button" onClick={() => setEditing((value) => !value)} className="luxury-btn-secondary ml-auto px-3 py-1 text-xs">
          {editing ? "取消" : "编辑资料"}
        </button>
      </div>

      {info.selfIntroduction ? <p className="mt-3 text-sm font-bold text-[var(--muted-ink)]">{info.selfIntroduction}</p> : null}

      {editing ? (
        <div className="mt-4 space-y-3 rounded-xl border-2 border-[var(--ink)] bg-[var(--paper-2)] p-3">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="昵称" className="luxury-input w-full px-3 py-2 text-sm" />

          {/* Avatar upload */}
          <div>
            <span className="mb-1 block text-xs font-black text-[var(--muted-ink)]">头像</span>
            <div className="flex items-center gap-3">
              {uploading["avatar"] ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-[var(--ink)] bg-[var(--paper)]">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--ink)] border-t-[var(--brand)]" />
                </div>
              ) : avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="头像预览" className="h-10 w-10 rounded-lg border-2 border-[var(--ink)] object-cover shadow-[2px_2px_0_var(--ink)]" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-dashed border-[var(--ink)] bg-[var(--paper)] text-lg font-black text-[var(--ink)]">
                  ?
                </div>
              )}
              <button
                type="button"
                onClick={() => avatarRef.current?.click()}
                disabled={uploading["avatar"]}
                className="luxury-btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
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
                  className="rounded-lg border-2 border-[var(--ink)] bg-[var(--love)] px-2 py-1.5 text-[10px] font-black text-white shadow-[2px_2px_0_var(--ink)] transition hover:-translate-y-0.5"
                >
                  清除
                </button>
              ) : null}
            </div>
            <input
              ref={avatarRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (event) => {
                const files = event.target.files;
                if (!files?.length) return;
                const file = files[0];
                if (file.size > 5 * 1024 * 1024) {
                  setToast({ msg: "图片不能超过 5MB", type: "error" });
                  return;
                }
                const url = await uploadFile(file, "avatar");
                if (url) {
                  setAvatarUrl(url);
                  setToast({ msg: "头像已上传", type: "success" });
                }
              }}
            />
          </div>

          <textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={3} placeholder="一句自我介绍" className="luxury-input w-full px-3 py-2 text-sm" />

          <div className="space-y-2 rounded-xl border-2 border-[var(--ink)] bg-[var(--paper)] p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black text-[var(--ink)]">可选：上传 3 张照片</p>
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={async (event) => {
                const files = Array.from(event.target.files ?? []).slice(0, 3);
                if (files.length === 0) return;

                // Validate sizes
                for (const f of files) {
                  if (f.size > 5 * 1024 * 1024) {
                    setToast({ msg: "图片不能超过 5MB", type: "error" });
                    return;
                  }
                }

                const typeNames = ["photo1", "photo2", "photo3"];
                const urls: (string | null)[] = [];
                for (let i = 0; i < files.length; i++) {
                  const url = await uploadFile(files[i], typeNames[i]);
                  urls.push(url);
                }

                const newSlots = [...photoSlots];
                urls.forEach((url, i) => {
                  if (url) newSlots[i] = url;
                });
                setPhotoSlots(newSlots);

                const uploadedCount = urls.filter(Boolean).length;
                if (uploadedCount > 0) {
                  setToast({ msg: `${uploadedCount} 张照片已上传`, type: "success" });
                }
              }}
            />
            {previewPhotos.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {previewPhotos.slice(0, 3).map((photo, index) => (
                  <div key={index} className="relative h-20 w-full overflow-hidden rounded-lg border-2 border-[var(--ink)] bg-[var(--paper)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo} alt={`photo-${index}`} className="h-full w-full object-cover" />
                    {uploading[`photo${index + 1}`] && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-end">
            <button type="button" onClick={saveProfile} disabled={saving} className="luxury-btn px-3 py-1.5 text-xs disabled:opacity-60">
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
