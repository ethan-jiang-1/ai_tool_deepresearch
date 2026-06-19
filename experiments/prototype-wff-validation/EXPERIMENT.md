# Prototype: wff-validation

## Mechanism
Workflow Foundation lifecycle walker (`walk-lifecycle.mjs`) — manifest-driven deterministic verification tool.

## Hypothesis
The skeleton lifecycle (9 phases, 8 gates) can be walked end-to-end: manifest → load node → spawn gate CLI → trace + log → advance. Gate fail triggers mechanical repair → rerun → pass. The frozen fixtures in this prototype ensure the walker mechanism remains verifiable regardless of subsequent node content changes.

## Scope
- Frozen copies of the 9 phase nodes and 5 shared nodes from wff-contract-skeleton
- Frozen copy of manifest.json (9 phases, 8 gates)
- Gate CLIs are NOT copied — they are the framework code under test, imported from `DPT_FRAMEWORK/cli/gates/`
- All gate CLIs except `instantiation-complete` are placeholders (always pass)
- `instantiation-complete` checks for `rb_plan.md` existence in the bundle

## Dependencies
- `DPT_FRAMEWORK/engine/trace.mjs`
- `DPT_FRAMEWORK/engine/logger.mjs`
- `DPT_FRAMEWORK/engine/workflow-chain.mjs`
- `DPT_FRAMEWORK/cli/gates/check-gate-*.mjs`
- `DPT_FRAMEWORK/schema/gate_definitions/gate-*.definition.json`
- `experiments/shared/new-disposable-bundle.mjs`

## Result
Pending — run `experiments_playbook/exp_wff_validation/` playbooks.
