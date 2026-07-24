## Why

`BUG-105`、`BUG-107`、`BUG-108`、`BUG-111`、`BUG-112` 指向同一条 Wave producer 链的交付断裂：canonical rich reference 的路径、可解析内容和 submitted backing 被混为一个问题；returned work 没有先走既有 `dry-submit`；而成功 submit 后本应由 Phase Agent 完成的 reference、depth review 与 seed return-map closeout 没有成为明确的下一步。因此 Agent 容易把未提交的文件、裸 YAML 或 filesystem presence 误当作可消费 evidence，直到 Wave inspect/Gate 才发现一整串下游症状。

本 change 只让现有的一条合法路径在最早可行动的位置闭合，不放宽 provenance、receipt、cache、queue 或 Gate 的既有权威。

## What Changes

- 在 Wave0/Wave1 的 producer guidance 中交付 canonical 路径、现有 `parseReferenceMetadata()` 可解析的 rich Markdown 模板，以及 submitted backing 的分离诊断。rich reference 仍不是 YAML frontmatter、fenced YAML 或 bare YAML；`source.yaml` 的原始 YAML contract 也保持独立。
- 将 returned-work 的既有 `dry-submit` 放到 formal submit 前：仅 `mechanical` candidate/declaration root 可以修复同一 `work_id` 后重跑 dry-submit；`work_done` 后的 `semantic_content` root 走既有 fail-and-replace 并分配新的同义务 work unit；`contract_integrity` 或无合法 repair path 返回 Engine owner、terminal 或 `missing_contract` 边界。只有 PASS 能进入 formal submit 并产生 submitted ledger row。
- 将成功 submit 后的 Phase-owned closeout 变成 Wave0/Wave1 的明确 drain/post-submit loop：从 submitted backing 物化 consumer references/index，Wave1 产出绑定 submitted rows 的 `depth-review.yaml`，并在 Phase Agent 处将真实 evidence meaning 回填 seed return map；随后才运行同一 Wave inspect。Sub-agent 不获得 reference presentation、depth judgment、seed backfill、ledger 或 cache declaration authority。
- 为上述 local loop 增加 parser/path/backing、dry-submit disposition、submit-before-closeout 与 Phase closeout 的分层验证；真实 Subject Agent/Sub-agent/external execution 只由 `agent_flow_e2e` disposable bundle evidence 证明，无法运行时明确记录 `NOT_RUN`。
- `DPT_FRAMEWORK/` 的 Agent-facing Wave behavior 会变化，目标 framework version 为 `v0.46`；apply 时更新 `CHANGELOG.md` 与 `DPT_FRAMEWORK/RUN.md` 的 release projection。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `reference-flat-format`: 修改 `REF-007`、`REF-008`，使 canonical naming、parser-aligned rich content 与 submitted backing 成为三个明确、可分别诊断的 producer facts，并在当前 authoring/materialization surface 暴露它们；不增加第二 metadata parser 或 metadata authority。
- `wave1-intake`: 修改 `WAI-004`，使 submitted row 成为 inline backfill、depth-review 和 topic-reference materialization 的唯一前置条件，并将这些动作保留给 Phase Agent。
- `research-return-map`: 修改 `RRM-002`，使 Wave1 seed backfill 在 submitted-backed Phase closeout 中由 Phase Agent 以 meaning-plus-concrete-reference 方式完成；不把 token replacement 交给 Sub-agent 或把 return map 变成 delegated coverage authority。
- `research-wave-phase-content`: 修改 `RWP-001`、`RWP-002`，让 active Wave phase Markdown 在 canonical authoring、returned-work dry-submit、submitted-row closeout 和 same inspect 间给出一条直接、有限的 Agent flow。

## Impact

- 预计修改 Wave0/Wave1 phase/shared authoring guidance、reference parser/evaluator diagnostics 或其 CLI adapter、既有 work-unit dry-submit/formal-submit guidance的消费位置、对应 root `tests/`、已有 disposable playbooks，以及 v0.46 release projection；不增加 dependency，不创建新 lifecycle state、user checkpoint、generic Markdown linter、disk scan auto-amend、manual authority route、retry tree 或 Agent controller。`delegated-work-units` 的 `DEW-013` 已完整拥有 dry-submit 的 deterministic disposition，本 change 复用它而不修改该 capability。
- Direct Source of Record 保持不变：canonical bundle-relative reference path 与 current rich bytes 由既有 reference parser/evaluator 解读；work-unit index/result/receipt/cache 与 formal submitted ledger row 决定 delegated provenance；Phase Agent 只在 submitted backing 后拥有 consumer projection、depth judgment 与 return-map writing；Wave inspect/Gate 仍决定 phase verdict。
- 最短合法闭环为：`canonical authoring -> dry-submit -> same-work mechanical repair | fail-and-replace | owner/no-path -> formal submit -> submitted ledger -> Phase-owned closeout -> same inspect`。它复用已有 parser/evaluator 和 dry-submit，删除晚期才发现 producer mismatch 的路径，避免另一套 validation、scanner、state、controller 或 recovery tree。
- 用户只决定新的语义、风险、permission 或不可代理外部动作；当前 Agent 在既有 legal operation 和 direct facts 充分时执行 dry-submit、合法机械修复、formal submit、Phase closeout 与 same-check rerun。Engine 裁决 schema、receipt、binding、submit、ledger 和 inspect；没有 legal path 的结果必须诚实返回 owner、terminal 或 `missing_contract`，不能提示手改 authority。
- Proof boundary：unit/integration/deterministic E2E 仅证明 deterministic parser/CLI/bundle contracts；`agent_flow_e2e` 才能证明 Phase Agent 或 Sub-agent 在真实 disposable bundle 中执行本 loop；外部 search/fetch 仍需要真实调用。fixture、聊天记录、console output 或手写 bundle state 不能替代后两类 evidence。

## Constitutional Admission

- **Authority and owner:** reference parser/evaluator owns path/content interpretation; submit owns delegated completion and ledger; Phase Agent owns only non-delegable consumer presentation and semantic depth/backfill after a submitted row; inspect/Gate owns phase verdict.
- **Declared entry/recovery boundary:** returned work enters through its existing candidate/result/receipt surfaces and returns exactly one Engine-derived action: same-candidate mechanical repair and dry-submit, actor return, fail-and-replace, or owner/no-path. This does not schedule actors, infer liveness, or create a recovery controller.
- **Net simplification:** one existing parser/evaluator and one existing dry-submit checkpoint replace conflated rich-reference advice, formal-submit guessing, and implicit post-submit work. No durable state is added.
- **Human boundary:** none for the normal loop. Only a new semantic/risk/permission decision or an explicitly non-delegable action may leave the Agent loop.
- **Version decision:** the framework's active producer and closeout guidance/behavior changes, so this is a minor framework release projection from `v0.45` to `v0.46`, with compatibility decided per affected existing bundle contract during apply.
