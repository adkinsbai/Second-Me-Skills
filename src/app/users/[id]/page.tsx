"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";

type UserProfileInfo = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string;
  photos: string[];
};

export default function UserPublicPage() {
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<UserProfileInfo | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/users/${id}/info`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.code === 0) setInfo(d.data as UserProfileInfo);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <main className="page-shell app-container py-10">
        <p className="text-sm text-gray-500">加载中…</p>
      </main>
    );
  }

  if (!info) {
    return (
      <main className="page-shell app-container py-10">
        <p className="text-sm text-gray-500">无法获取对方主页</p>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <AppHeader backHref="/matches" title="对方主页" />
      <div className="app-container max-w-3xl space-y-5 py-8">
        <section className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-full bg-gradient-to-br from-amber-400/20 to-sky-400/15 ring-1 ring-gray-200">
              {info.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={info.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl text-[var(--brand-text)]/50">
                  {info.name?.[0] ?? "?"}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold text-gray-900">{info.name ?? "未设置昵称"}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-500">{info.bio || "—"}</p>
            </div>
          </div>
        </section>

        {!!info.photos.length && (
          <section className="glass-card rounded-2xl p-5">
            <p className="mb-3 text-sm font-semibold text-gray-700">TA 的照片（可选）</p>
            <div className="grid grid-cols-3 gap-2">
              {info.photos.slice(0, 3).map((p, idx) => (
                <div key={idx} className="h-28 overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p} alt={`photo-${idx}`} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

