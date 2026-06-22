> req: RWG-001, RWG-002, RWG-003, RWG-004, RWG-005, RWG-006, RWG-007, RWG-008

## Purpose

定义 `wave0-complete`、`wave1-complete`、`wave2-complete` 三个 gate 的真实 deterministic rule set 和 CLI 实现要求。所有规则都基于当前 accepted executable surface：现有 bundle files、reference/artifacts 目录结构、reference metadata schema、trace contract。Gate 不做研究质量判断。

## Requirements

### Requirement: Wave0 complete gate rule set

`gate-wave0-complete.definition.json` SHALL 定义当前 contract 下的 Wave0 rules。

规则 SHALL 覆盖：
- `reference/index.md` 存在且非空
- `reference/` 目录存在且非空
- 每个 topic 的 `reference/<topic>/source.yaml` 存在且通过 ReferenceMetadata schema 校验（`schema_valid` check type，schema 见 `DPT_FRAMEWORK/schema/contracts/reference.mjs`）
- reference metadata 数量 ≥ foundation floor per topic（`count_floor` check type）
- trace 中有 `wave0_completion` event（`trace_event_present` check type）
- `rb_status.json#/current_gate == wave0_complete`
- `rb_status.json#/next_gate == wave1_complete`

Foundation floor SHALL 定义为每个 topic 至少 1 条 reference metadata（`count_floor` threshold = 1）。Schema 校验 SHALL 验证每条 reference 的 `url`、`title`、`retrieved_date`、`topic_tag` 均非空且类型正确。

`count_floor` 与 `schema_valid` 的交互：`count_floor` SHALL 统计 `reference/<topic>/source.yaml` 中的**所有** YAML 数组条目（无论是否 schema-valid），`schema_valid` rule 独立校验每条的 schema。两者串联工作：`count_floor` 保证数量下限，`schema_valid` 保证质量。即使所有条目都不通过 schema 校验，`count_floor` 仍可 pass（数量达标），但 `schema_valid` rule 会 fail。Agent 必须在两个 rule 都 pass 时 gate 才通过。

Topic 集合的 source of truth SHALL 为 `rb_plan.md` frontmatter 的 `topic_registry`；`count_floor` 和 per-topic check SHALL 枚举该 registry 中的 topic key，SHALL NOT 扫描 `reference/` 子目录。`topic_registry` 为空时 gate SHALL return `passed: false`（缺 research scope），`inspect` SHALL 指向空的 topic registry。

#### Scenario: All Wave0 rules pass

- **WHEN** reference index 存在、每个 topic 至少 1 条 schema-valid reference metadata、trace 有 `wave0_completion` event
- **THEN** `check-gate-wave0-complete.mjs` SHALL return `passed: true`

#### Scenario: Empty reference index fails

- **WHEN** `reference/index.md` 为空或无实质内容
- **THEN** gate SHALL return `passed: false`
- **AND** `inspect` / `advice` SHALL 指向缺失的 reference content

#### Scenario: Missing per-topic metadata fails

- **WHEN** 某个 topic 缺少 `reference/<topic>/source.yaml`
- **THEN** gate SHALL return `passed: false`

#### Scenario: Invalid metadata schema fails

- **WHEN** `reference/<topic>/source.yaml` 存在但某条 reference 缺少必填字段（如 `url` 为空）
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
- `artifacts/wave1/` 目录存在且非空
- 每个 topic 至少 1 个 `artifacts/wave1/<topic>/skeleton.md` 文件存在
- 每个 skeleton artifact 非空且显式标记 `capability: foundation-placeholder`（`field_value` 或 `pattern_match` check type）
- skeleton artifact 中无 false completion claim（`pattern_match` check type，`negate: true`：pattern 找到时 fail，未找到时 pass。排除 "full subagent coverage completed"、"deepening done"、"candidate intake completed"、"fan-in review completed" 等字样）
- trace 中有 `wave1_completion` event
- `rb_status.json#/current_gate == wave1_complete`
- `rb_status.json#/next_gate == wave2_complete`

Gate SHALL NOT 检查 skeleton 内容的研究质量或完整性。

#### Scenario: All Wave1 rules pass

