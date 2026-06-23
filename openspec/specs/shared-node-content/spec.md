# Shared Node Content

> req: SHC-001, SHC-002, SHC-003, SHC-004, SHC-005, SHC-006

## Purpose

定义 5 个 shared node 的完整 Agent-readable 内容要求。每个 shared node 只提供 guidance 或 generated summary，不是 deterministic rule authority。内容必须贴合当前 accepted schema / CLI surface，帮助 Agent 在 pre-research 阶段正确理解 profile、gate、schema、repair posture 和 anti-cheating 边界。

## Requirements

### Requirement: Shared profile content completeness

`shared-profile.md` SHALL 说明 `rb_profile.yaml` 的当前字段、类型、填写时机、示例值和 Source of Record。

内容 SHALL 至少覆盖以下字段组：
- `plan_basename`：字符串，表示当前 run / experiment 的 canonical basename；对 disposable bundle，目录名可能是 `dpt_disp_<plan_basename>_<hex>`，但 `plan_basename` 本身不包含前缀或随机后缀
- `research_profile`：当前 accepted enum 选择（`not_selected`、`quick_factual`、`exploratory_map`、`claim_verification`）
- `root_must_answer_set`：字符串数组，记录用户明确要求必须回答的核心问题
- `human_decision_checkpoints.hitl1.status`
- `human_decision_checkpoints.hitl1.recorded_at`
- `human_decision_checkpoints.hitl1.topic_rewrite`
- `human_decision_checkpoints.hitl1.user_intent_summary`
- `human_decision_checkpoints.hitl1.research_profile`
- `human_decision_checkpoints.hitl1.root_must_answer_set`
- `human_decision_checkpoints.hitl2.status`：one of `not_started`, `pending_user`, `recorded`, `blocked`
- `human_decision_checkpoints.hitl2.answerability_class`：one of `not_assessed`, `ready_substantive`, `ready_insufficient_judgment`, `blocked_repair_required`
- `human_decision_checkpoints.hitl2.user_decision`：one of `not_started`, `proceed_to_readiness`, `request_view_revision`, `repair_and_rerun`, `stop_blocked`
- `human_decision_checkpoints.hitl2.final_report_view`：one of `not_started`, `profile_default`, `executive_brief`, `evidence_map`, `claim_judgment`, `technical_deep_dive`, `custom`
- `human_decision_checkpoints.hitl2.custom_slug`：optional custom report name
- `human_decision_checkpoints.hitl2.user_feedback`

Body SHALL 包含 Authority Boundary section，明确说明 schema authority 在 `DPT_FRAMEWORK/schema/contracts/profile.mjs`，runtime truth 在 active bundle 的 `rb_profile.yaml`。

#### Scenario: Agent reads shared-profile for field meaning

- **WHEN** Agent 需要在 HITL1 阶段理解 `research_profile` 和 `root_must_answer_set`
- **THEN** Agent SHOULD 加载 `shared-profile.md` 获取字段说明
- **AND** body SHALL 明确 `research_profile` 当前是 enum field，不是嵌套对象

#### Scenario: HITL1 path uses current accepted contract

- **WHEN** Agent reads the HITL1 portion of `shared-profile.md`
- **THEN** the node SHALL point to `human_decision_checkpoints.hitl1.status` and `human_decision_checkpoints.hitl1.recorded_at`
- **AND** the node SHALL NOT describe a top-level `hitl1` object or `timestamp` field

#### Scenario: Shared profile explains disposable basename relation

- **WHEN** Agent 在 experiment bundle 中读取 `plan_basename`
- **THEN** the node SHALL explain that bundle dir may include `dpt_disp_` prefix and random hex suffix
- **AND** the canonical `plan_basename` written to plan/profile SHALL remain the unsuffixed logical name

### Requirement: Shared gate rules content as generated summary

`shared-gate-rules.md` SHALL 为 Agent 提供 9 个 gate 的用途和大致检查方向摘要。内容 SHALL 标注 `authority: generated-summary`，并声明 gate definition JSON 和 gate CLI output 才是 deterministic rule authority。

当前覆盖的 9 个 gate 为：
- `instantiation-complete`：bundle 创建和 scaffold 完整性
- `hitl1-recorded`：HITL1 写入 profile 的 completeness
- `setup-ready`：pre-wave0 structural consistency
- `seed-topics-ready`：seed topic 物化的结构、数量和 slug 一致性
- `wave0-complete`：foundation reference collection 的 completeness
- `wave1-complete`：topic-scoped skeleton artifact 的 placeholder boundary
- `wave2-complete`：cross-topic synthesis 的 artifact reference chain
- `hitl2-recorded`：HITL2 delivery 决策记录
- `readiness-passed`：delivery 前的最终 deterministic precheck

对每个 gate，内容 SHALL 包含：
- 该 gate 保护什么（一句话）
- 大致检查方向（文件存在性、schema、字段值、状态、trace、cross-file consistency）
- gate fail 后的 repair posture

Shared gate summary SHALL NOT 复制完整 rule-by-rule 列表。

#### Scenario: Agent reads gate summary before running gate

- **WHEN** Agent 准备运行 `setup-ready` gate 但不确定检查范围
- **THEN** Agent SHOULD 加载 `shared-gate-rules.md` 获取 purpose 和检查方向摘要
- **AND** body SHALL 声明 deterministic truth 以后续 CLI output 为准

### Requirement: Shared schemas content matches current executable surface

`shared-schemas.md` SHALL 为 Agent 提供 workflow foundation 相关 schema surface 的摘要，包括 profile、status、queue、plan、trace、gate/transition contract、ReferenceMetadata schema 以及 wave artifact 目录结构。

