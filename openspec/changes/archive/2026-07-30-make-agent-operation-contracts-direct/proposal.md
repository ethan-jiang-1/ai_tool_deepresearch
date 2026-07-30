## Why

`BUG-150`、`BUG-153`、`BUG-155`、`BUG-156`、`BUG-158`、`BUG-160`、`BUG-171`、`BUG-177`
和 `BUG-184` 表明：已有 Engine 的确定性事实常常是正确的，但它们没有在 Agent 的决策点以可直接
调用、可理解、可重跑的形式交付。结果是 Agent 把 `--help` 当 bundle、为了发现 topic-state input
而读取实现、在超大 phase closure 中寻找 cue，或面对一串 candidate omission / timeout action 却无法
看出最早决定它的事实。

本 change 的 reader 是**正在执行一个既有 framework command 的 Agent**。它要回答的有界问题是：
“这个操作现在怎样合法调用；若本次调用或 checkpoint 不通过，哪一个直接事实决定结果，已有哪个
writer 可处理，以及应重跑哪一个 checkpoint？”答案不能要求它重建 CLI parser、Zod union、phase
dependency closure、timeout 内部判断或 per-candidate scan。

### Semantic Precision And Control Shape

本 change 只收敛一个非权威的 reader-facing semantic level：**direct operation contract**。它区分
静态帮助、context-specific input shape、invocation/configuration failure、已解析 bundle 的领域 verdict、
可修复 direct root、以及没有 legal path 的 owner/missing-contract boundary。这些区别会改变 Agent 的
下一动作，不能压成一条泛化的 “failed” 消息；但它不复制 bundle truth、Gate routing、schema authority
或 Agent 的研究判断。Agent 可在该层决定调用或同一 checkpoint 的修复；需要审计时仍可下钻到已有
schema、runtime bundle 和 check output。

最短 control loop 保持为：已有 direct authority -> 现有 checker/writer -> 一个 root-first
operation projection -> 同一 checkpoint。该 change 不新增 controller、watcher、retry tree、status、
ledger、host capability registry 或自动 repair。Agent 执行已有的合法命令和可逆机械修复；Engine 只
投影 invocation/schema/verdict fact 并裁决确定性边界；用户仍只决定新的研究语义、风险或无法代理的
host permission。

来源：
`_backlog/bugs/BUG-150-wave0-inspect-help-treated-as-bundle.md`、
`BUG-153-operate-topic-state-opaque-validation.md`、
`BUG-155-plan-hostfile-sections-missing.md`、
`BUG-156-enter-phase-output-overload.md`、
`BUG-158-operate-topic-state-context-dependent-schema.md`、
`BUG-160-no-help-output-for-engine-clis.md`、
`BUG-171-claim-actor-reason-code-opaque.md`、
`BUG-177-timeout-preflight-ambiguous-recommendations.md`、
`BUG-184-return-map-requires-all-source-entries.md`；以及
`_backlog/plans/framework-contract-remediation-openspec-sequence.md` 第 7 节。

## What Changes

- 为选定 public operation surfaces 建立可发现的 invocation contract：
  `inspect-wave{0,1,2}-output`、`operate-topic-state`、`enter-phase`、`advance-status`，以及
  新的只读 plan-controls renderer，均须把 `--help`/`-h` 作为无副作用的成功帮助。未知选项、缺值、
  suspicious/不存在的 bundle 或 route/configuration input 必须在领域 evaluator 前返回所属 command 的
  structured invocation root 与 code `2`。Wave inspect 的非-help grammar 只接受一个
  `--bundle <bundle-path>` pair，裸 positional bundle、重复 flag 和混合 shape 都是 invocation
  rejection；其 hint 不得把未经验证的 token 反射进 `write_to` 或 `rerun`。
- 将 `operate-topic-state schema --context <...>` 定义为从既有 Zod contract 派生的、只读的
  authoring projection：它列出允许的 context/action form、必填/可选字段、枚举和值形状以及可解析的
  template/example，并且每个 emitted template 都必须通过真正的 `TopicApplyPlanSchema`；visitor 只可
  为结构发现 unwrap effect，绝不可复现 cross-field validation，但不证明当前 bundle 的 lifecycle authorization。`apply` 的 Zod rejection 将返回
  bounded、safe field-level `validation_errors[]`、primary coordinate 和同一 apply rerun，而不是只有
  “Invalid input”。Zod 仍是唯一 validator。
- 修正 HITL1 所引用的缺失 `plan-hostfile-sections` command surface。该 thin renderer 只从现有
  `renderSuppliedControls` / `renderNoControls` helper 输出确定的 controls section，供 Agent 写入其
  已有的 Agent-owned host-file coordinate；它不读取 bundle、不写 `rb_plan.md`、不创建新 authority。
