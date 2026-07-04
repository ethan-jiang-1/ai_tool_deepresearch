# Research Wave Gate Implementation

> req: RWG-001, RWG-002, RWG-003, RWG-004, RWG-005, RWG-006, RWG-007, RWG-008, RWG-009, RWG-010, RWG-011, RWG-012, RWG-013, RWG-014, RWG-015

## Purpose

定义 `wave0-complete`、`wave1-complete`、`wave2-complete` 三个 gate 的真实 deterministic rule set 和 CLI 实现要求。所有规则都基于当前 accepted executable surface：现有 bundle files、reference/artifacts 目录结构、reference metadata schema、trace contract。Gate 不做研究质量判断。
## Requirements
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

### Requirement: Gate CLI evaluates wave0 rules from definition

`check-gate-wave0-complete.mjs` SHALL 从 placeholder pass 升级为 definition-driven rule evaluation。

实现 SHALL 支持：
- `file_exists`
- `dir_exists`
- `schema_valid`（ReferenceMetadata contract）
- `count_floor`
- `trace_event_present`（target: `wave0_completion`）
- `status_value`

实现 SHALL 复用 `gate-helpers.mjs` 的标准 pipeline。`count_floor` check type SHALL 在 wave0 CLI 的 rule iteration 中实现（单 CLI 专用，不进 helpers）。`pattern_match` SHALL 支持 `negate` 字段（反向匹配）。

实现 SHALL 支持 `{topic}` 占位符展开（design D5）：CLI 在 rule iteration 阶段读取 `rb_plan.md` 的 `topic_registry`，对每条 `target` 含 `{topic}` 占位符的 rule，为 registry 中的每个 topic key 展开为独立 check 实例。`topic_registry` 为空时所有含 `{topic}` 的 rule 直接 fail。

#### Scenario: Wave0 CLI no longer hardcoded pass

- **WHEN** reference 不满足所有 rules
- **THEN** CLI SHALL return `passed: false` with inspect/advice
- **AND** CLI SHALL NOT return `passed: true` without evaluating all rules

### Requirement: Gate CLI evaluates wave1 rules from definition

`check-gate-wave1-complete.mjs` SHALL 为 definition-driven rule evaluation。

实现 SHALL 支持：
- `file_exists`
- `dir_exists`
- `count_floor`（`per_topic_ref_md_count_floor`：统计与 `reference/*{topic}*.md` glob 匹配的文件数，threshold ≥ 1；支持 `{topic}` 占位符展开）
- `pattern_match`（含 `negate` 字段，用于 evidence-summary source URL 检测、question-list 四节结构检测、backfill token 残留检测）
- `status_value`
- `trace_event_present`（target: `wave1_completion`）

实现 SHALL 复用 `gate-helpers.mjs` 的标准 pipeline。`{topic}` 占位符展开 SHALL 使用 topic.slug（含 `NN_` 前缀），而非 topic.id。

#### Scenario: Wave1 CLI evaluates count_floor with topic.slug expansion

- **WHEN** topic_registry 含 topic slug = `01_meal-timing-...`
- **THEN** CLI SHALL 展开 `{topic}` → topic.slug（NOT topic.id）
- **AND** glob `reference/*01_meal-timing-...*.md` SHALL 匹配该 topic 的所有 reference 文件
- **AND** SHALL NOT return `passed: true` without evaluating all rules

### Requirement: Gate CLI evaluates wave2 rules from definition

`check-gate-wave2-complete.mjs` SHALL 从 placeholder pass 升级为 definition-driven rule evaluation。

实现 SHALL 支持：
- `file_exists`
- `field_non_empty`
- `pattern_match`（含 `negate` 字段，并支持 `{topic}` 占位符展开）
- `yaml_parse`
- `cross_field`（`mode: "markdown_link_resolution"`：解析 Markdown links → 验证目标文件存在）
- `status_value`
- `trace_event_present`（target: `wave2_completion`）

