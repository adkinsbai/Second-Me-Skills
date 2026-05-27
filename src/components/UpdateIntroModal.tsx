"use client";

type Props = { open: boolean; onClose: () => void };

export function UpdateIntroModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md rounded-2xl p-6 shadow-2xl">
        <p className="poster-kicker text-[var(--muted-ink)]">Profile Agent</p>
        <h3 className="mt-2 text-2xl font-black text-[var(--ink)]">让丘比更懂你</h3>
        <p className="mt-3 text-sm font-bold leading-6 text-[var(--muted-ink)]">
          现在的 Agent 主要负责理解你的资料和偏好。完善资料后，匹配理由和推荐会更具体。
        </p>
        <div className="mt-5 space-y-3">
          <a href="/profile" className="luxury-option block rounded-xl p-4 text-left text-sm">
            <p className="font-black text-[var(--ink)]">编辑个人资料</p>
            <p className="mt-1 text-[var(--muted-ink)]">修改昵称、照片和一句话介绍。</p>
          </a>
          <a href="/intro/quiz" className="luxury-option block rounded-xl p-4 text-left text-sm">
            <p className="font-black text-[var(--ink)]">回答几个问题</p>
            <p className="mt-1 text-[var(--muted-ink)]">补充关系偏好、表达方式和相处节奏。</p>
          </a>
        </div>
        <button type="button" onClick={onClose} className="luxury-btn-secondary mt-5 w-full py-2.5 text-sm">
          关闭
        </button>
      </div>
    </div>
  );
}
