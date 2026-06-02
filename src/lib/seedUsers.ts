import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

// ─── Helper utilities ───────────────────────────────────────────────────────

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function randomDateWithinDays(daysAgo: number): Date {
  const now = Date.now();
  const offset = randomInt(0, daysAgo * 24 * 60 * 60 * 1000);
  return new Date(now - offset);
}

/** Generate a DiceBear avatar URL for a given seed string + style */
function avatarUrl(seed: string, style: string = "notionists"): string {
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}

/** Generate 2-3 photo URLs using different DiceBear styles */
function generatePhotos(name: string, index: number): string[] {
  const styles = ["notionists", "adventurer", "fun-emoji", "lorelei", "avataaars", "big-smile"];
  // Use different seeds per photo to get variety
  return [
    avatarUrl(`${name}-${index}-1`, styles[index % styles.length]),
    avatarUrl(`${name}-${index}-2`, styles[(index + 1) % styles.length]),
    avatarUrl(`${name}-${index}-3`, styles[(index + 2) % styles.length]),
  ];
}

// ─── Name pools ─────────────────────────────────────────────────────────────

const SURNAMES = [
  "王", "李", "张", "刘", "陈", "杨", "黄", "赵", "周", "吴",
  "徐", "孙", "胡", "朱", "高", "林", "何", "郭", "马", "罗",
  "梁", "宋", "郑", "谢", "韩", "唐", "冯", "于", "董", "萧",
  "程", "曹", "袁", "邓", "许", "傅", "沈", "曾", "彭", "吕",
  "苏", "卢", "蒋", "蔡", "贾", "丁", "魏", "薛", "叶", "阎",
];

const FEMALE_GIVEN_NAMES = [
  "小雨", "甜甜", "思思", "晓晓", "佳佳", "静静", "婷婷", "瑶瑶",
  "欣欣", "萌萌", "小雅", "诗涵", "雨萱", "紫萱", "语嫣", "若曦",
  "梦琪", "雅静", "心怡", "晓婷", "嘉怡", "思颖", "美玲", "丽华",
  "小芳", "秀英", "春梅", "翠花", "素芬", "玉兰", "雅琴", "慧敏",
  "晓彤", "雨晴", "梦瑶", "佳琪", "诗琪", "芷若", "可馨", "子涵",
  "安琪", "乐萱", "沛玲", "漫妮", "灵芸", "倩雪", "香怡", "玉珍",
  "茹雪", "正梅", "美琳", "心琪", "雨嘉", "娅楠", "明美", "可馨",
  "惠茜", "漫妮", "月婵", "嫦曦", "静香", "梦洁", "凌菲", "靖瑶",
];

const MALE_GIVEN_NAMES = [
  "阿杰", "小凯", "浩然", "子轩", "宇航", "俊杰", "志远", "明辉",
  "天宇", "建国", "子涵", "宇轩", "博文", "浩宇", "泽宇", "睿杰",
  "俊熙", "子豪", "晨曦", "文博", "天翔", "鹏飞", "志强", "伟",
  "磊", "洋", "勇", "军", "峰", "刚", "强", "明",
  "文杰", "嘉豪", "志伟", "国栋", "宏伟", "建平", "海涛", "振华",
  "思远", "昊天", "子墨", "逸飞", "一鸣", "梓豪", "瑞霖", "致远",
  "鸿煊", "绍辉", "辰逸", "炫明", "风华", "弘文", "哲瀚", "楷瑞",
  "鹤轩", "昊强", "越泽", "旭尧", "炎彬", "伟宸", "君昊", "国龙",
];

// ─── City data ──────────────────────────────────────────────────────────────

const CITIES: { name: string; lat: number; lng: number }[] = [
  { name: "上海", lat: 31.2304, lng: 121.4737 },
  { name: "北京", lat: 39.9042, lng: 116.4074 },
  { name: "深圳", lat: 22.5431, lng: 114.0579 },
  { name: "广州", lat: 23.1291, lng: 113.2644 },
  { name: "杭州", lat: 30.2741, lng: 120.1551 },
  { name: "成都", lat: 30.5728, lng: 104.0668 },
  { name: "武汉", lat: 30.5928, lng: 114.3055 },
  { name: "南京", lat: 32.0603, lng: 118.7969 },
  { name: "西安", lat: 34.3416, lng: 108.9398 },
  { name: "重庆", lat: 29.4316, lng: 106.9123 },
];

