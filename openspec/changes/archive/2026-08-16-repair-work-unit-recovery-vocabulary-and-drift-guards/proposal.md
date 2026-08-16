# Proposal: repair-work-unit-recovery-vocabulary-and-drift-guards

## Why

承接 `_backlog/plans/agent-guidance-conflict-drift-findings.md` 的 F-03（engine 面）、F-08（checker）、F-11（防漂移机制）、F-13（治理测试基建）。核验发现：accepted spec CHI-004（`check-inspect-feedback/spec.md:206-224`）要求「RUN.md 决策表每个 engine 可发射的 attempt-owned recovery repair_kind 一行 + 确定性回归锁定」，但 engine 实际发射 10 个值、RUN.md 表只有 5 行、锁定测试用人工枚举 5 值——**实现违反 accepted spec**；同时 F-11 的五类防漂移盲区（断指针、surface 清单、phase 结构、req-ID 三角映射）无任何 checker，F-13 的 finalizer 隔离 fixture 缺 `check-content-drift.mjs` 导致既有集成测试失败。本 change 修词汇契约闭环 + 补 4 类治理 checker 并接入 finalizer + 修 fixture。

## What Changes

- 新增 `DEEP_RESEARCH_HARNESS/engine/work-unit-repair-vocabulary.mjs`：attempt-owned recovery `repair_kind` 词汇的单一 engine-owned 导出（10 值 + CLI 动词映射，含显式 no-verb 边界）。
- 四个发射模块（`work-unit-transaction.mjs` / `work-unit-supersession.mjs` / `work-unit-submit-integrity.mjs` / `work-unit-attempt-disposition.mjs`）改用导出常量替代裸字符串字面量（行为不变，发射值不变）。
- `DEEP_RESEARCH_HARNESS/RUN.md` 决策表从 5 行扩展为 10 行（补 `wait_for_delegated_candidate` / `author_exact_fallback_attempt` / `semantic_boundary` / `claim_successor` / `inspect_current_lineage_leaf`）。
- `tests/engine/work-unit-recovery-decision-table.test.mjs` 改为从词汇模块**派生**行集（不再人工枚举），并断言四个发射模块无裸字面量、无下划线拼写。
- 新增 4 个治理 checker（`openspec/governance/`）：`check-guidance-pointer-targets.mjs`、`check-surface-inventory.mjs`、`check-phase-node-structure.mjs`、`check-spec-req-ids.mjs`，并接入 `finalize-change-archive.mjs` 检查序列。
- `tests/integration/governance/change-feedback-loop-archive.test.mjs`：fixture 拷贝清单补 `check-content-drift.mjs` 与 4 个新 checker，`FINALIZER_CHECKS` 期望列表同步（F-13）。
- spec delta：`engine/check-inspect-feedback` ADDED 词汇导出锁定 requirement；`governance/change-feedback-loop` MODIFIED finalizer 检查序列 requirement。

无 **BREAKING** 行为变更：engine 发射的 10 个值本身不变，只改它们的声明/锁定方式。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `engine/check-inspect-feedback`: ADDED「Engine-owned recovery vocabulary export locks the decision table」。
- `governance/change-feedback-loop`: MODIFIED「Governed archive finalization SHALL establish one mechanical closeout verdict」（检查序列加入 content-drift 与 4 个新 drift-guard 检查）。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `engine/check-inspect-feedback` | `openspec/specs/engine/check-inspect-feedback/spec.md:206-224`（CHI-004 决策表锁定要求） | Modify | 新增词汇单一源导出与派生锁定的 normative 要求 |
| `governance/change-feedback-loop` | `openspec/specs/governance/change-feedback-loop/spec.md:214-250`（finalizer 检查序列） | Modify | finalizer 检查序列加入 5 个新检查 |
| `agent/delegated-work-units` | `spec.md:1994-2002`（CHI-004 统一形状引用） | Verify-only | 统一 `attempt_disposition`+`next` 形状不变，只补词汇锁定 |
| `workflow/workflow-node-contract` | WNC-010（bootstrap 例外） | Verify-only | phase-structure checker 按既有 WNC-010 豁免表实现，不改 spec |
| `verification/verification-routing` | `openspec/specs/verification/verification-routing/spec.md:71-77` | Verify-only | 新测试按既有四类分类，无分类变更 |
| `bundle/run-entry` | 决策表归属 CHI-004 而非 run-entry（已核验） | Verify-only | RUN.md 表扩展是实现 CHI-004 既有要求，不改 run-entry |
| `research/post-final-recovery` | 未触及 | Excluded | 不涉及 post-final 行为 |
| `engine/runtime-reentry-debuggability` | 未触及 | Excluded | 不涉及 reentry 行为 |

## Impact

- 修改/新增文件：`DEEP_RESEARCH_HARNESS/engine/work-unit-repair-vocabulary.mjs`（新）、四个发射模块、`DEEP_RESEARCH_HARNESS/RUN.md`、`tests/engine/work-unit-recovery-decision-table.test.mjs`、`tests/engine/work-unit-repair-vocabulary.test.mjs`（新）、`openspec/governance/` 4 个新 checker + `finalize-change-archive.mjs`、`tests/governance/drift-guard-checkers.test.mjs`（新）、`tests/integration/governance/change-feedback-loop-archive.test.mjs`、2 个 spec delta。
- 无依赖变更；engine 发射值集合不变。

## 简化与责任边界

- **Direct Source of Record**：attempt-owned recovery `repair_kind` 词汇的单一源 = 新词汇模块；决策表与锁定测试都从它派生，消除「表声称完备但人工枚举」的双源漂移。
- **Net simplification**：人工枚举词汇表（测试内 5 值 + RUN.md 5 行 + engine 10 值三处漂移）收敛为单一导出 + 派生断言；4 类 checker 把 F-01/03/04/07/08 的防漂移责任机器化。新增复杂度与消除的漂移面成正比。
- **Semantic-precision reflection**：不新增 state/概念；只给既有 10 值词汇一个引擎级单一源。读者（执行 Agent）的有界问题：「这个 repair_kind 的下一步是什么」；必须保留的区别：attempt-owned recovery 词汇 vs gate-hint/其他面词汇（`agent_action` 等不受本 change 影响，CHI-004 既有保护句不变）；正常推理停止点：查 RUN.md 决策表行 → CLI 动词或显式边界。
- **责任边界**：Engine 只改字面量声明方式不改发射事实；Agent 语义工作不变；用户决定不变；finalizer 新增的 4 个检查是机械直接事实（存在性/一致性），不做语义裁决。
