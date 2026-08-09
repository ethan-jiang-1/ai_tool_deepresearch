## Context

See `proposal.md` for the incident motivation and the four delta specs for the
behavior contract. The relevant current Engine boundaries are already present:

- `work-unit-assignment-contract.mjs#resolveWorkUnitAssignmentContract` resolves
  Wave1 primary/supplementary `required_outputs[]`, but leaves an inherited
  `output_files.required` value able to contradict an empty supplementary
  assignment.
- `work-unit-validation.mjs#buildSourceRefLineage` establishes the formal
  current-or-prior submitted-output candidate set, while
  `validateSubmittedClaimBacking` in `wave1-reference-convergence.mjs` repeats
  only the current-output branch.
- `work-unit-supersession.mjs#evaluateNormalizedSubmittedWorkUnitLedger`
  explicitly returns both `facts` (current submitted rows) and `historical`
  (valid superseded predecessors), while `scanDelegatedBypassSuspicion` compares
  raw declaration rows to current rows without consulting the historical set.

This is a cross-module contract drift, but it changes no persisted data shape,
command, lifecycle state, or Agent-flow ownership.

## Goals

- Advance the current assignment contract to v3, so only new supplementary
  Wave1 attempts derive `output_files.required: false` from their resolved
  empty direct-output obligation while task/result projection and submit agree.
- Make source-reference authorization one pure Engine decision shared by
  dry-submit, formal submit, and Wave1 reviewed backing.
- Make bypass classification consume the normalized ledger's current/historical
  conclusion instead of reconstructing it from raw JSONL.
- Preserve fail-closed behavior for all adjacent invalid cases and provide
  focused proof at both resolver and CLI consumer surfaces.

## Non-Goals

- No new schema registry, runtime state, Gate, command, repair route, or
  migration of existing bundle records.
- No relaxation of primary direct-output content checks, source/cache receipts,
  valid ledger/hash requirements, or supersession lineage validation.
- No attempt to refactor every raw reader in the Harness. Raw history remains
  legal for display/diagnosis where it does not make a current/historical
  verdict.

## Decisions

### 1. v3 isolates the changed assignment interpretation

`work-unit.assignment.v2` is the current emitted marker. It reconstructs a
hash-bound output contract at submit and requires exact manifest/beacon parity;
changing its resolver would therefore invalidate a previously claimed v2
attempt. Apply will add `work-unit.assignment.v3` as the emitted marker for new
claims. v1 and v2 remain accepted historical markers and reconstruct their
recorded bound output contract without receiving v3's supplementary exception.
A markerless historical envelope retains its existing compatibility path.

An already claimed v2 supplementary attempt is not rewritten or silently
accepted under v3. It keeps its original contract and may follow its existing
terminal/replacement route; a newly claimed successor receives v3. This changes
no persisted record in place and adds no migration operation.

### 2. The v3 resolved assignment owns Wave1 declaration requiredness

For current `work-unit.assignment.v3` Wave1 contracts, assignment resolution
will derive the `output_files.required` flag together with `required_outputs[]`:
the primary pair requires declarations, while an explicit supplementary empty
set does not. This produces one contract object consumed by generated task,
result schema, dry-submit, and formal submit. v1/v2 immutable contracts retain
their bound behavior rather than being reconstructed under the new rule.

This fixes the supplementary Wave1 case directly. Wave2 continues to have no
direct-content blocker, but its existing base `output_files.required` behavior
is not inferred from an empty `required_outputs[]` set or changed by this work.
This does not say that an empty
`output_files[]` makes a result valid: source claims, accepted URLs, cache
trails, receipt and identity checks still execute normally.

Alternative considered: make generated supplementary tasks require a cache
directory as an `output_files[]` item. Rejected because cache trails already
have their own contract and declaration authority; reclassifying them as output
files adds a second meaning to the same path and makes task text conform to an
incorrect generic validator.

### 3. Source-ref authorization becomes a pure shared resolver

Extract the current validation branch around `buildSourceRefLineage` into one
pure helper that accepts the claimed manifest, current result output paths, and
candidate `source_ref`. It will return a structured current/prior authorization
result or the existing safe-path, missing authority, ambiguity, Topic, wave,
kind, or role failure. Its prior branch derives only from hash-valid
ledger/index/manifest/queue-topic facts and does not persist a projection.

`validateSourceClaims` will use the helper to retain formal submit behavior and
diagnostics. `resolveReviewedWave1SubmittedBacking` will pass the reviewed row's
manifest and output paths through the same helper before validating that row's
accepted URL and current cache/degraded bindings. Cache validation remains local
to the reviewed row because a legal prior source output does not authorize a
prior cache trail for a newly accepted claim.

