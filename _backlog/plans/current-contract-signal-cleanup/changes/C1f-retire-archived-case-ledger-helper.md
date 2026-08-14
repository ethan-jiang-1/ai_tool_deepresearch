# C1f: Retire the Archived Case-Ledger Helper Pair

> Candidate change: `retire-archived-case-ledger-helper`
>
> Planned execution batch: dashboard item 11 `retire-legacy-experiment-history-inputs`, conditional on C5b policy alignment
>
> Status: decision card; current-invariant versus migration-record decision pending
>
> Risk: L2

## One question

Should the active Autorun contract keep an exported validator/parser pair whose
only live use is a test that reads the migration ledger from the archived
`experiment-auto-runner` change?

The pair is `validateCaseCompatibilityLedger()` and
`readCaseCompatibilityLedger()` in
`DEEP_RESEARCH_HARNESS/host_tools/lib/agent-experiment-contract.mjs`.

## Verified boundary

- `validateCaseCompatibilityLedger()` has one active consumer:
  `tests/host_tools/agent-experiment-autorun.test.mjs`.
- That test resolves either an active `experiment-auto-runner` change or its
  uniquely named archive, then asserts the archived migration ledger's fixed
  `97 / 502 / 16` baseline.
- `readCaseCompatibilityLedger()` has no current caller.
- The archived change design explicitly says the ledger is an apply-time
  migration manifest and **not** a runtime verdict authority. Current runtime
  selection is owned by the active playbook manifest and Autorun contract.

## Candidate policy

The likely cleanup is to remove the unused reader export, the archived-ledger
validator, and the test that makes an archived migration baseline a live
framework regression contract. Preserve current V2 manifest validation,
selection, native completion, and Supervisor behavior.

## Risks and non-goals

- The fixed 97-case corpus may still be an intentional current product
  invariant. If it is, move that invariant to an accepted current owner
  (manifest/spec/test) rather than retaining an archive-path reader.
- Do not delete or rewrite the archived OpenSpec change or its ledger. History
  remains inspectable at its archive owner.
- Do not remove `yaml` parsing or any active experiment schema while deleting
  the archive-only pair.

## Proposal gate

- [x] Current callers and archive-only data source are mapped.
- [x] Runtime-versus-migration authority distinction is verified in the
  archived design.
- [x] Global Coverage Gate is closed.
- [ ] User decides whether exact corpus cardinality is a current invariant or
  only a completed migration record.
- [ ] Proposal names the current owner for any invariant retained after the
  archive-path test is removed.

## Expected verification

```bash
node --test tests/host_tools/agent-experiment-autorun.test.mjs \
  tests/integration/host_tools/agent-experiment-targeting.test.mjs \
  tests/integration/host_tools/run-agent-experiment.test.mjs
node DEEP_RESEARCH_HARNESS/cli/validate-workflow-package.mjs
```
