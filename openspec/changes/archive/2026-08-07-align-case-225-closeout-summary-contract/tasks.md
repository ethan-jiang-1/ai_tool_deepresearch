## 0. Plan Review

- [x] 0.1 @impl RWP-002, AGT-003, VER-001 openspec-feedback:plan-review: Review the proposal, design, skipped-spec boundary, retained batch `e98ab2dc-e863-44a1-b007-cdab47567496`, current runner/observer/test, and verification plan before the first target edit. Record each actionable finding as an ordinary unchecked task with its reader question, authoritative owner, smallest repair, and observable done condition.

## 1. Verification Routing And Failure Baseline

- [x] 1.1 @impl VER-001, VER-006: Create `verification-plan.yaml` with the focused integration contract and registered real-Agent Case 225 playbook as separate claims, then run `node openspec/governance/check-verification-routing.mjs --change align-case-225-closeout-summary-contract --mode plan`. Done when route validity does not treat the retained FAIL or a future NOT_RUN as Agent-behavior proof.
- [x] 1.2 @impl RWP-002, AGT-003: Read the retained runner instruction, Engine index, child index, closeout index, and observer. Done when the two ambiguous writer keys and observer's indirect `child.work_id` identity use are recorded, with Queue, child policy, Phase behavior, and native-finalizer behavior excluded from repair scope.

## 2. Align Case-Local Index Production And Consumption

- [x] 2.1 @impl RWP-002, AGT-003: Extend `tests/integration/md/case-225-returned-work-closeout-contract.test.mjs` to require exact Subject keys (`work_id`, `materialized_reference_refs`) and an Engine-index queue-item lookup that binds child/closeout indexes to `work.work_id`. Done when it fails against the current ambiguous producer/indirect observer without a live bundle.
- [x] 2.2 @impl RWP-002, AGT-003: In `experiments_env/shared/run-iterative-interaction-subject.mjs`, make Case 225's existing Subject message name the exact child/closeout path-index keys. Done when it does not add a schema, actor policy, fallback, retry, or Engine behavior.
- [x] 2.3 @impl RWP-002, AGT-003: In `experiments_playbook/exp_wfn_wave1/case-225-heavy-returned-work-closeout.md`, find the Engine work record by `case-225-primary-1` and require child/closeout identity equality before the existing actor, ledger, path, and finalizer checks. Done when alias fields and filesystem reconstruction are not accepted.

## 3. Verify And Retain The Native Result

- [x] 3.1 @impl RWP-002: Run the focused Case 225 integration contract, `validate-playbook` for the registered asset, and exact-case Autorun dry-run. Done when static producer/reader alignment and asset registration pass without being presented as Agent-behavior evidence.
- [x] 3.2 @impl RWP-002, AGT-003, VER-006: Applied the user-directed extreme-slow quarantine instead of launching Case 225. Post-repair native completion remains unobserved; the cancelled run and static contract are not substituted for real-child behavior. Any future proof requires a separately proposed refactor, runnable relocation, manifest registration, and native evidence.
- [x] 3.3 @impl RWP-002: Updated the Gate/Schema/Queue remediation tracker with the summary-contract correction, quarantine, and separate static/native/unresolved-evidence state. It does not promote an unobserved or failed condition into an independent-child behavior claim.

## 4. Closeout And Governance

- [x] 4.1 @impl VER-001: `openspec validate align-case-225-closeout-summary-contract --strict` and verification-routing assets both passed; the selected static asset is valid and no Agent execution was selected.
- [x] 4.2 @impl VER-001: `node openspec/governance/check-project-reqs.mjs` passed with 0 orphan requirement IDs and no duplicate, unregistered, or reused-retired findings.
- [x] 4.3 @impl VER-001: `node openspec/governance/check-project-specs.mjs` passed with 0 violations, including 0 deltaHeaderInMain, 0 missingPurpose, 0 missingRequirements, and 0 missingReqHeader findings.
- [x] 4.4 @impl RWP-002, AGT-003, VER-001 openspec-feedback:closeout-review: Reviewed the scoped producer/reader repair, quarantined playbook/test, cancelled historical run, tracker update, supersession artifacts, and static evidence. No new actionable finding: post-repair native completion remains unobserved and no static or cancelled result claims real-child behavior.
