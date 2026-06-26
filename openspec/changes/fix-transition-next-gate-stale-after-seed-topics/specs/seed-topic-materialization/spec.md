> req: STM-004

## MODIFIED Requirements

### Requirement: Workflow registration of seed-topics phase

Workflow registration surface SHALL 同步插入 seed-topics 阶段，保持 transition 一致性：
- `DPT_FRAMEWORK/workflows/manifest.json`：phases 数组在 setup 与 wave0 之间插入 `{ "key": "seed-topics", "node": "phases/phase-seed-topics.md", "gate": "seed-topics-ready" }`
- `DPT_FRAMEWORK/workflows/transitions.chain.json`：`phase-setup.md` 的 `passed` 改指向 `phase-seed-topics.md`；新增 `phase-seed-topics.md` → `passed` → `phase-wave0.md`
- `DPT_FRAMEWORK/schema/enums.mjs` 的 `CurrentGate`：新增 `seed_topics_ready`（位于 `setup_ready` 与 `wave0_complete` 之间）

`rb_status.json` 模板（`rb_templates/`）的 `current_gate`/`next_gate` 初始值 SHALL 直接反映新阶段：`current_gate` SHALL 为 `setup_ready`，`next_gate` SHALL 为 `seed_topics_ready`。

#### Scenario: Transition chain routes through seed-topics

- **WHEN** setup gate pass 后查询 next node
- **THEN** routing SHALL 返回 `phases/phase-seed-topics.md`，而非直接 `phases/phase-wave0.md`
- **AND** seed-topics gate pass 后 routing SHALL 返回 `phases/phase-wave0.md`
