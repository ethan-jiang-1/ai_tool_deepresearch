# Implementation Evidence

Change: `add-audited-late-accept-for-timed-out-work-units`

## Scope Readback

- Read current change artifacts: `proposal.md`, `design.md`, `tasks.md`, and all five delta specs.
- Read source plan: `_backlog/plans/delegated-attempt-timeout-and-redo-postmortem-修复计划.md`.
- Read Change A archive: `openspec/changes/archive/2026-07-10-harden-delegated-timeout-preflight-and-progress-lease/`.
- Direct `openspec` binary lookup was unavailable at initial readback:
  - `openspec status --change "add-audited-late-accept-for-timed-out-work-units" --json` -> `zsh:1: command not found: openspec`
  - `openspec instructions apply --change "add-audited-late-accept-for-timed-out-work-units" --json` -> `zsh:1: command not found: openspec`
- OpenSpec was later available through temporary `npm exec --package @fission-ai/openspec`; no project dependency was added.

## Simple Recovery Chain

```text
targeted timed_out work unit
  -> explicit operate-work-unit late-submit
  -> normal submit validation against the targeted identity
  -> reject submitted replacement coverage
  -> remove queued retry or abandon claimed retry when no replacement submitted
  -> append one audited submitted ledger row
  -> gate reads that submitted row through normal provenance checks
```

## Explicit Non-Goals

- Do not make normal `operate-work-unit submit` accept terminal attempts.
- Do not recover `failed` or `abandoned`.
- Do not rewrite old output into a retry work-unit identity.
- Do not add a new work-unit status.
- Do not add watcher, daemon, queue-complete bypass, manual ledger repair, or environment-variable configuration.
- Do not add logging/file/subagent/observability deltas.
- Do not add dependencies or Python.

## Registry Check

Registered IDs confirmed before target-code edits:

- `DEW-015`
- `WPG-014`
- `RWE-012`

`SRL-005` remains deprecated and is not part of this change.

## Implementation Scope Audit

Touched implementation surfaces:

- Engine/CLI/schema: `DPT_FRAMEWORK/engine/work-unit-submit.mjs`, `DPT_FRAMEWORK/cli/operate-work-unit.mjs`, `DPT_FRAMEWORK/engine/work-unit-core.mjs`, `DPT_FRAMEWORK/schema/contracts/work-unit.mjs`, `DPT_FRAMEWORK/engine/helpers/gate-helpers-readers.mjs`, `DPT_FRAMEWORK/engine/work-unit-validation.mjs`.
- Agent-facing guidance: `DPT_FRAMEWORK/RUN.md`, `DPT_FRAMEWORK/COMMANDS.md`, `DPT_FRAMEWORK/workflows/nodes/shared/shared-subagent-protocol.md`, `DPT_FRAMEWORK/workflows/nodes/shared/shared-schemas.md`.
- Controlled coverage: `experiments_playbook/exp_wff_wave-chain/case-153-standard-wave-fault-tolerance.md`, `experiments_env/shared/run-fixture-backed-case.mjs`, and the preserved Change A timeout case text in `case-214`.
- Regression tests: focused engine, CLI, schema, gate helper tests under `tests/`.

## Evidence Ledger

- PASS: `node --test tests/engine/work-unit-submit.test.mjs tests/engine/work-unit-terminal.test.mjs tests/integration/cli/operate-work-unit.test.mjs tests/schema/contracts/work-unit.test.mjs` -> 71 tests passed.
- PASS: `node --test tests/engine/helpers/gate-helpers-provenance.test.mjs tests/engine/helpers/gate-helpers-readers.test.mjs` -> 42 tests passed.
- PASS: `node --test tests/schema/verify-bundle-health.test.mjs` -> 14 tests passed after updating the lifecycle projection fixture to use current guarded-timeout semantics.
- PASS: `node experiments_env/shared/run-fixture-backed-case.mjs --case case-153 --target-dir tests/.test-bundles --cleanup-pass` -> verdict `PASS`; coverage includes normal submit-after-timeout rejection, explicit audited late-submit success, queued retry cleanup, claimed retry abandon, replacement-submitted rejection, and Wave0 gate coverage from the audited submitted ledger row.
- PASS: `npm test` -> 1309 tests passed, 0 failed.
- PASS: `node openspec/governance/check-project-reqs.mjs` -> `All project requirement IDs consistent: 490 registered (53 retired, 0 orphan), 511 occurrences in main specs/active deltas.`
- PASS: `node openspec/governance/check-project-specs.mjs` -> `All project specs valid: 71 main spec files under openspec/specs, 0 violations.`
- PASS: `npm exec --yes --package @fission-ai/openspec -- openspec validate add-audited-late-accept-for-timed-out-work-units --strict` -> change valid.
- PASS: `git diff --check`.
- PASS: `npm exec --yes --package @fission-ai/openspec -- openspec instructions apply --change "add-audited-late-accept-for-timed-out-work-units" --json` -> 21/21 tasks complete, state `all_done`.

## Fixture Distance / Residual Risk

- `case-153` is fixture-backed and uses real disposable bundles plus real production CLI/gate boundaries. It proves deterministic Engine recovery, queue cleanup, ledger authority, and gate reading behavior.
- It does not prove real Sub-agent search/fetch/judgment quality; that remains outside this Engine-layer recovery change.
- `late-submit` intentionally remains a narrow explicit exception for `timed_out` targets only. Failed, abandoned, normal submitted, identity-mismatched, missing-reason, and submitted-replacement cases remain fail-closed.
