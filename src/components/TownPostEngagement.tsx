"use client";

import { useCallback, useEffect, useState } from "react";
import { EmojiMartPopover } from "@/components/EmojiMartPopover";

type Author = { id: string; name: string | null; avatarUrl: string | null };
export type CommentRow = { id: string; content: string; createdAt: string; author: Author };

type Props = {
  postId: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  /** 小镇「探索」页偏浅色底时用 light，帖子卡片内用 dark */
  emojiTheme?: "light" | "dark" | "auto";
};

export function TownPostEngagement({
  postId,
  likeCount: initialLikeCount,
  commentCount: initialCommentCount,
  likedByMe: initialLiked,
  emojiTheme = "dark",
}: Props) {
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [liked, setLiked] = useState(initialLiked);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);

  useEffect(() => {
    setLikeCount(initialLikeCount);
    setLiked(initialLiked);
    setCommentCount(initialCommentCount);
  }, [postId, initialLikeCount, initialLiked, initialCommentCount]);

  const loadComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const r = await fetch(`/api/town/posts/${postId}/comments`, { credentials: "include" });
      const d = await r.json().catch(() => null);
      if (d?.code === 0 && Array.isArray(d.data?.comments)) setComments(d.data.comments as CommentRow[]);
    } finally {
      setLoadingComments(false);
    }
  }, [postId]);

  const toggleComments = () => {
    setCommentsOpen((o) => {
      const next = !o;
      if (next && comments.length === 0) void loadComments();
      return next;
    });
  };

  const toggleLike = async () => {
    if (likeBusy) return;
    setLikeBusy(true);
    try {
      const r = await fetch(`/api/town/posts/${postId}/like`, { method: "POST", credentials: "include" });
      const d = await r.json().catch(() => null);
      if (d?.code === 0) {
        setLiked(!!d.data?.liked);
        setLikeCount(Number(d.data?.likeCount ?? 0));
      }
    } finally {
      setLikeBusy(false);
    }
  };

  const submitComment = async () => {
    const text = draft.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    try {
      const r = await fetch(`/api/town/posts/${postId}/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      const d = await r.json().catch(() => null);
      if (d?.code === 0 && d.data?.comment) {
        setComments((prev) => [...prev, d.data.comment as CommentRow]);
        setCommentCount(Number(d.data.commentCount ?? commentCount + 1));
        setDraft("");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void toggleLike()}
          disabled={likeBusy}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
            liked
              ? "border-rose-400/50 bg-rose-500/20 text-rose-100"
              : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-200"
          }`}
        >
          <span aria-hidden>{liked ? "♥" : "♡"}</span>
          点赞 {likeCount}
        </button>
        <button
          type="button"
          onClick={toggleComments}
          className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-gray-200"
        >
          💬 评论 {commentCount}
        </button>
      </div>

      {commentsOpen ? (
        <div className="mt-3 space-y-3">
          {loadingComments ? <p className="text-xs text-gray-400">加载评论…</p> : null}
          <ul className="max-h-52 space-y-2 overflow-y-auto pr-1">
            {comments.length === 0 && !loadingComments ? (
              <li className="text-xs text-gray-400">还没有评论，做第一个吧～</li>
            ) : null}
            {comments.map((c) => (
              <li key={c.id} className="rounded-xl border border-white/5 bg-gray-50 px-3 py-2 text-sm">
                <span className="font-medium text-gray-700">{c.author.name ?? "用户"}</span>
                <span className="text-gray-300"> · </span>
                <span className="whitespace-pre-wrap break-words text-gray-600">{c.content}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="说点什么… 可点「表情」插入 emoji"
              maxLength={500}
              rows={3}
              className="luxury-input min-h-[72px] flex-1 resize-y rounded-xl px-3 py-2 text-sm"
            />
            <div className="flex shrink-0 gap-2">
              <EmojiMartPopover theme={emojiTheme} onEmojiSelect={(s) => setDraft((d) => (d + s).slice(0, 500))} />
              <button
                type="button"
                onClick={() => void submitComment()}
                disabled={submitting || !draft.trim()}
                className="luxury-btn rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-50"
              >
                {submitting ? "发送中…" : "发送"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
