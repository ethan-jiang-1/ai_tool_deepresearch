## Why

当前 HITL1 已能给出推荐、接受自然语言修正和在用户表达不清时做最小确认，但它不要求
Agent 在一个看似明确、却会导向不同研究路线的 intake 前主动暴露 material ambiguity。
结果是后续 bundle 虽保留了 profile、must-answer 和 Topic identity，却不一定让重新加载的
Agent 或人理解用户最终要拿研究做什么。

本 change 将该缺口收敛在现有 HITL1，而不是新增 lifecycle checkpoint。原始规划输入为
`_backlog/plans/hitl1-bounded-clarification-alignment.md`。

## What Changes

- 在 recommendation-first HITL1 中加入可审阅的研究对齐草案：先陈述 Agent 对目标、
  对象、决策/交付用途和范围的理解，再给出现有 must-answer、Topic map 与 profile 建议。
- 当 Agent 判断存在 material 且彼此独立的研究路线分叉时，允许在首轮最多提出三个当前
  可回答的 frontier 问题。每题必须说明推荐/default 及其改变的既有结构化决定；依赖题
  留到后续轮次。用户始终可直接接受、自然语言修正或委托 Agent 按推荐继续。
- 在用户接受、修正或明确委托后，于既有 profile/status/topic-state 写入顺序之前，将
  `### HITL1 Alignment Snapshot` 写入 `rb_plan.md## Goal`。快照保存已确认或被委托的
  研究理解、material fork、透明默认值及其与既有结构化 owner 的简短对应关系。
- 为新 bundle template 增加该 snapshot 的 required-fill marker，并继续复用现有
  `setup-ready` marker scan。此 scan 只发现未替换的 template marker，不验证 heading
  存在性或 prose 的语义质量。
- 更新 HITL1 Markdown、template 和验证资产；不新增 `clarification_mode`、问答队列、
  round counter、schema field、Gate rule、lifecycle transition 或第三个 HITL。
- **BREAKING**：无。已有用户的直接接受、自然语言修正和委托出口保持可用；新行为只在
  Agent 判断 material ambiguity 时提供有界澄清机会。

## Capabilities

### New Capabilities

无。该 change 扩展既有 HITL1 interaction、pre-research phase 和 host-file template
contract；不建立新的 lifecycle、state 或 Engine capability。

### Modified Capabilities

- `agent/hitl-ux`: HITL1 recommendation-first prompt 允许受限的主动 clarification，
  并保留直接接受/委托出口与无固定轮次边界。
- `research/pre-research-phase-content`: HITL1 Phase 在既有 canonical writes 前生成、
  解决并持久化 alignment snapshot，随后继续同一条 status/topic-state/style/probe/Gate 链。
- `research/plan-hostfile-sections`: `## Goal` 获得 template-owned alignment snapshot，
  并将其 required-fill marker 纳入既有、非语义的 setup-ready marker contract。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `agent/hitl-ux` | `openspec/specs/agent/hitl-ux/spec.md` (HIU-001, HIU-002, HIU-004) | Modify | 已拥有 HITL1 loop、recommendation-first brief、最小确认和无 round counter 的用户可见行为；本 change 只为 HITL1 加入受限 proactive frontier shape。 |
| `research/pre-research-phase-content` | `openspec/specs/research/pre-research-phase-content/spec.md` (PRP-002, PRP-009, PRP-012) | Modify | 已拥有 HITL1 profile/topic-state/status/probe 顺序和 host-file capture-before-apply 边界；snapshot 的 writer/order 属于同一 phase contract。 |
| `research/plan-hostfile-sections` | `openspec/specs/research/plan-hostfile-sections/spec.md` (PHS-001, PHS-002, PHS-005) | Modify | 已拥有 Goal template、required-fill marker 和 setup-ready scan 的语义；snapshot 是同一 host-file narrative surface 的新 template-owned subsection。 |
| `research/user-research-controls` | `openspec/specs/research/user-research-controls/spec.md` (URC-001) | Excluded | controls snapshot 继续只承载 optional controls/focus；alignment snapshot 不能复用或改变其 exact compatibility form。 |
| `research/canonical-topic-state` | `openspec/specs/research/canonical-topic-state/spec.md`; `DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs` | Verify-only | 既有 transaction 应保留 Goal body；不改变 canonical Topic identity、mutation packet 或 helper contract。 |
| `research/pre-research-gate-implementation` | `openspec/specs/research/pre-research-gate-implementation/spec.md`; `DEEP_RESEARCH_HARNESS/cli/gates/check-gate-setup-ready.mjs` | Verify-only | 复用既有 marker scan；Gate 不读取、解析或评分 alignment prose，且不新增 rule。 |
| `engine/schema-core` | `openspec/specs/engine/schema-core/spec.md`; `DEEP_RESEARCH_HARNESS/schema/contracts/plan.mjs` | Excluded | PlanSchema 仍只校验 frontmatter；snapshot 不成为结构化 runtime field。 |
| `engine/transition-table` | `openspec/specs/engine/transition-table/spec.md`; `DEEP_RESEARCH_HARNESS/workflows/transitions.chain.json` | Excluded | HITL1 的 `passed -> setup` transition 保持不变；澄清在同一 existing conversation 内完成。 |

## Impact

- 目标行为/Markdown：`brief/hitl1.md`、`phase-hitl1.md`、
  `shared-agent-ux-guidance.md` 和 `rb_plan.md.tmpl`。
- 受影响的 accepted specs：三个 Modified Capabilities 的 delta specs；无新 capability、
  requirement reservation 或 dependency。
- 验证：HITL1 Markdown contract、new-bundle template/marker regression、Goal-body
  preservation和 setup-ready handoff regression；真实 Agent judgment 只有在合法的
  `agent_flow_e2e` 中才可声明为行为证据。
- 发布：这是 Harness Agent-facing behavior change，需要版本 bump 至 `v0.87`，并在
  apply 时同步 repo-root `CHANGELOG.md` 与 `DEEP_RESEARCH_HARNESS/RUN.md` banner。
- 不修改已完成 bundle、网络/宿主权限、真实研究证据、ProfileSchema、Gate definition、
  status enum、transition chain 或 npm dependencies。

## Design Boundary

**Semantic precision**：alignment snapshot 回答的是重新加载的 Agent/human 的一个有界
问题："当前已选 profile、must-answer 和 Topic map 是基于哪一个用户确认或明确委托的
研究理解？" 它保留会改变该问题答案的用户目标、用途、material fork 和透明默认值，
但不取代 `rb_profile.yaml` 的可验证字段、`User Research Controls` 的额外控制，或
Engine 的 Gate verdict。读者看到 snapshot 和既有 structured owner 后可以停止；缺失的
新语义仍须回到用户，而不能由 prose 推断。

**最小控制形状**：复用同一 HITL1 loop、同一 `stop: yes` 边界、现有 profile/status/
topic-state/probe/Gate 链和 setup-ready marker scan。避免的新复杂度包括新的 checkpoint、
mode、queue、counter、parser、schema、Gate rule 和 retry path。marker 只保留正常模板路径
的漏填信号，不升级成 semantic validator。

**责任边界**：用户决定 material research semantics 或委托 Agent 采用 recommendation；
Agent 形成/更新草案、写入叙事快照，并执行既有的合法机械步骤；Engine 继续只裁决已有
结构、marker scan、Gate、status、trace 和 handoff，而不判断用户意图或 snapshot prose。
