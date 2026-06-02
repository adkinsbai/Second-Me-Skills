import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "用户服务协议 - 丘比",
  description: "丘比社交平台用户服务协议",
};

export default function TermsPage() {
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
              📜 用户服务协议
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
                欢迎使用丘比（Qiubi）社交平台（以下简称"本平台"）。在使用我们的服务之前，请您仔细阅读并充分理解本《用户服务协议》（以下简称"本协议"）。您注册、登录或使用本平台即视为您已阅读并同意接受本协议的全部条款。
              </p>
            </section>

            {/* Section 1 */}
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-[var(--ink)]">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--c-pink)] text-xs font-black text-white shadow-[2px_2px_0_var(--ink)]">
                  1
                </span>
                服务说明
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-[var(--ink)]">
                <p>
                  丘比是一款基于 AI 技术的社交交友平台，为用户提供以下核心服务：
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li><span className="font-bold">智能匹配：</span>基于用户兴趣标签、性格测试等维度，为用户推荐契合度高的交友对象</li>
                  <li><span className="font-bold">即时通讯：</span>为匹配用户提供安全的文字聊天功能</li>
                  <li><span className="font-bold">AI 交友助手：</span>通过 SecondMe AI Agent 技术，辅助用户进行社交互动</li>
                  <li><span className="font-bold">个人空间：</span>支持用户创建个人资料、发布笔记、记录社交历程</li>
                </ul>
                <p>
                  本平台有权根据业务发展情况调整服务内容，并将通过应用内公告等方式提前通知用户。
                </p>
              </div>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-[var(--ink)]">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--c-pink)] text-xs font-black text-white shadow-[2px_2px_0_var(--ink)]">
                  2
                </span>
                用户资格
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-[var(--ink)]">
                <div className="rounded-xl border-2 border-[var(--love)] bg-[var(--love-light)] p-4">
                  <p className="font-black">
                    🚫 本平台仅面向年满 18 周岁的成年人提供服务。
                  </p>
                </div>
                <p>使用本平台，您需满足以下条件：</p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>您已年满 18 周岁，具有完全民事行为能力</li>
                  <li>您提供的注册信息真实、准确、完整</li>
                  <li>您未被本平台暂停或终止服务</li>
                  <li>您使用本平台不违反所在地区的法律法规</li>
                </ul>
                <p>
                  如您提供虚假信息或冒用他人身份，本平台有权暂停或终止您的账号，并保留追究法律责任的权利。
                </p>
              </div>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-[var(--ink)]">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--c-pink)] text-xs font-black text-white shadow-[2px_2px_0_var(--ink)]">
                  3
                </span>
                用户行为规范
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-[var(--ink)]">
                <p>
                  您在使用本平台时，应遵守法律法规和公序良俗，不得从事以下行为：
                </p>
                <div className="rounded-xl border-2 border-[var(--ink)] bg-[var(--paper-2)] p-4">
                  <p className="mb-2 font-black text-[var(--love)]">🚫 严格禁止的行为：</p>
                  <ul className="list-disc space-y-1 pl-5 text-xs">
                    <li><span className="font-bold">骚扰与欺凌：</span>发送骚扰信息、威胁、恐吓、跟踪其他用户</li>
                    <li><span className="font-bold">色情内容：</span>发布、传播淫秽、色情或性暗示内容</li>
                    <li><span className="font-bold">诈骗行为：</span>以交友为名实施诈骗、传销或非法集资</li>
                    <li><span className="font-bold">虚假信息：</span>冒充他人身份、编造虚假个人资料</li>
                    <li><span className="font-bold">违法信息：</span>发布违反国家法律法规的信息，包括但不限于危害国家安全、破坏社会稳定的内容</li>
                    <li><span className="font-bold">商业滥用：</span>利用平台进行未经授权的商业推广、广告营销</li>
                    <li><span className="font-bold">技术滥用：</span>使用自动化工具（机器人、爬虫）访问或干扰平台服务</li>
                    <li><span className="font-bold">侵犯隐私：</span>未经同意收集、存储或公开其他用户的个人信息</li>
                  </ul>
                </div>
                <p>
                  如您违反上述规范，本平台有权视情节轻重采取警告、限制功能、暂停账号或永久封禁等措施，且不予退还任何已支付的费用。构成违法犯罪的，我们将依法向有关部门报告。
                </p>
              </div>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-[var(--ink)]">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--c-pink)] text-xs font-black text-white shadow-[2px_2px_0_var(--ink)]">
                  4
                </span>
                内容责任
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-[var(--ink)]">
                <ul className="list-disc space-y-2 pl-5">
                  <li><span className="font-bold">用户内容：</span>您在本平台发布的内容（文字、图片、笔记等）由您自行承担责任。您保证对发布内容拥有合法权利，不侵犯任何第三方的合法权益</li>
                  <li><span className="font-bold">内容审核：</span>本平台有权对用户发布的内容进行审核，对违反法律法规或本协议的内容进行删除、屏蔽或限制访问</li>
                  <li><span className="font-bold">举报机制：</span>如您发现违规内容或行为，可通过应用内举报功能向我们反馈，我们将在 24 小时内处理</li>
                  <li><span className="font-bold">AI 生成内容：</span>本平台 AI 助手生成的内容仅供参考，不构成专业建议。AI 生成内容的责任由平台承担，但用户应自行判断其适用性</li>
                </ul>
              </div>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-[var(--ink)]">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--c-pink)] text-xs font-black text-white shadow-[2px_2px_0_var(--ink)]">
                  5
                </span>
                知识产权
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-[var(--ink)]">
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <span className="font-bold">平台权利：</span>本平台的软件、技术、界面设计、Logo、商标等知识产权归丘比运营方所有。未经书面许可，任何人不得复制、修改、发布、出售或以其他方式利用
                  </li>
                  <li>
                    <span className="font-bold">用户内容权利：</span>您在本平台发布的原创内容，其知识产权仍归您所有。但您同意授予本平台在提供服务范围内免费使用、展示、传播该内容的非独占性许可
                  </li>
                  <li>
                    <span className="font-bold">侵权处理：</span>如您认为平台上的内容侵犯了您的知识产权，请发送通知至 support@qiubi.app，我们将在核实后及时处理
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-[var(--ink)]">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--c-pink)] text-xs font-black text-white shadow-[2px_2px_0_var(--ink)]">
                  6
                </span>
                免责声明
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-[var(--ink)]">
                <ul className="list-disc space-y-2 pl-5">
                  <li><span className="font-bold">服务中断：</span>因不可抗力（包括但不限于自然灾害、政策变化、网络故障等）导致的服务中断，本平台不承担责任，但将尽快恢复服务</li>
                  <li><span className="font-bold">用户间纠纷：</span>用户之间因线下交往产生的纠纷，由当事人自行解决。本平台不对用户在线下发生的行为承担法律责任</li>
                  <li><span className="font-bold">第三方链接：</span>本平台可能包含第三方网站或服务的链接，我们对第三方内容不承担审查义务和担保责任</li>
                  <li><span className="font-bold">AI 准确性：</span>AI 助手提供的匹配建议和社交辅助基于算法分析，不保证完全准确，用户应自行判断和决策</li>
                  <li><span className="font-bold">账号安全：</span>因用户自身原因（如密码泄露、设备丢失）导致的账号安全问题，本平台在已尽合理安全义务的前提下不承担责任</li>
                </ul>
              </div>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-[var(--ink)]">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--c-pink)] text-xs font-black text-white shadow-[2px_2px_0_var(--ink)]">
                  7
                </span>
                协议修改
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-[var(--ink)]">
                <p>
                  本平台有权根据业务发展和法律法规变化对本协议进行修改。协议修改后，我们将通过以下方式通知用户：
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>在应用内发布弹窗通知或公告</li>
                  <li>向您注册邮箱发送变更通知</li>
                </ul>
                <p>
                  如您在协议修改后继续使用本平台，即视为您接受修改后的协议。如您不同意修改后的协议，请停止使用本平台并申请注销账号。
                </p>
              </div>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-[var(--ink)]">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--c-pink)] text-xs font-black text-white shadow-[2px_2px_0_var(--ink)]">
                  8
                </span>
                争议解决
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-[var(--ink)]">
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <span className="font-bold">适用法律：</span>本协议的签订、履行和解释均适用<span className="font-black">中华人民共和国法律</span>（不包括冲突法规则）
                  </li>
                  <li>
                    <span className="font-bold">协商解决：</span>因本协议产生的争议，双方应首先通过友好协商解决
                  </li>
                  <li>
                    <span className="font-bold">管辖法院：</span>如协商不成，任何一方均有权向本平台运营方所在地有管辖权的人民法院提起诉讼
                  </li>
                  <li>
                    <span className="font-bold">条款独立性：</span>如本协议中的任何条款被认定为无效或不可执行，该条款应在可执行的最大范围内予以执行，其余条款继续有效
                  </li>
                </ul>
                <div className="rounded-xl border-2 border-[var(--ink)] bg-[var(--paper-2)] p-4">
                  <p className="text-xs">
                    <span className="font-black">📧 联系邮箱：</span>
                    <a href="mailto:support@qiubi.app" className="font-bold text-[var(--c-blue)] underline underline-offset-2">
                      support@qiubi.app
                    </a>
                  </p>
                </div>
              </div>
            </section>

            {/* Divider */}
            <div className="border-t-2 border-dashed border-[var(--ink)] pt-6">
              <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
                <p className="font-bold text-[var(--muted-ink)]">
                  请您同时阅读：
                </p>
                <Link
                  href="/privacy"
                  className="inline-flex items-center gap-1 rounded-full border-2 border-[var(--ink)] bg-[var(--brand)] px-4 py-2 text-xs font-black text-[var(--ink)] shadow-[3px_3px_0_var(--ink)] transition hover:-translate-y-0.5"
                >
                  🔒 《隐私政策》
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
