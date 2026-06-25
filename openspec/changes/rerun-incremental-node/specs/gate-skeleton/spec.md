# Gate Skeleton (Delta)

> req: GSK-005

## ADDED Requirements

### Requirement: Shared gate attempt audit helper

`gate-helpers.mjs` SHALL export a `writeGateAttempt(bundlePath, result)` function that writes every gate attempt to two audit destinations:

1. **Logger** (`_logs/run.log`): general-purpose diagnostic log. Records all gate attempts (passed/failed) with gate name, currentNodeRef, next, inspect/advice summary. This is the primary production diagnostic source.
2. **Trace** (`rb_trace.jsonl`): structured `gate_attempt` JSONL event for automated testing verdicts. Format SHALL match the existing `gate_attempt` event (fields: `ts`, `event`, `gate`, `passed`, `currentNodeRef`, `next`, `inspect_count`, `advice_count`).

Gate CLIs SHALL call `writeGateAttempt()` before `emitGateResult()`. The function SHALL NOT throw — trace/log write failures MUST NOT affect gate output or exit code.

This eliminates the duplicated inline trace-writing code currently copied across all 9 gate CLIs. New gate CLIs SHALL use `writeGateAttempt()` instead of inlining trace writes.

#### Scenario: Gate pass writes to both destinations

- **WHEN** a gate CLI calls `writeGateAttempt(bundlePath, result)` with a passed result
- **THEN** a `gate_attempt` JSONL event SHALL be appended to `rb_trace.jsonl`
- **AND** a logger INFO line SHALL be appended to `_logs/run.log`

#### Scenario: Gate fail writes diagnostic detail

- **WHEN** a gate CLI calls `writeGateAttempt(bundlePath, result)` with a failed result
- **THEN** a logger WARN line SHALL include inspect and advice summaries

#### Scenario: Audit write failure does not affect gate result

- **WHEN** the trace file or log directory is unwritable
- **THEN** `writeGateAttempt()` SHALL silently catch the error
- **AND** the gate result SHALL still be emitted via `emitGateResult()`
