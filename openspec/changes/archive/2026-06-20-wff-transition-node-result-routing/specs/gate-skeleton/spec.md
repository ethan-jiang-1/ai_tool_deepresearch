> req: GSK-001, GSK-002, GSK-003, GSK-004, TRT-005

## Purpose

定义 Workflow Foundation 的 Gate definition JSON 骨架和 Gate CLI 骨架产出要求。CLI 需要按 current-node 驱动，并把 check/inspect/advice 结构化返回给 Agent。

## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Gate CLI evaluates rules from definition

每个 gate CLI SHALL 加载 gate definition JSON，遍历 rules，并在 `currentNodeRef` 与 gate 绑定校验通过后执行 deterministic check。规则执行结果 SHALL 决定 `passed` 或 `failed`，并且该 outcome SHALL 被送入详细 router 生成 `routing` 与 `check.next`。

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
