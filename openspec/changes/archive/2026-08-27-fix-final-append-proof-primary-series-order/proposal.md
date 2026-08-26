## Why

post-final recovery 的 immutable-append 证明 `proveNewerFinalAppend`（`DEEP_RESEARCH_HARNESS/engine/helpers/handoff-helpers.mjs` line 480-515）在 primary-series basis 下对 retained 集**不做排序**就
`digestFinalReportInventoryEntries(retained)`（`final-report-series.mjs` line 128-129 原样 digest），而 C5 绑定摘要
（`digestFinalReportPrimarySeriesEntries`，line 137-145）**先用 `localeCompare` 排序**再 digest。对现代 primary
series（`final.md` base + `final_vN.md` revisions），两条路径的规范顺序必然相反（ICU 给 `'_'` 的权重低于 `'.'`，
plain byte 排序相反），同一组文件的摘要**永远不同** → `matched:false` → `newer_final_inventory_drift` →
`operate-post-final-recovery inspect` 永久返回 `blocked: accepted_lineage_drift`。字节内容无关，纯条目顺序问题，
现代 series 的 bundle 只要走过 C5 rerun + 后续交付 newer final 就永久卡死（blocker，真实 bundle
`dpt_rb_chinese-ai-inference-chips-vs-nvidia`，来源 `_backlog/bugs/BUG-246-...md`）。

## What Changes

本 change 只修 digest 规范顺序的一致性；不改 C5 event 写入、post-final recovery workspace、legacy whole-tree
binding 语义、series 分类/分配规则等既有 authority。

- **BUG-246**：`proveNewerFinalAppend` 在 primary-series basis 下对 retained 集改用与绑定路径**同一种规范顺序**
  （`localeCompare` 按 `path` 排序）后再 digest，使「字节一致 + 更高 revision 追加」在现代 series 下也能证明
  immutable append。
- **单一 helper 收敛**：抽取「对给定 primary-series entry 集计算规范摘要」的单一 helper（或让证明路径直接复用
  `digestFinalReportPrimarySeriesEntries` 的排序语义），绑定路径与证明路径共用，杜绝两处顺序定义再次漂移。
- **显式文档化**：`digestFinalReportInventoryEntries` 保持「原样 digest 传入数组」的语义并在源码注释中写明
  「调用方负责传入规范顺序」（legacy whole-tree 路径依赖 `readSafeRecursiveInventory` 的 plain `.sort()` 顺序，
  该路径绑定与证明两侧一致，不改动）。
- **回归测试**：`tests/engine/helpers/handoff-final-append-proof.test.mjs` 目前只用 legacy 命名
  （`report.md` + `final_v1.md`），从未覆盖现代 series。新增 modern base（`final.md`）+ 1..N revisions 的
  witness→append 全链用例，并锁定期望输出（MODERN 修复后应为
  `{"matched":true,"removed_targets":["final/final_v2.md"],"current_target":"final/final_v2.md"}`）。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `research/post-final-recovery` | `openspec/specs/research/post-final-recovery/spec.md`（POF-001 的 digest/basis/append-proof 段落）、`final-report-series.mjs`、`handoff-helpers.mjs` | Modify | POF-001 规定 append proof 在 event 绑定 basis 上对 retained 集 rehash；其排序语义必须与绑定 digest 的规范顺序一致，本 change 把这一行为明确化并修复 Engine 实现。 |
| `final/primary-report-series` | `openspec/specs/README.md` 目录导航；main spec 由 `research/post-final-recovery` 覆盖 | Verify-only | catalog 中的最终交付相关 capability 行：本 change 不改 series 分类/分配/blocker 语义，只改 digest 顺序一致性；无独立 capability 需要新建。 |

> 无 New capability；`skip_specs` 不适用（有 POF-001 的行为修改）。

## Capabilities

### New Capabilities

（无。）

### Modified Capabilities

- `research/post-final-recovery`: POF-001 的「immutable-append 证明」段落——明确 append proof 的 retained
  rehash 必须与绑定 digest 使用同一规范顺序（primary-series basis 下为按 `path` 的 `localeCompare` 排序），
  字节一致的现代 series 追加不得因排序不一致被误判为 drift。

## Impact

- `DEEP_RESEARCH_HARNESS/engine/helpers/handoff-helpers.mjs`：`proveNewerFinalAppend` 的 retained digest
  计算（primary-series basis）。
- `DEEP_RESEARCH_HARNESS/engine/helpers/final-report-series.mjs`：抽取/暴露单一规范摘要 helper（
  `digestFinalReportPrimarySeriesEntries` 复用或新 helper），并给 `digestFinalReportInventoryEntries` 补
  「调用方负责规范顺序」注释。
- `tests/engine/helpers/handoff-final-append-proof.test.mjs`：新增现代 series（`final.md` base + revisions）
  回归用例。
- 不触碰：C5 event schema、workspace、legacy whole-tree binding、`readSafeRecursiveInventory` 遍历顺序
  （legacy 两侧一致，保持 plain `.sort()`）、任何 bundle 内容。
- 依赖：Node.js >=20、纯 ESM、仅 `zod`/`yaml`（本 change 不新增依赖）。
