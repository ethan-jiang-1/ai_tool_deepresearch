# C6: Historic Work-Unit Contract Family

> Program family: C6
>
> Status: four decision cards and reader-fanout audit complete; C6a-C6c conditionally map to dashboard item 12, C6d is standalone item 13
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
| C6d | `work-unit.transaction.v1` journal | New mutations write only transaction v2 | An unfinished v1 journal blocks mutation as suspect; a committed v1 journal can be historical original-submission evidence | [C6d](C6d-retire-transaction-v1-history.md) |

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
- [ ] A user must make the affected historical-artifact policy decision one
  card at a time. "Humans may read the file" does not itself answer whether the
  current Engine may parse it, count it, recover it, or mutate around it.
- [ ] C6a-C6c may enter dashboard item 12 only after all three decisions align
  on one explicit rejection boundary and current marked/v3 behavior is characterized.
- [ ] C6d always enters standalone dashboard item 13; no record-reader cleanup
  may make an unresolved v1 journal disappear from the mutation blocker scan.
- [ ] Any future old-input failure must be one explicit owned rejection or
  opaque-history result. It must not be a v3 default, automatic migration, or
  silent omission from a safety scan.

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
- [ ] Keep direct characterization evidence for current v3 claim/submit,
  timeout recovery, eligible late-submit, and supersession before any branch is
  removed.

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
