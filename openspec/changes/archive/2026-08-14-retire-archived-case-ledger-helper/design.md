## Context

See [proposal.md](proposal.md) for the motivation. The current Autorun Source
of Record is `experiments_playbook/PLAYBOOK_MANIFEST.md`, read through
`readAndValidateManifest()`: it validates the registered V2 playbook paths and
their exact current filesystem corpus. The three ledger helpers in
`agent-experiment-contract.mjs` instead validate a fixed archive artifact, and
their only current consumer is the dedicated test in
`tests/host_tools/agent-experiment-autorun.test.mjs`.

The archived `experiment-auto-runner` design identifies the ledger as an
apply-time migration baseline, not runtime authority. The user has selected
that same boundary for current cleanup.

## Goals / Non-Goals

**Goals:**

- Remove the complete archive-ledger helper cluster and its one archive-path
  test projection.
- Preserve the direct current manifest/V2 validation and all Supervisor
  selection, lifecycle, completion, health, audit, and cleanup behavior.
- Leave archived history inspectable at its archive owner without allowing
  ordinary current tests to consume it.

**Non-Goals:**

- Changing active runnable paths, their count, V2 frontmatter grammar, or
  current corpus validation.
- Replacing the ledger with a count lock, alias, tombstone, fallback, archive
  reader, migration path, new dependency, or new deterministic check.
- Changing retained v1 experiment-history prediction, admission, or selection
  policy; that remains C5b's separate decision.

## Decisions

### Retire the complete validator-only cluster

Apply removes `validateCaseCompatibilityLedger()`,
`readCaseCompatibilityLedger()`, and `normalizeLedgerBundlePlan()` together.
The third function has no caller beyond the validator, so retaining it would
leave an equally unreachable export after the named pair is removed.

The alternative of retaining the helpers with a deprecated annotation or a
future archive-reader branch is rejected: it would keep a second apparent
corpus authority and reintroduce the compatibility surface being retired.

### Delete only the dedicated archive test plumbing

Apply removes the `case compatibility ledger contract` test,
`changeArtifactPath()`, `CHANGE_NAME`, and only imports made unused by that
test. It preserves shared test utilities and every test that exercises current
manifest, V2 frontmatter, runtime token, native completion, health, audit, or
Supervisor behavior.

The alternative of moving the ledger test under an archive-only test path is
rejected: a current test suite would still make archived migration data a live
regression contract. The archive retains its own historical artifact without a
current reader.

### Preserve one current corpus authority

The bounded reader question is: "Which surface determines runnable Autorun
cases today?" The normal stop remains the manifest plus current playbook
filesystem validation. No new named state, projection, command, or recovery
path is introduced, so a constitutional design review for a newly changed
semantic layer is not applicable.

This is net simplification: the user chose the migration-record policy, the
Agent removes the bounded dead surface and verifies callers, and the existing
Engine/Supervisor retains the same deterministic current-path verdicts.

## Risks / Trade-offs

- [A missed supported caller could fail after export removal] -> Repeat exact
  current-surface searches immediately before editing and record any finding
  as ordinary repair work.
- [The test edit could remove shared setup or weaken current-path coverage] ->
  Limit the test diff to the named test/helper/imports and inspect the scoped
  diff before archive.
- [A historical migration record could be lost] -> Do not modify the archived
  change or its ledger; remove only current code that reads it.

## Migration Plan

No runtime data, bundle state, receipt, trace, or user migration occurs.
Apply deletes the bounded source/test cluster, runs the focused Autorun suite
and package validation, then proves the helpers and archive-path test plumbing
are absent from current surfaces. Rollback before archive is a source-control
revert of that bounded deletion.
