# Subagent Runtime Logging

> req: SRL-001, SRL-002, SRL-003, SRL-004

## Purpose

Sub-agent lifecycle 可观测性契约。定义 sub-agent 在隔离 context 中 MUST 发射哪些 lifecycle 事件、如何经 `log-event.mjs` 写入、如何带上 `_beacon.json` 的 nonce，以及这些事件如何作为 Layer-2 execution-proof 信号被 provenance forensics 读取。把当前 dead code（`buildSpawnPrompt` 里的 logging 指令）升级为 spec 化、always-loaded 的契约。

## ADDED Requirements

### Requirement: Sub-agent SHALL emit lifecycle events via the log-event CLI

When a sub-agent runs in its isolated context, it SHALL emit structured lifecycle events by invoking `DPT_FRAMEWORK/cli/log-event.mjs` with `--bundle <bundle_dir>` and `--level/--msg` (run.log) or `--event` (trace). The mandatory event set is: `search_start`, `search_done`, `fetch_done`, `file_written`, `error`, `work_done`. The sub-agent SHALL discover `bundle_dir` and `log_cli` from its slot's `_beacon.json`, not from prompt prose alone.

#### Scenario: Sub-agent logs search lifecycle
- **WHEN** a sub-agent begins and completes a bounded search
- **THEN** `_logs/run.log` SHALL contain a `search_start` and a `search_done` line referencing the slot's `slotKey`
- **AND** the lines SHALL be written via `log-event.mjs` using the `bundle_dir` read from `_beacon.json`

#### Scenario: Sub-agent logs artifact writes
- **WHEN** a sub-agent writes an artifact file (e.g. `source.yaml`, a reference file, a cache page)
- **THEN** it SHALL emit a `file_written` event with a bundle-relative `path`

#### Scenario: Sub-agent reports errors without aborting the run
- **WHEN** a sub-agent encounters a blocked fetch or degraded result
- **THEN** it SHALL emit an `error` or appropriate `warn`-level event
- **AND** `log-event.mjs` SHALL exit 0 (diagnostics must not block agent flow)

### Requirement: Lifecycle events SHALL carry the slot's beacon nonce

Every lifecycle event a sub-agent emits SHALL include the `receipt_nonce` read from its slot's `_beacon.json` in the event detail. The nonce binds the event to the engine-staged slot.

#### Scenario: Lifecycle event carries nonce
- **WHEN** a sub-agent emits `work_done`
- **THEN** the event detail SHALL contain `receipt_nonce` equal to the `_beacon.json` `receipt_nonce`
- **AND** the nonce SHALL be a UUID (`randomUUID()` shape)

#### Scenario: Missing beacon does not silently degrade
- **WHEN** a sub-agent cannot read `_beacon.json`
- **THEN** it SHALL emit an `error` event noting the missing beacon
- **AND** SHALL NOT fabricate a nonce

### Requirement: Sub-agent SHALL read _beacon.json for runtime coordinates

The sub-agent SHALL treat `_beacon.json` in its slot directory as the single source of truth for `bundle_dir`, `log_cli`, `slot_key`, and `receipt_nonce`. The spawn prompt SHALL hand the sub-agent only its slot directory path plus an instruction to read `_beacon.json`.

#### Scenario: Sub-agent resolves bundle path from beacon
- **WHEN** a sub-agent is spawned with a slot directory path
- **THEN** it SHALL read `<slot_dir>/_beacon.json` to obtain `bundle_dir` and `log_cli`
- **AND** SHALL NOT rely on environment variables or inherited cwd for the bundle path

### Requirement: Lifecycle events are the execution-proof signal for provenance forensics

Lifecycle events emitted per SRL-001/SRL-002 SHALL be readable by gate provenance forensics as Layer-2 execution evidence. The absence of lifecycle events for an evidence-producing slot SHALL be reported by the `lifecycle_events_missing` diagnostic defined in `relay-provenance-gate` (RPG-011, advisory only this change) — giving SRL-004 a concrete read-side rather than a dangling assertion.

#### Scenario: Forensics reads lifecycle events as execution proof
- **WHEN** a gate forensic check inspects a slot that produced evidence
- **THEN** it SHALL be able to find lifecycle events in `_logs/run.log` / `rb_trace.jsonl` carrying the slot's nonce
- **AND** absence SHALL be surfaced via the `lifecycle_events_missing` diagnostic (RPG-011), not a gate failure (this change)
