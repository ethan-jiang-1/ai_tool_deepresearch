## 1. Schema & Profile 变更

- [x] 1.1 实现 SCO-001: `enums.mjs` `CurrentGate` enum 新增 `rerun_ready`（`z.enum([..., 'rerun_ready'])`），`StatusSchema` 的 `current_gate`/`next_gate` 依赖此 enum — `DPT_FRAMEWORK/schema/enums.mjs`
- [x] 1.2 实现 REI-002: ProfileSchema 新增 `rerun_count`（`z.number().int().min(0).default(0)`）字段。方向 hints 不进 profile——写入 `seed_topics/{slug}.md` 的 `## 本轮重跑方向` section — `DPT_FRAMEWORK/schema/contracts/profile.mjs`
- [x] 1.3 实现 SCO-002: `shared-profile.md` 文档化 `rerun_count` 字段（类型、填写时机、gate 行为）；注明方向 hints 在 seed_topic 文件中 — `DPT_FRAMEWORK/workflows/nodes/shared/shared-profile.md`

## 2. 新增 phase-rerun.md Node

- [x] 2.1 实现 REI-001: 创建 `phase-rerun.md` phase node，含 frontmatter（`node_type: phase`, `id: phase-rerun`, `phase: rerun`, `gate: rerun-ready`, `stop: no`, `requires: ["shared/shared-profile"]`, `suggested_context: ["shared/shared-anti-cheating-rules"]`）和 body。Body 指引 Agent 做三阶段智力工作：**(1) 读输入** — HITL2 rationale + seed_topics 现状（topic 清单、深度、方向）；**(2) 对比推断** — 产出 topic 调整方案（保留/补充维度/新增/移除）并写入 seed_topics 或 profile；**(3) 记录执行** — 增 rerun_count、更新 `rb_status.json` → 运行 gate CLI → pass 则 chain 进 seed-topics，fail 则停止告知用户。MUST NOT 删除 artifacts。MUST 读当前 `rerun_count` 后再递增——若字段缺失则初始化为 1，若已有值则 `+1`。MUST 检查 `seed_topics/` 非空——若意外为空，退化为全量重跑模式并告知用户 — `DPT_FRAMEWORK/workflows/nodes/phases/phase-rerun.md`

## 3. 新增 Gate Definition & CLI

- [x] 3.1 实现 REI-003: 创建 `gate-rerun-ready.definition.json`（4 rules: `rerun_rationale_present`、`rerun_count_valid`、`bundle_structure_valid`、`status_consistent`）— `DPT_FRAMEWORK/schema/gate_definitions/gate-rerun-ready.definition.json`
- [x] 3.2 实现 REI-003: 创建 `check-gate-rerun-ready.mjs` gate CLI（`--bundle` + `--current-node` flags，加载 definition，执行 rule evaluation，返回 check/inspect/advice）— `DPT_FRAMEWORK/cli/gates/check-gate-rerun-ready.mjs`

## 4. Chain & Manifest 更新

- [x] 4.1 实现 REI-004 / TRT-001: `transitions.chain.json` HITL2 entry 新增 `rerun` 出口（`→ phases/phase-rerun.md`），保留 `passed` 出口（`→ phases/phase-readiness.md`）；新增 `phases/phase-rerun.md → passed → phases/phase-seed-topics.md` — `DPT_FRAMEWORK/workflows/transitions.chain.json`
- [x] 4.2 实现 WDC-002: `manifest.json` phases 数组新增 `{ "key": "rerun", "node": "phases/phase-rerun.md", "gate": "rerun-ready" }` — `DPT_FRAMEWORK/workflows/manifest.json`
- [x] 4.3 扩展 `ask-next.mjs` `VALID_OUTCOMES` 数组为 `['passed', 'failed', 'rerun']`（当前硬编码 `['passed', 'failed']`，`rerun` 会被拒绝为 `invalid_input`）。保留输入校验层——不采用移除校验的方案，保留对 Agent 拼写错误的 defensive validation — `DPT_FRAMEWORK/engine/ask-next.mjs`

## 5. 更新 Guidelines & Phase MD

