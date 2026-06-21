## Why

`wff-pre-research` 已交付 — bundle 已实例化、HITL1 已记录、setup 已通过。现在进入了 research 的主体阶段：三个 wave 的 evidence 收集、placeholder 标记和 cross-topic synthesis。

当前的 skeleton 中，`phase-wave0/1/2.md`、三个 wave gate definition JSON、三个 wave gate CLI 全数是 placeholder（1 条 placeholder rule、hardcoded `passed: true`）。Agent 和 Engine 在 setup 之后没有任何实际的 research guidance 和 deterministic checkpoint。

本 change 是 `wff-pre-research` 的自然延续——用同样的模式（9-section phase body + definition-driven gate rule sets + 8 种 check types + real CLI evaluation）让三个 wave 跑通，同时为 Wave1 的未来 subagent expansion 打好 foundation boundary。


**本 change 的范围扩展（setup→wave0 缺口修复）**：实测发现 `wff-pre-research` 的 HITL1 只把 seed topics 写进 `rb_plan.md` 的 `topic_registry` frontmatter，从不物化到 `seed_topics/` 目录；`setup-ready` gate 只检查 `seed_topics/` 目录存在（空目录也 pass），Agent 因此可带着空 `seed_topics/` 进入 Wave0 研究——研究骨架是空的。虽然本 change 的 `wave0-complete` gate 已设计"topic_registry 为空时 fail"的防线，但位置过晚且只查非空。本 change 因此在 setup 与 wave0 之间**新增一个确定性 phase + gate**（`seed-topics` / `seed-topics-ready`），强制 Agent 物化 topic_registry 并做结构+数量+slug 一致性的 deterministic 检查。这与 wave 阶段是连续的"研究入口"问题，故纳入本 change 而非另开。
## What Changes

- **3 个 phase node 填充完整 body**：`phase-wave0.md` 引导 Agent 搜集 foundation shared reference（含 ReferenceMetadata schema）；`phase-wave1.md` 写 topic-scoped placeholder skeleton，明确标记 `capability: foundation-placeholder`，并在 Future Expansion Guidance 中列出 6 个 expansion tracks；`phase-wave2.md` 引导 Agent 用 Markdown link 格式从 verified artifacts 派生 cross-topic synthesis。
- **新增 seed topic 物化阶段（setup→wave0 之间）**：`phase-seed-topics.md` 引导 Agent 把 `topic_registry` 物化为 `seed_topics/<slug>.md` 独立文件；`seed-topics-ready` gate 用 deterministic 规则检查目录非空、数量 floor、slug 双向一致、frontmatter 合法、trace event、status 值。质量检查严格 deterministic，语义质量靠 HITL1 人类审查（已是 stop:yes）。
- **新增 ReferenceMetadata schema**：`DPT_FRAMEWORK/schema/contracts/reference.mjs` 定义 `reference/<topic>/source.yaml` 的结构（url、title、retrieved_date、topic_tag），由 Wave0 gate 通过 `schema_valid` 校验。
- **3 个 gate definition JSON 填充完整 rule set**：`wave0-complete`（~7 条 rules，含 `count_floor` 和 `schema_valid`）、`wave1-complete`（~7 条 rules，含 `pattern_match` 用于 placeholder marker 和 false completion claim 检测）、`wave2-complete`（~6 条 rules，含 `cross_field` 解析 Markdown link 并验证引用目标）。
- **新增 seed-topics-ready gate definition JSON**：`gate-seed-topics-ready.definition.json`，含 `dir_non_empty`（新增 check type）、`cross_field`（新增 `mode: "slug_consistency"`）、`pattern_match`（frontmatter 合法性）、`trace_event_present`、`status_value` 规则。
- **3 个 gate CLI 从 hardcoded pass 升级为 definition-driven evaluation**：复用 `gate-helpers.mjs` standard pipeline。新增共享 `readTraceEvents` trace reader（wave + seed-topics gate 首次读 `rb_trace.jsonl`）。`cross_field` 新版支持解析 Markdown link → 路径解析 → 验证目标文件存在。
- **新增 seed-topics-ready gate CLI**：`check-gate-seed-topics-ready.mjs`，复用 standard pipeline；新增 `dir_non_empty` evaluator 和 `cross_field` 的 `slug_consistency` mode。
- **Workflow 注册同步**：`manifest.json` / `transitions.chain.json` / `transitions.fsm.json` 在 setup 与 wave0 之间插入 seed-topics 节点；`enums.mjs` 的 `CurrentGate` 新增 `seed_topics_ready`。
- **Wave1 future boundary**：`phase-wave1.md` 明确标记 foundation placeholder capability boundary，列出 6 个 future expansion tracks，这些不成为 foundation gate pass 条件。`subagent: true` 只是 future marker。
- **Shared node 微调**：`shared-gate-rules.md` 追加三个 wave gate 的用途和检查方向摘要；`shared-schemas.md` 追加 wave artifact 目录结构、ReferenceMetadata schema 和 synthesis 引用格式摘要。
- **7 个 wave experiment playbooks + 1 个 seed-topics boundary playbook：STM-005 seed-topics boundary、RWE-001 wave0 happy+fail（含 count_floor/schema_valid AND 交互 + {topic} 展开验证）、RWE-002/RWE-008 wave1 boundary enforcement、RWE-003/RWE-009 wave2 synthesis reference verification、RWE-004 全链路串联（seed-topics→wave0→wave1→wave2）、RWE-005 repair loop、RWE-006 fault tolerance（畸形数据 + status drift）、RWE-007 review surface（synthesis 全文 + 引用链 + human review checklist）。
- **Double trace 延续 pre-research 模式**：gate CLI 写 `rb_trace.jsonl`，playbook driver 写 `_trace.jsonl`，verdict 只读实验 trace。Trace event naming: `wave0_completion`、`wave1_completion`、`wave2_completion`。

