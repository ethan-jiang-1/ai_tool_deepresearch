# Research Wave Gate Implementation (delta)

> req: RWG-001, RWG-002, RWG-003

## MODIFIED Requirements

### Requirement: Wave0 complete gate rule set

`gate-wave0-complete.definition.json` SHALL 定义当前 contract 下的 Wave0 rules，与 `DPT_FRAMEWORK/schema/gate_definitions/gate-wave0-complete.definition.json` 及 `phase-wave0.md` 一致。

规则 SHALL 覆盖：
- `reference/_INDEX.md` 存在（`file_exists`）
- `reference/README.md` 存在（`file_exists`）
- `reference/` 目录存在（`dir_exists`）
- 至少 1 个 `reference/00-shared-*.md` 共享 foundation reference（`count_floor`，threshold 来自 `rb_profile.yaml#/research_style_params/wave0_shared_ref_total`）
- 每个 topic 的 `artifacts/wave0/{topic}/source.yaml` 存在且通过 ReferenceMetadata schema 校验（`schema_valid`，schema 见 `DPT_FRAMEWORK/schema/contracts/reference.mjs`）
- per-topic reference metadata 数量 ≥ foundation floor（`count_floor`，threshold 来自 `rb_profile.yaml#/research_style_params/wave0_per_topic_source_floor`）
- `content_dedup`、`cache_coverage`（target: `output_declarations`）
- wave0 output declaration ledger 存在且 coverage 完整（`output_declaration_ledger_exists`、`output_declaration_coverage`）
- wave0 successful relay slot binding（`subagent_slot_presence`，target: `_subagents/wave_00`）
- trace 中有 `wave0_completion` event（`trace_event_present` check type）
- `rb_status.json#/current_gate == wave0_complete`
- `rb_status.json#/next_gate == wave1_complete`

Foundation floor SHALL 定义为每个 topic 至少 1 条 reference metadata entry in `artifacts/wave0/{topic}/source.yaml`（`count_floor` threshold = 1，或 profile 覆盖值）。`count_floor` SHALL 统计 YAML 数组条目；`schema_valid` 独立校验每条 schema。

Topic 集合的 source of truth SHALL 为 `rb_plan.md` frontmatter 的 `topic_registry`。

#### Scenario: All Wave0 rules pass

- **WHEN** `reference/_INDEX.md` 存在、每个 topic 的 `artifacts/wave0/{topic}/source.yaml` 至少 1 条 schema-valid entry、trace 有 `wave0_completion` event
- **THEN** `check-gate-wave0-complete.mjs` SHALL return `passed: true`

#### Scenario: Missing per-topic thin YAML fails

- **WHEN** 某个 topic 缺少 `artifacts/wave0/{topic}/source.yaml`
- **THEN** gate SHALL return `passed: false`

#### Scenario: Missing wave0_completion trace fails

- **WHEN** `rb_trace.jsonl` 中无 `wave0_completion` event
- **THEN** gate SHALL return `passed: false`
- **AND** `inspect` SHALL 指向缺失的 trace event

#### Scenario: Empty topic registry fails

- **WHEN** `rb_plan.md` 的 `topic_registry` 为空数组或不存在
- **THEN** gate SHALL return `passed: false`

### Requirement: Wave1 complete gate rule set

`gate-wave1-complete.definition.json` SHALL 定义当前 contract 下的 Wave1 rules，与 gate JSON 实际内容一致。

规则 SHALL 覆盖（除下列外，还包括 gate JSON 中的 provenance/quality 规则）：
- `artifacts/wave1/` 目录存在（`dir_exists`）
- 每个 topic 的 `artifacts/wave1/{topic}/evidence-summary.md` 存在（`file_exists`）
- 每个 topic 的 `artifacts/wave1/{topic}/question-list.md` 存在（`file_exists`）
- 每个 topic 至少 1 个 `reference/*{topic}*.md` rich MD reference（`count_floor`）
- reference quality rules：`no_example_com_ref_url`、`reference_format`、`source_url_article_level`、`key_facts_min_lines`
- evidence-summary / question-list 结构 checks（`pattern_match`）
- backfill token 清除（`pattern_match`，`negate: true`）
- `content_dedup`、`cache_coverage`
- wave1 output declaration ledger + coverage + subagent slot presence（`_subagents/wave_01`）
- trace 中有 `wave1_completion` event（`trace_event_present`）
- status 值

#### Scenario: Missing question-list fails

- **WHEN** 某 topic 有 `evidence-summary.md` 但无 `question-list.md`
- **THEN** gate SHALL return `passed: false`

#### Scenario: Missing wave1_completion trace fails

- **WHEN** `rb_trace.jsonl` 中无 `wave1_completion` event
- **THEN** gate SHALL return `passed: false`

### Requirement: Wave2 complete gate rule set

`gate-wave2-complete.definition.json` SHALL 定义当前 contract 下的 Wave2 rules，与 gate JSON 实际内容一致。

规则 SHALL 覆盖：
- 三件套存在性与结构（`synthesis.md`、`cross-topic-ledger.md`、`finding-index.yaml`）
- section/YAML/link checks
- `rerun_add_full_synthesis`（rerun action:add 场景）
- conditional output declaration coverage + Wave2 slot binding for new search/evidence/reference outputs
- `wave2_cross_ref_coverage`（`reference/00-cross-*.md` 须有 relay provenance）
- trace 中有 `wave2_completion` event（`trace_event_present`）
- status 值

#### Scenario: Missing wave2_completion trace fails

- **WHEN** `rb_trace.jsonl` 中无 `wave2_completion` event
- **THEN** gate SHALL return `passed: false`

#### Scenario: Cross-ref without relay provenance fails

- **WHEN** `reference/00-cross-*.md` 存在但无对应 Wave2 relay slot provenance
- **THEN** `wave2_cross_ref_coverage` rule SHALL fail
