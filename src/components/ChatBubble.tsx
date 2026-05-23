"use client";

import { useState } from "react";

export type BubbleMsg = {
  id: string;
  senderType: "user_self" | "user_target";
  content: string;
  createdAt: string;
  readByOther?: boolean;
  /** optimistic: true while message hasn't been confirmed by server */
  pending?: boolean;
  /** failed: send failed */
  failed?: boolean;
};

function Initials({ name }: { name: string }) {
  const ch = name.trim()[0] ?? "?";
  return (
    <div className="chat-avatar flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-violet-500 text-sm font-bold text-white shadow">
      {ch}
    </div>
  );
}

function SelfAvatar() {
  return (
    <div className="chat-avatar flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-sm font-bold text-white shadow">
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
        alt="图片"
        loading="lazy"
        decoding="async"
        onClick={() => setOpen(true)}
        className="max-h-[200px] max-w-[240px] cursor-pointer rounded-xl object-contain shadow transition hover:opacity-90 active:scale-95"
      />
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <img
            src={src}
            alt="大图"
            className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </>
  );
}

function renderContent(content: string) {
  if (content.startsWith("IMAGE_DATA:")) {
    return <ImageContent src={content.slice("IMAGE_DATA:".length)} />;
  }
  // Simple URL linkification
  const urlRe = /(https?:\/\/[^\s]+)/g;
  const parts = content.split(urlRe);
  if (parts.length > 1) {
    return (
      <span>
        {parts.map((p, i) =>
          urlRe.test(p) ? (
            <a
              key={i}
              href={p}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 opacity-80 hover:opacity-100"
            >
              {p}
            </a>
          ) : (
            p
          )
        )}
      </span>
    );
  }
  return <span className="whitespace-pre-wrap break-words">{content}</span>;
}

export function ChatTimeDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-px flex-1 bg-white/10" />
      <span className="text-[11px] text-gray-300">{label}</span>
      <div className="h-px flex-1 bg-white/10" />
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

      <div
        className={`flex max-w-[72%] flex-col gap-1 ${isSelf ? "items-end" : "items-start"}`}
      >
        <div
          className={`chat-bubble relative rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
            isSelf
              ? "chat-bubble-self rounded-br-sm bg-gradient-to-br from-rose-500/80 to-rose-600/70 text-rose-50 ring-1 ring-rose-400/30"
              : "chat-bubble-other rounded-bl-sm border border-white/10 bg-white/8 text-gray-900 backdrop-blur-md"
          }`}
        >
          {renderContent(msg.content)}
        </div>

        <div className="flex items-center gap-1.5">
          {msg.failed && (
            <span className="text-[11px] font-medium text-red-400">发送失败</span>
          )}
          {msg.pending && !msg.failed && (
            <span className="text-[11px] text-gray-300">发送中…</span>
          )}
          {isSelf && !msg.pending && !msg.failed && showReadStatus && (
            msg.readByOther ? (
              <span className="text-[11px] text-emerald-400/90">已读</span>
            ) : (
              <span className="text-[11px] text-amber-100/35">未读</span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
