## 1. Apply Readiness

- [x] 1.1 `openspec-feedback:plan-review`：在首次 target edit 前阅读 change-feedback-loop 操作指导，复核 C6a/C6b/C6c 的 A/reject 决策、complete-current-profile 读者问题、三个受影响 accepted capability 和排除项；任何发现作为普通未完成 task 记录。
- [x] 1.2 运行 plan-mode governance：`openspec validate retire-legacy-work-unit-attempt-inputs --strict`、`node openspec/governance/check-project-reqs.mjs --mode plan`、`node openspec/governance/check-project-specs.mjs`、`node openspec/governance/check-verification-routing.mjs --change retire-legacy-work-unit-attempt-inputs --mode plan`、`node openspec/governance/check-semantic-closure.mjs --change retire-legacy-work-unit-attempt-inputs --mode plan`；全部通过后才首次修改 target code。

## 2. Current Attempt Profile Boundary

- [x] 2.1 实现 DEW-004/DEW-017：在 index-led work-unit validation owner 建立一个无持久状态的 complete-current-profile classifier，按 design 的固定优先级返回 current 或唯一 `unsupported_current_contract` discriminator。
- [x] 2.2 实现 DEW-004/DEW-017/SNC-006：让 `work-unit-assignment-contract`、`work-unit-validation`、`work-unit-envelope`、current schemas、manifest/beacon cross-check、task/result projections 和 current claim 只表达 v3 assignment、`work-unit.submission.v1`、actor-v1 与合法 actor execution；保留为了稳定拒绝而需要的最小 structural decoding，不保留 positive legacy union/router。
- [x] 2.3 实现 DEW-005/DEW-024：在 normal/dry submit、duplicate replay、late-submit、recover-declaration 与 timeout-preflight 的最早合法入口使用 classifier；旧 profile 在 candidate interpretation、progress/timeout projection、hash/recovery facts 和 authority mutation 前失败；旧 Wave0 rich-reference 不得成为 current output 或 backing authority。
- [x] 2.4 实现 DEW-017/DEW-024：在 `work-unit-submitted-ledger` 和 canonical `helpers/gate-helpers-readers` declaration reader 复用同一分类结论；删除 markerless hash-mirror acceptance 与其 positive reader branch，使依赖该 normalizer 的 Gate/reader 不会取得旧 attempt authority。
- [x] 2.5 实现 DEW-017：在 `work-unit-inspect`、`work-unit-attempt-disposition` 和 `work-unit-submit-integrity` 复用同一分类结论；旧 profile 不得产生 `legacy_unrecorded`、current/historical coverage 或 submit-integrity authority projection。
- [x] 2.6 实现 DEW-024/WPG-001/WPG-002：在 supersession、Wave0 source-contribution/reference-backing projection 和 provenance/Gate consumers 复用同一分类结论；删除 legacy Wave1 normalization、`legacy_unrecorded` construction/projection 与 legacy Wave0 reference authority 及其正向 guidance。
- [x] 2.7 保持 WPG-001/WPG-016 的排除边界：`legacy_non_work_unit_rows`、JSONL corruption、完整 current profile 的 integrity roots、C6d transaction recovery 和现有 normal current lineage 不因该 removal 改义。

## 3. Regression Evidence

