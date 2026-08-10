## 0. Apply Gate

- [x] 0.1 `openspec-feedback:plan-review` - Reviewed `proposal.md`, `design.md`, this task list, `verification-plan.yaml`, and `semantic-closure.yaml` against the current accepted work-unit, Gate, and routing sources before the first target edit. The stale owners are test fixtures and static expectations; `semantic-closure: not_applicable` remains accurate because no runtime fact family, resolver, or production behavior changes. The malformed routing claim is recorded as task 0.2; no other actionable planning finding remains. Completed 2026-08-10.
- [x] 0.2 `VER-001` plan-review finding - Authoritative owner: the `verification-routing/v1` change-local record. Smallest repair: give every selected claim one complete singular `asset` declaration and remove duplicate fields. Done when strict OpenSpec validation, plan requirement governance, verification-routing plan validation, and semantic-closure plan validation all pass without being presented as runtime proof. Completed 2026-08-10: all four checks pass; these structural results are not runtime proof.

## 1. Work-Unit Contract Fixtures

- [x] 1.1 Repair current Wave0/Wave1 work-unit fixtures to derive and submit the real `work-unit.assignment.v3` envelope, exact required outputs, canonical roles, receipt, cache, and terminal ledger facts (DEW-013, DEW-025, AGO-007, TEF-001). Done when `work-unit-playbook-utils`, `BUG-088 declaration recovery`, and `case-406 native Sub-agent` focused suites pass without weakening submit validation. Completed 2026-08-10: the three focused suites passed 9/9.
- [x] 1.2 Update generated work-unit guidance assertions and fixture result writers from retired assignment v2/reference vocabulary to current v3/source_yaml/evidence_summary/question_list vocabulary (SNC-006, DEW-021). Done when `generated direct-output guidance` and all affected work-unit static assertions pass. Completed 2026-08-10: the focused group passed 15/15.

## 2. Lifecycle And Wave Fixtures

- [ ] 2.1 Complete Gate-chain, handoff-witnessing, and post-final fixtures through the existing style writer or current `research_style_params` projection before asserting HITL1/rerun readiness (RES-002, RES-007, PRG-002, POF-001). Done when each suite's earliest style root is absent and its downstream status/phase/trace assertions pass.
- [ ] 2.1a Handoff plan-review finding - Authoritative owner: the existing Wave0 submitted-contribution and canonical seed-projection operations. Smallest repair: after the fixture's first real Wave0 submit, materialize its exact source identity into the Phase-owned reference and `wave0_evidence` slot before the expected passing Gate attempt. Done when the diagnostic attempts retain their intended failures and the repaired Wave0 Gate advances without a raw seed edit or duplicate queue demand.
- [ ] 2.2 Bring dynamic-threshold Wave1 fixtures to current canonical Topic identity, depth-review, submitted-backing, and reference-floor prerequisites while retaining the intended count-floor failure (CTS-001, CTS-008, RES-003, RWG-016). Done when the inspect output contains only the intended threshold-10 diagnostic.
- [ ] 2.3 Repair carried-target receipt fixtures with current identity-bound Projection Entries, supported return-map statuses, matching submitted terminal snapshots, and strict receipt persistence facts (GSK-012, TRW-006, WPG-013, STM-007). Done when all six previously failing Wave1 receipt subtests pass and negative receipt cases still fail for their intended root.
- [ ] 2.4 Align the topic-state invalid-input assertion with the accepted blocked-result exit-code contract while preserving the active-work and crash-recovery checks (CLE-002, CTS-004). Done when the direction suite passes without changing `operate-topic-state.mjs`.

## 3. Static And Documentation Assertions

- [ ] 3.1 Update command/setup/artifact/version assertions to derive current release and accepted wording rather than pinning retired versions or prose (CLE-001, CLE-003). Done when command contract docs, setup preflight docs, and artifact persistence contract suites pass.
- [ ] 3.2 Align Wave2 and Seed Topic Markdown assertions with current token lifecycle, producer-rule, priority, and contribution-aware projection guidance (RWP-003, WAI-005, STM-007). Done when the Wave2 structure, queue-loop, and seed-topic projection document suites pass without changing production guidance solely for an old test.
- [ ] 3.3 Update verification-routing knowledge-surface assertions to point at the accepted routing spec and current Agent cost terminology (VER-001, VER-005). Done when all three routing knowledge-surface subtests pass and no retired peer taxonomy is reintroduced.
- [ ] 3.4 Update the active Wave1 rule-count assertion and remaining current direct-output/static contract expectations from historical values to executable definitions (RWG-005, SNC-006). Done when schema and static contract suites pass and the asserted count is derived from the active definition.

## 4. Verification And Closeout

- [ ] 4.1 Run every repaired focused test file plus the current-contract comparison set; record native `node:test` pass evidence and confirm no test-owned bundle or debug output is tracked (VER-002, VER-003).
- [ ] 4.2 Run `npm test`; done condition is zero failed and zero skipped tests with the existing 2746-test inventory, without modifying production Harness behavior.
- [ ] 4.3 Run `node openspec/governance/check-project-reqs.mjs --mode archive --change repair-deterministic-regression-fixtures`; done condition is PASS with zero duplicate, orphan, unregistered, and reused-retired requirement IDs.
- [ ] 4.4 Run `node openspec/governance/check-project-specs.mjs`; done condition is PASS with no malformed main-spec deltas or missing requirement headers.
- [ ] 4.5 `openspec-feedback:closeout-review` - Before archive, review the actual change-scoped diff, repaired fixture/assertion boundaries, selected test evidence, verification plan, and semantic-closure record. Record every actionable finding as an ordinary unchecked task with its authoritative owner, smallest repair, and independently observable done condition; complete only when no such finding remains.
