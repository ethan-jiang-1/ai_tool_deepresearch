## Why

HITL2 的 `rerun` 决策目前是"Agent 读 profile，从 seed-topics 全量重跑"——没有增量语义（已有 work 全丢弃），rerun-prep 逻辑散落在 Agent 临时判断里（无单一 owner，无 gate 验证）。引入专职 `phase-rerun` node，把 rerun-prep 收拢为一个薄层 phase，让下游 phase 通过 profile 自然感知 rerun 并以 delta 模式补充而非替代。

## What Changes

- **新增 `phase-rerun` node**：HITL2 `user_decision: rerun` 后 Agent 用 `rerun` outcome 查 chain，进入分析层 phase。核心智力工作——对比 HITL2 rationale（用户意图）与 seed_topics 现状（已有 topic 和深度），推断 topic 调整方案（保留、新增、补充维度、移除），更新 profile，gate pass 后 chain 接管进入 seed-topics → wave0 → wave1 → wave2 增量链
- **新增 `gate-rerun-ready`**：确定性 gate，4 rules（rationale 非空、rerun_count < 3、bundle 结构合法、status 一致），`stop: "no"`
- **HITL2 chain 双出口**：`passed` → readiness（正常交付），`rerun` → rerun node（增量重跑）。模式与 gate-fork 一致——`user_decision` 的确定性值编码为 chain outcome，Engine 查表返回 next
- **更新 `phase-hitl2.md` §6**：`rerun` 行为从"Agent 从 seed-topics 重新跑"改为"Agent 用 `rerun` outcome 查 chain → 进入 phase-rerun.md"；§9 anti-cheating rule 措辞更新为区分确定性出口与不确定 branch
- **profile 新增字段**：`rerun_count`（integer，追踪 rerun 轮次）。方向 hints 写入 `seed_topics/{slug}.md` 的 `## 本轮重跑方向` section（per-topic，下游 phase 直接读取执行）。不新增 `rerun_feedback` string 字段——全局 prose 无法被下游 phase 按 topic 粒度机械执行，且 per-topic 指令与 topic 文件放在一起是自然落点
- **下游 phase 加 rerun-aware 指引**：seed-topics/wave0/wave1/wave2 读 `rerun_count > 0` → supplement 模式

## Capabilities

### New Capabilities

- `rerun-incremental-node`: 专职 rerun-prep phase node——把 HITL2 rerun decision + rationale 翻译为增量重跑上下文（profile 更新、rerun 计数、上下文标记），让下游 phase 能以 delta 模式运行

### Modified Capabilities

- `transition-table`: HITL2 chain entry 新增 `rerun` 出口（`→ phase-rerun.md`），保留 `passed` 出口（`→ phase-readiness.md`）；新增 `phase-rerun.md → passed → phase-seed-topics.md`
- `schema-core`: `ProfileSchema` 新增 `rerun_count` 字段（追踪 rerun 轮次）；`HITL2UserDecision` enum 保持不变
- `workflow-directory-contract`: `manifest.json` phases 数组新增 rerun 条目
- `gate-skeleton`: `gate-helpers.mjs` 新增 `writeGateAttempt()` 统一 audit 写入（logger + trace），消除 9 个 gate CLI 重复代码

## Impact

- **新增文件**: `phase-rerun.md`、`gate-rerun-ready.definition.json`、`check-gate-rerun-ready.mjs`
- **修改文件**: `manifest.json`、`transitions.chain.json`、`ask-next.mjs`（VALID_OUTCOMES）、`enums.mjs`（CurrentGate 加 `rerun_ready`）、`phase-hitl2.md`、`shared-profile.md`、`gate-helpers.mjs`（writeGateAttempt）、各 wave phase MD（seed-topics、wave0、wave1、wave2）加 rerun-aware 指引
- **不动**: 不确定的 branch（`request_view_revision`、`repair`、`stop_blocked`）不进 chain——目标不确定或无 transition，仍归 Agent 层
- **依赖**: 无新增 npm 依赖，全部用现有 zod + yaml + Node 内置
