# CLI Exit Code Conventions

> req: CLE-001, CLE-002, CLE-003, CLE-004

## Purpose

Define the discoverable framework CLI exit-code convention. Exit codes are coarse control-flow signals for shell/runner branching, while actionable detail is carried by structured stdout. This capability establishes the canonical tri-state interpretation, prohibits morale/continuation encoding in exit codes, documents known exceptions, and requires regression coverage.

## Requirements

### Requirement: Framework CLI exit-code contract is discoverable

The framework SHALL document a discoverable CLI exit-code convention in a top-level Agent-facing command location and in the CLI implementer guide.

The top-level documentation SHALL present the convention as a canonical interpretation and target convention for Agent callers, not as proof that every current CLI already shares the same runtime helper. It SHALL state that exit codes are coarse control-flow signals for shell/runner branching, while actionable detail is carried by structured stdout. For gate CLIs, the primary structured output SHALL be the gate result JSON containing `check`, `routing`, `inspect`, and `advice`. For non-gate CLIs, the command documentation SHALL identify the structured stdout envelope or documented output the Agent must read before deciding the next action.

The discoverable convention SHALL include the canonical tri-state:

| code | meaning |
| --- | --- |
| `0` | command succeeded or gate passed |
| `1` | normal repairable failure, validation failure, gate rule failure, or business error |
| `2` | configuration, routing contract, or invocation error where the caller used the command incorrectly or the deterministic route/config is invalid |

The documentation SHALL tell Agent callers to read stdout JSON / structured output for `check.passed`, `check.next`, `inspect[]`, `advice[]`, `status`, `reason`, or command-specific detail as applicable. Exit code alone SHALL NOT be treated as the full contract.

#### Scenario: Top-level commands document exit code convention

- **WHEN** the Phase Agent reads `DPT_FRAMEWORK/COMMANDS.md`
- **THEN** it SHALL see a top-level exit-code convention section before or near command tables
- **AND** that section SHALL list codes `0`, `1`, and `2`
- **AND** it SHALL state that structured stdout carries actionable details

#### Scenario: CLI README matches top-level convention

- **WHEN** a maintainer reads `DPT_FRAMEWORK/cli/README.md`
- **THEN** its exit-code section SHALL be consistent with the top-level command index
- **AND** it SHALL preserve gate-specific details such as `routing.kind` handling without contradicting the broader convention

### Requirement: Exit codes do not encode morale or continuation encouragement

Framework CLI exit codes SHALL remain deterministic control-flow signals. They SHALL NOT encode morale, encouragement, user-waiting pressure, perceived progress, fatigue level, or whether the Agent should feel confident continuing.

Continuation guidance, repair strategy, reassurance after high gate friction, and autonomous-continuation reminders SHALL be expressed through structured output such as `advice[]`, Agent-readable Markdown guidance, diagnostic fields, or accepted trace/log diagnostics. These signals SHALL NOT change the numeric exit code if the underlying pass/fail/config condition is unchanged.

#### Scenario: High-friction pass keeps normal pass code

- **WHEN** a gate passes after multiple Engine-visible attempts
- **THEN** the gate MAY include autonomous-continuation advice in `advice[]`
- **AND** the process exit code SHALL remain the normal pass code `0`
- **AND** the exit code SHALL NOT encode fatigue or reassurance

#### Scenario: Repair guidance belongs in advice

- **WHEN** a gate fails with actionable repair instructions
- **THEN** the repair direction SHALL appear in `inspect[]` or `advice[]`
- **AND** the exit code SHALL remain the normal failure code for the command class

### Requirement: Known exit-code exceptions are documented without behavior changes

The exit-code convention documentation SHALL include an explicit current-state inventory of known command classes and exceptions.

At minimum, the inventory SHALL document:

- gate CLIs use the shared gate result helper and emit tri-state `0/1/2`;
- many current non-gate utility CLIs emit binary `0/1` and do not yet share a common exit helper;
- `log-event.mjs` is a documented exception that returns `0` even when logging fails, because diagnostic log/trace write failure must not block Agent flow unless a separate accepted contract says otherwise;
- `check-reentry.mjs` and inspect-style tools may use `2` for caller invocation/config errors even when not routed through the gate helper;
- any known doc/code drift discovered during apply, such as a header documenting an exit code a command does not emit, SHALL be recorded as drift rather than silently normalized in prose.

This change SHALL NOT require runtime behavior reconciliation for these exceptions, and docs SHALL NOT silently describe target behavior as current behavior. Any future effort to unify utility CLIs, change code-2 semantics, or add a shared exit helper SHALL be a separate OpenSpec change.

#### Scenario: Exceptions are visible to Agent callers

- **WHEN** the Agent reads the exit-code convention in `COMMANDS.md`
- **THEN** it SHALL see that gate CLIs, utility CLIs, and `log-event.mjs` do not all currently use the exact same runtime helper
- **AND** it SHALL still receive a canonical interpretation for how to treat each class

#### Scenario: Drift is recorded, not hidden

- **WHEN** implementation audit finds a CLI whose header documents an exit code that the code does not emit
- **THEN** the convention docs or apply notes SHALL record that drift as a known exception or future reconciliation item
- **AND** this change SHALL NOT change the CLI's behavior unless a task explicitly adds that behavior change and updates its spec

### Requirement: Exit-code convention has regression coverage

The project SHALL include regression coverage for the documented exit-code convention and exception inventory.

Coverage SHALL verify both documentation discoverability and representative runtime behavior that can be checked without changing CLI semantics. Representative checks SHALL include:

- a gate CLI or shared gate helper exposes the tri-state convention and structured gate result shape;
- a non-gate utility CLI currently behaves as a documented binary command or documented exception;
- `log-event.mjs` remains documented as an always-0 diagnostic/logging exception;
- current non-gate utility exceptions remain visible rather than being silently normalized into the target convention;
- the docs state that Agent callers must read structured stdout rather than relying only on numeric exit code; and
- the docs state that morale/continuation guidance belongs in advice or Agent-readable prose, not exit code.

The regression SHALL be deterministic, use Node.js built-ins plus existing approved dependencies only, and SHALL NOT require network access or real Agent execution.

#### Scenario: Regression detects missing top-level contract

- **WHEN** `DPT_FRAMEWORK/COMMANDS.md` no longer contains the exit-code convention
- **THEN** the regression SHALL fail
- **AND** the failure SHALL identify the missing documented contract

#### Scenario: Regression detects undocumented exception removal

- **WHEN** `log-event.mjs` remains an always-0 command but the docs stop documenting that exception
- **THEN** the regression SHALL fail
- **AND** the failure SHALL identify the missing exception inventory entry
