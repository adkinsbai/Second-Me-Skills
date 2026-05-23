"use client";

type Props = { open: boolean; onClose: () => void };

export function UpdateIntroModal({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 p-4 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md rounded-2xl p-6 shadow-2xl">
        <h3 className="mb-4 text-lg font-medium text-gray-900">更新 Agent 介绍</h3>
        <p className="mb-4 text-sm text-gray-500">请选择一种方式让 Agent 更懂你：</p>
        <div className="space-y-3">
          <a
            href="/profile"
            className="luxury-option block rounded-xl p-3 text-left text-sm hover:border-gray-200"
          >
            <p className="font-medium text-gray-900">编辑个人资料</p>
            <p className="mt-0.5 text-gray-400">前往「个人主页」修改昵称、照片、一句话介绍，让丘比更了解你。</p>
          </a>
          <a
            href="/intro/quiz"
            className="block rounded-xl border border-rose-400/30 bg-rose-950/35 p-3 text-left text-sm transition hover:border-rose-400/50"
          >
            <p className="font-medium text-rose-100">让 Agent 更了解我</p>
            <p className="mt-0.5 text-rose-100/70">回答 4 个问题，丘比 Agent 会据此更新你的介绍，帮你匹配到更合适的人。</p>
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