- [x] 5.1 更新 `guidelines/agentic-workflow-mechanism.md`：重写 §transitions.chain.json 描述、§MUST（line 147）、§MUST NOT（line 155）、§Chain Completeness 中关于 chain 只编码 `passed` 边的规则。引入「确定性出口」概念：`passed` 和 `rerun` 都是 gate 确定产出或用户明确选择、有固定 next-node 目标的 outcome，应进 chain。不确定 branch（`request_view_revision`、`repair`、`stop_blocked`）仍归 Agent。消除与 design Decision 2 的直接矛盾 — `guidelines/agentic-workflow-mechanism.md`
- [x] 5.2 更新 `phase-hitl2.md` §6 `rerun` 行为：从"Agent 从 seed-topics 重新跑"改为"Agent 用 `rerun` outcome 查 chain → 进入 phase-rerun.md"。§9 anti-cheating rule 从枚举式改为**原则式**：将"MUST NOT 将 branch routing 编码进 chain——proceed_to_readiness 是 chain 唯一的 normal next，其余 3 个 decision 归 Agent"替换为——「确定性出口（有固定、上下文无关的 next-node 目标）SHALL 进 chain；不确定 branch（目标依赖 Agent 判断运行时状态）归 Agent。当前确定性出口：`passed`、`rerun`。不确定：`request_view_revision`、`repair`、`stop_blocked`」。另加：HITL2 phase 写 `human_decision_checkpoints/hitl2` 时 MUST preserve 已有的 `rerun_count` 值——MUST NOT 重置或删除 — `DPT_FRAMEWORK/workflows/nodes/phases/phase-hitl2.md`
- [x] 5.3 更新 `shared-anti-cheating-rules.md`：**(a)** rule 9 当前描述 rerun 为"Agent 从 seed-topics 重新跑"——更新为新的 rerun 路径（chain → phase-rerun → gate → seed-topics）。**(b)** 新增一条跨 phase 共享原则（或扩展现有 authority boundary section）：**确定性出口原则**——「某 outcome 是否应进 chain 的判断标准：该 outcome 是否有固定、上下文无关的 next-node 目标。有 → 确定性出口，进 chain。目标依赖 Agent 判断运行时状态 → 不确定 branch，归 Agent。」此原则不绑定具体 decision 名称，可跨 phase 复用 — `DPT_FRAMEWORK/workflows/nodes/shared/shared-anti-cheating-rules.md`
- [x] 5.4 更新 `phase-seed-topics.md`：加 rerun-aware section（读 `rerun_count > 0` → 调整 topic 而非从零发现；保留已有 topic，按 rationale 调整深度/方向；添加/移除 topic）。**P0**——rerun node 直接 chain 进此 phase，必须有明确增量行为 — `DPT_FRAMEWORK/workflows/nodes/phases/phase-seed-topics.md`
- [x] 5.5 更新 `phase-wave0.md`：加 rerun-aware section，包含——**(a) 检测**：读 `rerun_count > 0` + 各 topic 的 `## 本轮重跑方向` section。**(b) 保留判断**：已有 topic 无 `本轮重跑方向` section → reference 全部保留。已有 topic 有 `action: supplement` → 保留已有 reference，追加新维度搜索。**(c) 新增 topic**：`action: add` → 全量搜索，与首次 wave0 一致。**(d) 移除 topic**：`action: remove` → 该 topic 的 reference 保留但标记为 deprecated，不再搜索 — `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md`
- [x] 5.6 更新 `phase-wave1.md`：加 rerun-aware section，包含——**(a) 检测**：同上。**(b) 已有 topic 无变更**：deepening 已完成的 claim 跳过。**(c) 已有 topic 有 supplement**：只对 `new_search_dimensions` 中新增的角度做 deepening，已有维度的 deepening 结果保留。**(d) 新增 topic**：全量 deepening — `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md`
- [x] 5.7 更新 `phase-wave2.md`：加 rerun-aware section，包含——**(a) 检测**：同上。**(b) merge 策略**：已有 synthesis 保留为 baseline；新增/变更 topic 的 synthesis 作为 delta section 追加（`## Delta Synthesis (Rerun N)`），不覆盖原有 section。**(c) 冲突处理**：若新 synthesis 与旧 synthesis 结论矛盾，标注冲突而非静默覆盖，交由 HITL2 人类裁决 — `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave2.md`

## 6. Audit Infrastructure（Logger 接入 + Trace 收拢）

- [x] 6.1 实现 GSK-005: 在 `gate-helpers.mjs` 新增 `writeGateAttempt(bundlePath, result)` — 统一写入 logger（`_logs/run.log`，全量诊断）和 trace（`rb_trace.jsonl`，结构化 evidence），消除 9 个 gate CLI 中的重复代码 — `DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs`
- [x] 6.2 实现 GSK-005: 以 `check-gate-hitl2-recorded.mjs` 为范例迁移到 `writeGateAttempt()`，作为其余 gate CLI 的参考模式 — `DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs`
- [x] 6.3 实现 GSK-005: 新增的 `check-gate-rerun-ready.mjs` 直接使用 `writeGateAttempt()`，不复制内联 trace 写入代码

## 7. 回归测试

- [x] 7.1 新增 transition chain 测试：验证 HITL2 `passed` → readiness、HITL2 `rerun` → rerun node、rerun node `passed` → seed-topics 三条 edge；验证 `request_view_revision` 返回 `no_transition`；验证 rerun node `failed` 返回 `no_transition` — `tests/engine/transition-chain.test.mjs`
- [x] 7.2 新增 gate-rerun-ready CLI 测试：验证 4 rules 各 pass/fail 场景（rationale 空、count 超限、目录缺失、status 不一致）— `tests/engine/gates/check-gate-rerun-ready.test.mjs`
- [x] 7.3 新增 ProfileSchema 测试：验证 rerun_count 默认值、合法值、负值拒绝、rerun_feedback 可选 — `tests/schema/profile.test.mjs`

