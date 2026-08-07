## 0. Plan Review

- [x] 0.1 @impl RWP-002, AGT-003, VER-001 openspec-feedback:plan-review: Review the proposal, design, skipped-spec boundary, retained batch `55d4273e-c0b1-4bcc-99b8-35ef55818a9c`, current Step 2/test, and verification plan before the first target edit. Record each actionable finding as an ordinary unchecked task with its reader question, authoritative owner, smallest repair, and observable done condition.

## 1. Verification Routing And Fallback Baseline

- [x] 1.1 @impl VER-001, VER-006: Create `verification-plan.yaml` with the focused integration contract and registered real-Agent Case 225 playbook as separate claims, then run `node openspec/governance/check-verification-routing.mjs --change align-case-225-child-unavailability-not-run --mode plan`. Done when route validity does not treat the prior FAIL or a future NOT_RUN as child-behavior proof.
- [x] 1.2 @impl RWP-002, AGT-003: Read the retained Engine actor record, Case 225 policy, and current Step 2. Done when the exact unavailable fallback tuple and process-exit-only classification gap are recorded, with actor policy and Queue behavior excluded from repair scope.

## 2. Classify The Declared Unavailable Boundary

- [x] 2.1 @impl RWP-002, AGT-003: Extend `tests/integration/md/case-225-returned-work-closeout-contract.test.mjs` to require Step 2 to inspect the Engine index for the exact `phase_agent_fallback` / `delegated_subagent` / `dpt-evidence-extractor` / unavailable tuple and send it through the existing marker. Done when it fails against the current process-exit-only setup without a live bundle.
- [x] 2.2 @impl RWP-002, AGT-003: In `experiments_playbook/exp_wfn_wave1/case-225-heavy-returned-work-closeout.md`, after a successful Subject process, read the current Engine index and write the existing unavailable marker only for the exact required-child fallback tuple. Done when all other records retain current behavior, the marker skips Step 3, and Step 4 uses the existing `NOT_RUN` branch without a fallback-as-child claim.

## 3. Verify And Retain The Native Result

- [x] 3.1 @impl RWP-002: Run the focused Case 225 integration contract, `validate-playbook` for the registered asset, and exact-case Autorun dry-run. Done when static classification and asset registration pass without being presented as child-behavior evidence.
- [x] 3.2 @impl RWP-002, AGT-003, VER-006: Applied the user-directed extreme-slow quarantine instead of launching Case 225. Its post-repair native `NOT_RUN` boundary remains unobserved and is not reported as child behavior; any future proof requires a separately proposed refactor, runnable relocation, manifest registration, and native evidence.
- [x] 3.3 @impl RWP-002: Updated the Gate/Schema/Queue remediation tracker with the classification correction, quarantine, and separate static/native/unresolved-evidence state. It does not promote a NOT_RUN, fallback, static contract, or cancelled run into an independent-child behavior claim.

## 4. Closeout And Governance

- [x] 4.1 @impl VER-001: `openspec validate align-case-225-child-unavailability-not-run --strict` and verification-routing assets both passed; the selected static asset is valid and no Agent execution was selected.
- [x] 4.2 @impl VER-001: `node openspec/governance/check-project-reqs.mjs` passed with 0 orphan requirement IDs and no duplicate, unregistered, or reused-retired findings.
- [x] 4.3 @impl VER-001: `node openspec/governance/check-project-specs.mjs` passed with 0 violations, including 0 deltaHeaderInMain, 0 missingPurpose, 0 missingRequirements, and 0 missingReqHeader findings.
- [x] 4.4 @impl RWP-002, AGT-003, VER-001 openspec-feedback:closeout-review: Re-reviewed after the archive preflight's capability-discovery metadata repair. The valid header restored archive conformance and introduced no new native-proof, scope, or evidence finding.
- [x] 4.5 @impl VER-001: Normalized the Capability Discovery table header and reran the checker successfully for `align-case-225-child-unavailability-not-run`.