The reviewed-backing reader will retain its existing physical source-path
availability check after authorization because a later canonical reference
projection cites that path. That check SHALL report a projection/backing root,
not reclassify a legal prior path as "not current output" or reimplement
current-or-prior authorization. Formal submit's acceptance provenance and the
reader's later projection availability remain separate facts.

Alternative considered: have depth review call submit validation wholesale.
Rejected because it would couple a read-only consumer to candidate-result and
receipt checks it does not own. The shared resolver is the smallest direct fact:
whether this `source_ref` has legal current or prior provenance.

### 4. Bypass consumes normalized `facts` plus `historical`

`scanDelegatedBypassSuspicion` will obtain the complete result of
`evaluateNormalizedSubmittedWorkUnitLedger`, not merely its current declaration
rows. The raw declaration comparison will exclude a row only when the
normalized evaluation names the exact raw work-id/hash pair in `historical`
with `ledger_disposition: hash_valid_historical`, its validated immutable
supersession relation, and matching successor lineage. All other raw-only rows
remain suspected. In particular, a historical entry with missing or
attributable-drift ledger evidence is not bypass suppression authority.

This deliberately does not hide malformed predecessors: if the normalized
evaluator cannot establish historical status, it fails its existing integrity
boundary and the bypass/coverage consumer remains fail-closed. A raw reader may
still report historical rows as display context, but it cannot make a bypass
verdict independently.

Alternative considered: delete the raw declaration scan. Rejected because it
would lose the direct hand-written/orphan row diagnostic that the Gate needs.
The net simplification is to retain one raw observation path while removing its
second interpretation of ledger lineage.

### 5. Proof follows each fact to a real consumer

Focused unit tests will prove:

- v3 assignment resolution creates matching Wave1 empty/non-empty declaration
  obligations while v1/v2 and Wave2 preserve their prior declaration behavior;
- source-ref authorization accepts exactly one lawful prior source and rejects
  filesystem-only, cross-topic, wrong-role, wrong-kind/wave, and ambiguous
  alternatives;
- normalized hash-valid historical predecessors do not appear as bypass rows
  while raw-only and hash-drift declarations do.

CLI integration tests will prove the user-visible boundaries:

- `operate-work-unit dry-submit` and formal submit accept a valid
  supplementary empty-output result;
- Wave1 inspect/convergence accepts the same submitted prior `source_ref` that
  submit accepts but still rejects bad current cache mapping and a missing
  physical source backing through its distinct projection root;
- a Wave1 Gate after valid supersession does not emit
  `delegated_bypass_suspected` for its predecessor and still rejects a genuine
  bypass.

No `agent_flow_e2e` is selected: this change changes deterministic Engine
contracts, not Subject-Agent research behavior. No `deterministic_e2e` is
selected because the affected command boundaries already form the smallest
fixture-backed CLI proof and no new workflow-scale sequence is introduced.

## Risks / Trade-offs

- [A source-ref helper silently broadens prior authorization] -> The helper
  preserves the existing exact-path, hash-valid, same-Topic UID, wave/kind and
  authorized-role predicates; its unit table includes every neighboring reject
  case.
- [An empty assignment is confused with missing assignment mode] -> Assignment
  admission continues to require explicit current Wave1 mode and exact receipt
  shape before resolving the empty set.
- [Changing v2 reinterprets an in-flight attempt] -> v3 is the only new-claim
  marker; v1/v2 reconstruction uses their immutable bound output contract and
  the regression matrix includes an already-claimed v2 supplementary attempt.
- [Historical suppression masks corrupted ledger state] -> Only a normalized
  `hash_valid_historical` entry matching the raw id/hash pair suppresses
  suspicion; missing or attributable-drift historical evidence remains a
  primary integrity failure.
- [Consumers drift again later] -> The semantic-closure record names all three
  resolver/consumer pairs and binds them to distinct focused and cross-surface
  proof assets; future changes must revisit those entries before Apply.
- [The root version source is absent] -> Apply creates/restores only the
  required repo-root `CHANGELOG.md` source and updates the `RUN.md` banner to
  v0.82; it will not create a competing Harness-local history.

## Migration Plan

1. Add v3 resolver semantics for new claims while preserving v1/v2 and
   markerless historical reconstruction, with no bundle-data migration.
2. Run the selected focused and CLI regression tests, including negative cases.
3. Add the concise v0.82 repo-root changelog entry and match the Harness
   `RUN.md` banner after the runtime behavior is verified.
4. Run project, verification-routing, semantic-closure, strict OpenSpec, and
   feedback-closeout checks before archive. Rollback is a normal code revert;
   no persisted state needs reverse transformation.
