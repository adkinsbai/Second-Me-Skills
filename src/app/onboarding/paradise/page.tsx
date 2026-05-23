"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

const paradiseProfiles = [
  {
    name: "晴也",
    age: "25",
    vibe: "会把普通周三过成节日的人",
    summary: "喜欢做饭、逛超市、给重要的人建歌单，聊天会认真接住情绪。",
    tags: ["治愈系", "做饭", "小动物"],
    accent: "from-rose-400/35 via-orange-300/20 to-transparent",
  },
  {
    name: "阿棠",
    age: "24",
    vibe: "笑起来像春天刚刚打开的人",
    summary: "周末爱看展和散步，慢热但稳定，一旦熟起来会很有趣。",
    tags: ["看展", "慢热", "稳定表达"],
    accent: "from-amber-300/30 via-yellow-200/20 to-transparent",
  },
  {
    name: "Luna",
    age: "27",
    vibe: "表面温柔，灵魂里藏着一点冒险",
    summary: "会临时决定去海边，也会在深夜发来一句认真关心。",
    tags: ["旅行", "浪漫", "行动力"],
    accent: "from-fuchsia-400/30 via-pink-300/20 to-transparent",
  },
  {
    name: "北屿",
    age: "26",
    vibe: "不吵闹，但你会想一直和他讲话",
    summary: "喜欢电影、桌游和认真吃饭，懂边界感，也会制造小惊喜。",
    tags: ["电影", "边界感", "惊喜感"],
    accent: "from-sky-400/30 via-cyan-200/20 to-transparent",
  },
  {
    name: "Momo",
    age: "23",
    vibe: "像彩色气泡一样，让场子一下亮起来",
    summary: "擅长活跃氛围，但也愿意认真聊价值观和未来想法。",
    tags: ["开朗", "深聊", "生命力"],
    accent: "from-violet-400/30 via-indigo-300/20 to-transparent",
  },
  {
    name: "知夏",
    age: "28",
    vibe: "看起来很酷，熟了以后特别会照顾人",
    summary: "工作认真，生活松弛，喜欢骑车、咖啡和周末往外走。",
    tags: ["骑车", "咖啡", "温柔酷感"],
    accent: "from-emerald-400/28 via-teal-300/18 to-transparent",
  },
];

const promiseTags = [
  "真诚表达的人",
  "愿意慢慢了解彼此的人",
  "会把平常生活过得有趣的人",
  "先让 Agent 帮你过滤无效社交的人",
];

