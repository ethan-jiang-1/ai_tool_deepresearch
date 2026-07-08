# Apply Audit: restore-wave-depth-contracts

## Affected Implementation Surfaces

- Agent-facing phase docs:
  - `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md`
  - `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave2.md`
  - `DPT_FRAMEWORK/workflows/nodes/phases/subagent-dpt-evidence-extractor.md`
  - `DPT_FRAMEWORK/workflows/nodes/shared/shared-schemas.md`
  - `DPT_FRAMEWORK/workflows/nodes/shared/shared-gate-rules.md`
- Work-unit submit/result contract:
  - `DPT_FRAMEWORK/schema/contracts/work-unit.mjs`
  - `DPT_FRAMEWORK/engine/work-unit-core.mjs`
  - `DPT_FRAMEWORK/engine/helpers/gate-helpers-checks.mjs`
  - `DPT_FRAMEWORK/engine/helpers/gate-helpers-provenance.mjs`
- Wave gate definitions and CLIs:
  - `DPT_FRAMEWORK/schema/gate_definitions/gate-wave1-complete.definition.json`
  - `DPT_FRAMEWORK/schema/gate_definitions/gate-wave2-complete.definition.json`
  - `DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs`
  - `DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs`
  - `DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs`
- New deterministic helper surface:
  - `DPT_FRAMEWORK/engine/helpers/wave-depth-contracts.mjs`
- Tests:
  - `tests/engine/wave-depth-contracts.test.mjs`
  - `tests/engine/work-unit-submit.test.mjs`
  - `tests/integration/cli/check-gate-wave1-complete.test.mjs`
  - `tests/integration/cli/check-gate-wave2-complete.test.mjs`
  - `tests/integration/md/phase-wave2-md-structure.test.mjs`
  - `tests/integration/md/phase-wave2-queue-loop.test.mjs`
  - new/updated Wave1 Markdown static checks
- Controlled playbooks:
  - `experiments_playbook/exp_wfn_wave1/*`
  - `experiments_playbook/exp_wfn_wave2/*`
  - `experiments_playbook/exp_wff_wave-chain/*`
  - `experiments_playbook/RUN_EXPS.md`
- Version surfaces:
  - `CHANGELOG.md`
  - `DPT_FRAMEWORK/RUN.md`

## Bug To Deterministic Surface Mapping

- BUG-054 Wave1 shallow/no-new-discovery:
  - Agent-facing demand: Wave1 phase and sub-agent role require new topic-specific sources, depth dimensions, profile checks, and post-submit depth review.
  - Deterministic checks: `depth-review.yaml` parser, exact URL novelty floor, closed depth-review decisions, submitted work-unit coverage.
- BUG-058 Wave1 cache trails too thin:
  - Submit/gate checks preserve cache trail content and map every submitted accepted source claim to a verified cache trail or explicit degraded capture.
  - Prose-only links remain diagnostic and cannot become coverage authority.
- BUG-055 Wave2 skips synthesis depth:
  - Agent-facing demand: scan matrix, confidence triage, gap analysis, finding decisions, and conditional targeted evidence before pure synthesis.
  - Deterministic checks: finding-index required fields, `gap_status`, `synthesis_eligibility`, scan coverage, targeted-evidence receipt/routing consistency.

## Boundary Confirmation

- No retired `content_dedup`, homepage/path-depth, Jaccard, or self-reference gate heuristic is reintroduced.
- JS checks remain deterministic process/structure/provenance checks; semantic research judgment stays in Agent guidance and HITL surfaces.
- Pure Wave2 synthesis remains legal without delegated rows when `finding-index.yaml` proves no unresolved search-required gap.

## Validation Notes

- `node DPT_FRAMEWORK/cli/validate-workflow-package.mjs --workflows-dir DPT_FRAMEWORK/workflows --gate-defs-dir DPT_FRAMEWORK/schema/gate_definitions` PASS with `{ "passed": true, "issues": [] }`.
- `node DPT_FRAMEWORK/cli/validate-playbook.mjs experiments_playbook/` PASS: 88 passed, 0 failed.
- Fixture-backed controlled smoke PASS:
  - `node experiments_env/shared/run-fixture-backed-case.mjs --case case-224 --target-dir tests/.test-bundles --cleanup-pass`
  - `node experiments_env/shared/run-fixture-backed-case.mjs --case case-235 --target-dir tests/.test-bundles --cleanup-pass`
  - `node experiments_env/shared/run-fixture-backed-case.mjs --case case-151 --target-dir tests/.test-bundles --cleanup-pass`
  - `node experiments_env/shared/run-fixture-backed-case.mjs --case case-222 --target-dir tests/.test-bundles --cleanup-pass`
  - `node experiments_env/shared/run-fixture-backed-case.mjs --case case-233 --target-dir tests/.test-bundles --cleanup-pass`
- These smoke results prove deterministic Engine/gate/playbook contracts on disposable fixture bundles. They do not claim real-Agent search or synthesis quality.
- Version surfaces updated to `v0.8`: repo-root `CHANGELOG.md` and `DPT_FRAMEWORK/RUN.md`.
- Targeted regression PASS:
  - `node --test tests/engine/wave-depth-contracts.test.mjs tests/engine/work-unit-submit.test.mjs tests/engine/helpers/gate-helpers-checks.test.mjs` PASS: 39 tests, 0 failures.
  - `node --test tests/integration/cli/check-gate-wave1-complete.test.mjs tests/integration/cli/check-gate-wave2-complete.test.mjs tests/integration/md/wave-depth-contract-guidance.test.mjs tests/integration/md/no-phase-bypass-advice.test.mjs tests/integration/cli/validate-workflow-package.test.mjs tests/integration/cli/validate-playbook.test.mjs` PASS: 61 tests, 0 failures.
- Governance PASS:
  - `node openspec/governance/check-project-reqs.mjs` PASS: 452 registered, 49 retired, 0 orphan.
  - `node openspec/governance/check-project-specs.mjs` PASS: 70 main spec files, 0 violations.
