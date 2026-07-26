## 1. Apply Preflight

- [x] 1.1 Run `node openspec/governance/check-verification-routing.mjs --mode plan --change align-wave0-shared-reference-guidance` before target edits and record the passing route plan for RWP-001/RWG-004.

## 2. Wave0 Guidance And Feedback

- [x] 2.1 Implement RWG-004 in `gate-wave0-complete.definition.json`: make unmet `shared_ref_count_floor` feedback and `repair.write_to` name the existing delegated `wave0_source_intake` declared-reference/formal-submit path, never a direct `reference/` write.
- [x] 2.2 Implement RWP-001 in `phase-wave0.md`: replace discretionary shared-reference wording with the conditional producer obligation, retain `source.yaml` as the unchanged required output, and forbid direct Phase creation.

## 3. Focused Deterministic Proof

- [x] 3.1 Repair the `tests/engine/` work-unit fixture helper with the current canonical seed binding and update `ref-count.test.mjs` for legal submitted shared-reference counting plus direct-orphan non-authority (RWP-001/RWG-004).
- [x] 3.2 Add one `tests/integration/cli/` Wave0 gate CLI case that asserts the unmet shared-floor structured repair coordinate names the delegated producer rather than direct `reference/` creation (RWG-004).

## 4. Verification And Release

- [x] 4.1 Run the selected short unit and integration tests; do not add or run deterministic E2E or Agent-flow E2E for this change.
- [x] 4.2 Update root `CHANGELOG.md` and `DPT_FRAMEWORK/RUN.md` to the proposal's `v0.52` release target.
- [x] 4.3 Run `node openspec/governance/check-verification-routing.mjs --mode assets --change align-wave0-shared-reference-guidance` after the selected assets exist.
- [x] 4.4 Run `openspec validate align-wave0-shared-reference-guidance --strict`, `node openspec/governance/check-project-reqs.mjs`, and `node openspec/governance/check-project-specs.mjs`; all must pass before archive.
