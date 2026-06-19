<!-- 按 section 顺序执行；section 之间串行，section 内 tasks 可并行 -->

## 1. Requirement Registry

- [x] 1.1 Register PLR-001 (playbook-runner — RUN.md as unified runner entry with manifest and instructions) in `openspec/governance/req-registry.yaml`
- [x] 1.2 Register PLR-003 (playbook-runner — Runner execution contract and report) in `openspec/governance/req-registry.yaml`
- [x] 1.3 Register AGT-005 (agent-testing — Playbook frontmatter weight field) in `openspec/governance/req-registry.yaml`
- [x] 1.4 Register AGT-006 (agent-testing — Disposable bundle names include random suffix) in `openspec/governance/req-registry.yaml`
- [x] 1.5 Register AGT-007 (agent-testing — Unified trace file naming to `_trace.jsonl`) in `openspec/governance/req-registry.yaml`
- [x] 1.6 Register AGT-008 (agent-testing — Verdict output uses ANSI color) in `openspec/governance/req-registry.yaml`

## 2. Playbook Frontmatter: Add weight Field

- [x] 2.1 Add `weight: light` to all `exp_gate-fork/` playbooks (test-simple, test-medium, test-complex) @impl AGT-005
- [x] 2.2 Add `weight: light` to all `exp_gate-loop/` playbooks (test-simple, test-medium, test-complex) @impl AGT-005
- [x] 2.3 Add `weight: light` to all `exp_workflow-fsm/` playbooks (test-simple, test-medium, test-complex) @impl AGT-005
- [x] 2.4 Add `weight: light` to all `exp_workflow-next/` playbooks (test-simple, test-medium, test-complex) @impl AGT-005
- [x] 2.5 Add `weight: light` to all `exp_agentic-queue/` playbooks (test-simple, test-medium, test-complex) @impl AGT-005
- [x] 2.6 Add `weight: heavy` to all `exp_subagent/` playbooks (test-simple, test-medium, test-complex, test-identity) @impl AGT-005
- [x] 2.7 Verify all playbooks have weight field: `grep -L 'weight:' experiments_playbook/*/test-*.md` returns empty, and no playbook uses an unrecognized weight value

## 3. Bundle Random Suffix + Cleanup

- [x] 3.1 Modify `experiments/shared/new-disposable-bundle.mjs` to append one random hex digit (`0-9a-f`) to bundle directory name @impl AGT-006
- [x] 3.2 Update all `exp_gate-fork/` playbook cleanup steps to use `rm -rf dpt_disp_gf_*` (glob) instead of re-calling `new-disposable-bundle.mjs` @impl AGT-006
- [x] 3.3 Update all `exp_gate-loop/` playbook cleanup steps to use `rm -rf dpt_disp_gl_*` @impl AGT-006
- [x] 3.4 Update all `exp_workflow-fsm/` playbook cleanup steps to use `rm -rf dpt_disp_wfsm_*` @impl AGT-006
- [x] 3.5 Update all `exp_workflow-next/` playbook cleanup steps to use `rm -rf dpt_disp_wl_*` @impl AGT-006
- [x] 3.6 Update all `exp_agentic-queue/` playbook cleanup steps to use `rm -rf dpt_disp_agq_*` @impl AGT-006
- [x] 3.7 Update all `exp_subagent/` playbook cleanup steps to use `rm -rf dpt_disp_gs_*` @impl AGT-006

## 4. Trace File Standardization: `_trace.jsonl`

- [x] 4.1 Update all `exp_gate-fork/` playbooks: replace all `createTrace(...)` paths and verdict trace paths with `_trace.jsonl`; update frontmatter `trace:` field @impl AGT-007
- [x] 4.2 Update all `exp_gate-loop/` playbooks: replace all `createTrace(...)` paths and verdict trace paths with `_trace.jsonl`; update frontmatter `trace:` field @impl AGT-007
- [x] 4.3 Update all `exp_workflow-fsm/` playbooks: replace all `createTrace(...)` paths and verdict trace paths with `_trace.jsonl`; update frontmatter `trace:` field @impl AGT-007
- [x] 4.4 Update all `exp_workflow-next/` playbooks: replace all `createTrace(...)` paths and verdict trace paths with `_trace.jsonl`; update frontmatter `trace:` field @impl AGT-007
- [x] 4.5 Update all `exp_agentic-queue/` playbooks: replace all `createTrace(...)` paths and verdict trace paths with `_trace.jsonl`; update frontmatter `trace:` field @impl AGT-007
- [x] 4.6 Update all `exp_subagent/` playbooks: replace all `createTrace(...)` paths and verdict trace paths with `_trace.jsonl`; update frontmatter `trace:` field @impl AGT-007
- [x] 4.7 Verify no playbook references legacy trace names: `grep -rE '_trace_(agq_cli|subagent|gf_|gl_|wfsm_|wl_)' experiments_playbook/` returns empty

## 5. Verdict ANSI Color

