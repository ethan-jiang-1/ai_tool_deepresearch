> req: ACS-004

## MODIFIED Requirements

### Requirement: Phase-boundary terminology is discoverable

Guidance and Agent-facing docs SHALL make the conceptual distinction between phase transition, phase handoff, work completion, and witnessing discoverable without renaming existing machine-level fields, trace events, or CLI names.

The terminology canon SHALL define:

- `phase transition`: synchronization of runtime status such as `rb_status.json` current/next gate state;
- `phase handoff`: the Phase Agent consuming gate CLI `check.next` through the accepted loader/check path and entering the next Markdown control surface;
- `work completion`: target-phase artifacts and gate/content rules proving the target phase's work is done; and
- `witnessing`: Engine-written evidence that binds a deterministic gate output to the subsequent handoff, such as the ordered `gate_attempt(passed=true,next=<target>)` and route-bound `load_complete(entry=<target>)` pair; and
- `current_node`: when non-null, the durable `rb_status.json` coordinate for the lifecycle Markdown control surface most recently loaded by successful route-bound `enter-phase`.

The docs SHALL state that `enter-phase` / `load_complete` proves entry into the target node, not target-phase work completion. Existing machine names such as `phase_transition`, `advance-status`, `enter-phase`, `load_complete`, `stop: no`, and capability names SHALL remain stable unless a separate migration changes them.

Agent-facing resume guidance, including command playbooks for an already-existing active bundle, SHALL prefer non-null `rb_status.json.current_node` as the phase Markdown coordinate. It SHALL NOT tell the Agent to infer the active phase from `current_gate` alone. If `current_node` is `null` or absent, guidance SHALL direct the Agent to existing `BUNDLE_MAP.md`, trace, and reentry diagnostics rather than guessing the phase from the gate window. Legacy `START_FROM_HERE.md` SHALL be named only as deprecated fallback for old bundles.

#### Scenario: Terminology canon names the boundary layers
- **WHEN** an Agent or maintainer reads the guidance glossary or execution-model terminology canon
- **THEN** it SHALL distinguish phase transition, phase handoff, work completion, and witnessing
- **AND** it SHALL preserve existing machine-level names as stable implementation vocabulary

#### Scenario: Command docs do not overclaim handoff witness
- **WHEN** command docs describe `enter-phase`
- **THEN** they SHALL describe it as consuming `check.next` and witnessing entry/loading of the next control surface
- **AND** they SHALL NOT describe it as completing the target phase's work

#### Scenario: Existing active bundle guidance uses current node
- **WHEN** an Agent-facing command playbook describes resuming an already-existing bundle
- **THEN** it SHALL tell the Agent to use non-null `rb_status.json.current_node` as the preferred phase Markdown coordinate
- **AND** it SHALL distinguish `current_node` from `current_gate` and `next_gate`
- **AND** it SHALL NOT tell the Agent to judge the current phase from `current_gate` alone

#### Scenario: Missing current node falls back to diagnostics
- **WHEN** an existing bundle has `rb_status.json.current_node: null` or no `current_node`
- **THEN** resume guidance SHALL direct the Agent to existing `BUNDLE_MAP.md`, trace, and reentry diagnostics
- **AND** it SHALL NOT guess the phase from `current_gate` alone
