# Tasks: SecondMe Skills 工作流重构

**Input**: Design documents from `/specs/001-secondme-skills-refactor/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/skills-interface.md

**Tests**: 无自动化测试需求（Skills 项目通过手动测试验证）

**Organization**: 任务按 User Story 组织，每个 story 可独立实现和测试

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（不同文件，无依赖）
- **[Story]**: 所属 User Story（US1, US2, US3, US4）
- 描述中包含精确文件路径

## Path Conventions

```text
skills/
├── secondme-init/
│   └── SKILL.md
├── secondme-prd/
│   └── SKILL.md
└── secondme-nextjs/
    └── SKILL.md
```

---

## Phase 1: Setup (项目准备)

**Purpose**: 创建 skill 目录结构，清理旧文件

- [x] T001 创建 skills/secondme-init/ 目录
- [x] T002 创建 skills/secondme-prd/ 目录
- [x] T003 删除 skills/secondme-reference/ 目录（已废弃）
- [x] T004 备份 skills/secondme-nextjs/SKILL.md 到 skills/secondme-nextjs/SKILL.md.bak

---

## Phase 2: Foundational (基础组件)

**Purpose**: 无阻塞性基础组件（Skills 项目不需要传统基础设施）

**⚠️ 本阶段为空**: Skills 项目无需数据库/框架等基础设施，直接进入 User Story 实现

**Checkpoint**: 目录结构就绪，可开始 User Story 实现

---

## Phase 3: User Story 1 - 项目初始化与模块选择 (Priority: P1) 🎯 MVP

**Goal**: 开发者可以运行 `/secondme-init` 配置凭证、选择模块，生成 state.json 和 CLAUDE.md

**Independent Test**: 运行 `/secondme-init`，验证 `.secondme/state.json` 和 `CLAUDE.md` 已创建且内容正确

### Implementation for User Story 1

- [x] T005 [US1] 创建 skills/secondme-init/SKILL.md 基础框架（frontmatter + 概述）
- [x] T006 [US1] 实现配置收集流程：Client ID、Client Secret、Redirect URI、Database URL
- [x] T007 [US1] 实现功能模块选择界面（auth 必选 + profile/chat/note 可选）
- [x] T008 [US1] 实现模块依赖解析逻辑（选择 chat 自动包含 auth）
- [x] T009 [US1] 实现 state.json 生成逻辑（version、stage、modules、config 字段）
- [x] T010 [US1] 实现 CLAUDE.md 生成逻辑（API 文档链接、关键信息、已选模块）
- [x] T011 [US1] 实现配置已存在时的更新流程（显示摘要、允许修改）
- [x] T012 [US1] 添加 .gitignore 提醒输出
- [x] T013 [US1] 添加下一步操作提示输出

**Checkpoint**: `/secondme-init` 完整可用，可独立验证

---

## Phase 4: User Story 2 - 需求 PRD 对话式定义 (Priority: P2)

**Goal**: 开发者可以运行 `/secondme-prd` 通过对话定义需求，更新 state.json 的 prd 字段

**Independent Test**: 运行 `/secondme-prd`，通过对话后验证 state.json 的 prd 字段已填充，stage 更新为 "prd"

### Implementation for User Story 2

- [x] T014 [US2] 创建 skills/secondme-prd/SKILL.md 基础框架（frontmatter + 概述）
- [x] T015 [US2] 实现前置条件检查（state.json 存在且 stage >= init）
- [x] T016 [US2] 实现第一轮对话：根据已选模块展示 API 能力
- [x] T017 [US2] 实现第二轮对话：收集核心需求（应用目标、目标用户）
- [x] T018 [US2] 实现第三轮对话：根据模块针对性提问
- [x] T019 [US2] 实现第四轮对话：设计偏好收集
- [x] T020 [US2] 实现第五轮对话：需求确认总结
- [x] T021 [US2] 实现 state.json 更新逻辑（prd 字段、stage 设为 prd）
- [x] T022 [US2] 实现已完成 PRD 时的重新定义流程
- [x] T023 [US2] 添加下一步操作提示输出

**Checkpoint**: `/secondme-prd` 完整可用，可独立验证

---

## Phase 5: User Story 3 - Next.js 项目生成 (Priority: P2)

**Goal**: 开发者可以运行 `/secondme-nextjs` 生成完整的 Next.js 项目

**Independent Test**: 运行 `/secondme-nextjs`，生成的项目可启动并完成 OAuth 登录

### Implementation for User Story 3

- [x] T024 [US3] 重构 skills/secondme-nextjs/SKILL.md 基础框架（更新 frontmatter、添加 argument-hint）
- [x] T025 [US3] 实现前置条件检查（state.json 存在，stage >= prd 或 --quick）
- [x] T026 [US3] 实现 state.json 读取和配置提取
- [x] T027 [US3] 实现 auth 模块代码生成模板（User 表核心字段、OAuth 路由）
- [x] T028 [US3] 实现 profile 模块代码生成模板（User 表扩展字段、个人资料组件）
- [x] T029 [US3] 实现 chat 模块代码生成模板（Session 表、聊天界面、流式响应）
- [x] T030 [US3] 实现 note 模块代码生成模板（笔记 API）
- [x] T031 [US3] 实现 .env.local 生成逻辑
- [x] T032 [US3] 实现 prisma/schema.prisma 动态生成逻辑
- [x] T033 [US3] 实现项目结构创建流程
- [x] T034 [US3] 实现 stage 更新为 ready
- [x] T035 [US3] 添加启动步骤提示输出
- [x] T036 [US3] 保留并整合现有 SKILL.md 中的前端设计要求和技术栈说明

**Checkpoint**: `/secondme-nextjs` 完整可用，可独立验证

---

## Phase 6: User Story 4 - 快速模式 (Priority: P3)

**Goal**: 开发者可以使用 `--quick` 参数跳过 PRD 阶段

**Independent Test**: 运行 `/secondme-init` 后直接运行 `/secondme-nextjs --quick`，项目成功生成

### Implementation for User Story 4

- [x] T037 [US4] 在 skills/secondme-nextjs/SKILL.md 中实现 --quick 参数检测
- [x] T038 [US4] 实现快速模式的默认 PRD 配置逻辑
- [x] T039 [US4] 验证快速模式下 stage 检查被正确跳过

**Checkpoint**: 快速模式完整可用，可独立验证

---

## Phase 7: Polish & 收尾工作

**Purpose**: 文档更新和最终验证

- [x] T040 [P] 更新 skills/secondme-nextjs/SKILL.md.bak 对比，确认无遗漏功能
- [x] T041 [P] 验证完整流程：init → prd → nextjs
- [x] T042 [P] 验证快速流程：init → nextjs --quick
- [x] T043 删除 skills/secondme-nextjs/SKILL.md.bak 备份文件
- [x] T044 更新项目 README.md（如需要）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: 无依赖，立即开始
- **Phase 2 (Foundational)**: 空，跳过
- **Phase 3-6 (User Stories)**: 依赖 Phase 1 完成
- **Phase 7 (Polish)**: 依赖所有 User Stories 完成

### User Story Dependencies

- **User Story 1 (P1)**: 无依赖 - 入口 skill
- **User Story 2 (P2)**: 逻辑上依赖 US1（需要 state.json），但 skill 文件可并行开发
- **User Story 3 (P2)**: 逻辑上依赖 US1/US2（需要 state.json），但 skill 文件可并行开发
- **User Story 4 (P3)**: 依赖 US3 完成（是 US3 的功能扩展）

### Parallel Opportunities

由于是 Skills 项目（每个 skill 一个独立 SKILL.md 文件），以下任务可并行：

```bash
# Phase 1 可并行:
T001, T002, T003, T004