- [x] 3.1 为 DEW-004/DEW-017/SNC-006 增加 unit truth table：显式 v1/v2（含旧 Wave0 rich-reference）、markerless hash-mirror、actor-unrecorded、partial/drifting profile 都得到一个稳定 `unsupported_current_contract` 和直接 discriminator；`work-unit-attempt-disposition` 与 `helpers/gate-helpers-readers` 不得再投影 actor、current/historical coverage 或 reader authority，每例断言零 authority mutation。
- [x] 3.2 为 DEW-005/DEW-024/WPG-001/WPG-002 增加 unit regressions：旧 profile 不进入 submit/recovery/supersession/provenance/submit-integrity/timeout-preflight，完整 v3 + submission-v1 + actor-v1 的 normal/late/recovery/supersession 路径继续通过。
- [x] 3.3 为 DEW-017/WPG-001 增加 unit regressions：delegated 与 authorized fallback actor 均保持精确 ledger/inspect binding；不再产生 `legacy_unrecorded`，而非工作单元 JSONL diagnostics 仍保持原有分类。
- [x] 3.4 为 DEW-005/WPG-002 增加 integration coverage：真实 `operate-work-unit` 与 declaration-recovery CLI 在临时 bundle 上对旧 profile 拒绝且无 mutation，对 complete current profile 保持现有成功/失败闭环。
- [x] 3.5 为 DEW-024/WPG-016 更新 deterministic E2E attempt-recovery coverage：旧 predecessor 不得成为 historical acceptance，完整 current supersession predecessor/leaf 保持 current coverage 和 fail-closed lineage behavior。
- [x] 3.6 为 DEW-004/WPG-001 增加 `work-unit-projection` unit regression：v1/v2 或 markerless Wave0 rich-reference attempt 在 source-contribution、reference-backing 或 count facts 之前返回 `unsupported_current_contract`；complete-current Wave0 contribution 仍保留现有投影。
- [x] 3.7 为 WPG-001 增加 Wave0 Gate integration regression：临时 bundle 中旧 rich-reference row 不能通过 delegated evidence 或 Phase-owned backing 分支，complete-current submitted source backing 保持现有 Gate 闭环。

## 4. Specification And Surface Sync

- [x] 4.1 将三个 delta 同步到 `agent/delegated-work-units`、`agent/work-unit-provenance-gate` 与 `agent/subagent-node-contract` main specs；保留 current protected behavior，删除 v1/v2、markerless、`legacy_unrecorded` 的正向 current-reader 承诺。
- [x] 4.2 扫描 scoped Engine/schema/current guidance/tests/main specs：不存在旧 input 的 positive compatibility、migration、adapter、fallback 或 version router；确认 `work-unit.submission.v1`、current v3 assignment 和 current actor-v1 仍被明确保护。
- [x] 4.3 scoped-scan finding：退役 `Submitted result and ledger hashes` requirement 中 pre-unified/pre-context attempt 的正向 declaration-recovery，以及 `Work-unit tasks` requirement 中 internal/test legacy envelope constructor；将 legacy Wave0、assignment 和 timeout scenario 标题改为拒绝语义，同步三个 main specs 后重跑 scoped absence/protected-path review。

## 5. Verification And Closeout

- [x] 5.1 运行 selected deterministic evidence：`tests/engine/work-unit-assignment-contract.test.mjs`、`tests/engine/work-unit-submit.test.mjs`、`tests/engine/work-unit-actor-submit.test.mjs`、`tests/engine/work-unit-attempt-disposition.test.mjs`、`tests/engine/work-unit-attempt-recovery.test.mjs`、`tests/engine/work-unit-inspect.test.mjs`、`tests/engine/work-unit-lifecycle.test.mjs`、`tests/engine/work-unit-projection.test.mjs`、`tests/engine/work-unit-terminal.test.mjs`、`tests/engine/helpers/gate-helpers-readers.test.mjs`、`tests/engine/helpers/gate-helpers-provenance.test.mjs`、`tests/integration/cli/operate-work-unit.test.mjs`、`tests/integration/cli/work-unit-declaration-recovery.test.mjs`、`tests/integration/cli/check-gate-wave0-complete.test.mjs`、`tests/e2e/work-unit-attempt-recovery.test.mjs`，并运行 `node DEEP_RESEARCH_HARNESS/cli/validate-workflow-package.mjs`。
- [x] 5.2 完成 delta/main re-comparison，运行 `openspec validate retire-legacy-work-unit-attempt-inputs --strict`、verification-routing assets mode、semantic-closure assets mode、project-specs 和 scoped current-surface absence/protected-path review。
- [x] 5.3 `openspec-feedback:closeout-review`：审阅 change-scoped actual diff、delta/main equivalence、C6 exclusions 和 selected verification evidence；任何发现作为普通未完成 task 收口。
- [x] 5.3a closeout finding：将 semantic-closure 的 complete-current-profile resolver 坐标更新为 `work-unit-current-profile.mjs`，并列出 submitted-ledger、supersession 与 canonical Gate reader 为 verdict consumers；assets-mode closure 验证通过。
- [x] 5.4 运行 `node openspec/governance/check-project-reqs.mjs --mode archive --change retire-legacy-work-unit-attempt-inputs`，必须 PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired）。
- [x] 5.5 运行 `node openspec/governance/check-project-specs.mjs`，必须 PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）。