`cross_field` check SHALL：1) 读取 `artifacts/wave2/synthesis.md` 内容；2) 用正则提取所有 Markdown link `[text](relative/path.md)`；3) 将每个 path 解析为相对于 `artifacts/wave2/` 的绝对路径；4) 验证每个目标文件存在；5) ≥1 个有效引用时 pass；0 个时 fail。

`pattern_match` check SHALL support both normal and negated matching:
- `negate: false`（default）：pattern 在目标文件内容中找到至少 1 处匹配时 pass，0 处匹配时 fail
- `negate: true`：pattern 在目标文件内容中找到时 fail，找不到时 pass
- `target` SHALL support single file paths and `{topic}` expansion from `rb_plan.md` topic_registry

#### Scenario: Wave2 CLI no longer hardcoded pass

- **WHEN** synthesis 为空或引用链不满足（0 有效引用）
- **THEN** CLI SHALL return `passed: false` with inspect/advice
- **AND** CLI SHALL NOT return `passed: true` without evaluating all rules

#### Scenario: Pattern_match with negate detects unreplaced backfill token

- **WHEN** seed topic 文件 `seed_topics/X.md` 中仍包含 `__BACKFILL_WAVE2_JUDGMENT__` 字面字符串
- **AND** gate definition has rule `{ check: "pattern_match", pattern: "__BACKFILL_WAVE2_JUDGMENT__", target: "seed_topics/{topic}.md", negate: true }`
- **THEN** gate SHALL return `passed: false`
- **AND** `inspect` SHALL identify the affected seed topic

#### Scenario: Pattern_match detects wave1 evidence reference

- **WHEN** `synthesis.md` 包含 `[topic-a evidence](../wave1/topic-a/evidence-summary.md)`
- **AND** gate definition has rule `{ check: "pattern_match", pattern: "\\[.*\\]\\(\\.\\./wave1/.*/(evidence-summary|question-list)\\.md\\)", target: "artifacts/wave2/synthesis.md" }`
- **THEN** gate SHALL return `passed: true`

#### Scenario: Pattern_match fails when no wave1 evidence reference

- **WHEN** `synthesis.md` 的所有 Markdown links 都指向 `../../reference/` or unrelated files, with no match for wave1 evidence-summary/question-list format
- **THEN** gate SHALL return `passed: false`
- **AND** `inspect` SHALL 指出缺少 wave1 deepening artifact 引用

### Requirement: Wave2 phase-internal feedback checks are distinct from phase boundary gate

Wave2 SHALL have phase-internal JS feedback checks that are distinct in timing, authority, and purpose from the `wave2-complete` phase boundary gate.

| Surface | Timing | Authority |
|---|---|---|
| Phase-internal feedback check | During Wave2, at semantic boundaries（after ledger/index creation, finding triage, before sub-agent spawn, after receipt ingest, after synthesis projection, after backfill projection） | Advisory checkpoint: returns `{ check, inspect, advice }` for Phase Agent repair |
| `wave2-complete` gate | End of Wave2, before chain transition to HITL2 | Phase boundary: `pass/fail` controls whether workflow can advance |

Phase-internal feedback SHALL:
- Be invoked by the Phase Agent calling the checker CLI
- Return `{ check, inspect, advice }` for the Phase Agent to read and act on
- Use L0 checks（file existence, YAML parse, fixed section presence）for immediate structure feedback
- Use L1 checks（finding field completeness, decision/receipt consistency, handoff coverage）for lifecycle consistency feedback
- NOT block phase advancement（only L2 gate has that authority）
- NOT automatically drive workflow, spawn sub-agents, or mutate queue state

The same check rule that serves as phase-internal advice MAY later be promoted to gate rule, but this promotion requires an explicit OpenSpec/spec change.

#### Scenario: Phase-internal feedback returns advice, not pass/fail

