# Research Wave Gate Implementation (Delta)

> req: RWG-003, RWG-009, RWG-010

## MODIFIED Requirements

### Requirement: Wave2 complete gate rule set

`gate-wave2-complete.definition.json` SHALL 定义当前 contract 下的 Wave2 rules。

规则 SHALL 覆盖：
- `artifacts/wave2/synthesis.md` 存在且非空（`file_exists` + `field_non_empty`）
- **`artifacts/wave2/cross-topic-ledger.md` 存在且非空**（`file_exists` + `field_non_empty`）
- **`artifacts/wave2/cross-topic-ledger.md` 含 6 个固定 section 标题**（`pattern_match`：验证 "Cross-Topic Scan Matrix" / "Wave1 Legacy Questions" / "Cross-Topic Resolutions" / "Emergent Cross-Topic Questions" / "Exploration Decisions" / "HITL2 Handoff" 各至少出现一次）
- **`artifacts/wave2/finding-index.yaml` 存在且可 parse**（`yaml_parse`）
- synthesis 中包含至少 1 个 Markdown link（`[text](path)` 格式），指向 `reference/`、`artifacts/wave1/` 下的文件，且至少 1 条指向 wave1 的 `evidence-summary.md` 或 `question-list.md`（`cross_field` check type，`mode: "markdown_link_resolution"`）
- **synthesis 中包含至少 1 个 finding id 引用**（`pattern_match`：正则匹配 `W2F-\d{3}`，至少 1 处匹配即 pass——narrative 必须引用至少 1 个 finding id）
- 至少 1 条引用目标在 bundle 中真实存在（`cross_field` — ≥1 有效引用时 pass，0 时 fail）
- trace 中有 `wave2_completion` event（`trace_event_present`）
- `rb_status.json#/current_gate == wave2_complete`（`status_value`）
- `rb_status.json#/next_gate == hitl2_recorded`（`status_value`）
- **所有 seed topic 文件中无残留 `__BACKFILL_WAVE2_JUDGMENT__` 和 `__BACKFILL_PENDING_QUESTIONS__` token**（`pattern_match`，`negate: true`：pattern 找到时 fail，未找到时 pass）
- **synthesis 中至少包含 1 处 wave1 evidence 引用**（`pattern_match`：正则匹配 `\[.*\]\(\.\./wave1/.*/(evidence-summary|question-list)\.md\)`——至少 1 处匹配即 pass。目标文件存在性已被现有 `cross_field` 规则覆盖，此规则只验证引用文本意图）

Gate SHALL NOT 判断 synthesis 是否有洞察、finding triage 是否充分、finding classification 是否准确、或 backfill 内容是否准确。

#### Scenario: All Wave2 rules pass

- **WHEN** 三件套 artifact 均存在且非空、ledger 含所有 6 个固定 section、index 可 parse、synthesis 含 Markdown links + W2F-xxx finding id + wave1 evidence 引用、backfill token 已替换、trace 有 `wave2_completion` event
- **THEN** `check-gate-wave2-complete.mjs` SHALL return `passed: true`

#### Scenario: Empty synthesis fails

- **WHEN** `artifacts/wave2/synthesis.md` 存在但为空
- **THEN** gate SHALL return `passed: false`

#### Scenario: No Markdown links fails

- **WHEN** synthesis 中不包含任何 Markdown link
- **THEN** gate SHALL return `passed: false`
- **AND** `inspect` SHALL 指向缺失的 artifact reference

#### Scenario: All reference targets missing fails

- **WHEN** synthesis 包含 links 但所有目标文件均不存在
- **THEN** gate SHALL return `passed: false`
- **AND** `inspect` SHALL 列出每个失效的引用路径

#### Scenario: At least one valid reference passes

- **WHEN** synthesis 中至少 1 条 Markdown link 指向 bundle 中真实存在的文件
- **THEN** gate SHALL return `passed: true`

