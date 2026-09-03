# Tasks: Supersede Drops Inherited Retry Lineage On Fresh Successor Demand

## 1. Regression test first (red)

- [x] 1.1 Add a failing deterministic_e2e regression test in `tests/e2e/work-unit-attempt-recovery.test.mjs` ("supersedes a normally submitted attempt-2 retry without inherited retry lineage"): seed one delegated queue item, claim + `closeWorkUnitAttempt(..., status: 'timed_out', force: true)` for attempt-1, claim the retry (assert `attempt_index === 2`), write a candidate with `writeAttemptCandidate`, formally submit it, drift its accepted `result_ref`, then run `supersedeWorkUnitAttempt` on the retry work_id. Verify the test currently fails with `retry lineage parent ... is missing for supersession-...` (run: `node --test tests/e2e/work-unit-attempt-recovery.test.mjs`)
- [x] 1.2 Add a focused unit assertion in `tests/engine/work-unit-attempt-disposition.test.mjs` (or the same e2e test): after the fix, assert the committed successor queue item's lineage has NO `retry_of_work_id`/`retry_reason`/`attempt_index`, carries exactly the five supersession fields, and `resolveWorkUnitSupersessionLineage` resolves the successor as a fresh leaf without a missing-parent error

## 2. Engine fix

- [x] 2.1 Add an exported `WORK_UNIT_RETRY_LINEAGE_FIELDS` constant (mirroring `WORK_UNIT_SUPERSESSION_LINEAGE_FIELDS`) in `DEEP_RESEARCH_HARNESS/schema/contracts/queue.mjs` and verify a focused unit test imports it (`node --test tests/engine/work-unit-attempt-disposition.test.mjs tests/e2e/work-unit-attempt-recovery.test.mjs`)
- [x] 2.2 Update `DEEP_RESEARCH_HARNESS/engine/work-unit-supersession.mjs` `buildSupersessionSuccessorDemand` (and its lineage helper) so the fresh successor's lineage drops both the supersession fields and the retry trio before adding the five flat supersession fields; verify the Change A regression tests from §1 now pass green
- [x] 2.3 Confirm no other supersession code path depended on inherited retry lineage surviving on a successor: grep `retry_of_work_id` in `work-unit-supersession.mjs`/lifecycle retry builder; verify `validateSuccessorRetryContinuation` still validates legitimate later retries of the successor (run the full supersession/late-submit tests: `node --test tests/e2e/work-unit-attempt-recovery.test.mjs tests/engine/work-unit-submit.test.mjs`)

## 3. Verify + close

- [x] 3.1 Run the full supersession/queue regression surface (unit + integration + e2e) and confirm no failure (e.g. `node --test tests/engine tests/integration tests/e2e/work-unit-attempt-recovery.test.mjs` or the repo's standard supersession-related subset)
- [x] 3.2 Add `@impl AGQ-026` / updated impl annotations to the touched engine code and confirm the change-root spec sync leaves `agent/agentic-queue` delta consistent with the accepted spec (`openspec validate supersede-drops-retry-lineage --strict`)

## 4. Reviews

- [x] 4.1 openspec-feedback:plan-review —— polish passes complete（全变更连贯性 + 风险导向轮次）；所有 finding 已修复，`openspec validate --strict` 与 change-root governance 检查通过。
- [x] 4.2 openspec-feedback:closeout-review —— 对照实际 diff 复核：delta spec（agentic-queue AGQ-026 MODIFIED）与 engine 修订一一对应（buildSupersessionSuccessorDemand 清除 retry lineage 三字段）；semantic-closure 坐标与 verification plan 一致；无未关闭 finding。
