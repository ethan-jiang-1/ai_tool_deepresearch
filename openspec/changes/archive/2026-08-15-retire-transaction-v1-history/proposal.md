## Why

`work-unit.transaction.v1` 没有 current writer，也不是可恢复的 current
transaction protocol；它仍被完整 schema union 和 original-acceptance reader
解释为历史计算输入。用户已选择 A：当前 Engine 不再从 v1 取得 submit、recovery 或
supersession authority。这个 change 同时保留未完成或无效 journal 的 fail-closed
mutation boundary，不能把旧文件的存在误当成可忽略的历史噪声。

来源：[C6d decision card](../../../_backlog/plans/current-contract-signal-cleanup/changes/C6d-retire-transaction-v1-history.md)，
用户于 2026-08-14 选择 A。

## What Changes

- **BREAKING** 停止把 committed `work-unit.transaction.v1` journal 用作
  original-submission/acceptance evidence；它不再参与 declaration recovery、
  supersession、normalized submitted-ledger、Gate 或 inspect 的 current Engine
  computation。一个已通过 complete-current-profile 检查但只有 v1 proof 的
  predecessor 因此在缺少 v2 proof 的 `missing_contract` 边界停止。
- 移除 v1 的 positive transaction schema/reader branch，保留 v2 作为唯一可解析、
  可恢复、可证明的 transaction protocol；不迁移、重写或补全历史 journal。
- 保留 transaction-directory 的最小 raw safety scan：能识别的 v1 journal 只要未
  committed，以及任何 unreadable、malformed 或 proof-incomplete journal，仍必须产生
  `suspect_transaction` 并阻止 mutation。只有结构完整的 committed v1 可作为
  diagnostic-only bytes 而不单独阻塞 mutation；它既不成为 evidence，也不成为 current
  transaction authority。
- 保持 current v2 lock contention、before-image rollback、`suspect_transaction`
  diagnostics、idempotent v2 recovery 和完整 current work-unit profile 的 existing
  behavior；不改变 C6a/C6b/C6c 已归档的 rejection boundary。

## Semantic-Precision Reflection

Engine reader 的有界问题是：“这个 bundle 是否有足以允许 mutation 或证明 current
submitted predecessor 的 transaction fact？”完整 v2 proof、unresolved/unreadable
journal 与 settled v1 bytes 的答案不同：前者可支持其已定义的 v2 action，第二类必须在
`suspect_transaction` 停止，第三类没有 current authority。正常 reader 因此不再重建
v1 的旧协议；只有 raw safety scan 保留“不安全，停止 mutation”这个精确结论。

这减少一个 positive protocol branch 和一条 historical evidence path，而非增加 state、
retry、fallback 或 recovery controller。用户决定是否退役历史 meaning；Agent 依照
approved task 执行修改；Engine 继续根据直接 journal/lock facts 裁决 v2 busy、v2
recovery 或 suspect verdict，不选择语义 repair。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `agent/delegated-work-units` | Catalog entry; current transaction-integrity and supersession requirements; `DEW-023`, `DEW-024` registry entries | Modify | Its requirements explicitly retain v1 as a read-only branch and define the transaction/supersession outcomes being changed. |
| `agent/work-unit-provenance-gate` | Catalog entry and transaction-term search | Verify-only | It consumes submitted provenance but does not own transaction journal parsing or v1 evidence semantics. |
| `engine/check-inspect-feedback` | Current `suspect_transaction` feedback requirement and transaction-term search | Verify-only | The changed transaction reader continues to return its existing fail-closed feedback root; this change adds no feedback capability. |
| `agent/subagent-node-contract` | Catalog entry and transaction-term search | Excluded | Agent task/result handoff names transaction feedback but does not promise a v1 interpretation. |

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `agent/delegated-work-units`: make v2 the sole current transaction protocol,
  retain raw fail-closed detection of unresolved/invalid legacy journals, and
  remove committed-v1 acceptance evidence from current recovery and supersession.

## Impact

- Expected implementation surfaces: transaction schemas/barrel/readers,
  transaction inspection/preflight, declaration-recovery and
  supersession/original-acceptance validation, accepted requirement text, and
  focused schema/unit/integration/deterministic-E2E tests.
- Historical run bytes remain untouched and may remain human-readable; old
  committed v1 journals no longer back a current Engine conclusion.
- No dependency, new command, migration, background cleanup, force-delete, or
  automated recovery path is introduced.
