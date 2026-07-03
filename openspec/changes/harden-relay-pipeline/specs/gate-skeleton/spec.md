# Gate Skeleton (delta)

> req: GSK-001, GSK-002

## Purpose

Extend gate definition check types with `output_declaration_ledger_exists`, `output_declaration_coverage`, and `subagent_slot_presence` for phase-aware relay provenance. Gate CLI rule evaluation dispatches to these new checks. Accepted check types and ledger-authoritative pass conditions are preserved.

## MODIFIED Requirements

### Requirement: Gate definition JSON skeleton structure

每个 `gate-<name>.definition.json` SHALL 包含以下顶层字段：

| Field | Required | Meaning |
|-------|----------|---------|
| `gate` | yes | Gate key，MUST 匹配 phase metadata 中的 `gate` 值（如 `wave0-complete`） |
| `description` | yes | 该 gate 保护什么的简短说明 |
| `rules` | yes | 有序 deterministic check 数组；骨架阶段至少包含 1 个占位 rule |

每个 rule SHALL 包含：

| Field | Required | Meaning |
|-------|----------|---------|
| `id` | yes | 稳定 rule identifier（如 `wave0_artifact_index`） |
| `check` | yes | Check type；合法值包括 main spec 已接受的 check types，并新增 `output_declaration_ledger_exists`、`output_declaration_coverage`、`subagent_slot_presence` |
| `target` | yes | 被检查的 file/state path、field、glob、ledger selector 或 trace query |
| `threshold` | no | Count 或 ratio 的 comparison value；不适用时为 `null` |
| `failure_message` | yes | 指向 Agent 的 repair guidance |

**变更**: check type 合法值新增 `output_declaration_ledger_exists`、`output_declaration_coverage`、`subagent_slot_presence`，用于 phase-aware relay provenance 检查。本 change 不移除 accepted gate check type，也不把 filesystem scan 变成 gate pass authority。`content_dedup`、`cache_coverage`、`reference_format`、`reference_source_url_article_level`、`reference_key_facts_min_lines`、`reference_ledger_coverage`、`count_floor` 的既有语义仅能通过对应 capability delta 修改。

Gate definition JSON SHALL NOT introduce a new generic `severity` field in this change. A configured provenance rule contributes to pass/fail like other gate rules. Diagnostic side effects such as `relay_bypass_suspected` do not replace the rule outcome.

Gate definition JSON SHALL 不编码只有 Agent 能做的 semantic research judgment。

#### Scenario: Gate definition is parseable

- **WHEN** `JSON.parse` 读取 `gate-wave0-complete.definition.json`
- **THEN** result MUST 包含 `gate`、`description`、`rules` 三个 key，`rules` MUST 是数组且长度 ≥ 1

#### Scenario: Provenance coverage check type recognized

- **WHEN** a gate definition contains a rule with `"check": "output_declaration_coverage"`
- **THEN** gate CLI SHALL dispatch to the `output_declaration_coverage` check implementation
- **AND** SHALL NOT return `Unknown check type` error

#### Scenario: Existing accepted check type remains valid

- **WHEN** a gate definition contains accepted checks such as `content_dedup`, `cache_coverage`, `count_floor`, or reference quality checks
- **THEN** this change SHALL NOT make those checks unknown or remove their dispatch path

### Requirement: Gate CLI evaluates rules from definition

每个 gate CLI SHALL 加载 gate definition JSON，遍历 rules，并在 `currentNodeRef` 与 gate 绑定校验通过后执行 deterministic check。规则执行结果 SHALL 决定 `passed` 或 `failed`，并且该 outcome SHALL 被送入详细 router 生成 `routing` 与 `check.next`。

当前 GSK-004 的覆盖范围包括 9 个已实现的 gate CLI（同 main spec）。所有 CLI SHALL 复用 `DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs` 的共享函数。

**变更**: Wave0、Wave1、Wave2 gate CLI rule evaluation SHALL support phase-aware relay provenance checks:

- `output_declaration_ledger_exists`
- `output_declaration_coverage`
- `subagent_slot_presence`

Wave0/Wave1 provenance rules SHALL be hard gate rules scoped to the current wave. The intended rule set is current-wave ledger existence, current-wave output declaration coverage, and successful current-wave slot binding.

Wave2 SHALL NOT add unconditional relay provenance hard gate rules. Wave2 provenance applies only to search/gap-fill/promoted reference outputs, and those conditional rules SHALL be blocking when triggered.

Gate CLI SHALL include a lightweight pre-rule sanity check for unexpanded template variables. Before the deterministic rule loop, the gate SHALL scan `source_url` field values in source YAML and reference artifacts. If any `source_url` value contains `${` (indicating an unexpanded template variable leaked into output), the gate SHALL emit a `template_not_expanded` diagnostic identifying the affected file and field. This diagnostic SHALL NOT by itself fail the gate but SHALL appear in inspect output to help the Agent identify template-level bugs before iterating through the full rule set.

When gate helpers read YAML or JSON files (including `source.yaml`, frontmatter blocks, `rb_output_declarations.jsonl`, and slot result files), parse failures SHALL produce actionable diagnostics. A parse failure SHALL distinguish "file does not exist" from "file exists but cannot be parsed," SHALL include the file path, and SHALL include the parser error message (e.g., YAML syntax error with line number, JSON parse error with position). The generic message "Cannot read or parse YAML array" SHALL be replaced with structured output that the Agent can act on without guessing whether the file is missing or malformed.

