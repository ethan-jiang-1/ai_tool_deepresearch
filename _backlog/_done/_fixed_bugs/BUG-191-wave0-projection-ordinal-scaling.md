# BUG-191: Wave0 return_map_current_candidate_omission requires per-source projection entries (O(N) scaling)

**Status**: resolved by archived C1 — deterministic contract and focused verification complete; no real Actor adherence claim is made
**Severity**: P1 — blocks gate pass with impractical manual work
**Found**: 2026-08-03 during `agentic-rd-org-delivery-systems-2026` Wave0 execution

## Symptom

`check-gate-wave0-complete.mjs` and `inspect-wave0-output.mjs` report `return_map_current_candidate_omission` when a work unit collected N sources but the projection packet only has M < N entries. The gate requires one entry (or explicit deferred disposition) for EVERY ordinal position owned by the submitted work unit.

For topic 01 with 16 sources, the gate demands entries for positions /1 through /16. For topic 05 with 24 sources, /1 through /24.

## Root cause

`phase-wave0.md` §3.3 says: "retain one exact `<work_id>/N` entry or identity-bound deferred disposition for every candidate owned by that submitted contribution." The Engine interprets this literally — a single-entry projection that covers only position /1 is invalid; all positions must be accounted for.

## Impact

With 85 sources across 5 topics, the Phase Agent must create 85 projection entries (one per source ordinal). Each entry requires: `source_identity`, `entry_id`, `evidence_meaning`, `relationship`, `refs`, `status`, `next_hop`. This is impractical for normal runs and creates massive projection packets that are error-prone to author manually.

## Expected behavior

A single projection entry with `relationship: supports` and a ref to the full `source.yaml` should suffice to acknowledge the work unit's contribution. Alternatively, the gate should accept a batch-deferred marker for remaining positions (e.g., a single entry saying "positions 2-16 deferred to Wave1") rather than requiring N individual entries.

## Workaround

Must create individual deferred entries for every orphaned ordinal. Programmatic generation from source.yaml entry count.

## C1 Implementation (2026-08-04)

The archived C1 change,
[`materialize-wave0-submitted-references-and-batch-projections`](../../openspec/changes/archive/2026-08-04-materialize-wave0-submitted-references-and-batch-projections/),
keeps per-source coverage while removing repeated Phase authoring:

- One strict Wave0 `deferred_contribution` packet selects one current submitted
  contribution and carries only its limitation meaning and next hop.
- Before workspace creation, the existing topic-state writer derives every
  currently unprojected exact `<work_id>/<ordinal>` identity and atomically
  persists the established `defers` / `[none]` / `deferred` entries.
- Caller-selected ordinals, dispositions, refs, unsubmitted selectors, and
  collisions are rejected; equivalent replay stays idempotent and a later
  contribution remains separate. The batch selector is therefore input
  compression, not work-unit-level coverage.

Focused deterministic evidence from C1 includes
`tests/integration/cli/operate-topic-state-projection.test.mjs` (13 passing),
including `1..19` versus later `/20`, collision rejection, idempotent replay,
and explicit-entry compatibility. This does not prove a current real Actor used
the packet; no such adherence claim is needed to close the deterministic C1
route. C1 strict validation, main-spec sync, closeout review, and governed
archive all completed on 2026-08-04.
