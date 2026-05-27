"use client";

import { useState } from "react";
import { IMAGE_DATA_PREFIX } from "@/lib/utils";

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
    <div className="chat-avatar flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-[#FFE500] text-sm font-black text-[var(--ink)] shadow-[3px_3px_0_var(--ink)]">
      {ch}
    </div>
  );
}

function SelfAvatar() {
  return (
    <div className="chat-avatar flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-[#C7FF00] text-sm font-black text-[var(--ink)] shadow-[3px_3px_0_var(--ink)]">
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
      <span className="rounded-full border-2 border-[var(--ink)] bg-[#FFFDF2] px-3 py-1 text-[11px] font-black shadow-[2px_2px_0_var(--ink)]">
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
}: {
  msg: BubbleMsg;
  targetName: string;
  showReadStatus?: boolean;
}) {
  const isSelf = msg.senderType === "user_self";

  return (
    <div
      className={`chat-bubble-row flex items-end gap-2 ${
        isSelf ? "flex-row-reverse" : "flex-row"
      } ${msg.pending ? "opacity-70" : ""}`}
    >
      {isSelf ? <SelfAvatar /> : <Initials name={targetName} />}

      <div className={`flex max-w-[74%] flex-col gap-1 ${isSelf ? "items-end" : "items-start"}`}>
        <div
          className={`chat-bubble relative rounded-2xl border-2 border-[var(--ink)] px-4 py-2.5 text-sm font-semibold leading-relaxed shadow-[4px_4px_0_var(--ink)] ${
            isSelf
              ? "chat-bubble-self rounded-br-sm bg-[#C7FF00] text-[var(--ink)]"
              : "chat-bubble-other rounded-bl-sm bg-[#FFFDF2] text-[var(--ink)]"
          }`}
        >
          {renderContent(msg.content)}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-bold luxury-subtitle">
          {msg.failed && <span className="text-[#FF2D8D]">发送失败</span>}
          {msg.pending && !msg.failed && <span>发送中...</span>}
          {isSelf && !msg.pending && !msg.failed && showReadStatus && (
            <span>{msg.readByOther ? "已读" : "未读"}</span>
          )}
        </div>
      </div>
    </div>
  );
}
