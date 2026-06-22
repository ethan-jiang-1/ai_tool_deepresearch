## 1. Phase 0: FSM Engine Cleanup — Delete dead files

- [ ] 1.1 Delete `DPT_FRAMEWORK/engine/transition-fsm.mjs`
- [ ] 1.2 Delete `DPT_FRAMEWORK/engine/workflow-fsm.mjs`
- [ ] 1.3 Delete `DPT_FRAMEWORK/workflows/transitions.fsm.json`
- [ ] 1.4 Delete `openspec/specs/workflow-fsm-definition/` (entire directory)
- [ ] 1.5 Delete `openspec/specs/workflow-fsm-runtime/` (entire directory)
- [ ] 1.6 Delete `openspec/specs/workflow-fsm-transition/` (entire directory)
- [ ] 1.7 Delete `tests/engine/transition-fsm.test.mjs`
- [ ] 1.8 Delete `tests/engine/workflow-fsm.test.mjs`
- [ ] 1.9 Delete `experiments/prototype-workflow-fsm/` (entire directory)
- [ ] 1.10 Delete `experiments_playbook/exp_workflow-fsm/` (entire directory)

## 2. Phase 0: Remove FSM from engine code

- [ ] 2.1 Remove FSM dispatch branch, `loadFSM` import, and FSM comment from `DPT_FRAMEWORK/engine/ask-next.mjs` — update error message to expect only `.chain.json`
- [ ] 2.2 Remove `loadFSM` import, `transitionsFsmPath` opt, and FSM validation block from `DPT_FRAMEWORK/engine/consistency-validator.mjs`
- [ ] 2.3 Remove `--transitions-fsm` flag from `DPT_FRAMEWORK/cli/validate-workflow-package.mjs`

## 3. Phase 0: Remove FSM from test files

- [ ] 3.1 Remove FSM_DATA fixture, `transitions.fsm.json` write, and 3 FSM test cases from `tests/engine/ask-next.test.mjs`
- [ ] 3.2 Remove FSM fixture construction, 3 FSM test blocks, and update multi-issue expectations in `tests/engine/consistency-validator.test.mjs`

## 4. Phase 0: Update specs and docs

- [ ] 4.1 Remove FSM backend description from `openspec/specs/transition-table/spec.md` (TRT-001, TRT-003, TRT-005) — per delta spec in change
- [ ] 4.2 Remove `workflow-fsm.mjs` and `transition-fsm.mjs` from `openspec/specs/framework-engine/spec.md` (FRE-001, remove FRE-002) — per delta spec in change
- [ ] 4.3 Remove `.fsm.json` reference from `openspec/specs/seed-topic-materialization/spec.md` (STM-004) — per delta spec in change
- [ ] 4.4 Remove `.fsm.json` mention from `openspec/config.yaml` directory layout conventions
- [ ] 4.5 Update `guidelines/README.md`: engine count 6→5, remove workflow-fsm row
- [ ] 4.6 Remove `exp_workflow-fsm` entry from `experiments_playbook/RUN.md`

## 5. Phase 0: Verification

- [ ] 5.1 Run `git grep -l "transition-fsm\|workflow-fsm\|loadFSM\|resolveFSM\|\.fsm\.json"` — confirm zero results (excluding governance registry and change artifacts)
- [ ] 5.2 Run `node --test tests/engine/ask-next.test.mjs` — must PASS
- [ ] 5.3 Run `node --test tests/engine/consistency-validator.test.mjs` — must PASS
- [ ] 5.4 Run `node DPT_FRAMEWORK/cli/validate-workflow-package.mjs` — must PASS

## 6. Phase 1: Content delivery phase bodies

- [ ] 6.1 @impl CDP-001: Fill `DPT_FRAMEWORK/workflows/nodes/phases/phase-hitl2.md` 9-section body (decision brief, structured user decision, stop=yes, anti-cheating rules)
- [ ] 6.2 @impl CDP-002: Fill `DPT_FRAMEWORK/workflows/nodes/phases/phase-readiness.md` 9-section body (deterministic precheck, 8-gate audit, anti-cheating rules)
- [ ] 6.3 @impl CDP-003: Fill `DPT_FRAMEWORK/workflows/nodes/phases/phase-final.md` 9-section body (terminal node, final report generation, anti-cheating rules)

## 7. Phase 1: Gate definitions — real rule sets

- [ ] 7.1 @impl CDG-001: Fill `DPT_FRAMEWORK/schema/gate_definitions/gate-hitl2-recorded.definition.json` with ~7 real rules (file_exists, yaml_parse, field_non_empty, field_value enum, trace_event_present, status_value × 2)
- [ ] 7.2 @impl CDG-002: Fill `DPT_FRAMEWORK/schema/gate_definitions/gate-readiness-passed.definition.json` with ~9 real rules (file_exists × 4, trace_has_events, yaml_parse, jsonl_parse, status_value)

