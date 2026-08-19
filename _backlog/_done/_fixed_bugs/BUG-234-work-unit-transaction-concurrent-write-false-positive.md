# BUG-234: work-unit 事务整 bundle 快照把并发写入误判为 "mutated undeclared targets"，合法 submit/recover 被标 suspect

> 状态: 活跃 | 优先级: P1 | 严重度: P2 | 更新: 2026-08-18 | source: 真实 run 执行（dpt_rb_enterprise-ai-transformation-six-cases，wave1 supplementary submit + recover）

## Why（完整上下文）

`DEEP_RESEARCH_HARNESS/engine/work-unit-transaction.mjs` 的 `withWorkUnitTransaction`
在 callback 前后做**整 bundle** 文件快照比对：

```js
const beforeFiles = listBundleFiles(root, ref);   // 递归列 bundle 所有文件 + sha
const result = fn({ ... });                        // 声明目标写入
const afterFiles = listBundleFiles(root, ref);
const undeclared = changedFiles(beforeFiles, afterFiles)
  .filter((entry) => !normalized.mutationTargets.includes(entry));  // line ~541
if (undeclared.length > 0) throw new Error(`transaction ${txId} mutated undeclared targets: ...`);
```

`listBundleFiles`（line ~155）递归遍历 bundle 根下**所有**文件（含 `_cache/`、
`_scripts/`、`artifacts/`、`reference/`），`changedFiles` 对比任意文件的 sha。因此
**事务窗口内任何进程对 bundle 内任意文件的写入**——即便与本次事务无关——都会被当成
「未声明目标变更」→ 抛错 → journal 置 `suspect`，且 `rollbackProven = false`（
`rollback.ok && !(undeclared.length > 0)`），尽管声明目标可能已全部回滚。

在并行 sub-agent 执行场景（本 harness 的常态：多个 delegated fetch 同时写
`_cache/wave1/primary/{topic}/`），这是必然命中的假阳性。

## 复现

1. 起一个被 claim 的 work unit，sub-agent 已写好 result + cache trail。
2. 保持**另一个** sub-agent 正在抓取（写 `_cache/wave1/primary/{other-topic}/...`）。
3. 对第一个 unit 执行 `operate-work-unit submit`。
4. 事务 callback 只写 6 个声明目标（result/receipt/_status/ledger/index/queue），但在
   窗口内另一个 sub-agent 写了几十个 `_cache/` 文件 → `mutated undeclared targets` →
   submit 失败，journal `suspect`，`callback_stopped: true`，`rollback_restored: false`。

本 run 实测：submit wu-w1-b000-deep-i0011 时并发 Jabil/cross-case fetch 写
`_cache/wave1/primary/04_jabil-…`、`07_cross-case-…` 共 ~24 个文件 → submit 标 suspect；
随后对它的 `recover-transaction` 又因并发写 `_scripts/wu-w1-i0019-fetch-s17.mjs` 同样
标 suspect → 双 orphan（见 BUG-233）。

## 影响（本 run 实账）

- 并行 sub-agent 是 accepted execution model（`effective_delegated_concurrency_cap`
  默认 12，batch claim 9 个），并发写 cache 是正常负载；submit 事务因此失败是系统性
  引导缺失，不是偶发。
- 失败后 Agent 被迫：串行化全部 submit（等待所有 fetch 结束再逐个提交）——本次恢复
  就这样规避，但把正常并行吞吐降为串行。
- 该假阳性直接产生 BUG-233 的双 orphan 死锁，导致 run 在断电后无法通过合法操作恢复。
- 事务引擎把「他人并发写」归责给当前事务，rollback 证明被污染（
  `rollback_restored: false` 尽管声明目标已恢复），后续 inspect 长期报 ledger invalid。

## 为什么是框架缺陷（不是 Agent 执行错误）

- 并发写是并行 delegated 执行的预期行为，不是异常；快照范围与事务拥有权不一致——
  事务只写 6 个声明目标，却对整 bundle 的并发变动负责。
- `mutated undeclared targets` 的语义应为「本事务 callback 写了未声明目标」，而不是
  「bundle 内任何文件变了」。当前实现把二者混同。
- `rollbackProven` 依赖 `!(undeclared.length > 0)`，使无关并发写污染 rollback 证明，
  与事务实际完整性无关。

## Owner / 最小修复方向

`withWorkUnitTransaction` 的变更检测（`DEEP_RESEARCH_HARNESS/engine/work-unit-transaction.mjs`，
`listBundleFiles` ~155 / `changedFiles` ~177 / 检测 ~515-541）：

1. 把 before/after 快照从「整 bundle」收窄为「本事务的 declared mutation targets」+
   本次操作声明写入的 cache/degraded 范围（若 submit 回调需校验 cache trail，应显式
   声明而非隐式对比全 bundle）。
2. 或把检测语义改为「仅当 changed file 属于本事务 target 集合或本操作 owns 的 cache
   命名空间时才算 undeclared」；其他路径的写入视为无关并发，不阻断事务。
3. 对 `rollbackProven`：若声明目标全部恢复，不应因无关并发写入而标 `rollback_restored:
   false`。
4. 增加确定性测试：模拟一个事务窗口内并发写无关 `_cache/` 文件，断言提交成功而非
   `suspect`；以及并发写属于本事务 cache 命名空间时仍能正确校验。

> 注意：与 bug 修复配合，submit 仍应并发安全（当前 crash 前 Agent 靠串行 submit 规避；
> 修复后应恢复并行 submit 的合法性）。

## 关联

- 下游后果：[BUG-233](../bugs/BUG-233-work-unit-two-orphan-transaction-deadlock.md)（双 orphan 死锁）
- `DEEP_RESEARCH_HARNESS/engine/work-unit-transaction.mjs`：`listBundleFiles`、`changedFiles`、`withWorkUnitTransaction` 变更检测、`rollbackProven`
- 本 run 实账：trace 事件 `work_unit_transaction_failed`（tx-1787057421298 / tx-1787057445613），
  `dpt_rb_enterprise-ai-transformation-six-cases/_diagnostics/crash-recovery-transactions/README.md`
- 既有相关卡片：[BUG-147]（result.json 非原子写，weak-model）与本文不同——本文是确定性并发检测缺陷，与执行者强弱无关
