## Why

在本项目早期演进过程中，架构路线图（`overall-recovery-canonical-state-and-delegation-roadmap.md`）曾采用阶段性攻坚代号 `C1`（Recovery Observability）、`C2`（Style Freshness Checkpoint）、`C3`（Topic State Mutation Pipeline）、`C4`（Worker Fallback）与 `C5`（Post-Final Reentry Lineage）。

随着系统走向成熟，这些无自解释性的单字母里程碑代号（`C1~C5`）残留在规范文本、引导面、工作流节点、诊断错误信息以及测试断言中，构成了严重的“黑话壁垒”与认知负担。无论对于人类开发者还是 LLM Coding Agent，这些代号都无法望文生义，必须频繁翻阅历史文档甚至产生状态混淆。

为了提升系统的可维护性、降低 Agent 认知负荷，本 Change 按照领域驱动设计（DDD）与语义精准性原则，彻底淘汰所有活跃 `C1`~`C5` 代号，全面升级为具备直观业务语义的领域命名：
- `C1` → `StateHealthCheck`（状态健康巡检）
- `C2` → `ResearchConfigLock`（调研配置定稿单）
- `C3`（含 `C3A`/`C3B`）→ `TopicTreeEvolution`（课题大纲演进管线）
- `C4` → `WorkerFallback`（智能体降级容灾）
- `C5` → `ReopenResearchPass`（终态重开通行证）

## What Changes

1. **词汇正典与引导层**：
   - 更新 `CONTEXT.md` 与 `invariants-brief.md`，将 Core Ownership Terms 和罗塞塔石碑中的 C1~C5 全面替换为具名领域概念。
2. **核心规范层 (OpenSpec Specs)**：
   - 更新 `openspec/specs/` 中涉及历史代号的 8 份 main spec，将正文与场景中的 C1~C5 替换为具名术语（如 `research-styles`、`canonical-topic-state`、`post-final-recovery`、`content-delivery-phase-content`、`cli-phase-transition`、`runtime-reentry-debuggability`、`agent-command-surface`、`run-entry`）。
3. **框架控制面与工作流 (Harness & Workflows)**：
   - 更新 `DEEP_RESEARCH_HARNESS/RUN.md`、`COMMANDS.md`、`README.md`。
   - 更新 `phase-final.md`、`phase-rerun.md`、`shared-*.md` 及 `command_playbook/` 系列文档。
4. **引擎诊断与错误信息**：
   - 将 `handoff-helpers.mjs` 等模块向 Agent 暴露的 `reason` 和 `recommended_action` 诊断文本更新为自解释术语。
5. **测试套件与回归断言**：
   - 同步更新测试套件中的字符串匹配断言（如 `guidance-terminology-pointer-consistency.test.mjs`、`post-final-rerun-lineage-continuity.test.mjs` 等）。

## Capabilities

### New Capabilities
None.

### Modified Capabilities
None.

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `research/research-styles` | `openspec/specs/research/research-styles/spec.md` | Excluded | 属于纯术语具名化重构，无 requirement 行为变更（通过 skip_specs 声明） |
| `research/canonical-topic-state` | `openspec/specs/research/canonical-topic-state/spec.md` | Excluded | 属于纯术语具名化重构，无 requirement 行为变更（通过 skip_specs 声明） |
| `research/post-final-recovery` | `openspec/specs/research/post-final-recovery/spec.md` | Excluded | 属于纯术语具名化重构，无 requirement 行为变更（通过 skip_specs 声明） |
| `research/content-delivery-phase-content` | `openspec/specs/research/content-delivery-phase-content/spec.md` | Excluded | 属于纯术语具名化重构，无 requirement 行为变更（通过 skip_specs 声明） |
| `engine/cli-phase-transition` | `openspec/specs/engine/cli-phase-transition/spec.md` | Excluded | 属于纯术语具名化重构，无 requirement 行为变更（通过 skip_specs 声明） |
| `engine/runtime-reentry-debuggability` | `openspec/specs/engine/runtime-reentry-debuggability/spec.md` | Excluded | 属于纯术语具名化重构，无 requirement 行为变更（通过 skip_specs 声明） |

## Impact

- 消除系统核心控制面的历史暗号与认知摩擦；
- 所有现有业务状态流转、门控与哈希校验保持 100% 行为等价；
- 治理检查（`npm run governance:check`）与全量回归测试保持 100% 通过。