- **WHEN** 每个 topic 都有 skeleton artifact、标记了 `foundation-placeholder`、无 false completion claim、trace 有 `wave1_completion` event
- **THEN** `check-gate-wave1-complete.mjs` SHALL return `passed: true`

#### Scenario: Missing per-topic skeleton fails

- **WHEN** 某个 topic 缺少 `artifacts/wave1/<topic>/skeleton.md`
- **THEN** gate SHALL return `passed: false`

#### Scenario: Missing placeholder marker fails

- **WHEN** skeleton artifact 存在但未标记 `capability: foundation-placeholder`（或等价 marker）
- **THEN** gate SHALL return `passed: false`
- **AND** `inspect` SHALL 指向缺失 marker

#### Scenario: False completion claim fails

- **WHEN** skeleton artifact 中包含 "full subagent coverage completed"、"deepening done" 或等价 false claim
- **THEN** gate SHALL return `passed: false`
- **AND** `inspect` SHALL 指出具体违规文本

### Requirement: Wave2 complete gate rule set

`gate-wave2-complete.definition.json` SHALL 定义当前 contract 下的 Wave2 rules。

规则 SHALL 覆盖：
- `artifacts/wave2/synthesis.md` 存在且非空
- synthesis 中包含至少 1 个 Markdown link（`[text](path)` 格式），指向 `reference/` 或 `artifacts/wave1/` 下的文件
- 至少 1 条引用目标在 bundle 中真实存在（`cross_field` check type，`mode: "markdown_link_resolution"`：解析 Markdown links → 验证目标文件存在；≥1 有效引用时 pass）
- trace 中有 `wave2_completion` event
- `rb_status.json#/current_gate == wave2_complete`
- `rb_status.json#/next_gate == hitl2_complete`

Gate SHALL NOT 判断 synthesis 是否有洞察或引用是否充分。引用格式 SHALL 使用标准 Markdown link `[label](relative/path.md)`，`cross_field` check 将 path 解析为相对于 `artifacts/wave2/` 的路径。

#### Scenario: All Wave2 rules pass

- **WHEN** synthesis 存在、非空、引用目标存在、trace 有 `wave2_completion` event
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

`check-gate-wave1-complete.mjs` SHALL 从 placeholder pass 升级为 definition-driven rule evaluation。

实现 SHALL 支持：
- `file_exists`
- `dir_exists`
- `field_value`
- `field_non_empty`
- `pattern_match`（placeholder marker 检测用正向匹配 `negate: false`；false completion claim 检测用反向匹配 `negate: true`，pattern 找到时 fail）
- `status_value`
- `trace_event_present`（target: `wave1_completion`）

实现 SHALL 复用 `gate-helpers.mjs` 的标准 pipeline。

实现 SHALL 支持 `{topic}` 占位符展开（与 wave0 CLI 一致，design D5）。

#### Scenario: Wave1 CLI no longer hardcoded pass

- **WHEN** skeleton artifact 缺少 placeholder marker 或包含 false completion claim
- **THEN** CLI SHALL return `passed: false` with inspect/advice
- **AND** CLI SHALL NOT return `passed: true` without evaluating all rules

### Requirement: Gate CLI evaluates wave2 rules from definition

`check-gate-wave2-complete.mjs` SHALL 从 placeholder pass 升级为 definition-driven rule evaluation。

实现 SHALL 支持：
- `file_exists`
- `field_non_empty`
- `cross_field`（`mode: "markdown_link_resolution"`：解析 Markdown links → 验证目标文件存在）
- `status_value`
- `trace_event_present`（target: `wave2_completion`）

`cross_field` check SHALL：1) 读取 `artifacts/wave2/synthesis.md` 内容；2) 用正则提取所有 Markdown link `[text](relative/path.md)`；3) 将每个 path 解析为相对于 `artifacts/wave2/` 的绝对路径；4) 验证每个目标文件存在；5) ≥1 个有效引用时 pass；0 个时 fail。

#### Scenario: Wave2 CLI no longer hardcoded pass

- **WHEN** synthesis 为空或引用链不满足（0 有效引用）
- **THEN** CLI SHALL return `passed: false` with inspect/advice
- **AND** CLI SHALL NOT return `passed: true` without evaluating all rules

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
