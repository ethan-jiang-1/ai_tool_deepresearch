# Implementation Evidence

## Approved Route Plan

The change selects all four canonical `test_class` values and seven claims. Route intent remains in `verification-plan.yaml`; this file records execution commands and native outcomes without turning the plan into a result registry.

| Test class | Selected assets | Native verdict |
| --- | --- | --- |
| `unit` | route parser contract; rerun direction resolver | `node_test_exit` |
| `integration` | route checker CLI; current-round CLI; knowledge-surface contract | `node_test_exit` |
| `deterministic_e2e` | rerun full-chain state and recovery suite | `node_test_exit` |
| `agent_flow_e2e` | heavy real subject-Agent rerun playbook | bundle-root `trace_jsonl` |

## Apply Target Manifest

- Add one shared route parser and one read-only route checker under `openspec/governance/`.
- Add focused parser, checker, knowledge-surface, and deterministic full-chain tests at their declared class boundaries.
- Preserve or move/split existing tests according to behavior-first classification without changing coverage.
- Add one real subject-Agent rerun playbook and one exact active runner registration.
- Converge the VER registry, config, repository instructions, local README files, and command-experiment pointers.
- Sync WDC-005 through archive; do not modify `DPT_FRAMEWORK/` behavior, schema, CLI, or version.

## Deterministic E2E Simulation Boundary

`tests/e2e/` may create explicitly fixture-labeled Agent/human-owned Markdown, YAML, artifact inputs, and actor candidate result/receipt/output files. Candidate files remain non-authoritative until accepted by the real submit path. Accepted/submitted state, declaration-ledger rows, gate attempts, transitions, status synchronization, trace, and verdicts must be produced by real production Engine/CLI paths. The JS driver must not claim real human or Agent intelligence.

## Deferred Behavior

The backlog per-row projection-authority scenario remains deferred. No accepted Engine/CLI contract currently compares every eligible work id with projection or explicit no-projection disposition. This apply must not implement or overclaim a test-local matcher as production proof.

## Bootstrap Audit

At apply entry, `VER` and `VER-001` through `VER-005` exist under `# verification-routing` in `openspec/governance/req-registry.yaml`. VER-001, VER-002, VER-004, and VER-005 still describe the retired three-method/fourth-layer model. They remain unchanged until the bootstrap parser/checker tests pass and plan mode dogfoods successfully; task 1.8 owns their correction.

## Commands And Native Verdict Locations

| Scope | Command | Native verdict |
| --- | --- | --- |
| route parser | `node --test tests/governance/verification-routing-contract.test.mjs` | process exit / node:test report |
| route checker | `node --test tests/integration/governance/check-verification-routing.test.mjs` | process exit / node:test report |
| plan dogfood | `node openspec/governance/check-verification-routing.mjs --change formalize-verification-routing --mode plan` | route-validity exit only |
| focused deterministic claims | focused `node --test` commands listed by tasks 2.1, 2.2, 5.6, and 6.1 | process exit / node:test report |
| deterministic full chain | `node --test tests/e2e/rerun-round-continuity.test.mjs` | process exit / node:test report |
| full JS suite | `npm test` | process exit / node:test report |
| real-Agent claim | canonical validator plus step-by-step case-318 execution | bundle-root trace verdict |
| asset routing | `node openspec/governance/check-verification-routing.mjs --change formalize-verification-routing --mode assets` | route/registration validity only |
| OpenSpec/governance | strict validation and existing requirement/spec checks | native command exits |

## Execution Record

- Bootstrap parser/checker suites: `node --test tests/governance/verification-routing-contract.test.mjs tests/integration/governance/check-verification-routing.test.mjs` -> 17 passed, 0 failed. Native authority: `node_test_exit`.
- Bootstrap dogfood: `node openspec/governance/check-verification-routing.mjs --change formalize-verification-routing --mode plan` -> route valid for seven claims. This is route validity only, not execution PASS.
- VER registry descriptions were corrected only after plan-mode dogfood passed; `check-project-reqs.mjs` remained clean with 0 orphan IDs.
- Direction resolver: `node --test tests/engine/helpers/wave-contract-evaluators-direction.test.mjs` -> 8 passed, 0 failed. Native authority: `node_test_exit`.
- Current-round CLI: `node --test tests/integration/cli/rerun-round-continuity.test.mjs` -> 3 passed, 0 failed. The production inspect CLI includes current rows, excludes prior/legacy rows with native warning, and clears rows on inconsistent authority.
- Deferred per-row projection authority remains unimplemented: no selected test imports or creates an eligible-id-to-projection matcher, and the existing return-map contract is not reported as that proof.
- Existing test placement convergence: seven affected unit/integration files ran 92 tests, 92 passed; subsequent `node:child_process` inventory found no test outside `tests/integration/` or `tests/e2e/`.
- Knowledge surfaces: `node --test tests/integration/md/verification-routing-knowledge-surfaces.test.mjs` -> 5 passed, 0 failed.

Further commands remain pending. No PASS/FAIL is copied into `verification-plan.yaml`.

## Residual Risk

- The full-chain suite may expose a real framework defect. If it does, implementation pauses and the active OpenSpec artifacts are updated before any framework scope expands.
- A route-valid or asset-valid result does not prove the selected test or playbook claim.
- Missing real subject-Agent execution leaves the `agent_behavior` claim incomplete; `NOT RUN`, fixture output, and coding-Agent summaries are not substitutes.

## Apply Feedback

