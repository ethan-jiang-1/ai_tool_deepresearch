> req: GSK-001, GSK-002, GSK-003, GSK-004

## Purpose

定义 Workflow Foundation 的 8 个 Gate definition JSON 骨架和 8 个 Gate CLI 骨架的产出要求。建立 gate 文件的统一 shape - definition 和 CLI 的正确结构 - 使后续 content change 只需要在已有文件里增加 rules 和实现逻辑，不再争论文件形态。

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
| `check` | yes | Check type；合法值包括 `file_exists`、`schema_valid`、`count_floor`、`status_value`、`trace_event_present`、`placeholder` |
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

1. 使用 `node:util.parseArgs` 解析 `--bundle` 和可选 `--transitions` 参数
2. `--bundle` 未提供时 SHALL `console.error` 并 `process.exit(2)`
3. 通过 `askNext(transitionsPath, gate, state)` 计算 `check.next`；`next` 来自 transition table，不是 `--next` 参数
4. 输出 SHALL 为合法 JSON，包含以下 shape：

```json
{
  "check": { "passed": true, "gate": "<gate-name>", "next": "phases/phase-next.md" },
  "inspect": [],
  "advice": []
}
```

5. `process.exit(0)` on pass，`process.exit(1)` on fail

骨架阶段 CLI SHALL NOT 实现真实 gate evaluation logic。它 SHALL 返回 placeholder pass 或一个预置的 fail（用于演示 repair loop）。

#### Scenario: CLI called without --bundle

- **WHEN** `node check-gate-wave0-complete.mjs` 被调用且未提供 `--bundle`
- **THEN** 脚本 MUST 以 `process.exit(2)` 退出，MUST 输出错误信息

#### Scenario: CLI returns valid JSON

- **WHEN** `node check-gate-wave0-complete.mjs --bundle dpt_rb_test --transitions transitions.chain.json` 被调用
- **THEN** stdout MUST 是合法 JSON，MUST 包含 `check`（含 `passed`、`gate`、`next`）、`inspect`、`advice` 三个 key

#### Scenario: CLI exit code matches check result

- **WHEN** CLI 返回的 JSON 中 `check.passed` 为 `false`
- **THEN** process exit code MUST 为 1

### Requirement: One gate per CLI

每个 gate SHALL 对应一个独立的 CLI wrapper 文件。8 个 CLI SHALL 为：

```
check-gate-instantiation-complete.mjs
check-gate-hitl1-recorded.mjs
check-gate-setup-ready.mjs
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