- 将 phase entry 的**默认 presentation**收敛为一个 bounded action core：在 `assessNode()` 可写
  `load_complete` 前先预检 target action-core configuration；continuation cue 和必须的 source-gate
  status synchronization 必须最先可见，随后是 target phase 的 action-core Markdown 和按 loaded
  dependency order 排列、排除 target node 的 shared-file manifest。完整 dependency closure 通过显式
  `--full` 仍可读取。`enter-phase` 继续完成既有 load witness，`advance-status` 继续独占 status
  mutation；两者不合并成自动 transition。
- 让 work-unit claim 与 timeout-preflight 把已有 direct fact 投影到最靠近调用者的地方：claim 的
  actor-observation input rejection 公开 field conflict 和完整 legal tuple vocabulary；timeout output
  公开一个由现有 candidate/progress/lease/integrity branch 派生的 recommendation basis。它不改变
  claim proof、dry-submit、lease、timeout eligibility 或 terminalization semantics。
- 将同一可写 Seed Topic family 中多个 current candidate omissions 合并成一个有序、identity-complete
  batch repair root。每个 `<work_id>/<ordinal>` 仍是 mandatory coverage 的独立事实；batch 只减少
  重复 feedback，并继续指向现有 Projection Packet -> topic-state apply -> same Wave inspect loop。
- 同步 `COMMANDS.md`、CLI implementation guidance、phase/action-core guidance 和 release metadata 到
  target version `v0.63`。`BUG-173`/`BUG-183` 的 generated Completion Contract 已由 archived
  `make-delegated-work-contracts-constructible` (`DEW-021`) 覆盖，`BUG-159` 的 handoff ordering 已由
  `WNC-010`/`CPT` 覆盖；本 change 会复核并在这三个 ticket 中记录 dispositions，不建立第二套 cache
  or status path。

**BREAKING**：选定 CLI 的 `--help` 将成为 exit `0` 的 help response，错误 invocation 将使用 code
`2` 而不进入业务 evaluator；`enter-phase` 的默认 stdout 将不再拼接整个 shared dependency closure，
调用方须显式使用 `--full` 获取旧的完整呈现。正常 bundle verdict、Gate authority、topic-state mutation
forms、work-unit lifecycle 和 required per-candidate coverage 不变。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cli-exit-code-conventions`: Define help and selected command invocation/configuration outcomes as explicit
  code `0` / code `2` operation-contract behavior, with structured stdout where the command has a structured
  envelope.
- `cli-inspect-output-conventions`: Make Wave inspect invocation parsing fail before Wave evaluation while
  retaining its `{ check, inspect, advice, hints }` contract.
- `canonical-topic-state`: Expose context-discriminated authoring projection and safe field-level apply
  diagnostics without adding a topic-state writer, input authority, or lifecycle bypass.
- `plan-hostfile-sections`: Make the existing controls renderer reachable as a pure Agent-facing command,
  without promoting narrative controls to Engine authority.
- `pre-research-phase-content`: Align HITL1 controls wording with that reachable renderer and the existing
  Agent-owned host-file write boundary.
- `workflow-node-contract`: Define a bounded phase entry action core distinct from the full loaded Markdown
  closure, without changing phase/routing authority.
- `cli-phase-transition`: Make `enter-phase` and `advance-status` expose the direct handoff order, concise
  default entry presentation, full presentation option, and invocation feedback without merging their writes.
- `delegated-work-units`: Project existing claim-validation and timeout-preflight branch facts at the public
  caller surface without changing actor proof, submit, or timeout semantics.
- `research-return-map`: Preserve mandatory per-candidate coverage while batching homogeneous omission feedback
  at one existing Projection Packet repair coordinate.

## Impact

- Expected implementation surfaces: selected `DPT_FRAMEWORK/cli/*.mjs` command entrypoints, small shared
  invocation/presentation helpers only where exact behavior is reused, canonical topic-state Zod projection,
  work-unit timeout/claim response schemas, return-map finding projection, workflow phase Markdown/action-core
  markers, `COMMANDS.md`, and `DPT_FRAMEWORK/cli/README.md`.
- Expected verification: focused unit tests for schema/error/batch/basis projections; CLI integration tests for
  help, code `2`, no-evaluator/no-side-effect invocation rejection, phase default versus `--full`, direct
  handoff cue/order, and valid tuple/timeout/candidate feedback. A small real/disposable Agent-flow observation
  may assess presentation readability but cannot prove host liveness or Agent behavior.
- No new package, persistent state, runtime bundle format, external provider, queue/ledger mutation path, Gate
  rule, policy floor, or evidence authority. C2 must archive before this change enters `/opsx:apply`.
