# Agentic Queue (delta)

> req: AGQ-017, AGQ-018

## ADDED Requirements

### Requirement: claim() SHALL validate --actor matches targets.controller

`claim()` 在返回 task card 前 SHALL 校验 `--actor` 参数与 task card 的 `targets.controller` 是否匹配。

- `targets.controller === "sub-agent"` SHALL 要求 `--actor sub-agent`
- `targets.controller === "main-agent"` SHALL 要求 `--actor main-agent`
- `targets.controller === "engine"` SHALL 要求 `--actor engine`

不匹配 SHALL 被拒绝：`claim()` SHALL NOT 返回 task card，feedback SHALL 指明 actor 不匹配及期望的 actor。

搜索类 task（`delegates.to: "sub-agent"`）的 task card 模板 SHALL 将 `targets.controller` 从 `"main-agent"` 改为 `"sub-agent"`。Phase Agent（--actor main-agent）SHALL NOT 能 claim 这些 task——必须 spawn Sub-agent（--actor sub-agent）执行。

#### Scenario: Sub-agent actor claims sub-agent task successfully

- **WHEN** task card 的 `targets.controller` 为 `"sub-agent"`
- **AND** `claim()` 以 `--actor sub-agent` 调用
- **THEN** claim SHALL succeed 并返回 task card

#### Scenario: Main-agent actor rejected for sub-agent task

- **WHEN** task card 的 `targets.controller` 为 `"sub-agent"`
- **AND** `claim()` 以 `--actor main-agent` 调用
- **THEN** claim SHALL fail
- **AND** feedback SHALL 指明 "actor mismatch: --actor main-agent but controller requires sub-agent"

#### Scenario: Main-agent actor claims main-agent task successfully

- **WHEN** task card 的 `targets.controller` 为 `"main-agent"`（如 seed_topic_materialize）
- **AND** `claim()` 以 `--actor main-agent` 调用
- **THEN** claim SHALL succeed

### Requirement: complete() SHALL validate _cache/ trail for delegated tasks

`complete()` 在处理 delegated task（`targets.delegates.to === "sub-agent"`）时 SHALL 强制检查 `_cache/` trail。检查 SHALL 从 `cache_trails[]` 声明中获取路径列表（见 AGO-002）。

对每条 `cache_trails[]` 中的路径，`complete()` SHALL 验证：
1. 目录存在
2. 目录下至少有一个 `sNN_*/` 子目录
3. 每个 `sNN_*/` 子目录下 SHALL 包含 `websearch.json`、`page.md`、`meta.json` 三个文件

任一检查失败 SHALL cause `complete()` reject，feedback SHALL 指明缺失的具体目录或文件。

`targets.delegates` 不存在时（直接 Phase Agent 执行的 task），`complete()` SHALL NOT 检查 `_cache/` trail。

#### Scenario: Complete cache trail passes completion

- **WHEN** delegated task 的 result 声明 `cache_trails: ["_cache/wave0/primary/01_test/s01_source/"]`
- **AND** 该目录包含 `s01_source/websearch.json` + `s01_source/page.md` + `s01_source/meta.json`
- **THEN** `complete()` SHALL accept（cache trail 检查通过）

#### Scenario: Missing cache directory rejects completion

- **WHEN** delegated task 的 `cache_trails` 声明的路径不存在
- **THEN** `complete()` SHALL reject
- **AND** feedback SHALL 指明 "cache trail missing: directory not found at <path>"

#### Scenario: Missing meta.json rejects completion

- **WHEN** `sNN_*/` 子目录存在但缺少 `meta.json`
- **THEN** `complete()` SHALL reject
- **AND** feedback SHALL 指明 "cache trail incomplete: missing meta.json in <path>"

#### Scenario: Non-delegated task skips cache check

- **WHEN** task card 无 `targets.delegates`（如 seed_topic_materialize）
- **AND** `complete()` 被调用
- **THEN** cache trail 检查 SHALL be skipped
- **AND** `complete()` SHALL 只检查标准 receipt（file:/json:/queue: 等）
