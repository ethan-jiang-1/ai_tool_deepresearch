# Current-Contract Signal Cleanup: Coverage Ledger

> Status: audit coverage complete; individual cleanup decisions pending
>
> Purpose: prove audit coverage before any new cleanup proposal, not count keyword hits as evidence.

This ledger is the anti-omission control for the current-contract cleanup. A
family is not `closed` merely because it has a change card, a grep result, or a
candidate deletion. It is closed only when every known candidate in that family
has an owner-based classification and any remaining uncertainty is recorded as
a bounded next investigation.

## Classification Vocabulary

| Classification | Meaning |
|---|---|
| `bounded cleanup candidate` | A concrete current surface may be removed or rewritten after its own proposal gate. |
| `protected current semantic` | Required current runtime, recovery, provenance, experiment, or guidance behavior; not a cleanup target. |
| `current rejection boundary` | A current contract intentionally rejects old/malformed input; retain or rewrite only as current observable behavior. |
| `history-only documentation` | Archive/tombstone material that does not present a positive current path. |
| `false positive / not applicable` | Token resembles version/history/compatibility language but is unrelated to legacy support. |
| `unresolved` | A producer, reader, owner, or consequence is still unknown. It blocks the global proposal gate. |

## Scope Evidence

| Primary surface | Mechanical inventory | Semantic classification status |
|---|---:|---|
| `DEEP_RESEARCH_HARNESS/` | 227 tracked files: 222 non-empty assets plus 5 empty placeholders/templates | complete: file-level inventory and candidate-cluster classification assign every broad-scan term an owner/disposition |
| accepted `openspec/specs/**/spec.md` | 85 specs enumerated and classified one by one | complete: per-spec current owner/action inventory; individual C1-C6 facts are linked without treating keyword hits as evidence |
| root `CONTEXT.md` | directly read with routing/test/link context | complete: bounded glossary remains protected; future C8 wording work is a policy slice, not an unclassified audit gap |
| direct supporting surfaces | root `AGENTS.md`, `openspec/config.yaml`, `CHANGELOG.md`, focused tests/playbooks coupled to each candidate | complete: direct routing/governance and candidate-coupled verification surfaces have owner classifications |

The audit intentionally does not inspect `.exp-bundles/` or other prohibited
backlog/run-bundle paths without explicit user authorization.

## Family Ledger

| Family | Known-surface status | Classification result | Remaining work before global closure |
|---|---|---|---|
| C1 inactive contract surfaces | audit closed | C1a archived; C1b/C1c/C1e bounded candidates; C1d/C1f need explicit product/invariant decisions; gate-loop/fork and return-map are protected; bundle entry belongs to C3 | individual user approval and each card's own proposal gate |
| C2 internal versioning / entry history | audit closed | C2a, C2b, and C2c are governed-archived; C2b retired the writer-only stamp before C2c retired the governance choreography; Harness-local changelog allowance is fixture-only false positive; schema discriminators remain protected/other-family | C2 has no remaining target work; next queue item is C3's single policy/design decision |
| C3 bundle entry compatibility | audit closed | current writer emits `BUNDLE_ENTRY.md` + `BUNDLE_MAP.md`; `RUN_BUNDLE.md`, map-only, and `START_FROM_HERE.md` remain positive/non-blocking through guidance/CLI/tests; no shared entry predicate exists | one user policy/design decision; proposal must choose one rejection owner and synchronize the copied inspector fixture/specs |
| C4 profile/topic compatibility | audit closed | C4a legacy profile envelope has no current writer; HITL1 is its semantic reader while shared validators become rejection consumers. C4b legacy plan migration is distinct from current `previous_layouts[]`; active execution already requires canonical plans. Current direct-sample statuses and layout lineage are protected. | two independent user decisions; each proposal must select one old-input rejection owner and preserve the recorded C4a/C4b regression paths |
| C5 reference / experiment formats | audit closed | Wave1 UID handoff and C5b retained-history reader fanout are closed. C5a-1b confirms selected multi-Topic Wave2 references are a current required output shape; `related_topic: cross-topic` is an advisory-only invalid binding, not a valid writer contract. Scalar UID/all cannot replace exact subsets; C5a-2 remains blocked by the current binding and historic-reader policies. | separate user decisions for C5a-1b cardinality, C5a-1 writer-only cleanup, C5a-2 historic-reader policy, and C5b retained-history policy; do not inspect unauthorized bundles |
| C6 work-unit historical contracts | audit closed | C6a explicit assignment v1/v2, C6b markerless submitted attempt, C6c unrecorded actor provenance, and C6d transaction v1 each have complete reader fanout. Current writers use assignment v3, marked submission v1, actor v1, and transaction v2; accepted read-only historical behavior still exists and no deletion conclusion follows. `legacy_non_work_unit_rows` is a protected C6b safety diagnostic. | choose C6a-C6d one at a time; preserve the separate active mutation, recovery, inspection, provenance/Gate, safety scanning, and old-artifact consequences |
| C7 main specs as current state | audit closed | all 85 specs have a direct owner/classification inventory; historical language is a later rewrite concern, not an unknown spec surface | wait for runtime policy decisions, then rewrite only the accepted specs affected by applied changes |
| C8 context / routing | audit closed | `CONTEXT.md` is a bounded glossary, and direct root/Harness routing and literal Markdown tests are classified | wait for C3/C7 behavior facts, then make a small wording/routing slice |
| Other broad-scan clusters | audit closed | fallback, version discriminator, recovery/history, and current rejection terms are classified as protected semantics, rejection boundaries, or false positives | no unowned cluster remains; future discovery is added as a new bounded row |

## Global Gate

- [x] Every broad-scan candidate cluster has a family owner and one classification.
- [x] Every accepted main spec has a direct per-spec classification record.
- [x] Every current-positive historical/compatibility reader has a producer-reader consequence trace.
- [x] Every protected current semantic has a named owner and does not remain in a deletion candidate bucket.
- [x] `CONTEXT.md` and directly affected routing/test surfaces have current-owner classifications.
- [x] Unclassified candidate count: **0**.

The Global Gate now permits an individually approved slice to enter proposal.
It does not approve that slice: the user must still decide its policy where a
card requires one, and the card's own Go / No-go evidence must still hold. The
already archived C1a/C2a slices remain historical exceptions, not a precedent
for proposal-first discovery.
