## Why

当前 HITL1 把初始 Topic preview 锚定为 `3-5` 个子话题，容易让 Agent
把数量当成默认目标；同时，用户想让某个 Topic 多做研究时，只能在一般性
研究控制或后续 rerun rationale 中隐含表达，无法在既有交互中看见并修正
Agent 的理解。这会让新手面对不必要的数量/方法选择，也让 rerun 的增量
方向难以从历史证据中辨认。

已确认的产品策略是：所有 Topic 先满足共同基线；用户只用自然语言表达
额外的 `research focus brief`；HITL1/HITL2 和现有 rerun direction 是首批
复用载体。本 change 是该策略的最小第一步，先让输入、解释和 rerun
guidance 对齐，后续的可追溯 coverage Gate 与读者证据投影仍分别留给 P2/P3。
原始需求与已确认决定位于
`_backlog/plans/topic-research-emphasis/README.md` 和
`_backlog/plans/topic-research-emphasis/progressive/`。

## What Changes

- 把 HITL1 的初始 Topic preview 从隐含 `3-5` 目标改为「最小独立 Topic
  map」：preview 至少有一个 proposed Topic、没有预设上限；用户接受后，
  既有至少一个 approved Topic 的下界仍适用。当 map 较大时，Agent 以
  可审阅的研究线程解释拆分，而不是让用户管理数字预算。
- 在既有 HITL1 recommendation-first 对话中增加可选自然语言
  `research focus brief`：用户原话与 Agent 的简短、可修正解释在同一
  User Research Controls literal snapshot 中可见且分层保存；未提供 focus
  时保留当前平衡共同基线路径。
- 使 HITL2 的 `rerun` 对话、既有 rationale 与 phase-rerun guidance 能
  保留新的或修订后的 focus 原话，并把 Agent 的当前轮研究方向映射到既有
  per-Topic rerun-direction 字段。历史证据保持历史，不得被描述为新的
  focus increment。
- 为上述 Agent/Markdown 流转添加最小路由验证：一个 Topic、超过五个
  但语义上必要的 Topic map、无 focus 的兼容路径、HITL1 focus 修正、以及
  合法 HITL2 rerun 的原话/解释/历史边界。

不新增 canonical Topic field、profile enum、数值权重、source-count 配额、
独立 focus Gate、第三个 HITL、自动 rerun、或 reader-facing reference
projection；P2 才定义 deterministic focus coverage，P3 才实现 evidence map。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `agent/hitl-ux`: HITL1/HITL2 的 recommendation-first prompt 增加可选
  natural-language focus 及可修正解释，同时维持两个既有决策点。
- `research/user-research-controls`: 既有单一 literal controls snapshot
  明确承载用户原话与 Agent interpretation，不成为 Engine authority。
- `research/pre-research-phase-content`: HITL1 payload、capture 顺序和
  Topic preview guidance 采用最小独立 map 且保持现有 snapshot/apply 边界。
- `research/content-delivery-phase-content`: HITL2 rerun rationale 明确
  保留 focus 原话/解释的语义，而不新增 HITL2 schema 或路由。
- `workflow/rerun-incremental-node`: phase-rerun 从既有 rationale 形成
  当前轮 direction，避免把历史证据当作新的 focus work。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `agent/hitl-ux` | `openspec/specs/agent/hitl-ux/spec.md`，尤其 HITL1/HITL2 recommendation-first requirements | Modify | 它拥有用户可见的自然语言入口、明确推荐和最小确认边界。 |
