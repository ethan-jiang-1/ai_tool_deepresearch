# Verification Routing (delta)

> req: VER-001, VER-002, VER-003, VER-004
> invariants: VER-I1, VER-I2, VER-I3

## ADDED Requirements

### Requirement: Verification claims SHALL route through one of three methods

The project SHALL use exactly three verification methods:

| Method | Permitted claim | Required asset boundary | Native verdict authority |
| --- | --- | --- | --- |
| `regression` | deterministic schema, helper, CLI, or cross-phase Engine contract | `tests/` with `node:test`; fixtures and isolated temporary state are allowed | test process exit and assertions |
| `controlled_e2e` | Agent-facing workflow behavior in a controlled runtime | `experiments_playbook/` case playbook plus a fresh `dpt_disp_*` bundle | bundle-root `rb_trace.jsonl` verdict checks |
| `real_environment_e2e` | production-runtime behavior, real external conditions, or live Agent/sub-agent behavior in a selected run | an explicitly selected `dpt_rb_*` bundle and its real runtime artifacts | selected bundle's trace, receipts, ledger, and artifacts |

Unit, integration, and cross-phase CLI scenario are regression scopes, not additional verification methods. A regression fixture SHALL NOT claim Agent search, judgment, writing, repair, synthesis, or production behavior. A controlled E2E fixture MAY prove only the deterministic boundary reached after that fixture; an Agent-dependent claim SHALL execute a real Agent or native sub-agent path. A real-environment claim SHALL NOT be satisfied by a disposable bundle or a hand-written result.

#### Scenario: Cross-phase deterministic claim routes to regression

- **WHEN** a change claims that an Engine CLI filters current-round rows or rejects a missing authority reference
- **THEN** it SHALL place the proof under `tests/` and exercise the production CLI boundary with isolated temporary state
- **AND** it SHALL NOT create a top-level `tests_e2e/` suite or claim Agent behavior

#### Scenario: Agent recovery claim routes to controlled E2E

- **WHEN** a change claims that an Agent follows phase instructions to write a rerun direction and recover a controlled interruption
- **THEN** it SHALL provide a runnable `experiments_playbook/` case over a fresh `dpt_disp_*` bundle
- **AND** the case verdict SHALL come from trace checks produced by the actual execution

#### Scenario: Production claim routes to real environment evidence

- **WHEN** a claim depends on production host conditions, live search, or actual long-running Agent behavior
- **THEN** it SHALL route to `real_environment_e2e`
- **AND** it SHALL NOT be reported as passed from fixtures, a disposable bundle, or a static document check

### Requirement: Each change SHALL declare a verification plan

Every new change SHALL contain `verification-plan.yaml` at its change root. It SHALL use `schema_version: verification-routing/v1`, name the owning change, and declare all three methods as `selected`, `deferred`, or `not_applicable` with a concise rationale.

For each selected proof claim, the plan SHALL declare a stable claim id, claim class, exactly one selected method, the planned asset path or runtime selector, production-distance facts, and the native verdict authority. A deferred real-environment claim SHALL state the trigger that would make live observation necessary. The plan SHALL distinguish a fixture-backed deterministic claim from a real-Agent claim; it SHALL NOT use an ambiguous "E2E" label as evidence scope.

`verification-plan.yaml` is the direct Source of Record for route selection only. It SHALL NOT record PASS/FAIL, synthesize execution evidence, or replace the evidence authority named by its selected method.

#### Scenario: A plan makes a deferred production route explicit

- **WHEN** a change has deterministic and controlled-E2E proof but no approved production run to observe
- **THEN** its plan SHALL mark `real_environment_e2e` as `deferred` and name its observation trigger
- **AND** it SHALL NOT infer a production PASS from the other two methods

#### Scenario: A plan distinguishes fixture distance from Agent proof

- **WHEN** a controlled playbook preloads a valid result or bundle state to reach an Engine checkpoint
- **THEN** the plan SHALL label that claim as fixture-backed Engine evidence
- **AND** any separate Agent-flow claim SHALL name a real-Agent playbook asset and trace verdict

### Requirement: Verification routing SHALL be checked without becoming a runner

The project SHALL provide `node openspec/governance/check-verification-routing.mjs --change <name> --mode plan|assets`.

`--mode plan` SHALL validate the plan's schema, all-three-method decision coverage, claim-to-method compatibility, and verdict-authority declaration before implementation. `--mode assets` SHALL additionally validate that selected repository assets exist at their declared ownership boundary: regression tests under `tests/`, runnable controlled-E2E case playbooks under `experiments_playbook/`, and no repository stand-in for a deferred real-environment run.

The validator SHALL be read-only. It SHALL NOT execute a playbook, invoke an Agent, fabricate trace events, alter a bundle, aggregate PASS/FAIL, or turn a user decision into a production mutation capability. `openspec/config.yaml` and each change's tasks SHALL require plan validation before apply and asset validation before archive alongside the existing governance checks.

#### Scenario: Invalid asset route fails before apply

- **WHEN** a plan routes an `agent_flow` claim to a `tests/` fixture or declares a controlled-E2E playbook outside `experiments_playbook/`
- **THEN** `check-verification-routing.mjs --mode plan` or `--mode assets` SHALL fail with the claim id and the nearest correction
- **AND** the change SHALL not proceed as if the claim were covered

#### Scenario: Validator does not manufacture a verdict

- **WHEN** a plan and its selected asset paths are structurally valid
- **THEN** the validator SHALL report only route validity
- **AND** it SHALL NOT report a regression, trace, or production PASS until the native evidence path has actually run

### Requirement: Rerun round continuity SHALL establish the first routed proof set

The initial application of this capability SHALL replace the backlog's proposed fourth `tests_e2e/` layer with a routed proof set for rerun round continuity:

- deterministic direction resolution remains covered by focused regression tests;
- current-round `--eligible-rows` filtering and per-row authority findings SHALL be exercised through actual CLI-consumer integration tests under `tests/integration/cli/`, using isolated temporary bundles and no direct reimplementation of Engine filtering;
- writing a current round direction and recovering the controlled direction/profile interruption SHALL be covered by a runnable real-Agent controlled-E2E case using a fresh disposable bundle and trace-backed verdict;
- real-environment observation SHALL remain an explicit deferred route until a production bundle is selected for that purpose.

The missing `experiments_playbook/exp_rerun-round-continuity/` asset referenced by `seed-backfill-round-continuity` task 10.7 SHALL NOT count as evidence merely because that task is checked. The new controlled-E2E case and its runner registration SHALL exist and be executed before an Agent-flow claim is reported as covered.

#### Scenario: CLI scenario does not self-implement eligible-row logic

- **WHEN** the rerun regression scenario verifies current-round eligible rows
- **THEN** it SHALL invoke the accepted work-unit inspect CLI and assert its structured result
- **AND** it SHALL not pass solely by reading the index and reproducing the filter in test code

#### Scenario: Controlled rerun playbook is a real runnable asset

- **WHEN** the rerun Agent-flow case is added
- **THEN** it SHALL be a `case-*.md` playbook with valid frontmatter, a disposable-bundle setup, an explicit real-Agent dependency, trace checks, and an active runner-manifest entry
- **AND** a README or scripted filesystem projection alone SHALL NOT satisfy the case

#### Scenario: Deferred live observation remains honest

- **WHEN** the initial rerun routing plan is archived without a selected production bundle
- **THEN** its real-environment route SHALL remain `deferred`
- **AND** archive evidence SHALL state that no real production behavior claim was proven
