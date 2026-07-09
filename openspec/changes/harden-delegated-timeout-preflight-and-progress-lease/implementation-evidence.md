# Implementation Evidence

Change: `harden-delegated-timeout-preflight-and-progress-lease`

## Scope Readback

- Read current change artifacts: `proposal.md`, `design.md`, `tasks.md`, and all delta specs.
- Read source plan: `_backlog/plans/delegated-attempt-timeout-and-redo-postmortem-修复计划.md`.
- Consulted archived changes:
  - `2026-07-08-stabilize-agent-facing-work-unit-contracts`
  - `2026-07-08-parallel-delegated-phase-execution-and-reference-materialization`
  - `2026-07-09-harden-delegated-preflight-and-fetch-hygiene`
- OpenSpec CLI is unavailable in this environment:
  - `openspec status --change "harden-delegated-timeout-preflight-and-progress-lease" --json` -> `zsh:1: command not found: openspec`
  - `openspec instructions apply --change "harden-delegated-timeout-preflight-and-progress-lease" --json` -> `zsh:1: command not found: openspec`

## Explicit Exclusions

This apply excludes audited late accept, normal submit on terminal `timed_out`, retry supersede, gate floor changes, reference authority changes, Engine-owned fetcher/watcher/daemon/wait helper, pause/resume lifecycle, new dependencies, environment-variable configuration, and Python usage.

## Registry Check

Registered IDs confirmed before target-code edits:

- `DEW-014`
- `SNC-008`
- `RWP-018`
- `RWE-011`

## Timeout Mutation Audit

Current write-capable timeout path before edits:

- `DPT_FRAMEWORK/cli/operate-work-unit.mjs`
  - `timeout` maps to `closeWorkUnitAttempt(... status: "timed_out")`.
- `DPT_FRAMEWORK/engine/work-unit-lifecycle.mjs`
  - `closeWorkUnitAttempt()` validates status, loads index, validates claimed status, reads manifest, opens a work-unit transaction, removes `rb_queue.json.delegated_in_flight[queue_item_id]`, writes status/index/status file, preempts retry demand for `timed_out`, saves queue/index, writes trace/log terminal events.
- Export surface:
  - `DPT_FRAMEWORK/engine/work-unit-core.mjs` exports `closeWorkUnitAttempt`.
- Direct call sites found before edits:
  - `DPT_FRAMEWORK/cli/operate-work-unit.mjs`
  - `tests/engine/work-unit-terminal.test.mjs`
  - `tests/schema/verify-bundle-health.test.mjs`
  - `tests/integration/cli/validate-work-unit-hygiene.test.mjs` fixture text

## Static Timeout Bypass Audit Plan

Implementation will make the Engine-owned `timed_out` branch guarded inside the exported lifecycle/API path, not only inside CLI. Regression/hygiene coverage will assert that exported `timed_out` callers either satisfy preflight eligibility or pass explicit force metadata.

## Progress-Source Matrix

| Surface | Timestamp Source | Extends Idle Lease | Notes |
| --- | --- | --- | --- |
| Assigned result path under work-unit dir | filesystem mtime clamped to chosen now | yes when identity parse/validation is tied to this work unit or file is a repair target | also drives dry-submit branch |
| Optional external `--result` candidate | filesystem mtime ignored for lease | no by mtime alone | may recommend submit/repair through dry-submit-equivalent validation |
| Runtime receipt/log | filesystem mtime clamped to chosen now | yes when non-empty and at least one parseable identity-matched event exists | receipt `ts` diagnostic only |
| Declared output/cache | filesystem mtime clamped to chosen now | yes when path is safe, under active bundle, and tied to candidate/manifest identity | undeclared random files do not count |
| Engine trace/log event | Engine-written event timestamp | yes when event carries same work identity | implemented only for available parseable runtime events |

## Dry-Submit Integration Plan

Timeout preflight will call the existing `drySubmitWorkUnit()` path for assigned or provided candidate results. It will not duplicate submit validation. Same-claimed-`work_id` repair diagnostics map to `repair`; wrong identity, terminal status, invalid binding, and ambiguous authority map to `inspect`/`block`.

## Clock/Mtime Plan

Helper/API accepts injected `nowMs`; CLI uses real current time. Future mtimes relative to `nowMs` are reported as suspicious and clamped so they cannot push `lease_anchor_at` past now or `effective_timeout_at` beyond `now + idle_timeout_ms`.

## Evidence Ledger

Commands and proofs will be appended as implementation proceeds.

