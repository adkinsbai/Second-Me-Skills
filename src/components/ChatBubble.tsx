"use client";

import { useState } from "react";
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
};

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

export function ChatTimeDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="h-0.5 flex-1 bg-[var(--ink)]/20" />
      <span className="rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-1 text-[11px] font-black shadow-[2px_2px_0_var(--ink)]">
        {label}
      </span>
      <div className="h-0.5 flex-1 bg-[var(--ink)]/20" />
    </div>
  );
}

export function ChatBubble({
  msg,
  targetName,
  showReadStatus,
  reactions,
  currentUserId,
  onReact,
}: {
  msg: BubbleMsg;
  targetName: string;
  showReadStatus?: boolean;
  reactions?: ReactionMap;
  currentUserId?: string;
  onReact?: (messageId: string, emoji: string) => void;
}) {
  const isSelf = msg.senderType === "user_self";
  const [showPicker, setShowPicker] = useState(false);
  const [hovering, setHovering] = useState(false);

  return (
    <div
      className={`chat-bubble-row flex items-end gap-2 ${
        isSelf ? "flex-row-reverse" : "flex-row"
      } ${msg.pending ? "opacity-70" : ""}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => {
        setHovering(false);
        setShowPicker(false);
      }}
    >
      {isSelf ? <SelfAvatar /> : <Initials name={targetName} />}

      <div className={`flex max-w-[74%] flex-col gap-1 ${isSelf ? "items-end" : "items-start"}`}>
        <div className="relative">
          <div
            className={`chat-bubble relative rounded-2xl border-2 border-[var(--ink)] px-4 py-2.5 text-sm font-semibold leading-relaxed shadow-[4px_4px_0_var(--ink)] ${
              isSelf
                ? "chat-bubble-self rounded-br-sm bg-[var(--c-gold)] text-[var(--ink)]"
                : "chat-bubble-other rounded-bl-sm bg-[var(--paper)] text-[var(--ink)]"
            }`}
          >
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
        </div>

        {/* Reaction badges */}
        {reactions && Object.keys(reactions).length > 0 && (
          <ReactionBadges
            reactions={reactions}
            currentUserId={currentUserId}
            onToggle={(emoji) => onReact?.(msg.id, emoji)}
          />
        )}

        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--ink)]/40">
          {msg.failed && <span className="text-[var(--love)]">发送失败</span>}
          {msg.pending && !msg.failed && <span>发送中...</span>}
          {isSelf && !msg.pending && !msg.failed && showReadStatus && (
            <span>{msg.readByOther ? "已读" : "未读"}</span>
          )}
        </div>
      </div>
    </div>
  );
}
