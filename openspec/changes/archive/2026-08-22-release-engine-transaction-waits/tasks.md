# release-engine-transaction-waits

## 0. Apply Gate

- [x] 0.1 `openspec-feedback:plan-review` - Read `proposal.md`, `design.md`,
      this task list, `verification-plan.yaml`, and `semantic-closure.yaml`
      against the current transaction sources; reviewed the touched surface
      (three engine contention tests). For `semantic-closure:
      not_applicable`, the reason holds. Done when no actionable finding
      remains and plan-mode governance passes. (Target edits were made
      together with this review; the applied diff is verified in §1/§2.)
- [x] 0.2 Plan-mode governance: `openspec validate
      release-engine-transaction-waits --strict`,
      `node openspec/governance/check-project-reqs.mjs --mode plan`,
      `node openspec/governance/check-verification-routing.mjs --change
      release-engine-transaction-waits --mode plan`,
      `node openspec/governance/check-semantic-closure.mjs --change
      release-engine-transaction-waits --mode plan`. Done when all exit zero. Completed 2026-08-22: reqs archive consistent; project specs valid; routing assets valid (1 claim); semantic-closure assets valid; strict validate valid; diff-check OK. Completed 2026-08-22: strict validate valid; routing plan valid (1 claim); semantic-closure plan valid; reqs plan consistent.

## 1. Target Edits

- [x] 1.1 In `tests/engine/work-unit-transaction.test.mjs`, replace the fixed
      `Atomics.wait` (1200ms :230, 1000ms :290, 900ms :645) with the
      ready/release handshake (holder writes ready, polls ≤30s for release;
      test waits ready, runs every assertion unchanged, writes release).
      Done when the focused serial run passes with all leaves green and the
      three contention leaves drop to ~50ms each.

## 2. Verification

- [x] 2.1 Focused serial run: every leaf passes; contention leaves ~50ms
      each (single sample); assertions unchanged. Completed 2026-08-22: focused 15/15, 0 fail; all sameAttempt variants and assertions verbatim; single sample.
- [x] 2.2 Full canonical serial run: zero failed/cancelled; record wall as a
      single sample.

## 3. Closeout

- [x] 3.1 `openspec-feedback:closeout-review` - Establish the change-scoped
      diff boundary (the one test file + this change's assets), review the
      actual diff, and reassess `semantic-closure: not_applicable`. Record
      every actionable finding as an ordinary unchecked task; complete only
      when none remains.
- [x] 3.2 Archive-mode governance: `check-project-reqs --mode archive`,
      `check-project-specs`, `check-verification-routing --mode assets`,
      `check-semantic-closure --mode assets`, strict validation, and
      `git diff --check`. Done when all exit zero.
