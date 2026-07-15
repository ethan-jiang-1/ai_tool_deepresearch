## Context

The project already has three environment-level verification methods in `openspec/config.yaml` and the root README:

1. `tests/` regression for deterministic code and CLI behavior.
2. `experiments_playbook/` controlled E2E over a real disposable bundle and trace verdict.
3. Real-environment E2E over an explicitly selected production bundle, currently deferred.

`_backlog/plans/tests-e2e-layer.md` discovers a useful missing proof shape, but expresses it as a fourth top-level `tests_e2e/` layer. That mixes two axes: a test's claim subject (Engine versus Agent) and its execution method. It also conflicts with the repository rule that all regression tests live under `tests/`.

The design must make future changes choose evidence deliberately without turning OpenSpec governance into a test runner or allowing a planning document to manufacture a PASS. It also needs to establish the missing rerun controlled-E2E asset without treating the checked-but-absent task in `seed-backfill-round-continuity` as evidence.

## Goals / Non-Goals

**Goals:**

- Establish three stable verification methods and make their asset, claim, and verdict boundaries executable as governance rules.
- Make every new change declare why each method is selected, deferred, or not applicable before apply.
- Give deterministic cross-phase CLI behavior a home inside `tests/`, while giving real Agent-flow claims a trace-backed controlled-E2E path.
- Make the initial rerun continuity route concrete enough to expose missing proof assets and prevent fixture-backed overclaims.
- Preserve the native authority of Node assertions, trace JSONL, and selected runtime bundle facts.

**Non-Goals:**

- Do not create `tests_e2e/`, a fourth project-level test method, a universal test runner, or a `test:all` command that pretends Agent playbooks are Node tests.
- Do not change `DPT_FRAMEWORK/` runtime behavior, schemas, CLI contracts, bundle data, test dependencies, or framework version.
- Do not retroactively force every archived or already-active change to gain a plan; the new requirement applies to changes created after this change is accepted.
- Do not execute a production bundle, invent a real-environment result, or use a user request as a production mutation permission.

## Decisions

### Decision 1: Model proof subject and verification method separately

Every plan records a proof claim and one verification method. The allowed mapping is intentionally small:

| Claim class | Primary method | Permitted exception | Forbidden overclaim |
| --- | --- | --- | --- |
| `deterministic_contract` | `regression` | `controlled_e2e` only when a real disposable-bundle boundary itself is under test; mark fixture distance | Agent or live-production behavior |
| `agent_flow` | `controlled_e2e` | none | fixture/scripted filesystem state as Agent proof |
| `production_behavior` | `real_environment_e2e` | none | disposable-bundle or static proof as production evidence |

This preserves the useful distinction in the backlog while avoiding the false implication that Engine E2E requires a new project-wide layer. A cross-phase CLI scenario remains a regression integration test because its subject is deterministic and its native evidence is a Node test result.

### Decision 2: Add a small change-owned `verification-plan.yaml`

Each new change will own a plan at `openspec/changes/<name>/verification-plan.yaml`. Its intended schema is:

```yaml
schema_version: verification-routing/v1
change: <kebab-case-change-name>
methods:
  regression:
    status: selected | deferred | not_applicable
    rationale: <non-empty text>
  controlled_e2e:
    status: selected | deferred | not_applicable
    rationale: <non-empty text>
  real_environment_e2e:
    status: selected | deferred | not_applicable
    rationale: <non-empty text>
    observation_trigger: <required for deferred or selected production claims>
claims:
  - id: <stable-kebab-case-id>
    class: deterministic_contract | agent_flow | production_behavior
    method: regression | controlled_e2e | real_environment_e2e
    asset:
      kind: regression_test | controlled_playbook | production_runtime
      path: <repository-relative test/playbook path when applicable>
      runtime_selector: <non-secret description for real environment when applicable>
    production_distance:
      fixture: none | fixture_backed
      agent_actor: none | real_agent | real_subagent
      external_calls: none | real | not_applicable
    verdict_authority: node_test_exit | trace_jsonl | runtime_bundle_facts
```

The plan describes planned evidence, not outcomes. It contains no `passed`, `result`, receipt, trace event, or mutable runtime field. During apply, an `implementation-evidence.md` records actual commands and observed outcomes only after they run; it remains a report, while native evidence stays authoritative.

### Decision 3: Use one read-only routing checker, split into plan and asset modes

`openspec/governance/check-verification-routing.mjs` will be a narrow Node ESM checker using only approved `yaml` and Node built-ins.

- `--mode plan` parses the plan, checks its three method decisions, claim uniqueness, claim/method compatibility, non-empty rationales, and native verdict declarations. It runs before apply.
- `--mode assets` performs the same checks after implementation and additionally validates declared repository paths: regression files are under `tests/` and end in `.test.mjs`; controlled cases are under `experiments_playbook/`, use the `case-*.md` form, and pass the existing `validate-playbook.mjs` contract; deferred production claims do not name a repository fixture as live evidence.

The checker does not run tests or playbooks. It delegates playbook frontmatter validation to the existing canonical playbook validator rather than reimplementing that schema. It never writes a trace, bundle, receipt, result, or verdict. This keeps one direct route selector separate from the three actual verdict paths.

