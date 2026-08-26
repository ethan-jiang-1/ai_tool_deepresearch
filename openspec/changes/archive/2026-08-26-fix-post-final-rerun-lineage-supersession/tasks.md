## 1. Engine: narrow supersession predicate

- [x] 1.1 In `DEEP_RESEARCH_HARNESS/engine/helpers/handoff-helpers.mjs`, rewrite `supersededBy` so it returns a superseder only for a later `gate_attempt` at the same `gate` + `currentNodeRef` that is `passed: true`, has the **same** `next` as the candidate, and has no different-gate `gate_attempt` between the candidate and it; `passed: false` attempts and different-`next` attempts SHALL be skipped (BUG-244 + BUG-241).
- [x] 1.2 Verify `continuousNormalDescendant` produces a continuous linear chain for the multi-round trace shape `post_final → hitl2→rerun → rerun→seed→wave0→wave1→wave2→hitl2→readiness → readiness→final` (no manufactured discontinuity at the round pass).

## 2. Engine/CLI: single Final-entry verdict

- [x] 2.1 In `validateEnterPhaseTarget`, when the selected latest handoff targets `phases/phase-final.md`, run `evaluateFinalEntryAdmission` and return `ok:false` with the admission reason as the sole verdict on failure (BUG-245).
- [x] 2.2 In `DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs`, remove the separate post-`Authorized` hard-fail for the final node so the Final admission is expressed by the single authorization verdict.

## 3. Regression tests

- [x] 3.1 In `tests/engine/handoff-helpers.test.mjs`, update `rejects superseded source pass` and `rejects superseded predecessor pass for gate preflight` to assert the corrected semantics (a later `passed:false` attempt does NOT supersede the prior passed pass, so `validateEnterPhaseTarget`/`checkPhaseHandoffPreflight` now accept the earlier pass).
- [x] 3.2 In `tests/integration/cli/enter-phase.test.mjs`, update `rejects superseded pass after newer failed attempt for same source gate` to assert the corrected semantics (enter-phase now succeeds with the earlier passed pass).
- [x] 3.3 In `tests/integration/cli/advance-status.test.mjs`, update `rejects superseded source pass and does not mutate status` to assert the corrected semantics (advance-status now succeeds and syncs the earlier passed pass's status).
- [x] 3.4 In `tests/integration/cli/handoff-witnessing-lifecycle.test.mjs` `runSupersededBranch`, update the assertions that encoded the old failed-attempt-supersedes semantics: the newer real failed wave0 attempt still fails the gate itself (handoff preflight at phase-wave0 still rejects), but the old wave0 pass stands, so `enter-phase phases/phase-wave1.md` now succeeds (flip the boundary assertion), and after that enter-phase writes the route-bound load, `advance-status wave0_complete` now succeeds. Rename/re-detail the affected `supersede:*` check labels to describe the corrected boundary.
- [x] 3.4b In `tests/integration/cli/check-gate-readiness-passed.test.mjs` test 13, update the assertion that encoded the old failed-predecessor-supersedes semantics: the later failed wave1 attempt does NOT supersede the earlier passed wave1→wave2 predecessor, so the gate now clears handoff preflight and fails on content rules instead of a handoff-witness gap.
- [x] 3.5 Add a deterministic regression in `tests/integration/cli/post-final-lineage-consumers.test.mjs` (extending the `appendNormalDescendantToFinal` fixture pattern) covering the two-round post-final rerun descendant chain: after an accepted C5 lineage, append round-1 descendants ending in a `hitl2-recorded → phase-rerun` round pass, then a second full rerun sub-chain ending in `hitl2-recorded → phase-readiness → readiness → final`; assert `inspectPostFinalHandoffStage`/`operate-post-final-recovery inspect` no longer report `descendant_lineage_drift` and `enter-phase phase-final` yields a single verdict. Also assert in `tests/engine/handoff-helpers.test.mjs` that `supersededBy` skips `passed:false` and different-`next` attempts.
- [x] 3.6 Run `node --test` (full suite) and confirm 0 failures.

## 4. Governance

- [x] 4.1 Run `node openspec/governance/check-semantic-closure.mjs --change fix-post-final-rerun-lineage-supersession --mode plan` and confirm green before target edits.
- [x] 4.2 Ensure no new requirement IDs / prefixes are reserved (Verify-only capability; no `requirement-reservation.yaml` needed).
- [x] 4.3 openspec-feedback:plan-review — reviewed whole-change coherence and risk surfaces (supersession predicate vs `latestLegalPassedHandoff`/preflight interaction, Final-entry single-verdict folding incl. recovery-contract caller impact, five→six affected test sites) before target edits; no open findings. openspec-feedback:closeout-review — reviewed the actual diff (handoff-helpers.mjs `supersededBy`/`validateEnterPhaseTarget`, enter-phase.mjs, six test updates, two-round lineage regression), semantic-closure record vs implemented surfaces, and the full `node --test` 2829/2829 pass; no open findings.
