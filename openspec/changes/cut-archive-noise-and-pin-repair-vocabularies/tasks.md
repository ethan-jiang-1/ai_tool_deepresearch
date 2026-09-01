# Tasks: cut-archive-noise-and-pin-repair-vocabularies

- [ ] 0.1 openspec-feedback:plan-review —— delta specs（ACR-005/006、FIO-008、RET-012）与 design 复核：三个词汇不合并、不改枚举值域、archive 路径不动；`openspec validate --strict` 绿；`node openspec/governance/check-semantic-closure.mjs --change <change> --mode plan` 与 `check-verification-routing.mjs --change <change> --mode plan` PASS。已知预期中间态：`check-project-reqs.mjs --mode plan` 报 ACR-005/006、RET-012 unregistered——live prefix 追加新 ID 无 reservation 路径，修复边界是任务 5.1 的 registry 同步，不得改用 reservation 文件（live prefix 会报 neither-pending-nor-transitioned）。
- [ ] 0.2 openspec-feedback:closeout-review —— archive 前置复核：全量 `npm test` 0 fail、`node openspec/governance/check-all.mjs` 全 PASS、semantic-closure record 与实际 target edits 一致、无未登记 finding。

## 1. 词汇闭集提取与 checker 注册（FIO-008）

- [ ] 1.1 读 `openspec/governance/check-spec-enum-restatements.mjs` 确认注册模式与扫描面；在 `DEEP_RESEARCH_HARNESS/engine/helpers/file-observability.mjs` 提取 `export const FILE_REPAIR_DIRECTIVES = Object.freeze([...])`（六值：materialize_canonical_surface / reconcile_topic_identity / repair_topic_reference / classify_namespace / current_entry_contract / exact_topic_state_recover），六个发射点（约 L559/599/619/635/692/714）改引用导出。Done：纯等价重构，`node --test tests/engine/`（file-observability 相关文件）全绿，发射输出字节不变。
- [ ] 1.2 `check-spec-enum-restatements.mjs` 注册 `{ id: 'FILE_REPAIR_DIRECTIVES', values: FILE_REPAIR_DIRECTIVES, pins: ['materialize_canonical_surface', 'current_entry_contract'] }`（实现为 `// @impl FIO-008`）。Done：checker PASS；手工把 FIO-008 修改文本中任一值改错可使其变红（临时验证后还原）。
- [ ] 1.3 盘点并同步引用六值字面量的既有测试（`grep -rn "materialize_canonical_surface\|current_entry_contract" tests/ | grep -v .test-bundles`），断言改为引用导出或保持字面量但断言与导出一致。Done：相关测试全绿。

## 2. archive 指令边界（ACR-006）

- [ ] 2.1 `node scripts/list-doc-locks.mjs AGENTS.md` 与 `list-doc-locks.mjs README.md` 盘点；根 `AGENTS.md` 与根 `README.md` 的 Do-Not-Read 清单各加一行：`openspec/changes/archive/` = historical record，仅用户显式要求 archive/history 时打开，其下命中不构成 task context/authority。同步更新受影响锁测试。Done：两文件均含该行，`node --test tests/engine/static-regression.test.mjs`（及锁盘点列出的其余测试）全绿。
- [ ] 2.2 扩展 focused routing regression：断言两份根入口文档均含 `openspec/changes/archive/` Do-Not-Read 边界，缺失即红。Done：删行→红，恢复→绿（临时验证后还原）。`// @impl ACR-006`

## 3. glossary 分诊行（ACR-005）

- [ ] 3.1 `node scripts/list-doc-locks.mjs CONTEXT.md` 盘点（已知 `change-feedback-finalizer.test.mjs` L271、`change-feedback-loop-archive.test.mjs` L105 exact 引用）；根 `CONTEXT.md` 罗塞塔表前加「字段名分诊」头行：`repair_kind` → 门禁面/Who（枚举源 `gate-definition.mjs GATE_REPAIR_KINDS`）；`next.recovery_action` → 恢复面/What to run（`work-unit-repair-vocabulary.mjs`）；`repair_directive` → file-observability 面/文件自愈（`file-observability.mjs`）；声明字段名不同是故意的、混用即 bug；不复制完整值集。同步受影响锁。Done：分诊行就位、链接可解析（content-drift PASS）、锁测试全绿。`// @impl ACR-005`

## 4. 词汇扩张关卡（RET-012）

- [ ] 4.1 评估关卡的可判定实现位置：优先在既有 governance 检查（如 `check-spec-enum-restatements.mjs` 或 registry 校验）中检测"新增闭合反馈字段名缺导出/注册/glossary 行"的可机械证据；若现有 checker 不宜承载，则由 `check-all.mjs` 聚合面新增最小检查（实现为 `// @impl RET-012`），红例：delta/代码出现新的闭合反馈字段名而无三件套。Done：检查可运行且聚合入口可见。
- [ ] 4.2 用本 change 自身做一次正例回归：三件套（FIO 导出、checker 注册、CONTEXT 行）齐备时关卡绿。Done：`node openspec/governance/check-all.mjs` 全 PASS。

## 5. Registry 同步与收尾

- [ ] 5.1 apply 阶段把 ACR-005/006、RET-012 写入 main specs（ACR spec header 扩为 ACR-001..006；RET 扩为 RET-001..012；FIO-008 文本同步 delta）并登记 `req-registry.yaml`。Done：`node openspec/governance/check-project-reqs.mjs --mode plan` 无 unregistered/orphan。
- [ ] 5.2 归档硬性收尾 1：`node openspec/governance/check-project-reqs.mjs --mode archive --change cut-archive-noise-and-pin-repair-vocabularies` PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired）。
- [ ] 5.3 归档硬性收尾 2：`node openspec/governance/check-project-specs.mjs` PASS（0 violations）；`npm test` 全量 0 fail；`node openspec/governance/check-all.mjs` 全 PASS。