#### Scenario: Unreplaced backfill token fails

- **WHEN** 任一 seed topic 文件中仍包含 `__BACKFILL_WAVE2_JUDGMENT__` 或 `__BACKFILL_PENDING_QUESTIONS__` 字面字符串
- **THEN** gate SHALL return `passed: false`
- **AND** `inspect` SHALL 列出包含残留 token 的文件和行号

#### Scenario: No wave1 evidence reference fails

- **WHEN** synthesis 包含有效的 Markdown links 但无一处的 link text 匹配 `../wave1/.../evidence-summary.md` 或 `../wave1/.../question-list.md` 格式
- **THEN** gate SHALL return `passed: false`
- **AND** `inspect` SHALL 指出缺少对 wave1 deepening artifact 的引用

#### Scenario: Ledger missing or empty fails

- **WHEN** `cross-topic-ledger.md` is missing or empty
- **THEN** gate SHALL return `passed: false`
- **AND** `inspect` SHALL indicate missing ledger artifact

#### Scenario: Ledger missing fixed sections fails

- **WHEN** `cross-topic-ledger.md` exists but is missing one or more of the 6 fixed section headings
- **THEN** gate SHALL return `passed: false`
- **AND** `inspect` SHALL list which expected sections are absent

#### Scenario: Finding index YAML unparseable fails

- **WHEN** `finding-index.yaml` exists but is malformed YAML
- **THEN** gate SHALL return `passed: false`
- **AND** `inspect` SHALL indicate YAML parse error

#### Scenario: Synthesis narrative lacks finding id reference

- **WHEN** `synthesis.md` contains wave1 evidence references but no W2F-xxx finding id
- **THEN** gate SHALL return `passed: false`
- **AND** `inspect` SHALL indicate narrative is detached from ledger/index

## ADDED Requirements

### Requirement: Wave2 gate CLI supports pattern_match check type

`check-gate-wave2-complete.mjs` SHALL 支持 `pattern_match` check type（含 `negate` 字段），实现与 `check-gate-wave1-complete.mjs` 一致的语义：

- `negate: false`（默认）：正则 pattern 在目标文件内容中找到至少 1 处匹配时 pass，0 处匹配时 fail
- `negate: true`：正则 pattern 在目标文件内容中找到时 fail（验证某文本**不存在**），找不到时 pass
- `target` 字段：支持单文件路径和 `{topic}` 占位符展开（遍历 topic_registry 为每个 topic 生成独立 check 实例）
- `pattern` 字段：JavaScript 兼容正则表达式字符串

此 check type 已在 wave1 gate CLI 中实现并验证——wave2 gate CLI 复用相同逻辑。

#### Scenario: Pattern_match with negate detects unreplaced backfill token

- **WHEN** seed topic 文件 `seed_topics/X.md` 中仍包含 `__BACKFILL_WAVE2_JUDGMENT__` 字面字符串
- **AND** gate definition 有 rule `{check: "pattern_match", pattern: "__BACKFILL_WAVE2_JUDGMENT__", target: "seed_topics/{topic}.md", negate: true}`
- **THEN** gate SHALL return `passed: false`
- **AND** `inspect` SHALL 列出文件名和匹配行

#### Scenario: Pattern_match detects wave1 evidence reference

- **WHEN** `synthesis.md` 包含 `[topic-a evidence](../wave1/topic-a/evidence-summary.md)`
- **AND** gate definition 有 rule `{check: "pattern_match", pattern: "\\[.*\\]\\(\\.\\./wave1/.*/(evidence-summary|question-list)\\.md\\)", target: "artifacts/wave2/synthesis.md"}`
- **THEN** gate SHALL return `passed: true`

#### Scenario: Pattern_match fails when no wave1 evidence reference

- **WHEN** `synthesis.md` 的所有 Markdown links 都指向 `../../reference/`（wave0 source.yaml），无一匹配 wave1 evidence 格式
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
