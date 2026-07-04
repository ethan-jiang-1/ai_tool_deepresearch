# Subagent Directory Contract (delta)

> req: SDC-001

## MODIFIED Requirements

### Requirement: `_subagents/` SHALL be the sole directory for relay-managed slot artifacts

The `_subagents/wave_NN/slot_MM/` path SHALL be the sole directory for relay-managed sub-agent slot artifacts between the main Phase Agent and sub-agents. This includes beacon delivery (`_beacon.json`), task assignment (`task.md`), schema constraint (`result.schema.json`), result collection, runtime receipts, engine-written identity and status, and wave-level dispatch manifests.

Sub-agent authority outputs under `_cache/`, `reference/`, and `artifacts/` remain outside SDC scope — they are governed by task-card and output-declaration contracts.

#### Scenario: Experiment uses the same `_subagents/` convention as production

- **WHEN** an experiment playbook needs sub-agent relay slot directories
- **THEN** it SHALL use disposable bundles with the standard `_subagents/wave_NN/slot_MM/` structure
- **AND** SHALL NOT create ad-hoc directories like `_fixtures/`, `_comm/`, or `/tmp` subdirectories for relay slot artifacts
