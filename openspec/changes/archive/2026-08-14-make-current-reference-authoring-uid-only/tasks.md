## 0. Apply Entry Review

- [x] 0.1 @impl REF-002, REF-003, REF-007, CTS-007, FIO-006, IOC-001, IOC-002, IOC-003, RTI-001, RWP-015, RWP-016 `openspec-feedback:plan-review` - Before the first target edit, review proposal, six deltas, design, semantic closure, verification plan, shared metadata/parser adapter, all named verdict consumers, Wave writer guidance, and historical-reader tests. Record each actionable finding as an ordinary pending task with owner, smallest repair, and observable done condition; complete only when none remains.

- [x] 0.2 @impl CTS-007 - Plan-review finding. Owner: `wave.submitted-reference-convergence` semantic closure record. Smallest repair: record `gate-helpers-checks.mjs#readReferenceMetadata` as an `established_by` surface because it preserves the structured YAML array consumed by the canonical resolver. Done when semantic closure names both the metadata input boundary and the resolver, and the semantic-closure plan checker passes.

## 1. Canonical Binding And Readers

- [x] 1.1 @impl CTS-007, REF-002, REF-007 - Preserve `related_topic_uids` YAML arrays at the reference-binding boundary and extend the shared canonical adapter for mutually exclusive scalar/all/exact-subset forms. Reject empty, duplicate, unknown, malformed, or conflicting forms with one direct binding result; retain `related_topic` historical-reader behavior unchanged.
- [x] 1.2 @impl FIO-006, FIO-007, IOC-001, IOC-002, IOC-003 - Update Gate/inspect feedback, file observability, and reference-index synchronization to consume the shared subset conclusion, surface the correct binding coordinate, and render an index navigation label without making that projection authority.
- [x] 1.3 @impl REF-002, REF-003, CTS-007 - Add focused unit/integration coverage for structured-array preservation, exact two-Topic binding, invalid array roots, unchanged legacy reader success, index behavior, and no unrelated third-Topic observability footprint.

## 2. Current Writer Cutover

- [x] 2.1 @impl REF-002, REF-007, RWP-015, RWP-016, RTI-001 - Update shared reference template, optional evidence-extractor example, and Wave0/Wave1/rerun guidance to teach only all or scalar UID current output forms; preserve legacy reader-only wording where it describes existing historical input rather than a new writer choice.
- [x] 2.2 @impl RWP-015, RWP-016, RTI-001 - Update Wave2 `00-cross-*` current materialization guidance to derive and write the exact UID subset from existing finding/materialization facts, without a `W2F-*` metadata join or `all` broadening; add static guidance characterization coverage.

## 3. Specification And Verification

- [x] 3.1 @impl REF-002, REF-003, REF-007, CTS-007, FIO-006, IOC-001, IOC-002, IOC-003, RTI-001, RWP-015, RWP-016 - Sync each delta requirement into its accepted main spec with complete heading-bounded replacement or approved requirement addition; do not alter C5a-2 historical-reader policy.
- [x] 3.2 @impl REF-002, CTS-007, FIO-006, IOC-003, RWP-015 - Run every selected verification-plan asset, `node DEEP_RESEARCH_HARNESS/cli/validate-workflow-package.mjs`, `git diff --check`, strict change validation, plan-mode requirement governance, verification-routing, semantic-closure, and capability-discovery checks. Record only actual deterministic evidence.
- [x] 3.4 @impl RWP-015, RWP-016, RTI-001 - Closeout-review finding. Owner: `wave.submitted-reference-convergence` semantic closure record. Smallest repair: record the changed evidence-extractor, Wave0, Wave1, and rerun guidance as `overlap: derived` projections of the shared binding conclusion, not verdict consumers. Done when the closure record covers every changed writer-guidance surface and the semantic-closure plan checker passes.
- [x] 3.3 @impl REF-002, REF-003, REF-007, CTS-007, FIO-006, IOC-001, IOC-002, IOC-003, RTI-001, RWP-015, RWP-016 `openspec-feedback:closeout-review` - Before archive, review the scoped actual diff, selected evidence, delta/main sync, and semantic-closure roles against implemented surfaces. Add/close ordinary repair tasks for findings; complete only when no actionable finding remains.

## 4. Archive Preconditions

- [x] 4.1 @impl REF-002, REF-003, REF-007, CTS-007, FIO-006, IOC-001, IOC-002, IOC-003, RTI-001, RWP-015, RWP-016 - Compare every modified delta requirement/scenario with its accepted main-spec block and run `node openspec/governance/check-project-reqs.mjs --mode archive --change make-current-reference-authoring-uid-only`. Done when modified blocks match and the check reports zero duplicate, orphan, unregistered, or reused-retired IDs.
- [x] 4.2 @impl REF-002, REF-003, REF-007, CTS-007, FIO-006, IOC-001, IOC-002, IOC-003, RTI-001, RWP-015, RWP-016 - Run `node openspec/governance/check-project-specs.mjs`. Done when it reports zero delta-header-in-main, missing-purpose, missing-requirements, and missing-requirement-header findings.
- [x] 4.3 @impl REF-002, CTS-007 - After all prior tasks and review-created repair tasks are complete, mark this archive-transition task complete immediately before invoking `node openspec/governance/finalize-change-archive.mjs --change make-current-reference-authoring-uid-only`. If it fails, restore this task to unchecked and repair its named root.
