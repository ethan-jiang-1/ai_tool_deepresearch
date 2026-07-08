## Why

FOSE Europe Engelberg 2026 run bundle 显示 delegated waves 已经能跑出真实 evidence，但 Phase Agent 仍然把独立 work units 当串行任务、spawn 后被动等通知，并且没有把已提交 evidence 物化成用户可消费的 `reference/` 文件。结果是 wall-clock 被放大，Wave1/Wave2 的消费者阅读路径断裂，gate/provenance 语义也在 "delegated fetched evidence" 与 "Phase-owned reference projection" 之间混淆。

本 change 来源于 `_backlog/plans/fose-run-bugfix-batch-plan.md` 的 Change 2：`parallel-delegated-phase-execution-and-reference-materialization`，覆盖 `_backlog/bugs/BUG-046-wave0-serial-claim-no-parallelism.md`、`_backlog/bugs/BUG-062-phase-agent-passive-waiting-no-polling.md`、`_backlog/bugs/BUG-064-wave1-reference-files-not-produced.md`、`_backlog/bugs/BUG-065-wave2-cross-reference-files-never-produced.md`。Change 1 已经稳定 submit/handoff；现在可以把 Phase Agent 的 delegated execution loop 和 reference materialization responsibility 讲清并锁住。

## What Changes

- Wave0/Wave1 phase guidance 改为对独立 delegated demand 默认使用 bounded top-up claim：Phase Agent 计算并发上限和当前 in-flight 占用后显式调用 `operate-work-unit claim --count <free-capacity>`，不再把 `--count 1` 当正常策略。CLI 默认值不在本 change 中悄悄改变。
- Shared delegated protocol 和 silent execution guidance 增加 active polling loop：Phase Agent spawn background Sub-agents 后主动检查 work-unit result/receipt/output readiness，ready 就 submit，rejection 就 repair 或 terminalize，并能从 bundle truth 重建 in-flight work；不等待用户 "continue"、task-notification、unrelated background state。
- Wave1 reference materialization 改为 Phase-owned post-submit projection：Sub-agent 负责搜索/fetch、`evidence-summary.md`、`question-list.md`、`source_claims[]`、cache trails、result/receipt；Phase Agent 在 successful submit 后从已提交 source/cache/degraded-capture/ledger backing 写 `reference/{topic_slug}-<source-slug>.md` 和更新 `reference/_INDEX.md`，并在 reference body 中保留可扫描 backing refs。
- Wave2 pure synthesis path 对 accepted consumer-facing `W2F-xxx` finding 显式物化 `reference/00-cross-*.md`，但只允许基于已有已提交 Wave0/Wave1 evidence 的 concrete backing；不物化必须显式记录 process-only/internal/deferred/not-source-backed/not-consumer-facing reason。新外部 search/evidence 仍必须通过 `wave2_targeted_evidence` work-unit submit 才能作为 fetched-source delegated evidence。
- Gate/provenance/anti-cheating 语义区分两类 reference：
  - fetched-source delegated evidence：必须有 submitted work-unit ledger/source/cache/degraded-capture backing；
  - Phase-owned consumer reference projection：必须引用 existing submitted backing，不能自己扩展 delegated coverage authority。
- Reference classification 使用现有 deterministic bundle surfaces：reference metadata、`_INDEX.md source_layer`、submitted source/cache/work-unit ledgers、output declarations、Wave2 `W2F-xxx` ledger/index refs；本 change 不新增 required metadata key 或 `_INDEX.md` authority column，无法分类时 fail closed。
- Seed topic backfill 和 reference index guidance 改为使用 Phase-owned references、Wave2 `W2F-xxx` ids、ledger/index/source refs；禁止从 synthesis prose alone 或 filesystem-only files 扩展 evidence authority。
- 不产出：不新增 JS-driven workflow walker；不把 search/synthesis judgment 移入 Engine；不新增 `operate-work-unit wait` 作为必须能力；不新增依赖、不使用 Python；不允许脚本/模板批量伪造 references；不让 pure synthesis 的 `00-cross` 文件伪装成新 fetched source。
- 版本：需要 version bump，target version 为 `v0.10`。implementation 阶段需要更新 `CHANGELOG.md` 和 `DPT_FRAMEWORK/RUN.md` 版本横幅。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `research-wave-phase-content`: Wave0/Wave1 phase bodies SHALL teach batched delegated claim and active polling; Wave1/Wave2 phase bodies SHALL assign consumer-facing reference materialization to the Phase Agent after submitted backing exists.
- `wave1-intake`: Wave1 task split changes from "Sub-agent writes topic references" to "Sub-agent submits source evidence; Phase Agent materializes topic references and depth/backfill projections after submit".
- `wave2-synthesis`: Wave2 pure synthesis SHALL materialize source-backed `00-cross` references from existing accepted evidence while continuing to route new external evidence through `wave2_targeted_evidence`.
- `reference-flat-format`: Reference format SHALL support Phase-owned materialized references as consumer projections backed by submitted source/cache/degraded-capture/ledger rows, without treating them as alternate delegated authority.
- `work-unit-provenance-gate`: Provenance checks SHALL distinguish delegated fetched-source output coverage from Phase-owned projection references and fail only when a reference claims new delegated evidence without submitted work-unit backing.
- `research-wave-gate-implementation`: Wave gates SHALL evaluate the revised reference/provenance split, keep Wave1 topic reference format/count checks, and avoid classifying legitimate Phase-owned projections as delegated bypass.
- `agentic-queue`: Wave0/Wave1 queue-loop guidance SHALL prefer bounded top-up fan-out for independent eligible delegated demand while keeping Engine allocation authority in `operate-work-unit claim`.
- `silent-wave-execution`: stop:no guidance SHALL forbid passive waiting for user continuation, task notification, or unrelated background state when work-unit polling/submit/repair actions remain available.
- `subagent-node-contract`: Sub-agent role contracts SHALL stop owning canonical Wave1 topic reference presentation; write-producing Sub-agents still own fetched evidence/cache/result/receipt surfaces and may provide source candidates for Phase Agent materialization.

## Impact

- 影响的 future framework surfaces 包括 `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md`、`phase-wave1.md`、`phase-wave2.md`、`subagent-dpt-evidence-extractor.md`、`subagent-dpt-topic-scout.md`、`DPT_FRAMEWORK/workflows/nodes/shared/shared-subagent-protocol.md`、`shared-silent-execution.md`、`shared-anti-cheating-rules.md`、`shared-reference-template.md`、wave gate definitions、provenance helpers、file observability/reference inspectors。
- 影响的 future tests 包括 `tests/integration/md/phase-wave0-queue-loop.test.mjs`、`tests/integration/md/phase-wave2-queue-loop.test.mjs`、`tests/integration/md/phase-wave2-md-structure.test.mjs`、`tests/integration/md/wave-depth-contract-guidance.test.mjs`、`tests/integration/md/no-phase-bypass-advice.test.mjs`、`tests/engine/static-regression.test.mjs`，以及 gate/provenance tests 覆盖 Phase-owned references 与 delegated fetched references 的区别。
- 需要更新 `openspec/governance/req-registry.yaml` 中相关 capability 的新增 requirement IDs；本 change 不新增 capability prefix。
- 技术约束保持不变：Node.js >=20，纯 JavaScript ESM，`node:test` + `node:assert`，不新增依赖，不使用 Python，不把 tests 放进 `DPT_FRAMEWORK/`。
