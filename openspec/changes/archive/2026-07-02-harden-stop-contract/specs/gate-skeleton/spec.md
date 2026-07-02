# gate-skeleton Delta Spec

> req: GSK-006

## ADDED Requirements

### Requirement: Gate CLI accepts agent-reported attempt hint for fatigue diagnostics

Gate CLI wrappers SHALL accept an optional `--attempt N` flag (integer, N ≥ 0). The flag is an Agent-reported retry hint for the current gate invocation. When provided, the attempt number SHALL be passed through to `buildGateResult()` as `attemptNumber`. When omitted, `attemptNumber` SHALL default to 0 (meaning no fatigue hint is active for this invocation).

The Engine SHALL NOT treat `--attempt` as Engine-verified consecutive failure state. The Engine does not track, verify, persist, or assert the true number of consecutive gate failures for this change. It only uses the Agent-reported hint to enrich diagnostic output.

`buildGateResult()` SHALL, when `attemptNumber >= fatigueThreshold` (default 3) and the gate has failed (`passed: false`), inject fatigue diagnostic signals into the gate result:

- `check.fatigue_warning` SHALL be `true`
- `check.step_back` SHALL be `true`
- `advice` SHALL include three additional entries:
  1. A message stating the Agent reported retry attempt `attemptNumber` for this gate
  2. A "step back" instruction: re-read the phase instructions for the current node
  3. A stop-mode-safe reminder: if the current node is `stop:no`, do NOT ask the user; follow the degradation priority chain in `shared-silent-execution.md`. The advice SHALL NOT assert that the current node is `stop:no` unless the implementation has verified that fact from accepted node metadata.

When `attemptNumber < fatigueThreshold` or the gate passes, `fatigue_warning` and `step_back` SHALL NOT appear in the result.

`parseGateCliArgs()` SHALL accept `--attempt` as an optional string argument, parse it as a base-10 integer, require it to be non-negative, and include `attempt` in the returned args object. The value SHALL default to 0 when absent, unparseable, negative, non-integer, or present without a value. When `--attempt` is present without a value immediately before another option token, the parser SHALL NOT consume that following option as the attempt value.

The `--attempt` flag SHALL NOT affect gate rule evaluation or routing — it only affects the diagnostic output (advice). The gate's pass/fail determination is independent of the attempt hint.

#### Scenario: Gate CLI returns fatigue warning on agent-reported high attempt

- **WHEN** a gate CLI is invoked with `--attempt 3` and the gate evaluates to fail
- **THEN** the JSON output SHALL include `"fatigue_warning": true` in `check`
- **AND** the JSON output SHALL include `"step_back": true` in `check`
- **AND** `advice` SHALL include a fatigue alert message with the Agent-reported attempt count
- **AND** `advice` SHALL include a conditional stop:no reminder rather than asserting every gate invocation is stop:no
- **AND** `advice` SHALL NOT claim that the Engine verified the true consecutive failure count

#### Scenario: Gate CLI does not return fatigue warning below threshold

- **WHEN** a gate CLI is invoked with `--attempt 1` and the gate fails
- **THEN** `fatigue_warning` and `step_back` SHALL NOT appear in the JSON output
- **AND** the standard failure advice SHALL still be present

#### Scenario: Gate CLI does not return fatigue warning on pass

- **WHEN** a gate CLI is invoked with `--attempt 5` and the gate passes
- **THEN** `fatigue_warning` and `step_back` SHALL NOT appear in the JSON output

#### Scenario: Gate CLI defaults attempt to 0 when omitted

- **WHEN** a gate CLI is invoked without `--attempt`
- **THEN** the gate SHALL evaluate normally
- **AND** no fatigue diagnostic signals SHALL appear in the output

#### Scenario: Missing --attempt value does not consume the next option

- **WHEN** a gate CLI is invoked with bare `--attempt` or `--attempt --transitions <path>`
- **THEN** `parseGateCliArgs()` SHALL return `attempt: 0`
- **AND** any following valid option token, such as `--transitions`, SHALL remain parsed as that option rather than being consumed as the attempt value
- **AND** the gate SHALL evaluate normally without fatigue signals

#### Scenario: Invalid --attempt value treated as 0

- **WHEN** a gate CLI is invoked with `--attempt notanumber`
- **THEN** `parseGateCliArgs()` SHALL return `attempt: 0`
- **AND** the gate SHALL evaluate normally without fatigue signals

#### Scenario: Negative or non-integer --attempt value treated as 0

- **WHEN** a gate CLI is invoked with `--attempt -1` or `--attempt 3.5`
- **THEN** `parseGateCliArgs()` SHALL return `attempt: 0`
- **AND** the gate SHALL evaluate normally without fatigue signals
