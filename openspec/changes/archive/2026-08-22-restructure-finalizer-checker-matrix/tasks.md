# restructure-finalizer-checker-matrix

## 0. Apply Gate

- [x] 0.1 `openspec-feedback:plan-review` - Read `proposal.md`, `design.md`,
      this task list, `verification-plan.yaml`, and `semantic-closure.yaml`
      against the current finalizer/checker sources; reviewed whole-change
      coherence and the touched surface (ranks 1 and 3 of the finalizer
      suite). For `semantic-closure: not_applicable`, the reason holds. Done
      when no actionable finding remains and plan-mode governance passes. Completed 2026-08-22: reviewed per change-feedback-loop Apply Review; direct-checker invocations verified against finalize-change-archive.mjs source; rank-3 fragments verified verbatim in config.yaml/guideline/contract; no finding; not_applicable holds.
- [x] 0.2 Plan-mode governance before the first target edit:
      `openspec validate restructure-finalizer-checker-matrix --strict`,
      `node openspec/governance/check-project-reqs.mjs --mode plan`,
      `node openspec/governance/check-verification-routing.mjs --change
      restructure-finalizer-checker-matrix --mode plan`,
      `node openspec/governance/check-semantic-closure.mjs --change
      restructure-finalizer-checker-matrix --mode plan`. Done when all exit
      zero; structural PASS results are planning evidence only.

## 1. Target Edits

- [x] 1.1 Rank 1: replace the six `runFinalizer` calls with sentinel 1
      (initial fixture), the direct checker matrix (main-spec, taxonomy,
      discovery, routing — exact finalizer invocations), sentinel 2 (fully
      repaired fixture), and the static script→code mapping `it()`. Every
      assertion fact preserved. Done when the focused suite passes and the
      rank-1 leaf drops from ~24s to ~10s. Completed 2026-08-22: rank-1 leaf 11.8s (was 24.2s); sentinels 1+2 and direct matrix pass; mapping test green after searching code from script position.
- [x] 1.2 Rank 3: keep the tasks + apply instructions projections; move the
      proposal/archive rule fragments to static reads of
      `change-feedback-loop.md`, `requirement-reservation-contract.mjs`,
      `semantic-fact-closure-contract.mjs`, and `openspec/config.yaml`
      (verified verbatim during apply; fallback retains the projection call).
      Done when the focused suite passes and the rank-3 leaf drops from
      ~22.7s to ~16s.

## 2. Verification

- [x] 2.1 Focused serial run of the touched file: every leaf passes; rank-1
      and rank-3 leaf timings drop as expected; ranks 4/6/7/12 and static
      tests unchanged and green (single samples). Completed 2026-08-22: focused run 8/8 pass, 0 fail; file wall 36.8s vs 52.7s; ranks 4/6/7/12 and static tests green.
- [x] 2.2 Full canonical serial run (`npm test -- --test-concurrency=1
      --test-reporter=tap`): zero failed/cancelled; record wall as a single
      sample.

## 3. Closeout

- [x] 3.1 `openspec-feedback:closeout-review` - Establish the change-scoped
      diff boundary (only the one test file + this change's assets), review
      the actual diff against proposal/design/tasks/verification-plan, and
      reassess `semantic-closure: not_applicable`. Record every actionable
      finding as an ordinary unchecked task; complete only when none remains. Completed 2026-08-22: boundary = the one test file (runChecker helper + ranks 1/3 restructure + static mapping it); diff matches proposal/design; no production/Harness/governance surface touched; verification-plan claim exercised (focused 8/8, full 2799/2799); semantic-closure not_applicable reassessed — holds (test-owned proof economics only). No actionable finding remains.
- [x] 3.2 Archive-mode governance: `check-project-reqs --mode archive`,
      `check-project-specs`, `check-verification-routing --mode assets`,
      `check-semantic-closure --mode assets`, strict validation, and
      `git diff --check`. Done when all exit zero. Completed 2026-08-22: reqs archive consistent; project specs valid; routing assets valid (1 claim); semantic-closure assets valid; strict validate valid; diff-check OK.
