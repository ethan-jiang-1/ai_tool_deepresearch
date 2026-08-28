# Proposal: HITL2 可见化已声明 research focus 的承接情况

## Why

用户跑 harness 后反馈：emphasis（重要 topic 多挖）的机器侧已落地，但「用户在 HITL1 声明了 focus、wave1 却没产出 focus_coverage」时，这个 drop 是**静默的**——gate 干净通过、读者地图显示 not declared、全链路没有信号提示用户。需求来源：`_backlog/plans/rerun-limit-raise-and-scope-pruning.md`（(a)「重要 topic 多挖」落地审计的 silent-focus-drop 裂缝）。

## What Changes

- 让 HITL2（既有的用户判断点）的 research review **显式列出**每个本轮已声明 focus 对应的当前 focus_coverage 结果（covered / partial / blocked / not declared），使「声明了但没承接」的 drop 在审阅点对用户可见，不再静默。
- 不新增 Gate、不新增 profile field / weight / source quota，不改变 focus_coverage 既有的 absence=not declared 语义，不把 controls snapshot / focus 措辞解析为结构化 authority（尊重 user-research-controls 的「focus 不做 Gate input」与 wave1-intake 的「absence = no-focus path」accepted 设计）。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `agent/hitl-ux`: HITL2 research review 新增一个 review 组件——本轮已声明 focus 的当前 focus_coverage 结果（新增 requirement，不重写 HIU-003）。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| agent/hitl-ux | openspec/specs/agent/hitl-ux/spec.md（HIU-003 HITL2 research review） | Modify | research review 的组成是 spec-level behavior，新增 focus 可见性组件 |
| research/content-delivery-phase-content | openspec/specs/research/content-delivery-phase-content/spec.md（CDP-001 phase-hitl2 结构） | Verify-only | phase-hitl2.md 结构 owner；本 change 只改指引，不改 9-section 结构 |
| research/user-research-controls | openspec/specs/research/user-research-controls/spec.md（URC-001） | Verify-only | 确认「focus 不做 Gate input」边界，本 change 尊重它 |
| research/wave1-intake | openspec/specs/research/wave1-intake/spec.md | Verify-only | 确认 focus_coverage absence=not declared 语义，本 change 不改变它 |

## Impact

- Markdown：`DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-hitl2.md`、`DEEP_RESEARCH_HARNESS/workflows/nodes/brief/hitl2.md`
- 测试：`tests/integration/md/` 契约测试（扩展/新增断言 brief 与 phase 呈现 focus-coverage 映射）
- 无 Engine / CLI / schema 变化。

## Semantic-Precision Reflection

- 读者 / 有界问题：HITL2 review 的读者是用户；有界问题是「我 HITL1 声明的每个 focus，现在到底做没做、做到什么程度」。必须保留的区别：covered / partial / blocked / not declared 四种结果的差异，且「声明了但 not declared（drop）」必须可见。
- 正常推理停止点：用户看到 drop 后决定 rerun / repair / proceed，仍是 HITL2 现有 enum（HIU-003），不新增决策点。

## Authority Boundary

- user decision：看到 drop 后是否 rerun / repair / 接受，由用户在 HITL2 决定。
- Agent execution：从 controls baseline + Decisions revision 识别已声明 focus，从 depth-review / reference evidence map 读 focus_coverage 结果，呈现进 review。
- Engine verdict：不新增任何 Gate / check；focus_coverage 的既有校验与 absence 语义不变。
