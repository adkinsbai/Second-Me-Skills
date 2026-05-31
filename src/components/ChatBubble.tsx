"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { IMAGE_DATA_PREFIX } from "@/lib/utils";
import {
  ReactionPicker,
  ReactionBadges,
  type ReactionMap,
} from "@/components/MessageReactions";

export type BubbleMsg = {
  id: string;
  senderType: "user_self" | "user_target";
  content: string;
  createdAt: string;
  readByOther?: boolean;
  pending?: boolean;
  failed?: boolean;
  replyToId?: string;
};

/** Position of this bubble within a consecutive group from the same sender. */
export type BubblePosition = "single" | "first" | "middle" | "last";

function Initials({ name }: { name: string }) {
  const ch = name.trim()[0] ?? "Q";
  return (
    <div className="chat-avatar flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-[var(--brand)] text-sm font-black text-[var(--ink)] shadow-[3px_3px_0_var(--ink)]">
      {ch}
    </div>
  );
}

function SelfAvatar() {
  return (
    <div className="chat-avatar flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-[var(--c-gold)] text-sm font-black text-[var(--ink)] shadow-[3px_3px_0_var(--ink)]">
      我
    </div>
  );
}

function ImageContent({ src }: { src: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <img
        src={src}
        alt="聊天图片"
        loading="lazy"
        decoding="async"
        onClick={() => setOpen(true)}
        className="max-h-[220px] max-w-[240px] cursor-pointer rounded-xl border-2 border-[var(--ink)] object-contain shadow-[4px_4px_0_var(--ink)] transition hover:-translate-y-0.5"
      />
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-label="关闭图片预览"
        >
          <img
            src={src}
            alt="图片预览"
            className="max-h-[90vh] max-w-[90vw] rounded-2xl border-2 border-white object-contain shadow-2xl"
          />
        </button>
      )}
    </>
  );
}

function renderContent(content: string) {
  if (content.startsWith(IMAGE_DATA_PREFIX)) {
    return <ImageContent src={content.slice(IMAGE_DATA_PREFIX.length)} />;
  }

  const urlRe = /(https?:\/\/[^\s]+)/g;
  const parts = content.split(urlRe);
  if (parts.length <= 1) {
    return <span className="whitespace-pre-wrap break-words">{content}</span>;
  }

  return (
    <span className="whitespace-pre-wrap break-words">
      {parts.map((part, index) =>
        part.startsWith("http://") || part.startsWith("https://") ? (
          <a
            key={`${part}-${index}`}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="font-black underline underline-offset-2"
          >
            {part}
          </a>
        ) : (
          part
        )
      )}
    </span>
  );
}

export function ChatTimeDivider({ label, subLabel }: { label: string; subLabel?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 py-3">
      {subLabel && (
        <span className="rounded-full border-2 border-[var(--ink)] bg-[var(--brand)] px-3 py-0.5 text-[10px] font-black text-[var(--ink)] shadow-[2px_2px_0_var(--ink)]">
          {subLabel}
        </span>
      )}
      <div className="flex w-full items-center gap-3">
        <div className="h-0.5 flex-1 bg-[var(--ink)]/20" />
        <span className="whitespace-nowrap rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-1 text-[11px] font-black shadow-[2px_2px_0_var(--ink)]">
          {label}
        </span>
        <div className="h-0.5 flex-1 bg-[var(--ink)]/20" />
      </div>
    </div>
  );
}

