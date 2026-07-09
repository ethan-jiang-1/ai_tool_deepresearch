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

Post-implementation mutation boundary:

- `timeoutPreflightWorkUnit()` is read-only. It reads index, manifest, `_status.json`, queue in-flight binding, assigned/provided result, identity-matched receipt, declared output/cache refs, and Engine trace events. It does not call queue/index save, transactions, trace/log writers, submit rejection writers, or gate writers.
- Default `closeWorkUnitAttempt(... status: "timed_out")` runs preflight before `readAndValidateManifest()` and before entering `withWorkUnitTransaction()`. A false preflight returns structured advice without status/index/queue/ledger/transaction/trace/log mutation.
- Eligible or forced timeout retains the existing transaction boundary: validate manifest and queue binding, remove delegated in-flight binding, write status/index, preempt retry demand, save queue, and write timeout trace/log events. Replacement `work_id` allocation remains a later claim operation.
- `inspectWorkUnits()` continues to report the initial `deadline_at` expired-lease diagnostic and optionally emits inspect diagnostics. It does not terminalize attempts; timeout eligibility authority now belongs to timeout preflight's progress-aware effective lease.
- Forced timeout records the preflight summary in the regular timeout trace/log event and emits `work_unit_forced_timeout` when force bypasses a false preflight.

## Static Timeout Bypass Audit Plan

Implementation will make the Engine-owned `timed_out` branch guarded inside the exported lifecycle/API path, not only inside CLI. Regression/hygiene coverage will assert that exported `timed_out` callers either satisfy preflight eligibility or pass explicit force metadata.

Final proof:

- `DPT_FRAMEWORK/engine/work-unit-lifecycle.mjs` imports `timeoutPreflightWorkUnit()` and runs it for `status === "timed_out"` inside the exported `closeWorkUnitAttempt()` API before the work-unit transaction mutates queue/index/status/trace/log state.
- `DPT_FRAMEWORK/cli/operate-work-unit.mjs timeout` still routes through `closeWorkUnitAttempt()`; the CLI does not write `timed_out` state directly.
- `DPT_FRAMEWORK/engine/work-unit-core.mjs` exports `timeoutPreflightWorkUnit()` beside the guarded lifecycle API.
- `tests/engine/work-unit-timeout-static.test.mjs` statically asserts the guarded import/branch, CLI route, force-only CLI option wiring, and `work_unit_forced_timeout` audit surface.

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

## Touched Surfaces

- Engine/schema/CLI:
  - `DPT_FRAMEWORK/schema/contracts/work-unit.mjs`
  - `DPT_FRAMEWORK/engine/work-unit-timeout-preflight.mjs`
  - `DPT_FRAMEWORK/engine/work-unit-lifecycle.mjs`
  - `DPT_FRAMEWORK/engine/work-unit-core.mjs`
  - `DPT_FRAMEWORK/cli/operate-work-unit.mjs`
  - `DPT_FRAMEWORK/engine/work-unit-envelope.mjs`
- Agent-facing Markdown:
  - `DPT_FRAMEWORK/workflows/nodes/shared/shared-subagent-protocol.md`
  - `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md`
  - `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md`
  - `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave2.md`
  - `DPT_FRAMEWORK/workflows/nodes/phases/subagent-dpt-source-intake.md`
  - `DPT_FRAMEWORK/workflows/nodes/phases/subagent-dpt-evidence-extractor.md`
  - `DPT_FRAMEWORK/workflows/nodes/phases/subagent-dpt-topic-scout.md`
- Tests/controlled experiments:
  - `tests/engine/work-unit-terminal.test.mjs`
  - `tests/engine/work-unit-timeout-static.test.mjs`
  - `tests/integration/cli/operate-work-unit.test.mjs`
  - `tests/integration/md/parallel-delegated-reference-materialization.test.mjs`
  - `experiments_env/shared/work-unit-playbook-utils.mjs`
  - `experiments_env/shared/run-fixture-backed-case.mjs`
  - `experiments_playbook/exp_wfn_wave0/case-213-light-happy-and-fail.md`
  - `experiments_playbook/exp_wfn_wave0/case-214-light-timeout-progress-lease.md`
- Release/OpenSpec:
  - `CHANGELOG.md`
  - `DPT_FRAMEWORK/RUN.md`
  - this `tasks.md` / `implementation-evidence.md`

## No-Side-Effect Proof

- Unit/API: `tests/engine/work-unit-terminal.test.mjs` snapshots full bundle authority surfaces around eligible and ineligible `timeoutPreflightWorkUnit()` calls and around default timeout refusal. It covers no-progress eligibility, recent receipt progress refusal, submit-ready candidate refusal, repairable candidate refusal, invalid identity/binding/ambiguous receipt refusal, and not-yet-idle refusal.
- CLI: `tests/integration/cli/operate-work-unit.test.mjs` verifies `timeout-preflight` false-check exits non-zero with JSON stdout and leaves index/queue unchanged; default `timeout` refuses progress-positive, submit-ready, repairable, and invalid-binding attempts without changing queue/status.
- Controlled: `case-214` records trace checks that progress-positive default timeout leaves authority snapshots unchanged, while no-progress expired timeout still requeues retry.

