# workflow-directory-contract

> req: WDC-003

## MODIFIED Requirements

### Requirement: Gate artifacts location and shape

Gate definition JSON files SHALL 放置在 `DPT_FRAMEWORK/schema/gate_definitions/`，命名 `gate-<gate-name-kebab>.definition.json`。Gate definition SHALL 是 read-only deterministic rule source，属于 framework definition，NOT 被复制进每个 `dpt_rb_*`。

Gate CLI SHALL 放置在 `DPT_FRAMEWORK/cli/gates/`，命名 `check-gate-<gate-name-kebab>.mjs`。每个 gate 对应一个外部 CLI wrapper。CLI SHALL 显式接收 active bundle path（`--bundle` 或等价 flag），不能假设当前工作目录即为目标 bundle。

Gate engine（loader、evaluator）SHALL 放置在 `DPT_FRAMEWORK/engine/gates/` when a per-gate engine module exists。共享 helper SHALL 放置在 `DPT_FRAMEWORK/engine/helpers/`。

Current gate transition-table contract SHALL be represented by `DPT_FRAMEWORK/schema/contracts/gate.mjs`. Gate definition JSON files remain read-only rule sources under `DPT_FRAMEWORK/schema/gate_definitions/` and are loaded by the gate helper / per-gate CLI pipeline; no `gate-definition.mjs` executable contract is part of the current accepted runtime surface.

> Apply note: this retires stale accepted prose about a non-existent `gate-definition.mjs` Zod contract. It is not a rename from a gate-definition schema to `gate.mjs`; `gate.mjs` is the current transition-table contract, while gate definition rule data remains JSON under `schema/gate_definitions/`.

#### Scenario: Gate definition is framework asset not bundle copy

- **WHEN** `dpt_rb_*` 被实例化
- **THEN** gate definition JSON MUST NOT 被复制进 bundle；gate CLI 从 `DPT_FRAMEWORK/` 读取 definition，以 `--bundle` 参数指定检查目标

#### Scenario: One gate per CLI

- **WHEN** agent 需要运行某个 gate
- **THEN** agent MUST 调用独立的 `check-gate-<name>.mjs`，MUST NOT 通过统一入口加 subcommand 区分 gate

#### Scenario: Gate CLI requires bundle path

- **WHEN** gate CLI 被调用时未提供 `--bundle` 参数
- **THEN** CLI SHALL 报错退出，MUST NOT 假设默认 bundle 或扫描目录
