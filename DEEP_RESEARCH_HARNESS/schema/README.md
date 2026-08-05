# schema/ — Read-Only Schema, Enum, and Gate Definition Assets

## Role

此目录定义 workflow-foundation 的 schema contracts、domain enums、和 gate 规则定义。所有文件是 **read-only framework assets**（git tracked），由 gate CLI、engine、和 Zod validators 在运行时读取。运行时状态在 bundle 中。

## Structure — 三层

```
schema/
  enums.mjs                  ← Zod enum definitions（CurrentGate, RunState, ResearchProfile 等）
  contracts/                 ← Zod schema contracts（plan, profile, status, queue, gate, trace）
  gate_definitions/          ← Gate rule definition JSON（每个 gate 一个 .definition.json）
  index.mjs                  ← 聚合 re-export（contracts + 部分 enums）
```

### enums.mjs — Domain Enums

Zod enum 定义，被 `contracts/` 中的 schema 引用。修改 enum 时 **MUST 同步**：
1. `contracts/` 中使用该 enum 的 schema
2. `gate_definitions/` 中使用该 enum 值的 gate JSON
3. `rb_templates/rb_status.json` — status 模板的初始值

### contracts/ — Zod Schema Contracts

每个 contract 对应 bundle 中的一个 control file，定义其结构和校验规则。Gate CLI 使用 `schema_valid` check type 引用这些 schema。

### gate_definitions/ — Gate Rule Definitions

每个 `gate-<key>.definition.json` 定义一个 gate 的 deterministic rule set。格式：
```json
{
  "gate": "<gate-key>",
  "description": "<what this gate verifies>",
  "rules": [
    {
      "id": "<unique-rule-id>",
      "check": "<check-type>",
      "target": "<file-or-path>",
      "failure_message": "<actionable repair direction>"
    }
  ]
}
```

**Supported check types**（由各 gate CLI 实现，非统一 evaluator）：
`file_exists`, `dir_exists`, `dir_non_empty`, `field_non_empty`, `field_value`, `schema_valid`, `yaml_parse`, `jsonl_parse`, `trace_event_present`, `trace_has_all_gates`, `trace_has_events`, `status_value`, `pattern_match`, `cross_field`, `count_floor`, `placeholder`

新增 check type 时先在需要它的 gate CLI 中实现；≥2 个 CLI 共用时再提取到 `gate-helpers.mjs`（YAGNI）。

**新增 gate definition 时 MUST：**
1. 创建 `gate-<key>.definition.json`
2. 创建 `cli/gates/check-gate-<key>.mjs`
3. 在 `enums.mjs` 的 `CurrentGate` 中注册 gate key
4. 在 `workflows/manifest.json` 中注册 phase→gate 绑定
5. 在 `workflows/transitions.chain.json` 中添加入口/出口 routing