## 8. Playbook 实验

> 遵循 `guidelines/command-experiments.md` 和 `openspec/config.yaml` §102-140。本 change 在 `DPT_FRAMEWORK/` 直接实现，无 prototype 阶段。
> 原则：验证 Engine 行为（gate/chain/trace）——机械可裁决。Agent 行为放 P2 且标注 Agent-driven。
>
> 分三个目录：`exp_wfn_rerun/` 测 rerun node 自身机制；`exp_wff_hitl2-branch/` 测 HITL2→下游 Agent flow；`exp_wff_delivery/` 保持原有交付尾巴 case 不变。

### P0 — rerun node 机制（exp_wfn_rerun/）

- [x] 8.1 **case-301**（`case-301-light-chain-dual-exit`）：验证 chain dual-exit——`passed → readiness` + `rerun → phase-rerun`，不确定 outcome → invalid_input — `experiments_playbook/exp_wfn_rerun/case-301-light-chain-dual-exit.md`
- [x] 8.2 **case-302**（`case-302-light-rerun-node-happy-path`）：pre-seed bundle → hitl2 gate pass → chain `rerun` → rerun-ready gate pass → seed-topics — `experiments_playbook/exp_wfn_rerun/case-302-light-rerun-node-happy-path.md`
- [x] 8.3 **case-303**（`case-303-light-normal-path-unchanged`）：回归——normal path `proceed_to_readiness` → `passed` → readiness 不变 — `experiments_playbook/exp_wfn_rerun/case-303-light-normal-path-unchanged.md`

### P0 — HITL2 Agent flow（exp_wff_hitl2-branch/）

- [x] 8.4 **case-140**（`case-140-light-hitl2-decision-capture`）：Agent 捕获 HITL2 decision + rationale → 理解意图 → 按 chain 分别路由到 rerun node 和 readiness node。证据：`rb_trace.jsonl` 同时有 `gate_attempt(hitl2-recorded)`、`gate_attempt(rerun-ready)`、`gate_attempt(readiness-passed)` — `experiments_playbook/exp_wff_hitl2-branch/case-140-light-hitl2-decision-capture.md`
- [x] 8.5 **case-141**（`case-141-light-rerun-full-path`）：HITL2 decision=rerun → Agent 查 chain `rerun` → phase-rerun → rerun-ready gate pass → seed-topics。证据：`rb_trace.jsonl` 有 hitl2 + rerun-ready 两个 gate_attempt — `experiments_playbook/exp_wff_hitl2-branch/case-141-light-rerun-full-path.md`
- [x] 8.6 **case-142**（`case-142-light-readiness-full-path`）：HITL2 decision=proceed_to_readiness → Agent 查 chain `passed` → phase-readiness → readiness gate pass。证据：`rb_trace.jsonl` 有 hitl2 + readiness-passed 两个 gate_attempt — `experiments_playbook/exp_wff_hitl2-branch/case-142-light-readiness-full-path.md`

### P1 — 边界（exp_wfn_rerun/）

- [x] 8.7 **case-304**（`case-304-light-gate-fail-max-count`）：`rerun_count: 3` → gate fail（`rerun_count_valid` 触发）→ `no_transition` — `experiments_playbook/exp_wfn_rerun/case-304-light-gate-fail-max-count.md`
- [x] 8.8 **case-305**（`case-305-light-indeterminate-no-transition`）：`request_view_revision`/`repair`/`stop_blocked` → `invalid_input` — `experiments_playbook/exp_wfn_rerun/case-305-light-indeterminate-no-transition.md`

### P2 — Agent-driven（exp_wfn_rerun/）

- [x] 8.9 **case-306**（`case-306-standard-two-round-delta`，Agent-driven）：两轮 rerun delta——`rerun_count` 递增 + `## 本轮重跑方向` 更新。verdict 靠文件系统检查（YAML + grep），非 gate-verifiable — `experiments_playbook/exp_wfn_rerun/case-306-standard-two-round-delta.md`

## 9. Requirement Registry & 治理检查

- [x] 9.1 在 `openspec/governance/req-registry.yaml` 登记 REI-001 ~ REI-005（rerun-incremental-node capability，5 个 requirement ID）+ GSK-005（gate-skeleton delta，1 个 requirement ID）
- [x] 9.2 运行 `node openspec/governance/check-project-reqs.mjs` 确认 PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired）
- [x] 9.3 运行 `node openspec/governance/check-project-specs.mjs` 确认 PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）
- [x] 9.4 运行 `node --test tests/engine/ tests/schema/ tests/integration/` 确认全绿