## 8. Phase 1: Gate CLI implementation

- [ ] 8.1 @impl CDG-003: Implement `DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs` — standard gate-helpers pipeline, supports yaml_parse + field_non_empty + field_value check types
- [ ] 8.2 @impl CDG-004: Implement `DPT_FRAMEWORK/cli/gates/check-gate-readiness-passed.mjs` — standard gate-helpers pipeline, supports trace_has_events + jsonl_parse check types
- [ ] 8.3 Fix `DPT_FRAMEWORK/schema/enums.mjs` CurrentGate enum: add `hitl1_recorded`, `hitl2_recorded`, and `none`

## 9. Phase 1: Shared node content updates

- [ ] 9.1 @impl SHC-001: Update `shared-profile.md` — document HITL2 fields (answerability_class, user_decision, final_report_view, custom_slug)
- [ ] 9.2 @impl SHC-002: Update `shared-gate-rules.md` — expand hitl2-recorded and readiness-passed gate descriptions
- [ ] 9.3 @impl SHC-003: Update `shared-schemas.md` — document `final/` directory as terminal delivery output
- [ ] 9.4 @impl SHC-005: Update `shared-anti-cheating-rules.md` — add 4 delivery-phase prohibitions

## 10. Phase 1: Experiment playbooks

- [ ] 10.1 @impl CDE-001: Write `experiments_playbook/exp_workflow-foundation/test-simple-hitl2-decision-recorded.md` — happy pass + missing brief fail + missing decision fail + invalid enum fail
- [ ] 10.2 @impl CDE-002: Write `experiments_playbook/exp_workflow-foundation/test-medium-readiness-precheck.md` — happy pass + missing artifact fail + <8 gates fail + bad YAML fail + corrupt JSONL fail
- [ ] 10.3 @impl CDE-003: Write `experiments_playbook/exp_workflow-foundation/test-simple-delivery-full-chain.md` — hitl2 pass → readiness pass → final terminal semantics
- [ ] 10.4 @impl CDE-004: Write `experiments_playbook/exp_workflow-foundation/test-simple-hitl2-rerun-branch.md` — gate passes with `repair_and_rerun`, Agent restarts lifecycle from instantiation instead of advancing to readiness
- [ ] 10.5 @impl CDE-005: Write `experiments_playbook/exp_workflow-foundation/test-medium-delivery-repair-loop.md` — HITL2 gate fail→repair→pass + readiness gate fail→repair→pass PDCA cycles
- [ ] 10.6 Update `experiments_playbook/RUN.md` — add 5 new playbook entries and remove 3 exp_workflow-fsm entries

## 11. Phase 1: Integration tests

- [ ] 11.1 Create `tests/integration/cli/check-gate-hitl2-recorded.test.mjs` — happy path + missing decision brief + missing user_decision + invalid enum + missing trace event (6+ cases)
- [ ] 11.2 Create `tests/integration/cli/check-gate-readiness-passed.test.mjs` — happy path + missing artifact + insufficient gates + unparseable YAML + corrupt JSONL + status drift (7+ cases)

## 12. Requirement registry and governance

- [ ] 12.1 Register CDP-001, CDP-002, CDP-003 in `openspec/governance/req-registry.yaml` under new capability `content-delivery-phase-content`
- [ ] 12.2 Register CDG-001, CDG-002, CDG-003, CDG-004 in `openspec/governance/req-registry.yaml` under new capability `content-delivery-gate-implementation`
- [ ] 12.3 Register CDE-001, CDE-002, CDE-003, CDE-004, CDE-005 in `openspec/governance/req-registry.yaml` under new capability `content-delivery-experiments`
- [ ] 12.4 Update GSK-004 description in registry (9 gate CLIs)
- [ ] 12.5 Mark WFS-001, WFS-002, WFS-003 as retired (FSM specs deleted)
- [ ] 12.6 Mark FRE-002 as retired (workflow-fsm engine removed)
- [ ] 12.7 Run `node openspec/governance/check-project-reqs.mjs` — must PASS
- [ ] 12.8 Run `node openspec/governance/check-project-specs.mjs` — must PASS

## 13. Experiment execution and final verification

- [ ] 13.1 Execute test-simple-hitl2-decision-recorded playbook — must PASS verdict
- [ ] 13.2 Execute test-medium-readiness-precheck playbook — must PASS verdict
- [ ] 13.3 Execute test-simple-delivery-full-chain playbook — must PASS verdict
- [ ] 13.4 Run full regression: `node --test tests/` — must PASS
- [ ] 13.5 Run `node DPT_FRAMEWORK/cli/validate-workflow-package.mjs` — must PASS
