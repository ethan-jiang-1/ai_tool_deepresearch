# Gate Skeleton

> req: GSK-001, GSK-002, GSK-003, GSK-004

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
| `check` | yes | Check type；合法值包括 `file_exists`、`yaml_parse`、`jsonl_parse`、`field_non_empty`、`field_value`、`trace_event_present`、`trace_has_events`、`status_value`、`dir_non_empty`、`count_min`、`placeholder` |
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