/** Context menu for long-press / right-click on a message. */
function MessageContextMenu({
  isSelf,
  onReply,
  onCopy,
  onReact,
  onDelete,
  onClose,
}: {
  isSelf: boolean;
  onReply: () => void;
  onCopy: () => void;
  onReact: () => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      };
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const items: Array<{ icon: string; label: string; action: () => void; danger?: boolean }> = [
    { icon: "↩️", label: "回复", action: onReply },
    { icon: "📋", label: "复制", action: onCopy },
    { icon: "😊", label: "回应", action: onReact },
  ];
  if (isSelf && onDelete) {
    items.push({ icon: "🗑️", label: "删除", action: onDelete, danger: true });
  }

  return (
    <div
      ref={menuRef}
      className="absolute z-40 flex gap-1 rounded-2xl border-2 border-[var(--ink)] bg-[var(--paper)] p-1.5 shadow-[4px_4px_0_var(--ink)]"
      style={{ top: -8, right: isSelf ? 0 : "auto", left: isSelf ? "auto" : 0 }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => {
            item.action();
            onClose();
          }}
          className={`flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1.5 text-[10px] font-bold transition hover:bg-[var(--brand)] ${
            item.danger ? "hover:bg-[var(--love)]" : ""
          }`}
          title={item.label}
        >
          <span className="text-base">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Reply preview strip shown inside a bubble. */
function ReplyPreview({ replyMsg }: { replyMsg: BubbleMsg | undefined }) {
  if (!replyMsg) return null;
  const preview = replyMsg.content.startsWith(IMAGE_DATA_PREFIX)
    ? "[图片]"
    : replyMsg.content.length > 60
    ? replyMsg.content.slice(0, 60) + "…"
    : replyMsg.content;
  return (
    <div className="mb-1.5 flex items-start gap-1.5 rounded-lg border-l-2 border-[var(--brand)] bg-[var(--ink)]/5 px-2 py-1">
      <span className="shrink-0 text-[10px] font-bold text-[var(--ink)]/50">
        {replyMsg.senderType === "user_self" ? "你" : "对方"}
      </span>
      <span className="min-w-0 truncate text-[11px] font-semibold text-[var(--ink)]/60">{preview}</span>
    </div>
  );
}

/** Round the bubble corners based on position in group. */
function bubbleRadiusClass(position: BubblePosition, isSelf: boolean): string {
  switch (position) {
    case "single":
      return "rounded-2xl " + (isSelf ? "rounded-br-sm" : "rounded-bl-sm");
    case "first":
      return isSelf
        ? "rounded-2xl rounded-br-md"
        : "rounded-2xl rounded-bl-md";
    case "middle":
      return isSelf
        ? "rounded-2xl rounded-br-md rounded-tr-md"
        : "rounded-2xl rounded-bl-md rounded-tl-md";
    case "last":
      return isSelf
        ? "rounded-2xl rounded-br-sm"
        : "rounded-2xl rounded-bl-sm";
    default:
      return "rounded-2xl";
  }
}

export function ChatBubble({
  msg,
  targetName,
  showReadStatus,
  reactions,
  currentUserId,
  onReact,
  onReply,
  onDelete,
  position = "single",
  replyToMsg,
}: {
  msg: BubbleMsg;
  targetName: string;
  showReadStatus?: boolean;
  reactions?: ReactionMap;
  currentUserId?: string;
  onReact?: (messageId: string, emoji: string) => void;
  onReply?: (msg: BubbleMsg) => void;
  onDelete?: (messageId: string) => void;
  position?: BubblePosition;
  replyToMsg?: BubbleMsg;
}) {
  const isSelf = msg.senderType === "user_self";
  const [showPicker, setShowPicker] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [contextMenu, setContextMenu] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  const showAvatar = position === "single" || position === "first";

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu(true);
  }, []);

  const handlePointerDown = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      setContextMenu(true);
    }, 500);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleCopy = useCallback(() => {
    if (msg.content && !msg.content.startsWith(IMAGE_DATA_PREFIX)) {
      navigator.clipboard.writeText(msg.content).catch(() => {});
    }
  }, [msg.content]);

  return (
    <div
      ref={rowRef}
      className={`chat-bubble-row flex items-end gap-2 ${
        isSelf ? "flex-row-reverse" : "flex-row"
      } ${msg.pending ? "opacity-70" : ""} ${!showAvatar ? (isSelf ? "pr-[46px]" : "pl-[46px]") : ""}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => {
        setHovering(false);
        setShowPicker(false);
      }}
      onContextMenu={handleContextMenu}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ position: "relative" }}
    >
      {/* Avatar — only on first/single in group */}
      {showAvatar &&
        (isSelf ? <SelfAvatar /> : <Initials name={targetName} />)}

      <div className={`flex max-w-[74%] flex-col gap-1 ${isSelf ? "items-end" : "items-start"}`}>
        <div className="relative">
          <div
            className={`chat-bubble relative border-2 border-[var(--ink)] px-4 py-2.5 text-sm font-semibold leading-relaxed shadow-[4px_4px_0_var(--ink)] ${bubbleRadiusClass(
              position,
              isSelf
            )} ${
              isSelf
                ? "chat-bubble-self bg-[var(--c-gold)] text-[var(--ink)]"
                : "chat-bubble-other bg-[var(--paper)] text-[var(--ink)]"
            }`}
          >
            {/* Reply preview inside bubble */}
            {replyToMsg && <ReplyPreview replyMsg={replyToMsg} />}
            {renderContent(msg.content)}
          </div>

          {/* Reaction picker trigger - shown on hover */}
          {hovering && !msg.pending && (
            <button
              type="button"
              onClick={() => setShowPicker((v) => !v)}
              className={`absolute -bottom-2 ${isSelf ? "left-0" : "right-0"} z-20 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] text-xs shadow-[2px_2px_0_var(--ink)] transition hover:bg-[var(--brand)]`}
              aria-label="添加回应"
            >
              😊
            </button>
          )}

          {/* Reaction picker popup */}
          {showPicker && (
            <ReactionPicker
              onSelect={(emoji) => onReact?.(msg.id, emoji)}
              onClose={() => setShowPicker(false)}
            />
          )}

          {/* Context menu (long-press / right-click) */}
          {contextMenu && (
            <MessageContextMenu
              isSelf={isSelf}
              onReply={() => onReply?.(msg)}
              onCopy={handleCopy}
              onReact={() => setShowPicker(true)}
              onDelete={isSelf ? () => onDelete?.(msg.id) : undefined}
              onClose={() => setContextMenu(false)}
            />
          )}
        </div>

        {/* Reaction badges */}
        {reactions && Object.keys(reactions).length > 0 && (
          <ReactionBadges
            reactions={reactions}
            currentUserId={currentUserId}
            onToggle={(emoji) => onReact?.(msg.id, emoji)}
          />
        )}

        {/* Status line — only show for last in group or pending */}
        {(showReadStatus || position === "single" || position === "last") && (
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--ink)]/40">
            {msg.failed && <span className="text-[var(--love)]">发送失败</span>}
            {msg.pending && !msg.failed && <span>发送中...</span>}
            {isSelf && !msg.pending && !msg.failed && showReadStatus && (
              <span>{msg.readByOther ? "已读" : "未读"}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
