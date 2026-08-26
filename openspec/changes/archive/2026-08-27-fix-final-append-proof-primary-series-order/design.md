# Design: 统一 primary-series 追加证明的规范摘要顺序

## Context

背景与动机见 `proposal.md - Why`；行为契约见
`specs/research/post-final-recovery/spec.md`（MODIFIED POF-001）。当前事实：

- 绑定路径 `digestFinalReportPrimarySeriesEntries(entries, primarySeries)`
  （`DEEP_RESEARCH_HARNESS/engine/helpers/final-report-series.mjs` line 137-145）先按
  `primary_entries` 过滤、再 `sort((l, r) => l.path.localeCompare(r.path))`、最后
  `digestFinalReportInventoryEntries`（line 128-129 原样 digest 传入数组）。
- 证明路径 `proveNewerFinalAppend`（`handoff-helpers.mjs` line 480-515）在 primary-series
  basis 下从 `inventory.entries`（`readSafeRecursiveInventory` line 466-487 的 **plain
  `readdirSync().sort()` 字节序**）过滤 primary entries，**不排序**直接 digest retained。
- 现代 series（`final.md` base + `final_vN.md` revisions）下两者顺序必然相反（ICU 给 `'_'`
  权重低于 `'.'`，plain byte 排序相反），同一组文件的摘要永远不同。

## Goals / Non-Goals

**Goals**

- 证明路径与绑定路径对同一 retained 集算出**同一个摘要**（规范顺序一致）。
- 单一 helper 作为「对给定 entry 集计算 primary-series 规范摘要」的 Source of Record，
  绑定与证明共用，杜绝两处顺序定义再次漂移。
- 现代 series 回归测试全链覆盖（witness → append → proof → digest 匹配）。
- 保持 legacy whole-tree binding 行为不变（其绑定与证明两侧都用
  `readSafeRecursiveInventory` 的 plain `.sort()` 顺序，两侧一致，不属于本 bug）。

**Non-Goals**

- 不改 `readSafeRecursiveInventory` 的遍历顺序（legacy whole-tree 两侧依赖它且一致）。
- 不改 C5 event schema、workspace、basis 判定（`boundFinalWitness`）、removal-prefix 逻辑。
- 不改 `digestFinalReportPrimarySeriesEntries` 的公开行为（它就是规范顺序的既定实现）。
- 不改任何 bundle 内容 / 历史 final 字节。

## Decisions

### D1: 证明路径复用绑定路径的规范顺序（单一 helper 收敛）

**决策**：把「过滤 primary paths + `localeCompare` 排序 + digest」这一语义收敛为单一导出 helper
`digestFinalReportPrimarySeriesEntries(entries, primarySeries)` 的复用点：`proveNewerFinalAppend`
在 primary-series basis 下计算 retained digest 时**调用同一个 helper**（传入 retained + inventory
的 `primary_series`），而不是直接调 `digestFinalReportInventoryEntries(retained)`。

**备选方案**

1. 最小补丁：在 `proveNewerFinalAppend` 里 `retained` digest 前
   `[...retained].sort((l, r) => l.path.localeCompare(r.path))`。→ 可行，但两处顺序定义仍各自
   独立存在，`final-report-series.mjs` 的排序语义与 `handoff-helpers.mjs` 的复制排序仍会漂移；
   且 `handoff-helpers.mjs` 需要自己 import 排序逻辑，跨文件职责不清。
2. 新 helper `digestPrimarySeriesCanonical(entries)`（只排序+digest，不过滤）。→ 引入第二个
   公开摘要入口，与既有 `digestFinalReportPrimarySeriesEntries` 职责重叠，读者要分辨两个 helper
   的边界；本 change 主张**收敛而非新增入口**。
3. 直接复用 `digestFinalReportPrimarySeriesEntries`（决策 D1）。→ 绑定与证明自然共享同一
   「过滤 + 排序 + digest」实现；`handoff-helpers.mjs` 对 digest 顺序零假设，顺序定义只存在于
   `final-report-series.mjs` 一处。**选此。**

**实现形状**（`proveNewerFinalAppend` 内，primary-series basis 的 exact-match 循环）：

