## 1. Handoff Guidance

- [x] 1.1 Implement CPT-008: update `DPT_FRAMEWORK/command_playbook/start-research.md` so its generic gate-pass flow orders `check.next` consumption, `enter-phase`, `advance-status --to <source_gate_enum>`, then loaded-phase execution, while retaining the entry/status/work-completion boundary.

## 2. Regression Coverage

- [x] 2.1 Implement CPT-008: extend `tests/engine/command-contract-docs.test.mjs` with a focused assertion that the start-research playbook contains the complete ordered normal handoff contract and does not collapse the existing lifecycle responsibilities.
- [x] 2.2 Run `node openspec/governance/check-verification-routing.mjs --change align-phase-handoff-status-sync-guidance --mode plan` before target edits, then run the focused `node --test tests/engine/command-contract-docs.test.mjs` regression after implementation.

## 3. Governance Verification

- [x] 3.1 Run `node openspec/governance/check-verification-routing.mjs --change align-phase-handoff-status-sync-guidance --mode assets` and `openspec validate align-phase-handoff-status-sync-guidance --strict` after all target edits; both must pass.
- [x] 3.2 Run `node openspec/governance/check-project-reqs.mjs` and confirm zero duplicate, orphan, unregistered, and reused-retired requirement IDs.
- [x] 3.3 Run `node openspec/governance/check-project-specs.mjs` and confirm zero delta-header, purpose, requirement, and requirement-header violations.
