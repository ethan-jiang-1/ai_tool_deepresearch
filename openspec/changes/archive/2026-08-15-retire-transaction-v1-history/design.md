## Context

See [proposal.md](proposal.md) for motivation. The current transaction schema
has a v1/v2 union. That union is used in two different ways: transaction
preflight/inspection needs to fail closed on directory bytes that indicate an
unresolved mutation, while `originalAcceptanceEvidence()` uses a committed
journal plus trace correlation as positive predecessor evidence. New writers
and the only recovery operation already require v2, but the shared union lets
the historical v1 representation reach both reader families.

The accepted `delegated-work-units` contract owns the observable behavior.
The C6a/C6b/C6c archive already makes the complete current work-unit profile a
precondition for submit, recovery, inspection, supersession, and Gate-related
computation. This change does not reopen that profile classifier.

## Goals / Non-Goals

**Goals:**

- Make v2 the sole transaction protocol that can create a busy/recovery/
  acceptance conclusion.
- Keep one raw, fail-closed transaction-directory safety boundary for
  unresolved v1 and malformed journal bytes before any mutation.
- Make a committed v1 journal incapable of satisfying the original-submit
  proof required by declaration recovery, supersession, inspection, or Gate
  lineage evaluation.
- Preserve all current v2 transaction, rollback, contention, and idempotent
  recovery behavior.

**Non-Goals:**

- Rewriting, deleting, or migrating existing journal, trace, ledger, result,
  receipt, cache, index, queue, or Gate bytes.
- Recovering, unlocking, or force-deleting a v1 journal.
- Changing the complete-current-profile boundary, non-work-unit JSONL
  diagnostics, transaction v2 schema, or Agent-facing command set.
- Adding a retry controller, background sweeper, liveness inference, or a
  generic legacy-reader abstraction.

## Decisions

### Separate raw mutation safety from current protocol parsing

The transaction directory will have two deliberately different reader shapes:

1. A v2 parser owns positive protocol conclusions. Only a schema-valid v2
   journal can support `busy`, proof-verified rollback/recovery, or
   original-acceptance evidence.
2. A minimal raw safety classifier owns the negative question: whether bytes
   prevent a new mutation. It distinguishes a structurally complete committed
   v1 diagnostic record from every unresolved or malformed entry: a v1 marker
   with `started`/`failed`, a missing required v1 fact, an invalid value, an
   unreadable file, an unknown marker, or proof-incomplete v2 all remain
   suspect. It does not return a v1 protocol value, infer targets, reconstruct
   an operation, or promote a complete committed v1 journal to a current fact.

Thus `started` and `failed` v1 journals continue to stop mutation at
`suspect_transaction`; only a complete committed v1 journal is retained as
untouched diagnostic bytes and does not independently block a new current v2
mutation. It is neither an unblockable v2 journal nor an authority source.
This is narrower than retaining the v1 union and safer than ignoring the
directory entry or trusting a bare `status: committed` marker.

**Alternative rejected:** retain the existing v1 schema branch as a
read-only parser. It preserves a historical protocol and acceptance-evidence
fanout the user explicitly retired.

**Alternative rejected:** delete v1 handling entirely. It lets an unresolved
old journal disappear from the mutation blocker scan.

### Make v2 original-submit evidence explicit

Both current original-submit evidence readers — declaration recovery's
trace/journal correlator and supersession's acceptance evaluator — will require
one committed v2 journal that matches their current trace, work, queue, and
accepted-ledger bindings. Neither may fall back to a v1 journal. A
complete-current-profile predecessor whose only candidate is v1 stops at the
existing `missing_contract` proof boundary before declaration recovery,
supersession, or historical coverage interpretation can mutate authority.

This is intentionally different from malformed transaction bytes: malformed
or unresolved files are a global mutation-safety fact and remain
`suspect_transaction`; a committed v1 file is a known retired contract and is
rejected when a caller asks it to establish current evidence.

The profile classifier's `unsupported_current_contract` remains reserved for a
rejected assignment/submission/actor profile. A v1 journal evidence failure is
not that condition: the attempt profile is current but its required v2 proof is
absent. Keeping `missing_contract` preserves the existing direct root rather
than conflating the two boundaries.

### Preserve existing current source of record and shortest legal loop

The direct sources remain the v2 journal/lock pair, the current submitted
ledger fingerprint, and trace binding. The shortest legal loop is unchanged:
valid v2 contention returns `busy`, a verified v2 orphan can be recovered,
and any unresolved/invalid journal returns `suspect_transaction`. A
complete-current attempt that asks a v1 journal to establish acceptance stops
with `missing_contract`; it does not create a repair, migration, or retry path.

No new semantic state or public command is introduced. This is a net
simplification: the positive v1 union, its committed-evidence branch, and
their legacy tests/guidance are removed while one existing safety verdict
continues to cover unsafe bytes.

### Responsibility boundary

The user selected the policy: v1 has no current Engine meaning. The Agent may
perform only the approved mechanical removal and tests. The Engine continues
to decide deterministic v2 validity, raw suspect blockers, and the direct
missing-contract proof result; it neither chooses a historical repair nor
invents acceptance from old bytes.

## Risks / Trade-offs

- [An unresolved v1 entry stops blocking mutation, or a malformed v1 entry
  bypasses it as committed] -> Test raw v1 `started`, `failed`, malformed, and
  unreadable cases through submit, inspect, and timeout paths; assert zero
  authority mutation and no wait/force/delete advice. Separately prove that a
  complete committed v1 file alone does not block a current v2 path.
- [A committed v1 journal retains accidental evidence authority] -> Test
  declaration recovery, supersession, historical inspection, normalized
  ledger/Gate lineage, and the schema barrel with a complete-current-profile
  predecessor whose only journal proof is v1; assert `missing_contract` at the
  direct recovery/supersession boundary and no successor/ledger write.
- [Current v2 recovery or contention regresses] -> Retain focused v2
  transaction, CLI, declaration-recovery, and deterministic-E2E tests,
  including idempotent settled recovery and exact before-image rollback.
- [Historical diagnostics are mistaken for a migration path] -> Keep v1
  bytes untouched, preserve only the suspect diagnostic for unsafe entries,
  and remove positive v1 wording from current Engine guidance/specs.

## Migration Plan

No data migration runs. Apply changes only the reusable Harness, tests, and
accepted spec. Existing run-bundle bytes are neither read as a selected run nor
rewritten. If rollback is required, reverting the code/spec commit restores
the prior reader behavior; no runtime data needs reversal.