# US1, US2, US3 的基础框架可并行:
T005, T014, T024
```

---

## Implementation Strategy

### MVP First (仅 User Story 1)

1. 完成 Phase 1: Setup
2. 完成 Phase 3: User Story 1 (secondme-init)
3. **STOP 验证**: 测试 `/secondme-init` 完整功能
4. 可交付 MVP

### Incremental Delivery

1. 完成 Setup → 目录结构就绪
2. 完成 US1 (init) → 可独立使用 init skill
3. 完成 US2 (prd) → 可使用完整流程
4. 完成 US3 (nextjs) → 项目生成功能可用
5. 完成 US4 (quick mode) → 快速模式可用
6. 每个阶段都可独立验证和交付

### Suggested Execution Order

```
T001-T004 (Setup) → T005-T013 (US1) → T014-T023 (US2) → T024-T036 (US3) → T037-T039 (US4) → T040-T044 (Polish)
```

---

## Summary

| 指标 | 值 |
|------|-----|
| **总任务数** | 44 |
| **User Story 1 任务** | 9 (T005-T013) |
| **User Story 2 任务** | 10 (T014-T023) |
| **User Story 3 任务** | 13 (T024-T036) |
| **User Story 4 任务** | 3 (T037-T039) |
| **Setup 任务** | 4 (T001-T004) |
| **Polish 任务** | 5 (T040-T044) |
| **并行机会** | Setup 阶段全并行；US1/US2/US3 基础框架可并行 |
| **MVP 范围** | User Story 1 (secondme-init) |

---

## Notes

- 本项目为 Claude Code Skills 项目，无传统测试框架
- 每个 skill 通过手动运行验证
- [US*] 标签映射到 spec.md 中的 User Story
- 完成后删除 .bak 备份文件
- 保持 SKILL.md 文件简洁（< 500 行）