## Capabilities

### New Capabilities

- `research-wave-phase-content`: wave0、wave1、wave2 三个 phase node 的完整 body，包括 Wave1 的 future subagent boundary 标记。
- `seed-topic-materialization`: setup 与 wave0 之间的 seed topic 物化阶段，含 `phase-seed-topics.md` phase body、`seed-topics-ready` gate definition + CLI、workflow 注册（manifest/transition/enum）、shared node 微调。
- `research-wave-gate-implementation`: `wave0-complete`、`wave1-complete`、`wave2-complete` 的完整 rule set + CLI 实现，含 `count_floor` check type（wave0 CLI 专用）和 Markdown link `cross_field` 验证。
- `research-wave-experiments`: 7 个 wave playbook（RWE-001~007 各对应一个 playbook，RWE-008/009 为横切约束），覆盖 happy path + fail、全链路串联、repair loop、fault tolerance 和 review surface。

### Modified Capabilities

- `gate-skeleton`: GSK-004 的覆盖范围从 3 个 pre-research gate CLI 扩展到 7 个（+1 个 seed-topics + 3 个 wave gate CLI），新增 `count_floor` check type 和 `cross_field` Markdown link 解析用法。
- `shared-node-content`: SHC-002（shared-gate-rules）追加 wave0/1/2 gate 摘要；SHC-003（shared-schemas）追加 wave artifact 目录结构、ReferenceMetadata schema 和 synthesis 引用格式。

## Impact

- **Affected framework**:
  - `DPT_FRAMEWORK/workflows/nodes/phases/phase-seed-topics.md`（新增）
  - `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md`
  - `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md`
  - `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave2.md`
  - `DPT_FRAMEWORK/workflows/nodes/shared/shared-gate-rules.md`
  - `DPT_FRAMEWORK/workflows/nodes/shared/shared-schemas.md`
  - `DPT_FRAMEWORK/workflows/manifest.json`（注册 seed-topics phase）
  - `DPT_FRAMEWORK/workflows/transitions.chain.json`（setup→seed-topics→wave0）
  - `DPT_FRAMEWORK/workflows/transitions.fsm.json`（同步 state 转移）
  - `DPT_FRAMEWORK/schema/enums.mjs`（CurrentGate 新增 seed_topics_ready）
  - `DPT_FRAMEWORK/schema/contracts/reference.mjs`（新增）
  - `DPT_FRAMEWORK/schema/gate_definitions/gate-wave0-complete.definition.json`
  - `DPT_FRAMEWORK/schema/gate_definitions/gate-wave1-complete.definition.json`
  - `DPT_FRAMEWORK/schema/gate_definitions/gate-wave2-complete.definition.json`
  - `DPT_FRAMEWORK/schema/gate_definitions/gate-seed-topics-ready.definition.json`（新增）
  - `DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs`
  - `DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs`
  - `DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs`
  - `DPT_FRAMEWORK/cli/gates/check-gate-seed-topics-ready.mjs`（新增）
  - `DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs`（新增共享 `readTraceEvents` trace reader；`count_floor`/`dir_non_empty`/`cross_field` 等新 check type 放各自 CLI rule iteration）
- **Affected experiments**:
  - `experiments_playbook/exp_workflow-foundation/`（8 个 playbook：7 wave + 1 seed-topics boundary)
  - `experiments_playbook/RUN.md`
- **Affected tests**:
  - wave gate integration tests under `tests/integration/cli/`
- **Affected governance**:
  - `openspec/governance/req-registry.yaml`
- **No new npm dependencies**: only Node built-ins plus approved `zod` and `yaml`.
