"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

const paradiseProfiles = [
  {
    name: "晴也",
    age: "25",
    vibe: "把普通周三过成小节日的人",
    summary: "喜欢做饭、逛超市、给重要的人建歌单，聊天时会认真接住情绪。",
    tags: ["治愈系", "做饭", "小动物"],
    accent: "bg-[#C7FF00]",
  },
  {
    name: "阿棠",
    age: "24",
    vibe: "笑起来像春天刚刚打开",
    summary: "周末喜欢看展和散步，慢热但稳定，熟悉之后会很有趣。",
    tags: ["看展", "慢热", "稳定表达"],
    accent: "bg-[#FFE500]",
  },
  {
    name: "Luna",
    age: "27",
    vibe: "温柔外壳里藏着一点冒险",
    summary: "会临时决定去海边，也会在深夜发来一句认真的关心。",
    tags: ["旅行", "浪漫", "行动力"],
    accent: "bg-[#FF2D8D] text-white",
  },
  {
    name: "北屿",
    age: "26",
    vibe: "不吵闹，但会让人想一直聊下去",
    summary: "喜欢电影、桌游和认真吃饭，懂边界感，也会制造小惊喜。",
    tags: ["电影", "边界感", "惊喜感"],
    accent: "bg-[#174BFF] text-white",
  },
  {
    name: "Momo",
    age: "23",
    vibe: "像彩色气泡，让场子一下亮起来",
    summary: "擅长活跃气氛，也愿意认真聊价值观和未来想法。",
    tags: ["开朗", "深聊", "生命力"],
    accent: "bg-[#FFFDF2]",
  },
  {
    name: "知夏",
    age: "28",
    vibe: "看起来很酷，熟了以后很会照顾人",
    summary: "工作认真，生活松弛，喜欢骑车、咖啡和周末往外走。",
    tags: ["骑车", "咖啡", "温柔酷感"],
    accent: "bg-[#FF4B1F] text-white",
  },
];

const promiseTags = [
  "真实表达的人",
  "愿意慢慢了解彼此的人",
  "把平常生活过得有趣的人",
  "先由 Agent 帮你过滤无效社交的人",
];

function ParadiseInner() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return") || "/";
  const directHref = returnTo.startsWith("/") ? returnTo : "/";
  const profileHref = "/?updateIntro=1";
  const preferenceHref = `/settings/heartbeat?return=${encodeURIComponent(directHref)}`;

  return (
    <main className="page-shell overflow-hidden">
      <section className="app-container relative z-10 max-w-6xl py-8 sm:py-10">
        <div className="poster-panel overflow-hidden">
          <div className="poster-stripe h-5 border-b-2 border-[var(--paper)]" />
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div>
              <p className="poster-kicker">Qiubi Paradise</p>
              <h1 className="mt-5 max-w-2xl text-4xl font-black leading-tight text-[var(--paper)] sm:text-6xl">
                先让丘比懂你，再把值得认识的人带到你面前。
              </h1>
              <p className="mt-5 max-w-2xl text-base font-semibold leading-8 text-[rgba(247,242,232,.78)]">
                这里不是刷人头的广场。丘比会结合你的资料、问卷、沟通风格和偏好，优先推荐更合拍的人。
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link href={profileHref} className="luxury-btn px-6 py-3 text-sm">
                  完善我的资料
                </Link>
                <Link href={preferenceHref} className="luxury-btn-secondary px-6 py-3 text-sm">
                  设置匹配偏好
                </Link>
                <Link
                  href={directHref}
                  className="rounded-2xl border-2 border-[var(--paper)] bg-[#FF2D8D] px-6 py-3 text-sm font-black text-white shadow-[5px_5px_0_#F7F2E8] transition hover:-translate-y-0.5"
                >
                  先进去看看
                </Link>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  { title: "第一步", desc: "通过几道问题，让丘比快速理解你的气质和期待。" },
                  { title: "第二步", desc: "完善资料和个人介绍，让 Agent 更像真正认识你。" },
                  { title: "第三步", desc: "匹配偏好可以稍后再填，不影响先进入产品体验。" },
                ].map((item) => (
                  <div key={item.title} className="rounded-2xl border-2 border-[var(--paper)] bg-[#FFFDF2] p-4 text-[var(--ink)] shadow-[4px_4px_0_#F7F2E8]">
                    <p className="text-sm font-black">{item.title}</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-black/62">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {paradiseProfiles.slice(0, 4).map((profile, index) => (
                <article
                  key={profile.name}
                  className={`rounded-[1.4rem] border-2 border-[var(--paper)] p-4 shadow-[5px_5px_0_#F7F2E8] ${profile.accent}`}
                  style={{ transform: index % 2 === 0 ? "rotate(-1.5deg)" : "translateY(12px) rotate(1.5deg)" }}
                >
                  <div className="flex items-center justify-between">
                    <div className="h-12 w-12 rounded-2xl border-2 border-current bg-white/35" />
                    <span className="text-xs font-black">{profile.age} 岁</span>
                  </div>
                  <h2 className="mt-4 text-xl font-black">{profile.name}</h2>
                  <p className="mt-2 text-sm font-semibold leading-6">{profile.vibe}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {profile.tags.map((tag) => (
                      <span key={tag} className="rounded-full border-2 border-current bg-white/28 px-2.5 py-1 text-[11px] font-black">
                        {tag}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="glass-card p-5">
            <p className="poster-kicker">Promise</p>
            <h2 className="mt-3 text-2xl font-black">你会遇见什么样的人</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {promiseTags.map((tag) => (
                <span key={tag} className="luxury-chip">
                  {tag}
                </span>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border-2 border-[var(--ink)] bg-[#174BFF] p-4 text-white shadow-[4px_4px_0_var(--ink)]">
              <p className="text-sm font-black">丘比的推荐逻辑</p>
              <p className="mt-2 text-sm font-semibold leading-7">
                了解你，生成个人画像，过滤明显不合拍的人，再推荐更值得开启对话的人。
              </p>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paradiseProfiles.map((profile, index) => (
              <article
                key={`${profile.name}-${index}`}
                className={`rounded-[1.4rem] border-2 border-[var(--ink)] p-4 shadow-[5px_5px_0_var(--ink)] ${profile.accent}`}
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full border-2 border-current bg-white/28 px-2.5 py-1 text-[11px] font-black">
                    精选气质
                  </span>
                  <span className="text-xs font-black">{profile.age} 岁</span>
                </div>
                <h2 className="mt-4 text-lg font-black">{profile.name}</h2>
                <p className="mt-2 text-sm font-semibold leading-6">{profile.vibe}</p>
                <p className="mt-3 text-sm font-semibold leading-6 opacity-80">{profile.summary}</p>
              </article>
            ))}
          </section>
        </div>

        <section className="glass-card mt-8 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="poster-kicker">Next</p>
              <h2 className="mt-3 text-2xl font-black">建议先完善资料，再开始推荐。</h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-7 luxury-subtitle">
                资料越真实，丘比越能判断谁值得被推到你面前。偏好设置会直接影响推荐范围和解释质量。
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={profileHref} className="luxury-btn px-6 py-3 text-sm">
                开始完善
              </Link>
              <Link href={directHref} className="luxury-btn-secondary px-6 py-3 text-sm">
                稍后再说
              </Link>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

export default function ParadisePage() {
  return (
    <Suspense
      fallback={
        <main className="page-shell flex items-center justify-center text-sm font-black">
          乐园准备中...
        </main>
      }
    >
      <ParadiseInner />
    </Suspense>
  );
}
