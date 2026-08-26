# Tasks: 统一 primary-series 追加证明的规范摘要顺序（BUG-246）

> 实现 `specs/research/post-final-recovery/spec.md` 的 MODIFIED POF-001 段落（append proof
> 与绑定 digest 共享同一规范顺序），按 `design.md` 的 D1/D2/D3 落地。

## 1. Engine 修复

- [x] 1.1 POF-001: `final-report-series.mjs` 的 `digestFinalReportInventoryEntries` 补充显式注释，声明「按传入顺序原样 digest，不排序；调用方负责规范顺序」，不改其行为（D2）
- [x] 1.2 POF-001: `handoff-helpers.mjs` 的 `proveNewerFinalAppend` 在 primary-series basis 下改用 `digestFinalReportPrimarySeriesEntries(retained, inventory.primary_series)` 计算 retained digest，与绑定路径共享同一「过滤 + localeCompare 排序 + digest」规范顺序；whole-tree basis 保持 `digestFinalReportInventoryEntries(retained)` 不变（D1）

## 2. 回归测试

- [x] 2.1 POF-001: `tests/engine/helpers/handoff-final-append-proof.test.mjs` 的 `buildBundle` 增加 `modern` 选项（`final.md` base + `final_vN.md` revisions），并新增 primary-series basis 下 modern base + 1 revision 追加 → `matched:true` 且 `removed_targets:['final/final_v1.md']` 用例
- [x] 2.2 POF-001: 新增 modern base + 2 revisions 追加用例（bound 时 base+v1，交付时 +v2）→ `matched:true` 且 `removed_targets:['final/final_v2.md']`、`current_target:'final/final_v2.md'`（对应 BUG-246 验收 `{"matched":true,"removed_targets":["final/final_v2.md"],"current_target":"final/final_v2.md"}`）
- [x] 2.3 POF-001: 新增 modern series 内容篡改负例（base 字节被改）→ `matched:false`，证明排序修复未放宽字节校验
- [x] 2.4 在 `tests/integration/cli/post-final-recovery.test.mjs` 增加 modern-series 变体：`createTerminalFinalBundle`/`driveNewerFinalCycle` 以 `final.md` 为 base（现代 series），commit C5 → 完整 rerun cycle → 发布 newer `final_vN.md` → 再次 `inspect` 不得返回 `accepted_lineage_drift`/`newer_final_inventory_drift`（现有同名用例只覆盖 legacy `report.md` base）
- [x] 2.5 运行 focused 测试确认：`node --test tests/engine/helpers/handoff-final-append-proof.test.mjs` 与 `node --test tests/integration/cli/post-final-recovery.test.mjs` 全绿，既有 legacy 用例（whole-tree / structural fallback）无回归

## 3. 验证

- [x] 3.1 运行 BUG-246「最小可复现」脚本（`final.md` base + `final_v1.md`/`final_v2.md`），确认修复后 MODERN 输出 `{"matched":true,"removed_targets":["final/final_v2.md"],"current_target":"final/final_v2.md"}`
- [x] 3.2 运行 `node --test tests/engine/helpers/final-report-series.test.mjs`（若存在）及 `node --test tests/engine/helpers/` 相关文件，确认无 digest 相关回归
- [x] 3.3 全量 `node --test` 通过（无新增 fail；2860 pass，4 fail 均为 pre-existing 无关路径——`_backlog/_done/_old_topics/_original_dpt_v12/` 旧归档 3 项 + `scripts/test-shard.mjs` 被 `node --test` 收集为测试，stash baseline 验证同样失败）

## 4. 收尾检查（归档前硬性 done condition）

- [x] 4.1 运行 `node openspec/governance/check-project-reqs.mjs --mode archive --change 2026-08-27-fix-final-append-proof-primary-series-order` 必须 PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired）
- [x] 4.2 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）
- [x] 4.3 openspec-feedback:plan-review — reviewed whole-change coherence before target edits: proposal ↔ delta spec (MODIFIED POF-001) ↔ design (D1/D2/D3) ↔ tasks ↔ verification-plan consistent; the fix reuses the existing `digestFinalReportPrimarySeriesEntries` helper (single canonical order, filter + localeCompare sort + digest) and does not add a state/projection/command or widen authority; `digestFinalReportInventoryEntries` no-sort semantics documented for the legacy whole-tree path; semantic-closure `final.primary-report-series` record covers the changed surfaces (binding vs proof digest order) with resolver `#digestFinalReportPrimarySeriesEntries`, consumers limited to verdict consumers (`inspectNewerFinalStage`, operate-post-final-recovery CLI), overlap derived from POF-001; no open findings.
- [x] 4.4 openspec-feedback:closeout-review — reviewed the change-scoped diff (`handoff-helpers.mjs` `proveNewerFinalAppend` retained-digest branch, `final-report-series.mjs` comment, `handoff-final-append-proof.test.mjs` 3 new modern-series cases, `post-final-recovery-fixture.mjs` `modernBase` option, `post-final-recovery.test.mjs` modern-series second-rerun variant), semantic-closure record vs implemented surfaces (fragments are real symbols in the revised files: exported `digestFinalReportPrimarySeriesEntries`, exported `proveNewerFinalAppend`, and module-internal `inspectNewerFinalStage`), delta/main sync re-comparison (canonical-order paragraph + modern-series scenario now in main spec), and verification evidence (focused 24/24 + 49/49 + full `node --test` 2860 pass with only 4 pre-existing unrelated failures verified via stash baseline); no open findings.
