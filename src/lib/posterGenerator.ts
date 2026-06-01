/**
 * Generate a shareable AI portrait poster as an HTML string.
 * This is designed to be rendered in an iframe or converted to an image.
 */

type PosterData = {
  name: string;
  personality: {
    relationshipGoal: string;
    communicationPace: string;
    talkStyle: string;
    valuePriority: { career: number; family: number; freedom: number; growth: number } | null;
    topicPref: { life: number; emotion: number; work: number; entertainment: number } | null;
    qualityFlags: string[];
  };
  preferences: {
    expectedGender: string | null;
    ageRange: string | null;
    region: string | null;
    matchTypes: string | null;
    chatPace: string | null;
    meetPreference: string | null;
    emotionStyle: string | null;
  };
  idealPartner: {
    likedTraits: { tag: string; count: number }[];
    unlikedTraits: { tag: string; count: number }[];
  };
  matchCount: number;
  inviteCode: string;
};

function parseJsonArray(val: string | null): string[] {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) return parsed.map(String);
    return [];
  } catch {
    return val.split(",").map((s) => s.trim()).filter(Boolean);
  }
}

function goalEmoji(goal: string): string {
  if (goal.includes("结婚")) return "💍";
  if (goal.includes("恋爱")) return "💕";
  if (goal.includes("灵魂")) return "✨";
  if (goal.includes("陪伴")) return "🤝";
  return "❓";
}