For JSON files specifically, gate helpers SHALL attempt deterministic repair before failing. Common JSON malformations produced by LLM agents — trailing commas, missing closing brackets/braces, unquoted property keys, single-quoted strings — SHALL be repaired where the fix is unambiguous. A repair SHALL be considered unambiguous when:

- **Trailing comma**: a comma immediately before `}` or `]` with no following value. Always unambiguous — remove the trailing comma and retry.
- **Missing closing bracket/brace**: the file ends while inside a single unclosed object `{` or array `[` at nesting depth 1. Unambiguous when there is exactly one unclosed delimiter at the top level — append the matching `}` or `]` and retry.
- **Unquoted property key**: a sequence matching `/^[a-zA-Z_$][a-zA-Z0-9_$]*$/` appearing before `:` in what should be a key position. Wrap in double quotes and retry.
- **Single-quoted string**: a sequence delimited by `'...'` containing no unescaped interior single quotes. Replace outer `'` with `"` and retry.

Repairs that require semantic judgment (e.g., guessing which of multiple missing brackets to close, resolving ambiguous `a-b` as subtraction vs unquoted key, mixed bracket types `{ [ ]` vs `[ { }`) SHALL NOT be attempted. If repair succeeds, the gate SHALL log a `json_repaired` diagnostic noting the file and the repair applied; the repaired content SHALL be used for subsequent rule evaluation. If repair fails or the malformation does not match a recognized unambiguous pattern, the parse failure diagnostic SHALL include what was attempted.

For YAML files, gate helpers SHALL attempt deterministic repair for known failure patterns before falling back to diagnostics. The primary target is unescaped ASCII double quotes (`"`, U+0022) embedded inside double-quoted YAML strings — the most common hand-concatenation failure observed in BUG-018. The repair SHALL locate the failure line from the parser error, escape unescaped interior double quotes on that line, and retry parsing. If repair succeeds, the gate SHALL log a `yaml_repaired` diagnostic noting the file, line, and repair applied. If repair fails or the failure pattern is not recognized, the gate SHALL fall back to the actionable parse error diagnostic (file path, line number, parser error message). Additional YAML repair patterns MAY be added in future changes as real-world failure data accumulates.

The initial YAML repair target is single-line double-quoted scalars containing unescaped interior double quotes. Multi-line quoted scalars, block scalars with indentation issues, and other YAML malformation patterns are deferred to future changes as real-world failure data accumulates.

> **Relationship to WNC-009 (write-side prevention):** GSK-002 is the read-side defense — it repairs already-broken files at gate evaluation time. The complementary write-side prevention is defined in `workflow-node-contract` WNC-009, which mandates `yaml.stringify()` / `JSON.stringify()` as the only legal serialization method for sub-agent outputs. These two requirements together form the BUG-018 double defense: source elimination (WNC-009) + read-side tolerance (GSK-002). Neither alone is sufficient — write-side alone leaves legacy data and edge cases broken; read-side alone fixes symptoms without preventing recurrence.

Existing ledger-driven `count_floor`、`content_dedup`、`cache_coverage`、and reference-quality check dispatch SHALL remain available unless a dedicated capability delta modifies them. Filesystem scanning SHALL be used for orphan/diagnostic checks to ensure consistent orphan detection across implementations, but SHALL NOT satisfy ledger-authoritative gate pass conditions.

#### Scenario: Wave0 gate CLI evaluates coverage and slot binding

- **WHEN** `check-gate-wave0-complete.mjs` 被调用
- **THEN** CLI SHALL evaluate `output_declaration_ledger_exists`、`output_declaration_coverage`、and `subagent_slot_presence` rules（如 definition 中定义）
- **AND** CLI SHALL continue to evaluate existing accepted rules that remain in the gate definition

#### Scenario: Wave1 gate keeps accepted reference checks unless separately changed

- **WHEN** `check-gate-wave1-complete.mjs` 被调用
- **THEN** CLI SHALL evaluate provenance rules scoped to `wave1`（如 definition 中定义）
- **AND** accepted reference quality / ledger coverage checks SHALL remain available unless a corresponding delta spec explicitly removes or changes them

#### Scenario: Wave2 gate does not require relay slots for pure synthesis

- **WHEN** `check-gate-wave2-complete.mjs` 被调用
- **AND** no Wave2 search/gap-fill/promoted reference outputs are present
- **THEN** CLI SHALL NOT fail solely because no `subagent_slot_presence` rule for `wave2` passes
- **AND** accepted Wave2 structural/status rules SHALL remain available

#### Scenario: Wave2 promoted reference fails without provenance

- **WHEN** a conditional Wave2 provenance rule targets `reference/00-cross-*.md`
- **AND** such a reference exists without Wave2 output declaration coverage and successful slot binding
- **THEN** the rule SHALL fail the gate
- **AND** the gate MAY also emit `relay_bypass_suspected` diagnostic evidence

## REMOVED Requirements

None. Existing requirements remain valid; check type support is extended, not reduced.

GSK-003 through GSK-006 are preserved unchanged from the accepted `gate-skeleton` spec. They are not listed in this delta header because no explicit modification text is needed: the check type extension in GSK-001 and the rule evaluation extension in GSK-002 are the only gate-skeleton changes required by this change.

## RENAMED Requirements

None.
