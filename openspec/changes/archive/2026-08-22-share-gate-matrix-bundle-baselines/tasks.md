# share-gate-matrix-bundle-baselines

## 0. Apply Gate

- [x] 0.1 `openspec-feedback:plan-review` - Read `proposal.md`, `design.md`,
      this task list, `verification-plan.yaml`, and `semantic-closure.yaml`
      against the five touched sources; reviewed whole-change coherence.
      For `semantic-closure: not_applicable`, the reason holds. Done when no
      actionable finding remains and plan-mode governance passes.
- [x] 0.2 Plan-mode governance: `openspec validate
      share-gate-matrix-bundle-baselines --strict`,
      `node openspec/governance/check-project-reqs.mjs --mode plan`,
      `node openspec/governance/check-verification-routing.mjs --change
      share-gate-matrix-bundle-baselines --mode plan`,
      `node openspec/governance/check-semantic-closure.mjs --change
      share-gate-matrix-bundle-baselines --mode plan`. Done when all exit
      zero.

## 1. Target Edits

- [x] 1.1 `check-gate-wave0-complete.test.mjs`: shared empty bundle in
      `before()`, `restoredBundle()` per leaf (28 sites; :933 custom-topic
      leaf keeps its own). Done when focused run passes and file wall drops. Completed 2026-08-22: wave0 28/28.
- [x] 1.2 `check-gate-wave2-complete.test.mjs`: same (31 sites). Done when
      focused passes. Completed 2026-08-22: wave2 31/31, 14.8s -> 5.9s.
- [x] 1.3 `check-gate-readiness-passed.test.mjs`: same (16 sites). Done when
      focused passes.
- [x] 1.4 `check-gate-hitl2-recorded.test.mjs`: same (15 sites). Done when
      focused passes.
- [x] 1.5 `operate-queue-validation.test.mjs`: same (27 sites). Done when
      focused passes.

## 2. Verification

- [x] 2.1 Focused serial runs of the five files: every leaf passes; file
      walls drop ~30-40s total (single samples); assertions verbatim.
- [x] 2.2 Full canonical serial run: zero failed/cancelled; record wall as a
      single sample.

## 3. Closeout

- [x] 3.1 `openspec-feedback:closeout-review` - Establish the change-scoped
      diff boundary (the five test files + this change's assets), review the
      actual diff, and reassess `semantic-closure: not_applicable`. Record
      every actionable finding as an ordinary unchecked task; complete only
      when none remains.
- [x] 3.2 Archive-mode governance: `check-project-reqs --mode archive`,
      `check-project-specs`, `check-verification-routing --mode assets`,
      `check-semantic-closure --mode assets`, strict validation, and
      `git diff --check`. Done when all exit zero. Completed 2026-08-22: reqs archive consistent; project specs valid; routing assets valid (1 claim); semantic-closure assets valid; strict validate valid; diff-check OK. Completed 2026-08-22: strict validate valid; routing plan valid (1 claim); semantic-closure plan valid; reqs plan consistent.