export function generatePortraitPoster(data: PosterData): string {
  const { name, personality, preferences, idealPartner, matchCount, inviteCode } = data;

  const matchTypesArr = parseJsonArray(preferences.matchTypes);

  const genderLabel: Record<string, string> = { male: "男生", female: "女生", any: "不限" };
  const meetLabel: Record<string, string> = { online: "线上为主", offline: "线下见面", hybrid: "线上线下都行" };

  const valueItems = personality.valuePriority
    ? [
        { label: "事业", value: personality.valuePriority.career, color: "#C7FF00" },
        { label: "家庭", value: personality.valuePriority.family, color: "#FF2D8D" },
        { label: "自由", value: personality.valuePriority.freedom, color: "#174BFF" },
        { label: "成长", value: personality.valuePriority.growth, color: "#8B5CFF" },
      ]
    : [];

  const maxValue = Math.max(...valueItems.map((v) => v.value), 1);

  const topTraits = idealPartner.likedTraits.slice(0, 6);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&display=swap');
  body {
    font-family: 'Noto Sans SC', system-ui, sans-serif;
    background: #101014;
    width: 390px;
    min-height: 680px;
    color: #F7F2E8;
    overflow: hidden;
  }
  .poster {
    width: 390px;
    min-height: 680px;
    background: linear-gradient(160deg, #101014 0%, #1a1225 40%, #0d1b3e 100%);
    padding: 28px 24px 20px;
    position: relative;
    overflow: hidden;
  }
  .poster::before {
    content: '';
    position: absolute;
    top: -60px;
    right: -60px;
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(199,255,0,0.15) 0%, transparent 70%);
    border-radius: 50%;
  }
  .poster::after {
    content: '';
    position: absolute;
    bottom: -40px;
    left: -40px;
    width: 160px;
    height: 160px;
    background: radial-gradient(circle, rgba(255,45,141,0.12) 0%, transparent 70%);
    border-radius: 50%;
  }
  .header {
    text-align: center;
    margin-bottom: 24px;
    position: relative;
    z-index: 1;
  }
  .badge {
    display: inline-block;
    background: #C7FF00;
    color: #101014;
    font-size: 10px;
    font-weight: 900;
    padding: 3px 12px;
    border-radius: 999px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .name {
    font-size: 28px;
    font-weight: 900;
    color: #C7FF00;
    margin-top: 10px;
    text-shadow: 2px 2px 0 rgba(0,0,0,0.5);
  }
  .subtitle {
    font-size: 12px;
    color: rgba(247,242,232,0.6);
    margin-top: 4px;
    font-weight: 700;
  }
  .section {
    margin-bottom: 18px;
    position: relative;
    z-index: 1;
  }
  .section-title {
    font-size: 13px;
    font-weight: 900;
    color: #C7FF00;
    margin-bottom: 10px;
    letter-spacing: 0.5px;
  }
  .trait-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .trait-card {
    background: rgba(255,255,255,0.06);
    border: 2px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 10px 12px;
  }
  .trait-label {
    font-size: 9px;
    color: rgba(247,242,232,0.5);
    font-weight: 700;
  }
  .trait-value {
    font-size: 14px;
    font-weight: 900;
    color: #F7F2E8;
    margin-top: 2px;
  }
  .bar-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }
  .bar-label {
    font-size: 11px;
    font-weight: 700;
    width: 36px;
    color: rgba(247,242,232,0.8);
  }
  .bar-track {
    flex: 1;
    height: 10px;
    background: rgba(255,255,255,0.08);
    border-radius: 999px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.1);
  }
  .bar-fill {
    height: 100%;
    border-radius: 999px;
    transition: width 0.5s;
  }
  .bar-val {
    font-size: 10px;
    font-weight: 900;
    width: 20px;
    text-align: right;
    color: rgba(247,242,232,0.6);
  }
  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .tag {
    display: inline-block;
    background: #C7FF00;
    color: #101014;
    font-size: 11px;
    font-weight: 900;
    padding: 4px 12px;
    border-radius: 999px;
    border: 2px solid #101014;
  }
  .tag-outline {
    background: transparent;
    color: #F7F2E8;
    border: 2px solid rgba(247,242,232,0.3);
  }
  .stat-row {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin-top: 12px;
  }
  .stat-item {
    text-align: center;
  }
  .stat-num {
    font-size: 24px;
    font-weight: 900;
    color: #C7FF00;
  }
  .stat-label {
    font-size: 10px;
    color: rgba(247,242,232,0.5);
    font-weight: 700;
  }
  .footer {
    text-align: center;
    padding-top: 16px;
    border-top: 2px solid rgba(255,255,255,0.08);
    position: relative;
    z-index: 1;
  }
  .brand {
    font-size: 18px;
    font-weight: 900;
    color: #C7FF00;
  }
  .brand-sub {
    font-size: 10px;
    color: rgba(247,242,232,0.4);
    font-weight: 700;
    margin-top: 2px;
  }
  .invite-box {
    margin-top: 10px;
    background: rgba(199,255,0,0.1);
    border: 2px solid rgba(199,255,0,0.3);
    border-radius: 12px;
    padding: 8px 16px;
    display: inline-block;
  }
  .invite-code {
    font-size: 20px;
    font-weight: 900;
    color: #C7FF00;
    letter-spacing: 3px;
  }
  .invite-hint {
    font-size: 9px;
    color: rgba(247,242,232,0.5);
    margin-top: 2px;
  }
  .stripe {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: repeating-linear-gradient(90deg, #C7FF00 0px, #C7FF00 8px, #FF2D8D 8px, #FF2D8D 16px, #174BFF 16px, #174BFF 24px);
  }
</style>
</head>
<body>
<div class="poster">
  <div class="stripe"></div>

  <div class="header">
    <div class="badge">AI PORTRAIT</div>
    <div class="name">${name || "丘比用户"}</div>
    <div class="subtitle">${goalEmoji(personality.relationshipGoal)} ${personality.relationshipGoal} · ${personality.communicationPace} · ${personality.talkStyle}</div>
  </div>

  <div class="section">
    <div class="section-title">🪞 我是什么样的人</div>
    <div class="trait-grid">
      <div class="trait-card">
        <div class="trait-label">关系目标</div>
        <div class="trait-value">${goalEmoji(personality.relationshipGoal)} ${personality.relationshipGoal}</div>
      </div>
      <div class="trait-card">
        <div class="trait-label">沟通节奏</div>
        <div class="trait-value">${personality.communicationPace}</div>
      </div>
      <div class="trait-card">
        <div class="trait-label">表达风格</div>
        <div class="trait-value">${personality.talkStyle}</div>
      </div>
      <div class="trait-card">
        <div class="trait-label">见面偏好</div>
        <div class="trait-value">${meetLabel[preferences.meetPreference ?? "hybrid"] ?? "线上线下都行"}</div>
      </div>
    </div>
  </div>

  ${
    valueItems.length > 0
      ? `<div class="section">
    <div class="section-title">⚖️ 价值取向</div>
    ${valueItems
      .map(
        (v) => `
    <div class="bar-row">
      <span class="bar-label">${v.label}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(v.value / maxValue) * 100}%;background:${v.color}"></div></div>
      <span class="bar-val">${v.value}</span>
    </div>`
      )
      .join("")}
  </div>`
      : ""
  }

  ${
    topTraits.length > 0
      ? `<div class="section">
    <div class="section-title">💘 我喜欢的特质</div>
    <div class="tags">
      ${topTraits.map((t) => `<span class="tag">${t.tag}${t.count > 1 ? ` ×${t.count}` : ""}</span>`).join("")}
    </div>
  </div>`
      : ""
  }

  ${
    matchTypesArr.length > 0
      ? `<div class="section">
    <div class="section-title">🎯 我在寻找</div>
    <div class="tags">
      ${matchTypesArr.map((t) => `<span class="tag tag-outline">${t}</span>`).join("")}
    </div>
  </div>`
      : ""
  }

  <div class="section">
    <div class="stat-row">
      <div class="stat-item">
        <div class="stat-num">${matchCount}</div>
        <div class="stat-label">匹配数</div>
      </div>
      <div class="stat-item">
        <div class="stat-num">${topTraits.length}</div>
        <div class="stat-label">偏好特质</div>
      </div>
      <div class="stat-item">
        <div class="stat-num">${valueItems.length > 0 ? Math.round(valueItems.reduce((s, v) => s + v.value, 0) / valueItems.length) : "-"}</div>
        <div class="stat-label">平均价值分</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <div class="brand">丘比 QIUBI</div>
    <div class="brand-sub">AI帮你找对象 · 懂你所爱</div>
    <div class="invite-box">
      <div class="invite-code">${inviteCode}</div>
      <div class="invite-hint">输入邀请码，获得 3 天 VIP</div>
    </div>
  </div>
</div>
</body>
</html>`;
}
