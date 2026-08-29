## 1. 计划审查与语义闭环

- [x] 1.1 openspec-feedback:plan-review — 审查本 Change 的 proposal、design、tasks 及 verification-plan，确认 C1~C5 具名化映射关系完备，且无需引入新 requirement ID。

## 2. 词汇正典与引导层重构 (Guidance & Vocabulary)

- [x] 2.1 更新 `CONTEXT.md` 与 `invariants-brief.md`，彻底移除 C1~C5 代号，全面使用 `StateHealthCheck`、`ResearchConfigLock`、`TopicTreeEvolution`、`WorkerFallback`、`ReopenResearchPass`。

## 3. 核心规范层更新 (OpenSpec Specs)

- [x] 3.1 更新 `openspec/specs/research/research-styles/spec.md` 中的 `C2` 为 `ResearchConfigLock` (Style Freshness Checkpoint)。
- [x] 3.2 更新 `openspec/specs/research/canonical-topic-state/spec.md` 中的 `C1/C3/C3A/C3B/C5` 为具名领域术语。
- [x] 3.3 更新 `openspec/specs/research/post-final-recovery/spec.md` 与 `content-delivery-phase-content/spec.md` 中的 `C3/C5` 为 `TopicTreeEvolution` 与 `ReopenResearchPass`。
- [x] 3.4 更新 `openspec/specs/engine/` 与 `openspec/specs/bundle/` 中涉及 `C1/C3/C5` 的 main spec 文本（`cli-phase-transition`、`runtime-reentry-debuggability`、`agent-command-surface`、`run-entry`）。

## 4. 框架控制面与工作流指引更新 (Harness & Playbooks)

- [x] 4.1 更新 `DEEP_RESEARCH_HARNESS/RUN.md`、`COMMANDS.md`、`README.md` 中的重入与恢复表述。
- [x] 4.2 更新 `workflows/nodes/phases/phase-final.md`、`phase-rerun.md` 以及 `workflows/nodes/shared/` 共享规则文件。
- [x] 4.3 更新 `command_playbook/` 下的相关文档（`post-final-recovery.md`、`operate-topic-state.md`、`continue-run-bundle.md` 等）。

## 5. 引擎诊断信息与错误原因更新 (Engine Diagnostics)

- [x] 5.1 更新 `DEEP_RESEARCH_HARNESS/engine/helpers/handoff-helpers.mjs`、`canonical-topic-state.mjs` 等模块中面向 Agent 抛出的 `reason` 诊断字符串。

## 6. 测试断言与回归锁同步 (Tests & Verification)

- [x] 6.1 更新 `tests/integration/md/guidance-terminology-pointer-consistency.test.mjs`、`repair-directive-lock.test.mjs` 等集成测试中的字符串断言。
- [x] 6.2 同步 `tests/e2e/` 与 `tests/engine/` 中涉及历史代号的测试套件描述。
- [x] 6.3 运行 `npm run governance:check` 和 `npm test`，确保全量测试 100% 通过。

## 7. 收尾审查与归档前检查

- [x] 7.1 openspec-feedback:closeout-review — 审阅完整变更 diff，确认全仓库活跃代码/规范/引导面中无任何 `C1`~`C5` 代号残留。
- [x] 7.2 运行 `node openspec/governance/check-project-reqs.mjs --mode archive --change retire-legacy-c-series-codes-to-domain-names` 必须 PASS。
- [x] 7.3 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS。
