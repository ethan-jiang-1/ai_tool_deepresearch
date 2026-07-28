# Apply Verification Results

## Passed Direct Evidence

- `node --test tests/engine/helpers/direct-output-contract.test.mjs tests/engine/work-unit-projection.test.mjs tests/engine/helpers/return-map.test.mjs tests/integration/cli/operate-topic-state-projection.test.mjs tests/integration/cli/check-gate-wave0-complete.test.mjs tests/integration/md/seed-topic-projection-document-contract.test.mjs`: 65/65 passed in 13.279s. This covers bounded direct-output cardinality, authenticated current candidate extraction, duplicate-position preservation, exact entry/deferred coverage, parent-root short-circuiting, public packet apply, shared Wave0 inspect/formal-gate behavior, and template/playbook/phase alignment.
- `node --test tests/engine/version-management.test.mjs tests/engine/framework-version.test.mjs`: 7/7 passed. This confirms the v0.54 changelog and `RUN.md` banner remain aligned.
- `node DPT_FRAMEWORK/cli/validate-workflow-package.mjs --workflows-dir DPT_FRAMEWORK/workflows --gate-defs-dir DPT_FRAMEWORK/schema/gate_definitions --transitions-chain DPT_FRAMEWORK/workflows/transitions.chain.json`: passed with no issues.
- `node openspec/governance/check-verification-routing.mjs --change make-wave0-candidate-projection-complete --mode assets`, `node openspec/governance/check-project-reqs.mjs`, `node openspec/governance/check-project-specs.mjs`, `openspec validate make-wave0-candidate-projection-complete --strict --no-interactive`, and `git diff --check`: passed.

## Unselected Classes

`deterministic_e2e` and `agent_flow_e2e` remain not applicable as declared in
`verification-plan.yaml`. The temporary-bundle integration tests execute the
complete changed deterministic seam, and this change makes no claim about an
independent Agent discovering the convention. No long nested-Agent canary was
added.
