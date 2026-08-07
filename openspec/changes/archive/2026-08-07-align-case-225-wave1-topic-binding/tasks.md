## 0. Plan Review

- [x] 0.1 @impl RWP-002, VER-001 openspec-feedback:plan-review: Reviewed the proposal, design, skipped-spec boundary, existing Case 225 producer/test, and verification plan before the first target edit. No actionable scope finding: Queue admission remains the authoritative strict identity owner; static and native claims remain separately routed.

## 1. Verification Routing And Baseline

- [x] 1.1 @impl VER-001, VER-006: Created the change-root `verification-plan.yaml`, selected the focused integration contract and registered real-Agent playbook as separate claims, and ran `node openspec/governance/check-verification-routing.mjs --change align-case-225-wave1-topic-binding --mode plan` (passed). Route validity does not claim completed runtime evidence.
- [x] 1.2 @impl RWP-002: Read Case 225's setup, `queueItemForWorkUnit()` default, and current contract test. The Topic uses `tp_22500000-0000-4000-8000-000000000001`, while the omitted helper argument defaults to `tp_00000001-0000-4000-8000-000000000000`; Queue admission correctly rejects that producer mismatch.

## 2. Bind The Case-Owned Topic

- [x] 2.1 @impl RWP-002: Extended `tests/integration/md/case-225-returned-work-closeout-contract.test.mjs` with a focused custom-Topic-UID assertion. Against the unbound playbook it failed only because `topic_uid: topic.topic_uid` was absent from the Queue helper call; the Topic and helper defaults remained distinguishable.
- [x] 2.2 @impl RWP-002: In `experiments_playbook/exp_wfn_wave1/case-225-heavy-returned-work-closeout.md`, passed `topic_uid: topic.topic_uid` into the existing `queueItemForWorkUnit()` call. The focused test now passes all five checks; no Queue/schema/helper behavior changed.

## 3. Verify The Boundary And Run The Registered Case

- [x] 3.1 @impl RWP-002: Ran the focused Case 225 integration contract (5/5 passed), `validate-playbook` for the registered asset (1/1 passed), and exact-case Autorun dry-run (one exact Case 225 selection). These establish static binding and registration only, not Subject-Agent behavior.
- [x] 3.2 @impl RWP-002, VER-006: Ran exactly `case-225-heavy-returned-work-closeout` under the user-authorized `$185.777558` cap and 1,800,000 ms timeout. Batch `301f8362-bb7e-43c0-9669-260392759c16` completed with native `FAIL`, health `ISSUES`, and `$0.460498` cost; its retained completion shows real-agent setup-only evidence and 3/4 expected checks passed. The failed submitted-closeout check is a distinct observer-field drift, not a timeout or substituted verdict.
- [x] 3.3 @impl RWP-002: Updated the Gate/Schema/Queue remediation tracker with the Topic-binding correction, native Case 225 result, revised remaining budget, and separate `align-case-225-closeout-reference-index` follow-up. It retains the failed native case result and does not make a broad Agent-adherence claim.
- [x] 3.4 @impl RWP-002: Created the separate no-spec-delta `align-case-225-closeout-reference-index` proposal for the Phase-closeout path-index reader drift. It names the retained native failure, direct `materialized_reference_refs` source, focused red/green contract, and excludes Queue, Subject, and Phase-Engine behavior changes.

## 4. Closeout And Governance

- [x] 4.1 @impl VER-001: Ran `openspec validate align-case-225-wave1-topic-binding --strict` and `node openspec/governance/check-verification-routing.mjs --change align-case-225-wave1-topic-binding --mode assets`; both passed for the skipped-spec planning artifacts and selected assets.
- [x] 4.2 @impl VER-001: Ran `node openspec/governance/check-project-reqs.mjs`; 630 registered IDs were consistent (0 duplicate, 0 orphan, 0 unregistered, 0 reusedRetired).
- [x] 4.3 @impl VER-001: Ran `node openspec/governance/check-project-specs.mjs`; 84 main spec files had 0 structural violations.
- [x] 4.4 @impl RWP-002, VER-001 openspec-feedback:closeout-review: Reviewed the scoped Topic-binding diff, focused red/green contract, registered-playbook checks, native batch `301f8362-bb7e-43c0-9669-260392759c16`, tracker update, and skipped-spec boundary. The only newly found reader drift is durably owned by `align-case-225-closeout-reference-index`; no open finding remains in this change's scope.
