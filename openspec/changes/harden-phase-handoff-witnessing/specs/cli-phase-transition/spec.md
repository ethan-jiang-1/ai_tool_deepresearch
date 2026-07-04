## ADDED Requirements

> req: CPT-003, CPT-004

### Requirement: Enter phase CLI witnesses lifecycle node entry

The framework SHALL provide an Agent-facing `enter-phase.mjs` CLI for consuming a gate CLI `check.next` fileRef and rendering the next lifecycle node through the existing workflow loader.

Usage:

```bash
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle <path> --node <fileRef>
```

- `--bundle` SHALL point to an existing runtime bundle containing `rb_trace.jsonl`.
- `--node` SHALL be a workflow node fileRef such as `phases/phase-wave1.md`.
- The CLI SHALL call the existing `assessNode()` loader path with a trace bound to `<bundle>/rb_trace.jsonl`.
- The CLI SHALL preserve the existing loader trace events including `load_start`, `dependency_resolved`, and `load_complete`.
- The CLI SHALL render the loaded dependency closure in plan order as Agent-readable Markdown on stdout so the Phase Agent can read that Markdown into conversation context and continue the Agent-driven loop.
- The CLI SHALL NOT choose the next node, mutate `rb_status.json`, run gate checks, drive the lifecycle loop, execute Markdown instructions, execute research work, or write phase artifacts.

#### Scenario: Enter phase emits load complete witness

- **WHEN** `enter-phase.mjs --bundle <bundle> --node phases/phase-wave1.md` is called
- **THEN** `rb_trace.jsonl` SHALL contain a `load_complete` event with `entry: "phases/phase-wave1.md"`
- **AND** stdout SHALL include the rendered Markdown content loaded by `assessNode()`
- **AND** `rb_status.json` SHALL NOT be modified

#### Scenario: Enter phase preserves autonomous header injection

- **WHEN** `enter-phase.mjs` loads a manifest lifecycle `stop: no` phase
- **THEN** the rendered Markdown SHALL include the autonomous or terminal contract header injected by `assessNode()`
- **AND** the header SHALL appear before the phase body content returned to the Agent

### Requirement: Advance status refuses unwitnessed or unpassed phase handoffs

`advance-status.mjs` SHALL fail closed before mutating `rb_status.json` when the requested transition cannot be backed by trace evidence.

Before writing `current_gate`, `next_gate`, or `phase_transition`, the CLI SHALL read `rb_trace.jsonl` and verify:

- the deterministic gate associated with the requested phase transition has at least one `gate_attempt` event with `passed: true`; and
- when the requested state implies entry into a non-initial lifecycle node, the target node has a `load_complete` witness written by `enter-phase` or the same loader path.

On failure, the CLI SHALL print JSON with `status: "error"`, a short `reason`, and `advice[]` naming the missing trace condition and the appropriate `enter-phase --bundle <path> --node <fileRef>` remedy when a node entry witness is missing. It SHALL exit non-zero and SHALL NOT mutate `rb_status.json` or append `phase_transition`.

The existing success output shape SHALL be preserved.

#### Scenario: Advance status rejects missing gate pass

- **WHEN** `advance-status.mjs --bundle <bundle> --to wave1_complete` is called
- **AND** `rb_trace.jsonl` has no relevant `gate_attempt` with `passed: true`
- **THEN** the CLI SHALL exit non-zero with `status: "error"`
- **AND** `rb_status.json` SHALL NOT be modified
- **AND** no `phase_transition` event SHALL be appended

#### Scenario: Advance status rejects missing phase entry witness

- **WHEN** `advance-status.mjs --bundle <bundle> --to wave1_complete` is called after the prior gate passed
- **AND** `rb_trace.jsonl` has no `load_complete` for `phases/phase-wave1.md`
- **THEN** the CLI SHALL exit non-zero with advice to run `enter-phase --bundle <bundle> --node phases/phase-wave1.md`
- **AND** `rb_status.json` SHALL NOT be modified

#### Scenario: Advance status succeeds after witnessed handoff

- **WHEN** the prior gate has `gate_attempt(passed=true)` in trace
- **AND** the target lifecycle node has `load_complete` in trace
- **AND** `advance-status.mjs --bundle <bundle> --to wave1_complete` is called
- **THEN** `rb_status.json` SHALL be updated using the existing chain lookup behavior
- **AND** stdout SHALL retain `{ "status": "ok", "current_gate": "<value>", "next_gate": "<value>" }`
- **AND** a `phase_transition` trace event SHALL be appended
