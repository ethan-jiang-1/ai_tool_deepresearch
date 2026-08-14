## Context

See `proposal.md` for motivation and capability discovery. The existing
work-unit readers use optional or version-applicable discriminators scattered
across the index, manifest, beacon, status, result, receipt and submitted
ledger. That permits three historical success branches: assignment v1/v2,
markerless hash mirrors, and `legacy_unrecorded` actor projection. C6a/C6b/C6c
selected the same rejection policy and their merge gate passed.

The direct Source of Record for attempt admission is the Engine-owned index
record. Its manifest and beacon bind the same attempt profile; after acceptance
the Engine-written ledger is coverage authority. A selected runtime bundle is
not read during planning and historical bytes are not migration input.

## Goals / Non-Goals

**Goals:**

- Establish one deterministic question for every attempt reader: "Does the
  index-led attempt carry the complete current profile?"
- Return one stable `unsupported_current_contract` result before an unsupported
  attempt reaches assignment reconstruction, hash-mirror validation, actor
  projection, recovery, supersession, or provenance computation.
- Preserve every legal complete-current path: v3 assignment, marked
  submission-v1 immutable fingerprint, delegated/fallback actor binding,
  normal/late submit, recovery, supersession, and Gate coverage.
- Remove the historical positive readers, normalization, projections, tests and
  accepted-spec language made unnecessary by the common boundary.

**Non-Goals:**

- No byte rewrite, migration, adapter, version router, raw-history display API,
  new queue state, or new transaction protocol.
- No removal of `work-unit.submission.v1`: despite its suffix it is the
  protected current discriminator.
- No change to C6d transaction-v1, `legacy_non_work_unit_rows`, malformed
  current-integrity roots, current result/cache content validation, or Agent
  semantic judgment.

## Decisions

### 1. One current-profile classifier owns the historical-input boundary

Add one Engine-owned classifier beside the existing work-unit validation
boundary. It reads only the attempt-entry discriminator fields and, for a
nominally current record, cross-checks their matching manifest/beacon bindings.
It returns a small explicit conclusion; it is not persisted state, a migration,
or a second Source of Record.

| Precedence | Direct fact | Conclusion | Reader action |
| --- | --- | --- | --- |
| 1 | assignment marker is absent, v1, v2, or not v3 | `unsupported_current_contract` with `assignment_contract_version` | stop before output interpretation |
| 2 | submission marker is absent or not `work-unit.submission.v1` | `unsupported_current_contract` with `submission_contract_version` | stop before status/hash/recovery evaluation |
| 3 | actor marker/execution is absent or not one legal actor-v1 binding | `unsupported_current_contract` with `actor_contract_version` | stop before result/receipt/ledger actor projection |
| 4 | index/manifest/beacon disagree on a required current marker | `unsupported_current_contract` with the drifting binding surface | stop before a derived attempt conclusion |
| 5 | all profile facts match | current profile | enter existing current-only validation |

The classifier may perform only enough tolerant structural decoding to identify
an old discriminator. It SHALL NOT invoke output reconstruction, normalize a
Wave1 role, validate legacy hash mirrors, build `legacy_unrecorded`, or infer a
replacement value. Existing malformed-current schema/integrity roots remain
distinct after a record has passed the profile classifier.

This is preferred over three local rejections or schema-only deletion. Three
local branches would leave recovery/Gate/supersession disagreements; schema-only
deletion would hide an intentional compatibility retirement behind incidental
parse failures. One classifier removes the three positive reader families and
gives every caller the same normal reasoning stop.

### 2. Classify before every current computation; do not add a router

The apply work will route the existing entrypoints through the shared
classifier: normal/dry/late submit and declaration recovery, submit-integrity,
timeout-preflight, inspect and attempt disposition, submitted-ledger
normalization, the canonical `gate-helpers-readers` declaration reader, supersession, Wave0
source-contribution/current-reference projection, and provenance/Gate
projections. The existing current implementations remain their own owners after
classification; no generic version router or alternate recovery command is
added.

For submitted attempts, `work-unit.submission.v1` retains the current
ledger-first immutable-fingerprint path. The old status/index mirror tuple is
removed as a positive branch. For actor provenance, the legacy ledger union and
default `legacy_unrecorded` construction/projection are removed after the
classifier makes their positive input unreachable. Wave0 projection stops
before a legacy rich-reference row can produce submitted source,
reference-backing, or count facts. Generic non-work-unit JSONL diagnostics
remain unchanged because they are not an attempt-profile reader.

### 3. Preserve a single atomic rollback boundary

The schema cleanup, reader removal, acceptance-spec sync, and regression tests
are one change. Applying only one of C6a/C6b/C6c would leave a partially
current attempt interpretable through a different reader. The release boundary
therefore changes all three discriminators together: current writers already
emit them, old readers stop accepting them, and no data is rewritten.

Rollback restores the prior commit as one unit. It restores old reader behavior
only; it does not alter any run-bundle bytes. Current complete attempts remain
valid on either side of the change. An old in-progress attempt becomes an
intentional breaking rejection and must use a new current legal attempt rather
than a hand edit or migration.

### 4. Constitutional design review

**Semantic precision:** The reader receives one bounded question about the
current attempt profile. It must retain the distinction between an explicitly
old/missing discriminator and later corruption of an otherwise complete current
attempt. `unsupported_current_contract` is the normal stop; it is not a
repairable actor/content failure.

**Simple reliable control:** The index-led profile and one classifier replace
three independently version-applicable success branches. Existing validators,
transactions and Gate checks are reused after the boundary, avoiding a new
state machine, fallback tree, or background recovery.

**Helper-oriented responsibility:** The user already chose the semantic
compatibility policy. During Apply, the Agent performs the approved mechanical
reader/test/spec work. The Engine issues the deterministic profile verdict and
does not claim that the Agent may hand-edit old facts. A rejection identifies
the direct unsupported discriminator and the existing legal outcome: create a
new current attempt when the surrounding accepted workflow permits it.

## Risks / Trade-offs

- **Old in-flight attempt becomes unusable** -> This is the approved breaking
  policy. Reject before mutation, retain bytes, and direct no migration or
  manual repair.
- **Accidentally rejecting current submission-v1 because of its suffix** ->
  Make it an explicit protected-current test case and require the exact literal
  in the classifier.
- **Schema changes erase an owned rejection code** -> Test each retired shape
  through public submit/inspect/Gate entrypoints, not only schema parsing.
- **Removing one reader leaves a recovery loophole** -> Inventory each
  entrypoint and add no-write/rejection tests for submit, recovery,
  supersession and provenance.
- **Masking ledger corruption or non-work-unit diagnostics** -> Test their
  existing distinct roots and keep `legacy_non_work_unit_rows` out of scope.

## Migration Plan

1. Add the classifier and current-path regression coverage without changing
   current writers or run-bundle bytes.
2. Route all current readers through it and delete the now-unreachable positive
   legacy branches, unions, normalizations and projections in the same patch.
3. Synchronize the three accepted specifications, run selected verification and
   governance checks, then archive only after closeout confirms no legacy input
   can become current Engine authority.
4. Roll back the complete change if a protected current path regresses; do not
   mutate individual historical records as a rollback mechanism.