// ─── Profile data pools ─────────────────────────────────────────────────────

const OCCUPATIONS_FEMALE = [
  "产品经理", "UI设计师", "教师", "护士", "会计", "市场专员",
  "运营", "编辑", "翻译", "心理咨询师", "律师助理", "花艺师",
  "新媒体运营", "人力资源", "数据分析师", "摄影师", "甜品师",
  "品牌策划", "内容创作者", "电商运营", "律师", "医生",
  "小学老师", "幼儿园老师", "舞蹈老师", "瑜伽教练", "咖啡师",
];

const OCCUPATIONS_MALE = [
  "软件工程师", "产品经理", "建筑师", "金融分析师", "医生",
  "创业者", "设计师", "律师", "大学讲师", "市场总监",
  "摄影师", "健身教练", "自由职业", "公务员", "研究员",
  "投资顾问", "程序员", "销售经理", "品牌主理人", "自媒体",
  "游戏策划", "供应链管理", "无人机飞手", "调酒师", "厨师",
];

const EDUCATIONS = [
  "本科", "本科", "本科", // weighted
  "硕士", "硕士",
  "博士",
  "大专", "大专",
];

const HOBBIES_FEMALE = [
  "看书", "旅行", "摄影", "烘焙", "瑜伽", "画画", "追剧",
  "咖啡", "花艺", "插花", "手帐", "游泳", "跑步", "弹吉他",
  "逛展览", "逛博物馆", "写日记", "做甜点", "看电影", "听播客",
  "徒步", "露营", "滑雪", "潜水", "爬山", "跳舞", "唱歌",
  "逛vintage", "养猫", "养狗", "种多肉", "冥想", "健身",
  "打羽毛球", "网球", "桌游", "剧本杀", "密室逃脱",
];

const HOBBIES_MALE = [
  "健身", "篮球", "足球", "摄影", "旅行", "电影", "游戏",
  "吉他", "跑步", "游泳", "滑雪", "潜水", "露营", "钓鱼",
  "爬山", "骑行", "做饭", "咖啡", "红酒", "威士忌",
  "科技", "编程", "阅读", "写作", "画画", "弹钢琴",
  "滑板", "冲浪", "拳击", "羽毛球", "网球", "乒乓球",
  "桌游", "剧本杀", "密室", "音乐节", "livehouse",
  "自驾游", "露营", "潜水", "天文", "观鸟",
];

// ─── Bio templates ──────────────────────────────────────────────────────────

const BIOS_FEMALE = {
  hobby: [
    "喜欢在周末拍城市角落，最近迷上了胶片摄影 📷",
    "烘焙是解压方式，提拉米苏和巴斯克是拿手的 🎂",
    "书架上的书永远比读过的多，最近在看《那不勒斯四部曲》",
    "喜欢到处走走看看，今年的目标是完成一次独自旅行 ✈️",
    "瑜伽让我学会了和自己相处，也学会了耐心 🧘‍♀️",
    "咖啡爱好者，周末最喜欢泡在独立咖啡馆里",
    "喜欢逛各种展览和博物馆，艺术让人保持对世界的好奇",
    "养了一只橘猫叫大福，它是我最好的室友 🐱",
    "喜欢做饭，研究各种菜谱是快乐源泉",
    "喜欢听播客，走路的时候耳朵里总塞着耳机",
  ],
  personality: [
    "话不多但内心戏很足的i人，熟了之后会变成话痨",
    "慢热但真诚，喜欢有深度的对话",
    "看起来高冷但其实很搞笑的朋友都说我冷笑话很冷",
    "一个努力让生活有趣的人，偶尔emo但大部分时间很乐观",
    "好奇心旺盛，喜欢尝试新事物，但选择困难症严重",
    "温柔但有原则，对喜欢的人会特别好",
    "有点社恐但很享受和志同道合的人聊天",
    "理性思考感性生活，希望找到一个能互相理解的人",
  ],
  humor: [
    "长得还行，就是眼睛有点小（不是）🤣",
    "不是在吃就是在去吃的路上，美食地图小能手",
    "朋友说我是反差最大的人，外表和内心完全不符",
    "收藏了一冰箱的冰箱贴，旅行的意义就是集冰箱贴",
    "早睡早起做不到，但早起打卡是可以在朋友圈做的",
    "双子座，所以你可能会认识两个不同的我",
    "正在练习如何用最正经的表情说最不正经的话",
  ],
};

