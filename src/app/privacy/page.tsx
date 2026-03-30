import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="app-container max-w-2xl space-y-4 py-10 text-sm leading-relaxed text-amber-100/75">
      <h1 className="luxury-title text-xl font-semibold">隐私与数据说明（摘要）</h1>
      <p>
        丘比会收集你在注册、个人资料、问卷、与 Agent/真人聊天中主动提供的信息，用于：生成匹配推荐、展示双方 Agent
        初识对话、改进产品体验。
      </p>
      <p>
        <strong className="text-amber-100/95">Agent 学习：</strong>
        若你开启授权，系统会将你在真人聊天中的部分文本摘要写入你的「主人信息库」，用于理解你的沟通风格；不会向其他用户公开你的私聊全文。
      </p>
      <p>
        <strong className="text-amber-100/95">你的控制：</strong>
        你可随时在资料或后续设置中撤回「Agent 学习」授权；也可联系运营删除账号数据（在能力范围内执行）。
      </p>
      <Link href="/onboarding" className="inline-block text-amber-200 underline underline-offset-2">
        返回引导页
      </Link>
    </main>
  );
}
