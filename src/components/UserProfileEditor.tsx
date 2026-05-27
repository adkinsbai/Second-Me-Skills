"use client";

import { useEffect, useMemo, useState } from "react";

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
  const [tip, setTip] = useState("");
  const [loading, setLoading] = useState(true);

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
    setTip("");
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
        setTip(data?.message || "保存失败，请稍后再试。");
        return;
      }

      const nextPhotos = [photo1, photo2, photo3].filter((item): item is string => typeof item === "string" && item.trim().length > 0);
      setPhotos(nextPhotos);
      setInfo((prev) => (prev ? { ...prev, name, bio, avatar: avatarUrl, selfIntroduction: bio, photos: nextPhotos } : prev));
      setTip("已保存");
      setEditing(false);
      setSelectedPhotoDataUrls([]);
    } catch {
      setTip("网络异常，请稍后再试。");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-sm font-bold text-[var(--muted-ink)]">加载中...</div>;
  if (!info) return null;

  return (
    <div className="glass-card rounded-2xl p-4">
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
          <input value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="头像 URL（可选）" className="luxury-input w-full px-3 py-2 text-sm" />
          <textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={3} placeholder="一句自我介绍" className="luxury-input w-full px-3 py-2 text-sm" />

          <div className="space-y-2 rounded-xl border-2 border-[var(--ink)] bg-[var(--paper)] p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black text-[var(--ink)]">可选：上传 3 张照片</p>
              <span className="text-[11px] font-bold text-[var(--muted-ink)]">建议每张不超过 200KB</span>
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={async (event) => {
                const files = Array.from(event.target.files ?? []).slice(0, 3);
                if (files.length === 0) return;
                for (const file of files) {
                  if (file.size > 200 * 1024) {
                    alert("图片有点大，请换一张不超过 200KB 的小图。");
                    return;
                  }
                }
                const urls = await Promise.all(
                  files.map(
                    (file) =>
                      new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(String(reader.result));
                        reader.onerror = () => reject(new Error("read file failed"));
                        reader.readAsDataURL(file);
                      })
                  )
                );
                setSelectedPhotoDataUrls(urls);
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

          <div className="flex items-center justify-between">
            <span className={`text-xs font-black ${tip === "已保存" ? "text-[var(--ink)]" : "text-[var(--love)]"}`}>{tip}</span>
            <button type="button" onClick={saveProfile} disabled={saving} className="luxury-btn px-3 py-1.5 text-xs disabled:opacity-60">
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