const BIOS_MALE = {
  hobby: [
    "篮球场和健身房是周末的固定去处，偶尔也打打游戏",
    "喜欢摄影，尤其喜欢拍日落和城市夜景 📸",
    "做饭是兴趣，川菜和日料都能露两手 🍳",
    "户外爱好者，周末不是在爬山就是在去爬山的路上 🏔️",
    "喜欢自驾游，国内已经跑了不少地方",
    "弹了五年吉他，还是一首完整的歌都弹不好 😂",
    "科技数码控，新出的设备总想第一时间体验",
    "喜欢看电影，什么都看，从文艺片到爆米花片",
    "读书比较杂，最近在看东野圭吾和刘慈欣",
    "咖啡重度患者，一天不喝就浑身难受 ☕",
  ],
  personality: [
    "性格随和，朋友都说和我相处很舒服",
    "做事认真但不较真，生活需要松弛感",
    "有点闷骚，熟了之后会发现我是个很搞笑的人",
    "注重细节，会记住你无意间说过的话",
    "独立但不冷漠，尊重彼此的个人空间",
    "行动派，比起说更喜欢做",
    "乐观主义者，觉得大部分事情都会变好的",
    "直男但愿意学习的那种，给我一点时间",
  ],
  humor: [
    "身高180+（穿上鞋以后）",
    "长得不帅但是很耐看（至少我自己这么觉得）",
    "据说本人比照片好看，但谁知道呢",
    "能修电脑能修水管能修WiFi，就是修不了自己的单身",
    "最近的成就是连续一周没有点外卖（第三天就放弃了）",
    "方向感很好，但人生方向感为零",
    "一只有趣的灵魂，包裹在一个有趣的皮囊里",
  ],
};

// ─── Matching profile traits ────────────────────────────────────────────────

const TRAITS_POOL_FEMALE = [
  "温柔", "细心", "有同理心", "独立", "文艺", "感性", "理性",
  "活泼", "安静", "幽默", "乐观", "上进", "顾家", "有主见",
  "善良", "真诚", "有趣", "热爱生活", "注重细节", "有安全感",
  "慢热", "重感情", "有自己的世界", "善于倾听", "情绪稳定",
  "好奇心强", "喜欢挑战", "追求品质", "简单纯粹", "知足常乐",
];

const TRAITS_POOL_MALE = [
  "靠谱", "有责任心", "上进", "幽默", "大方", "细心", "温暖",
  "有耐心", "独立", "有主见", "稳重", "有趣", "真诚", "有目标",
  "运动", "顾家", "体贴", "有安全感", "情绪稳定", "善于沟通",
  "有规划", "有担当", "积极", "简单", "随和", "喜欢探索",
  "有品味", "注重健康", "有深度", "行动派",
];

const MATCH_TYPES = ["恋人", "旅游搭子", "吃饭搭子", "看展搭子", "运动搭子", "聊天搭子"];
const CHAT_PACES = ["low", "medium", "high"];
const MEET_PREFERENCES = ["online", "hybrid", "offline"];
const EMOTION_STYLES = ["direct", "slow", "sensitive"];

const ACTIVITY_TAGS_FEMALE = [
  "一起打游戏", "刷剧陪伴", "一起做饭", "一起健身", "周末逛展",
  "一起养宠物", "互相监督学习", "一起旅行", "聊天解闷", "互相推荐歌单",
  "一起拍照", "一起看日落", "一起学新技能", "互相当树洞",
];

const ACTIVITY_TAGS_MALE = [
  "一起打游戏", "一起看球", "一起健身", "一起做饭", "一起旅行",
  "一起爬山", "互相推荐电影", "一起打篮球", "聊聊天", "一起探店",
  "一起看live", "一起自驾游", "互相监督运动", "一起喝咖啡",
];

// ─── Matching profile summary templates ─────────────────────────────────────

const SUMMARIES_FEMALE = [
  "一个喜欢记录生活的女生，相信好的关系需要时间慢慢培养。",
  "独立但不冷漠，有自己的小世界但也期待有人走进来。",
  "喜欢有深度的对话，比起数量更看重质量。",
  "生活里需要一些仪式感，但也喜欢平淡的小确幸。",
  "相信真诚是最重要的，希望能遇到一个同样认真的人。",
  "好奇心很重，什么都想试一试，希望找到一起探索的人。",
  "有点慢热但很真心，一旦认定就会很用心。",
  "喜欢把生活过得有趣，希望你也一样。",
];

