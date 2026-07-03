# Gate Skeleton

> req: GSK-001, GSK-002, GSK-003, GSK-004, GSK-005, GSK-006

## Purpose

定义 Workflow Foundation 的 9 个 Gate definition JSON 骨架和 9 个 Gate CLI 骨架的产出要求。建立 gate 文件的统一 shape - definition 和 CLI 的正确结构 - 使后续 content change 只需要在已有文件里增加 rules 和实现逻辑，不再争论文件形态。
## Requirements
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
| `check` | yes | Check type；合法值包括 `file_exists`、`yaml_parse`、`jsonl_parse`、`field_non_empty`、`field_value`、`trace_event_present`、`trace_has_events`、`status_value`、`dir_non_empty`、`count_min`、`placeholder`、`output_declaration_ledger_exists`、`output_declaration_coverage`、`subagent_slot_presence` |
| `target` | yes | 被检查的 file/state path、field、glob 或 trace query |
| `threshold` | no | Count 或 ratio 的 comparison value；不适用时为 `null` |
| `failure_message` | yes | 指向 Agent 的 repair guidance |

Gate definition JSON SHALL 不编码只有 Agent 能做的 semantic research judgment。

#### Scenario: Gate definition is parseable

- **WHEN** `JSON.parse` 读取 `gate-wave0-complete.definition.json`
- **THEN** result MUST 包含 `gate`、`description`、`rules` 三个 key，`rules` MUST 是数组且长度 ≥ 1

#### Scenario: Gate definition has correct gate key

- **WHEN** `gate-wave0-complete.definition.json` 被加载
- **THEN** `gate` 字段的值 MUST 为 `wave0-complete`

### Requirement: Gate CLI skeleton shape

每个 `check-gate-<name>.mjs` SHALL：

1. 解析 `--bundle <path>`（必选）、`--current-node <fileRef>`（必选）、`--transitions <path>`（可选，默认 `DPT_FRAMEWORK/workflows/transitions.chain.json`）
2. 加载对应的 `gate-<name>.definition.json`
3. 校验 `current-node` 与 gate 绑定是否一致
4. 遍历 rules，执行 check，收集 inspect/advice
5. 构造结构化 router `context`，并调用详细 router `resolveNodeTransitionDetailed(transitionsPath, currentNodeRef, outcome, context)` 获取详细路由结果
6. 输出 SHALL 为合法 JSON，包含 `{ check: { passed, gate, currentNodeRef, next }, routing, inspect, advice }`
7. `check.next` SHALL 作为 `routing` 的便捷镜像，仅当 `routing.kind === 'next'` 时取值；其他 `routing.kind` 时 `check.next` SHALL 为 `null`
8. `passed=true` → exit(0)，`passed=false` → exit(1)，terminal routing 不引入独立 exit code，`routing.kind` 为 `no_transition / invalid_input / config_error` 时 exit(2)

**不再接受 `--next` flag**，路由查询由详细 router 内部完成。

#### Scenario: CLI called without --bundle

- **WHEN** `node check-gate-wave0-complete.mjs` 被调用且未提供 `--bundle`
- **THEN** 脚本 MUST 以 `process.exit(2)` 退出，MUST 输出错误信息

#### Scenario: CLI called without --current-node

- **WHEN** `node check-gate-wave0-complete.mjs --bundle dpt_rb_test` 被调用且未提供 `--current-node`
- **THEN** 脚本 MUST 以 `process.exit(2)` 退出，MUST 输出错误信息

#### Scenario: CLI returns valid JSON

- **WHEN** `node check-gate-wave0-complete.mjs --bundle dpt_rb_test --current-node phases/phase-wave0.md` 被调用
- **THEN** stdout MUST 是合法 JSON
- **AND** MUST 包含 `check`（含 `passed`、`gate`、`currentNodeRef`、`next`）、`routing`、`inspect`、`advice` 四个 key

#### Scenario: CLI exit code matches check result

- **WHEN** CLI 返回的 JSON 中 `check.passed` 为 `false`
- **THEN** process exit code MUST 为 1

#### Scenario: CLI exits 2 on routing contract errors

- **WHEN** CLI 调用详细 router 后 `routing.kind` 为 `no_transition`、`invalid_input` 或 `config_error`
- **THEN** process exit code MUST 为 2

### Requirement: One gate per CLI

每个 gate SHALL 对应一个独立的 CLI wrapper 文件。9 个 CLI SHALL 为：

```
check-gate-instantiation-complete.mjs
check-gate-hitl1-recorded.mjs
check-gate-setup-ready.mjs
check-gate-seed-topics-ready.mjs
check-gate-wave0-complete.mjs
check-gate-wave1-complete.mjs
check-gate-wave2-complete.mjs
check-gate-hitl2-recorded.mjs
check-gate-readiness-passed.mjs
```

