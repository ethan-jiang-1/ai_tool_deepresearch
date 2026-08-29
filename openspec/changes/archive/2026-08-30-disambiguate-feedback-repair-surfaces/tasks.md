## 1. 计划审查与语义闭环

- [x] 1.1 openspec-feedback:plan-review — 审查本 Change 的 proposal、design、tasks 及 verification-plan，确认字段精准拆分方案自洽，且无需引入新 requirement ID。

## 2. 底层 Schema 与数据定义层重构 (Engine Schemas & Vocab)

- [x] 2.1 更新 `DEEP_RESEARCH_HARNESS/engine/work-unit-repair-vocabulary.mjs` 与 `work-unit-attempt-disposition.mjs`，将导出常量与字段从 `repair_kind` 重命名为 `recovery_action`。
- [x] 2.2 更新 `DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-*.mjs` 与 `wave-contract-findings.mjs`，将门禁 hint 字段重命名为 `resolution_owner`。

## 3. 规范层与控制面文档更新 (Specs & Control Surfaces)

- [x] 3.1 更新 `openspec/specs/engine/check-inspect-feedback/spec.md` 与 `openspec/specs/agent/delegated-work-units/spec.md` 中的字段描述。
- [x] 3.2 更新 `DEEP_RESEARCH_HARNESS/RUN.md` 中的恢复决策表与字段解释。
- [x] 3.3 更新 `DEEP_RESEARCH_HARNESS/COMMANDS.md`、`cli/README.md` 及相关 playbook 中的恢复字段。

## 4. 引导文档瘦身与正典更新 (Docs & Guidance Cleanup)

- [x] 4.1 更新 `CONTEXT.md` 与 `invariants-brief.md`，删除关于同名冲突的防御性罗塞塔石碑警告，替换为清爽的独立字段定义。

## 5. 测试套件与回归断言同步 (Tests & Verification)

- [x] 5.1 更新 `tests/engine/work-unit-recovery-decision-table.test.mjs`、`work-unit-repair-vocabulary.test.mjs`。
- [x] 5.2 更新集成测试中的相关断言（如 `guidance-terminology-pointer-consistency.test.mjs`）。
- [x] 5.3 运行 `npm run governance:check` 和 `npm test`，确保全量测试 100% 通过。

## 6. 收尾审查与归档前检查

- [x] 6.1 openspec-feedback:closeout-review — 审阅完整变更 diff，确认全系统再无 `repair_kind` 跨层混用。
- [x] 6.2 运行 `node openspec/governance/check-project-reqs.mjs --mode archive --change disambiguate-feedback-repair-surfaces` 必须 PASS。
- [x] 6.3 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS。
