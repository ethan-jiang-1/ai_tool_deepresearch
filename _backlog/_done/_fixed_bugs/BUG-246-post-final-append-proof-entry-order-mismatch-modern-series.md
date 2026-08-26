# BUG-246: post-final 追加证明 `proveNewerFinalAppend` 用 plain-sort 条目顺序，而 C5 绑定摘要用 `localeCompare` 顺序——现代 series（`final.md` + `final_vN.md`）下两者必然相反，追加证明永久失败，post-final recovery 卡死

- **Severity**: blocker（现代 primary series 的 bundle 只要走过 C5 rerun + 后续交付 newer final，再次 C5 就被永久卡在 `accepted_lineage_drift`；非内容可修，必须改 Harness）
- **Phase**: post-final recovery（C5 `post_final_rerun` 之后的再次 reentry：`operate-post-final-recovery inspect` → `newer_final_inventory_drift`）
- **报告日期**: 2026-08-27
- **Bundle**: `dpt_rb_chinese-ai-inference-chips-vs-nvidia`
- **直接触达的 Engine 源码**:
  - `DEEP_RESEARCH_HARNESS/engine/helpers/handoff-helpers.mjs`
    - `proveNewerFinalAppend(...)` → line 480-515（line 482-485 取 `basisEntries`，line 490-491 用 `digestFinalReportInventoryEntries(retained)` **不做排序**）
    - `boundFinalWitness(...)` → line 444-449
    - `finalRemovalPrefixes(...)` → line 456-469
    - `inspectNewerFinalStage(...)` → line 517-598（line 571-587 是阻塞裁决点）
    - `inspectPostFinalHandoffStage(...)` → line 600+（line 578 调用 append proof）
  - `DEEP_RESEARCH_HARNESS/engine/helpers/final-report-series.mjs`
    - `digestFinalReportInventoryEntries(...)` → line 128-129（**无排序**，原样 digest 传入数组）
    - `digestFinalReportPrimarySeriesEntries(...)` → line 137-145（**`localeCompare` 排序**后 digest——C5 绑定走的就是这个）
    - `readSafeRecursiveInventory(...)` → line 466-487（line 468 `readdirSync(current).sort()` **plain byte 排序**遍历）

## 摘要

C5 事件（`post_final_reentry`）绑定 `previous_final.final_inventory_sha256` 时走
`finalFacts → readFinalReportInventory → primary_sha256 → digestFinalReportPrimarySeriesEntries(...)`，
该函数对 primary entries **用 `path.localeCompare(path)` 排序**后再 digest。

post-final 之后交付了 newer final 时，`inspectPostFinalHandoffStage → inspectNewerFinalStage` 需要证明
「当前 inventory = C5 绑定 inventory + 不可变追加（更高 revision）」：`proveNewerFinalAppend` 从
`inventory.entries`（`readSafeRecursiveInventory` 的 **plain `.sort()` 顺序**）过滤出 primary entries，
**不排序**就 `digestFinalReportInventoryEntries(retained)` 与绑定摘要比对。

对现代 primary series（`final.md` 作 modern_base + `final_vN.md` 作 revision），**两个顺序必然相反**：

- plain byte 排序：`'final/final.md' < 'final/final_v1.md'`（`'.'`=0x2E < `'_'`=0x5F）→ `[final.md, final_v1.md]`
- `localeCompare`（本机 ICU）：`'final/final.md'.localeCompare('final/final_v1.md') === 1`，即
  `final_v1.md < final.md`（ICU 给 `'_'` 的权重低于 `'.'`）→ `[final_v1.md, final.md]`

于是「追加证明 retained 集」的 digest 与「C5 绑定 digest」对同一组文件**永远不同** → `matched:false` →
`newer_final_inventory_drift` → `operate-post-final-recovery inspect` 返回 `blocked: accepted_lineage_drift`。
**字节内容无关，纯条目顺序问题，结构性无法通过。**

## 真实证据（Engine 逐行复现产物）

Bundle `dpt_rb_chinese-ai-inference-chips-vs-nvidia` 实测（2026-08-27，`final.md`/`final_v1.md` 已恢复为
C5 绑定的原始字节，见「接手信息」）：

