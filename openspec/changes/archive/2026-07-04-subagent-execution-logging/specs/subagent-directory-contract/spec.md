# Subagent Directory Contract (delta)

> req: SDC-001, SDC-002

## Purpose

Formalize `_subagents/` as the canonical directory for **relay-managed sub-agent slot artifacts** within the run bundle.
This closes a long-standing gap: the `_subagents/wave_NN/slot_MM/` convention was implicit in engine code
(`DPT_FRAMEWORK/engine/subagent-relay.mjs`), protocol docs (`shared-subagent-protocol.md`), and gate checks
(`gate-helpers-provenance.mjs`), but no spec formally declared it as THE relay communication directory between
the main Phase Agent and sub-agents. WDC-004 (bundle canonical structure) listed `seed_topics/`, `reference/`,
`artifacts/`, `final/`, `_cache/` — omitting `_subagents/`.

**Scope boundary:** SDC governs the relay slot channel only (`task.md`, beacon, receipts, dispatch, result,
status, agent metadata). Sub-agent writes to `_cache/`, `reference/`, and `artifacts/` remain governed by
WDC / task-card / output-declaration contracts — they are **not** relay slot artifacts and are outside SDC.

This omission caused experiments to invent ad-hoc paths (`_fixtures/`, `/tmp` subdirectories) that bypass the
standard relay convention and made post-run provenance evidence impossible to find at a predictable location.

## ADDED Requirements

### Requirement: `_subagents/` SHALL be the sole directory for relay-managed slot artifacts

The `_subagents/wave_NN/slot_MM/` path SHALL be the sole directory for relay-managed sub-agent slot artifacts
between the main Phase Agent and sub-agents. This includes:

- beacon delivery (`_beacon.json`: `bundle_dir`, `log_cli`, `slot_key`, `receipt_nonce`)
- task assignment (`task.md`)
- schema constraint (`result.schema.json`)
- result collection (`result.json`, `result.md`)
- runtime receipts (`runtime-receipt.jsonl`)
- engine-written identity and status (`_agent.json`, `_status.json`)
- wave-level dispatch manifests (`dispatch.json` under `_subagents/wave_NN/`)

Sub-agent intermediate work under `_cache/` and authority outputs under `reference/` / `artifacts/` SHALL NOT
be relocated into ad-hoc directories to bypass this relay convention.

The `_subagents/` convention SHALL be identical for production runs and experiment/playbook executions.
Experiments SHALL NOT create ad-hoc relay directories that bypass or replicate the `_subagents/` structure.

#### Scenario: `_subagents/` is the predictable relay evidence location
- **WHEN** a run bundle is inspected for relay slot / provenance evidence
- **THEN** `_subagents/wave_NN/slot_MM/` SHALL contain all relay-managed slot artifacts
- **AND** its internal structure SHALL follow the slot file contract (SUS-001)

#### Scenario: Experiment uses the same `_subagents/` convention as production
- **WHEN** an experiment playbook needs sub-agent relay slot directories
- **THEN** it SHALL use disposable bundles with the standard `_subagents/wave_NN/slot_MM/` structure
- **AND** SHALL NOT create ad-hoc directories like `_fixtures/`, `_comm/`, or `/tmp` subdirectories for relay slot artifacts

### Requirement: Relay slot artifacts SHALL NOT reside outside `_subagents/`

Relay-managed sub-agent slot artifacts SHALL reside exclusively under `_subagents/wave_NN/slot_MM/`.
The following SHALL NOT be used for relay slot artifacts:

- `/tmp` or any system temporary directory
- Ad-hoc bundle subdirectories (e.g., `_fixtures/`, `_comm/`, `_slots/`, `_tiers/`)
- Experiment-private directories that bypass the `_subagents/` relay convention
- Any path that is not a valid `_subagents/wave_NN/slot_MM/` under the active run bundle

Gate provenance checks and subagent slot presence checks SHALL only scan `_subagents/` for relay slot artifacts.
Relay slot artifacts placed outside `_subagents/` SHALL be invisible to provenance verification and slot binding.

#### Scenario: External relay path is invisible to provenance forensics
- **WHEN** a would-be slot result is written only to `/tmp/result.json` or `_fixtures/t1/result.json`
- **AND** `_subagents/wave_NN/slot_MM/` contains no corresponding relay slot artifacts
- **THEN** provenance forensics SHALL NOT treat the external file as slot evidence
- **AND** subagent slot presence / provenance checks SHALL report missing relay slot evidence for the expected slot

#### Scenario: Experiment fixture uses proper disposable bundle, not ad-hoc directory
- **WHEN** an experiment needs isolated tier environments for forensic testing
- **THEN** each tier SHALL use its own disposable bundle (`dpt_disp_*`) created via `new-disposable-bundle.mjs`
- **AND** each disposable bundle SHALL contain a standard `_subagents/wave_NN/slot_MM/` structure
- **AND** the experiment SHALL NOT create `_fixtures/`, `/tmp` subdirectories, or other ad-hoc relay paths
