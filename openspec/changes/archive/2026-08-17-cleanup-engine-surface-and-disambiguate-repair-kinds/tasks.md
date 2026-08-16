# Tasks: cleanup-engine-surface-and-disambiguate-repair-kinds

## 0. Feedback lifecycle reviews

- [x] 0.1 Plan review（openspec-feedback:plan-review）：按 `openspec/operations/change-feedback-loop.md` Apply Review 完成——whole-change coherence + semantic-closure.yaml（not_applicable，reason 对实际 surface 仍成立）+ FIO-008 delta 与 main spec 对应 + Capability Discovery 证据一致。无 change 内 open finding。Done condition：review 已执行、无未闭合 finding。
- [x] 0.2 Polish gate（polish-openspec-change ≥2 passes）：`openspec validate "cleanup-engine-surface-and-disambiguate-repair-kinds" --strict` + `git diff --check` clean。Done condition：polish 报告 `ready for apply`。

## 1. Spec delta 验证

- [x] 1.1 `openspec validate "cleanup-engine-surface-and-disambiguate-repair-kinds" --strict` 通过，FIO-008 ADDED requirement 格式正确。Done condition：validate 0 error。

## 2. 死代码 retire（F-09）

- [x] 2.1 删除 `engine/esm-dirname.mjs` 与 `tests/engine/esm-dirname.test.mjs`。Done condition：文件不存在、全仓无 import。
- [x] 2.2 移除死导出：`queue-manager-core.mjs` `advice()`、`queue-manager-lifecycle.mjs` `makeItem`、`queue-manager-window.mjs` `rank()`、`queue-manager-ledger.mjs` `OutputDeclarationLedgerRecord`；`work-unit-repair-vocabulary.mjs` 双导出头注释标注「测试锁定专用」。Done condition：grep 全仓（含 tests/）零 import（测试锁定导出除外）。

## 3. 真相源收敛（F-10/F-11）

- [x] 3.1 `queue-manager-core.mjs` 本地 enum 改 import `schema/enums.mjs`；`QueueStateSchema` 加差异注释。Done condition：本地无 enum 字面量重复、`node --test tests/engine/queue-manager*.test.mjs tests/schema/**` 绿。
- [x] 3.2 `submitRerun` 去重（owner `work-unit-attempt-disposition.mjs`，`work-unit-submit-integrity.mjs` import）。Done condition：全仓仅一份实现。
- [x] 3.3 CLI 路径 29 处收敛到常量表。Done condition：grep 硬编码字符串零命中（除常量定义处）。

## 4. 导航契约（F-20/F-21，纯注释）

- [x] 4.1 14 个 god modules 加文件头契约注释 + section banner。Done condition：每个文件头部含「职责 + 公共 API 位置」注释。
- [x] 4.2 四投影模块 + `work-unit-assignment-contract.mjs` 加「输入→输出→谁消费」头注释。Done condition：各文件头含该句。

## 5. repair_directive 改名（F-22）

- [x] 5.1 `engine/helpers/file-observability.mjs` 发射字段 `repair_kind` → `repair_directive`（6 值不变）；`cli/check-reentry.mjs:626` 消费点同步；`tests/engine/helpers/file-observability.test.mjs:469` 断言同步。Done condition：emitter/consumer/测试 无 file-observability `repair_kind` 字面量。
- [x] 5.2 `CONTEXT.md:59` file-observability 面枚举改为 `repair_directive`；`:58` work-unit 面指针补 `work-unit-repair-vocabulary.mjs`。Done condition：两处文本与 design D6/D7 一致。

## 6. 验证资产（verification-routing integration）

- [x] 6.1 新建 `tests/engine/dead-export-regression.test.mjs`（design D1）。Done condition：`node --test` 绿。
- [x] 6.2 新建 `tests/integration/md/repair-directive-lock.test.mjs`（design D6/D7，覆盖 FIO-008 + CONTEXT 指针）。Done condition：绿。
- [x] 6.3 `npm test` 全量绿（基线 2951 只增不减）。Done condition：0 fail。
- [x] 6.4 `check-semantic-closure --mode plan` + `check-verification-routing --mode plan` PASS。Done condition：均 exit 0。

## 7. Delta → 主 spec 同步 + registry

- [x] 7.1 主 spec sync：FIO-008 同步到 `bundle/file-observability` 主 spec；`> req:` 头更新为 FIO-001..FIO-008。Done condition：sync 完成、main spec 含 FIO-008。
- [x] 7.2 `req-registry.yaml` 注册 FIO-008。Done condition：注册行存在。

## 8. 收尾检查（归档前硬性）

- [x] 8.1 `check-project-reqs.mjs --mode archive --change cleanup-engine-surface-and-disambiguate-repair-kinds` PASS。Done condition：exit 0。
- [x] 8.2 `check-project-specs.mjs` PASS。Done condition：exit 0。

## 9. Closeout review（archive 前置）

- [x] 9.1 Closeout review（openspec-feedback:closeout-review）：change-scoped diff 边界可建立；semantic-closure not_applicable 对实际 diff 仍成立；FIO-008 delta 与 main spec 语义等价；无 change 内 open finding。Done condition：review 已执行、无未闭合 finding、spec sync 已完成。
