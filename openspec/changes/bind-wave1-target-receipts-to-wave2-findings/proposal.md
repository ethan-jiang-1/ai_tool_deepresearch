## Why

Wave1 可以识别一个需要后续工作的材料性研究目标，但结构上合法的 Wave2 `finding-index.yaml` 目前无法证明该目标被交接或获得可见处置。因此，即使证据、receipt 与 Gate 都仍然结构合法，模型明确提出的问题仍可能在阶段之间悄然丢失。

已归档的 `capture-user-research-controls` 只提供可选用户指导；本 change 在没有额外 controls 时也必须基于既有问题/profile 闭合相同的问题路径。

## What Changes

- 在既有 Wave1 Phase-owned `depth-review.yaml` 增加有界的 carried-target 声明；由 Agent 判断哪些材料性目标在本地解决、需要交给 Wave2、延后或以限制形式记录。
- 从已接受的 topic-layout 事实推导 review 的 canonical Topic UID 与当前 intent binding，只正规化显式选中的目标，并让成功的 Wave1 Gate 将该集合投影为其 routed `gate_attempt` trace 中的窄 receipt。
- 扩展既有 Wave2 finding-index 契约，增加与 artifact `origin_refs[]` 分离、可覆盖一个或多个 receipt target 的 binding。
- 让既有 Wave2 evaluator/Gate 消费精确的 Wave1-to-Wave2 handoff lineage，并要求 receipt 中每个目标都通过既有 finding 的 decision/gap-status 路径获得有效处置。
- 更新 Wave1/Wave2 Agent guidance 与 focused verification，使修复停留在直接 owner：坏声明修 Wave1，缺 binding 修 `finding-index.yaml`，缺 routed receipt 修同一 Gate/handoff 边界。

本 change 不创建 evidence-quality 分数、来源排名、策略 controller、第二 ledger、通用 artifact-version 系统、新 lifecycle/HITL 状态，也不要求枚举所有像问题的句子。它只保护 Agent 显式声明为 carry-forward 的目标。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `canonical-topic-state`: 为既有 Phase-owned Wave1 depth review 推导一个 UID-bound、current-intent-bound selector。
- `research-wave-phase-content`: 指导 Wave1 产出一个 carry-forward projection，Wave2 消费 routed receipt 而非可变 review prose。
- `research-wave-gate-implementation`: 通过既有 gate path 校验有界 Wave1 声明和 receipt-bound Wave2 finding coverage。
- `trace-writer`: 将正规化的 Wave1 carried-target receipt 投影到成功 routed gate-attempt event。
- `wave2-synthesis`: 添加独立的 finding-index target-binding fact，并保持既有 finding disposition route 是唯一 closure outcome。

## Impact

- 影响 Wave1 depth-review evaluator、Wave2 finding-index evaluator、Wave1/Wave2 gate definition 与 trace handoff writer、canonical topic-layout selection，以及两个 phase Markdown control surface。
- 不新增依赖或外部服务。目标 framework release 为 `v0.42`；apply 更新 `CHANGELOG.md` 与 `DPT_FRAMEWORK/RUN.md`。
- Direct Source of Record 是由既有合法 handoff/load lineage 选择的一条 Wave1 Gate trace receipt，加上既有 Wave2 `finding-index.yaml` finding/disposition facts。模型仍是语义判断者；Engine 只验证已声明的 identity、revision、route 与 coverage。
- 最短闭环是：Agent 声明 carried target -> Wave1 Gate 正规化并路由一个 receipt -> Agent 在既有 finding index 中绑定它 -> Wave2 Gate 只报告缺失/坏 binding 并重跑同一 Gate。它不替换 Agent judgment 或既有 finding triage，且避免平行 queue、ledger、version registry 或 retry controller。