内容 SHALL：
- 指向每个 contract 的当前位置（`DPT_FRAMEWORK/schema/contracts/`）
- 摘要 `rb_status.json` 当前只有 `current_mode`、`state`、`current_gate`、`next_gate`
- 摘要 `rb_profile.yaml` 当前 HITL1 路径是 `human_decision_checkpoints.hitl1.*`
- 区分 runtime audit trace `rb_trace.jsonl` 与 command experiment verdict trace `_trace.jsonl`
- 说明 gate definition JSON lives under `DPT_FRAMEWORK/schema/gate_definitions/`
- 说明 transition / gate state contract lives in `DPT_FRAMEWORK/schema/contracts/gate.mjs`
- 摘要 ReferenceMetadata schema（`DPT_FRAMEWORK/schema/contracts/reference.mjs`）：每条 reference 必填 `url`、`title`、`retrieved_date`、`topic_tag`
- 摘要 wave artifact 目录结构：
  - `reference/<topic>/source.yaml` → Wave0 per-topic reference metadata（YAML array，每项满足 ReferenceMetadata schema）
  - `artifacts/wave1/<topic>/skeleton.md` → Wave1 topic-scoped placeholder skeleton（标记 `capability: foundation-placeholder`）
  - `artifacts/wave2/synthesis.md` → Wave2 cross-topic synthesis（引用用 Markdown link `[label](relative/path.md)` 格式）
- 摘要 final report artifact 目录：
  - `final/` → 终端交付输出目录，每次 delivery pass 生成一次。与 wave-level artifact 目录（`reference/`, `artifacts/wave1/`, `artifacts/wave2/`）不同——`final/` 是 terminal delivery output，不是中间产出

Shared schemas SHALL NOT 复制完整 Zod schema 定义。

#### Scenario: Agent needs status field overview

- **WHEN** Agent 需要理解 `rb_status.json`
- **THEN** `shared-schemas.md` SHALL 指出当前没有 `phases.*` 树
- **AND** body SHALL 指向完整 contract 文件位置

#### Scenario: Agent distinguishes runtime trace from experiment verdict trace

- **WHEN** Agent 读取 trace schema 摘要
- **THEN** `shared-schemas.md` SHALL explain that `rb_trace.jsonl` is active bundle runtime audit
- **AND** SHALL explain that `_trace.jsonl` is command experiment verdict evidence
- **AND** SHALL NOT treat `_trace.jsonl` as production runtime truth

#### Scenario: Agent understands wave artifact directory and schema

- **WHEN** Agent 需要理解 wave artifacts 应放在哪些目录、metadata 用什么格式
- **THEN** `shared-schemas.md` SHALL 摘要 `reference/`、`artifacts/wave1/`、`artifacts/wave2/` 的用途、schema 和引用格式
- **AND** body SHALL 指向完整 contract 文件位置

### Requirement: Shared repair guidance content

`shared-repair-guidance.md` SHALL 提供 gate fail 后的通用 repair posture。

内容 SHALL 覆盖：
- fail -> read `inspect` / `advice` -> repair -> rerun 的标准循环
- 默认 retry limit 3
- 超过 retry limit 或持续无进展时的 escalation
- 不同 check type 的修复方向摘要：
  - `file_exists` / `dir_exists`
  - `schema_valid`
  - `field_non_empty`
  - `field_value`
  - `status_value`
  - `cross_field`

Repair guidance SHALL NOT 变成某个具体 gate 的隐藏脚本。

#### Scenario: Agent encounters setup gate failure

- **WHEN** `check-gate-setup-ready.mjs` 返回 fail
- **THEN** Agent SHOULD 先读 CLI 的 `inspect` / `advice`
- **AND** 再参考 `shared-repair-guidance.md` 的通用修复姿势

### Requirement: Shared anti-cheating rules content

`shared-anti-cheating-rules.md` SHALL 列举所有 phase 共享的底线禁令，并给出正确替代动作。

内容 SHALL 至少包含以下禁令：
- 禁止手写 trace event、receipt、gate result
- 禁止在 gate 未 pass 时修改 control files 冒充 pass
- 禁止跳过 retry / escalation
- 禁止把 chat memory 当 runtime state
- 禁止在 instantiation / setup 阶段声称 evidence coverage 或 synthesis quality
- 禁止在 `stop: yes` 节点未等用户输入就继续
- 禁止在 HITL2 阶段伪造用户 decision 或绕过用户输入
- 禁止在 readiness 阶段评判语义质量或写作质量
- 禁止从 chat memory 生成 final report——必须 sourced from verified bundle state
- 禁止在 final phase 实现 hidden loop 用于 post-delivery rework

#### Scenario: Agent reads anti-cheating rules before phase execution

- **WHEN** Agent 加载任一 pre-research phase node
- **THEN** it SHOULD be able to use `shared-anti-cheating-rules.md` as the shared baseline
- **AND** the node SHALL explain the correct alternative action for each prohibition

### Requirement: Shared node authority boundary enforcement

所有 shared node 的 body SHALL 包含 Authority Boundary section，声明：
- 该 node 的 authority 类型及其含义
- 冲突时的 Source of Record
- 该 node 不能替代哪些 deterministic checks

Shared node SHALL NOT 包含 `phase`、`gate`、`next`、`stop` frontmatter 字段。Shared node body SHALL NOT 包含 hidden phase 指令，如"运行以下命令后继续到下一阶段"。

#### Scenario: Shared node does not become hidden phase

- **WHEN** Agent 加载任意 shared node
- **THEN** body SHALL NOT 指示 phase transition
- **AND** frontmatter SHALL 保持 `node_type: shared`
