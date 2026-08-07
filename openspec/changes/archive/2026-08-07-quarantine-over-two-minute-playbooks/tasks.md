## 0. Plan Review Record

- [x] 0.1 @impl EXA-010, VER-001 openspec-feedback:plan-review: Following archive-preflight discovery of the missing marker, reviewed the proposal, delta spec, design, verification plan, implementation boundary, and selected static tests. This records current plan coherence and does not claim to substitute for or predate historical target-edit evidence.

## 1. Verification Planning

- [x] 1.1 @impl EXA-010, VER-001: Created `verification-plan.yaml` for the manifest-reader unit contract and Case 225 static quarantine contract, then ran `node openspec/governance/check-verification-routing.mjs --change quarantine-over-two-minute-playbooks --mode plan` (passed). It declares no `agent_flow_e2e` claim and does not use a static result as Agent evidence.

## 2. Quarantine Implementation

- [x] 2.1 @impl EXA-010: Extended `tests/host_tools/agent-experiment-autorun.test.mjs` with a temporary-fixture case below `exp_extrem_slow/`; it failed before the reader repair because the file entered corpus discovery, then passed after the fixed-root exclusion and registration rejection were added.
- [x] 2.2 @impl EXA-010: Made the shared Autorun manifest contract exclude the fixed `exp_extrem_slow/` root from runnable discovery and reject active manifest rows below that root. The shared reader is used by all selectors; no selector-specific denylist was added.
- [x] 2.3 @impl EXA-010: Moved Case 224 and Case 225 to `experiments_playbook/exp_extrem_slow/`, renamed both as `case-…-extreme-slow-…`, added visible quarantine banners, removed their active manifest rows, and added the quarantine/refactor-or-remove boundary to the manifest, README, Headless instruction, and Interactive instruction. The machine table has no paths for either case and `extreme-slow` is documented as non-runnable.
- [x] 2.4 @impl EXA-010: Updated the focused Case 225 contract path and registration assertion to require the quarantined asset, absent active registration, and the explicit refactor-or-remove notice. The focused static contract passed without treating quarantine as native behavior proof.

## 3. Verification And Closeout

- [x] 3.1 @impl EXA-010, VER-001: Ran the focused unit and integration contracts, the repository manifest validation path, and `check-verification-routing.mjs --mode assets`. The `node:test` command passed 51 tests; the manifest reader reported 101 active cases and no quarantined active path; verification routing assets passed. These checks prove only static routing/manifest behavior, and no native Agent case was launched.
- [x] 3.2 @impl EXA-010: Ran `openspec validate quarantine-over-two-minute-playbooks --strict` successfully; the proposal, delta spec, design, and tasks are coherent.
- [x] 3.3 @impl EXA-010: Ran `node openspec/governance/check-project-reqs.mjs` successfully: 0 orphan requirement IDs, with no duplicate, unregistered, or reused-retired findings.
- [x] 3.4 @impl EXA-010: Ran `node openspec/governance/check-project-specs.mjs` successfully: 0 violations, including 0 deltaHeaderInMain, 0 missingPurpose, 0 missingRequirements, and 0 missingReqHeader findings.

## 4. Archive Review

- [x] 4.1 @impl EXA-010, VER-001 openspec-feedback:closeout-review: Reviewed the scoped manifest-reader, Case 224/225 quarantine assets, static contracts, main-spec sync, and governance evidence. No actionable finding remains: the static contracts establish only routing/manifest behavior, and no native Agent case was launched or claimed.
