## 1. Phase 0: FSM Engine Cleanup — Delete dead files

- [x] 1.1 Delete `DPT_FRAMEWORK/engine/transition-fsm.mjs`
- [x] 1.2 Delete `DPT_FRAMEWORK/engine/workflow-fsm.mjs`
- [x] 1.3 Delete `DPT_FRAMEWORK/workflows/transitions.fsm.json`
- [x] 1.4 Delete `openspec/specs/workflow-fsm-definition/` (entire directory)
- [x] 1.5 Delete `openspec/specs/workflow-fsm-runtime/` (entire directory)
- [x] 1.6 Delete `openspec/specs/workflow-fsm-transition/` (entire directory)
- [x] 1.7 Delete `tests/engine/transition-fsm.test.mjs`
- [x] 1.8 Delete `tests/engine/workflow-fsm.test.mjs`
- [x] 1.9 Delete `experiments/prototype-workflow-fsm/` (entire directory)
- [x] 1.10 Delete `experiments_playbook/exp_workflow-fsm/` (entire directory)

## 2. Phase 0: Remove FSM from engine code

- [x] 2.1 Remove FSM dispatch branch, `loadFSM` import, and FSM comment from `DPT_FRAMEWORK/engine/ask-next.mjs` — update error message to expect only `.chain.json`
- [x] 2.2 Remove `loadFSM` import, `transitionsFsmPath` opt, and FSM validation block from `DPT_FRAMEWORK/engine/consistency-validator.mjs`
- [x] 2.3 Remove `--transitions-fsm` flag from `DPT_FRAMEWORK/cli/validate-workflow-package.mjs`

## 3. Phase 0: Remove FSM from test files

- [x] 3.1 Remove FSM_DATA fixture, `transitions.fsm.json` write, and 3 FSM test cases from `tests/engine/ask-next.test.mjs`
- [x] 3.2 Remove FSM fixture construction, 3 FSM test blocks, and update multi-issue expectations in `tests/engine/consistency-validator.test.mjs`

## 4. Phase 0: Update specs and docs

- [x] 4.1 Remove FSM backend description from `openspec/specs/transition-table/spec.md` (TRT-001, TRT-003, TRT-005) — per delta spec in change
- [x] 4.2 Remove `workflow-fsm.mjs` and `transition-fsm.mjs` from `openspec/specs/framework-engine/spec.md` (FRE-001, remove FRE-002) — per delta spec in change
- [x] 4.3 Remove `.fsm.json` reference from `openspec/specs/seed-topic-materialization/spec.md` (STM-004) — per delta spec in change
- [x] 4.4 Remove `.fsm.json` mention from `openspec/config.yaml` directory layout conventions
- [x] 4.5 Update `guidelines/README.md`: engine count 6→5, remove workflow-fsm row
- [x] 4.6 Remove `exp_workflow-fsm` entry from `experiments_playbook/RUN.md`

## 5. Phase 0: Verification

- [x] 5.1 Run `git grep -l "transition-fsm\|workflow-fsm\|loadFSM\|resolveFSM\|\.fsm\.json"` — confirm zero results (excluding governance registry and change artifacts)
- [x] 5.2 Run `node --test tests/engine/ask-next.test.mjs` — must PASS
- [x] 5.3 Run `node --test tests/engine/consistency-validator.test.mjs` — must PASS
- [x] 5.4 Run `node DPT_FRAMEWORK/cli/validate-workflow-package.mjs` — must PASS

<!-- 🛑 REVIEW CHECKPOINT: Phase 0 完成。确认 git grep 零引用 + 全部 test PASS 后，再进 Phase 1。 -->

## 6. Phase 1: Content delivery phase bodies

- [x] 6.1 @impl CDP-001: Fill `DPT_FRAMEWORK/workflows/nodes/phases/phase-hitl2.md` 9-section body (decision brief, structured user decision, stop=yes, anti-cheating rules)
- [x] 6.2 @impl CDP-002: Fill `DPT_FRAMEWORK/workflows/nodes/phases/phase-readiness.md` 9-section body (deterministic precheck, 8-gate audit, anti-cheating rules)
- [x] 6.3 @impl CDP-003: Fill `DPT_FRAMEWORK/workflows/nodes/phases/phase-final.md` 9-section body (terminal node, final report generation, anti-cheating rules)

## 7. Phase 1: Gate definitions — real rule sets

- [x] 7.1 @impl CDG-001: Fill `DPT_FRAMEWORK/schema/gate_definitions/gate-hitl2-recorded.definition.json` with ~7 real rules (file_exists, yaml_parse, field_non_empty, field_value enum, trace_event_present, status_value × 2)
- [x] 7.2 @impl CDG-002: Fill `DPT_FRAMEWORK/schema/gate_definitions/gate-readiness-passed.definition.json` with ~9 real rules (file_exists × 4, trace_has_events, yaml_parse, jsonl_parse, status_value)
- [x] 7.3 Fix `DPT_FRAMEWORK/schema/gate_definitions/gate-wave2-complete.definition.json`: change `status_next_gate` rule expected from `hitl2_complete` to `hitl2_recorded` (aligns with CurrentGate enum token, fixes naming collision)

## 8. Phase 1: Gate CLI implementation

