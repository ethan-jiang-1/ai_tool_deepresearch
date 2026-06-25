# Workflow Directory Contract (Delta)

> req: WDC-002

## ADDED Requirements

### Requirement: Manifest includes rerun phase entry

`DPT_FRAMEWORK/workflows/manifest.json` SHALL include a `rerun` phase entry in its `phases` array:

```json
{ "key": "rerun", "node": "phases/phase-rerun.md", "gate": "rerun-ready" }
```

The rerun phase SHALL be registered as a phase node with its corresponding gate. Its position in the manifest array SHALL NOT imply linear runtime order — the manifest is an inventory, not a routing table.

#### Scenario: Manifest lists rerun phase

- **WHEN** a workflow consistency validator scans manifest.json
- **THEN** it SHALL find `rerun` among the registered phase keys with node `phases/phase-rerun.md` and gate `rerun-ready`

#### Scenario: Rerun node file exists

- **WHEN** manifest references `phases/phase-rerun.md`
- **THEN** the file SHALL exist at `DPT_FRAMEWORK/workflows/nodes/phases/phase-rerun.md`
