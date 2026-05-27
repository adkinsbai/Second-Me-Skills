export type DemoDimensionBlock = {
  summary: string;
  facets: { label: string; observation: string }[];
  bullets: string[];
  caution: string;
  nextStep: string;
};

export type DemoReportShape = {
  interest: DemoDimensionBlock;
  personality: DemoDimensionBlock;
  values: DemoDimensionBlock;
  lifeStory: DemoDimensionBlock;
  future: DemoDimensionBlock;
  executiveBrief?: string;
};

function block(
  summary: string,
  facets: DemoDimensionBlock["facets"],
  bullets: string[],
  caution: string,
  nextStep: string
): DemoDimensionBlock {
  return { summary, facets, bullets, caution, nextStep };
}

export function buildDemoReport(outcome: "success" | "fail"): DemoReportShape {
  if (outcome === "success") {
    return {
      executiveBrief:
        "丘比综合双方资料、偏好和表达线索，判断这段匹配在可聊度、节奏感和关系期待上有较好的起点。下面的报告用于帮助你决定如何开启对话，而不是替你直接下结论。",
      interest: block(
        "你们的兴趣图谱存在可自然展开的话题，不需要停留在寒暄层面。",
        [
          { label: "日常入口", observation: "适合从最近一周的生活、周末安排或城市体验聊起。" },
          { label: "共同活动", observation: "如果双方都愿意，可以很快转化成一次低压力共同体验。" },
          { label: "话题延展", observation: "兴趣不是单点重合，更像能继续追问的线索。" },
        ],
        [
          "开场建议具体一点，例如最近看过的展、听过的歌或去过的地方。",
          "避免一开始就问过大的抽象问题，先用轻量细节建立回应感。",
        ],
        "兴趣相近不等于节奏一致，仍然需要观察对方是否愿意持续回应。",
        "发一个具体问题，让对方可以用 30 秒内轻松回答。"
      ),
      personality: block(
        "你们的沟通风格具备相互接住的可能，适合从轻松交流逐步进入深一点的话题。",
        [
          { label: "表达方式", observation: "双方都不是只适合单向输出的人，存在来回互动空间。" },
          { label: "边界感", observation: "推进关系时需要保留对方节奏，不急着定义。" },
          { label: "冲突风险", observation: "当前没有明显高压冲突信号，但仍需要真实聊天验证。" },
        ],
        [
          "可以主动说明自己的聊天节奏，减少误解。",
          "对方回复慢时先确认状态，不要立刻解读成冷淡。",
        ],
        "慢热和不感兴趣在早期很容易被混淆，需要用多轮互动判断。",
        "约定一个舒服的回复节奏，例如忙时晚点回也可以提前说一声。"
      ),
      values: block(
        "长期价值观没有明显冲突，关系推进可以重点观察承诺、边界和生活优先级。",
        [
          { label: "关系期待", observation: "双方都不是完全随机认识，更希望有质量的连接。" },
          { label: "生活优先级", observation: "需要继续确认工作、自由时间和陪伴之间的排序。" },
          { label: "安全感来源", observation: "稳定表达和一致行动会比甜言蜜语更重要。" },
        ],
        [
          "不要用口号式问题判断三观，最好聊具体情境。",
          "可以分享一个自己在关系里很在意的小原则。",
        ],
        "价值观一致也需要落到细节，否则容易在真实相处中产生落差。",
        "下一轮可以聊：如果工作很忙，你希望对方怎样回应。"
      ),
      lifeStory: block(
        "人生经历目前显示出可互相理解的空间，但还需要更多真实故事来验证共鸣深度。",
        [
          { label: "成长线索", observation: "双方都有可展开的经历，不只是空泛标签。" },
          { label: "情绪记忆", observation: "适合用温和方式交换过去的重要节点。" },
          { label: "支持系统", observation: "可以观察对方如何谈朋友、家庭和独处。" },
        ],
        [
          "不要第一次聊天就追问创伤或前任细节。",
          "可以从一个改变过自己的小事开始分享。",
        ],
        "聊得多不等于了解深，关键是对方是否能尊重你的叙述边界。",
        "尝试互相分享一个最近学到的东西。"
      ),
      future: block(
        "未来节奏有继续对齐的空间，适合先做短周期验证，而不是马上谈很重的承诺。",
        [
          { label: "见面节奏", observation: "可以先从线上稳定互动，再考虑线下轻量见面。" },
          { label: "生活规划", observation: "长期城市、职业和生活方式还需要继续确认。" },
          { label: "推进方式", observation: "适合用小目标观察双方是否愿意投入。" },
        ],
        [
          "把未来问题拆小，例如下个月是否愿意一起做一件事。",
          "不要用一次聊天判断长期可能性，至少观察几次真实互动。",
        ],
        "过早承诺会制造压力，过慢也可能让关系停在礼貌层。",
        "先完成一次低压力共同活动，再复盘彼此感受。"
      ),
    };
  }

  return {
    executiveBrief:
      "丘比暂时没有看到足够稳定的强匹配信号。这不代表完全不适合，但建议先用低压力互动继续验证，不要过快投入。",
    interest: block(
      "兴趣有交集，但深度和频率还不够明确。",
      [
        { label: "共同话题", observation: "可以聊起来，但还缺少特别强的共同活动入口。" },
        { label: "投入程度", observation: "一方可能更主动，另一方需要更多观察时间。" },
      ],
      ["用具体活动代替抽象偏好对表。", "如果连续几轮没有延展，可以礼貌降级为普通朋友。"],
      "不要把一次冷场直接理解为不合适，先看是否有下一轮回应。",
      "发一个低成本话题，观察对方是否愿意继续展开。"
    ),
    personality: block(
      "沟通总体礼貌，但主动推进和需求表达还偏保守。",
      [
        { label: "表达密度", observation: "需要更多具体信息判断是否同频。" },
        { label: "节奏差异", observation: "回复频率和话题深度可能需要校准。" },
      ],
      ["主动说明自己的聊天习惯。", "不要让双方都停在等待对方推进的状态。"],
      "如果长期停留在表层话题，关系容易失去动能。",
      "下一次聊天可以提出一个稍微具体的问题。"
    ),
    values: block(
      "价值观没有明显红线，但关键优先级还没充分暴露。",
      [
        { label: "长期关系", observation: "需要确认双方对推进速度的期待。" },
        { label: "边界与承诺", observation: "还需要更多真实情境判断。" },
      ],
      ["聊一个具体情境，而不是直接问三观。", "观察对方如何处理不同意见。"],
      "价值观讨论最忌一次性摊牌，容易让对方进入防御状态。",
      "选择一个轻量主题，例如金钱、时间或陪伴。"
    ),
    lifeStory: block(
      "人生故事共鸣还在观察期，当前线索不足以判断深层连接。",
      [
        { label: "分享意愿", observation: "可以继续观察对方是否愿意交换真实经历。" },
        { label: "情绪回应", observation: "重点看对方是否能接住你的感受。" },
      ],
      ["从最近的小事聊起。", "尊重对方暂时不想展开的话题。"],
      "不要把对方的克制直接理解为冷淡。",
      "互相分享一个最近让自己变化的瞬间。"
    ),
    future: block(
      "未来节奏还不清晰，不适合过早推到高投入阶段。",
      [
        { label: "见面计划", observation: "可以先保持线上节奏。" },
        { label: "现实变量", observation: "城市、时间和工作强度还需要确认。" },
      ],
      ["先聊 2-3 天再决定是否见面。", "如果对方一直没有投入，可以及时止损。"],
      "长期可能性需要现实安排支撑。",
      "设定一次轻量复盘：继续了解、调整节奏或暂停。"
    ),
  };
}