- [x] 8.1 @impl CDG-003: Implement `DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs` — standard gate-helpers pipeline, supports yaml_parse + field_non_empty + field_value check types, MUST append `gate_attempt` trace event to `rb_trace.jsonl` on completion (pass and fail, wave2 append pattern)
- [x] 8.2 @impl CDG-004: Implement `DPT_FRAMEWORK/cli/gates/check-gate-readiness-passed.mjs` — standard gate-helpers pipeline, supports trace_has_events + jsonl_parse check types, MUST append `gate_attempt` trace event to `rb_trace.jsonl` on completion (pass and fail, wave2 append pattern)
- [x] 8.3 Fix `DPT_FRAMEWORK/schema/enums.mjs` CurrentGate enum: add `hitl1_recorded`, `hitl2_recorded`, and `none`

## 9. Phase 1: Shared node content updates

- [x] 9.1 @impl SHC-001: Update `shared-profile.md` — document HITL2 fields (answerability_class, user_decision, final_report_view, custom_slug)
- [x] 9.2 @impl SHC-002: Update `shared-gate-rules.md` — expand hitl2-recorded and readiness-passed gate descriptions
- [x] 9.3 @impl SHC-003: Update `shared-schemas.md` — document `final/` directory as terminal delivery output
- [x] 9.4 @impl SHC-005: Update `shared-anti-cheating-rules.md` — add 4 delivery-phase prohibitions

<!-- 🛑 REVIEW CHECKPOINT: 代码实现（Phase body + Gate def + Gate CLI + Shared node）完成。review 确认后再进实验 playbook。 -->

## 10. Phase 1: Experiment playbooks

- [x] 10.1 @impl CDE-001: Write `experiments_playbook/exp_workflow-foundation/test-simple-hitl2-decision-recorded.md` — happy pass + missing brief fail + missing decision fail + invalid enum fail
- [x] 10.2 @impl CDE-002: Write `experiments_playbook/exp_workflow-foundation/test-medium-readiness-precheck.md` — happy pass + missing artifact fail + missing prior gates fail + bad YAML fail + corrupt JSONL fail
- [x] 10.3 @impl CDE-003: Write `experiments_playbook/exp_workflow-foundation/test-simple-delivery-full-chain.md` — hitl2 pass → readiness pass → final terminal semantics
- [x] 10.4 @impl CDE-004: Write `experiments_playbook/exp_workflow-foundation/test-simple-hitl2-rerun-branch.md` — gate passes with `repair_and_rerun`, Agent restarts lifecycle from instantiation instead of advancing to readiness
- [x] 10.5 @impl CDE-005: Write `experiments_playbook/exp_workflow-foundation/test-medium-delivery-repair-loop.md` — HITL2 gate fail→repair→pass + readiness gate fail→repair→pass PDCA cycles
- [x] 10.6 Update `experiments_playbook/RUN.md` — add 5 new playbook entries and remove 3 exp_workflow-fsm entries

<!-- 🛑 REVIEW CHECKPOINT: 5 个 experiment playbook 写完。review 确认后再进集成测试。 -->

## 11. Phase 1: Integration tests

- [x] 11.1 Create `tests/integration/cli/check-gate-hitl2-recorded.test.mjs` — happy path + missing decision brief + missing user_decision + invalid enum + missing trace event + YAML parse + status drift (9 cases)
- [x] 11.2 Create `tests/integration/cli/check-gate-readiness-passed.test.mjs` — happy path + missing artifact × 4 + empty seed_topics + insufficient gates + unparseable YAML + corrupt JSONL + status drift (10 cases)

<!-- 🛑 REVIEW CHECKPOINT: 集成测试写完。review 确认后再进 governance。 -->

## 12. Requirement registry and governance

- [x] 12.1 Register CDP-001, CDP-002, CDP-003 in `openspec/governance/req-registry.yaml` under new capability `content-delivery-phase-content`
- [x] 12.2 Register CDG-001, CDG-002, CDG-003, CDG-004 in `openspec/governance/req-registry.yaml` under new capability `content-delivery-gate-implementation`
- [x] 12.3 Register CDE-001, CDE-002, CDE-003, CDE-004, CDE-005 in `openspec/governance/req-registry.yaml` under new capability `content-delivery-experiments`
- [x] 12.4 Update GSK-004 description in registry (9 gate CLIs)
- [x] 12.5 Mark WFS-001, WFS-002, WFS-003 as retired (FSM specs deleted)
- [x] 12.6 Mark FRE-002 as retired (workflow-fsm engine removed)
- [x] 12.6a Run `rg "hitl2_complete" DPT_FRAMEWORK/ openspec/specs/` — must return zero results (naming unified to `hitl2_recorded`; excludes archive and change artifacts)
- [x] 12.7 Run `node openspec/governance/check-project-reqs.mjs` — must PASS
- [x] 12.8 Run `node openspec/governance/check-project-specs.mjs` — must PASS

<!-- 🛑 REVIEW CHECKPOINT: Governance 双 PASS + registry 更新完成。review 确认后再实际执行实验（Section 13）。 -->

## 13. Experiment execution and final verification

- [x] 13.1 Execute test-simple-hitl2-decision-recorded playbook — must PASS verdict
- [x] 13.2 Execute test-medium-readiness-precheck playbook — must PASS verdict
- [x] 13.3 Execute test-simple-delivery-full-chain playbook — must PASS verdict
- [x] 13.4 Run full regression: `node --test tests/` — must PASS
- [x] 13.5 Run `node DPT_FRAMEWORK/cli/validate-workflow-package.mjs` — must PASS
