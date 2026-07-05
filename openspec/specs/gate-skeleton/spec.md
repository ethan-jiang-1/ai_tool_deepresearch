# Gate Skeleton

> req: GSK-001, GSK-002, GSK-003, GSK-004, GSK-005, GSK-006, GSK-007, GSK-008, GSK-009

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

### Requirement: Lifecycle gate handoff preflight (GSK-007)

Lifecycle gate CLIs SHALL run a shared handoff preflight before evaluating their gate-specific content rules.

For every covered non-bootstrap manifest lifecycle phase that has an incoming deterministic transition, the preflight SHALL verify:

- the latest passed deterministic `gate_attempt` trace event with a non-null `next` has `next` equal to the current phase node fileRef and names the legal predecessor gate/currentNodeRef; and
- the current phase node has a later route-bound `load_complete(entry=<current phase node fileRef>)` trace event whose `handoff_source_attempt_index` points to the same predecessor `gate_attempt`, proving the Phase Agent consumed that prior gate's `check.next` through `enter-phase` or another accepted loader path that enforces the same predecessor-gate binding.

The preflight SHALL derive lifecycle membership and deterministic incoming edges from `manifest.json` and `transitions.chain.json`; it SHALL NOT infer lifecycle membership from file names alone. If a node has multiple deterministic incoming edges, the preflight SHALL accept the latest valid ordered pair for any legal predecessor edge.

For this change, covered non-bootstrap gate preflight targets are `phases/phase-seed-topics.md`, `phases/phase-wave0.md`, `phases/phase-wave1.md`, `phases/phase-wave2.md`, `phases/phase-hitl2.md`, `phases/phase-readiness.md`, and `phases/phase-rerun.md`. `phases/phase-final.md` has no gate preflight because Final has `gate: null`, but readiness→final entry still SHALL be witnessed before `advance-status --to readiness_passed` writes terminal status. Bootstrap inbound targets `phases/phase-instantiation.md`, `phases/phase-hitl1.md`, and `phases/phase-setup.md` are compatibility exceptions unless separately migrated. The validator allowlist SHALL name these exact bootstrap/final exceptions; no other lifecycle node may be omitted silently.

If the trace contains a newer `gate_attempt` for the same predecessor gate/currentNodeRef after an otherwise valid passed handoff, and that newer attempt failed or passed with a different `next`, the older passed handoff SHALL be treated as superseded and SHALL NOT satisfy preflight.

For branch-sensitive deterministic routes such as HITL2 proceed versus HITL2 rerun, the preflight SHALL validate the concrete target already emitted in `gate_attempt.next`. It SHALL NOT read profile state to choose a branch and SHALL NOT prefer a default `passed` edge when the trace authorizes a different legal deterministic target.

The HITL2 gate CLI SHALL emit the selected deterministic routing outcome for fixed-target HITL2 decisions. When `human_decision_checkpoints.hitl2.user_decision` is `proceed_to_readiness`, the gate's successful routing outcome SHALL be `passed`, yielding `check.next: "phases/phase-readiness.md"`. When the decision is `rerun`, the gate's successful routing outcome SHALL be `rerun`, yielding `check.next: "phases/phase-rerun.md"`. Non-deterministic HITL2 decisions (`request_view_revision`, `repair`, `stop_blocked`) SHALL NOT be defaulted to the readiness handoff.

For deterministic lifecycle gates covered by this change, gate status validation SHALL be derived from the same manifest/chain predecessor set rather than hardcoded to the gate's own enum as `current_gate` before the gate has passed. Before a covered current node's gate evaluates content rules:

- `rb_status.json#/next_gate` SHALL equal the current node's gate enum;
- `rb_status.json#/current_gate` SHALL equal a legal predecessor source gate enum whose passed `gate_attempt.next` points to the current node; and
- old hardcoded checks such as requiring wave2's `current_gate` to be `wave2_complete` before the wave2 gate passes SHALL be replaced or interpreted through this status-window rule.

If preflight fails, the gate CLI SHALL return normal gate failure output (`passed: false`, exit 1) with `inspect` and `advice` naming the missing trace evidence. It SHALL NOT change routing authority or select a next node.

For a covered deterministic gate success that emits a non-null `check.next`, the `gate_attempt(passed=true,next=<target>)` trace event is authoritative handoff evidence. The gate CLI SHALL NOT report a successful covered route if that required trace append cannot be made durable. Non-routing failures or legacy failed attempts MAY continue to tolerate audit write failures as diagnostics-only, but a non-durable covered pass MUST fail closed or produce explicit diagnostics instead of certifying a route the later helper cannot witness.

#### Scenario: Gate fails when prior gate pass is missing

