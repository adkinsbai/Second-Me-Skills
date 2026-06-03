import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "隐私政策 - 丘比",
  description: "丘比社交平台隐私政策，依据《个人信息保护法》制定",
};

export default function PrivacyPage() {
  return (
    <main className="page-shell min-h-screen px-4 py-12">
      <div className="app-container mx-auto max-w-3xl">
        {/* Header Card */}
        <div className="mb-8 overflow-hidden rounded-3xl border-2 border-[var(--ink)] bg-[var(--paper)] shadow-[8px_8px_0_var(--ink)]">
          <div className="h-3 w-full poster-stripe" />
          <div className="p-6 md:p-10">
            <div className="mb-6 flex items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-1 rounded-full border-2 border-[var(--ink)] bg-[var(--paper-2)] px-3 py-1.5 text-xs font-black text-[var(--ink)] shadow-[2px_2px_0_var(--ink)] transition hover:-translate-y-0.5"
              >
                ← 返回首页
              </Link>
            </div>
            <h1 className="mb-2 text-3xl font-black tracking-tight text-[var(--ink)]">
              🔒 隐私政策
            </h1>
            <p className="text-sm font-bold text-[var(--muted-ink)]">
              丘比（Qiubi）社交平台 · 最后更新：2026年6月
            </p>
          </div>
        </div>

        {/* Content Card */}
        <div className="overflow-hidden rounded-3xl border-2 border-[var(--ink)] bg-[var(--paper)] shadow-[8px_8px_0_var(--ink)]">
          <div className="space-y-8 p-6 md:p-10">
            {/* Introduction */}
            <section>
              <p className="text-sm leading-relaxed text-[var(--ink)]">
                欢迎使用丘比（以下简称&quot;我们&quot;或&quot;本平台&quot;）。我们深知个人信息对您的重要性，并会尽全力保护您的个人信息安全。本隐私政策依据《中华人民共和国个人信息保护法》（PIPL）、《中华人民共和国网络安全法》及相关法律法规制定，旨在向您说明我们如何收集、使用、存储、共享及保护您的个人信息。
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--ink)]">
                请您在使用本平台服务前，仔细阅读并充分理解本政策的全部内容。如您对本政策有任何疑问，可通过本政策末尾的联系方式与我们联系。
              </p>
            </section>

            {/* Section 1 */}
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-[var(--ink)]">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--brand)] text-xs font-black shadow-[2px_2px_0_var(--ink)]">
                  1
                </span>
                信息收集
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-[var(--ink)]">
                <p>在您使用丘比服务的过程中，我们可能收集以下个人信息：</p>
                <div className="rounded-xl border-2 border-[var(--ink)] bg-[var(--paper-2)] p-4">
                  <p className="mb-2 font-black">（一）您主动提供的信息：</p>
                  <ul className="list-disc space-y-1 pl-5">
                    <li><span className="font-bold">注册信息：</span>邮箱地址、昵称、密码（加密存储）</li>
                    <li><span className="font-bold">个人资料：</span>头像、个人简介、兴趣标签、性格测试结果</li>
                    <li><span className="font-bold">社交互动：</span>聊天消息、匹配偏好、点赞、笔记内容</li>
                    <li><span className="font-bold">实名认证信息：</span>如您选择进行实名认证，我们可能收集姓名及身份证号（由第三方认证服务商处理）</li>
                  </ul>
                </div>
                <div className="rounded-xl border-2 border-[var(--ink)] bg-[var(--paper-2)] p-4">
                  <p className="mb-2 font-black">（二）自动收集的信息：</p>
                  <ul className="list-disc space-y-1 pl-5">
                    <li><span className="font-bold">设备信息：</span>设备型号、操作系统、浏览器类型</li>
                    <li><span className="font-bold">日志信息：</span>IP 地址、访问时间、页面浏览记录</li>
                    <li><span className="font-bold">Cookie 及类似技术：</span>详见本政策第六节</li>
                  </ul>
                </div>
                <div className="rounded-xl border-2 border-[var(--ink)] bg-[var(--paper-2)] p-4">
                  <p className="mb-2 font-black">（三）来自第三方的信息：</p>
                  <ul className="list-disc space-y-1 pl-5">
                    <li><span className="font-bold">SecondMe 账号：</span>如您使用 SecondMe 登录，我们获取您的 SecondMe 用户 ID 及公开资料</li>
                  </ul>
                </div>
                <p className="rounded-lg bg-[var(--c-amber)] bg-opacity-20 p-3 text-xs font-bold">
                  ⚠️ 我们遵循&quot;最小必要&quot;原则，仅收集实现服务功能所必需的个人信息。
                </p>
              </div>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-[var(--ink)]">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--brand)] text-xs font-black shadow-[2px_2px_0_var(--ink)]">
                  2
                </span>
                信息使用
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-[var(--ink)]">
                <p>我们收集的个人信息将用于以下目的：</p>
                <ul className="list-disc space-y-2 pl-5">
                  <li><span className="font-bold">提供核心服务：</span>账号注册与登录、用户匹配、即时通讯、AI 交友助手服务</li>
                  <li><span className="font-bold">个性化推荐：</span>基于您的兴趣标签和行为数据，为您推荐更匹配的交友对象</li>
                  <li><span className="font-bold">安全保障：</span>防范欺诈、垃圾信息及其他违规行为，维护平台安全</li>
                  <li><span className="font-bold">服务优化：</span>分析使用数据以改进产品功能和用户体验</li>
                  <li><span className="font-bold">合规义务：</span>遵守法律法规要求，配合监管部门的合法请求</li>
                  <li><span className="font-bold">通知与沟通：</span>向您发送服务更新、安全提醒等必要通知</li>
                </ul>
                <p className="rounded-lg bg-[var(--c-amber)] bg-opacity-20 p-3 text-xs font-bold">
                  ⚠️ 我们不会将您的个人信息用于与上述目的无关的用途。如需变更使用目的，我们将再次征得您的同意。
                </p>
              </div>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-[var(--ink)]">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--brand)] text-xs font-black shadow-[2px_2px_0_var(--ink)]">
                  3
                </span>
                信息共享
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-[var(--ink)]">
                <p>
                  我们非常重视您的个人信息保护，<span className="font-black text-[var(--love)]">不会主动与任何第三方共享您的个人信息</span>，但以下情形除外：
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li><span className="font-bold">获得您的明确同意：</span>在征得您的单独同意后，我们可能会与指定第三方共享特定信息</li>
                  <li><span className="font-bold">法律法规要求：</span>根据法律、法规、法律程序的要求，或政府主管部门的强制性要求</li>
                  <li><span className="font-bold">维护公共利益：</span>为维护丘比及其用户或公众的生命、财产等合法权益</li>
                  <li><span className="font-bold">服务提供商：</span>我们可能委托可信赖的服务商（如云服务、数据分析）处理数据，但会签署严格的保密协议</li>
                </ul>
                <p>
                  我们不会向第三方提供您的个人信息用于商业营销目的。
                </p>
              </div>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-[var(--ink)]">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--brand)] text-xs font-black shadow-[2px_2px_0_var(--ink)]">
                  4
                </span>
                信息存储
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-[var(--ink)]">
                <ul className="list-disc space-y-2 pl-5">
                  <li><span className="font-bold">存储位置：</span>您的个人信息存储于中华人民共和国境内的服务器（Neon PostgreSQL 云数据库）</li>
                  <li><span className="font-bold">传输加密：</span>所有数据传输均采用 TLS/SSL 加密协议</li>
                  <li><span className="font-bold">存储安全：</span>密码经 bcrypt 算法加密存储；敏感信息采用脱敏处理</li>
                  <li><span className="font-bold">保存期限：</span>在您使用服务期间及注销账号后 30 天内保留您的个人信息。超过保存期限后，我们将对您的个人信息进行删除或匿名化处理</li>
                  <li><span className="font-bold">数据跨境：</span>如确需向境外提供个人信息，我们将依法进行安全评估并取得您的单独同意</li>
                </ul>
              </div>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-[var(--ink)]">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--brand)] text-xs font-black shadow-[2px_2px_0_var(--ink)]">
                  5
                </span>
                用户权利
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-[var(--ink)]">
                <p>根据《个人信息保护法》，您享有以下权利：</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border-2 border-[var(--ink)] bg-[var(--paper-2)] p-4">
                    <p className="mb-1 font-black text-[var(--c-blue)]">📋 知情权与决定权</p>
                    <p className="text-xs">您有权了解我们对您个人信息的处理情况，并有权决定是否同意处理</p>
                  </div>
                  <div className="rounded-xl border-2 border-[var(--ink)] bg-[var(--paper-2)] p-4">
                    <p className="mb-1 font-black text-[var(--c-blue)]">👁️ 查看与复制权</p>
                    <p className="text-xs">您可在&quot;个人设置&quot;中查看和导出您的个人数据</p>
                  </div>
                  <div className="rounded-xl border-2 border-[var(--ink)] bg-[var(--paper-2)] p-4">
                    <p className="mb-1 font-black text-[var(--c-blue)]">✏️ 更正与补充权</p>
                    <p className="text-xs">当您的个人信息有误时，您有权要求我们更正或补充</p>
                  </div>
                  <div className="rounded-xl border-2 border-[var(--ink)] bg-[var(--paper-2)] p-4">
                    <p className="mb-1 font-black text-[var(--c-blue)]">🗑️ 删除与注销权</p>
                    <p className="text-xs">您可通过设置页面申请删除个人数据或注销账号</p>
                  </div>
                </div>
                <p>
                  如您需要行使上述权利，请通过应用内的&quot;设置 → 账号与安全&quot;功能操作，或发送邮件至我们的联系邮箱。我们将在 15 个工作日内响应您的请求。
                </p>
              </div>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-[var(--ink)]">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--brand)] text-xs font-black shadow-[2px_2px_0_var(--ink)]">
                  6
                </span>
                Cookie 使用
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-[var(--ink)]">
                <p>我们使用 Cookie 及类似技术来：</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>维持您的登录状态（Session Cookie）</li>
                  <li>记录您的偏好设置（如&quot;记住我&quot;功能）</li>
                  <li>保障服务安全，防范恶意请求</li>
                </ul>
                <p>
                  您可以通过浏览器设置管理或删除 Cookie。但请注意，禁用 Cookie 可能影响您正常使用部分功能。
                </p>
              </div>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-[var(--ink)]">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--brand)] text-xs font-black shadow-[2px_2px_0_var(--ink)]">
                  7
                </span>
                未成年人保护
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-[var(--ink)]">
                <div className="rounded-xl border-2 border-[var(--love)] bg-[var(--love-light)] p-4">
                  <p className="font-black">
                    🚫 丘比平台仅面向 18 周岁及以上的成年人提供服务。
                  </p>
                  <p className="mt-2 text-xs">
                    如果您未满 18 周岁，请不要注册或使用本平台。如果我们发现在未获得可验证的监护人同意的情况下收集了未成年人的个人信息，我们将尽快删除相关数据。
                  </p>
                </div>
                <p>
                  如您是未成年人的监护人，发现我们在未获得您同意的情况下收集了被监护人的个人信息，请立即联系我们，我们将及时予以删除。
                </p>
              </div>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-[var(--ink)]">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--brand)] text-xs font-black shadow-[2px_2px_0_var(--ink)]">
                  8
                </span>
                隐私政策更新
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-[var(--ink)]">
                <p>
                  我们可能会不时修订本隐私政策。当政策发生重大变更时，我们将通过应用内通知、弹窗提示等方式告知您，并在必要时重新征得您的同意。
                </p>
                <p>
                  本隐私政策的最新版本将始终在应用内的&quot;设置 → 隐私政策&quot;页面可供查阅。
                </p>
              </div>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-[var(--ink)]">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--brand)] text-xs font-black shadow-[2px_2px_0_var(--ink)]">
                  9
                </span>
                联系方式
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-[var(--ink)]">
                <p>
                  如您对本隐私政策有任何疑问、意见或建议，或需要行使您的个人信息权利，请通过以下方式联系我们：
                </p>
                <div className="rounded-xl border-2 border-[var(--ink)] bg-[var(--paper-2)] p-4">
                  <ul className="space-y-2">
                    <li>
                      <span className="font-black">📧 邮箱：</span>
                      <a href="mailto:support@qiubi.app" className="font-bold text-[var(--c-blue)] underline underline-offset-2">
                        support@qiubi.app
                      </a>
                    </li>
                    <li>
                      <span className="font-black">📬 通讯地址：</span>丘比运营团队（具体地址待补充）
                    </li>
                  </ul>
                </div>
                <p className="text-xs text-[var(--muted-ink)]">
                  我们将在 15 个工作日内对您的请求予以回复。
                </p>
              </div>
            </section>

            {/* Divider */}
            <div className="border-t-2 border-dashed border-[var(--ink)] pt-6">
              <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
                <p className="font-bold text-[var(--muted-ink)]">
                  请您同时阅读：
                </p>
                <Link
                  href="/terms"
                  className="inline-flex items-center gap-1 rounded-full border-2 border-[var(--ink)] bg-[var(--c-blue)] px-4 py-2 text-xs font-black text-white shadow-[3px_3px_0_var(--ink)] transition hover:-translate-y-0.5"
                >
                  📜 《用户服务协议》
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs font-bold text-[var(--muted-ink)]">
          © 2026 丘比 (Qiubi) · All rights reserved
        </p>
      </div>
    </main>
  );
}