```js
// basisEntries 已按 basis 过滤；primary-series 分支的 retained digest 用与绑定相同的
// 规范顺序（过滤 + localeCompare 排序）计算，避免与 readSafeRecursiveInventory 的
// plain 字节序不一致导致现代 series 摘要永远不匹配。
if (witness.basis === 'primary_series') {
  if (digestFinalReportPrimarySeriesEntries(retained, inventory.primary_series) === witness.digest) {
    exactMatches.push(prefix);
  }
} else if (digestFinalReportInventoryEntries(retained) === witness.digest) {
  exactMatches.push(prefix);
}
```

注意：`digestFinalReportPrimarySeriesEntries` 内部会对 `retained` 再做 primary-path 过滤
（基于当前 inventory 的 `primary_series.primary_entries`）。对 primary-series basis，`retained`
已经只含 primary paths，该过滤是幂等的（只可能去掉「不在当前 series 里的残留 path」——而
basis 过滤已保证 retained ⊆ 当前 primary paths），因此语义等价且更稳健（万一 inventory 里混入
primaryPaths 集合外的同形 path，也会被同一过滤规则处理，与绑定路径行为完全一致）。

### D2: `digestFinalReportInventoryEntries` 的「无排序」语义显式文档化

**决策**：`digestFinalReportInventoryEntries` 保持「原样 digest 传入数组」不变，但在源码注释中
显式写明：本函数按传入顺序 digest，**不排序**；调用方必须自行保证规范顺序。`readSafeRecursiveInventory`
的 plain `.sort()` 顺序是 legacy whole-tree 绑定与证明两侧共享的既定规范顺序，保持不变。

**理由**：`sha256`（whole-tree digest）与 legacy 证明路径都依赖「传入即 digest」的现状；把它改成强制排序
会改变 legacy binding 的既有摘要（历史 C5 event 绑定会全部失配），属于本 bug 之外的破坏性改动。显式
文档化让「无排序」成为声明过的契约，而非隐式行为。

### D3: 回归测试直接锁现代 series 全链

**决策**：`tests/engine/helpers/handoff-final-append-proof.test.mjs` 的 `buildBundle` 增加
`modern` 选项（`final.md` base + `final_vN.md` revisions），新增用例：

- primary basis：modern base + 1 revision 追加 → `matched:true`,
  `removed_targets:['final/final_v1.md']`；
- primary basis：modern base + 2 revisions 追加（bound 时只有 base+v1，交付时 +v2）→
  `matched:true`, `removed_targets:['final/final_v2.md']`（对应 bug 报告验收
  `{"matched":true,"removed_targets":["final/final_v2.md"],"current_target":"final/final_v2.md"}`）；
- primary basis：modern series 内容被篡改 → `matched:false`（负例，证明排序修复没有放宽字节校验）；
- legacy 既有用例全部保持通过（回归不破坏）。

## Risks / Trade-offs

- [`localeCompare` 依赖宿主 ICU 排序] → 绑定与证明现在**共用同一 helper**，即使 ICU 排序在不同
  环境有差异，两侧也一致（同机同 ICU）；跨机绑定+证明在**同一 bundle 的同一进程内**完成，不会跨机
  比对。既有 C5 绑定摘要（如真实 bundle 的 `37ab2175…`）仍以原主机 ICU 计算，本 change 不改绑定
  路径，历史绑定不受影响。
- [复用 helper 会重新过滤 retained] → 对 primary-series basis 是幂等操作（见 D1），且使两条路径
  的过滤+排序规则完全一致，反而消除边界差异。
- [现代 series 摘要顺序与 plain 字节序相反的事实仍存在] → 这不是 bug，是既定排序语义；本 change
  只保证两侧一致。`final.md` 与 `final_vN.md` 的相对顺序差异不再影响匹配。

## Migration Plan

- 无数据迁移：C5 event、workspace、bundle 内容均不动。
- 部署即代码修复 + 回归测试；`operate-post-final-recovery inspect` 对字节已恢复的现代 series bundle
  从 `blocked: accepted_lineage_drift` 转为正常证明路径。
- 回滚：撤销 `handoff-helpers.mjs` 的 digest 复用即可回到旧行为（旧行为是本 bug，回滚只用于
  应急，不推荐）。

## Open Questions

无（修复边界、排序语义、验收标准均已由 bug 报告与 delta spec 确定）。
