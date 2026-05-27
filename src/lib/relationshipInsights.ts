export function getActionPlan(totalScore: number): string[] {
  if (totalScore >= 80) {
    return ["发起一次语音聊天", "约一个低压力共同活动", "确认彼此舒服的联系频率"];
  }
  if (totalScore >= 60) {
    return ["深入聊一个价值观话题", "互相分享最近一周的日常", "补充彼此更真实的个人信息"];
  }
  return ["先作为普通朋友轻互动", "如果没有明显共鸣，可以礼貌暂停", "记录不合拍原因，用来优化下一次推荐"];
}

export function getRelationshipProgress(totalScore: number, userChatCount: number) {
  const steps = ["初识", "兴趣相投", "三观对齐", "可语音", "可见面"];
  let current = 0;
  if (totalScore >= 60) current = 1;
  if (totalScore >= 75) current = 2;
  if (userChatCount >= 3) current = 3;
  if (userChatCount >= 8 && totalScore >= 80) current = 4;
  return { steps, current };
}

export function getDateSuggestion(input: {
  interestScore: number;
  lifeStoryScore: number;
  meetPreference?: string | null;
}) {
  if (input.interestScore >= 75 && input.meetPreference !== "online") {
    return "你们的兴趣重合度较高，可以选择咖啡馆、书店或小型展览，控制在 60-90 分钟。";
  }
  if (input.lifeStoryScore >= 75) {
    return "你们的故事共鸣较强，建议先语音 20 分钟，再决定是否线下见面。";
  }
  return "建议先继续线上聊 2-3 天，等节奏稳定后再安排轻量见面。";
}
