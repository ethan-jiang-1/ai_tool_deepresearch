> req: WNC-001, WNC-003

## MODIFIED Requirements

### Requirement: Phase manifest structure

manifest.json 的每个 phase entry SHALL 包含 `key`、`node`、`gate` 字段。

`next` 字段 SHALL 从 manifest 移除——路由权威转移到 transition table（`DPT_FRAMEWORK/workflows/transitions.chain.json`）。

`gate` 值为 `null` 的 phase（如 `final`）SHALL 不参与 transition table 查询——该 phase 无 gate CLI 调用。

#### Scenario: Manifest phase entry has no next field

- **WHEN** 读取 manifest.json
- **THEN** 每个 phase entry SHALL NOT 包含 `next` 字段
- **AND** SHALL 包含 `key`、`node`、`gate`

#### Scenario: Walker reads next from gate CLI response

- **WHEN** walker 执行 lifecycle
- **THEN** walker SHALL 从 gate CLI 的 JSON 输出的 `check.next` 获取下一 phase 的 node 路径，而非从 manifest 的 `next` 字段