```
localeCompare('final/final.md', 'final/final_v1.md') = 1        # final_v1.md 排前
plain: 'final/final.md' < 'final/final_v1.md'                  # final.md 排前

C5 绑定摘要 37ab2175dec190e6c9b74a2d9f78a396c5423e15e93b2a3e34deee2d93f14591
  = digestFinalReportPrimarySeriesEntries({final.md:H, final_v1.md:H})   # localeCompare 序 [final_v1.md, final.md]
  （H = sha256(staging 文件) = 63c3f663…，2 文件 digest 验证精确命中）

proveNewerFinalAppend retained（prefix=[final/final_v2.md]，plain 序 [final.md, final_v1.md]）
  digest = a8c377fe2eca2c84e7a69b8a872cbd071f8bcf868e288cc7190a9312cbfcba88  ≠ 37ab2175…

inspect 结果：verdict=blocked, reason_code=accepted_lineage_drift,
  reason='newer Final inventory is neither the accepted prior inventory nor a proven immutable canonical append'
```

最小对比实验（同一 witness 语义，仅 base 文件名不同）：

```
MODERN  base=final.md   + final_v1.md + final_v2.md  → proveNewerFinalAppend: {"matched":false,"basis":"primary_series"}
LEGACY  base=report.md  + final_v1.md + final_v2.md  → proveNewerFinalAppend: {"matched":true,"removed_targets":["final/final_v2.md"],"current_target":"final/final_v2.md"}
```

（LEGACY 通过是因为 `final_v1.md < report.md` 在两种排序下一致；MODERN 失败是因为 `final.md` 与
`final_vN.md` 在两种排序下相反。）

## 根因（逐行）

1. C5 绑定（`final-report-series.mjs` line 137-145 `digestFinalReportPrimarySeriesEntries`）**排序**（`localeCompare`）后 digest。
2. 追加证明（`handoff-helpers.mjs` line 480-515 `proveNewerFinalAppend`）从 `inventory.entries`
   （`readSafeRecursiveInventory` line 468 **plain `.sort()`** 序）过滤 retained，**不排序**直接
   `digestFinalReportInventoryEntries(retained)`（line 128-129 原样 digest）。
3. 两条路径对同一组路径的**规范顺序定义不同**（localeCompare vs plain byte sort），且对
   `final.md` vs `final_vN.md` 这对路径结果相反（`'_'` 在 ICU 中权重低于 `'.'`）。
4. digest 是 `sha256(JSON.stringify(entries))`，顺序不同 → 摘要必然不同 → 现代 series 下
   `matched:false` 是确定性的，与文件内容无关。

## 期望行为

现代 primary series（`final.md` base + `final_vN.md` revisions）下，只要 C5 绑定与当前 inventory 的
retained 集字节一致，追加证明应能通过：

- `proveNewerFinalAppend` 的 retained digest 必须与 C5 绑定使用**同一种规范顺序**（即与
  `digestFinalReportPrimarySeriesEntries` 一致，`localeCompare` 排序），或复用同一个 digest helper；
- 修复后 `operate-post-final-recovery inspect` 对「字节已恢复为 C5 绑定的现代 series bundle」应返回
  `eligible`（或至少不再因顺序问题报 `newer_final_inventory_drift`）。

## 修复方向（供 Harness-fixing Agent）

- 最小修复：`proveNewerFinalAppend` line 490-491 在 digest 前对 `retained` 做与绑定一致的排序
  （`[...retained].sort((l, r) => l.path.localeCompare(r.path))`），或直接复用
  `digestFinalReportPrimarySeriesEntries` 的语义。
- 更稳的做法：抽出一个「对给定 entry 集计算 primary-series 规范摘要」的单一 helper，绑定路径
  （`digestFinalReportPrimarySeriesEntries`）与证明路径（`proveNewerFinalAppend`）都调它，杜绝两处
  顺序定义漂移。`digestFinalReportInventoryEntries` 的「无排序」语义建议显式文档化或改为强制排序。
- 必须补回归测试：`tests/engine/helpers/handoff-final-append-proof.test.mjs` 目前只用 legacy 命名
  （`report.md` + `final_v1.md`，见 fixture `buildBundle`），**从未覆盖现代 series**（`final.md` + revisions），
  因此排序不一致一直未被发现。新增用例：modern base + 1..N revisions 的 witness→append 全链。
