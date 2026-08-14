# C6: Historic Work-Unit Contract Family

> Program family: C6
>
> Status: C6a-C6c archived as dashboard item 16; C6d policy A archived as standalone item 17
>
> Risk: L4 throughout

## Why C6 has two execution boundaries

`work-unit` has several independently versioned or absent facts. They all look
like "old compatibility" in a token scan, but they answer different questions:

| Slice | Exact historic shape | Current writer fact | Current reader consequence | Card |
|---|---|---|---|---|
| C6a | Explicit `work-unit.assignment.v1` / `.v2` marker | New claims write only `work-unit.assignment.v3` | Submit validation preserves the output-contract interpretation recorded with a marked old attempt | [C6a](C6a-retire-marked-assignment-history.md) |
| C6b | Markerless submitted attempt, especially no `submission_contract_version` | New claims write `work-unit.submission.v1` and its immutable acceptance fingerprint | Submit normalization, hash-mirror validation, declaration recovery, late-submit, and supersession can interpret the older representation | [C6b](C6b-retire-markerless-submission-history.md) |
| C6c | Attempt lacks `actor_contract_version` / `actor_execution` | Normal current claim records actor v1 provenance | Ledger and inspect project the absence as `legacy_unrecorded` rather than inventing a real actor | [C6c](C6c-retire-unrecorded-actor-provenance.md) |
| C6d | `work-unit.transaction.v1` journal | New mutations write only transaction v2 | Policy A: unfinished, unreadable, malformed, or proof-incomplete journal remains a `suspect_transaction` blocker; structurally complete committed v1 is diagnostic-only and cannot be original-submission evidence | [C6d](C6d-retire-transaction-v1-history.md) |

An artifact can match more than one row. C6a-C6c therefore remain separate
decision cards but may share one proposal/apply/archive when all three select the
same explicit rejection boundary: they operate on the same attempt envelope and
overlapping submit/provenance readers. C6d remains separate because an unresolved
transaction journal is a fail-closed mutation blocker with a different rollback
and safety boundary.

## Verified family boundary

- The current positive claim path writes assignment v3, submission v1, and
  actor-v1 facts. `work-unit.submission.v1`, `work-unit.result.v1`, receipt
  event v1, and transaction v2 are **current discriminators**, not C6 deletion
  targets merely because their names contain a version suffix.
- Accepted `delegated-work-units`, `subagent-node-contract`,
  `work-unit-provenance-gate`, and focused Wave1 contracts deliberately retain
  historical read-only interpretation. The code is therefore an explicit
  product contract, not unused parser residue.
- Current recovery, rerun, late-submit, supersession, queue authority, receipt
  validation, and provenance remain protected semantics. No C6 decision may
  relabel an old record as current v3, synthesize a real actor, silently migrate
  bytes, or make an unresolved journal disappear.

## Family-wide no-go conditions

- [x] The Global Coverage Gate is closed; C6a-C6d may enter proposal only after
  their own user decision and card-level Go / No-go are complete.
- [x] Each card has a complete producer / reader / caller / guidance / spec /
  test map for its exact shape in `inventories/c6-work-unit-reader-fanout.md`.
- [x] A user made each affected historical-artifact policy decision one card at
  a time. "Humans may read the file" did not itself authorize current Engine
  parsing, counting, recovery, or mutation.
- [x] C6a-C6c aligned on one explicit rejection boundary, were applied as
  dashboard item 16, and are governed-archived.
- [x] C6d entered standalone dashboard item 17 with policy A; its proposal
  preserved the rule that no unresolved v1 journal can disappear from the
  mutation blocker scan.
- [x] C6d received user review and explicit `APPLY`; a committed v1 journal
  does not regain authority during implementation, and its governed archive is
  `2026-08-15-retire-transaction-v1-history`.
- [x] C6 historical-input failures now use their selected explicit rejection
  or safety result. They do not default to v3, automatically migrate, or omit
  an unsafe journal from the safety scan.

## Closed coverage record

- [x] Current readers of index, manifest, beacon, result, receipt, submitted
  ledger, queue terminal history, and transaction journal are classified under
  C6a-C6d or as a protected C6b safety diagnostic.
- [x] Active mutation, recovery, provenance/Gate evaluation, inspection, and
  diagnostic-only raw-file display are separated. A parser import is not by
  itself treated as sufficient classification.
- [x] Repository fixture/test evidence is mapped by exact historic shape. No
  run bundle was inspected; a concrete user-authorized bundle would be a new
  evidence source, not a precondition for audit closure.
- [x] Direct characterization evidence for current v3 claim/submit, timeout
  recovery, eligible late-submit, supersession, and current v2 transaction
  safety is recorded in the archived item-16 and item-17 evidence.

## Family verification baseline

```bash
node --test tests/engine/work-unit-assignment-contract.test.mjs tests/engine/work-unit-submit.test.mjs
node --test tests/engine/work-unit-transaction.test.mjs tests/engine/work-unit-attempt-recovery.test.mjs
node --test tests/integration/cli/operate-work-unit.test.mjs tests/integration/cli/work-unit-declaration-recovery.test.mjs
node --test tests/e2e/work-unit-attempt-recovery.test.mjs
node DEEP_RESEARCH_HARNESS/cli/validate-workflow-package.mjs
```

The focused baseline passed during this investigation. It is evidence of the
present contract surface, not permission to delete it.
