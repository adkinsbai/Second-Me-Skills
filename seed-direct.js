const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const cities = [
  { name: '上海', lat: 31.23, lng: 121.47 },
  { name: '北京', lat: 39.90, lng: 116.40 },
  { name: '广州', lat: 23.13, lng: 113.26 },
  { name: '深圳', lat: 22.54, lng: 114.05 },
  { name: '杭州', lat: 30.27, lng: 120.15 },
  { name: '成都', lat: 30.57, lng: 104.07 },
  { name: '重庆', lat: 29.56, lng: 106.55 },
  { name: '武汉', lat: 30.59, lng: 114.30 },
  { name: '南京', lat: 32.06, lng: 118.80 },
  { name: '西安', lat: 34.26, lng: 108.94 },
];

const femaleNames = ['小雨','思琪','佳怡','诗涵','欣怡','雅静','梦瑶','心怡','紫萱','若曦','语嫣','瑾萱','芷若','清雅','雨桐','思远','晓薇','佳琪','美琳','雅琪','小溪','思源','雨薇','佳宜','诗琪','雅婷','梦洁','心语','紫涵','若兰','清欢','雨馨','思颖','晓月','佳慧','美琪','雅静','梦蝶','心悦','紫烟','若水','清风','雨露','思琪','晓晨','佳音','美惠','雅思','梦露','心怡'];
const maleNames = ['子轩','浩然','宇航','博文','天佑','俊杰','文昊','鑫鹏','昊天','思远','明哲','正豪','志泽','嘉熙','子涵','浩宇','宇轩','博涛','天翔','俊驰','文博','鑫磊','昊强','思源','明辉','正阳','志远','嘉懿','子墨','浩初','宇达','博超','天瑞','俊楠','文彦','鑫鹏','昊然','思聪','明远','正初','志明','嘉平','子安','浩然','宇寰','博裕','天成','俊德','文彬','鑫淼'];

const femaleJobs = ['设计师','产品经理','教师','护士','编辑','翻译','心理咨询师','营养师','花艺师','摄影师','律师','会计','记者','主播','运营','市场','HR','行政','药师','护士长'];
const maleJobs = ['程序员','产品经理','工程师','设计师','医生','律师','金融分析师','架构师','创业者','教师','研究员','记者','导演','摄影师','建筑师','咨询师','投资经理','数据分析师','运营总监','技术总监'];

const femaleHobbies = ['读书','瑜伽','摄影','烘焙','旅行','画画','看电影','听音乐','养猫','跑步','插花','写作','弹钢琴','逛展览','喝咖啡','手工','追剧','学日语','冥想','种花'];
const maleHobbies = ['健身','篮球','编程','旅行','摄影','吉他','电影','游戏','读书','跑步','做饭','咖啡','登山','游泳','打网球','看展','音乐','骑行','露营','冥想'];

const femaleBios = [
  '喜欢在周末的午后看书喝咖啡，偶尔画几笔水彩。希望遇到一个能一起安静也能一起疯的人。',
  '热爱生活的设计师，喜欢用镜头记录美好瞬间。周末不是在逛展就是在去逛展的路上。',
  '温柔但有主见的女生，喜欢做饭和烘焙。相信好的感情是两个人一起成长。',
  '互联网产品经理，工作日理性分析，周末感性生活。喜欢旅行和探索新餐厅。',
  '小学老师，喜欢孩子和小动物。养了一只叫团子的猫。希望找到一个温暖的人。',
  '自由翻译官，去过10个国家。最喜欢日本的秋天和冰岛的极光。',
  '心理咨询师，善于倾听和理解。喜欢瑜伽和冥想，追求内心的平静。',
  '新媒体运营，白天写文案，晚上弹吉他。最近在学尤克里里。',
  '会计事务所工作，看起来严肃但其实很逗。喜欢密室逃脱和剧本杀。',
  '医院护士，三班倒但依然热爱生活。养了两只猫，周末喜欢逛花市。',
];

const maleBios = [
  '程序员但不宅，周末喜欢户外运动和摄影。最近在学冲浪，虽然摔得很惨但很快乐。',
  '产品经理，善于沟通和理解需求（包括你的需求）。喜欢旅行和美食。',
  '工程师思维+文艺灵魂，会写代码也会弹吉他。相信技术能改变世界。',
  '医生，工作忙碌但珍惜每一个休息日。喜欢跑步和看书，最近在读《三体》。',
  '创业者，经历过失败也收获了成长。喜欢和有想法的人聊天，不怕困难。',
  '金融分析师，数据之外喜欢音乐和电影。周末会去livehouse听现场。',
  '建筑师，喜欢用设计改变空间。旅行时最喜欢逛当地的建筑和博物馆。',
  '大学老师，研究人工智能。课余喜欢打篮球和弹钢琴。',
  '自由摄影师，去过20多个国家。最喜欢拍人文和风景。',
  '技术总监，工作之余喜欢做饭和健身。觉得给喜欢的人做饭是最浪漫的事。',
];

