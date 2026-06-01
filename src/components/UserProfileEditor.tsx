"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Toast } from "@/components/Toast";
import type { ToastType } from "@/components/Toast";
import { processImage } from "@/lib/image-utils";

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
  const [selectedPhotoDataUrls, setSelectedPhotoDataUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
  const [loading, setLoading] = useState(true);
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
          setPhotos(Array.isArray(result.data.photos) ? result.data.photos : []);
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const previewPhotos = useMemo(() => {
    if (selectedPhotoDataUrls.length > 0) return selectedPhotoDataUrls;
    return photos;
  }, [selectedPhotoDataUrls, photos]);

  const saveProfile = async () => {
    setSaving(true);
    setToast(null);
    try {
      const photo1 = selectedPhotoDataUrls[0] ?? photos[0] ?? null;
      const photo2 = selectedPhotoDataUrls[1] ?? photos[1] ?? null;
      const photo3 = selectedPhotoDataUrls[2] ?? photos[2] ?? null;

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
      setSelectedPhotoDataUrls([]);
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
              {avatarUrl ? (
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
                className="luxury-btn-secondary px-3 py-1.5 text-xs"
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
                const reader = new FileReader();
                reader.onload = async () => {
                  try {
                    const raw = String(reader.result);
                    const compressed = await processImage(raw, { isAvatar: true });
                    setAvatarUrl(compressed);
                    setToast({ msg: "头像已选择，记得保存哦", type: "success" });
                  } catch (err: unknown) {
                    if (err instanceof Error && err.message === "IMAGE_TOO_LARGE") {
                      setToast({ msg: "压缩后头像仍超过 2MB，请选择更小的图片", type: "error" });
                    } else {
                      setToast({ msg: "头像处理失败，请重试", type: "error" });
                    }
                  }
                };
                reader.onerror = () => {
                  setToast({ msg: "头像读取失败，请重试", type: "error" });
                };
                reader.readAsDataURL(file);
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
                try {
                  const urls = await Promise.all(
                    files.map(
                      (file) =>
                        new Promise<string>((resolve, reject) => {
                          const reader = new FileReader();
                          reader.onload = async () => {
                            try {
                              const raw = String(reader.result);
                              const compressed = await processImage(raw, { maxWidth: 1200, quality: 0.8 });
                              resolve(compressed);
                            } catch (err) {
                              reject(err);
                            }
                          };
                          reader.onerror = () => reject(new Error("read file failed"));
                          reader.readAsDataURL(file);
                        })
                    )
                  );
                  setSelectedPhotoDataUrls(urls);
                  setToast({ msg: `${urls.length} 张照片已选择，记得保存哦`, type: "success" });
                } catch (err: unknown) {
                  if (err instanceof Error && err.message === "IMAGE_TOO_LARGE") {
                    setToast({ msg: "压缩后图片仍超过 2MB，请选择更小的图片", type: "error" });
                  } else {
                    setToast({ msg: "图片读取失败，请重试", type: "error" });
                  }
                }
              }}
            />
            {previewPhotos.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {previewPhotos.slice(0, 3).map((photo, index) => (
                  <div key={index} className="h-20 w-full overflow-hidden rounded-lg border-2 border-[var(--ink)] bg-[var(--paper)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo} alt={`photo-${index}`} className="h-full w-full object-cover" />
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
