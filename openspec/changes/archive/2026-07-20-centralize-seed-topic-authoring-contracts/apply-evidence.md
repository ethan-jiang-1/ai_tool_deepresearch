# Apply Evidence — centralize-seed-topic-authoring-contracts

Applied on 2026-07-20. This record distinguishes deterministic fixture-backed
contracts from the selected real-Agent proof.

## Deterministic contracts

| Claims | Command | Result |
| --- | --- | --- |
| `STM-001`, `CTS-003`, `RTI-007` unit contracts | `node --test tests/engine/helpers/canonical-topic-state.test.mjs tests/engine/helpers/rerun-direction.test.mjs` | PASS — 32 tests, including renderer/shared-contract parity, canonical candidate publication, and focused parser states. |
| `CTS-003`, `RRM-003`, `RTI-007` integration contracts | `node --test tests/integration/cli/operate-topic-state-direction.test.mjs tests/integration/md/seed-topic-authoring-contract.test.mjs tests/integration/cli/check-gate-rerun-ready.test.mjs tests/integration/cli/rerun-round-continuity.test.mjs` | PASS — 24 tests. Temporary bundles prove sanctioned add/update/direction-only publication, exact prepared-byte recovery, static shared-node/cue parity, and plan-bound rerun-ready roots. |
| `CTS-003`, `RTI-007` deterministic E2E | `node --test tests/e2e/rerun-round-continuity.test.mjs` | PASS — 14 tests. Inputs are explicitly fixture-labeled simulated Agent candidates; this proves deterministic production paths, not Agent judgment. |
| `STM-001`, `RRM-003` package integration | `node DPT_FRAMEWORK/cli/validate-workflow-package.mjs` | PASS — both focused shared nodes and their loaded `requires` edges validate. |
| Workflow playbook shape | `node DPT_FRAMEWORK/cli/validate-playbook.mjs experiments_playbook/exp_wfn_rerun/case-318-heavy-rerun-direction-recovery.md` | PASS. |

## Real Agent-flow proof

Command:

```bash
node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs \
  --case case-318-heavy-rerun-direction-recovery \
  --max-total-budget-usd 5 --max-case-budget-usd 5
```

Result: PASS, cost `$0.253106`, native outcome `PASS`, health `CLEAN`.

- Batch report: `.exp-bundles/_reports/57fd5b47-0200-4531-b07a-a0abb9821c21.json`
- Native run root: `.exp-bundles/runs/57fd5b47-0200-4531-b07a-a0abb9821c21/001-case-318-heavy-rerun-direction-recovery-be00256b-f773-490f-a7df-d08911899a6e/`
- The native completion considered and passed all six checks: real Subject execution, sanctioned direction candidate/application, future direction/profile crash window, byte preservation, rerun-ready Gate, and Seed Topics handoff.

This proves only the named real-Subject procedure from an already recorded
rationale. It does not claim that an Agent can generally infer affected Topics
or judge direction semantics.

## Routing and governance

| Command | Result |
| --- | --- |
| `node openspec/governance/check-verification-routing.mjs --change centralize-seed-topic-authoring-contracts --mode plan` | PASS before target edits (task 1.1). |
| `node openspec/governance/check-verification-routing.mjs --change centralize-seed-topic-authoring-contracts --mode assets` | PASS — seven canonical assets. |
| `node openspec/governance/check-project-reqs.mjs` | PASS — 0 orphan/unregistered/reused IDs. |
| `node openspec/governance/check-project-specs.mjs` | PASS — 0 violations. |
| `openspec validate centralize-seed-topic-authoring-contracts --strict` | PASS. |

## Full-suite boundary

`npm test` was run after the implementation. The change-local failures it
exposed were repaired and their focused regressions now pass. The remaining
unrelated repository failures are reproducible outside this change's six
JS-led deterministic claims:

- `node --test tests/engine/version-management.test.mjs` — stale test path to the absent historical change `simplify-iterative-research-interaction`.
- `node --test tests/integration/cli/handoff-witnessing-lifecycle.test.mjs` — existing Wave0 high-attempt continuation assertion.
- `node --test tests/integration/host-tools/claude-deepseek.test.mjs` — the test copies only `claude-deepseek.mjs` into its temporary root while the existing launcher imports sibling `host_tools/lib/*` modules.

None of those surfaces are changed by this OpenSpec change. They are excluded
from its six deterministic verification claims and require their own scoped
repair before a repository-wide green suite can be asserted.

## Archive boundary

`BUG-093` and `BUG-094` implementation evidence is now complete through the
contracts above. They are not represented as archived/closed here: archive and
commit evidence do not exist yet, and the backlog moves remain deferred to the
separate OpenSpec archive phase.
