# Research Wave Gate Implementation (delta)

> req: RWG-001, RWG-002, RWG-003, RWG-011, RWG-012, RWG-013

注：RWG-011/012/013 为 delta 新增 ID，内容分别嵌入 RWG-001/002/003 的 MODIFIED body 中，不设独立 `### Requirement:` 块。参见 `openspec/governance/req-registry.yaml` 中对应 pending 条目。

## MODIFIED Requirements

### Requirement: Wave0 complete gate rule set

`gate-wave0-complete.definition.json` SHALL 定义当前 contract 下的 Wave0 rules。

规则 SHALL 覆盖：
- `reference/_INDEX.md` 存在且非空（`file_exists` + `field_non_empty`）
- `reference/README.md` 存在且非空（`file_exists` + `field_non_empty`）
- `reference/00-shared-*.md` count_floor ≥ 1（`count_floor` check type，threshold = 1）
- 每个 topic 的 `artifacts/wave0/<topic>/source.yaml` 存在且通过 ReferenceMetadata schema 校验（`schema_valid` check type，schema 见 `DPT_FRAMEWORK/schema/contracts/reference.mjs`）
- 每个 topic 的 `artifacts/wave0/<topic>/source.yaml` 中 reference metadata 条目数量 ≥ foundation floor per topic（`count_floor` check type，threshold = 1）
- trace 中有 `wave0_completion` event（`trace_event_present` check type）
- `rb_status.json#/current_gate == wave0_complete`
- `rb_status.json#/next_gate == wave1_complete`

Foundation floor SHALL 定义为每个 topic 至少 1 条 reference metadata（`count_floor` threshold = 1）。Schema 校验 SHALL 验证每条 reference 的 `url`、`title`、`retrieved_date`、`topic_tag` 均非空且类型正确。

`count_floor` 与 `schema_valid` 的交互：`count_floor` SHALL 统计 `artifacts/wave0/<topic>/source.yaml` 中的**所有** YAML 数组条目（无论是否 schema-valid），`schema_valid` rule 独立校验每条的 schema。两者串联工作：`count_floor` 保证数量下限，`schema_valid` 保证质量。即使所有条目都不通过 schema 校验，`count_floor` 仍可 pass（数量达标），但 `schema_valid` rule 会 fail。Agent 必须在两个 rule 都 pass 时 gate 才通过。

Topic 集合的 source of truth SHALL 为 `rb_plan.md` frontmatter 的 `topic_registry`；`count_floor` 和 per-topic check SHALL 枚举该 registry 中的 topic key，SHALL NOT 扫描 `reference/` 或 `artifacts/wave0/` 子目录。`topic_registry` 为空时 gate SHALL return `passed: false`（缺 research scope），`inspect` SHALL 指向空的 topic registry。

#### Scenario: All Wave0 rules pass

- **WHEN** `_INDEX.md` 存在、`README.md` 存在、`reference/00-shared-*.md` count_floor ≥ 1、每个 topic 至少 1 条 schema-valid reference metadata、trace 有 `wave0_completion` event
- **THEN** `check-gate-wave0-complete.mjs` SHALL return `passed: true`

#### Scenario: Gate passes when 00-shared files and wave0 YAML exist

- **WHEN** `reference/` 包含 ≥1 个 `00-shared-*.md`
- **AND** `reference/_INDEX.md` 和 `README.md` 存在
- **AND** 每个 topic 的 `artifacts/wave0/<topic>/source.yaml` 通过 schema 校验
- **THEN** gate-wave0-complete SHALL pass

#### Scenario: Gate fails when no 00-shared files exist

- **WHEN** `reference/` 中没有 `00-shared-*.md` 文件
- **THEN** gate-wave0-complete SHALL fail
- **AND** inspect SHALL 报告 `count_floor: reference/00-shared-*.md` 未满足

#### Scenario: Empty _INDEX.md fails

- **WHEN** `reference/_INDEX.md` 为空或无实质内容
- **THEN** gate SHALL return `passed: false`
- **AND** `inspect` / `advice` SHALL 指向缺失的 reference content

#### Scenario: Missing per-topic metadata fails

- **WHEN** 某个 topic 缺少 `artifacts/wave0/<topic>/source.yaml`
- **THEN** gate SHALL return `passed: false`

