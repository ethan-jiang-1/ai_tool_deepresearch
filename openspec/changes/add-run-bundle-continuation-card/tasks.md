## 1. Apply Preconditions

- [x] 1.1 Register pending `BUM-005`, `ACS-005`, `CMI-009`, `EXS-004`, and `RUE-006` in their existing `req-registry.yaml` capability groups, preserving prefix and numeric ordering; run `node openspec/governance/check-project-reqs.mjs` to confirm the active delta IDs are registered.
- [x] 1.2 Run `node openspec/governance/check-verification-routing.mjs --change add-run-bundle-continuation-card --mode plan` before editing targets, and record any correction in the change artifacts rather than bypassing route validation.

## 2. Verification Assets

- [x] 2.1 Extend production creator integration coverage for `BUM-005` / `CMI-009`: invoke the real instantiator on a non-sibling temporary target and assert the card, actual relative framework/repo coordinates, passive-boundary wording, and absence of run-local bridge/control files.
- [x] 2.2 Extend disposable creator integration coverage for `BUM-005` / `EXS-004`: invoke the real creator on a non-sibling temporary target and assert every continuation-card coordinate placeholder is replaced with actual relative navigation text.
- [x] 2.3 Add `ACS-005` / `RUE-006` static integration coverage under `tests/integration/md/` for synchronized root/framework explicit-card routing, the canonical continuation playbook and its index pointers. Assert the explicit/reachable-card precedence, unchanged new-run default, selected-source-context boundary, non-Final target-specific reentry path, null-node boundary, and Final terminal/post-final branch without creating a prose-quality classifier.

## 3. Continuation Card And Procedure

- [x] 3.1 Implement `BUM-005` in `DPT_FRAMEWORK/rb_templates/BUNDLE_MAP.md.tmpl`: render the concise continuation section with bundle name, ordinary-language invitation, candidate-root warning, creator-rendered framework/repo coordinate placeholders, direct-source pointers, and one playbook link while preserving passive navigation.
- [x] 3.2 Implement `CMI-009` / `EXS-004` in both creators: calculate relative framework/repo coordinates from the actual created bundle root and replace all new map placeholders, including non-sibling `--target-dir` layouts, without adding a state field, parser, validator or framework copy.
- [x] 3.3 Implement `ACS-005` with `DPT_FRAMEWORK/command_playbook/continue-run-bundle.md`. Require an already-selected DPT source tree before using card coordinates; for non-Final nodes use existing target-specific reentry diagnostics, for Final read its terminal facts and use post-final inspection/recovery only on a material request. Retain null-node, lifecycle `stop` and factual-turn boundaries; do not create a CLI, route selector or copied lifecycle procedure.
- [x] 3.4 Update `DPT_FRAMEWORK/COMMANDS.md`, `DPT_FRAMEWORK/README.md`, and RUN.md's existing-active-bundle note to point to the one continuation playbook and retain Agent/Engine authority. Keep `RUN.md` itself as the new-run entry apart from that existing-bundle pointer and its required release-banner update.
- [x] 3.5 Implement `RUE-006` in synchronized root/framework `AGENTS.md` and `CLAUDE.md` plus relevant entry guidance: an explicitly supplied reachable existing map routes to continuation before the new-run default; a bare/discovered/unreachable map does not select a run; otherwise preserve existing `RUN.md` / `start-research` routing.

## 4. Release And Verification

- [x] 4.1 Run the selected production/disposable creator and routing/playbook integration tests plus relevant bundle-map, command-surface, run-entry and reentry regressions. Confirm `BUM-005`, `ACS-005`, `CMI-009`, `EXS-004`, and `RUE-006` do not change existing CLI/state/trace authority.
- [x] 4.2 Update repo-root `CHANGELOG.md` for v0.43 and synchronize the `DPT_FRAMEWORK/RUN.md` version banner to v0.43.
- [x] 4.3 Run `node openspec/governance/check-verification-routing.mjs --change add-run-bundle-continuation-card --mode assets` and resolve every route/asset/manifest finding.
- [x] 4.4 Run `node openspec/governance/check-project-reqs.mjs` and confirm PASS (0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired).
- [x] 4.5 Run `node openspec/governance/check-project-specs.mjs` and confirm PASS (0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader).