const SUMMARIES_MALE = [
  "一个努力把生活过得有意思的男生，相信行动比语言更重要。",
  "注重细节，会记住你说过的话，希望遇到同样用心的人。",
  "独立有主见，但也懂得尊重和包容。",
  "热爱运动和旅行，希望找到一个可以一起探索世界的人。",
  "看起来很稳重但偶尔也想疯一下，生活需要平衡。",
  "相信好的关系是两个人一起成长，而不是互相消耗。",
  "直男进化中，愿意为喜欢的人变得更好。",
  "有目标有规划，但也不忘享受当下的每一刻。",
];

// ─── Profile prompt templates ───────────────────────────────────────────────

const PROFILE_PROMPTS = [
  { key: "ideal_weekend", answers_f: ["窝在家里看书追剧，偶尔出门探店", "睡到自然醒，下午去逛街或看展", "和朋友约一顿brunch，然后逛vintage店"], answers_m: ["打一场篮球，然后和朋友聚餐", "睡到自然醒，下午去健身房或者打球", "自驾去周边城市走走，拍拍照"] },
  { key: "dealbreaker", answers_f: ["不尊重人、没有上进心", "没有责任感，不诚实", "不会好好说话，冷暴力"], answers_m: ["不真诚、太作", "没有自己的想法", "不懂得尊重和理解"] },
  { key: "favorite_movie", answers_f: ["《怦然心动》《爱在黎明破晓前》", "《哈利波特》全系列", "《请以你的名字呼唤我》"], answers_m: ["《星际穿越》《盗梦空间》", "《肖申克的救赎》", "《灌篮高手》《头文字D》"] },
  { key: "green_flag", answers_f: ["会认真听你说话的人", "有自己热爱的事情", "对服务员也很客气"], answers_m: ["说到做到", "有独立思考能力", "有自己的爱好和生活"] },
  { key: "unpopular_opinion", answers_f: ["奶茶其实没有那么好喝", "一个人旅行比一群人更舒服", "猫比狗好养"], answers_m: ["运动不需要理由", "做饭比外卖好吃多了", "独处是最好的充电方式"] },
];

// ─── Profile answers (questionnaire) ────────────────────────────────────────

function buildProfileAnswers(gender: string, city: string): Prisma.InputJsonValue {
  const isFemale = gender === "female";
  return {
    "lifestyle": isFemale ? pick(["宅家型", "社交型", "平衡型", "自由型"]) : pick(["宅家型", "社交型", "平衡型", "自由型"]),
    "communication_style": isFemale ? pick(["喜欢打字", "喜欢语音", "喜欢见面聊", "看情况"]) : pick(["喜欢打字", "喜欢语音", "喜欢见面聊", "看情况"]),
    "love_language": isFemale ? pick(["陪伴", "语言肯定", "肢体接触", "礼物", "服务行动"]) : pick(["陪伴", "语言肯定", "肢体接触", "礼物", "服务行动"]),
    "zodiac": pick(["白羊座", "金牛座", "双子座", "巨蟹座", "狮子座", "处女座", "天秤座", "天蝎座", "射手座", "摩羯座", "水瓶座", "双鱼座"]),
    "pet_preference": pick(["猫派", "狗派", "都喜欢", "都不养", "养了猫", "养了狗"]),
    "smoking": pick(["不抽烟", "偶尔社交", "已戒"]),
    "drinking": pick(["不喝酒", "偶尔小酌", "喜欢品酒"]),
    "city_current": city,
    "hometown": pick(["本地人", "来这座城市" + pick(["1年", "2年", "3年", "5年", "好几年"]) + "了"]),
  };
}

// ─── Build full seed data ───────────────────────────────────────────────────

interface SeedUserData {
  email: string;
  name: string;
  gender: string;
  age: number;
  city: string;
  lat: number;
  lng: number;
  bio: string;
  occupation: string;
  education: string;
  hobbies: string[];
  avatarUrl: string;
  photo1: string;
  photo2: string;
  photo3: string;
  popularityScore: number;
  lastActiveAt: Date;
  profileAnswers: Prisma.InputJsonValue;
  matchingProfile: {
    summaryJson: Prisma.InputJsonValue;
    traitsJson: Prisma.InputJsonValue;
    signalsJson: Prisma.InputJsonValue;
  };
  preference: {
    expectedGender: string;
    ageMin: number;
    ageMax: number;
    region: string;
    matchTypes: string;
    chatPace: string;
    meetPreference: string;
    emotionStyle: string;
    activityTags: string;
    dailyMatchTime: string;
    dailyMatchTimezone: string;
    heartThreshold: number;
  };
  profilePrompts: { promptKey: string; answer: string }[];
}

