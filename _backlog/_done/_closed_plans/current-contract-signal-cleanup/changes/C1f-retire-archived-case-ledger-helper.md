# C1f: Retire the Archived Case-Ledger Helper Pair

> Candidate change: `retire-archived-case-ledger-helper`
>
> Planned execution batch: dashboard item 14 `retire-archived-case-ledger-helper` (standalone; C5b merge gate failed)
>
> Status: governed-archived as `2026-08-14-retire-archived-case-ledger-helper`; implementation/archive commit `374d86c33`
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

## Fresh Decision Evidence (2026-08-14)

- An exact current-surface scan finds the two helper symbols only at their
  definitions and in the one dedicated ledger-baseline test. No accepted main
  spec, active Supervisor path, manifest reader, or playbook consumes them.
- The accepted Autorun spec names `PLAYBOOK_MANIFEST.md` as the single runnable
  selection authority. It requires the manifest to register every active
  runnable path exactly once, but specifies no fixed `97 / 502 / 16` corpus.
- The archived feasibility audit calls the checked ledger a migration baseline
  that supplied V2 roles during apply and explicitly says archived change data
  is never runtime authority.
- `node --test tests/host_tools/agent-experiment-autorun.test.mjs` currently
  passes 43 / 43, including the archive-path baseline test. That proves the
  existing test still runs; it does not establish the archived count as a
  current product invariant.

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
- [x] User decided the exact corpus cardinality is a completed migration
  record, not a current invariant.
- [x] No current invariant is retained, so no new current owner is needed.
- [x] Create, review, apply, and governed-archive the standalone
  `retire-archived-case-ledger-helper` change.

## Expected verification

```bash
node --test tests/host_tools/agent-experiment-autorun.test.mjs \
  tests/integration/host_tools/agent-experiment-targeting.test.mjs \
  tests/integration/host_tools/run-agent-experiment.test.mjs
node DEEP_RESEARCH_HARNESS/cli/validate-workflow-package.mjs
```

## Completion Record

- Removed the complete archive-only helper cluster:
  `normalizeLedgerBundlePlan()`, `validateCaseCompatibilityLedger()`, and
  `readCaseCompatibilityLedger()`.
- Removed only the dedicated archive-path test, its lookup helper, and imports
  made unused by that test. Current manifest/V2/Supervisor behavior, current
  playbooks, and the `yaml` package dependency remain unchanged.
- Selected host-tool and Supervisor integration regression, workflow-package
  validation, zero-reference/protected-surface review, strict OpenSpec/archive
  governance, and the governed finalizer passed before archive.