- **WHEN** Phase Agent runs phase-internal checker after ledger/index creation
- **THEN** checker SHALL return structured `{ check, inspect, advice }` output
- **AND** Phase Agent SHALL read the output and decide repair actions
- **AND** phase-internal feedback SHALL NOT block the synthesis task from continuing

#### Scenario: Gate check controls phase transition

- **WHEN** Phase Agent runs `check-gate-wave2-complete.mjs` at phase end
- **THEN** gate SHALL return `{ passed, say, inspect, advice }` with routing to `hitl2` or repair
- **AND** `passed: false` SHALL block chain advancement
- **AND** Phase Agent SHALL repair and rerun gate until pass

### Requirement: Wave gate CLIs follow established double trace convention

Wave gate CLIs SHALL 延续 `wff-pre-research` 中建立的双 trace 约定：

- Gate CLI SHALL 通过 stdout 返回标准 JSON gate result（`check / routing / inspect / advice`）
- Gate CLI SHALL 把真实 gate attempt 追加到 active bundle 的 `rb_trace.jsonl`
- Playbook thin driver SHALL 负责调用 gate CLI、解析 result、向 `_trace.jsonl` 追加 `event: "check"` trace entry
- Experiment verdict SHALL 只读 `_trace.jsonl`

#### Scenario: Wave gate CLI output and trace verdict stay separate

- **WHEN** experiment 执行某个 wave gate
- **THEN** gate CLI stdout SHALL 提供 machine-readable JSON result
- **AND** active bundle `rb_trace.jsonl` SHALL 记录对应 runtime audit entry
- **AND** `_trace.jsonl` 中对应的 `check` event SHALL 由 playbook driver 基于该真实 result 追加

### Requirement: Wave2 gate cross_field verifies Markdown link artifact references

`check-gate-wave2-complete.mjs` 的 `cross_field` check（`mode: "markdown_link_resolution"`）SHALL 解析 `artifacts/wave2/synthesis.md` 中所有 Markdown link `[text](path)`，对每条 link 提取 path 并解析为 bundle-relative 路径，然后验证目标文件存在。至少 1 条引用目标存在时该 rule pass；所有引用目标均不存在时该 rule fail。

此 `cross_field` mode 与 `setup-ready` gate 使用的 `mode: "basename_consistency"` 不同：后者比较三个 source 的 plan_basename 是否 byte-for-byte 一致，不涉及 Markdown 解析。CLI SHALL 根据 gate definition JSON 中的 `mode` 字段选择对应 evaluator。

#### Scenario: Cross_field resolves Markdown links relative to synthesis location

- **WHEN** synthesis 包含 `[topic-a skeleton](../wave1/topic-a/skeleton.md)`
- **THEN** `cross_field` check SHALL 将 path 解析为 `artifacts/wave1/topic-a/skeleton.md`
- **AND** SHALL 验证该文件存在

#### Scenario: Cross_field fails when all targets missing

- **WHEN** synthesis 有 3 条 Markdown links 但所有目标文件均不存在
- **THEN** `cross_field` rule SHALL return `passed: false`
- **AND** `inspect` SHALL 列出所有失效路径

#### Scenario: Cross_field passes when at least one target exists

- **WHEN** synthesis 有 3 条 links，1 条目标存在、2 条不存在
- **THEN** `cross_field` rule SHALL return `passed: true`
- **AND** `advice` SHALL 列出 2 条失效路径供修复

### Requirement: Setup-ready gate validates bundle structural integrity

The `setup-ready` gate SHALL validate that the bundle is structurally complete before research waves begin. In addition to existing file existence, directory existence, schema validation, status value, and basename consistency checks, the gate SHALL verify that `rb_plan.md` body is non-empty and does not contain required-fill template markers—the prefix patterns `(待填充` and `(尚无话题`. Intentionally-allowed markers (`(待 HITL1 填充 — …)`, `(由 Engine — …)`, `(待 HITL2 确认 — …)`) SHALL NOT cause gate failure. See `plan-hostfile-sections` spec for the full marker convention.