CLI SHALL NOT 通过统一入口加 subcommand 区分 gate。内部 shared helper（`DPT_FRAMEWORK/engine/helpers/`）可以在后续 content change 中添加，但外部形状必须保持 one gate per CLI。

#### Scenario: Agent invokes a specific gate

- **WHEN** agent 需要运行 `wave0-complete` gate
- **THEN** agent MUST 调用 `node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle <path>`，MUST NOT 调用一个 generic runner 加 `--gate wave0-complete` 参数

### Requirement: Gate CLI SHALL include template_not_expanded pre-rule sanity check

Before the deterministic rule loop, Wave0/Wave1/Wave2 gate CLIs SHALL scan `source_url` field values in source YAML and reference artifacts. If any `source_url` value contains `${` (indicating an unexpanded template variable), the gate SHALL emit a `template_not_expanded` diagnostic identifying the affected file and field. This diagnostic SHALL NOT by itself fail the gate but SHALL appear in inspect output.

### Requirement: Gate helpers SHALL provide actionable parse error diagnostics and deterministic repair

When gate helpers read YAML or JSON files, parse failures SHALL produce diagnostics that distinguish "file does not exist" from "file exists but cannot be parsed," SHALL include the file path, and SHALL include the parser error message with line/position. Generic "Cannot read or parse" messages SHALL be replaced.

For JSON files, gate helpers SHALL attempt deterministic repair for common LLM-produced malformations before failing: trailing commas, single missing closing brackets/braces at depth 1, unquoted property keys matching `/^[a-zA-Z_$][a-zA-Z0-9_$]*$/`, and single-quoted strings. Repaired files SHALL log a `json_repaired` diagnostic.

For YAML files, gate helpers SHALL attempt deterministic repair for unescaped ASCII double quotes (`"`, U+0022) inside double-quoted YAML scalars — the primary hand-concatenation failure pattern. The repair SHALL locate the failure line, escape interior double quotes, and retry parsing. Success SHALL log `yaml_repaired`; failure SHALL fall back to actionable parse error diagnostics. The initial repair target is single-line double-quoted scalars only.

> **Write-side complement:** `workflow-node-contract` WNC-009 mandates `yaml.stringify()` / `JSON.stringify()` for all sub-agent outputs, eliminating malformations at the source. These read-side repairs handle legacy data and edge cases.

### Requirement: Gate CLI evaluates rules from definition

每个 gate CLI SHALL 加载 gate definition JSON，遍历 rules，并在 `currentNodeRef` 与 gate 绑定校验通过后执行 deterministic check。规则执行结果 SHALL 决定 `passed` 或 `failed`，并且该 outcome SHALL 被送入详细 router 生成 `routing` 与 `check.next`。

当前 GSK-004 的覆盖范围包括 9 个已实现的 gate CLI：
- `check-gate-instantiation-complete.mjs`：完整 rule set（~11 条），支持 `dir_exists`、`pattern_match`、`status_value` check type
- `check-gate-hitl1-recorded.mjs`：definition-driven rule evaluation（~6 条），支持 `field_non_empty`、`field_value` check type
- `check-gate-setup-ready.mjs`：definition-driven rule evaluation（~7 条），支持 `cross_field` check type
- `check-gate-seed-topics-ready.mjs`（新增）：definition-driven rule evaluation（~7 条），新增 `dir_non_empty` check type 和 `cross_field` 的 `slug_consistency` mode
- `check-gate-wave0-complete.mjs`：从 placeholder pass 升级为完整 rule evaluation（~7 条），新增 `count_floor`、`trace_event_present` check type
- `check-gate-wave1-complete.mjs`：从 placeholder pass 升级为完整 rule evaluation（~7 条），新增 `pattern_match` check type（用于 false completion claim 检测）
- `check-gate-wave2-complete.mjs`：从 placeholder pass 升级为完整 rule evaluation（~6 条），新增 `cross_field` 引用链验证

所有 CLI SHALL 复用 `DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs` 的 `parseGateCliArgs`、`validateNodeGateBinding`、`resolveRouting`、`buildGateResult`、`emitGateResult`。

#### Scenario: All seven pre-research and wave gate CLIs evaluate real rules

- **WHEN** 任一 pre-research 或 wave gate CLI（instantiation-complete, hitl1-recorded, setup-ready, seed-topics-ready, wave0-complete, wave1-complete, wave2-complete）被调用
- **THEN** CLI SHALL 加载对应的 gate definition JSON
- **AND** CLI SHALL 遍历 definition 中的 rules 数组
- **AND** CLI SHALL NOT 在无规则时恒返回 `passed: true`

