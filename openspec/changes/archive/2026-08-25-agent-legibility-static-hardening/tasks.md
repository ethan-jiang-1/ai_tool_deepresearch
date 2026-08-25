## 1. Apply Readiness And Evidence Baseline

- [x] 1.1 Complete the selected-change plan review (`openspec-feedback:plan-review`) after reading the proposal, delta, design, verification plan, and semantic-closure record. Turn every actionable finding into an ordinary unchecked repair task with its owner, smallest repair, and observable done condition; complete those repairs and rerun every affected planning validation/governance check before the first target edit. (GCO-008)
- [x] 1.2 Run `node openspec/governance/check-verification-routing.mjs --change agent-legibility-static-hardening --mode plan` and `node openspec/governance/check-semantic-closure.mjs --change agent-legibility-static-hardening --mode plan`; repair and rerun every reported coordinate before the first target edit. (GCO-008)

## 2. Change-Placement Routing

- [x] 2.1 Add `openspec/guidance/models/where-new-behavior-goes.md` as a descriptive participation ladder (L0 configuration → L1 capability contract → L2 full capability seam → L3 core loop) mapped to this repository's seams, phrased with no normative MUST/MUST-NOT and stating that normative effect is owned by the applicable accepted spec. (GCO-008)
- [x] 2.2 Add a Route By Trigger row in `openspec/README.md` (Control Map) that routes a change-placement question to `openspec/guidance/models/where-new-behavior-goes.md`. (GCO-008)

## 3. Deterministic Coverage

- [x] 3.1 Run `npm run governance:check` and confirm `check-guidance-pointer-targets.mjs` scans the new ladder document and reports clean; record no unrelated failures. (GCO-008)

## 4. Review, Sync, And Governed Archive

- [x] 4.1 Complete the change-scoped closeout review (`openspec-feedback:closeout-review`) after reviewing the actual diff, the semantic-closure record, and the selected verification evidence; leave no open finding. (GCO-008)
- [x] 4.2 Synchronize the approved GCO-008 delta to the main spec through the supported Agent-owned route, then re-compare delta/main semantics and rerun affected governance checks. (GCO-008)
- [x] 4.3 Run `node openspec/governance/check-project-reqs.mjs --mode archive --change agent-legibility-static-hardening` and `node openspec/governance/check-project-specs.mjs`; both must PASS before archive. (GCO-008)
- [x] 4.4 After all earlier tasks and any review-created repair tasks are complete, mark this archive-transition task complete immediately before invoking `node openspec/governance/finalize-change-archive.mjs --change agent-legibility-static-hardening`. If it returns non-zero, restore this task to unchecked and repair its named root. Done when the governed finalizer reports native archive success. (GCO-008)