- **WHEN** `check-gate-wave1-complete.mjs` is called for `phases/phase-wave1.md`
- **AND** the latest passed deterministic `gate_attempt` with non-null `next` is not `gate: "wave0-complete"`, `currentNodeRef: "phases/phase-wave0.md"`, `next: "phases/phase-wave1.md"`
- **THEN** the gate SHALL return `passed: false`
- **AND** `inspect` SHALL identify the missing current predecessor handoff pass

#### Scenario: Gate fails when current phase was not entered

- **WHEN** `check-gate-wave1-complete.mjs` is called for `phases/phase-wave1.md`
- **AND** trace contains `gate_attempt(passed=true, gate="wave0-complete", next="phases/phase-wave1.md")`
- **AND** `rb_trace.jsonl` lacks `load_complete` for `phases/phase-wave1.md`
- **THEN** the gate SHALL return `passed: false`
- **AND** `advice` SHALL tell the Agent to run `enter-phase --bundle <bundle> --node phases/phase-wave1.md`

#### Scenario: Gate rejects stale or mismatched load complete

- **WHEN** `check-gate-wave1-complete.mjs` is called for `phases/phase-wave1.md`
- **AND** trace contains `load_complete(entry="phases/phase-wave1.md")` before the matching `gate_attempt(passed=true, gate="wave0-complete", next="phases/phase-wave1.md")`
- **THEN** the preflight SHALL NOT treat that stale load as a valid handoff witness
- **AND** the gate SHALL return `passed: false` with advice to rerun `enter-phase`

#### Scenario: Gate rejects unbound load complete

- **WHEN** `check-gate-wave1-complete.mjs` is called for `phases/phase-wave1.md`
- **AND** trace contains a later `load_complete(entry="phases/phase-wave1.md")` whose `handoff_source_attempt_index` is missing or points to a different `gate_attempt`
- **THEN** the preflight SHALL NOT treat that load as a valid handoff witness
- **AND** the gate SHALL return `passed: false` with advice to rerun `enter-phase`

#### Scenario: Gate rejects superseded predecessor pass

- **WHEN** `check-gate-wave1-complete.mjs` is called for `phases/phase-wave1.md`
- **AND** trace contains an older passed `wave0-complete` attempt whose `next` points to `phases/phase-wave1.md`
- **AND** a newer `wave0-complete` attempt failed or passed with a different `next`
- **THEN** the preflight SHALL NOT treat the older pass as a valid handoff
- **AND** the gate SHALL return `passed: false` with advice to rerun the source gate and `enter-phase`

#### Scenario: Gate evaluates normal rules after witnessed handoff

- **WHEN** the prior gate pass has `next` equal to the current node and a later current-node `load_complete` witness is present
- **THEN** the gate SHALL continue to evaluate its existing definition rules
- **AND** pass/fail SHALL still be determined by the full rule set

#### Scenario: Downstream gate accepts source-gate status window

- **WHEN** wave1 has passed, `enter-phase` has loaded `phases/phase-wave2.md`, and source-gate status synchronization has written `current_gate: "wave1_complete"` and `next_gate: "wave2_complete"`
- **AND** `check-gate-wave2-complete.mjs` is called for `phases/phase-wave2.md`
- **THEN** the shared gate status preflight SHALL accept the status window
- **AND** the gate SHALL NOT fail merely because `current_gate` is not yet `wave2_complete`
- **AND** the gate SHALL continue to evaluate wave2's normal content rules

#### Scenario: Rerun path accepts legal alternate predecessor

- **WHEN** rerun has passed with `gate_attempt(passed=true, gate="rerun-ready", currentNodeRef="phases/phase-rerun.md", next="phases/phase-seed-topics.md")`
- **AND** a later `load_complete(entry="phases/phase-seed-topics.md")` exists
- **AND** source-gate status synchronization has written `current_gate: "rerun_ready"` and `next_gate: "seed_topics_ready"`
- **THEN** the seed-topics gate preflight SHALL accept the rerun predecessor as legal
- **AND** it SHALL NOT require the setup predecessor for that run

#### Scenario: HITL2 rerun branch validates selected deterministic target

- **WHEN** HITL2 has produced a deterministic rerun handoff with `gate_attempt(passed=true, gate="hitl2-recorded", currentNodeRef="phases/phase-hitl2.md", next="phases/phase-rerun.md")`
- **AND** a later `load_complete(entry="phases/phase-rerun.md")` exists
- **THEN** the rerun gate preflight SHALL accept HITL2 as the legal predecessor for `phases/phase-rerun.md`
- **AND** it SHALL NOT replace the selected rerun target with `phases/phase-readiness.md`

