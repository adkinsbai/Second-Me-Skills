# Second-Me-Skills Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-05

## Active Technologies

- Markdown (Claude Code Skills format) + Claude Code Skills framework, AskUserQuestion tool (001-secondme-skills-refactor)

## Project Structure

```text
src/
tests/
```

## Commands

# Add commands for Markdown (Claude Code Skills format)

## Code Style

Markdown (Claude Code Skills format): Follow standard conventions

## Recent Changes

- 001-secondme-skills-refactor: Added Markdown (Claude Code Skills format) + Claude Code Skills framework, AskUserQuestion tool

<!-- MANUAL ADDITIONS START -->
### 本地开发排障

- **报错 `Cannot find module './xxx.js'`（.next 里缺 chunk）**：多为热更新/中断编译后缓存不一致。执行 **`npm run clean`** 后重新 **`npm run dev`** 或 **`npm run build`**。
- **固定端口启动**：`npm run dev:3456` → 浏览器打开 **http://127.0.0.1:3456**（避免与本机已占用的 3000/3001 冲突）。
- **`npm run dev` 若提示端口被占用**：Next 会自动改用 `3001` 等端口，请以终端里 **Local: http://localhost:xxxx** 为准，不要死盯 `3000`。
- **匹配首页视觉**：当前为「流动心形 + 中央炫彩 Q（丘比）」纯 CSS/SVG，无 WebGL，避免部分环境闪退。
<!-- MANUAL ADDITIONS END -->

---

## SecondMe 集成项目

### 应用信息

- **App Name**: 丘比
- **Client ID**: 42d59423-***（完整值见 `.secondme/state.json`）

### API 文档

开发时请参考官方文档（从 `.secondme/state.json` 的 `docs` 字段读取）：

| 文档 | 配置键 |
|------|--------|
| 快速入门 | `docs.quickstart` |
| OAuth2 认证 | `docs.oauth2` |
| API 参考 | `docs.api_reference` |
| 错误码 | `docs.errors` |

### 关键信息

- API 基础 URL: `https://api.mindverse.com/gate/lab`
- OAuth 授权 URL: `https://go.second.me/oauth/`
- Access Token 有效期: 2 小时
- Refresh Token 有效期: 30 天

> 所有 API 端点配置请参考 `.secondme/state.json` 中的 `api` 和 `docs` 字段

### 已选模块

- **auth** ✓（OAuth 认证，必选）
- **profile** ✓（用户信息、兴趣标签、软记忆）
- **chat** ✓（聊天）
- **act** ✓（结构化动作）
- **note** ✓（笔记/记忆）

### 权限列表 (Scopes)

| 权限 | 说明 | 状态 |
|------|------|------|
| `user.info` | 用户基础信息 | ✅ 已授权 |
| `user.info.shades` | 用户兴趣标签 | ✅ 已授权 |
| `user.info.softmemory` | 用户软记忆 | ✅ 已授权 |
| `chat` | 聊天功能 | ✅ 已授权 |
| `note.add` | 添加笔记 | ✅ 已授权 |
