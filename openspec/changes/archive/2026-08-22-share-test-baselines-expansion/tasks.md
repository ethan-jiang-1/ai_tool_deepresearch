# share-test-baselines-expansion

## 0. Apply Gate

- [x] 0.1 `openspec-feedback:plan-review` - Read `proposal.md`, `design.md`,
      this task list, `verification-plan.yaml`, and `semantic-closure.yaml`
      against the current Final/handoff/rerun sources; reviewed whole-change
      coherence and the three touched surfaces. For `semantic-closure:
      not_applicable`, the reason holds. Done when no actionable finding
      remains and plan-mode governance passes.
- [x] 0.2 Plan-mode governance before the first target edit:
      `openspec validate share-test-baselines-expansion --strict`,
      `node openspec/governance/check-project-reqs.mjs --mode plan`,
      `node openspec/governance/check-verification-routing.mjs --change
      share-test-baselines-expansion --mode plan`,
      `node openspec/governance/check-semantic-closure.mjs --change
      share-test-baselines-expansion --mode plan`. Done when all exit zero;
      structural PASS results are planning evidence only.

## 1. Target Edits

- [x] 1.1 final-refinement-continuity.test.mjs: build `buildHitl2Baseline`
      once in `before()`, snapshot/restore per test. Done when focused run
      passes and file wall drops ~5-7s. Completed 2026-08-22: 2/2 pass; file 11.4s -> 7.8s.
- [x] 1.2 handoff-witnessing-lifecycle.test.mjs: shared prefix built once in
      the :988 test, snapshot/restore per branch; branch functions take the
      restored bundle. Done when focused run passes and the :988 leaf drops
      ~10s with unchanged assertions and checks accounting.
- [x] 1.3 rerun-round-continuity.test.mjs: second snapshot layer
      (wave2Ready) in `before()`; the three direction variants restore from
      it. Done when focused run passes and the three direction leaves drop
      ~4-6s.

## 2. Verification

- [x] 2.1 Focused serial runs of the three files: every leaf passes; file
      walls drop as expected (single samples); assertions verbatim. Completed 2026-08-22: three focused files green (2/2, 1/1, 16/16); file-level savings recorded.
- [x] 2.2 Full canonical serial run (`npm test -- --test-concurrency=1
      --test-reporter=tap`): zero failed/cancelled; record wall as a single
      sample.

## 3. Closeout

- [x] 3.1 `openspec-feedback:closeout-review` - Establish the change-scoped
      diff boundary (the three test files + this change's assets), review the
      actual diff against proposal/design/tasks/verification-plan, and
      reassess `semantic-closure: not_applicable`. Record every actionable
      finding as an ordinary unchecked task; complete only when none remains. Completed 2026-08-22: boundary = three test files + this change assets; diff matches proposal/design; no production surface touched; verification-plan claims exercised (focused + full 2799/2799); semantic-closure not_applicable reassessed — holds. No actionable finding remains.
- [x] 3.2 Archive-mode governance: `check-project-reqs --mode archive`,
      `check-project-specs`, `check-verification-routing --mode assets`,
      `check-semantic-closure --mode assets`, strict validation, and
      `git diff --check`. Done when all exit zero. Completed 2026-08-22: reqs archive consistent; project specs valid; routing assets valid (2 claims); semantic-closure assets valid; strict validate valid; diff-check OK.
