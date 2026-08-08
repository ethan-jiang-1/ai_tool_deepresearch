# P3: Reader Evidence Projection

> OpenSpec change: present-topic-baseline-and-increment-evidence
> Status: archived as 2026-08-08-present-topic-baseline-and-increment-evidence
> Dependencies: P0 complete; P2 archived as
> 2026-08-08-add-traceable-topic-focus-coverage; P3 finalizer checks passed.

## Goal

Give a report reader a compact, provenance-backed way to distinguish:

1. shared foundation, Topic-specific evidence, and cross-Topic synthesis; and
2. each current canonical Topic focus outcome from its direct profile and
   depth-review facts.

The projection deliberately keeps those questions separate. It does not
attribute a baseline or current focus increment to an individual reference
file without a separate accepted direct binding, and it never asks readers
to infer allocation from filename prefixes, file counts, byte counts, or a
seed-navigation shortcut.

## Authority Boundary

Submitted evidence, canonical Topic state, receipts, and the relevant
Wave/rerun artifacts remain the Source of Record. A reader-facing Evidence
Map, index, card, or timeline is a derived projection over those facts. It
must link back to durable coordinates rather than create a duplicate evidence
ledger or silently reclassify an accepted item.

The exact presentation vehicle remains the P0 decision. This change may alter
an existing projection only after its design shows that the chosen reader can
answer the bounded question without reconstructing the run from raw files.

## Scope Lock

In scope:

- present the P0-approved reader model using direct provenance-backed
  coordinates from the actual accepted evidence and rerun records;
- distinguish evidence relationship (shared, Topic-specific, cross-Topic,
  or unknown) from one separate Topic-level current focus outcome, without
  inferring a per-reference work era;
- visibly preserve no-new-increment, partial, blocked, and unknown/absent
  cases rather than treating them as successful additional research;
- make a small, reader-oriented entry point that remains compatible with the
  existing final delivery and return-map surfaces.

Out of scope:

- a second authority for evidence, Topic state, receipt, coverage, or rerun
  history;
- inferred effort/quality scores from file count, bytes, line count, filename
  prefixes, or `scope_role`;
- changing baseline source floors, focus-coverage semantics, Gate routing, or
  research methods;
- moving or rewriting historical evidence solely to improve the display;
- a dashboard, a new user interaction, or a new lifecycle checkpoint.

## Candidate Capability Discovery

The formal proposal must repeat discovery against the then-current main specs
and actual P2 output. Current planning candidates are:

| Capability | Initial disposition | Reason |
| --- | --- | --- |
| `bundle/reference-flat-format` | Modify | Owns the reader-facing reference projection whose filename grouping is currently misleading. |
| `research/final-delivery-backing` | Modify or Verify-only | May own the final-delivery links to the new projection; modify only if the reader cannot reach it otherwise. |
| `research/research-return-map` | Modify or Verify-only | May own the navigation from report claims to accepted evidence coordinates. |
| `research/research-wave-phase-content` | Verify-only or Modify | Revisit only if the accepted producer needs a minimal, legal display classification not already available in submitted facts. |
| `workflow/rerun-topic-integration` | Verify-only | Rerun provenance must remain authoritative without widening rerun behavior. |
| `bundle/file-observability` | Verify-only | Use existing observability contracts to inspect the projection; do not turn presentation checks into evidence authority. |

## Definition of Ready

- [x] P0 records the selected reader, their bounded question, and the
  presentation distinctions that must remain visible.
- [x] P2 is archived and its actual focus-coverage/rerun coordinates are
  known; P3 does not invent labels for facts P2 did not establish.
- [x] The supplied-bundle ambiguity is reproduced from the current accepted
  projection or a documented compatibility equivalent, with the direct
  Source-of-Record coordinates recorded beside it.
- [x] Current candidate main specs and any active overlap have been read and
  the proposal records a complete capability-discovery table.
- [x] The proposal can state why one derived projection is sufficient and why
  a second ledger, reader score, or new file hierarchy is unnecessary.

## Progressive Checklist

### Proposal and design

- [x] Create a Chinese proposal that names the reader question, direct Source
  of Record, non-goals, version-bump assessment, and the parent-plan/evidence
  coordinates.
- [x] Re-run capability discovery and classify every candidate as Modify,
  Verify-only, Excluded, or New. Declare a new capability only when inspected
  contracts leave no current owner for an observable behavior.
- [x] Write the semantic-precision reflection for the projection: which reader
  can answer which bounded question, which relationship and era distinctions
  remain visible, and how the reader reaches a normal answer or explicit
  unknown without examining raw paths.
- [x] Specify the shortest direct-fact control loop: accepted evidence/rerun
  coordinate -> derived entry -> direct navigation/diagnostic. Keep the
  presentation out of Gate authority and avoid a parallel reconciliation loop.
- [x] Specify treatment for shared, Topic-specific, cross-Topic, baseline,
  current increment, historical context, absent increment, `partial`, and
  `blocked` only where authoritative facts support each label.
- [x] Create a closed `verification-plan.yaml` and `tasks.md` with requirement
  IDs, independent done conditions, and the required plan-review/closeout
  feedback markers.

### Apply and evidence

- [x] Complete plan review before any target edit.
- [x] Implement the smallest selected projection and its direct navigation
  links; retain the original submitted evidence coordinates and do not make
  presentation files writable runtime truth.
- [x] Add routed deterministic verification that each displayed classification
  resolves to an accepted direct fact, and that a missing/incomplete increment
  is not rendered as coverage.
- [x] Add a focused reader-path proof against real-shaped accepted evidence
  facts: shared, Topic-specific, and cross-Topic material must remain
  distinguishable even when existing filenames would group them misleadingly.
- [x] Add a rerun-shaped proof that historical baseline evidence and the
  current increment remain separately attributable. Do not use a file-count
  assertion as evidence of either quality or effort.
- [x] Run an `agent_flow_e2e` only if the selected change actually modifies an
  Agent-owned producing surface; otherwise document why deterministic routing
  is sufficient for this derived-reader view.
- [x] Record real commands, outputs, direct projection coordinates, and
  residual reader risks in the change rather than treating rendered Markdown
  as proof by itself.

### Closeout

- [x] Run the verification selected by the accepted routing plan, strict
  OpenSpec validation, requirement-traceability, main-spec, and
  verification-routing checks.
- [x] Conduct closeout review; turn every actionable finding into an ordinary
  unchecked repair task before archive.
- [x] Sync/re-compare accepted delta behavior with main specs where applicable,
  then archive through the governed finalizer.

## Exit Check

P3 is complete. The selected reader can distinguish a reference relationship
and see each current Topic focus status with direct coordinates. The
projection makes absent, partial, blocked, historical, and unknown outcomes
visible without mistaking them for completed focus work; it does not invent
a per-reference baseline or increment label.

No P4 is assumed. Resume planning only when real run evidence reveals a
separate unresolved reader question or a compatibility constraint that this
bounded projection cannot honestly address.
