# BUG-233: work-unit 事务双 orphan 死锁——两个 suspect journal 互相成为对方的恢复阻塞，`recover-transaction` 无合法恢复路径

> 状态: 活跃 | 优先级: P1 | 严重度: P2 | 更新: 2026-08-18 | source: 真实 run 执行（dpt_rb_enterprise-ai-transformation-six-cases，断电后恢复，wave1 supplementary submit）

## Why（完整上下文）

`DEEP_RESEARCH_HARNESS/engine/work-unit-transaction.mjs` 的事务治理要求任何
work-unit 变更在 `withWorkUnitTransaction` 内先过 orphan 检查：
`unresolvedOrphanJournals()` 扫描 `_work_units/_transactions/` 下所有
`status ∈ {started, suspect}` 的 journal，非空即拒绝（
`withWorkUnitTransaction` 内 `inspectWorkUnitTransaction(...)` → `disposition !== 'none'`
→ `transactionBlockedResult`）。

`recoverWorkUnitTransaction`（`work-unit-transaction.mjs:625`）是唯一合法的 suspect
journal 恢复入口，但它**自己也是一个事务**，携带 `allowOrphanTxId: 被恢复的 tx`。问题：

- 恢复 tx-A 时，`allowOrphanTxId = A`，orphan 检查会看到 tx-B 仍 unresolved → blocked；
- 恢复 tx-B 时，`allowOrphanTxId = B`，orphan 检查会看到 tx-A 仍 unresolved → blocked。

当**两个** suspect journal 并存（本次由 BUG-234 的并发假阳性触发），两个
`recover-transaction` 调用各自返回 `repair_kind: recover-transaction`，但 `write_to`/
`rerun` 都指向**另一个** journal —— 引擎在两者之间无限互踢，没有任何操作能先解除其中一个。
实测两个 probe 输出：

```text
recover tx-…7421298 → missing_fact: "unlocked unresolved transaction journal tx-…5613 …"
                       write_to: _work_units/_transactions/tx-…5613.json
recover tx-…5613     → missing_fact: "unlocked unresolved transaction journal tx-…7421298 …"
                       write_to: _work_units/_transactions/tx-…7421298.json
```

这使整个 bundle 的 work-unit 层被永久卡死：任何 submit/claim/timeout/replace 都过不了
orphan 检查，run 无法继续。`operate-work-unit inspect` 只报
"multiple unresolved transaction journals exist"，`repair_kind` 为 `missing_contract`
（多 orphan 时 `unlocked: false`，`recoverable: false`），没有给出可执行路径。

## 复现

1. 制造两个 `suspect`（或 `started`）journal：让 tx-A 失败留下 suspect，再对它执行一次
   `recover-transaction` 且这次 recover 也失败（见 BUG-234 的并发写触发方式，或直接放
   两个手造 suspect journal 到 `_work_units/_transactions/`）。
2. `node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs recover-transaction <bundle> --tx-id <A>`
   → 返回 `suspect_transaction`，`write_to`/`rerun` 指向 B。
3. `recover-transaction ... --tx-id <B>` → 返回 `suspect_transaction`，`write_to`/`rerun` 指向 A。
4. 任何其他 work-unit 操作（submit/claim/timeout/...）都被 orphan 检查拒绝。

当前引擎 `recoverWorkUnitTransaction` 的前置断言也确认了只有**单** orphan 被设计支持：
`tests/engine/work-unit-transaction.test.mjs` "recovers one unlocked orphan only when
every original target still matches" 只覆盖单 journal 情形，无多 orphan 用例。

## 影响（本 run 实账）

- `dpt_rb_enterprise-ai-transformation-six-cases` 断电后处于两个死锁 suspect journal
  （tx-1787057421298-f7aa59aa submit + tx-1787057445613-33f572df recover）状态，9 个
  claimed work unit lease 过期但无法 submit/timeout/replace，run 整体卡死。
- 修复只能靠 operator 手动把两个 journal 移出 `_work_units/_transactions/`（本次恢复即
  如此：归档到 `_diagnostics/crash-recovery-transactions/`）——这违反
  「Never manually edit transaction journals」hard rule，属于被逼出的 hand-authority
  旁路。框架应提供合法路径。
- 语义上两个 journal 的 rollback 均已证明有效（所有 declared targets 与 before-image
  sha256 一致），磁盘状态本已一致，只是 bookkeeping 无法通过合法操作结清。

## 为什么是框架缺陷（不是 Agent 执行错误）

- orphan 检查是全有或全无（any unresolved → block all），但恢复入口 `recover-transaction`
  只接受「恰好一个可恢复 orphan」；两个并存的 orphan 落入无主区域，引擎自己的
  `rerun` 指引互相指向对方，构成死循环。
- 崩溃/并发（BUG-234）天然可能产生「被恢复者 + 恢复尝试」两个 journal 的嵌套组合，本
  次是真实发生而不是人造边界情形。
- `recoverWorkUnitTransaction` 对已 recover 目标使用 `allowOrphanTxId` 只豁免被恢复者，
  无法豁免「另一个 unresolved journal」——这是设计上没有覆盖 multi-orphan 的证明。

## Owner / 最小修复方向

`recoverWorkUnitTransaction` 与 `withWorkUnitTransaction` 的 orphan 治理（
`DEEP_RESEARCH_HARNESS/engine/work-unit-transaction.mjs`）：

1. 给 `recover-transaction` 增加对「多个 unresolved journal」的处理：当被恢复 journal 的
   `mutation_manifest` 指向另一个 orphan（恢复尝试 journal 情形）时，允许先结清/跳过该
   wrapper journal，或提供确定的恢复顺序（先恢复外层 recover 尝试、再恢复其目标），消除
   互踢。
2. 或扩展 orphan 检查：`recover-transaction` 允许带一个显式解析顺序（例如
   `--tx-id` 链），按 target 依赖序逐个 `rolled_back`，而不是一刀切拒绝。
3. 若维持 single-orphan 边界，则必须让多 orphan 状态返回**确定的** `missing_contract`
   + 一个可操作 owner 路径（不能无限互踢），并且该路径不应要求手改 transaction 目录。
4. 增加确定性测试：两个互引 suspect journal 时，存在一个合法命令序列能结清两者并让
   ledger 恢复有效，且不手改 journal bytes。

## 关联

- 触发根因：[BUG-234](../bugs/BUG-234-work-unit-transaction-concurrent-write-false-positive.md)（整 bundle 快照并发假阳性产生双 orphan）
- `DEEP_RESEARCH_HARNESS/engine/work-unit-transaction.mjs`：`unresolvedOrphanJournals`（~339）、`withWorkUnitTransaction`（~429）、`recoverWorkUnitTransaction`（~625）、`suspectProjection`（~265）
- 本 run 实账：`dpt_rb_enterprise-ai-transformation-six-cases/_diagnostics/crash-recovery-transactions/README.md`
- `tests/engine/work-unit-transaction.test.mjs`（现有 single-orphan 恢复测试，缺 multi-orphan 用例）
