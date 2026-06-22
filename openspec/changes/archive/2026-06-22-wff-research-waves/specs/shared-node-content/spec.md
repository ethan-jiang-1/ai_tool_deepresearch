> req: SHC-002, SHC-003

## MODIFIED Requirements

### Requirement: Shared gate rules content as generated summary

`shared-gate-rules.md` SHALL 为 Agent 提供 9 个 gate 的用途和大致检查方向摘要。内容 SHALL 标注 `authority: generated-summary`，并声明 gate definition JSON 和 gate CLI output 才是 deterministic rule authority。

对每个 gate，内容 SHALL 包含：
- 该 gate 保护什么（一句话）
- 大致检查方向（文件存在性、schema、字段值、状态、trace、cross-file consistency）
- gate fail 后的 repair posture

当前覆盖的 9 个 gate 为：
- `instantiation-complete`：bundle 创建和 scaffold 完整性
- `hitl1-recorded`：HITL1 写入 profile 的 completeness
- `setup-ready`：pre-wave0 structural consistency
- `seed-topics-ready`：seed topic 物化的结构、数量和 slug 一致性
- `wave0-complete`：foundation reference collection 的 completeness（reference 目录、ReferenceMetadata schema 校验、数量 ≥ foundation floor、`wave0_completion` trace）
- `wave1-complete`：topic-scoped skeleton artifact 的 placeholder boundary（skeleton 存在、`capability: foundation-placeholder` marker、无 false completion claim、`wave1_completion` trace）
- `wave2-complete`：cross-topic synthesis 的 artifact reference chain（synthesis 存在、非空 Markdown link 引用、引用目标可达、`wave2_completion` trace）
- `hitl2-recorded`：HITL2 delivery 决策记录（当前 placeholder）
- `readiness-passed`：delivery 前的最终 deterministic precheck（当前 placeholder）

Shared gate summary SHALL NOT 复制完整 rule-by-rule 列表。

#### Scenario: Agent reads wave gate summary before running wave gate

- **WHEN** Agent 准备运行 `wave0-complete`、`wave1-complete` 或 `wave2-complete` gate 但不确定检查范围
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

Shared schemas SHALL NOT 复制完整 Zod schema 定义。

#### Scenario: Agent understands wave artifact directory and schema

- **WHEN** Agent 需要理解 wave artifacts 应放在哪些目录、metadata 用什么格式
- **THEN** `shared-schemas.md` SHALL 摘要 `reference/`、`artifacts/wave1/`、`artifacts/wave2/` 的用途、schema 和引用格式
- **AND** body SHALL 指向完整 contract 文件位置