| `research/user-research-controls` | `openspec/specs/research/user-research-controls/spec.md` | Modify | 它拥有 one durable literal controls snapshot 及其非 Engine-authority 边界。 |
| `research/pre-research-phase-content` | `openspec/specs/research/pre-research-phase-content/spec.md`，尤其 PRP-012/014 | Modify | 它拥有 HITL1 controls capture 前后顺序和 canonical topic-state apply 前的 host-file 写入。 |
| `research/content-delivery-phase-content` | `openspec/specs/research/content-delivery-phase-content/spec.md`，尤其 CDP-001 | Modify | 它拥有 HITL2 rationale、rerun decision 的 phase body，以及不创建新 route 的界限。 |
| `workflow/rerun-incremental-node` | `openspec/specs/workflow/rerun-incremental-node/spec.md`，尤其 REI-006 | Modify | 它拥有 phase-rerun 从当前 recorded rationale 形成 sanctioned topic-state input 的 Agent guidance。 |
| `workflow/rerun-topic-integration` | `openspec/specs/workflow/rerun-topic-integration/spec.md`，尤其 RTI-007 | Verify-only | 已有 direction fields、target count 和 crash recovery 足以承载当前轮 guidance；本 change 不新增字段或解析规则。 |
| `research/canonical-topic-state` | `openspec/specs/research/canonical-topic-state/spec.md` | Verify-only | UID-bound canonical identity 和合法 apply/recover 不得因 focus 增加第二套 Topic 身份。 |
| `research/research-styles` | `openspec/specs/research/research-styles/spec.md` | Verify-only | 共同基线的 style 参数不变，focus 不得变成 per-Topic 数值配额。 |
| `research/plan-hostfile-sections` | `openspec/specs/research/plan-hostfile-sections/spec.md` | Verify-only | 既有纯 renderer 继续生成 literal snapshot；本 change 不建立新 writer 或 parser。 |
| `research/seed-topic-materialization` | `openspec/specs/research/seed-topic-materialization/spec.md` | Excluded | 只改变 HITL1 preview 的语义建议，不改变已批准 Topic 的 materialization contract。 |
| `governance/version-management` | `openspec/specs/governance/version-management/spec.md` | Verify-only | P1 按既有版本契约发布 `v0.79`，不改变 version-management 行为。 |

## Source Of Record And Control Shape

HITL1 的用户 focus 原话和 Agent interpretation 的 durable narrative
coordinate 是既有 `rb_plan.md## Constraints > ### User Research Controls`
literal snapshot；HITL2 的用户 rerun 原话继续属于既有
`rb_profile.yaml#/human_decision_checkpoints/hitl2/rationale`；当前轮 per-Topic
执行 guidance 继续属于 sanctioned `## 本轮重跑方向`。canonical Topic identity、
profile style 参数、Gate/trace/receipt 各自保留现有 Sources of Record。

最短合法闭环是：用户自然语言 -> Agent 提出可读 interpretation -> 用户在
既有 HITL 边界接受或修正 -> 既有 snapshot/rationale/direction carrier ->
Agent 通过现有 topic-state/rerun path 执行。没有新的 parser、controller、
retry tree 或 Machine semantic verdict；这避免了单独的 focus settings object、
第三个 HITL 和平行 rerun authority。

## Semantic Precision And Responsibilities

`minimal independent Topic map` 让用户能回答“这些 Topic 是否分别代表我需要
独立回答的问题？”而不是错误地把 Topic count 当作投入指标；`research focus
brief` 让用户能回答“我希望在哪个 Topic 多理解什么？”而不必学习 weights、
Wave 或 source floors。两个概念都允许明确的 absent/no-focus 结果，不能从
数字、文件数量或历史 evidence 推导。

用户决定研究语义并可修正 Agent interpretation；Agent 负责推荐、解释、
现有 carrier 写入和已授权的机械 rerun 操作；Engine 继续只裁决当前 schema、
canonical mutation、Gate、receipt 和 route。这个 change 不赋予 user text
Gate override，也不让 Engine 解释自然语言。

## Impact

- 预计修改 HITL1/HITL2/phase-rerun 的 Agent-facing Markdown 与其对应的
  focused verification；可能修改既有 snapshot rendering guidance，但不改
  Topic/profile/Gate schema。
- 需要更新 `CHANGELOG.md` 和 `DEEP_RESEARCH_HARNESS/RUN.md`，目标版本为
  `v0.79`。
- 不增加依赖，不改变外部 API，不迁移历史 bundle，也不改动 P2/P3 scope。
