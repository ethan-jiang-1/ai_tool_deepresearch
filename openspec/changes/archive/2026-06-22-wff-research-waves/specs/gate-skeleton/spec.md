> req: GSK-004

## MODIFIED Requirements

### Requirement: Gate CLI evaluates rules from definition

每个 gate CLI SHALL 加载 gate definition JSON，遍历 rules，并在 `currentNodeRef` 与 gate 绑定校验通过后执行 deterministic check。规则执行结果 SHALL 决定 `passed` 或 `failed`，并且该 outcome SHALL 被送入详细 router 生成 `routing` 与 `check.next`。

当前 GSK-004 的覆盖范围包括 7 个已实现的 gate CLI：
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
