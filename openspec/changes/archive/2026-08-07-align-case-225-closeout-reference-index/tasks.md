## 0. Plan Review

- [x] 0.1 @impl RWP-002, VER-001 openspec-feedback:plan-review: Reviewed the proposal, design, skipped-spec boundary, retained Case 225 native failure, current observer/test, and verification plan. No additional scope finding: the closeout index is the direct reader source, and Queue, Subject, Phase, and native-finalizer authorities remain unchanged.

## 1. Verification Routing And Failure Baseline

- [x] 1.1 @impl VER-001, VER-006: Created `verification-plan.yaml` with the existing focused integration contract and registered real-Agent playbook as separate claims, then ran `node openspec/governance/check-verification-routing.mjs --change align-case-225-closeout-reference-index --mode plan` (passed). Route validity does not claim that the prior native failure or a future run has passed.
- [x] 1.2 @impl RWP-002: Read retained batch `301f8362-bb7e-43c0-9669-260392759c16`, the Case 225 observer, and the current closeout index. The index has two `materialized_reference_refs` and no `reference_refs`; the observer reads the retired field, while Queue, Subject, and Phase behavior are outside repair scope.

## 2. Align The Closeout Index Reader

- [x] 2.1 @impl RWP-002: Extended `tests/integration/md/case-225-returned-work-closeout-contract.test.mjs` to isolate the Case 225 observer, require `closeout.materialized_reference_refs`, and reject `closeout.reference_refs`. Against the stale observer it failed only because the current field was absent.
- [x] 2.2 @impl RWP-002: In `experiments_playbook/exp_wfn_wave1/case-225-heavy-returned-work-closeout.md`, replaced the stale observer field with `closeout.materialized_reference_refs` and retained path resolution/existence checks. No fallback, lower threshold, Queue change, Subject instruction change, or Phase/Engine behavior change was introduced.

## 3. Verify And Observe The Registered Case

- [x] 3.1 @impl RWP-002: Ran the focused Case 225 integration contract (6/6 passed), `validate-playbook` for the registered asset (1/1 passed), and exact-case Autorun dry-run (one exact Case 225 selection). These establish static reader alignment and registration only, not Subject-Agent evidence.
- [x] 3.2 @impl RWP-002, VER-006: Ran exactly `case-225-heavy-returned-work-closeout` under the user-authorized `$185.317060` cap and 1,800,000 ms timeout. Batch `55d4273e-c0b1-4bcc-99b8-35ef55818a9c` completed native `FAIL`, health `ISSUES`, and `$0.405742` cost. The corrected submitted-closeout and inspect checks passed; the required-child check alone failed because Engine recorded `probe_host_policy_blocked` and `phase_agent_fallback`.
- [x] 3.3 @impl RWP-002: Updated the Gate/Schema/Queue remediation tracker with the delivered reader correction, native proof that submitted closeout now passes, revised remaining budget, and the separate required-child `NOT_RUN` classification follow-up. It does not claim broad H1-H4 adherence from this one case.
- [x] 3.4 @impl RWP-002: Create the separate no-spec-delta `align-case-225-child-unavailability-not-run` proposal. Reader question: when the Engine records an unavailable required child and `phase_agent_fallback`, does Case 225 produce its declared native `NOT_RUN` rather than a false behavioral `FAIL`? Authoritative owner: Step 2's observed actor-execution boundary. Smallest repair: add a focused static contract and classify that direct fact before Step 3/finalization. Done when the proposal excludes Queue, child availability policy, Phase behavior, and any fallback-as-success claim.
- [x] 3.5 @impl RWP-002: Retained batch `e98ab2dc-e863-44a1-b007-cdab47567496` exposed a separate reader question: do Case 225's Subject-written child and closeout indexes use the exact keys the observer consumes? Authoritative owner: the existing Subject instruction plus the observer's Engine-index binding. Smallest repair: create no-spec-delta `align-case-225-closeout-summary-contract`; done when that proposal limits scope to explicit key production and direct Engine identity consumption, excluding Queue, child policy, Phase behavior, and finalization.

## 4. Closeout And Governance

- [x] 4.1 @impl VER-001: `openspec validate align-case-225-closeout-reference-index --strict` and verification-routing assets both passed; the selected static asset is valid and no Agent execution was selected.
- [x] 4.2 @impl VER-001: `node openspec/governance/check-project-reqs.mjs` passed with 0 orphan requirement IDs and no duplicate, unregistered, or reused-retired findings.
- [x] 4.3 @impl VER-001: `node openspec/governance/check-project-specs.mjs` passed with 0 violations, including 0 deltaHeaderInMain, 0 missingPurpose, 0 missingRequirements, and 0 missingReqHeader findings.
- [x] 4.4 @impl RWP-002, VER-001 openspec-feedback:closeout-review: Re-reviewed after the archive preflight's capability-discovery metadata repair. The valid header restored archive conformance and introduced no new native-proof, scope, or evidence finding.
- [x] 4.5 @impl VER-001: Normalized the Capability Discovery table header and reran the checker successfully for `align-case-225-closeout-reference-index`.
