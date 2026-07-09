# Implementation Evidence

Change: `add-audited-late-accept-for-timed-out-work-units`

## Scope Readback

- Read current change artifacts: `proposal.md`, `design.md`, `tasks.md`, and all five delta specs.
- Read source plan: `_backlog/plans/delegated-attempt-timeout-and-redo-postmortem-修复计划.md`.
- Read Change A archive: `openspec/changes/archive/2026-07-10-harden-delegated-timeout-preflight-and-progress-lease/`.
- OpenSpec CLI is unavailable in this environment:
  - `openspec status --change "add-audited-late-accept-for-timed-out-work-units" --json` -> `zsh:1: command not found: openspec`
  - `openspec instructions apply --change "add-audited-late-accept-for-timed-out-work-units" --json` -> `zsh:1: command not found: openspec`

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

