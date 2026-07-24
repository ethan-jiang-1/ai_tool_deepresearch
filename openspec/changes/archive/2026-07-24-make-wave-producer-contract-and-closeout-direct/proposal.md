## Why

`BUG-105`、`BUG-111`、`BUG-112` 是 producer guidance 没有在实际 authoring/returned-work 边界交付既有 contract 的问题；`BUG-107`、`BUG-108` 则是 Wave1 已有的 Phase closeout 被长文分散后不够可见的问题。它们不是同一种缺失，更不是缺少新的 Engine evaluator：Wave0 shared reference 本来就是合法的 Sub-agent output，Wave1 的 backing、depth review 与 seed backfill 也已有 accepted owner。当前缺口是把这些既有事实放回 Agent 作出下一步行动的位置。

本 change 只让现有的一条合法路径在最早可行动的位置闭合，不放宽 provenance、receipt、cache、queue 或 Gate 的既有权威。

## What Changes

- 让 Wave0 source-intake actor 和它的 Phase 都通过真实 `requires` 链加载既有 shared-reference template。模板继续定义 canonical `00-shared-<slug>.md`、parser-aligned rich Markdown 和 `reference` output declaration；Sub-agent 仍直接写该 output，formal submit 仍建立唯一 delegated backing。不会把 Wave0 reference creation 移给 Phase Agent。
- 在 Wave1 returned-work 的既有 formal submit 前直接加入 `dry-submit`。Phase 只消费既有 Engine disposition：同一 candidate 的 authorized mechanical repair 才可回到同一 dry-submit；其余结果回到 actor、既有 fail-and-replace 或 Engine owner/no-path 边界。
- 在 Wave1 的成功 submit 决策点加入一条短的 Phase closeout checklist，指向既有的 reference/index materialization、depth review、seed return-map backfill 和 full-drain inspect 顺序。它不重定义这些 artifact 的 authority，也不把它们交给 Sub-agent。
- 增加一项 static integration proof 和一项独立 real Phase-Agent evidence case。后者只在真实 disposable bundle、真实 Phase Agent 及其 native child evidence 下证明行为；无法运行时结果是 `NOT_RUN`。
- `DPT_FRAMEWORK/` 的 Agent-facing Wave behavior 会变化，目标 framework version 为 `v0.46`；apply 时更新 `CHANGELOG.md` 与 `DPT_FRAMEWORK/RUN.md` 的 release projection。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `reference-flat-format`: 修改 `REF-007`，规定 source-intake 的实际 guidance delivery 必须加载既有 rich-reference template，而不是仅在 Phase prose 中提及它。
- `research-wave-phase-content`: 修改 `RWP-001`、`RWP-002`，分别交付 Wave0 source-intake template 和 Wave1 returned-work/closeout 的最短直接行动路径。

## Impact

- 预计修改 source-intake 与 Wave0/Wave1 phase guidance、一个 root `tests/integration/` static contract、一个 new disposable playbook/subject adapter，以及 v0.46 release projection。不会改 reference parser/evaluator、work-unit command、ledger、cache validator、Gate 或 accepted closeout capability；不增加 dependency、lifecycle state、generic Markdown linter、disk scan、manual authority route、retry tree 或 Agent controller。
- Direct Source of Record 保持不变：既有 reference parser 解释 rich bytes；formal submitted ledger row 决定 delegated provenance；Phase Agent 仅在 submitted backing 后执行既有 consumer projection、depth judgment 和 return-map writing；Wave inspect/Gate 仍决定 phase verdict。
- 两条最短路径分别为：Wave0 `template-delivered actor authoring -> formal submit -> existing inspect`，Wave1 `returned candidate -> dry-submit -> existing disposition | formal submit -> existing Phase closeout checklist -> inspect`。这消除了隐式发现和错误所有权，不增加第二 validator 或 recovery tree。
- 用户只决定新的语义、风险、permission 或不可代理外部动作；当前 Agent 在既有 legal operation 和 direct facts 充分时执行 Wave1 dry-submit、合法机械修复、formal submit、Phase closeout 与 same-check rerun。Engine 裁决 schema、receipt、binding、submit、ledger 和 inspect；没有 legal path 的结果必须诚实返回 owner、terminal 或 `missing_contract`，不能提示手改 authority。
- Proof boundary：本 change 的 static integration 只证明实际 guidance delivery 和文字顺序；只有 `agent_flow_e2e` 才能证明真实 Phase Agent 在 disposable bundle 中执行该 loop；外部 search/fetch 仍需要真实调用。fixture、聊天记录、console output 或手写 bundle state 不能替代后者。

## Constitutional Admission

- **Authority and owner:** existing reference parser owns rich-content interpretation; Wave0 Sub-agent owns its declared reference output; submit owns delegated completion and ledger; Wave1 Phase Agent owns only its existing consumer presentation and semantic depth/backfill after a submitted row; inspect/Gate owns phase verdict.
- **Declared entry/recovery boundary:** returned work enters through its existing candidate/result/receipt surfaces and returns exactly one Engine-derived action: same-candidate mechanical repair and dry-submit, actor return, fail-and-replace, or owner/no-path. This does not schedule actors, infer liveness, or create a recovery controller.
- **Net simplification:** actual template delivery, one existing dry-submit checkpoint, and one visible Wave1 checklist replace indirect template discovery, formal-submit guessing, and implicit post-submit work. No durable state is added.
- **Human boundary:** none for the normal loop. Only a new semantic/risk/permission decision or an explicitly non-delegable action may leave the Agent loop.
- **Version decision:** the framework's active producer and closeout guidance/behavior changes, so this is a minor framework release projection from `v0.45` to `v0.46`, with compatibility decided per affected existing bundle contract during apply.
