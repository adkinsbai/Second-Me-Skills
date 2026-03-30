"use client";

type Props = { open: boolean; onClose: () => void };

export function UpdateIntroModal({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md rounded-2xl p-6 shadow-2xl">
        <h3 className="mb-4 text-lg font-medium text-amber-50">更新 Agent 介绍</h3>
        <p className="mb-4 text-sm text-amber-100/70">请选择一种方式让 Agent 更懂你：</p>
        <div className="space-y-3">
          <a
            href="/?updateIntro=1"
            className="luxury-option block rounded-xl p-3 text-left text-sm hover:border-amber-200/35"
          >
            <p className="font-medium text-amber-50">直接修改已有信息</p>
            <p className="mt-0.5 text-amber-100/55">如果您需要修改已有信息，可直接在聊天框告诉我，我会结合您说的内容更新介绍。</p>
          </a>
          <a
            href="/intro/quiz"
            className="block rounded-xl border border-rose-400/30 bg-rose-950/35 p-3 text-left text-sm transition hover:border-rose-400/50"
          >
            <p className="font-medium text-rose-100">让我更了解你</p>
            <p className="mt-0.5 text-rose-100/70">我会问 4 个新问题，您回答后我会更了解您，并更新 Agent 介绍。</p>
          </a>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="luxury-btn-secondary mt-4 w-full rounded-xl py-2.5 text-sm"
        >
          取消
        </button>
      </div>
    </div>
  );
}
