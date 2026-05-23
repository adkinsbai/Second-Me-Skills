"use client";

import { useEffect, useMemo, useState } from "react";
import type { PointerEvent } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";

type DiscoveryCard = {
  id: string;
  name: string | null;
  age: number | null;
  bio: string | null;
  avatarUrl: string | null;
  photos: string[];
  region: string;
  distanceKm: number | null;
  distanceLabel: string;
  tags: string[];
  story: string;
};

type DragState = { startX: number; currentX: number; active: boolean };

const SWIPE_THRESHOLD = 95;

export default function DiscoverPage() {
  const router = useRouter();
  const [cards, setCards] = useState<DiscoveryCard[]>([]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [drag, setDrag] = useState<DragState>({ startX: 0, currentX: 0, active: false });
  const [matched, setMatched] = useState<{ matchId: string; name: string | null } | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  const current = cards[0] ?? null;
  const dragX = drag.active ? drag.currentX - drag.startX : 0;
  const rotate = Math.max(-12, Math.min(12, dragX / 18));

  const photos = useMemo(() => {
    if (!current) return [];
    return current.photos.length > 0 ? current.photos : current.avatarUrl ? [current.avatarUrl] : [];
  }, [current]);
  const activePhoto = photos[photoIndex % Math.max(1, photos.length)] ?? "";

  useEffect(() => { setImgFailed(false); }, [current?.id, photoIndex, activePhoto]);

  const loadCards = async () => {
    setLoading(true); setMessage("");
    try {
      const res = await fetch("/api/discovery/cards", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (data.code === 0) { setCards(data.data?.cards ?? []); setPhotoIndex(0); }
      else setMessage(data.message || "暂时无法加载附近的人");
    } catch { setMessage("网络异常，请稍后重试"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadCards();
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetch("/api/user/location", {
            method: "POST", credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          }).catch(() => {});
        },
        () => {},
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 30 * 60 * 1000 }
      );
    }
  }, []);

  const removeTopCard = () => {
    setCards((prev) => prev.slice(1));
    setPhotoIndex(0);
    setDrag({ startX: 0, currentX: 0, active: false });
  };

  const swipe = async (action: "like" | "unlike") => {
    if (!current || busy) return;
    setBusy(true); setMessage("");
    try {
      const res = await fetch("/api/discovery/swipe", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: current.id, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.code !== 0) { setMessage(data.message || "操作失败，请重试"); return; }
      if (data.data?.mutualMatch && data.data?.matchId) {
        setMatched({ matchId: data.data.matchId, name: current.name });
      }
      removeTopCard();
    } catch { setMessage("网络异常，请稍后重试"); }
    finally { setBusy(false); }
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!current || busy) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ startX: e.clientX, currentX: e.clientX, active: true });
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.active) return;
    setDrag((prev) => ({ ...prev, currentX: e.clientX }));
  };
  const onPointerUp = () => {
    if (!drag.active) return;
    if (dragX > SWIPE_THRESHOLD) void swipe("like");
    else if (dragX < -SWIPE_THRESHOLD) void swipe("unlike");
    else setDrag({ startX: 0, currentX: 0, active: false });
  };

  const nextPhoto = () => {
    if (photos.length <= 1) return;
    setPhotoIndex((prev) => (prev + 1) % photos.length);
  };

  return (
    <main className="page-shell">
      <AppHeader backHref="/matches" title="翻牌发现" />

      <div className="app-container flex min-h-[calc(100vh-3.75rem)] flex-col items-center py-6">
        {/* 说明文字 */}
        <div className="mb-5 w-full max-w-sm text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Qiubi Discover</p>
          <h1 className="mt-1.5 text-xl font-bold text-gray-900">在附近的人里，翻到故事的开头</h1>
          <p className="mt-1 text-sm text-gray-400">左滑错过，右滑喜欢；互相心动就直接聊天</p>
        </div>

        {loading ? (
          <div className="flex h-64 w-full max-w-sm flex-col items-center justify-center gap-3 rounded-3xl border border-[var(--border)] bg-white shadow-sm">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[var(--brand)]" />
            <p className="text-sm text-gray-400">正在洗牌…</p>
          </div>
        ) : current ? (
          <div className="w-full max-w-sm">
            {/* 卡片 */}
            <div
              className="relative touch-none overflow-hidden rounded-[2rem] border-2 border-[var(--ink)] bg-[#FFFDF2] shadow-[10px_10px_0_var(--ink)] transition-transform"
              style={{ transform: `translateX(${dragX}px) rotate(${rotate}deg)` }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {/* 照片区 */}
              <div className="relative h-[420px] cursor-pointer overflow-hidden bg-gradient-to-br from-[var(--c-amber)] via-[var(--love)] to-[var(--c-blue)]" onClick={nextPhoto}>
                {activePhoto && !imgFailed ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`${current.id}-${photoIndex}`}
                    src={activePhoto}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                    draggable={false}
                    onError={() => setImgFailed(true)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-8xl font-bold text-gray-300">
                    {current.name?.[0] ?? "?"}
                  </div>
                )}

                {/* 进度条 */}
                <div className="absolute inset-x-0 top-0 flex gap-1.5 p-3">
                  {(photos.length ? photos : ["p"]).map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1 flex-1 rounded-full ${idx === photoIndex % Math.max(1, photos.length) ? "bg-white" : "bg-white/40"}`}
                    />
                  ))}
                </div>

                {/* 姓名 + 距离叠层 */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-5 pt-16">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-bold text-white">
                        {current.name ?? "未设置昵称"}
                        {current.age ? <span className="ml-2 text-lg font-normal text-white/80">{current.age}</span> : null}
                      </h2>
                      <p className="mt-0.5 text-sm text-white/70">{current.distanceLabel}</p>
                    </div>
                    {photos.length > 1 && (
                      <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
                        点击切图
                      </span>
                    )}
                  </div>
                </div>

                {/* Swipe 标签 */}
                {dragX > 35 && (
                  <div className="absolute left-5 top-12 rotate-[-16deg] rounded-xl border-4 border-[var(--brand)] px-4 py-1.5 text-xl font-black text-[var(--brand)] drop-shadow-lg">
                    LIKE 💚
                  </div>
                )}
                {dragX < -35 && (
                  <div className="absolute right-5 top-12 rotate-[16deg] rounded-xl border-4 border-[var(--love)] px-4 py-1.5 text-xl font-black text-[var(--love)] drop-shadow-lg">
                    PASS ✕
                  </div>
                )}
              </div>

              {/* 文字区 */}
              <div className="space-y-2.5 p-4">
                {current.bio && (
                  <p className="line-clamp-2 text-sm leading-6 text-gray-600">{current.bio}</p>
                )}
                {current.story && (
                  <p className="line-clamp-3 text-sm leading-6 text-gray-500">{current.story}</p>
                )}
                {current.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {current.tags.slice(0, 5).map((tag) => (
                      <span key={tag} className="rounded-full bg-[var(--brand-light)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--brand-text)]">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="mt-5 flex items-center justify-center gap-5">
              <button
                type="button"
                onClick={() => swipe("unlike")}
                disabled={busy}
                className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[var(--ink)] bg-[var(--paper)] text-2xl text-[var(--love)] shadow-[5px_5px_0_var(--ink)] transition hover:bg-[var(--love)] hover:text-white disabled:opacity-50"
              >
                ✕
              </button>
              <button
                type="button"
                onClick={() => swipe("like")}
                disabled={busy}
                className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[var(--ink)] bg-[var(--brand)] text-2xl text-[var(--ink)] shadow-[5px_5px_0_var(--ink)] transition hover:bg-[var(--c-amber)] disabled:opacity-50"
              >
                ♥
              </button>
            </div>
          </div>
        ) : (
          <div className="glass-card flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl p-10 text-center">
            <div className="text-5xl">🃏</div>
            <p className="text-base font-bold text-gray-900">今天暂时翻完了</p>
            <p className="text-sm leading-6 text-gray-400">丘比不会强塞不合适的人。晚点回来，或先完善资料与心动设置。</p>
            <button
              type="button"
              onClick={loadCards}
              className="luxury-btn mt-1 px-6 py-2.5 text-sm"
            >
              重新洗牌
            </button>
          </div>
        )}

        {message && (
          <div className="glass-card mt-4 w-full max-w-sm rounded-2xl px-4 py-3 text-sm">
            {message}
          </div>
        )}
      </div>

      {/* 互相心动弹窗 */}
      {matched && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5 backdrop-blur-sm">
          <div className="glass-card w-full max-w-sm rounded-3xl p-7 text-center">
            <div className="mb-4 text-5xl">💚</div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--brand)]">Mutual Like</p>
            <h2 className="mt-2 text-2xl font-bold text-gray-900">你们互相心动了</h2>
            <p className="mt-3 text-sm leading-7 text-gray-500">
              {matched.name ?? "TA"} 也向右滑了你。丘比已经把这次双向选择变成一个真正的聊天入口。
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => router.push(`/matches/${matched.matchId}`)}
                className="luxury-btn flex-1 py-2.5 text-sm"
              >
                去聊聊
              </button>
              <button
                type="button"
                onClick={() => setMatched(null)}
                className="luxury-btn-secondary flex-1 py-2.5 text-sm"
              >
                继续翻
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