The first deterministic E2E run proved that cross-path baseline cloning is invalid for current production authority: submitted work-unit beacons bind the absolute bundle root, and the real Wave0 gate correctly rejected a copied bundle with `beacon/bundle root mismatch`. No framework code or beacon was patched. Design/spec/tasks now require serialized byte restoration to the same original active bundle path, which preserves the runtime-generated binding while isolating each scenario from prior mutations.

After same-path restore and fixture navigation repair, the initial deterministic E2E subset passed 3/3: full HITL2 -> rerun -> seed -> Wave0 -> Wave1 -> Wave2 -> HITL2, malformed-profile fail-closed, and partial Wave2 artifact fail/repair/same-gate recovery. Native authority: `node_test_exit` plus production gate/status/trace artifacts asserted by the suite.

The expanded deterministic suite passed 12/12 in 27.2 seconds with zero external calls. It now covers missing/malformed profile, missing Wave2 artifact, inconsistent Wave1 work-unit authority, stale/invalid/future direction consumption, fixture-labeled crash-window recovery without direction rewrite, current/prior/legacy/inconsistent long-chain work-unit inspection, and partial-artifact repair. Expected failures compare status, queue, work-unit index, declaration ledger, and trace snapshots; only append-only diagnostic/gate-attempt trace writes from the invoked production CLI are accepted. Successful fixture submit assertions bind the production index, manifest, candidate receipt nonce, submitted status, and exactly one declaration-ledger row before any gate PASS is credited. Native authority: `node_test_exit` plus asserted production CLI artifacts; no Agent behavior is claimed.

Canonical `npm test` discovered the deterministic E2E file and passed 1724/1724 tests (323 suites) in 56.6 seconds. Under the full-suite load the E2E suite completed in 51.0 seconds; its focused run completed in 27.2 seconds. Static scope inventory found no repo-top-level `tests_e2e/`, mixed test/playbook runner, or E2E write of passing gate attempts, status, trace, work-unit index, or declaration-ledger authority. The selected unit, integration, deterministic E2E, and knowledge-surface native evidence remains limited to `proof_subject: deterministic_contract`.

Case-318 passed the canonical playbook validator and asset-mode routing check. A fresh production-instantiated bundle was relocated to a `dpt_disp_case-318_<logical-stem>_<hex>` path before the first gate/work-unit binding, then setup reached the legal HITL2 -> rerun window through nine real monitored gates, real work-unit submit, handoffs, and status synchronization. The setup boundary had `direction_absent: true`, profile count 0, and no subject-Agent-attributed fact.

Two distinct real subject-Agent turns executed after that boundary. The first wrote one current `action: supplement` direction for cost/failure-mode analysis with direction count 1, left profile count 0, and stopped without a rerun gate attempt. The second recognized that crash window, preserved the direction section hash, incremented profile 0 -> 1, passed the real monitored rerun-ready gate on attempt 1, consumed only `check.next: phases/phase-seed-topics.md`, synchronized status to `rerun_ready -> seed_topics_ready`, and emitted `rerun_ready`. Runner trace verdict: 14 checks passed, 0 failed, including six named case-318 subject/Engine checks. Heavy bundle health: CLEAN across trace, gate attempts, timeline, work units, ledger, cache trails, and source recoverability.

The first case-318 execution produced the same native trace PASS but heavy health found missing `_observability/gates/`; that bundle was correctly preserved. The playbook/setup were repaired to route gates through `run-gate-with-monitor.mjs`. The clean rerun exposed a second experiment-helper defect: cleanup could not create the default `_temp/exp_verdicts.jsonl` parent. `recordVerdict()` now creates the parent directory, its focused regression passed 7/7, and cleanup then recorded a 14-check case-318 PASS audit before deleting the clean bundle. The preserved failed-health bundle remains `dpt_disp_case-318_rerun-direction-recovery-ebd64255_f` for diagnosis.

Evidence label audit: case-318 remains `test_class: agent_flow_e2e`, `proof_subject: agent_behavior`, `fixture: setup_only`, `subject_execution: real_agent`, `runtime: real_disposable_bundle`, and `external_calls: none`. Its disposable result is not live-production evidence. The historical `_backlog/plans/tests-e2e-layer.md` header now points to the canonical taxonomy, and predecessor task 10.7 explicitly states that its named old playbook never existed and carried no runnable evidence.

Completion governance: asset-mode routing reported seven valid claims with one active case-318 registration; `openspec validate formalize-verification-routing --strict` reported the change valid; requirement governance reported 540 registered IDs, 53 retired, 0 orphan across 600 main/delta occurrences; spec governance reported 74 main spec files and 0 violations. These are native command outcomes. Standard OpenSpec validation did not validate the custom `verification-plan.yaml`; that plan was validated separately by the route checker.

Final canonical suite after the cleanup-helper repair: `npm test` -> 1725 passed, 0 failed across 323 suites in 48.6 seconds; the deterministic E2E suite completed in 43.4 seconds under full-suite load. Final scope audit found one route parser, one route checker, one deterministic E2E test file, one case-318 playbook and one active registration; no `DPT_FRAMEWORK/` diff, repo-top-level `tests_e2e/`, mixed runner, or hand-written Engine PASS authority. The clean case-318 bundle was deleted only after its PASS audit was persisted; the earlier health-issue bundle remains preserved as required.

Archive sync: created the accepted `openspec/specs/verification-routing/spec.md` with five requirements and merged the WDC-005 delta into `openspec/specs/workflow-directory-contract/spec.md` without changing unrelated requirements. Post-sync governance reported 75 main specs, 0 spec violations, 540 registered IDs, 0 orphan IDs, and strict change validation PASS.