function buildFemaleUser(index: number): SeedUserData {
  const surname = pick(SURNAMES);
  const givenName = pick(FEMALE_GIVEN_NAMES);
  const name = surname + givenName;
  const city = CITIES[index % CITIES.length];
  const age = randomInt(20, 28);

  const bioStyle = pick(["hobby", "personality", "humor"] as const);
  const bioPool = BIOS_FEMALE[bioStyle];
  const bio = pick(bioPool);

  const occupation = pick(OCCUPATIONS_FEMALE);
  const education = pick(EDUCATIONS);
  const hobbies = pickN(HOBBIES_FEMALE, randomInt(4, 7));
  const traits = pickN(TRAITS_POOL_FEMALE, randomInt(4, 7));
  const summary = pick(SUMMARIES_FEMALE);
  const photos = generatePhotos(name, index);

  const prompts = pickN(PROFILE_PROMPTS, randomInt(2, 3)).map((p) => ({
    promptKey: p.key,
    answer: pick(p.answers_f),
  }));

  return {
    email: `seed_${name}_${index}@qiubi.local`,
    name,
    gender: "female",
    age,
    city: city.name,
    lat: city.lat + (Math.random() - 0.5) * 0.1,
    lng: city.lng + (Math.random() - 0.5) * 0.1,
    bio,
    occupation,
    education,
    hobbies,
    avatarUrl: photos[0],
    photo1: photos[0],
    photo2: photos[1],
    photo3: photos[2],
    popularityScore: randomInt(30, 90),
    lastActiveAt: randomDateWithinDays(30),
    profileAnswers: buildProfileAnswers("female", city.name),
    matchingProfile: {
      summaryJson: { text: summary, generatedAt: new Date().toISOString() },
      traitsJson: { traits, hobbies, values: pickN(traits, 3) },
      signalsJson: { keywords: hobbies.slice(0, 3), personalityTags: traits.slice(0, 3) },
    },
    preference: {
      expectedGender: "male",
      ageMin: randomInt(20, 23),
      ageMax: randomInt(26, 32),
      region: city.name,
      matchTypes: JSON.stringify(pickN(MATCH_TYPES, randomInt(1, 3))),
      chatPace: pick(CHAT_PACES),
      meetPreference: pick(MEET_PREFERENCES),
      emotionStyle: pick(EMOTION_STYLES),
      activityTags: JSON.stringify(pickN(ACTIVITY_TAGS_FEMALE, randomInt(2, 4))),
      dailyMatchTime: pick(["20:00", "21:00", "22:00"]),
      dailyMatchTimezone: "Asia/Shanghai",
      heartThreshold: randomInt(70, 85),
    },
    profilePrompts: prompts,
  };
}

function buildMaleUser(index: number): SeedUserData {
  const surname = pick(SURNAMES);
  const givenName = pick(MALE_GIVEN_NAMES);
  const name = surname + givenName;
  const city = CITIES[index % CITIES.length];
  const age = randomInt(22, 30);

  const bioStyle = pick(["hobby", "personality", "humor"] as const);
  const bioPool = BIOS_MALE[bioStyle];
  const bio = pick(bioPool);

  const occupation = pick(OCCUPATIONS_MALE);
  const education = pick(EDUCATIONS);
  const hobbies = pickN(HOBBIES_MALE, randomInt(4, 7));
  const traits = pickN(TRAITS_POOL_MALE, randomInt(4, 7));
  const summary = pick(SUMMARIES_MALE);
  const photos = generatePhotos(name, index + 100);

  const prompts = pickN(PROFILE_PROMPTS, randomInt(2, 3)).map((p) => ({
    promptKey: p.key,
    answer: pick(p.answers_m),
  }));

  return {
    email: `seed_${name}_${index + 40}@qiubi.local`,
    name,
    gender: "male",
    age,
    city: city.name,
    lat: city.lat + (Math.random() - 0.5) * 0.1,
    lng: city.lng + (Math.random() - 0.5) * 0.1,
    bio,
    occupation,
    education,
    hobbies,
    avatarUrl: photos[0],
    photo1: photos[0],
    photo2: photos[1],
    photo3: photos[2],
    popularityScore: randomInt(30, 90),
    lastActiveAt: randomDateWithinDays(30),
    profileAnswers: buildProfileAnswers("male", city.name),
    matchingProfile: {
      summaryJson: { text: summary, generatedAt: new Date().toISOString() },
      traitsJson: { traits, hobbies, values: pickN(traits, 3) },
      signalsJson: { keywords: hobbies.slice(0, 3), personalityTags: traits.slice(0, 3) },
    },
    preference: {
      expectedGender: "female",
      ageMin: randomInt(19, 22),
      ageMax: randomInt(26, 30),
      region: city.name,
      matchTypes: JSON.stringify(pickN(MATCH_TYPES, randomInt(1, 3))),
      chatPace: pick(CHAT_PACES),
      meetPreference: pick(MEET_PREFERENCES),
      emotionStyle: pick(EMOTION_STYLES),
      activityTags: JSON.stringify(pickN(ACTIVITY_TAGS_MALE, randomInt(2, 4))),
      dailyMatchTime: pick(["20:00", "21:00", "22:00"]),
      dailyMatchTimezone: "Asia/Shanghai",
      heartThreshold: randomInt(70, 85),
    },
    profilePrompts: prompts,
  };
}