- 回归验收：上述「真实证据」与「最小对比实验」脚本在修复后 MODERN 应返回
  `{"matched":true,"removed_targets":["final/final_v2.md"],"current_target":"final/final_v2.md"}`。

## 最小可复现 / 验证

```bash
# 现代 series（本 bundle 的形状）——修复前 matched:false，修复后应为 matched:true
node --input-type=module -e '
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { readFinalReportInventory } from "./DEEP_RESEARCH_HARNESS/engine/helpers/final-report-series.mjs";
import { proveNewerFinalAppend } from "./DEEP_RESEARCH_HARNESS/engine/helpers/handoff-helpers.mjs";
const mk = (r, base, rev2=false) => { rmSync(r,{recursive:true,force:true}); mkdirSync(r+"/final",{recursive:true});
  writeFileSync(`${r}/final/${base}`,"# Base\n"); writeFileSync(`${r}/final/final_v1.md`,"# Rev1\n");
  if (rev2) writeFileSync(`${r}/final/final_v2.md`,"# Rev2\n"); };
mk("/tmp/m1","final.md"); const i1 = readFinalReportInventory("/tmp/m1");
const w = { final_inventory_sha256: i1.primary_sha256, final_inventory_basis: "primary_series" };
mk("/tmp/m2","final.md",true); const i2 = readFinalReportInventory("/tmp/m2");
console.log(JSON.stringify(proveNewerFinalAppend(i2, w)));   // 修复前 {"matched":false,...}
'
```

真实 bundle 复现（修复前）：

```bash
node DEEP_RESEARCH_HARNESS/cli/operate-post-final-recovery.mjs inspect \
  --bundle dpt_rb_chinese-ai-inference-chips-vs-nvidia
# → verdict: blocked / reason_code: accepted_lineage_drift /
#   reason: newer Final inventory is neither the accepted prior inventory nor a proven immutable canonical append
```

## 相关上下文 / 接手信息

- **本 bundle 的 final/ 已做的事实恢复（不是修复本 bug，是修复另一层 drift）**：2026-08-26 曾把
  `final/` 目录按「版本独立」约定重组（`final/chips/` → `final_v1/`、改写 `final.md`/`final_v1.md` 引用、
  删除 publisher 提交的 `final_v3.md`、手写 `final_v2.md`），导致 C5 绑定摘要对不上。本 Agent 已从
  `_scripts/staging/final-report.md`（原始 publish source，mtime 2026-08-25T20:48:31Z，会话记录证实
  publish 用它）把字节写回 `final/final.md`/`final/final_v1.md`，验证 `digest({final.md, final_v1.md})`
  精确等于 C5 绑定 `37ab2175…`。备份：`dpt_rb_chinese-ai-inference-chips-vs-nvidia/_scripts/restore-backup-20260827-015236/`。
  此层已修复；**当前唯一剩余阻塞就是本 bug（顺序不一致）**。
- 副作用提示：恢复后的 `final_v1.md`/`final.md` 内引用 `final/chips/`（原档案目录名），而档案现位于
  `final/final_v1/`——接手/继续交付时需注意该历史引用（不可再改字节，否则 digest 又漂移；可考虑在
  `final/` 重建 `chips/` 兼容目录或接受历史引用悬空并在 README 说明）。
- 相关既有 bug：**BUG-236**（`2026-08-19`，「C5 事件改绑 primary-series digest，第二次 rerun 不再被
  non-primary 漂移永久阻塞」，`final_inventory_basis: primary_series`）——本 bug 是**该绑定语义的另一半**
  未被证明路径对齐；**BUG-241**（同 bundle，`supersededBy` 吞回入 pass 导致 descendant 断链，已修）——
  本 bug 是 BUG-241 修复后暴露的下一层。
- non-goal：不要求改动 bundle 内容、C5 事件或历史 final 字节；修复面只在 Harness 的 digest 规范顺序
  一致性（`handoff-helpers.mjs` + `final-report-series.mjs` 或单一 helper）+ 现代 series 回归测试。
- 接手时先跑「最小可复现」脚本确认 current-head 仍复现，再定 OpenSpec change 边界（参考
  `_backlog/bugs/README.md` 的「活态重验约定」）。
