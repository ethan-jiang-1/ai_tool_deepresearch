## 1. Apply Preconditions

- [ ] 1.1 Register pending `BUM-005`, `ACS-005`, and `RUE-006` in their existing `req-registry.yaml` capability groups, preserving prefix and numeric ordering; run `node openspec/governance/check-project-reqs.mjs` to confirm the active delta IDs are registered.
- [ ] 1.2 Run `node openspec/governance/check-verification-routing.mjs --change add-run-bundle-continuation-card --mode plan` before editing targets, and record any correction in the change artifacts rather than bypassing route validation.

## 2. Verification Assets

- [ ] 2.1 Implement `BUM-005` deterministic integration coverage under `tests/integration/cli/` that invokes the real production instantiator on a temporary target and asserts the rendered `BUNDLE_MAP.md` continuation card, exact static substitutions, canonical playbook pointer, passive-boundary wording, and absence of run-local bridge/control files.
- [ ] 2.2 Implement the selected `ACS-005` Agent-flow playbook at `experiments_playbook/exp_bundle_continuation/case-801-heavy-attached-card-continuation.md` and register it in the active playbook manifest. Use a fresh disposable bundle and native trace-backed verdict; assert the real Agent follows existing diagnostics/current-node handling and creates no card-derived authority.

## 3. Continuation Card And Procedure

- [ ] 3.1 Implement `BUM-005` in `DPT_FRAMEWORK/rb_templates/BUNDLE_MAP.md.tmpl`: render the concise continuation section with bundle name, creation framework version, ordinary-language invitation, candidate-root warning, direct-source pointers, and one framework-owned playbook link while preserving all existing map sections as passive navigation.
- [ ] 3.2 Implement `ACS-005` with `DPT_FRAMEWORK/command_playbook/continue-run-bundle.md`. Define the ordered Agent reload procedure using the existing bundle controls, structural/reentry diagnostics, `current_node` semantics, check/inspect/advice feedback, lifecycle `stop` boundary, factual-turn boundary, and existing post-final recovery; do not create a CLI, state field, bridge file, route selector or copied lifecycle procedure.
- [ ] 3.3 Update `DPT_FRAMEWORK/COMMANDS.md`, `DPT_FRAMEWORK/README.md`, and `DPT_FRAMEWORK/RUN.md` for `ACS-005` / `RUE-006`: distinguish card-based existing-bundle continuation from the new-run `RUN.md` trigger, point every surface to the one continuation playbook, and retain Agent/Engine authority and no-third-HITL language.
- [ ] 3.4 Review the production instantiator/reporting and relevant bundle inspection guidance for `BUM-005`; make only the minimum template/rendering or user-facing inventory changes needed for the generated card, while preserving legacy map readability and not adding card parsing/validation or bundle migration.

## 4. Release And Verification

- [ ] 4.1 Run the selected integration test and relevant existing bundle-instantiation, bundle-map, command-surface, run-entry, and reentry regression tests. Confirm `BUM-005`, `ACS-005`, and `RUE-006` do not change existing CLI/state/trace authority.
- [ ] 4.2 Execute the selected `agent_flow_e2e` continuation case through the approved experiment route and retain its native trace verdict; do not count a static file or Coding-Agent summary as Agent-behavior evidence.
- [ ] 4.3 Update repo-root `CHANGELOG.md` for v0.43 and synchronize the `DPT_FRAMEWORK/RUN.md` version banner to v0.43.
- [ ] 4.4 Run `node openspec/governance/check-verification-routing.mjs --change add-run-bundle-continuation-card --mode assets` and resolve every route/asset/manifest finding.
- [ ] 4.5 Run `node openspec/governance/check-project-reqs.mjs` and confirm PASS (0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired).
- [ ] 4.6 Run `node openspec/governance/check-project-specs.mjs` and confirm PASS (0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader).
