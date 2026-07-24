## 1. Baseline And Contracts

- [x] 1.1 @impl GSK-013, RWG-021: validate the checked-in `verification-plan.yaml` with routing-plan and strict OpenSpec validation before target edits; confirm its direct authority, selected proof classes, and explicit non-claims still match this change.
- [x] 1.2 @impl GSK-013, RWG-021: add focused red tests under `tests/schema/` and `tests/engine/helpers/` for the schema default, exact stable-`rule_id` eligibility, definition-owned `required_floor` restriction, unmasked-rule eligibility, source-level parent mask context without child hint/inspect reconstruction, independent-root retention, and queue/provenance/structure/formal-root fail-closed behavior.

## 2. Shared Gate Projection

- [x] 2.1 @impl GSK-013: extend the common Gate rule schema with `degradation_eligible: boolean` defaulting false. Add a pure Wave-only helper that consumes a parsed definition plus unmasked structured blocking findings, uses exact `finding.rule_id` lookup (never `finding.id` suffix stripping or `failed_rule_ids`), and accepts only definition-owned `required_floor` rules marked eligible. Non-Wave adapters retain no behavior change.
- [x] 2.2 @impl GSK-013, RWG-021: mark only `shared_ref_count_floor`, `per_topic_count_floor`, and `per_topic_ref_md_count_floor` eligible in the active Wave0/Wave1 definitions; route Wave0/Wave1/Wave2 formal wrappers through the helper; remove duplicated adapter-local allowlists; preserve zero active Wave2 eligible rules and all existing fatigue/lifecycle/routing/durable-attempt behavior.
- [x] 2.3 @impl RWG-021: preserve the existing one-call-per-command pure evaluator projection in every Wave formal/inspect command. Retain source-level prerequisite `masked_rule_ids`, stable rule IDs, and independent roots; do not manufacture dependent findings or let format-specific additions rebuild masking or eligibility.
- [x] 2.4 @impl GSK-013, RWG-021: add one inactive schema-valid Wave2 definition fixture through the production schema and shared formal-helper path; preserve zero active Wave2 eligible rules and add no test-only production CLI injection seam.

## 3. Regression And Release

- [x] 3.1 @impl GSK-013, RWG-021: run focused schema/helper unit, integration, and deterministic disposable-bundle regressions for quality-only eligible handoff, Wave1 authority-root refusal, Wave2 inactive positive fixture, exact-ID no-suffix-stripping, and formal/inspect core-root parity.
- [x] 3.2 @impl GSK-013, RWG-021: update `CHANGELOG.md` and `DPT_FRAMEWORK/RUN.md` to `v0.47` without claiming a live production Wave2 degradation result.
- [x] 3.3 @impl GSK-013, RWG-021: run routing assets validation, non-goal review, strict OpenSpec validation, and `git diff --check` scoped to this change's touched framework, root-test, and release-documentation paths; confirm no graph/controller/state/automatic downgrade/production Wave2 eligible rule was added.
- [x] 3.4 @impl GSK-013, RWG-021: sync accepted delta specs and run `node openspec/governance/check-project-reqs.mjs` with zero duplicate, orphan, unregistered, or reused-retired IDs.
- [x] 3.5 @impl GSK-013, RWG-021: run `node openspec/governance/check-project-specs.mjs` with zero delta-header-in-main, missing-purpose, missing-requirements, or missing-req-header violations.