- [x] 5.1 Add green/red ANSI color to all `exp_agentic-queue/` verdict `console.log` (currently plain text) @impl AGT-008
- [x] 5.2 Add green/red ANSI color to all `exp_subagent/` verdict `console.log` (currently plain text) @impl AGT-008
- [x] 5.3 Add green/red ANSI color to all `exp_workflow-next/` verdict `console.log` (currently plain text) @impl AGT-008
- [x] 5.4 Fix `exp_workflow-fsm/` verdict escape: `\\x1b` → `\x1b` (currently broken — double backslash produces literal `\x1b` text, not green) @impl AGT-008
- [x] 5.5 Verify `exp_gate-fork/` and `exp_gate-loop/` verdict escapes are already correct `\x1b` (single backslash) — confirm, no change needed
- [x] 5.6 Verify all playbook verdict outputs: `grep -r 'PASS\|FAIL' experiments_playbook/ --include='*.md' | grep 'console.log'` shows consistent `\x1b[32m`/`\x1b[31m` pattern and no bare `PASS`/`FAIL` without color

## 6. RUN.md: Unified Runner Entry

- [x] 6.1 Create `experiments_playbook/RUN.md` — single file containing: light/heavy grouped playbook manifest (paths + case descriptions), action-oriented runner instructions, default-to-light rule, failure handling guidance, and report format @impl PLR-001, PLR-003

## 7. Guideline Update

- [x] 7.1 Update `guidelines/command-experiments.md` playbook frontmatter section to include `weight` field convention
- [x] 7.2 Update `guidelines/command-experiments.md` to reference RUN.md, bundle random suffix + glob cleanup, unified `_trace.jsonl` naming, ANSI color verdict convention, and `test-{complexity}-{what-it-tests}.md` naming rule

## 8. Playbook File Rename: Add Descriptive Suffix

- [x] 8.1 Rename `exp_gate-fork/test-simple.md` → `test-simple-four-returns.md`; update RUN.md path
- [x] 8.2 Rename `exp_gate-fork/test-medium.md` → `test-medium-repair-retry.md`; update RUN.md path
- [x] 8.3 Rename `exp_gate-fork/test-complex.md` → `test-complex-full-pipeline.md`; update RUN.md path
- [x] 8.4 Rename `exp_gate-loop/test-simple.md` → `test-simple-three-returns.md`; update RUN.md path
- [x] 8.5 Rename `exp_gate-loop/test-medium.md` → `test-medium-repair-loop.md`; update RUN.md path
- [x] 8.6 Rename `exp_gate-loop/test-complex.md` → `test-complex-full-pipeline.md`; update RUN.md path
- [x] 8.7 Rename `exp_workflow-fsm/test-simple.md` → `test-simple-define-advance.md`; update RUN.md path
- [x] 8.8 Rename `exp_workflow-fsm/test-medium.md` → `test-medium-retry-halt.md`; update RUN.md path
- [x] 8.9 Rename `exp_workflow-fsm/test-complex.md` → `test-complex-halt-recovery.md`; update RUN.md path
- [x] 8.10 Rename `exp_workflow-next/test-simple.md` → `test-simple-lazy-load.md`; update RUN.md path
- [x] 8.11 Rename `exp_workflow-next/test-medium.md` → `test-medium-dep-cache.md`; update RUN.md path
- [x] 8.12 Rename `exp_workflow-next/test-complex.md` → `test-complex-error-paths.md`; update RUN.md path
- [x] 8.13 Rename `exp_agentic-queue/test-simple.md` → `test-simple-minimal-path.md`; update RUN.md path
- [x] 8.14 Rename `exp_agentic-queue/test-medium.md` → `test-medium-urgent-preemption.md`; update RUN.md path
- [x] 8.15 Rename `exp_agentic-queue/test-complex.md` → `test-complex-failure-repair.md`; update RUN.md path
- [x] 8.16 Rename `exp_subagent/test-simple.md` → `test-simple-single-intake.md`; update RUN.md path
- [x] 8.17 Rename `exp_subagent/test-medium.md` → `test-medium-dual-parallel.md`; update RUN.md path
- [x] 8.18 Rename `exp_subagent/test-complex.md` → `test-complex-triple-failure.md`; update RUN.md path
- [x] 8.19 Rename `exp_subagent/test-identity.md` → `test-identity-agent-identity.md`; update RUN.md path

## 9. Rename workflow-next → workflow-chain

- [x] 9.1 Rename `experiments_playbook/exp_workflow-next/` → `exp_workflow-chain/`
- [x] 9.2 Rename `experiments/prototype-workflow-next/` → `experiments/prototype-workflow-chain/`
- [x] 9.3 Update all playbook files in `exp_workflow-chain/`: frontmatter `experiment:` field, bundle names (`wl_` → `wc_`), trace paths, cleanup glob (`dpt_disp_wl_*` → `dpt_disp_wc_*`), `new-disposable-bundle.mjs` args
- [x] 9.4 Update `experiments/shared/new-disposable-bundle.mjs` example text
- [x] 9.5 Update `tests/engine/workflow-chain.test.mjs` path to prototype nodes
- [x] 9.6 Update `DPT_FRAMEWORK/engine/workflow-chain.mjs` comment and fallback path
- [x] 9.7 Update `experiments/prototype-workflow-chain/EXPERIMENT.md` content
- [x] 9.8 Update `RUN.md` paths and descriptions
- [x] 9.9 Update `openspec/governance/req-registry.yaml` AGT-004 and WLO-001 descriptions

## 10. Governance Checks

- [x] 10.1 Run `node openspec/governance/check-project-reqs.mjs` — must PASS (0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired)
- [x] 10.2 Run `node openspec/governance/check-project-specs.mjs` — must PASS (0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader)
