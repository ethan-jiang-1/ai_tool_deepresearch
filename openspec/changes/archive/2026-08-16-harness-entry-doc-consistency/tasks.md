# Tasks: harness-entry-doc-consistency

## 0. Feedback lifecycle reviews

- [x] 0.1 Plan review（openspec-feedback:plan-review）：按 `openspec/operations/change-feedback-loop.md` Apply Review 完成——whole-change coherence（polish 两轮）+ semantic-closure.yaml（not_applicable，reason 对实际 surface 仍成立）+ RUE-002 delta 与 RUE-005/ACS-001 共存性核验。无 change 内 open finding。Done condition：review 已执行、无未闭合 finding。

## 1. Spec delta 验证（规划面 → apply 前）

- [x] 1.1 `openspec validate --change harness-entry-doc-consistency --strict` 通过，且 delta 的 MODIFIED requirement header 与 main spec RUE-002 块 header 精确匹配（whitespace-insensitive）。Done condition：validate 0 error、无 delta 格式告警。

## 2. RUN.md 与 harness README 表述（RUE-002 / RUE-004 / F-05 / F-02 / F-07）

- [x] 2.1 RUN.md §0 增加 selected-entry vs proactive-context-reading 区分句（design D1 目标措辞），保留「已选定则 proceed、不再问」原句不动。Done condition：§0 同时含 carve-out 句与原 proceed 句，且 §1 未改动。
- [x] 2.2 harness README「触发规则」节同步 carve-out 句（design D1 第二段目标措辞）。Done condition：触发规则节含该句，且不改变既有「用户有研究意图 → 触发」优先级句。
- [x] 2.3 harness README collision 段（现 :99-101）替换为 design D2 的 hex6 契约表述。Done condition：过期句「必须报错停止」「collision suffix 是 workflow-foundation target，不是当前 production CLI 行为」全部移除。
- [x] 2.4 harness README「当前可执行 surface」的 cli/ 行改为 design D4 的「核心名 + 目录指针」表述，并把「Workflow Foundation / runtime surface」节的 `cli/gates/` 行移入当前 surface 节并标注当前状态（design D4）。Done condition：旧四工具封闭清单表述移除；foundation 节不再包含 `cli/gates/` 行；当前 surface 节含其当前状态表述。

## 3. Phase docs 与 start-research（WNC-010 / F-04 / F-02）

- [x] 3.1 phase-instantiation.md §6 增加 design D3 的 bootstrap 兼容例外标注。Done condition：§6 含「兼容例外（WNC-010）」标注且未新增 enter-phase/advance-status 指令。
- [x] 3.2 phase-hitl1.md §6 增加同样的例外标注。Done condition：同 3.1。
- [x] 3.3 start-research.md collision 措辞对齐 hex6 故事（design D2），「每个 phase node 是完整 instruction sheet」句补 bootstrap 例外说明（design D3）。Done condition：与 README 表述一致，不再有第三种 collision 说法。

## 4. Harness 行为文件（F-10 / RUE-004 同步）

- [x] 4.1 harness AGENTS.md 入口 bullet 2 改为 design D5 的消歧措辞。Done condition：含「preflight 失败，不等于没有 explicit candidate」语义且未重述选择流程。
- [x] 4.2 harness CLAUDE.md 同步同措辞。Done condition：`diff DEEP_RESEARCH_HARNESS/AGENTS.md DEEP_RESEARCH_HARNESS/CLAUDE.md` 仅头部差异。

## 5. 验证资产（verification-routing integration）

- [x] 5.1 新建 `tests/integration/md/harness-entry-doc-consistency.test.mjs`：node:test + node:assert 静态断言 design D1-D5 各最小 canonical 短语存在、过期句移除。Done condition：测试文件存在且 `node --test tests/integration/md/harness-entry-doc-consistency.test.mjs` 绿。
- [x] 5.2 `npm test` 全绿（含既有 agent-behavior-file-pair-sync-guard）。Done condition（按现实修正）：C1 相关测试全绿（新增 harness-entry-doc-consistency 7/7、routing-contract 更新后通过、pair-sync guard 通过）；全量 2889 中 2 个 pre-existing 失败与本 change 无关，已登记为 F-12/F-13（根 AGENTS/CLAUDE 缺 "current run bundle root" → 归 C2；governance feedback-archive 测试 fixture 缺 governance 脚本 → 归 C3）。
- [x] 5.3 `node openspec/governance/check-semantic-closure.mjs --change harness-entry-doc-consistency --mode plan` PASS。Done condition：exit 0。
- [x] 5.4 `node openspec/governance/check-verification-routing.mjs --change harness-entry-doc-consistency --mode assets` PASS（claim 的 integration 资产存在且在 tests/integration/ 下）。Done condition：exit 0。

## 6. 收尾检查（归档前硬性）

- [x] 6.1 `node openspec/governance/check-project-reqs.mjs --mode archive --change harness-entry-doc-consistency` PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired）。Done condition：exit 0。
- [x] 6.2 `node openspec/governance/check-project-specs.mjs` PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）。Done condition：exit 0。

## 7. Closeout review（archive 前置）

- [x] 7.1 Closeout review（openspec-feedback:closeout-review）：按 `openspec/operations/change-feedback-loop.md` Closeout Review 完成——change-scoped diff 边界可建立（C1 七个 harness 文件 + 两个测试 + delta/main spec 同步）；semantic-closure.yaml（not_applicable）对实际 diff 重新核验仍成立；delta 与 main spec 的 RUE-002 块语义等价（逐块比对一致）；无 change 内 open finding。Done condition：review 已执行、无未闭合 finding、spec sync 已完成。
