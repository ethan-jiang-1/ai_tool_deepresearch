# Governance Tests

Governance tests verify project requirement/spec registry checks from the regression suite.

Run with:

```bash
node --test tests/governance
```

For direct governance preflight commands, use the scripts under `openspec/governance/`:

| Script | Checks |
| --- | --- |
| `check-all.mjs` | Aggregated read-only health entry: runs every `check-*.mjs`, one line per check, aggregate exit code. `[--change <name>]` forwards the change to the change-requiring checks (discovery / semantic-closure / verification-routing). Not an archive transition. |
| `check-guidance-requirement-ids.mjs` | Guidance/operations/constitution prose requirement-ID tokens resolve against `req-registry.yaml` (alive or DEPRECATED). |
| `check-project-reqs.mjs` | Registry ID consistency: duplicate / unregistered / orphan / reusedRetired; reservation transitions. `--mode plan` default; `--mode archive --change <name>`. |
| `check-project-specs.mjs` | Main spec structure: deltaHeaderInMain / missingPurpose / missingRequirements / missingReqHeader / missingH1 / duplicateH1. |
| `check-capability-taxonomy.mjs` | Catalog ↔ disk 1:1, live path validity. |
| `check-capability-discovery.mjs --change <name>` | Structural validity of the proposal's Capability Discovery record. |
| `check-verification-routing.mjs --change <name> --mode plan|assets` | Verification plan contract and asset routing. |
| `check-semantic-closure.mjs --change <name> --mode plan|assets` | Semantic closure record structure. |
| `check-content-drift.mjs` | Prose path references, CLI tool/verb references, gate-summary coverage. |
| `check-guidance-pointer-targets.mjs` | Guidance/entry pointer targets resolve. |
| `check-surface-inventory.mjs` | Guidance surface inventory consistency. |
| `check-phase-node-structure.mjs` | Workflow phase-node structure. |
| `check-spec-req-ids.mjs` | `> req:` headers are subsets of requirement bodies. |
