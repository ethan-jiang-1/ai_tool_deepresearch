## 1. Baseline And Contracts

- [ ] 1.1 @impl GSK-013, RWG-021: create `verification-plan.yaml`, run routing plan validation and strict OpenSpec validation before target edits; record direct authority, selected proof classes, and explicit non-claims.
- [ ] 1.2 @impl GSK-013, RWG-021: add focused red tests for default-false metadata, minimal parent-root projection, independent-root retention, and queue/provenance/structure fail-closed behavior.

## 2. Shared Gate Projection

- [ ] 2.1 @impl GSK-013: extend the schema-parsed Gate definition/evaluator path with explicit default-false degradation eligibility; remove duplicated adapter-local eligibility projection without changing active policy values.
- [ ] 2.2 @impl RWG-021: make Wave0/Wave1/Wave2 formal and inspect adapters consume one root-first evaluator projection with local prerequisite masking and stable rule IDs.
- [ ] 2.3 @impl GSK-013, RWG-021: add one inactive schema-valid Wave2 eligible-quality fixture through the production adapter; preserve zero active Wave2 eligible rules.

## 3. Regression And Release

- [ ] 3.1 @impl GSK-013, RWG-021: run focused unit/integration and deterministic disposable-bundle regressions for quality-only eligible handoff, Wave1 authority-root refusal, Wave2 inactive positive fixture, and formal/inspect parity.
- [ ] 3.2 @impl GSK-013, RWG-021: update `CHANGELOG.md` and `DPT_FRAMEWORK/RUN.md` to `v0.47` without claiming a live production Wave2 degradation result.
- [ ] 3.3 @impl GSK-013, RWG-021: run routing assets validation, non-goal review, strict OpenSpec validation, and `git diff --check`; confirm no graph/controller/state/automatic downgrade/production Wave2 eligible rule was added.
- [ ] 3.4 @impl GSK-013, RWG-021: sync accepted delta specs and run `node openspec/governance/check-project-reqs.mjs` with zero duplicate, orphan, unregistered, or reused-retired IDs.
- [ ] 3.5 @impl GSK-013, RWG-021: run `node openspec/governance/check-project-specs.mjs` with zero delta-header-in-main, missing-purpose, missing-requirements, or missing-req-header violations.
