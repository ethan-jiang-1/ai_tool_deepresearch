## 0. Plan Review

- [x] 0.1 openspec-feedback:plan-review — reviewed RWE-013's evidence authority, one-case scope, C2/C3 admission boundary, and verification plan before the first target edit. The existing Gate/entry commands remain transition authority; the adapter only re-delivers the read-only Wave2 control surface. No actionable finding.

## 1. Verification Planning

- [x] 1.1 Created and validated `verification-plan.yaml` before target edits with the RWE-013 integration contract and the one `agent_flow_e2e` native-observation claim using `node openspec/governance/check-verification-routing.mjs --change add-degraded-handoff-requalification-case --mode plan` (passed).
- [x] 1.2 Confirmed `RWE-013` is registered once and the RWE delta describes only the new requalification case, not a production handoff/search-policy change.

## 2. RWE-013 Requalification Case

- [x] 2.1 Added `exp_wff_wave-chain/case-154-heavy-degraded-handoff-requalification.md` and one manifest registration. Its setup helper reaches the Wave0 Gate through production Gate/entry/status operations, retains the actual degraded Gate JSON, and stops before Wave2 decision/result production.
- [x] 2.2 Added Subject adapter `154` with two bounded turns. After first-turn legal Wave2 entry it reads only status, reloads the existing production surface, retains `case-154-wave2-surface.json` with SHA-256, and injects it without writing a transition.
- [x] 2.3 The second Subject turn names `W2F-154`, requires `gap_status: needs_search` plus `explore_search`/`exploit_search`, a real child-backed submitted `wave2_targeted_evidence` work unit, and forbids Subject-owned `WebSearch`/`WebFetch`.
- [x] 2.4 Added deterministic case checks and native durable Subject evidence declarations. The retained bundle includes Wave0 Gate/status/trace, Wave2 snapshot, named finding/binding, and the full transcript; missing capability writes a non-empty native `NOT_RUN` reason without substitute evidence.
- [x] 2.5 Added `tests/integration/md/case-154-degraded-handoff-requalification-contract.test.mjs` for the V2 profile, exact continuity/reload/delegation boundaries, evidence declarations, and static-proof limit.

## 3. Native Observation And Verification

- [x] 3.1 Ran `node --test tests/integration/md/case-154-degraded-handoff-requalification-contract.test.mjs`: 5/5 passed; this is static contract proof only, not real-Agent behavior evidence.
- [x] 3.2 Invoked the exact one permitted assurance command once. It exited before launch with `run profile assurance selected no runnable cases`; [apply-ledger.md](apply-ledger.md) retains the one read-only dry-run selection basis `duration_prediction_unavailable`. No native completion, Subject/child/tool evidence, cancellation, error, or budget boundary exists, and no retry was performed. This selection omission does not admit C3.
- [x] 3.3 Ran `node openspec/governance/check-verification-routing.mjs --change add-degraded-handoff-requalification-case --mode assets`: 2 claims valid.
- [x] 3.4 Ran `openspec validate add-degraded-handoff-requalification-case --strict`: passed.
- [x] 3.5 Ran `node openspec/governance/check-project-reqs.mjs`: 630 registered IDs, zero duplicate/orphan/reused-retired findings.
- [x] 3.6 Ran `node openspec/governance/check-project-specs.mjs`: 84 main specs, zero structural violations.
- [x] 3.7 openspec-feedback:closeout-review — reviewed the scoped C2 diff, static verification, and the honest Supervisor selection omission. The case owns no production behavior change; C3 is not admitted because no retained actual prohibited Subject behavior exists. No open C2 finding remains.
