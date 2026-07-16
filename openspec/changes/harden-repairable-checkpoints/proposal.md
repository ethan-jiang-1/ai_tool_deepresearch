## Why

`_backlog/plans/repair-friendly-framework.md` 与 `_backlog/plans/subagent-output-contract-enforcement.md` 记录的是旧运行摩擦，不能直接映射成当前机制。当前 v0.30 已经有 Gate-attempt checkpoint、shared inspect/Gate findings、reentry audit、truthful work-unit result schema、dry-submit、structured hints、retry/late-submit lineage 和 Phase-owned projections；再加 completion manifest、第二套 consistency CLI 或 repair controller 会重复 authority。

对当前 executable contract 的复核仍确认了三个局部缺口：Wave2 `action:add` 的 full re-synthesis 只靠 topic slug 出现与非零 pair count 代理，Wave completion Gate 没有从 queue authority 阻止未排空 demand/in-flight work，且 runtime receipt 的非权威诊断 `detail` 会因常见 string/object 表示差异拒绝 submit，角色文档还混淆 receipt 与 log。

深审同时发现，初版 proposal 把 `action:add` 的 full-pair 要求错误泛化到了所有首跑与 `action:supplement`。这会覆盖 `wave2_cross_topic_depth` 的既有 profile 语义，并与 accepted reduced-coverage / delta behavior 冲突。本 change 因而只统一 pair 的事实解析，不统一不同场景的 coverage 政策。

## What Changes

- 在现有 Wave2 finding-index path 中增加一个 normalized pair-fact evaluator：从 canonical topic registry 解析 unordered pair entries，拒绝 malformed/self/unknown/duplicate pair，并使 `scan.topic_count` 与 `pair_count_expected` 对应 canonical universe、`pair_count_checked` 对应 observed unique pairs。多 topic普通首跑与 `action:supplement` 至少保留一个 structured checked pair以证明 scan未被完全跳过，但允许 checked count低于 expected universe，不被强制为 `C(n,2)`；profile quality depth仍按 accepted contract处理。
- `action:add` 复用上述 evaluator，将 observed pairs 与 canonical full pair universe 精确比较，并要求 counts 为 `C(n,2)`；删除 rerun slug/text presence，并用 observed structured non-empty set取代通用手写 `pair_count_checked > 0` 代理。`finding-index.yaml` 成为 Gate-readable pair projection；Gate 不再从 ledger prose猜 pair identity。
- 在 Wave0/Wave1/Wave2 既有 shared inspect/formal-Gate path 中增加一个 pure `phase_queue_drained` rule，直接要求 schema-valid `rb_queue.json#/active_window`、`#/refill_pool` 与 `#/delegated_in_flight` 同时为空。它属于 degradation-ineligible `authority_integrity`，不推断 item phase，不复制 `check-reentry` heuristics，也不新增 completion state。
- 保持 runtime receipt identity、actor binding、JSONL 与 lifecycle event shape 严格，同时把可选诊断 `detail` 定义为 human-readable string 或 keyed JSON object；同步 generated task/spawn prompt/shared protocol/role guidance，明确 assigned `runtime-receipt.jsonl` 是 lifecycle evidence，`log-event.mjs` 只是可选 diagnostic mirror。
- 增加 focused negative/compatibility tests，证明 quick/debug-style reduced coverage 不被误升级、`action:add` full pairs 确实 fail closed、queue rule 无副作用、receipt object/string 等价且真正 binding fault 仍严格。
- 相关 `DPT_FRAMEWORK/` 行为变更在 apply 阶段升级到 **v0.31**，同步 `CHANGELOG.md` 与 `DPT_FRAMEWORK/RUN.md`。
- 不新增 Agent-written manifest、repair journal、generic consistency CLI、trace decision engine、automatic repair/degrade tree、rerun-only success path、legacy compatibility tree、controller、watcher、daemon 或 lifecycle state。

Direct Sources of Record 是 canonical `rb_plan.md#/topic_registry`、Wave2 `finding-index.yaml` structured pair projection、schema-valid `rb_queue.json`、work-unit Engine records与 assigned `runtime-receipt.jsonl`。最短闭环保持为：

```text
direct fact -> existing inspect / dry-submit / formal Gate
  -> smallest root + authorized write/operation + same checkpoint
  -> Agent repairs mechanically
  -> rerun
```

Net simplification 是删除两个 Wave2 弱代理 verdict，用三个直接 queue containers 取代 phase/path 推断，并把 receipt 的非权威表示差异从 blocking contract 降为窄幅宽容。用户只负责新的语义、风险、权限或不可代理外部动作；普通 pair/queue/receipt 修复由 Agent 通过现有合法 path 执行，Engine 继续独占 deterministic verdict。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `wave2-synthesis`: 明确 Gate-readable pair projection 的 accepted container/entry normalization、普通 reduced-coverage 自洽语义与 `action:add` full-pair policy boundary。
- `research-wave-phase-content`: 收紧 RWP-003/RWP-012/RWP-013 的 pair producer guidance 与 `action:add` full re-synthesis，同时保留 ordinary first-run/profile 与 `action:supplement` 语义。
- `gate-skeleton`: Wave0/Wave1/Wave2 completion Gate 在既有 evaluator/preflight 中阻止任何未 drain 的 queue demand 或 delegated in-flight attempt，并输出 root-first same-check repair contract。
- `delegated-work-units`: 保持 receipt authority identity 严格，容忍 diagnostic `detail` 的 string/object 表示，并使 generated task/role guidance清楚区分 receipt 与 log surface。

## Impact

- 预计修改现有 Wave2 finding-index/rerun evaluator、shared Wave Gate dispatcher/definitions、`DPT_FRAMEWORK/schema/contracts/work-unit.mjs`、work-unit envelope 与 Sub-agent guidance；不新增 CLI、schema version、persistent state 或 authority file。
- 预计调整 Wave2 Gate/inspect、Wave0/1/2 queue-drain、work-unit submit/inspect/timeout-preflight 与 Markdown contract tests；测试继续使用 `node:test`，不新增依赖。
- v0.30 曾靠 slug presence、nonzero count 或未排空 queue 通过的 bundle，在 v0.31 rerun 时会得到可修复 failure；合法 reduced-coverage first-run/supplement、empty queue、object/string/no-detail receipt 保持可通过。
- `_checkpoints/`、`_diagnostics/gates/`、`rb_trace.jsonl`、`rb_output_declarations.jsonl` 与现有 retry/late-submit/reentry authority 不新增字段或第二条成功路径。
