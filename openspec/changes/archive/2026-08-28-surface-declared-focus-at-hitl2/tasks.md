# Tasks: HITL2 可见化已声明 research focus 的承接情况

## 0. Feedback 计划评审

- [x] 0.1 `openspec-feedback:plan-review` 评审 HIU-007 计划（proposal / design / delta spec / tasks / verification-plan）：whole-change coherence + 风险（ADD vs MODIFY、尊重 URC/wave1-intake 边界、新 ID HIU-007 注册）。无未决 actionable finding 后勾选。

## 1. Spec 与 Markdown 实现

- [x] 1.1 实现 HIU-007：改 `DEEP_RESEARCH_HARNESS/workflows/nodes/brief/hitl2.md` 入口 Prompt，在「仍然不足或需要谨慎的地方是」与「当前推荐」之间加一个字段 `**本轮已声明的重点及其承接情况**：{DYNAMIC: declared_focus_and_coverage}`。Done when：brief 含该字段且仍标 `@impl HIU-003` 不变。
- [x] 1.2 实现 HIU-007：改 `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-hitl2.md` §3a 的 research review 提取清单，加一条「本轮已声明 research focus 的当前承接」：从 controls baseline + newest Decisions revision 识别已声明 focus，读对应 Topic 的 depth-review `focus_coverage`（或 reference evidence map current focus increments），列出每个 focus 的 covered/partial/blocked/not declared；已声明但 not declared 的 drop 必须可见、不得静默省略。Done when：§3a 明确含该步骤且不新增 Gate/field 表述。
- [x] 1.3 扩展/新增 `tests/integration/md/` 契约测试：断言 `brief/hitl2.md` 与 `phase-hitl2.md` 呈现 focus-coverage 映射（含 `focus_coverage` 与 `not declared` 可见性语义）。Done when：测试 PASS。

## 2. 收尾验证

- [x] 2.1 在 delta → main spec 同步后，把 HIU-007 注册进 `openspec/governance/req-registry.yaml`（`HIU-007: hitl-ux — HITL2 research review surfaces declared-focus coverage`）。Done when：`check-project-reqs --mode archive` 报 0 unregistered。
- [x] 2.2 运行 `node openspec/governance/check-project-reqs.mjs --mode archive --change surface-declared-focus-at-hitl2`，PASS。
- [x] 2.3 运行 `node openspec/governance/check-project-specs.mjs`，PASS。
- [x] 2.4 运行受影响测试 + 全量 `npm test`，PASS。
- [x] 2.5 `openspec-feedback:closeout-review` 归档前评审实际 diff（brief/phase Markdown + MD 契约测试 + HIU-007 main spec 同步）与验证证据；semantic-closure `not_applicable` 理由对实际 surface 仍成立；无未决 finding。