#### Scenario: HITL2 gate emits rerun outcome from recorded decision

- **WHEN** `check-gate-hitl2-recorded.mjs` is called after `human_decision_checkpoints.hitl2.user_decision` is recorded as `rerun`
- **AND** all HITL2 gate rules pass
- **THEN** the gate result SHALL have `check.passed: true`
- **AND** routing SHALL use outcome `rerun`
- **AND** `check.next` SHALL be `phases/phase-rerun.md`
- **AND** the resulting `gate_attempt` trace event SHALL contain `next: "phases/phase-rerun.md"`

#### Scenario: HITL2 gate does not default non-deterministic decisions to readiness

- **WHEN** `check-gate-hitl2-recorded.mjs` is called after `human_decision_checkpoints.hitl2.user_decision` is recorded as `request_view_revision`, `repair`, or `stop_blocked`
- **AND** the decision is otherwise validly recorded
- **THEN** the gate SHALL NOT emit `check.next: "phases/phase-readiness.md"` solely because HITL2 rules passed
- **AND** deterministic handoff witnessing SHALL NOT treat that decision as a readiness handoff

#### Scenario: Terminal final entry is witnessed before readiness status sync

- **WHEN** readiness has passed with `check.next: "phases/phase-final.md"`
- **AND** `enter-phase` has written a later `load_complete(entry="phases/phase-final.md")`
- **THEN** `advance-status --to readiness_passed` SHALL be eligible to write `next_gate: "none"`
- **AND** final delivery SHALL still be governed by the Final node, not by the readiness gate itself

#### Scenario: Covered gate pass is trace-durable

- **WHEN** a covered lifecycle gate's content rules pass and routing emits non-null `check.next`
- **AND** appending the authoritative `gate_attempt(passed=true,next=<target>)` to `rb_trace.jsonl` fails
- **THEN** the gate CLI SHALL NOT return a misleading successful handoff
- **AND** later `enter-phase`, `advance-status`, or gate preflight SHALL NOT be forced to trust console output without durable trace evidence

### Requirement: Lifecycle gate preflight wiring is enforced (GSK-007)

The project SHALL include a regression check or validator that verifies every applicable lifecycle gate CLI invokes the shared handoff preflight/status-window helper.

The check SHALL fail if an applicable gate CLI omits the helper call or replaces it with ad hoc inline logic. The goal is to prevent a shared enforcement mechanism from existing without being wired into the real runtime path. Applicable covered gates include setup onward deterministic lifecycle gates and rerun-entry coverage where the runtime emits the corresponding deterministic handoff. Instantiation/HITL1 bootstrap exceptions SHALL be named explicitly in the validator allowlist rather than omitted silently.

The same validator or companion regression SHALL fail if a covered gate definition or gate-specific status check still requires `current_gate` to equal the gate's own enum before that gate has passed. Covered gates SHALL use the source-gate status window, except for explicitly allowlisted bootstrap compatibility cases.

#### Scenario: Missing preflight call fails validation

- **WHEN** an applicable lifecycle gate CLI does not invoke the shared handoff preflight helper
- **THEN** the wiring test or validator SHALL fail
- **AND** the failure SHALL name the gate CLI that is missing the call

#### Scenario: Stale own-gate status expectation fails validation

- **WHEN** a covered downstream gate definition still hardcodes `rb_status.json#/current_gate` to that same gate's enum before pass
- **THEN** the validator SHALL fail
- **AND** the failure SHALL name the stale rule or gate definition

### Requirement: Engine-derived gate attempt diagnostics (GSK-008)

Gate result construction SHALL include Engine-derived attempt diagnostics based on trace and diagnostic artifacts, not solely on Agent-reported `--attempt`.

The diagnostics SHALL include:

- `attempt_count`: count of relevant attempts for the current gate in the current phase context;
- `attempt_trend`: one of `first`, `converging`, `stalled`, or `regressed`;
- `newly_passing`: rule IDs that failed in the previous comparable attempt and now pass;
- `still_failing`: rule IDs that failed in both previous and current comparable attempts;
- `regressed`: rule IDs that previously passed and now fail.

`attempt_count` SHALL be scoped to the current node entry: it counts comparable attempts for the same gate/currentNodeRef after the latest relevant `load_complete(entry=<currentNodeRef>)`. Historical attempts before a later node re-entry SHALL NOT inflate a fresh phase attempt count.

Delta diagnostics SHALL prefer stable rule identifiers from `failed_rule_ids` in the current result or prior diagnostic artifact. Human-readable `inspect` prose MAY be used only as a legacy fallback; new rule-level diagnostics SHOULD expose stable IDs so wording changes do not corrupt `newly_passing`, `still_failing`, or `regressed`.

