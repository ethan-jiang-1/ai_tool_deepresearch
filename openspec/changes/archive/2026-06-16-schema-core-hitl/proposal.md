## Why

schema-core 归档后发现遗漏了 HITL 相关的 4 个枚举——HumanCheckpointStatus、AnswerabilityClass、HITL2UserDecision、FinalReportView。ProfileSchema 中 hardcoded `z.literal('recorded')` 和 `z.literal('not_started')` 无法表达 HITL1/HITL2 的完整状态机。必须补齐。

## What Changes

- **新建** `DPT_FRAMEWORK/schema/enums.mjs` 增加 4 个 HITL enum
- **MODIFIED** `DPT_FRAMEWORK/schema/contracts/profile.mjs`：hitl1/hitl2 用 HumanCheckpointStatus 替代 literal，增加 hitl2_decision、final_report_view 字段
- **MODIFIED** `DPT_FRAMEWORK/schema/index.mjs` barrel 导出新增项
- **新建** `DPT_FRAMEWORK/req-registry.yaml` 注册 SCO-005~008

## Capabilities

### Modified Capabilities

- `schema-core`: 新增 4 个 HITL enum + ProfileSchema 字段扩展 + SCO-005~008

## Impact

- prototype-start-from-here 的 rb_profile.yaml.tmpl 可直接使用新 enum
- 后续 HITL 相关 capability 不再需要补 enum
