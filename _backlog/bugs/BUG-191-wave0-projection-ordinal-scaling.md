# BUG-191: Wave0 return_map_current_candidate_omission requires per-source projection entries (O(N) scaling)

**Status**: open
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