#### Scenario: Invalid metadata schema fails

- **WHEN** `artifacts/wave0/<topic>/source.yaml` 存在但某条 reference 缺少必填字段（如 `url` 为空）
- **THEN** gate SHALL return `passed: false`
- **AND** `inspect` SHALL 列出 schema violation

#### Scenario: Below foundation floor fails

- **WHEN** 任一 topic 的 reference metadata 数量 < 1
- **THEN** gate SHALL return `passed: false`

#### Scenario: Status drift fails

- **WHEN** `rb_status.json` 中 `current_gate` 或 `next_gate` 偏离 Wave0 后的 accepted 值
- **THEN** gate SHALL return `passed: false`

#### Scenario: Empty topic registry fails

- **WHEN** `rb_plan.md` 的 `topic_registry` 为空数组或不存在
- **THEN** gate SHALL return `passed: false`
- **AND** `inspect` SHALL 指出缺少 research scope（空 topic registry）
- **AND** `count_floor` 和 per-topic check SHALL 在 topic 集合为空时直接 fail（inspect 指向空 registry），不展开任何 `{topic}` 占位符实例

### Requirement: Wave1 complete gate rule set

`gate-wave1-complete.definition.json` SHALL 定义当前 contract 下的 Wave1 rules。

规则 SHALL 覆盖：
- `artifacts/wave1/` 目录存在且非空（`dir_exists`）
- 每个 topic 至少 1 个 `artifacts/wave1/<topic>/evidence-summary.md` 文件存在且非空（`file_exists` + `field_non_empty`）
- 每个 topic 至少 1 个 `artifacts/wave1/<topic>/question-list.md` 文件存在且非空（`file_exists` + `field_non_empty`）
- 每个 topic 的 `reference/0N-*.md` count_floor ≥ 1 per topic（`count_floor` check type，threshold = 1，匹配 `reference/<topic-id>-*.md` 但不匹配 `00-shared-*` 或 `00-cross-*`）
- trace 中有 `wave1_completion` event（`trace_event_present`）
- `rb_status.json#/current_gate == wave1_complete`（`status_value`）
- `rb_status.json#/next_gate == wave2_complete`（`status_value`）

Gate SHALL NOT 检查 evidence-summary 或 question-list 内容的研究质量或完整性。

#### Scenario: All Wave1 rules pass

- **WHEN** 每个 topic 都有 `evidence-summary.md` + `question-list.md`、有 ≥1 个 `reference/0N-*.md`、trace 有 `wave1_completion` event
- **THEN** `check-gate-wave1-complete.mjs` SHALL return `passed: true`

#### Scenario: Gate passes when topic-prefixed reference files exist per topic

- **WHEN** topic_registry 有 topic 01、02、03
- **AND** `reference/01-*.md` count ≥ 1、`reference/02-*.md` count ≥ 1、`reference/03-*.md` count ≥ 1
- **AND** 每个 topic 的 `artifacts/wave1/<topic>/evidence-summary.md` 和 `question-list.md` 存在
- **THEN** gate-wave1-complete SHALL pass

#### Scenario: Missing per-topic evidence-summary fails

- **WHEN** 某个 topic 缺少 `artifacts/wave1/<topic>/evidence-summary.md`
- **THEN** gate SHALL return `passed: false`

#### Scenario: Missing per-topic question-list fails

- **WHEN** 某个 topic 缺少 `artifacts/wave1/<topic>/question-list.md`
- **THEN** gate SHALL return `passed: false`

#### Scenario: Gate fails when a topic has no reference files

- **WHEN** topic_registry 有 topic 01、02、03
- **AND** `reference/02-*.md` count = 0
- **THEN** gate-wave1-complete SHALL fail
- **AND** inspect SHALL 报告 topic 02 缺少 topic 专属 reference 文件

### Requirement: Wave2 complete gate rule set

`gate-wave2-complete.definition.json` SHALL 定义当前 contract 下的 Wave2 rules。