#### Scenario: Wave0 gate CLI no longer hardcoded pass

- **WHEN** `check-gate-wave0-complete.mjs` 被调用且 reference 不满足所有 rules
- **THEN** CLI SHALL return `passed: false` with inspect/advice
- **AND** CLI SHALL NOT return `passed: true` without evaluating all rules

#### Scenario: Wave1 gate CLI no longer hardcoded pass

- **WHEN** `check-gate-wave1-complete.mjs` 被调用且 skeleton marker 缺失或存在 false claim
- **THEN** CLI SHALL return `passed: false` with inspect/advice
- **AND** CLI SHALL NOT return `passed: true` without evaluating all rules

#### Scenario: Wave2 gate CLI no longer hardcoded pass

- **WHEN** `check-gate-wave2-complete.mjs` 被调用且 synthesis 为空或引用链不满足
- **THEN** CLI SHALL return `passed: false` with inspect/advice
- **AND** CLI SHALL NOT return `passed: true` without evaluating all rules

#### Scenario: Gate CLI queries router for next

- **WHEN** `check-gate-instantiation-complete.mjs --bundle dpt_rb_x --current-node phases/phase-instantiation.md` 被调用且所有 rule pass
- **THEN** output 的 `routing` SHALL 由详细 router 提供
- **AND** output 的 `check.next` SHALL mirror `routing.next` when `routing.kind === 'next'`
- **AND** SHALL NOT 通过 CLI flag 注入 next

#### Scenario: Gate CLI returns next=null when router has no match

- **WHEN** gate CLI 调用详细 router 且 transition table 中无匹配 entry
- **THEN** output 的 `routing.kind` SHALL be `no_transition`
- **AND** output 的 `check.next` SHALL 为 `null`

#### Scenario: Terminal routing is preserved

- **WHEN** gate CLI 调用详细 router 且 transition table 返回终态
- **THEN** output 的 `routing.kind` SHALL be `terminal`
- **AND** output 的 `check.next` SHALL 为 `null`

#### Scenario: Binding mismatch is rejected

- **WHEN** `current-node` 与 gate definition / manifest 声明的绑定不一致
- **THEN** CLI SHALL 以 exit(2) 退出，并 SHOULD 返回 inspect/advice 说明 mismatch

### Requirement: Gate CLI accepts agent-reported attempt hint for fatigue diagnostics

Gate CLI wrappers SHALL accept an optional `--attempt N` flag (integer, N ≥ 0). The flag is an Agent-reported retry hint for the current gate invocation. When provided, the attempt number SHALL be passed through to `buildGateResult()` as `attemptNumber`. When omitted, `attemptNumber` SHALL default to 0 (meaning no fatigue hint is active for this invocation).

The Engine SHALL NOT treat `--attempt` as Engine-verified consecutive failure state. The Engine does not track, verify, persist, or assert the true number of consecutive gate failures for this change. It only uses the Agent-reported hint to enrich diagnostic output.

`buildGateResult()` SHALL, when `attemptNumber >= fatigueThreshold` (default 3) and the gate has failed (`passed: false`), inject fatigue diagnostic signals into the gate result:

- `check.fatigue_warning` SHALL be `true`
- `check.step_back` SHALL be `true`
- `advice` SHALL include three additional entries:
  1. A message stating the Agent reported retry attempt `attemptNumber` for this gate
  2. A "step back" instruction: re-read the phase instructions for the current node
  3. A stop-mode-safe reminder: if the current node is `stop:no`, do NOT ask the user; follow the degradation priority chain in `shared-silent-execution.md`. The advice SHALL NOT assert that the current node is `stop:no` unless the implementation has verified that fact from accepted node metadata.

When `attemptNumber < fatigueThreshold` or the gate passes, `fatigue_warning` and `step_back` SHALL NOT appear in the result.

`parseGateCliArgs()` SHALL accept `--attempt` as an optional string argument, parse it as a base-10 integer, require it to be non-negative, and include `attempt` in the returned args object. The value SHALL default to 0 when absent, unparseable, negative, non-integer, or present without a value. When `--attempt` is present without a value immediately before another option token, the parser SHALL NOT consume that following option as the attempt value.

The `--attempt` flag SHALL NOT affect gate rule evaluation or routing — it only affects the diagnostic output (advice). The gate's pass/fail determination is independent of the attempt hint.

#### Scenario: Gate CLI returns fatigue warning on agent-reported high attempt