## Candidate / Lease Anchor Audit

- Assigned result path is observed as a progress source only when identity is verified or the assigned result is a same-attempt repair target.
- Optional external `--result` candidates are dry-submit validation inputs; their mtime does not extend the idle lease. `tests/engine/work-unit-terminal.test.mjs` and controlled `case-214` both assert external candidate `result_file.extends_idle_lease === false`.
- No-progress output keeps `latest_engine_observed_progress_at: null` and uses `claimed_at` only as `lease_anchor_at`. Tests assert claim time is not reported as observed progress.
- Future mtimes are marked `suspicious_timestamp: true` and clamped so `effective_timeout_at` cannot move beyond `nowMs + idle_timeout_ms`.

## Force Timeout Audit Proof

- Forced timeout requires `--reason` through the existing CLI reason guard.
- Forced timeout still runs preflight, terminalizes only via explicit `force: true`, and returns/records `forced_timeout`, `force_reason`, `preflight_timeout_eligible`, `preflight_recommended_action`, `default_timeout_would_refuse`, `effective_timeout_at`, `latest_engine_observed_progress_at`, `lease_anchor_at`, and `progress_sources`.
- A forced bypass writes `work_unit_forced_timeout` in addition to the regular timeout event.
- Unit, CLI, and controlled `case-214` coverage assert structured `progress_sources[]` and normal late submit rejection after terminal timeout.

## Phase / Sub-Agent Guidance Audit

- Wave0/Wave1/Wave2 phase docs now require `timeout-preflight` before terminal timeout for expired/stale attempts, parse structured stdout even when the command exits non-zero, and follow the closed advice branches `submit|repair|wait|inspect|block|timeout`.
- The docs explicitly keep `timeout --force --reason <reason>` exceptional and tell the Phase Agent not to run gates while preflight recommends non-terminal branches.
- Active Sub-agent role docs and the shared protocol require batch-level progress events around slow search/fetch/cache/result work, carrying `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`.
- Static Markdown tests assert this guidance and verify no Python fallback wording was reintroduced.

## Evidence Ledger

- `node --test tests/engine/work-unit-terminal.test.mjs tests/engine/work-unit-timeout-static.test.mjs` -> PASS (14 tests), covering helper/API preflight, guarded timeout refusal, no-side-effect snapshots, static bypass audit, force audit, retry, and late-submit rejection.
- `node --test tests/integration/cli/operate-work-unit.test.mjs` -> PASS (14 tests), covering CLI `timeout-preflight`, false-check stdout/exit behavior, default timeout refusal for progress-positive / submit-ready / repairable / invalid-binding attempts, force audit, no-progress retry, and existing inspect/submit behavior.
- `node --test tests/integration/md/parallel-delegated-reference-materialization.test.mjs` -> PASS (12 tests), covering Wave0/Wave1/Wave2 timeout-preflight guidance and active Sub-agent progress guidance.
- `node experiments_env/shared/run-fixture-backed-case.mjs --case case-214 --cleanup-pass` -> PASS, covering RWE-011 progress-lease controlled evidence through production work-unit CLI/API boundaries.
- `node experiments_env/shared/run-fixture-backed-case.mjs --case case-213 --cleanup-pass` -> PASS after updating the timeout retry checkpoint to explicitly age a no-progress attempt.
- `node experiments_env/shared/run-fixture-backed-case.mjs --case case-153 --cleanup-pass` -> PASS after removing fixture progress from the no-progress timeout retry probe.
- `node openspec/governance/check-project-reqs.mjs` -> PASS: `All project requirement IDs consistent: 486 registered (52 retired, 0 orphan), 501 occurrences in main specs/active deltas.`
- `node openspec/governance/check-project-specs.mjs` -> PASS: `All project specs valid: 71 main spec files under openspec/specs, 0 violations.`
- `openspec validate harden-delegated-timeout-preflight-and-progress-lease --strict` -> unavailable: `zsh:1: command not found: openspec`.
- `git diff --check` -> PASS.

## Deferred Findings / Residual Risks

- Audited late accept for already terminal `timed_out` attempts remains deferred to Change B. Normal submit after terminal timeout still rejects.
- Pause/resume lifecycle remains deferred until there is a real runner/app suspend signal; this change only adds progress-aware idle lease behavior.
- Fixture-backed controlled cases prove Engine timeout policy and production CLI/API boundaries, not real Sub-agent search/fetch/judgment quality.
- Timeout preflight remains read-only by design; no persisted `last_observed_at` authority was added.