function ParadiseInner() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return") || "/";

  const directHref = returnTo.startsWith("/") ? returnTo : "/";
  const profileHref = "/?updateIntro=1";
  const heartbeatHref = `/settings/heartbeat?return=${encodeURIComponent(directHref)}`;

  return (
    <main className="page-shell overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,164,191,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(129,212,250,0.16),transparent_32%),radial-gradient(circle_at_bottom,rgba(255,220,120,0.16),transparent_26%)]" />
      <div className="absolute -left-20 top-10 h-56 w-56 rounded-full bg-rose-400/20 blur-3xl" />
      <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-sky-400/15 blur-3xl" />
      <div className="absolute bottom-10 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-amber-300/10 blur-3xl" />

      <section className="app-container relative z-10 py-8 sm:py-10">
        <div className="mx-auto max-w-6xl">
          <div className="glass-card overflow-hidden rounded-[32px] border border-white/10 p-6 sm:p-8">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-gray-500">
                Qiubi Paradise
              </span>
              <span className="rounded-full border border-rose-300/20 bg-rose-400/10 px-3 py-1 text-xs text-rose-100/85">
                新用户欢迎页首版
              </span>
            </div>

            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <p className="text-sm uppercase tracking-[0.34em] text-gray-400">欢迎来到丘比的小乐园</p>
                <h1 className="luxury-title mt-3 max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">
                  今天开始，很多温柔又有趣的人，
                  <br />
                  正在等你被好好遇见。
                </h1>
                <p className="luxury-subtitle mt-4 max-w-2xl text-base leading-8 text-amber-100/78">
                  丘比不会把所有人一股脑推给你，而是先了解你、替你过滤，再把真正值得心动的人轻轻带到你面前。
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href={profileHref} className="luxury-btn rounded-full px-6 py-3 text-sm font-semibold">
                    先完善我的资料
                  </Link>
                  <Link href={heartbeatHref} className="luxury-btn-secondary rounded-full px-6 py-3 text-sm font-semibold">
                    去做心动设置
                  </Link>
                  <Link
                    href={directHref}
                    className="rounded-full border border-white/12 bg-white/5 px-6 py-3 text-sm font-semibold text-amber-50/90 transition hover:bg-white/10"
                  >
                    先进去逛逛
                  </Link>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {[
                    { title: "第 1 步", desc: "几道轻问答，让丘比快速了解你的气质与期待。" },
                    { title: "第 2 步", desc: "完善资料和个人信息，让 Agent 更像你本人。" },
                    { title: "第 3 步", desc: "心动设置可稍后再填，不想被打断也能先进入乐园。" },
                  ].map((item) => (
                    <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-gray-500">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="pointer-events-none absolute inset-0 rounded-[30px] bg-gradient-to-br from-white/10 via-transparent to-rose-300/10 blur-2xl" />
                <div className="relative rounded-[30px] border border-white/10 bg-white/5 p-4 sm:p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-gray-400">今日乐园气氛</p>
                      <p className="mt-1 text-xl font-semibold text-gray-900">好多优质的人，正在发光</p>
                    </div>
                    <div className="rounded-full border border-gray-200 bg-amber-200/10 px-3 py-1 text-xs text-gray-600">
                      AI 精选感
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {paradiseProfiles.slice(0, 4).map((profile, index) => (
                      <div
                        key={profile.name}
                        className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[#101522]/80 p-4"
                        style={{
                          transform:
                            index % 2 === 0 ? "translateY(0px) rotate(-1.2deg)" : "translateY(10px) rotate(1.2deg)",
                        }}
                      >
                        <div className={`absolute inset-0 bg-gradient-to-br ${profile.accent}`} />
                        <div className="relative">
                          <div className="flex items-center justify-between">
                            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-white/40 to-white/10 ring-1 ring-white/20" />
                            <span className="text-xs text-gray-400">{profile.age} 岁</span>
                          </div>
                          <p className="mt-4 text-base font-semibold text-gray-900">{profile.name}</p>
                          <p className="mt-1 text-sm text-gray-600">{profile.vibe}</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {profile.tags.map((tag) => (
                              <span key={tag} className="rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[11px] text-amber-50/85">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl border border-rose-200/15 bg-gradient-to-r from-rose-500/10 via-white/5 to-sky-500/10 p-4">
                    <p className="text-sm font-medium text-gray-900">你的感觉应该是：</p>
                    <p className="mt-2 text-sm leading-7 text-gray-600">
                      “这里不是刷人头的地方，而是一个会认真把好的人带给我的心动乐园。”
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-gray-400">你会遇见什么样的人</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {promiseTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-amber-200/15 bg-amber-200/8 px-3 py-1.5 text-sm text-amber-50/90"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-5 rounded-2xl border border-sky-300/15 bg-sky-400/8 p-4">
                  <p className="text-sm font-medium text-sky-100">丘比的筛选逻辑</p>
                  <p className="mt-2 text-sm leading-7 text-amber-100/72">
                    了解你 → Agent 先认识你 → 过滤不合拍的人 → 只把更值得开心的人带来
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {paradiseProfiles.map((profile, index) => (
                  <article
                    key={`${profile.name}-${index}`}
                    className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[#0f1520]/75 p-4"
                    style={{
                      transform:
                        index === 1
                          ? "translateY(12px)"
                          : index === 4
                            ? "translateY(-6px)"
                            : "translateY(0px)",
                    }}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${profile.accent}`} />
                    <div className="relative">
                      <div className="flex items-center justify-between">
                        <div className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] text-amber-50/90">
                          精选气质
                        </div>
                        <div className="text-xs text-gray-400">{profile.age} 岁</div>
                      </div>
                      <h2 className="mt-4 text-lg font-semibold text-gray-900">{profile.name}</h2>
                      <p className="mt-1 text-sm leading-6 text-gray-600">{profile.vibe}</p>
                      <p className="mt-3 text-sm leading-6 text-amber-100/68">{profile.summary}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="mt-8 rounded-[28px] border border-white/10 bg-gradient-to-r from-white/6 via-rose-400/6 to-sky-400/6 p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-400">下一步建议</p>
                  <h2 className="mt-2 text-2xl font-semibold text-gray-900">先让丘比更懂你，再去遇见更多开心</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-amber-100/72">
                    首版界面我先接到了 onboarding 后面。你点“先完善我的资料”会进入资料引导，“去做心动设置”会进入偏好页，“先进去逛逛”则直接回产品首页。
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link href={profileHref} className="luxury-btn rounded-full px-6 py-3 text-sm font-semibold">
                    开始我的心动旅程
                  </Link>
                  <Link href={directHref} className="luxury-btn-secondary rounded-full px-6 py-3 text-sm font-semibold">
                    稍后再完善
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function ParadisePage() {
  return (
    <Suspense
      fallback={
        <main className="page-shell flex items-center justify-center text-sm luxury-subtitle">
          乐园准备中…
        </main>
      }
    >
      <ParadiseInner />
    </Suspense>
  );
}