Gate rules added:
- `plan_body_non_empty` (`field_non_empty` on `rb_plan.md` body, after stripping frontmatter via `stripMdFrontmatter()`) — catches completely empty body.
- `plan_body_no_unfilled_marker` (`pattern_match` with negate, pattern `\((?:待填充|尚无话题)`) — catches required-fill markers the Agent failed to replace. The pattern uses prefix match: it detects `(待填充 — …)` tokens where `— …` is arbitrary guidance text.

#### Scenario: Plan with filled body and no required-fill markers passes

- **WHEN** `rb_plan.md` body contains research content and no prefix matches `(待填充` or `(尚无话题`
- **THEN** both `plan_body_non_empty` and `plan_body_no_unfilled_marker` rules SHALL pass

#### Scenario: Plan with empty body fails

- **WHEN** `rb_plan.md` body is empty after `stripMdFrontmatter()`
- **THEN** `plan_body_non_empty` rule SHALL fail with inspect: "rb_plan.md body is empty"

#### Scenario: Plan with required-fill markers fails

- **WHEN** `rb_plan.md` body contains `(待填充 — …)` or `(尚无话题 — …)`
- **THEN** `plan_body_no_unfilled_marker` rule SHALL fail with inspect listing which marker prefix was detected

#### Scenario: Plan with intentionally-allowed markers passes

- **WHEN** `rb_plan.md` body contains `(待 HITL1 填充 — …)` or `(由 Engine — …)` but NO `(待填充 — …)` or `(尚无话题 — …)` markers
- **THEN** `plan_body_no_unfilled_marker` rule SHALL pass

### Requirement: content_dedup rule SHALL be added to wave0 and wave1 gate definitions

`gate-wave0-complete.definition.json` and `gate-wave1-complete.definition.json` SHALL each include a `content_dedup` rule.

The rule SHALL target declaration ledger inputs, not a reference directory:

```json
{
  "id": "content_dedup",
  "check": "content_dedup",
  "target": "output_declarations",
  "threshold": {
    "jaccard": 0.8,
    "url_dedup": true,
    "homepage_detect": true,
    "self_ref_detect": true
  },
  "failure_message": "检测到虚假或重复 reference 文件"
}
```

Gate CLIs (`check-gate-wave0-complete.mjs`, `check-gate-wave1-complete.mjs`) SHALL dispatch `content_dedup` to `checkContentDedup(bundlePath, rule.threshold)`. They SHALL NOT pass `referenceDir` as the input discovery surface.

#### Scenario: Wave0 gate includes content_dedup in rule set

- **WHEN** `check-gate-wave0-complete.mjs` evaluates the wave0 gate definition
- **THEN** the `content_dedup` rule SHALL be evaluated alongside existing rules
- **AND** a `content_dedup` failure SHALL cause the gate to fail

#### Scenario: Wave1 gate includes content_dedup in rule set

- **WHEN** `check-gate-wave1-complete.mjs` evaluates the wave1 gate definition
- **THEN** the `content_dedup` rule SHALL be evaluated alongside existing rules
- **AND** a `content_dedup` failure SHALL cause the gate to fail

#### Scenario: content_dedup rule definition survives schema validation

- **WHEN** `DPT_FRAMEWORK/cli/validate-bundle.mjs` validates gate definitions
- **THEN** the `content_dedup` rule with `target: "output_declarations"` and `threshold` object SHALL pass schema validation

#### Scenario: CLI dispatches content_dedup by bundle path

- **WHEN** gate CLI iteration sees `check: "content_dedup"`
- **THEN** it SHALL call `checkContentDedup(bundlePath, rule.threshold)`
- **AND** `checkContentDedup()` SHALL read `rb_output_declarations.jsonl` itself
