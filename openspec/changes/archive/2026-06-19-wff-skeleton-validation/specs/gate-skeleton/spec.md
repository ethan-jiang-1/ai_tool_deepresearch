> req: GSK-001, GSK-004

## MODIFIED Requirements

### Requirement: Gate definition JSON skeleton structure

每个 `gate-<name>.definition.json` SHALL 包含以下顶层字段：

| Field | Required | Meaning |
|-------|----------|---------|
| `gate` | yes | Gate key，MUST 匹配 phase metadata 中的 `gate` 值（如 `wave0_complete`） |
| `description` | yes | 该 gate 保护什么的简短说明 |
| `rules` | yes | 有序 deterministic check 数组 |

每个 rule SHALL 包含：

| Field | Required | Meaning |
|-------|----------|---------|
| `id` | yes | 稳定 rule identifier |
| `check` | yes | Check type；合法值包括 `file_exists`、`schema_valid`、`count_floor`、`status_value`、`trace_event_present`、`placeholder` |
| `target` | yes | 被检查的 file/state path、field、glob 或 trace query |
| `threshold` | no | Count 或 ratio 的 comparison value；不适用时为 `null` |
| `failure_message` | yes | 指向 Agent 的 repair guidance |

`gate-instantiation-complete.definition.json` SHALL 包含至少 1 条非 placeholder rule（真实 `file_exists` check）。

其余 7 个 gate definition SHALL 保持 placeholder（每条 1 个 `check: "placeholder"` rule）。

Gate definition JSON SHALL 不编码只有 Agent 能做的 semantic research judgment。

#### Scenario: Gate definition has real rule (instantiation_complete)

- **WHEN** `JSON.parse` 读取 `gate-instantiation-complete.definition.json`
- **THEN** `rules` 数组 MUST 包含至少 1 条 `check` 不为 `"placeholder"` 的 rule

#### Scenario: Other gate definitions remain placeholder

- **WHEN** `JSON.parse` 读取 `gate-wave0-complete.definition.json`
- **THEN** `rules` 数组 SHALL 仍为 1 条 `check: "placeholder"` 的 rule

## ADDED Requirements

### Requirement: Gate CLI evaluates rules from definition

`check-gate-instantiation-complete.mjs` SHALL 在骨架阶段实现 rule evaluation logic：

1. 加载 `gate-instantiation-complete.definition.json`
2. 遍历 `rules` 数组，对每条 rule 执行对应的 `check`
3. `check: "placeholder"` 的 rule SHALL 直接 pass
4. `check: "file_exists"` 的 rule SHALL 检查 `--bundle` 路径下 `target` 文件是否存在
5. 所有 rule pass → `check.passed: true`；任一 rule fail → `check.passed: false`，`inspect` 包含 details，`advice` 包含修复建议

其余 7 个 gate CLI SHALL 保持 placeholder pass。

#### Scenario: Gate checks file existence

- **WHEN** `check-gate-instantiation-complete.mjs --bundle dpt_rb_test` 被调用且 `rb_plan.md` 缺失
- **THEN** output SHALL 为 `check.passed: false`，`inspect` SHALL 包含 `"Missing control file: rb_plan.md"`，`advice` SHALL 包含修复建议

#### Scenario: Gate passes when files exist

- **WHEN** `check-gate-instantiation-complete.mjs --bundle dpt_rb_test` 被调用且所有 required files 存在
- **THEN** output SHALL 为 `check.passed: true`，`inspect` 和 `advice` SHALL 为空数组

> **\[wff-state-chain 更新\]** Gate CLI 的路由查询已演进：`--next` flag 被移除，改为 `--transitions <path>` flag + 内部调用 `askNext()`。Gate 通过 Transition Table 获取 `next_node` 而非从 CLI flag。Output 的 `check.next` 现在来自 `askNext()`，不再是 CLI flag echo。