规则 SHALL 覆盖：
- `artifacts/wave2/synthesis.md` 存在且非空（`file_exists` + `field_non_empty`）
- `artifacts/wave2/cross-topic-ledger.md` 存在且非空（`file_exists` + `field_non_empty`）
- `artifacts/wave2/cross-topic-ledger.md` 含 6 个固定 section 标题（`pattern_match`：验证 "Cross-Topic Scan Matrix" / "Wave1 Legacy Questions" / "Cross-Topic Resolutions" / "Emergent Cross-Topic Questions" / "Exploration Decisions" / "HITL2 Handoff" 依序出现）
- `artifacts/wave2/finding-index.yaml` 存在且可 parse（`file_exists` + `yaml_parse`）
- synthesis 中包含至少 1 个 Markdown link（`[text](path)` 格式），指向 `reference/`、`artifacts/wave1/` 或其他 accepted artifact 文件
- synthesis 中包含至少 1 个 finding id 引用（`pattern_match`：正则匹配 `W2F-\d{3}`）
- 至少 1 条引用目标在 bundle 中真实存在（`cross_field` check type，`mode: "markdown_link_resolution"`：解析 Markdown links → 验证目标文件存在；≥1 有效引用时 pass）
- synthesis 中至少包含 1 处 wave1 evidence 引用（`pattern_match`：正则匹配 `\[.*\]\(\.\./wave1/.*/(evidence-summary|question-list)\.md\)`）
- 所有 seed topic 文件中无残留 `__BACKFILL_WAVE2_JUDGMENT__` 和 `__BACKFILL_PENDING_QUESTIONS__` token（`pattern_match`，`negate: true`）
- trace 中有 `wave2_completion` event
- `rb_status.json#/current_gate == wave2_complete`
- `rb_status.json#/next_gate == hitl2_recorded`

Gate SHALL NOT 判断 synthesis 是否有洞察、finding triage 是否充分、finding classification 是否准确、或 backfill 内容是否准确。引用格式 SHALL 使用标准 Markdown link `[label](relative/path.md)`，`cross_field` check 将 path 解析为相对于 `artifacts/wave2/` 的路径。

Gate SHALL NOT 检查 `reference/00_shared/source.yaml` 或 `reference/00_shared/` 目录存在性。`00-cross-*.md` 为可选产出，不做 count_floor。

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
- **AND** `inspect` SHALL list the affected seed topic file

#### Scenario: No wave1 evidence reference fails

- **WHEN** synthesis 包含有效的 Markdown links 但无一处 link text 匹配 `../wave1/.../(evidence-summary|question-list).md` 格式
- **THEN** gate SHALL return `passed: false`
- **AND** `inspect` SHALL 指出缺少对 wave1 deepening artifact 的引用

#### Scenario: Ledger missing or empty fails

- **WHEN** `cross-topic-ledger.md` is missing or empty
- **THEN** gate SHALL return `passed: false`
- **AND** `inspect` SHALL indicate missing ledger artifact

#### Scenario: Ledger missing fixed sections fails

- **WHEN** `cross-topic-ledger.md` exists but is missing one or more of the 6 fixed section headings
- **THEN** gate SHALL return `passed: false`
- **AND** `inspect` SHALL indicate the ledger section requirement failed

#### Scenario: Finding index YAML unparseable fails

- **WHEN** `finding-index.yaml` exists but is malformed YAML
- **THEN** gate SHALL return `passed: false`
- **AND** `inspect` SHALL indicate YAML parse error

#### Scenario: Synthesis narrative lacks finding id reference

- **WHEN** `synthesis.md` contains wave1 evidence references but no W2F-xxx finding id
- **THEN** gate SHALL return `passed: false`
- **AND** `inspect` SHALL indicate narrative is detached from ledger/index

#### Scenario: Gate does not check for reference/00_shared/

- **WHEN** gate-wave2-complete 执行检查
- **THEN** rule list SHALL NOT 包含 `file_exists: reference/00_shared/source.yaml` 或 `dir_exists: reference/00_shared/`

#### Scenario: Gate passes with optional 00-cross files or no cross files

- **WHEN** `reference/` 包含 `00-cross-*.md` 文件
- **OR** `reference/` 没有任何 `00-cross-*` 文件
- **AND** artifacts/wave2/ 三件套满足所有 rule
- **THEN** gate-wave2-complete SHALL pass（00-cross-* 是可选产出，不影响 gate pass）
