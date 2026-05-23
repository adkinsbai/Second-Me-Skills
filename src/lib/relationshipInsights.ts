export function getActionPlan(totalScore: number): string[] {
  if (totalScore >= 80) {
    return ["发起一次语音聊天", "约一次线上共同活动（看剧/听歌/游戏）", "沟通是否交换联系方式"];
  }
  if (totalScore >= 60) {
    return ["深入聊一个价值观话题", "互相分享近一周日常", "补充彼此更真实的个人信息"];
  }
  return ["先作为普通朋友轻互动", "如无明显共鸣可礼貌跳过", "查看不匹配原因，用于优化下次筛选"];
}

export function getRelationshipProgress(totalScore: number, userChatCount: number) {
  const steps = ["初识", "兴趣相投", "三观契合", "可语音", "可线下"];
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
    return "你们兴趣重合度高，推荐咖啡馆/书店轻见面：停留 60-90 分钟即可。";
  }
  if (input.lifeStoryScore >= 75) {
    return "你们故事共鸣较强，建议先语音 20 分钟，再决定是否线下见面。";
  }
  return "建议先继续线上聊 2-3 天，等节奏稳定后再约轻量见面。";
}