When a gate passes after the fatigue threshold, the gate result SHALL include stop-mode-safe autonomous continuation advice: `check.next` must be consumed through `enter-phase`, final delivery happens at `phase-final`, and high gate friction does not authorize premature chat synthesis.

The existing `--attempt N` flag SHALL remain accepted as an Agent-reported hint, but it SHALL NOT be the authoritative source for the Engine-derived attempt diagnostics.

#### Scenario: High-attempt pass emits autonomous continuation advice

- **WHEN** a gate passes after the Engine-derived attempt count reaches the fatigue threshold
- **THEN** the gate result SHALL include advice telling the Agent to consume `check.next` through `enter-phase`
- **AND** the advice SHALL state that final report delivery occurs at `phase-final`
- **AND** the advice SHALL NOT ask the user whether to continue

#### Scenario: Delta diagnostics report converging repair

- **WHEN** the current gate attempt fixes at least one rule that failed in the previous comparable attempt
- **THEN** the gate result or diagnostic artifact SHALL list that rule ID under `newly_passing`
- **AND** `attempt_trend` SHALL be `converging` unless other regressions dominate

#### Scenario: Attempt count resets after node re-entry

- **WHEN** trace contains older attempts for a gate before the latest `load_complete(entry=<currentNodeRef>)`
- **AND** the current gate is run after that node re-entry
- **THEN** `attempt_count` SHALL exclude the older pre-entry attempts
- **AND** fatigue advice SHALL be based on the current entry window rather than stale historical friction

#### Scenario: Delta diagnostics use stable failed rule IDs

- **WHEN** a prior diagnostic artifact contains `failed_rule_ids`
- **AND** the current gate result contains `failed_rule_ids`
- **THEN** `newly_passing`, `still_failing`, and `regressed` SHALL be computed from those stable IDs
- **AND** changes to `inspect` prose SHALL NOT change the delta classification

### Requirement: Cascade-masked diagnostics remain non-authority (GSK-008)

Wave0 gate diagnostics SHALL mark downstream rule failures as masked when an upstream per-topic parse or schema failure makes those downstream checks non-independent.

Masked diagnostics SHALL clarify root cause and reduce duplicate failure noise. They SHALL NOT count as passing rules, SHALL NOT hide the upstream failure, and SHALL NOT change gate pass/fail truth.

#### Scenario: Downstream count is masked by schema failure

- **WHEN** a topic source file cannot be parsed or fails schema validation
- **AND** a downstream count-floor check for the same topic cannot be meaningfully evaluated
- **THEN** the diagnostic artifact SHALL mark the downstream count-floor result as `masked: true`
- **AND** the gate SHALL still fail because the upstream schema/parse rule failed

### Requirement: Gate CLI exit-code behavior aligns with framework convention

Gate CLI wrappers SHALL align their documented exit-code behavior with the framework-wide CLI exit-code convention while preserving existing runtime semantics.

For gate CLIs, structured stdout `{ check, routing, inspect, advice }` SHALL be the primary Agent decision surface. Numeric exit code SHALL remain a coarse control-flow signal:

- `0` when the gate passes and no routing/config/invocation error overrides the result;
- `1` for normal gate failure, handoff preflight failure, status-window failure, or content/rule failure that the Agent can inspect and repair; and
- `2` for routing contract, configuration, binding, or invocation errors such as invalid input, config error, missing required flags, or caller misuse.

Gate CLIs SHALL NOT encode morale, fatigue, reassurance, or continuation encouragement in the numeric exit code. High-friction pass/fail guidance, repair strategy, final-delivery reassurance, and autonomous-continuation reminders SHALL be expressed through `advice[]`, diagnostic artifacts, or Agent-readable Markdown without changing the numeric code for the underlying condition.

#### Scenario: Gate caller reads stdout before deciding

- **WHEN** a gate CLI exits with any code
- **THEN** the Agent caller SHALL treat stdout JSON as the actionable contract
- **AND** it SHALL inspect `check.passed`, `check.next`, `routing.kind`, `inspect[]`, and `advice[]` before deciding the next action

#### Scenario: Handoff preflight failure remains normal repairable failure

- **WHEN** a lifecycle gate fails because a required entry witness is missing
- **THEN** the gate SHALL use the normal gate failure class and emit repair advice naming `enter-phase`
- **AND** it SHALL NOT use exit code to express frustration, reassurance, or encouragement

#### Scenario: High-friction pass keeps pass code

- **WHEN** a gate passes after many attempts and emits autonomous-continuation advice
- **THEN** the process exit code SHALL remain the normal pass code
- **AND** advice SHALL carry the continuation reminder that `check.next` must be consumed through the accepted handoff path