// ─── Main seed function ─────────────────────────────────────────────────────

export interface SeedResult {
  created: number;
  skipped: number;
  errors: string[];
  total: number;
}

export async function seedUsers(): Promise<SeedResult> {
  const result: SeedResult = { created: 0, skipped: 0, errors: [], total: 80 };

  // Build all 80 users: 40 female (indices 0-39), 40 male (indices 40-79)
  const allUsers: SeedUserData[] = [];
  for (let i = 0; i < 40; i++) {
    allUsers.push(buildFemaleUser(i));
  }
  for (let i = 0; i < 40; i++) {
    allUsers.push(buildMaleUser(i));
  }

  // Process each user
  for (const userData of allUsers) {
    try {
      // Idempotent: check if user already exists by email
      const existing = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (existing) {
        result.skipped++;
        continue;
      }

      // Create the user with all related records in a transaction
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: userData.email,
            name: userData.name,
            gender: userData.gender,
            age: userData.age,
            bio: userData.bio,
            avatarUrl: userData.avatarUrl,
            photo1: userData.photo1,
            photo2: userData.photo2,
            photo3: userData.photo3,
            authProvider: "seed",
            onboardingDone: true,
            profileCompleteness: 100,
            popularityScore: userData.popularityScore,
            latitude: userData.lat,
            longitude: userData.lng,
            locationUpdatedAt: new Date(),
            profileAnswers: userData.profileAnswers,
            privacyAcceptedAt: new Date(),
            agentLearnConsent: true,
            dailyStreak: randomInt(0, 15),
            viewCount: randomInt(10, 200),
          },
        });

        // Create UserPreference
        await tx.userPreference.create({
          data: {
            userId: user.id,
            expectedGender: userData.preference.expectedGender,
            ageMin: userData.preference.ageMin,
            ageMax: userData.preference.ageMax,
            region: userData.preference.region,
            matchTypes: userData.preference.matchTypes,
            chatPace: userData.preference.chatPace,
            meetPreference: userData.preference.meetPreference,
            emotionStyle: userData.preference.emotionStyle,
            activityTags: userData.preference.activityTags,
            dailyMatchTime: userData.preference.dailyMatchTime,
            dailyMatchTimezone: userData.preference.dailyMatchTimezone,
            heartThreshold: userData.preference.heartThreshold,
          },
        });

        // Create UserMatchingProfile
        await tx.userMatchingProfile.create({
          data: {
            userId: user.id,
            summaryJson: userData.matchingProfile.summaryJson,
            traitsJson: userData.matchingProfile.traitsJson,
            signalsJson: userData.matchingProfile.signalsJson,
          },
        });

        // Create ProfilePrompts
        for (const prompt of userData.profilePrompts) {
          await tx.profilePrompt.create({
            data: {
              userId: user.id,
              promptKey: prompt.promptKey,
              answer: prompt.answer,
            },
          });
        }

        // Create NotificationSettings
        await tx.notificationSettings.create({
          data: {
            userId: user.id,
            pushEnabled: true,
            dailyRecommendation: true,
            matchNotification: true,
            messageNotification: true,
          },
        });
      });

      result.created++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Failed to create ${userData.name} (${userData.email}): ${msg}`);
    }
  }

  return result;
}
