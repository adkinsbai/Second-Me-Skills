# 丘比（Qiubi）— 系统功能文档

> 版本：v0.2.0 · 更新于 2026-04-20

---

## 目录

1. [系统概览](#1-系统概览)
2. [认证与账号系统](#2-认证与账号系统)
3. [用户资料与心动设置](#3-用户资料与心动设置)
4. [匹配流水线（核心引擎）](#4-匹配流水线核心引擎)
5. [匹配详情与解锁](#5-匹配详情与解锁)
6. [真人聊天系统](#6-真人聊天系统)
7. [评分报告与关系洞察](#7-评分报告与关系洞察)
8. [丘比小镇（社区广场）](#8-丘比小镇社区广场)
9. [数字体（SecondMe 集成）](#9-数字体secondme-集成)
10. [通知与已读状态](#10-通知与已读状态)
11. [数据库设计](#11-数据库设计)
12. [部署与环境变量](#12-部署与环境变量)

---

## 1. 系统概览

**丘比** 是一款基于 AI 的交友匹配应用，核心理念是：

> 先让双方的「数字体（AI 分身）」在向量空间里相互认识，再决定两个真人要不要开聊。

### 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js 14 App Router（全栈 SSR + API Routes） |
| 语言 | TypeScript 5 |
| UI | React 18 + Tailwind CSS 3 + 自定义 CSS 动画 |
| 数据库 | PostgreSQL（Neon Serverless）+ Prisma 5 ORM |
| 实时通信 | SSE（Server-Sent Events）+ 乐观更新 |
| AI/数字体 | SecondMe API（Mindverse Lab） |
| 向量匹配 | 自研资料哈希向量（可换 pgvector + 真实 Embedding） |
| 部署 | Vercel（Serverless Functions） |

---

## 2. 认证与账号系统

### 2.1 功能

- **SecondMe OAuth2 登录**：通过 Mindverse Lab 的 OAuth 授权，获取 `accessToken` + `refreshToken`
- **本地邮箱 + 密码登录**：支持 bcrypt 哈希密码的注册/登录，不依赖 SecondMe
- **访客模式**：临时账号，无需注册可体验核心功能
- **忘记密码 / 重置密码**：通过链接令牌（token hash）重置密码

### 2.2 交互逻辑

```
[用户访问 /auth]
  → 点「SecondMe 登录」→ 跳转 OAuth URL
  → SecondMe 回调 /api/auth/callback
    → 验证 state（防 CSRF）
    → 换取 accessToken + refreshToken
    → 写入 Cookie（HttpOnly, Secure）
    → 跳转首页

[本地注册]
  → POST /api/auth/register { email, password, name }
    → bcrypt.hash(password, 12)
    → 写入 User 表
    → 设置 session Cookie
    → 跳转首页
```

### 2.3 技术原理

- **Session Cookie**：`qiubi_session` Cookie 存储 base64 编码的 JSON，包含 `userId`（无需 JWT 库，直接读 Cookie 验证）
- **Token 刷新**：`getCurrentUser()` 在 accessToken 过期前 5 分钟自动调用 `/api/oauth/token/refresh` 刷新
- **PKCE/State 防护**：OAuth 跳转时生成随机 `state` 存 Cookie，回调时校验防止 CSRF

---

## 3. 用户资料与心动设置

### 3.1 功能

| 设置项 | 说明 |
|---|---|
| 基础信息 | 昵称、头像 URL、简介（bio）、性别、年龄 |
| 心动设置 | 期望对象性别、年龄区间、地区、匹配类型（恋人/旅游搭子等） |
| 聊天风格偏好 | 聊天节奏（低/中/高频）、见面偏好（线上/混合/线下）、情绪风格 |
| 活动标签 | 「一起打游戏」「刷剧陪伴」等多选标签 |
| 心动阈值 | 0-100 分，双方都必须 ≥ 各自阈值才能 match |

### 3.2 页面路由

```
/settings/heartbeat  → 心动设置（所有偏好参数）
/onboarding          → 新用户引导填写
/intro/quiz          → 问卷式自我介绍
```

### 3.3 技术原理

- **单表存储**：`UserPreference` 表一对一关联 `User`，所有偏好字段都在这里
- **类型字段**：`matchTypes`、`activityTags` 以 JSON 字符串存储数组（`["恋人","旅游搭子"]`）
- **Upsert 写法**：前端 PATCH，后端 `prisma.userPreference.upsert()` 避免重复插入

---

## 4. 匹配流水线（核心引擎）

### 4.1 功能

丘比的核心是一个多阶段匹配管道，全程可视化展示给用户：

```
心动池扫描 → 有效账号过滤 → 双向心动条件 → 向量相似度 → 双向阈值裁决
```

每个阶段实时显示「进入 N 人」，带酷炫动画。

### 4.2 交互逻辑

```
[用户点击「开启匹配」]
  1. POST /api/matches/seed
     → 返回 pipeline.stages[]（各阶段人数）
     → 若有合格对象，返回 matchId
  
  2. 前端逐步播放每个阶段（520ms 间隔）
     → 扫描光条动画 + 计数器出现
     → 光晕旋转（match-pipeline-aurora）
  
  3. 若 matchId 存在 → 成功动画 → 1秒后跳转 /matches/[id]
  4. 若无合格 → 显示原因（未满足双向阈值等）
```

### 4.3 技术原理（`src/lib/matchPipeline.ts`）

**阶段一：心动池扫描**
- 取最近活跃的 500 个用户（`MAX_SCAN = 500`）
- 排除：自己、已匹配过的对象

**阶段二：有效账号**
- 过滤掉 `authProvider` 为空的废弃账号

**阶段三：双向心动条件（`passesMutualHeartFilters`）**
- 地区匹配：双方地区字段都有值时，必须相等
- 性别期望：A 的性别要满足 B 的 `expectedGender`，反之亦然
- 年龄匹配：A 的年龄落在 B 的 `[ageMin, ageMax]` 区间内，反之亦然；若年龄未填，检查偏好区间是否有重叠
- 匹配类型：双方 `matchTypes` 数组有至少一个交集（皆未填则跳过）

**阶段四：向量相似度（`userModeling.ts` + `scoreCompatibility`）**
- 基于 `bio`、`ownerFacts`（记忆条目）、历史聊天内容构建 `UserModel`
- 生成 1024 维哈希向量（`inferUserModel → embedding1024`），存入 `UserEmbedding` 表
- `scoreCompatibility` 计算多维度分数：
  - `vectorSimilarity`：余弦相似度（资料兴趣空间）
  - `rhythm`：聊天节奏匹配
  - `emotion`：情绪风格互补
  - `values`：价值观关键词匹配
  - `attachment`：依恋类型兼容度
  - `finalScore`（0–100）= 加权综合

**阶段五：双向阈值裁决**
- `finalScore ≥ 我方 heartThreshold` AND `finalScore ≥ 对方 heartThreshold`
- 通过则 `Match.status = "connected"`，写入 `MatchScore`

**动态阈值调整**：系统观察最近 8 次匹配行为，自动微调阈值（±5分）避免极端情况（解锁后从不聊天 → 提高阈值；长期无匹配 → 降低阈值）。

---

## 5. 匹配详情与解锁

### 5.1 功能

- 查看对方匿名资料（真实匹配时已解锁）
- 多维度评分展示（兴趣/性格/价值观/人生故事/未来）
- 解锁后进入真人聊天
- 查看完整评分报告
- 查看关系洞察（relationship 页）

### 5.2 页面路由

```
/matches               → 匹配列表
/matches/[id]          → 匹配详情（含评分卡）
/matches/[id]/chat     → 真人聊天
/matches/[id]/report   → 评分报告
/matches/[id]/relationship → 关系洞察
```

### 5.3 技术原理

- **双向对称记录**：一次 match 在数据库存两条（A→B 和 B→A），消息通过 pairMatch 逻辑合并展示
- **解锁机制**：`Match.status` 从 `screening` 变为 `connected` 时才可进入聊天
- **每日限额**：每天最多新建 6 个匹配（`DAILY_MATCH_LIMIT = 6`），防止刷量

---

## 6. 真人聊天系统

### 6.1 功能（对标微信）

| 特性 | 实现方式 |
|---|---|
| **实时消息推送** | SSE（Server-Sent Events），800ms 轮询数据库 |
| **乐观更新** | 发送后立即显示气泡（pending 状态），服务端确认后替换 |
| **消息气泡** | 微信风格：自己右侧玫瑰色 + 气泡尾；对方左侧毛玻璃 + 气泡尾 |
| **头像圆圈** | 自己：金-玫瑰渐变圆；对方：取昵称首字 |
| **时间分组** | 超过 5 分钟的间隔显示时间分隔线（今天/昨天/星期X/月/日） |
| **已读状态** | 最后一条自己发的消息显示「已读/未读」 |
| **多行输入** | Textarea 自动扩展高度（最大 120px），Shift+Enter 换行 |
| **Emoji 面板** | 5行×10列共 50 个表情，点击追加到输入框 |
| **图片发送** | 选择图片 → base64 DataURL → 发送；点击放大预览（Lightbox） |
| **下拉加载历史** | 「查看更早的消息」按钮 → 分页加载（每页 40 条） |
| **发送失败提示** | 网络失败显示「发送失败」红色标注 |
| **自动滚底** | 新消息到达自动 smooth scroll 到底部 |
| **打分反馈** | 右上角「打分」→ 弹出三维度评分弹窗 |

### 6.2 交互流程

```
[进入 /matches/[id]/chat]
  1. 并发加载：匹配详情（获取对方名字）+ 最近 40 条消息
  2. 立即滚到底部（instant，无动画）
  3. 建立 SSE 连接 /api/matches/[id]/chat/stream?after=<lastMsgTime>

[用户发消息]
  → setInput("")（清空输入框）
  → 插入 pending 气泡（乐观显示）
  → POST /api/matches/[id]/chat { content }
    → 成功：用真实消息替换 pending（消除 loading 状态）
    → 失败：标记 failed = true，显示红色提示

[收到 SSE event: messages]
  → mergeMessages()（去重 + 时间排序合并）
  → 触发 scrollToBottom()
  → 自动标记已读（POST .../chat/read）

[SSE 断开]
  → 2 秒后自动重连（携带最新消息时间戳 after=...）

[滚到顶部点「查看更早的消息」]
  → GET /api/matches/[id]/chat?before=<oldestMsgTime>&limit=40
  → 保持当前滚动位置（记录 scrollHeight，prepend 后还原）
```

### 6.3 SSE 技术原理

**端点**：`GET /api/matches/[id]/chat/stream`

```
客户端 EventSource → 服务器 ReadableStream（Next.js Response）
  ├── 每 800ms 查询 DB：createdAt > lastSeenAt 的新消息
  ├── 有新消息 → 发送 event: messages 事件
  ├── 无新消息 → 检查对方是否更新了已读时间 → 发送 event: read_update
  ├── 55 秒后 → 发送 event: reconnect（防止 Neon serverless 超时）
  └── 客户端收到 reconnect → 关闭旧连接 → 1 秒后重连
```

**为什么不用 WebSocket？**
> Next.js App Router 的 Serverless Functions 不支持持久 WebSocket 连接，SSE 是最适合当前架构的实时方案（单向服务端推送 + 客户端 REST API 发消息的混合模式）。

### 6.4 消息结构

```typescript
type BubbleMsg = {
  id: string;           // cuid（后端）或 "pending_N"（乐观）
  senderType: "user_self" | "user_target";
  content: string;      // 文本 | "IMAGE_DATA:<base64>"
  createdAt: string;    // ISO 8601
  readByOther?: boolean;
  pending?: boolean;    // 乐观消息专用
  failed?: boolean;     // 发送失败标记
};
```

### 6.5 图片处理

- 前端限制：文件 ≤ 300KB
- 以 `IMAGE_DATA:<base64 DataURL>` 形式存储在 `MatchMessage.content`
- 渲染时检测前缀，显示为 `<img>` 标签；点击弹出全屏 Lightbox
- ⚠️ 后续可替换为 OSS（阿里云/S3）存储，只在 DB 存 URL

---

## 7. 评分报告与关系洞察

### 7.1 评分报告（`/matches/[id]/report`）

显示五维度雷达图式评分：

| 维度 | 数据来源 |
|---|---|
| 兴趣契合度 | 向量余弦相似度（65%）+ 聊天节奏（35%） |
| 性格互补度 | 情绪风格分析 |
| 价值观契合 | 关键词匹配分析 |
| 人生故事 | 对话深度指数（平均 dialogDepth） |
| 未来潜力 | 依恋类型兼容性 |

还包含：
- 推荐理由列表（向量相似度数值 + 各维度描述）
- `demoMatchReport` 补充数据（性格色彩、核心价值观等）

### 7.2 关系洞察（`/matches/[id]/relationship`）

- `relationshipInsights.ts` 模块分析双方的互动模式
- 给出「两人聊天风格」「潜在摩擦点」「共同发展方向」等洞察

---

## 8. 丘比小镇（社区广场）

### 8.1 功能

小镇是独立于「心动匹配」的社区模块，用于：
- 发帖找特定类型的人（比赛队友、创业伙伴、旅游搭子等）
- 帖子浏览与申请
- 双人对话（小镇对话频道，区别于匹配聊天）

### 8.2 页面路由

```
/town                        → 小镇首页（我的帖子 + 探索）
/town/explore                → 发现他人帖子
/town/messages               → 我的小镇对话列表
/town/my-needs               → 我发布的需求
/town/conversations/[id]     → 具体对话
```

### 8.3 数据模型

```
TownPost（帖子）
  └── TownCandidateRound（候选轮次：AI 推荐候选人）
  └── TownConversation（双人对话）
        └── TownConversationMessage（消息）
        └── TownConversationRead（已读状态）
```

### 8.4 技术原理

- **候选推荐**：`townMatching.ts` + `townSecondMe.ts`，根据帖子内容从 SecondMe 获取相似用户
- **分类**：`townTaxonomy.ts` 对帖子内容做分类标签
- **对话隔离**：小镇对话与匹配聊天完全独立（不同表），但用同样的已读逻辑

---

## 9. 数字体（SecondMe 集成）

### 9.1 功能

SecondMe 是丘比的 AI 底座，提供：
- **聊天流（`/api/secondme/chat/stream`）**：SSE 流式对话，丘比用此驱动 Agent 聊天
- **用户画像（`/api/secondme/user/shades`）**：兴趣标签，注入 Prompt
- **结构化行动（`/api/secondme/act/stream`）**：处理结构化任务

### 9.2 数字体在丘比中的角色（当前版本）

| 功能 | 状态 |
|---|---|
| Agent 双人预聊 | 代码已保留，产品入口已关闭（以真实匹配为主） |
| 主人信息沉淀 | 聊天时学习用户信息，存入 `OwnerFact` 表 |
| 首页聊天窗口 | 通过 `/api/chat/stream` 透传 SecondMe 聊天 |
| 主人对话（owner-chat） | 帮助用户完善自我描述，沉淀到数字体 |

### 9.3 数字体学习机制

```
用户真人聊天发消息
  → excerptForOwnerLearning() 提取关键信息片段
  → appendOwnerFact(userId, excerpt, "human_chat")
    → POST SecondMe API → 写入数字体记忆
  → 下次匹配时 ownerFacts 会参与 UserModel 构建
```

---

## 10. 通知与已读状态

### 10.1 消息已读

- **匹配聊天**：`MatchRead` 表存储每个 Match + 每个 User 最后阅读时间
- **小镇对话**：`TownConversationRead` 表同上
- **前端展示**：最后一条自己发的消息：`readByOther = otherReadAt >= msgCreatedAt`
- **触发时机**：用户打开聊天页 / 新 SSE 消息到达时自动调用 `/chat/read`

### 10.2 未读气泡（主页）

- 匹配列表页（`/matches`）统计未读数，显示红色角标
- 小镇消息页（`/town/messages`）同上

---

## 11. 数据库设计

### 核心表关系

```
User ──┬── UserPreference（1:1 心动设置）
       ├── UserEmbedding（1:1 资料向量）
       ├── OwnerFact[]（记忆条目）
       ├── Session[]（登录会话）
       ├── Match[]（作为发起方）──── MatchScore[]（评分）
       │                          ├── MatchMessage[]（消息）
       │                          ├── MatchFeedback[]（反馈）
       │                          └── MatchRead[]（已读）
       ├── TownPost[]（发帖）
       └── TownConversation[]（小镇对话）──── TownConversationMessage[]
```

### 关键索引

```sql
-- 消息查询（聊天加载、SSE 轮询）
INDEX match_messages(match_id)
INDEX match_messages(match_id, created_at)  -- 分页 before/after

-- 匹配列表
INDEX matches(user_id)
INDEX matches(target_user_id)

-- 记忆条目
INDEX owner_facts(user_id, created_at)
```

---

## 12. 部署与环境变量

### 环境变量（`.env.local`）

```env
# 数据库
DATABASE_URL=postgresql://...

# SecondMe OAuth
SECONDME_CLIENT_ID=...
SECONDME_CLIENT_SECRET=...
SECONDME_REDIRECT_URI=https://your-domain.com/api/auth/callback

# SecondMe API
SECONDME_API_BASE_URL=https://api.mindverse.com/gate/lab
SECONDME_OAUTH_URL=https://go.second.me/oauth/
SECONDME_TOKEN_ENDPOINT=.../api/oauth/token/code
SECONDME_REFRESH_ENDPOINT=.../api/oauth/token/refresh
```

### 常用命令

```bash
# 本地开发
npm run dev            # 默认端口（通常 3000）
npm run dev:3456       # 固定 127.0.0.1:3456

# 数据库
npx prisma generate    # 更新 Prisma Client（改 schema 后必须执行）
npx prisma db push     # 同步 schema 到数据库（需要 DATABASE_URL 环境变量）
npx prisma studio      # 可视化数据库编辑器

# 构建
npm run build          # 执行 prebuild（db push）+ next build
npm run clean          # 清理 .next 缓存
```

---

## 附录：版本记录

| 版本 | 日期 | 变更摘要 |
|---|---|---|
| v0.1.0 | 2026-04 | 初版：SecondMe OAuth、匹配、Agent 聊天 |
| v0.2.0 | 2026-04-20 | **双向心动筛选管道** · **向量匹配引擎** · **SSE 实时聊天** · **微信风格聊天 UI** · 数据库新增 gender/age/UserEmbedding |

---

*本文档由 AI 辅助生成，基于当前代码库实际实现情况编写，所有功能均有对应代码。*
