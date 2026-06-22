## Why

Workflow Foundation 序列已通过 7 个 change 完成了从 directory contract 到 research waves 的全部基础设施和内容填充。最后一段 lifecycle——HITL2（用户 final review decision）、Readiness（delivery 前 deterministic precheck）、Final（terminal delivery node）——仍停留在 skeleton 阶段（placeholder body + hardcoded gate pass）。同时，FSM 引擎（`transition-fsm.mjs`、`workflow-fsm.mjs`、`transitions.fsm.json` 及关联 spec/测试/实验）是 dead code：lifecycle 从未实际查询 `.fsm.json`，所有 gate CLI 默认 `transitions.chain.json`。保留双引擎制造噪声，迷惑 AI coding agent。

此 change 在 content-delivery 填内容之前先彻底移除 FSM 引擎（Phase 0），然后按 `wff-research-waves` 建立的模式完成 HITL2 / readiness / final 的全部内容（Phase 1+），使 workflow-foundation lifecycle 首次拥有完整的 10 阶段端到端可运行路径。

## What Changes

**Phase 0 — FSM 引擎清理（纯机械，无设计决策）：**

- 删除 10 个死 FSM 文件/目录：`transition-fsm.mjs`、`workflow-fsm.mjs`、`transitions.fsm.json`、3 个 FSM spec 目录、2 个 FSM 测试文件、2 个 FSM 实验目录
- 修改 11 个引用文件：`ask-next.mjs` 去 FSM dispatch 分支、`consistency-validator.mjs` 去 FSM 校验块、`validate-workflow-package.mjs` 去 `--transitions-fsm` flag、测试文件去 FSM case、spec 文件去 FSM backend 描述、`guidelines/README.md` 引擎计数 6→5

**Phase 1+ — Content Delivery 实现：**

- 填充 `phase-hitl2.md`（`stop: yes`，decision brief + 结构化用户 decision 写入 `rb_profile.yaml`）
- 填充 `phase-readiness.md`（`stop: no`，deterministic precheck：artifact 可达、前面 8 个 gate pass 可审计、profile/status/queue/trace 一致。全生命周期共 9 个 non-terminal gate，readiness-passed 是第 9 个）
- 填充 `phase-final.md`（`gate: none`、`next: none`，terminal node，从 verified bundle state 生成 final report）
- `gate-hitl2-recorded.definition.json` 从 1 条 placeholder rule 升级为 ~7 条 real rules
- `gate-readiness-passed.definition.json` 从 1 条 placeholder rule 升级为 ~9 条 real rules
- `check-gate-hitl2-recorded.mjs` 和 `check-gate-readiness-passed.mjs` 从 hardcoded pass 升级为 definition-driven
- 修复 `CurrentGate` enum 缺少 `hitl1_recorded` 和 `hitl2_recorded` 的 gap
- 新增 5 个实验 playbook（HITL2 decision、HITL2 rerun branch、readiness precheck、delivery repair loop、full delivery chain）
- 更新 `gate-skeleton`、`shared-node-content`、`transition-table` 等已有 spec

## Capabilities

### New Capabilities

- `content-delivery-phase-content`: HITL2 / readiness / final 三个 phase node 的 9-section body 完整内容。定义每个 phase 的 stage goal、allowed actions、expected artifacts、stop behavior、anti-cheating rules。覆盖 A06-1 到 A06-10。
- `content-delivery-gate-implementation`: `hitl2-recorded` 和 `readiness-passed` 两个 gate 的完整 rule set（definition JSON）+ gate CLI 的 definition-driven 实现。CLI 从 hardcoded pass 升级为 load definition → iterate rules → execute checks → emit result 的标准 pipeline。
- `content-delivery-experiments`: 5 个实验 playbook 验证 HITL2/readiness/final 的 happy path、fail boundary、rerun branch（gate pass ≠ advance）、PDCA repair loop、full-chain 端到端行为。

### Modified Capabilities

- `gate-skeleton`: GSK-002/003/004 扩展到覆盖全部 9 个 gate CLI（+hitl2-recorded, +readiness-passed）。GSK-002 补充新 check type（yaml_parse、jsonl_parse、trace_has_events）并明确 `check.next` 的 terminal 行为。
- `shared-node-content`: SHC-001 补充 HITL2 decision 字段文档；SHC-002/003/005 补充 readiness/final 相关引用。
- `transition-table`: 移除 FSM backend 描述（Phase 0），验证 hitl2→readiness→final 已在 chain 中。
- `framework-engine`: 移除 workflow-fsm 和 transition-fsm 引擎条目；FRE-002 retire；引擎计数 7→6（spec 口径含 Trace Writer；README 口径 6→5 不含 trace）。
- `seed-topic-materialization`: 移除 `.fsm.json` 引用（Phase 0）。

## Impact

- **删除**: 10 个 FSM 文件/目录（2 engine、1 transition table、3 spec 目录、2 测试、2 实验目录）
- **新建**: 3 个 delta spec 目录、2 个 gate definition 规则、2 个 gate CLI 实现、3 个实验 playbook、集成测试
- **修改**: `DPT_FRAMEWORK/engine/ask-next.mjs`、`consistency-validator.mjs`、`cli/validate-workflow-package.mjs`、`schema/enums.mjs`、3 个 phase node、2 个 shared node、5 个已有 spec、`guidelines/README.md`、`openspec/config.yaml`、`experiments_playbook/RUN.md`、`gate-wave2-complete.definition.json`（status_next_gate 命名联动）
- **依赖**: 无新增 npm 依赖。Phase 0 删除的 `transition-fsm.mjs` 的 import 者仅 `ask-next.mjs` 和 `consistency-validator.mjs`，删除后无级联影响。
- **生命周期路由**: 零变化——gate CLI 全部默认 `transitions.chain.json`，chain 中 hitl2→readiness→final 已存在。