`openspec/config.yaml` will require the plan and both checker modes at the appropriate lifecycle points. Change tasks will name the same commands explicitly. The checker accepts `--change <name>` rather than scanning all history, so accepted archival records and pre-existing active changes are not retroactively reclassified.

### Decision 4: Route the rerun continuity proof by claim

The first plan uses three claims:

| Claim | Route | Asset | Evidence boundary |
| --- | --- | --- | --- |
| direction resolver and current-round CLI behavior | `regression` | focused helper test plus `tests/integration/cli/rerun-round-continuity.test.mjs` | actual CLI JSON/exit over an isolated temporary bundle |
| Phase Agent writes current direction and resumes the direction/profile interruption | `controlled_e2e` | `experiments_playbook/exp_rerun-round-continuity/case-318-heavy-rerun-direction-recovery.md` | real Agent execution over a fresh `dpt_disp_*`, verdict from `rb_trace.jsonl` |
| behavior under a selected production run and host conditions | `real_environment_e2e` | no committed fixture; explicit future runtime selector | direct production bundle facts, currently deferred |

The regression test will retain focused unit coverage where the helper itself is the contract. Its integration part will use `spawnSync` against the work-unit inspect CLI and relevant inspect/gate CLI, asserting their structured output rather than reproducing `eligible_rows` filtering in test code. It will create and clean temporary bundles beneath `os.tmpdir()`.

The controlled case will use the established command-experiment form: valid frontmatter, `new-disposable-bundle.mjs`, an explicit real-Agent dependency, actual phase instructions, trace checks, a trace verdict, and runner-manifest registration. It may construct a controlled interruption state only through real legal steps; an inline driver cannot write the Agent's direction and claim that Agent behavior was proven.

### Decision 5: Keep deferred real-environment E2E as a decision, not a blocker

For this change, `real_environment_e2e` is `deferred`. The plan names the trigger: a user-approved production bundle and a claim that depends on live host/Agent/external conditions. The user chooses that scope because it can consume real resources and touch a production run; once chosen, the Agent performs the legal observation and reports runtime facts. No new HITL mode, permission flag, runtime mutation route, or background watcher is introduced.

## Simple Reliable Control Review

- **Direct Source of Record / shortest loop:** `verification-plan.yaml` is direct route-selection authority; the selected native test mechanism supplies the only outcome authority. The loop is plan -> static route check -> one selected execution path -> native verdict.
- **Net simplification:** this rejects the proposed top-level `tests_e2e/`, eliminates the need for `test:e2e`/`test:all` parallel semantics, and prevents the same claim from being described as both fixture proof and Agent proof. It adds one static checker only because no existing checker owns a cross-method route contract.
- **Failure action:** a failed routing check names the claim and the nearest legal method/asset boundary. A failed test remains handled by its existing CLI, test, or trace feedback path.

## Helper-Oriented Responsibility Review

- **User decision:** only the selection of a production `dpt_rb_*` observation and acceptance of its external cost/risk.
- **Agent execution:** create the plan, run route checks, execute regression commands and controlled playbooks, repair ordinary asset mistakes, and return to the same checkpoint.
- **Engine verdict:** preserve existing CLI/test/trace results. The governance checker judges plan structure only and creates no runtime authority.

## Risks / Trade-offs

- **A plan validator becomes a second runner** -> Limit it to static shape and asset-boundary checks; it does not execute or aggregate evidence.
- **The three-method table forces costly E2E for every small change** -> `not_applicable` and `deferred` require rationale but do not force execution.
- **Fixture evidence is accidentally promoted to Agent proof** -> Require claim class, production-distance fields, and a real Agent actor for `agent_flow`.
- **A production result is implied by a deferred row** -> Ban PASS/FAIL fields in the plan and require an explicit observation trigger.
- **Existing task checkmarks continue to look like proof** -> The rerun controlled case is accepted only when the runnable asset, runner entry, trace execution, and implementation evidence all exist; the old checkbox is not a verdict source.
- **Current runner documentation has drift (`RUN.md` versus `RUN_EXPS.md`)** -> Update the active runner surface identified by the accepted runner contract without expanding this change into a runner redesign.

## Migration Plan

1. Add `verification-routing` requirements, reserve `VER-*` IDs during apply, and create this change's own verification plan.
2. Implement the read-only governance checker and focused tests; update OpenSpec rules so future changes invoke it before apply and before archive.
3. Upgrade the rerun regression scenario to consume production CLIs and add the real-Agent controlled-E2E case plus active runner registration.
4. Record real command and trace evidence in `implementation-evidence.md`; preserve the real-environment row as deferred unless a user selects a production run.
5. Run routing, regression, controlled-E2E, and existing governance checks before archive; update the backlog plan only after its replacement assets are genuinely proven.

Rollback is local and configuration-only: removing the new governance route check and its plan files does not change framework code or any run bundle. No runtime state migration is required.

## Open Questions

None. The production method is intentionally deferred rather than left ambiguous; an actual bundle selection is a later user decision, not missing design work.
