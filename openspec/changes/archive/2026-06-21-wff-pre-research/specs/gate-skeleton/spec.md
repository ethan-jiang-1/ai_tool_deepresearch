> req: GSK-004

## MODIFIED Requirements

### Requirement: Gate CLI evaluates rules from definition

每个 gate CLI SHALL 加载 gate definition JSON，遍历 rules，并在 `currentNodeRef` 与 gate 绑定校验通过后执行 deterministic check。规则执行结果 SHALL 决定 `passed` 或 `failed`，并且该 outcome SHALL 被送入详细 router 生成 `routing` 与 `check.next`。

当前 change 将 GSK-004 的覆盖范围从 1 个 gate CLI（`check-gate-instantiation-complete.mjs`）扩展到 3 个：
- `check-gate-instantiation-complete.mjs`：规则从 2 条扩展为完整 rule set（~11 条），新增 `dir_exists`、`pattern_match`、`status_value` check type 支持
- `check-gate-hitl1-recorded.mjs`：从恒 pass placeholder 升级为完整 rule evaluation（~6 条），新增 `field_non_empty`、`field_value` check type 支持
- `check-gate-setup-ready.mjs`：从恒 pass placeholder 升级为完整 rule evaluation（~7 条），新增 `cross_field` check type 支持

所有三个 CLI SHALL 复用 `DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs` 的 `parseGateCliArgs`、`validateNodeGateBinding`、`resolveRouting`、`buildGateResult`、`emitGateResult`。

#### Scenario: All three pre-research gate CLIs evaluate real rules

- **WHEN** 任一 pre-research gate CLI（instantiation-complete, hitl1-recorded, setup-ready）被调用
- **THEN** CLI SHALL 加载对应的 gate definition JSON
- **AND** CLI SHALL 遍历 definition 中的 rules 数组
- **AND** CLI SHALL NOT 在无规则时恒返回 `passed: true`

#### Scenario: HITL1 gate CLI no longer hardcoded pass

- **WHEN** `check-gate-hitl1-recorded.mjs` 被调用且 `rb_profile.yaml` 不满足所有 rules
- **THEN** CLI SHALL return `passed: false` with inspect/advice
- **AND** CLI SHALL NOT return `passed: true` without evaluating all rules

#### Scenario: Setup gate CLI no longer hardcoded pass

- **WHEN** `check-gate-setup-ready.mjs` 被调用且 bundle 不满足所有 rules
- **THEN** CLI SHALL return `passed: false` with inspect/advice
- **AND** CLI SHALL NOT return `passed: true` without evaluating all rules