const traits = ['温柔','有趣','上进','幽默','成熟','细心','体贴','浪漫','独立','自信','善良','真诚','阳光','开朗','安静','内向','外向','专一','理性','感性','文艺','稳重','活泼','佛系','热血','慢热','健谈','顾家','有爱心','有责任心'];

const prompts = [
  { question: '周末最喜欢做什么？', answers: ['宅家看书','约朋友吃饭','户外运动','逛展览/看演出','在家追剧','学习新技能','睡到自然醒','做家务整理'] },
  { question: '理想的约会方式？', answers: ['一起做饭','看日落','逛书店','密室逃脱','咖啡馆聊天','看展览','散步聊天','一起运动'] },
  { question: '你觉得最重要的品质？', answers: ['真诚','上进心','幽默感','责任心','善良','独立','有主见','温柔体贴'] },
  { question: '你的恋爱风格？', answers: ['细水长流','轰轰烈烈','互相成长','陪伴型','独立空间型','甜蜜黏人','理性沟通','浪漫仪式感'] },
];

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPicks(arr, min, max) {
  const count = min + Math.floor(Math.random() * (max - min + 1));
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

async function seed() {
  console.log('Starting seed...');
  
  // Check existing
  const existing = await prisma.user.count({ where: { authProvider: 'seed' } });
  console.log(`Existing seed users: ${existing}`);
  
  if (existing >= 50) {
    console.log('Already have enough seed users, skipping.');
    return;
  }

  const users = [];
  
  // Create 50 female + 50 male
  for (let i = 0; i < 100; i++) {
    const isFemale = i < 50;
    const city = cities[i % cities.length];
    const name = isFemale ? femaleNames[i % femaleNames.length] : maleNames[(i - 50) % maleNames.length];
    const age = isFemale ? randomInt(20, 30) : randomInt(22, 35);
    const job = isFemale ? randomPick(femaleJobs) : randomPick(maleJobs);
    const hobbies = randomPicks(isFemale ? femaleHobbies : maleHobbies, 3, 6);
    const bio = isFemale ? femaleBios[i % femaleBios.length] : maleBios[(i - 50) % maleBios.length];
    const userTraits = randomPicks(traits, 3, 5);
    const selectedPrompts = randomPicks(prompts, 2, 3).map(p => ({
      question: p.question,
      answer: randomPick(p.answers)
    }));

    const email = `seed_${i}_${Date.now()}@qiubi.test`;
    
    try {
      const user = await prisma.user.create({
        data: {
          email,
          name,
          gender: isFemale ? 'female' : 'male',
          age,
          bio: `${bio} 职业：${job}`,
          authProvider: 'seed',
          onboardingDone: true,
          profileCompleteness: 100,
          popularityScore: randomInt(30, 95),
          latitude: city.lat + (Math.random() - 0.5) * 0.1,
          longitude: city.lng + (Math.random() - 0.5) * 0.1,
          locationUpdatedAt: new Date(),
          profileAnswers: selectedPrompts,
          privacyAcceptedAt: new Date(),
          agentLearnConsent: true,
          dailyStreak: randomInt(0, 15),
          viewCount: randomInt(10, 200),
        },
      });

      // Create preference
      await prisma.userPreference.create({
        data: {
          userId: user.id,
          heartThreshold: randomInt(60, 85),
          region: city.name,
          keywords: [...hobbies, ...userTraits].join(','),
          matchTypes: JSON.stringify(randomPicks(['恋人','朋友','旅游搭子','饭搭子','学习搭子'], 1, 3)),
          activityTags: JSON.stringify(randomPicks(['一起看电影','周末出游','一起健身','喝咖啡聊天','一起做饭','逛展览','打游戏','看日落'], 2, 4)),
          chatPace: randomPick(['low','medium','high']),
          meetPreference: randomPick(['online','hybrid','offline']),
          emotionStyle: randomPick(['direct','slow','sensitive']),
          expectedGender: isFemale ? 'male' : 'female',
          ageMin: isFemale ? randomInt(22, 26) : randomInt(20, 24),
          ageMax: isFemale ? randomInt(30, 35) : randomInt(28, 32),
        },
      });

      users.push(user);
      if ((i + 1) % 10 === 0) console.log(`Created ${i + 1}/100 users...`);
    } catch (err) {
      console.error(`Error creating user ${i}:`, err.message);
    }
  }

  console.log(`\nDone! Created ${users.length} seed users.`);
  
  // Summary
  const femaleCount = users.filter(u => u.gender === 'female').length;
  const maleCount = users.filter(u => u.gender === 'male').length;
  console.log(`Female: ${femaleCount}, Male: ${maleCount}`);
  
  const cityDist = {};
  for (const u of users) {
    const c = cities.find(c => Math.abs(c.lat - u.latitude) < 0.2);
    if (c) cityDist[c.name] = (cityDist[c.name] || 0) + 1;
  }
  console.log('City distribution:', cityDist);
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
