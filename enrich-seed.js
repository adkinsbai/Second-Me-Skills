const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const allInterests = [
  '读书','电影','音乐','旅行','摄影','画画','游戏','做饭','烘焙','咖啡',
  '瑜伽','跑步','游泳','健身','登山','徒步','露营','滑雪','冲浪','篮球',
  '足球','网球','羽毛球','乒乓球','电竞','写作','日记','冥想','心理学',
  '哲学','天文','植物','花艺','编程','科技','动漫','二次元','追剧','综艺',
  '展览','博物馆','话剧','音乐会','创业','投资','理财','美食','火锅',
  '烧烤','日料','韩料','西餐','猫','狗','宠物','户外','弹吉他','钢琴',
  '小提琴','画画','水彩','插花','手工','编织','书法','茶道','品酒',
  '高尔夫','潜水','攀岩','滑板','骑行','射箭','棒球','橄榄球'
];

const allTraits = [
  '温柔','有趣','上进','幽默','成熟','细心','体贴','浪漫','独立','自信',
  '善良','真诚','阳光','开朗','安静','内向','外向','专一','理性','感性',
  '文艺','稳重','活泼','佛系','热血','慢热','健谈','顾家','有爱心','有责任心'
];

const allActivities = [
  '一起看电影','周末出游','一起健身','喝咖啡聊天','一起做饭',
  '逛展览','打游戏','看日落','一起读书','一起跑步',
  '一起旅行','一起烘焙','一起养宠物','一起追剧','一起听音乐会',
  '一起登山','一起游泳','一起打羽毛球','一起逛书店','一起品茶'
];

const cities = [
  '上海','北京','广州','深圳','杭州','成都','重庆','武汉','南京','西安',
  '苏州','天津','长沙','郑州','青岛','厦门','昆明','合肥','福州','济南'
];

function pick(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

async function enrich() {
  console.log('Enriching seed user preferences...');
  
  const prefs = await prisma.userPreference.findMany({
    include: { user: true }
  });
  
  let updated = 0;
  for (const pref of prefs) {
    const city = pref.region || pick(cities, 1)[0];
    const interests = pick(allInterests, 5 + Math.floor(Math.random() * 4));
    const traits = pick(allTraits, 3 + Math.floor(Math.random() * 3));
    const activities = pick(allActivities, 3 + Math.floor(Math.random() * 3));
    
    await prisma.userPreference.update({
      where: { userId: pref.userId },
      data: {
        region: city,
        keywords: [...interests, ...traits].join(','),
        activityTags: JSON.stringify(activities),
        matchTypes: JSON.stringify(pick(['恋人','朋友','旅游搭子','饭搭子','学习搭子'], 1 + Math.floor(Math.random() * 2))),
        chatPace: pick(['low','medium','high'], 1)[0],
        meetPreference: pick(['online','hybrid','offline'], 1)[0],
        emotionStyle: pick(['direct','slow','sensitive'], 1)[0],
      }
    });
    updated++;
  }
  
  console.log(`Updated ${updated} preferences`);
  
  // Also update user.region if missing
  const usersWithoutRegion = await prisma.user.findMany({
    where: { authProvider: 'seed', region: null }
  });
  // Users don't have a region field directly, it's in preference
  
  // Verify
  const sample = await prisma.userPreference.findFirst({
    where: { keywords: { not: null } },
    include: { user: true }
  });
  if (sample) {
    console.log('Sample after enrichment:');
    console.log('  Name:', sample.user.name);
    console.log('  Region:', sample.region);
    console.log('  Keywords:', sample.keywords?.substring(0, 80));
    console.log('  ActivityTags:', sample.activityTags?.substring(0, 80));
  }
  
  await prisma.$disconnect();
}

enrich().catch(e => { console.error(e); process.exit(1); });
