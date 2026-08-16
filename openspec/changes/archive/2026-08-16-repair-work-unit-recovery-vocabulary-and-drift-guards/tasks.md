# Tasks: repair-work-unit-recovery-vocabulary-and-drift-guards

## 0. Feedback lifecycle reviews

- [x] 0.1 Plan review（openspec-feedback:plan-review）：按 `openspec/operations/change-feedback-loop.md` Apply Review 完成——whole-change coherence（本 tasks 与 design/specs 同轮校验）+ semantic-closure.yaml（not_applicable，reason 对实际 surface 成立）+ CHI-004/CHF 原文逐段核对。无 change 内 open finding。Done condition：review 已执行、无未闭合 finding。

## 1. Spec delta（CHI ADDED + CHF MODIFIED）

- [x] 1.1 `openspec validate --change repair-work-unit-recovery-vocabulary-and-drift-guards --strict` 通过，两个 delta 的 requirement header 与 main spec 精确匹配。Done condition：validate 0 error。

## 2. 词汇单一源 + 发射点常量化（D1/D3）

- [x] 2.1 新建 `DEEP_RESEARCH_HARNESS/engine/work-unit-repair-vocabulary.mjs`（design D1 形状）。Done condition：文件存在且 export 三件套（KIND map / KINDS 数组 / CLI_VERB map）。
- [x] 2.2 四个发射模块的 `repair_kind: '<literal>'` 与 supersession `'semantic_boundary'` 实参改为常量引用；`grep -n "repair_kind: '"` 四模块归零；`work-unit-validation.mjs` 的 `agent_action` 与 queue-location 字符串不动。Done condition：grep 归零，全量 engine 相关测试通过。
- [x] 2.3 新建 `tests/engine/work-unit-repair-vocabulary.test.mjs`：断言 10 值集合、verb map 键完整、无下划线值。Done condition：`node --test tests/engine/work-unit-repair-vocabulary.test.mjs` 绿。

## 3. RUN.md 决策表补全（D2）

- [x] 3.1 RUN.md 决策表追加 5 行（design D2 措辞），说明句改「行集从 vocabulary 模块派生」。Done condition：表含 10 行且 5 个新值各有一行；CHI-004 表完备语义满足。

## 4. 锁定测试派生化（D4）

- [x] 4.1 `tests/engine/work-unit-recovery-decision-table.test.mjs` 改从词汇模块 import 行集与 verb map，删人工数组；新增四模块无裸字面量断言。Done condition：`node --test tests/engine/work-unit-recovery-decision-table.test.mjs` 绿。

## 5. 4 个 drift-guard checker（D5）

- [x] 5.1 新建 `openspec/governance/check-guidance-pointer-targets.mjs`。Done condition：对当前树 exit 0。
- [x] 5.2 新建 `openspec/governance/check-surface-inventory.mjs`。Done condition：对当前树 exit 0。
- [x] 5.3 新建 `openspec/governance/check-phase-node-structure.mjs`。Done condition：对当前树 exit 0。
- [x] 5.4 新建 `openspec/governance/check-spec-req-ids.mjs`。Done condition：对当前树 exit 0。

## 6. finalizer 接线（D6）

- [x] 6.1 `finalize-change-archive.mjs`：RootCodeSchema += 4 个 code；content_drift 后依次插入 4 个 checker 步骤（传 planningRoot）。Done condition：4 个 checker 名出现在 finalizer 输出 checks 序列。

## 7. F-13 fixture 修复（D7）

- [x] 7.1 `tests/integration/governance/change-feedback-loop-archive.test.mjs`：`copyGovernanceClosure` += `check-content-drift.mjs` + 4 个新 checker；`FINALIZER_CHECKS` += `content_drift` + 4 个新名。Done condition：`node --test tests/integration/governance/change-feedback-loop-archive.test.mjs` 绿。

## 8. checker 单元测试（verification-plan unit claim 2）

- [x] 8.1 新建 `tests/governance/drift-guard-checkers.test.mjs`：4 个 checker 各覆盖 pass 与 fail fixture 场景。Done condition：`node --test tests/governance/drift-guard-checkers.test.mjs` 绿。

## 9. 全量验证

- [x] 9.1 `npm test` 全量 0 fail。Done condition：exit 0、0 fail。
- [x] 9.2 `node openspec/governance/check-semantic-closure.mjs --change repair-work-unit-recovery-vocabulary-and-drift-guards --mode plan` PASS。
- [x] 9.3 `node openspec/governance/check-verification-routing.mjs --change repair-work-unit-recovery-vocabulary-and-drift-guards --mode assets` PASS。

## 10. 收尾检查（归档前硬性）

- [x] 10.1 `node openspec/governance/check-project-reqs.mjs --mode archive --change repair-work-unit-recovery-vocabulary-and-drift-guards` PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired）。
- [x] 10.2 `node openspec/governance/check-project-specs.mjs` PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）。

## 11. Closeout review（archive 前置）

- [x] 11.1 Closeout review（openspec-feedback:closeout-review）：按 `openspec/operations/change-feedback-loop.md` Closeout Review 完成——change-scoped diff 边界可建立；semantic-closure.yaml（not_applicable）对实际 diff 重新核验；CHI ADDED/CHF MODIFIED 与 main spec 语义等价（spec sync 后逐块比对）；无 change 内 open finding。Done condition：review 已执行、无未闭合 finding、spec sync 已完成。