- **WHEN** a gate CLI is invoked with `--attempt 3` and the gate evaluates to fail
- **THEN** the JSON output SHALL include `"fatigue_warning": true` in `check`
- **AND** the JSON output SHALL include `"step_back": true` in `check`
- **AND** `advice` SHALL include a fatigue alert message with the Agent-reported attempt count
- **AND** `advice` SHALL include a conditional stop:no reminder rather than asserting every gate invocation is stop:no
- **AND** `advice` SHALL NOT claim that the Engine verified the true consecutive failure count

#### Scenario: Gate CLI does not return fatigue warning below threshold

- **WHEN** a gate CLI is invoked with `--attempt 1` and the gate fails
- **THEN** `fatigue_warning` and `step_back` SHALL NOT appear in the JSON output
- **AND** the standard failure advice SHALL still be present

#### Scenario: Gate CLI does not return fatigue warning on pass

- **WHEN** a gate CLI is invoked with `--attempt 5` and the gate passes
- **THEN** `fatigue_warning` and `step_back` SHALL NOT appear in the JSON output

#### Scenario: Gate CLI defaults attempt to 0 when omitted

- **WHEN** a gate CLI is invoked without `--attempt`
- **THEN** the gate SHALL evaluate normally
- **AND** no fatigue diagnostic signals SHALL appear in the output

#### Scenario: Missing --attempt value does not consume the next option

- **WHEN** a gate CLI is invoked with bare `--attempt` or `--attempt --transitions <path>`
- **THEN** `parseGateCliArgs()` SHALL return `attempt: 0`
- **AND** any following valid option token, such as `--transitions`, SHALL remain parsed as that option rather than being consumed as the attempt value
- **AND** the gate SHALL evaluate normally without fatigue signals

#### Scenario: Invalid --attempt value treated as 0

- **WHEN** a gate CLI is invoked with `--attempt notanumber`
- **THEN** `parseGateCliArgs()` SHALL return `attempt: 0`
- **AND** the gate SHALL evaluate normally without fatigue signals

#### Scenario: Negative or non-integer --attempt value treated as 0

- **WHEN** a gate CLI is invoked with `--attempt -1` or `--attempt 3.5`
- **THEN** `parseGateCliArgs()` SHALL return `attempt: 0`
- **AND** the gate SHALL evaluate normally without fatigue signals

### Requirement: Shared gate attempt audit helper

`gate-helpers.mjs` SHALL export a `writeGateAttempt(bundlePath, result)` function that writes every gate attempt to two audit destinations:

1. **Logger** (`_logs/run.log`): general-purpose diagnostic log. Records all gate attempts (passed/failed) with gate name, currentNodeRef, next, inspect/advice summary, and `bundle`. This is the primary production diagnostic source.
2. **Trace** (`rb_trace.jsonl`): structured `gate_attempt` JSONL event for automated testing verdicts. Format SHALL include `bundle` alongside existing fields (`ts`, `event`, `gate`, `passed`, `currentNodeRef`, `next`, `inspect_count`, `advice_count`).

**ALL gate CLIs** (existing and new) SHALL call `writeGateAttempt()` before `emitGateResult()`. Gate CLIs SHALL NOT inline `appendFileSync` directly to `rb_trace.jsonl` — `writeGateAttempt()` is the sole mechanism for writing gate trace and log entries.

The function SHALL NOT throw — trace/log write failures MUST NOT affect gate output or exit code.

`writeGateAttempt()` SHALL read `bundle` from `rb_status.json` and include it in both log and trace entries automatically. No gate CLI SHALL need to pass `bundle` explicitly.

#### Scenario: Gate pass writes to both destinations with bundle

- **WHEN** a gate CLI calls `writeGateAttempt(bundlePath, result)` with a passed result
- **THEN** a `gate_attempt` JSONL event SHALL be appended to `rb_trace.jsonl` containing `bundle`
- **AND** a logger INFO line SHALL be appended to `_logs/run.log` containing `bundle`

#### Scenario: Gate fail writes diagnostic detail with bundle

- **WHEN** a gate CLI calls `writeGateAttempt(bundlePath, result)` with a failed result
- **THEN** a logger WARN line SHALL include inspect and advice summaries and `bundle`

#### Scenario: Gate CLI MUST NOT inline trace write

- **WHEN** implementing a new gate CLI or modifying an existing one
- **THEN** the CLI SHALL NOT contain `appendFileSync` calls targeting `rb_trace.jsonl`
- **AND** SHALL use `writeGateAttempt(bundlePath, result)` as the sole trace/log write mechanism

#### Scenario: Audit write failure does not affect gate result

- **WHEN** the trace file or log directory is unwritable
- **THEN** `writeGateAttempt()` SHALL silently catch the error
- **AND** the gate result SHALL still be emitted via `emitGateResult()`
