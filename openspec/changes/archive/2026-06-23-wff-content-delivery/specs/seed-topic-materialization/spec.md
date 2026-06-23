## MODIFIED Requirements

### Requirement: Workflow registration of seed-topics phase

When the seed-topics phase is introduced into the lifecycle, the following registration files SHALL be updated to include it in the correct position (after setup, before wave0):

- `DPT_FRAMEWORK/workflows/manifest.json`：在 `phases` 数组中加入 `phases/phase-seed-topics.md`，顺序在 setup 之后、wave0 之前
- `DPT_FRAMEWORK/workflows/transitions.chain.json`：同步上述 state 转移
- `DPT_FRAMEWORK/schema/enums.mjs`：`CurrentGate` 枚举加入 `seed_topics_ready`
- `DPT_FRAMEWORK/rb_templates/rb_status.json`：`next_gate` 模板更新

#### Scenario: All required registration files synced

- **WHEN** the seed-topics phase is registered in the lifecycle
- **THEN** manifest.json, transitions.chain.json, enums.mjs, and rb_status.json templates SHALL all be updated
