import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="page-shell">
      <section className="app-container max-w-2xl space-y-5 py-10">
        <div className="glass-card p-6">
          <p className="poster-kicker">Privacy</p>
          <h1 className="mt-3 text-2xl font-black">隐私与数据说明</h1>
          <div className="mt-5 space-y-4 text-sm font-semibold leading-7 luxury-subtitle">
            <p>
              丘比会收集你在注册、个人资料、问卷、匹配偏好和真人聊天中主动提供的信息，用于生成匹配推荐、
              解释合拍原因、改善产品体验。
            </p>
            <p>
              如果你开启 Agent 学习授权，系统会将部分聊天摘要写入你的个人信息库，用来理解你的沟通风格和关系期待。
              私聊全文不会直接公开给其他用户。
            </p>
            <p>
              你可以在资料或后续设置中撤回 Agent 学习授权，也可以联系运营删除账号数据。当前版本仍处于产品验证阶段，
              不应输入敏感身份证件、银行卡、医疗等高风险信息。
            </p>
          </div>
          <Link href="/onboarding" className="luxury-btn mt-6 inline-flex px-5 py-2.5 text-sm">
            返回引导页
          </Link>
        </div>
      </section>
    </main>
  );
}
