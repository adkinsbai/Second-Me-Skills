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
      .then((r) => r.json())
      .then((res) => {
        if (res?.code === 0 && res?.data) {
          setInfo(res.data as UserInfo);
          setName(res.data.name ?? "");
          setBio(res.data.bio ?? "");
          setAvatarUrl(res.data.avatar ?? "");
          setPhotos(Array.isArray(res.data.photos) ? res.data.photos : []);
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
        setTip(data?.message || "保存失败，请稍后重试");
        return;
      }

      const nextPhotos = [photo1, photo2, photo3].filter(
        (x): x is string => typeof x === "string" && x.trim().length > 0
      );
      setPhotos(nextPhotos);
      setInfo((prev) =>
        prev
          ? {
              ...prev,
              name,
              bio,
              avatar: avatarUrl,
              selfIntroduction: bio,
              photos: nextPhotos,
            }
          : prev
      );

      setTip("已保存");
      setEditing(false);
      setSelectedPhotoDataUrls([]);
    } catch {
      setTip("网络异常，请稍后重试");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-sm text-gray-500">加载中...</div>;
  if (!info) return null;

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center gap-3">
        {info.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={info.avatar} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-gray-200" />
        ) : null}
        <div>
          <p className="font-medium text-gray-900">{info.name ?? "未设置昵称"}</p>
          {info.bio ? <p className="text-sm text-gray-400">{info.bio}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="luxury-btn-secondary ml-auto rounded-xl px-3 py-1 text-xs"
        >
          {editing ? "取消" : "编辑资料"}
        </button>
      </div>

      {info.selfIntroduction ? (
        <p className="mt-3 text-sm text-gray-600">{info.selfIntroduction}</p>
      ) : null}

      {editing ? (
        <div className="mt-4 space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="昵称"
            className="luxury-input w-full rounded-xl px-3 py-2 text-sm"
          />
          <input
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="头像 URL（可选）"
            className="luxury-input w-full rounded-xl px-3 py-2 text-sm"
          />
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="一句自我介绍"
            className="luxury-input w-full rounded-xl px-3 py-2 text-sm"
          />

          <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-100 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-gray-700">可选：上传 3 张照片</p>
              <span className="text-[11px] text-gray-400">建议小图（不超过 200KB/张）</span>
            </div>

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length === 0) return;

                const selected = files.slice(0, 3);
                const MAX_BYTES = 200 * 1024;
                for (const f of selected) {
                  if (f.size > MAX_BYTES) {
                    alert("图片有点大啦，请换一张不超过 200KB 的小图");
                    return;
                  }
                }

                const urls = await Promise.all(
                  selected.map(
                    (f) =>
                      new Promise<string>((resolve, reject) => {
                        const r = new FileReader();
                        r.onload = () => resolve(String(r.result));
                        r.onerror = () => reject(new Error("read file failed"));
                        r.readAsDataURL(f);
                      })
                  )
                );
                setSelectedPhotoDataUrls(urls);
              }}
            />

            {!!previewPhotos.length ? (
              <div className="grid grid-cols-3 gap-2">
                {previewPhotos.slice(0, 3).map((p, idx) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <div key={idx} className="h-20 w-full overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-200">
                    <img src={p} alt={`photo-${idx}`} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between">
            <span className={`text-xs ${tip === "已保存" ? "text-emerald-300" : "text-rose-300"}`}>
              {tip}
            </span>
            <button
              type="button"
              onClick={saveProfile}
              disabled={saving}
              className="luxury-btn rounded-xl px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

