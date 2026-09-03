# Design: Supersede Drops Inherited Retry Lineage On Fresh Successor Demand

## Context

See proposal.md — Why. Engine surface: `DEEP_RESEARCH_HARNESS/engine/work-unit-supersession.mjs`.

Current construction (`buildSupersessionSuccessorDemand`, :313) takes the predecessor's terminal-history
`item` and produces a fresh successor queue item whose lineage is:

```text
withoutSupersessionLineage(terminalItem.lineage)          # strips only the 5 supersession fields
  + supersession_of_* / supersession_root / supersession_tx_id (from the immutable relation)
```

`withoutSupersessionLineage` (:307) deletes exactly `WORK_UNIT_SUPERSESSION_LINEAGE_FIELDS`
(`queue.mjs`: supersession_of_work_id / supersession_of_queue_item_id /
supersession_accepted_ledger_record_hash / supersession_root / supersession_tx_id).

**Bug**: when the submitted predecessor is itself a retry successor (attempt_index ≥ 2), its terminal
`item.lineage` also carries `retry_of_work_id`, `retry_reason`, `attempt_index`. Those survive the copy.
The successor's queue_item_id is `supersession-<work_id>` (fresh), but `retry_of_work_id` still names the
attempt-1 parent whose own queue_item_id is the *old* queue item. `validateSuccessorRetryContinuation`
(:470) walks that edge, finds `parent.queue_item_id !== entry.queue_item_id`, and throws
`retry lineage parent <X> is missing for supersession-<Y>`.

## Goals / Non-Goals

**Goals:**
- `supersede` succeeds for an attempt-2+ submitted predecessor exactly like attempt-1, producing one fresh
  successor that carries the supersession relation but **no inherited retry-continuation lineage**.
- The fix is in successor-demand construction, so both the enqueue path and the read-back validator agree
  by construction.

**Non-Goals:**
- No new CLI, status, ledger, or schema-version change.
- No change to `validateSuccessorRetryContinuation` semantics for *legitimate* retry chains that the
  successor acquires later (its own timeout retries under the fresh queue identity).
- No mutation of existing run bundles or replay/backfill of already-broken rows (that is a run-level repair,
  out of this change).

## Decisions

### D1 — Strip retry-continuation fields at successor-demand construction

Introduce the retry-lineage field set next to `WORK_UNIT_SUPERSESSION_LINEAGE_FIELDS` and drop both sets in
`buildSupersessionSuccessorDemand`:

```text
lineage: {
  ...withoutRetryAndSupersessionLineage(terminalItem.lineage),
  supersession_of_work_id: ..., supersession_of_queue_item_id: ...,
  supersession_accepted_ledger_record_hash: ..., supersession_root: ..., supersession_tx_id: ...,
}
```

Rationale: the supersession successor is a fresh deepening demand under a fresh queue identity. Attempt
continuation (`retry_of_work_id`/`retry_reason`/attempt_index) is meaningless across queue identities; the
only legal retry parent for the successor is one it creates itself later. This makes
`validateSuccessorRetryContinuation` naturally take its existing `!retryOfWorkId` branch (fresh successor),
so no validator logic change is needed.

Alternatives considered:
- (a) Relaxing `validateSuccessorRetryContinuation` to tolerate a missing parent — rejected: it would admit
  a broken inherited edge into lineage state rather than preventing it, weakening the invariant that queue
  lineage retry edges always resolve under the same queue identity.
- (b) Refusing supersede for retry-attempts with a structured error — rejected: it leaves the affected rows
  (hollow placeholder or hash-drifted) with no legal exit, which is the user-facing impact this change is
  meant to remove.

### D2 — Single source of truth for lineage field sets

The retry fields currently appear as inline literals in `buildRetryDemand` and lifecycle retry creation.
This change adds one exported constant (mirroring `WORK_UNIT_SUPERSESSION_LINEAGE_FIELDS`) and uses it in
the supersession successor construction. It does not refactor every other retry builder in this change
(low-risk, additive); callers outside supersession keep their current literal construction.

### D3 — Semantic boundary

- Supersession eligibility (`evaluateWorkUnitSupersessionEligibility`) already allows retry-attempt rows;
  only the successor construction throws. So the change is one lineage-construction correction, not a new
  eligibility rule.
- Engine verdict stays deterministic: which lineage fields survive on a successor is an Engine-owned
  construction fact, not an Agent decision. No Agent/user responsibility change (helper-oriented review:
  no new user checkpoint).

### D4 — Semantic-precision reflection (touched named state: queue demand lineage content)

- **Reader / bounded question**: a fresh supersession successor queue item asks "what is this demand's
  attempt lineage?" The answer must be *a fresh deepening demand under a new queue identity*, never "a retry
  of the predecessor's attempt-1 on a different queue item". The bug was that the reader (lineage resolver /
  validator) received both answers at once and failed closed on the impossible one.
- **Distinction that must be preserved**: retry-of edges are only legal **within one queue_item_id's
  attempt chain**; supersession moves to a **new queue_item_id**. Inheriting retry-of across that boundary
  is not a legal edge — it is the same class of corruption the validator already rejects.
- **Normal reasoning stop**: successor lineage carries supersession_of_* (direct-parent edge) + non-retry
  lineage; any retry-of present on the successor must have been created by the successor's own timeout path
  (same queue identity). This is the stop; no further state is introduced.
- **Net simplification**: no new control layer, field, status, or command. The fix *removes* an impossible
  inherited edge at the single construction site, letting the existing acyclic-lineage validator do its
  designed job. Direct Source of Record: the immutable supersession relation (index) + the fresh successor
  demand (queue). Shortest legal loop unchanged: supersede → one successor → claim/submit.


## Risks / Trade-offs

- [Snapshot-hash coupling] → Successor snapshot hash derives from the constructed item; the read-back
  validator recomputes the expected demand with the same construction, so hashes agree. Covered by unit +
  integration assertions on the demand and on `resolveWorkUnitSupersessionLineage`.
- [Regression for legitimately-retried supersession successors] → A successor that itself times out is
  retried under its own queue item and gains retry lineage via the ordinary retry path, unchanged. Existing
  late-submit/lifecycle tests cover that chain; run them.
- [Field-set drift] → Constant exported next to the supersession constant; a focused unit test pins the
  exact set of lineage fields dropped, so future builders that must not leak retry lineage can reuse it.

## Migration Plan

- Code change is additive and only affects successor demand construction for retry-attempt predecessors
  (previously this path threw, so no on-disk state assumed the old broken successor).
- Rollback: revert the construction change; no data migration required.

## Open Questions

None.
