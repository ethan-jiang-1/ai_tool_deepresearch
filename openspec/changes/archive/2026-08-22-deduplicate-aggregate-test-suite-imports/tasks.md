# deduplicate-aggregate-test-suite-imports

## 0. Apply Gate

- [x] 0.1 `openspec-feedback:plan-review` - Read `proposal.md`, `design.md`,
      this task list, `verification-plan.yaml`, and `semantic-closure.yaml`
      against the current canonical-discovery and verification-routing
      sources; reviewed whole-change coherence and the touched surfaces
      (aggregate import removal, engine side-effect import removal). For
      `semantic-closure: not_applicable`, the reason holds: no runtime fact
      family or production behavior changes. Done when no actionable finding
      remains and plan-mode governance passes. Completed 2026-08-22: reviewed
      per `openspec/operations/change-feedback-loop.md` (Apply Review); no
      actionable finding remains; `not_applicable` holds because only
      test-owned wiring changes.
- [x] 0.2 Plan-mode governance before the first target edit:
      `openspec validate deduplicate-aggregate-test-suite-imports --strict`,
      `node openspec/governance/check-project-reqs.mjs --mode plan`,
      `node openspec/governance/check-verification-routing.mjs --change
      deduplicate-aggregate-test-suite-imports --mode plan`,
      `node openspec/governance/check-semantic-closure.mjs --change
      deduplicate-aggregate-test-suite-imports --mode plan`. Done when all
      exit zero and structural PASS results are recorded as planning evidence
      only. Completed 2026-08-22: strict validate valid; verification-routing
      plan valid (2 claims); semantic-closure plan valid; project reqs plan
      consistent (662 registered). Structural results only, not runtime proof.

## 1. Target Edits

- [x] 1.1 Convert `tests/integration/cli/continuation-initiation-contract.test.mjs`
      from the nine side-effect imports into an inventory/wiring test that
      asserts the nine owned suites exist and are covered by the canonical
      `tests/**/*.test.mjs` glob, without importing them; keep the `@impl`
      linkage and the file path. The walk mirrors `find` and skips symlinked
      directories (`tests/fixtures/DEEP_RESEARCH_HARNESS/*`). Done when the
      file passes its focused serial run and no owned suite is imported by it.
      Completed 2026-08-22: focused run passes 1/1 in 1.02s wall (was
      101.95s); grep confirms no test file imports any owned suite.
- [x] 1.2 Remove the two side-effect imports
      (`./work-unit-attempt-disposition.test.mjs`,
      `./work-unit-transaction.test.mjs`) from
      `tests/engine/work-unit-attempt-recovery.test.mjs`; its own 4 inventory
      leaves are unchanged. Done when the file passes its focused serial run.
      Completed 2026-08-22: focused run passes (0 fail) in 64ms (was 5.5s);
      its own 4 leaves unchanged.

## 2. Verification

- [x] 2.1 Module inventory: show that every active owned suite executes
      exactly once under canonical discovery — before/after TAP leaf counts
      for the two touched files and their formerly imported suites
      (aggregate drops its 213 duplicated leaves 214→1; recovery child drops
      17 leaves 21→4; disposition/transaction suites keep their own single
      run). Done when the counts match the ledger in `design.md` (expected
      total 3028 → 2798). Completed 2026-08-22: canonical TAP total before
      3028, after 2798 — drop 230 exactly as designed; grep confirms no test
      file imports any formerly imported suite.
- [x] 2.2 Full canonical serial run (`npm test -- --test-concurrency=1
      --test-reporter=tap`): zero failed/cancelled; wall time and total leaf
      count reduced by the duplicated set (≈107-108s / 230 leaves expected);
      record the result as a single sample, not a guarantee. Completed
      2026-08-22: clean run 2798 passed / 0 failed / 0 cancelled, wall
      649.9s vs 757.0s baseline (≈107s saved); single sample.

## 3. Closeout

- [x] 3.1 `openspec-feedback:closeout-review` - Establish the change-scoped
      diff boundary (only the two test files + this change's assets), review
      the actual diff against proposal/design/tasks/verification-plan, and
      reassess `semantic-closure: not_applicable` against the implemented
      surfaces. Record every actionable finding as an ordinary unchecked task;
      complete only when none remains. Completed 2026-08-22: boundary = the
      two test files (engine recovery -2 imports; aggregate 9 imports →
      symlink-safe inventory test, `@impl` linkage and file path preserved);
      diff matches proposal/design, no production/Harness/Engine surface
      touched; verification-plan claims exercised (focused 1/1 + 4/4 passes,
      full suite 2798/2798); `semantic-closure: not_applicable` reassessed
      against the implemented surfaces — holds (test-owned wiring only, no
      runtime fact family). No actionable finding remains.
- [x] 3.2 Archive-mode governance:
      `node openspec/governance/check-project-reqs.mjs --mode archive --change
      deduplicate-aggregate-test-suite-imports`,
      `node openspec/governance/check-project-specs.mjs`,
      `node openspec/governance/check-verification-routing.mjs --change
      deduplicate-aggregate-test-suite-imports --mode assets`,
      `node openspec/governance/check-semantic-closure.mjs --change
      deduplicate-aggregate-test-suite-imports --mode assets`, strict change
      validation, and `git diff --check`. Done when all exit zero. Completed
      2026-08-22: reqs archive consistent (662 registered); project specs 82
      valid; routing assets valid (2 claims); semantic-closure assets valid;
      strict validate valid; diff-check OK.

> The final archive transition is the governed finalizer
> (`node openspec/governance/finalize-change-archive.mjs --change
> deduplicate-aggregate-test-suite-imports`) — a lifecycle action, not a task
> (the finalizer blocks on incomplete tasks, so it cannot be listed as one).
