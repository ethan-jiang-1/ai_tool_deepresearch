# Apply Evidence

## Baseline

Date: 2026-07-24

- `openspec validate make-pre-wave-readiness-feedback-direct --strict`: PASS before target edits.
- `check-verification-routing.mjs --mode plan`: PASS before target edits.
- Current `ProfileSchema` has no candidate count/ordinal fields.
- Current HITL1 Markdown probes only the first eligible result.
- Current queue completion checks receipts and terminalizes before any seed authoring parse/binding evaluation.

## Proof Boundary

| Claim class | Authority | Baseline / completion evidence |
|---|---|---|
| Unit | Node test exit | Schema and pure evaluator only; no Agent or external behavior claim. |
| Integration | Node test exit over temporary bundle | Production CLI/queue/Gate boundaries with fixture facts. |
| Deterministic E2E | Node test exit over temporary bundle | Simulated sanctioned content input only; no search/fetch or Agent claim. |
| Agent-flow E2E | Case-115 trace verdict bound to retained Subject prompt/transcript/result | Real Subject/runtime/external behavior only; unavailable runtime or missing facts is NOT_RUN. |

## Claim Results

| Claim | Result | Evidence |
|---|---|---|
| research-access-candidate-metadata-schema | PASS | `node --test tests/schema/contracts/profile.test.mjs` (20/20) |
| seed-authoring-evaluator-contract | PASS | `node --test tests/engine/helpers/seed-topic-authoring-evaluator.test.mjs` (4/4); pure evaluator only. |
| hitl1-three-candidate-control-surface | PASS | `node --test tests/integration/md/phase-hitl1-research-access.test.mjs` (8/8); static Markdown control-surface proof only. |
| hitl1-status-before-apply | PASS | `node --test tests/integration/cli/operate-topic-state-hitl1-readiness.test.mjs` (1/1); real production CLI/bundle boundary. |
| seed-queue-completion-reuses-authoring-evaluator | PASS | `node --test tests/integration/cli/operate-queue-seed-authoring.test.mjs` (3/3); real queue/Gate CLI bundles. |
| pre-wave-readiness-first-pass-chain | PASS | `node --test tests/e2e/pre-wave-readiness.test.mjs` (1/1); simulated input with real CLI/Gate lifecycle only. |
| hitl1-bounded-candidate-agent-flow | PENDING | Task 5.2-5.4 |
