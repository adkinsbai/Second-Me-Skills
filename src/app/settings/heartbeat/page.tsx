"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";

const MATCH_TYPE_SUGGESTIONS = ["恋爱关系", "灵魂朋友", "游戏搭子", "旅行搭子", "饭搭子", "展览搭子", "深夜聊天", "长期陪伴"];
const ACTIVITY_SUGGESTIONS = ["一起打游戏", "周末看展", "散步聊天", "探店吃饭", "看电影", "一起学习", "城市漫游", "线上语音"];

type Pace = "" | "low" | "medium" | "high";
type MeetPreference = "" | "online" | "hybrid" | "offline";
type EmotionStyle = "" | "direct" | "slow" | "sensitive";

function splitTags(raw: string): string[] {
  return raw
    .split(/[,，、\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function TagInput({
  value,
  onChange,
  input,
  setInput,
  suggestions,
  placeholder,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  input: string;
  setInput: (next: string) => void;
  suggestions: string[];
  placeholder: string;
}) {
  const addItems = (items: string[]) => {
    if (items.length === 0) return;
    const set = new Set(value);
    items.forEach((item) => set.add(item));
    onChange(Array.from(set).slice(0, 20));
    setInput("");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {value.length > 0 ? (
          value.map((tag) => (
            <span key={tag} className="luxury-chip">
              {tag}
              <button type="button" onClick={() => onChange(value.filter((item) => item !== tag))} className="ml-1 font-black" aria-label={`移除 ${tag}`}>
                ×
              </button>
            </span>
          ))
        ) : (
          <span className="text-xs font-bold text-[var(--muted-ink)]">还没有添加标签。</span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addItems(splitTags(input));
            }
          }}
          placeholder={placeholder}
          className="luxury-input flex-1 px-3 py-2.5 text-sm"
        />
        <button type="button" onClick={() => addItems(splitTags(input))} className="luxury-btn-secondary px-4 py-2 text-sm">
          添加
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((tag) => (
          <button key={tag} type="button" onClick={() => addItems([tag])} className="luxury-chip-muted rounded-full px-3 py-1 text-xs font-black">
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function HeartbeatSettingsPage() {
  const router = useRouter();
  const [dailyMatchTime, setDailyMatchTime] = useState("21:00");
  const [expectedGender, setExpectedGender] = useState<"male" | "female" | "any">("any");
  const [ageMin, setAgeMin] = useState<number | "">("");
  const [ageMax, setAgeMax] = useState<number | "">("");
  const [region, setRegion] = useState("");
  const [matchTypes, setMatchTypes] = useState<string[]>([]);
  const [matchTypeInput, setMatchTypeInput] = useState("");
  const [chatPace, setChatPace] = useState<Pace>("");
  const [meetPreference, setMeetPreference] = useState<MeetPreference>("");
  const [emotionStyle, setEmotionStyle] = useState<EmotionStyle>("");
  const [activityTags, setActivityTags] = useState<string[]>([]);
  const [activityInput, setActivityInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    fetch("/api/settings/heartbeat")
      .then((response) => response.json())
      .then((result) => {
        if (result.code === 0 && result.data) {
          const data = result.data;
          setDailyMatchTime(data.dailyMatchTime ?? "21:00");
          setExpectedGender(data.expectedGender ?? "any");
          setAgeMin(data.ageMin != null ? data.ageMin : "");
          setAgeMax(data.ageMax != null ? data.ageMax : "");
          setRegion(data.region ?? "");
          setMatchTypes(Array.isArray(data.matchTypes) ? data.matchTypes : []);
          setChatPace(data.chatPace ?? "");
          setMeetPreference(data.meetPreference ?? "");
          setEmotionStyle(data.emotionStyle ?? "");
          setActivityTags(Array.isArray(data.activityTags) ? data.activityTags : []);
        }
      })
      .catch(() => null)
      .finally(() => setLoaded(true));
  }, []);

  const save = () => {
    setSaving(true);
    setToast(null);
    fetch("/api/settings/heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dailyMatchTime,
        dailyMatchTimezone: "Asia/Shanghai",
        expectedGender,
        ageMin: ageMin === "" ? undefined : ageMin,
        ageMax: ageMax === "" ? undefined : ageMax,
        region: region.trim() || undefined,
        matchTypes,
        chatPace,
        meetPreference,
        emotionStyle,
        activityTags,
      }),
    })
      .then((response) => response.json())
      .then((result) => {
        if (result.code === 0) {
          setToast("success");
          setTimeout(() => router.push("/matches"), 900);
        } else {
          setToast("error");
        }
      })
      .catch(() => setToast("error"))
      .finally(() => setSaving(false));
  };

  if (!loaded) {
    return (
      <main className="page-shell flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--ink)] border-t-[var(--brand)]" />
      </main>
    );
  }

  return (
    <main className="page-shell pb-24">
      <AppHeader backHref="/matches" title="匹配偏好" />
      <div className="app-container max-w-2xl space-y-6 py-8">
        <section className="poster-panel p-5">
          <p className="poster-kicker">Preference Poster</p>
          <h1 className="mt-4 text-4xl font-black leading-10 text-[var(--brand)]">把“合拍”说清楚</h1>
          <p className="mt-3 text-sm font-bold leading-6 text-[var(--paper)]">
            告诉丘比你想遇见怎样的人。这里关注关系类型、相处节奏和真实偏好，让推荐更像一次认真介绍。
          </p>
        </section>

        <section className="glass-card space-y-3 rounded-2xl p-4">
          <h2 className="font-black text-[var(--ink)]">每日推荐时间</h2>
          <p className="text-sm font-bold text-[var(--muted-ink)]">丘比会按这个时间节奏刷新你的每日推荐。</p>
          <input type="time" value={dailyMatchTime} onChange={(event) => setDailyMatchTime(event.target.value || "21:00")} className="luxury-input px-3 py-2 text-sm" />
        </section>

        <section className="glass-card space-y-3 rounded-2xl p-4">
          <h2 className="font-black text-[var(--ink)]">想认识谁</h2>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "any", label: "不限" },
              { value: "male", label: "男性" },
              { value: "female", label: "女性" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setExpectedGender(option.value as "male" | "female" | "any")}
                className={expectedGender === option.value ? "luxury-btn py-2 text-sm" : "luxury-btn-secondary py-2 text-sm"}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <section className="glass-card space-y-3 rounded-2xl p-4">
          <h2 className="font-black text-[var(--ink)]">年龄与地区</h2>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              min={18}
              max={100}
              value={ageMin}
              onChange={(event) => setAgeMin(event.target.value === "" ? "" : Number(event.target.value))}
              placeholder="最小年龄"
              className="luxury-input px-3 py-2.5 text-sm"
            />
            <input
              type="number"
              min={18}
              max={100}
              value={ageMax}
              onChange={(event) => setAgeMax(event.target.value === "" ? "" : Number(event.target.value))}
              placeholder="最大年龄"
              className="luxury-input px-3 py-2.5 text-sm"
            />
          </div>
          <input value={region} onChange={(event) => setRegion(event.target.value)} placeholder="地区，例如：北京、上海、线上不限" className="luxury-input w-full px-3 py-2.5 text-sm" />
        </section>

        <section className="glass-card space-y-3 rounded-2xl p-4">
          <h2 className="font-black text-[var(--ink)]">期待的关系类型</h2>
          <TagInput
            value={matchTypes}
            onChange={setMatchTypes}
            input={matchTypeInput}
            setInput={setMatchTypeInput}
            suggestions={MATCH_TYPE_SUGGESTIONS}
            placeholder="例如：灵魂朋友、旅行搭子、长期关系"
          />
        </section>

        <section className="glass-card space-y-3 rounded-2xl p-4">
          <h2 className="font-black text-[var(--ink)]">相处节奏</h2>
          <div className="space-y-2">
            {[
              { key: "low", label: "低频但稳定", desc: "不刷存在感，聊得舒服就好" },
              { key: "medium", label: "日常小互动", desc: "偶尔分享日常，保持自然联系" },
              { key: "high", label: "高频互动", desc: "希望几乎每天都有交流" },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setChatPace(option.key as Pace)}
                className={`w-full rounded-2xl border-2 border-[var(--ink)] px-4 py-3 text-left transition ${
                  chatPace === option.key ? "bg-[var(--brand)] shadow-[4px_4px_0_var(--ink)]" : "bg-[var(--paper)] hover:bg-[var(--paper-2)]"
                }`}
              >
                <span className="block font-black text-[var(--ink)]">{option.label}</span>
                <span className="mt-1 block text-xs font-bold text-[var(--muted-ink)]">{option.desc}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="glass-card space-y-3 rounded-2xl p-4">
          <h2 className="font-black text-[var(--ink)]">线上/线下偏好</h2>
          <div className="grid gap-2">
            {[
              { key: "online", label: "线上就好" },
              { key: "hybrid", label: "先线上，再看线下" },
              { key: "offline", label: "更偏线下体验" },
            ].map((option) => (
              <button key={option.key} type="button" onClick={() => setMeetPreference(option.key as MeetPreference)} className={meetPreference === option.key ? "luxury-btn py-2 text-sm" : "luxury-btn-secondary py-2 text-sm"}>
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <section className="glass-card space-y-3 rounded-2xl p-4">
          <h2 className="font-black text-[var(--ink)]">情绪表达风格</h2>
          <div className="grid gap-2">
            {[
              { key: "direct", label: "直接表达" },
              { key: "slow", label: "慢热观察" },
              { key: "sensitive", label: "敏感细腻" },
            ].map((option) => (
              <button key={option.key} type="button" onClick={() => setEmotionStyle(option.key as EmotionStyle)} className={emotionStyle === option.key ? "luxury-btn py-2 text-sm" : "luxury-btn-secondary py-2 text-sm"}>
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <section className="glass-card space-y-3 rounded-2xl p-4">
          <h2 className="font-black text-[var(--ink)]">想一起做的事</h2>
          <TagInput
            value={activityTags}
            onChange={setActivityTags}
            input={activityInput}
            setInput={setActivityInput}
            suggestions={ACTIVITY_SUGGESTIONS}
            placeholder="例如：一起打游戏、周末看展、散步聊天"
          />
        </section>

        {toast === "success" ? <div className="luxury-alert luxury-alert-success text-center">保存成功，正在返回主页。</div> : null}
        {toast === "error" ? <div className="luxury-alert luxury-alert-error text-center">保存失败，请稍后再试。</div> : null}

        <button type="button" onClick={save} disabled={saving} className="luxury-btn w-full py-3 text-sm disabled:opacity-50">
          {saving ? "保存中..." : "保存匹配偏好"}
        </button>
      </div>
    </main>
  );
}
