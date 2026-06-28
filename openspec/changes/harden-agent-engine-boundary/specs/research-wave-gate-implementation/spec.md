# Research Wave Gate Implementation (delta)

> req: RWG-015

## ADDED Requirements

### Requirement: content_dedup rule SHALL be added to wave0 and wave1 gate definitions

`gate-wave0-complete.definition.json` 和 `gate-wave1-complete.definition.json` SHALL 各增加一条 `content_dedup` 规则。

规则 SHALL 使用：
```json
{
  "id": "content_dedup",
  "check": "content_dedup",
  "target": "output_files",
  "threshold": {
    "jaccard": 0.8,
    "url_dedup": true,
    "homepage_detect": true,
    "self_ref_detect": true
  },
  "failure_message": "检测到虚假或重复 reference 文件"
}
```

`content_dedup` check type SHALL 消费 Agent 产出声明中的 `output_files[]`（`role=reference` 的条目），而非扫描 `reference/` 目录。

gate CLI（`check-gate-wave0-complete.mjs`、`check-gate-wave1-complete.mjs`）SHALL 在 rule iteration 中 dispatch `content_dedup` check 到 `gate-helpers.mjs` 的 `checkContentDedup()` 函数。

#### Scenario: Wave0 gate includes content_dedup in rule set

- **WHEN** `check-gate-wave0-complete.mjs` 评估 gate definition
- **THEN** `content_dedup` rule SHALL be evaluated alongside existing rules（file_exists, schema_valid, count_floor, status_value, trace_event_present）
- **AND** content_dedup fail SHALL cause gate fail

#### Scenario: Wave1 gate includes content_dedup in rule set

- **WHEN** `check-gate-wave1-complete.mjs` 评估 gate definition
- **THEN** `content_dedup` rule SHALL be evaluated alongside existing rules
- **AND** content_dedup fail SHALL cause gate fail

#### Scenario: content_dedup rule definition survives schema validation

- **WHEN** `validate-bundle.mjs` 运行 gate definition schema 验证
- **THEN** gate definition JSON 中的 `content_dedup` rule（含 `threshold` 对象）SHALL 通过 schema 验证

#### Scenario: CLI dispatches content_dedup to gate-helpers

- **WHEN** gate CLI 遍历 rules 并遇到 `check: "content_dedup"` 的 rule
- **THEN** CLI SHALL dispatch 到 `checkContentDedup(referenceDir, rule.threshold)`
- **AND** 返回标准 `{ passed, inspect, advice }` 结构
