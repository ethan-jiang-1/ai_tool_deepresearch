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
| hitl1-bounded-candidate-agent-flow | NOT_RUN | Case-115 production playbook passes `node DPT_FRAMEWORK/cli/validate-playbook.mjs experiments_playbook/exp_wff_pre-research-repair/case-115-heavy-hitl1-research-access-probe.md`; its required configured Subject launcher, `$HOME/.local/bin/claude-deepseek`, is not executable on this host. No Subject, fixture, Playbook-Agent, or cross-runtime substitute was run. The provider-scoped durable-evidence contract remains `case-115-subject-prompt.json`, `case-115-subject-transcript.jsonl`, and `case-115-subject-result.json` only for a future authenticated canonical Autorun. |
| selected pre-Wave regression set | PASS | `node --test` over 9 focused schema/helper/Markdown/CLI/observer suites: 66/66; `node --test tests/e2e/pre-wave-readiness.test.mjs`: 1/1; `node DPT_FRAMEWORK/cli/validate-workflow-package.mjs`: passed. |
| verification-routing assets | PASS | `node openspec/governance/check-verification-routing.mjs --change make-pre-wave-readiness-feedback-direct --mode assets`: 7 claims valid. |
| accepted spec projection | PASS | Synced only `SCO-002`, `PRP-002`, `PRP-005`, `AGQ-002`, and `AGQ-009` delta behavior into their three existing main capability specs; `check-project-reqs.mjs` reports 590 registered IDs, 53 retired, and 0 orphan. |
| project specification governance | PASS | `node openspec/governance/check-project-specs.mjs`: 79 main spec files, 0 violations. |
| final change validation | PASS | `openspec validate make-pre-wave-readiness-feedback-direct --strict` passed; `git diff --check HEAD^ HEAD` and the current scoped diff both passed. |

## Final Scope Review

- Reviewed `HEAD` implementation files plus the current release/evidence diff. The change adds no dependency, lifecycle state, public CLI, Gate definition, controller, generic linter, retry tree, manual authority route, or Wave producer/Gate-feedback behavior.
- The only new reusable implementation unit is `seed-topic-authoring-evaluator.mjs`, a pure parser/binding evaluator shared by existing queue completion and the existing seed Gate; it does no I/O, queue mutation, body-semantic judgment, or external work.
- The candidate pair stores only a bounded final count/ordinal. It stores no query, URL list/history, response bytes, retry state, Gate verdict, or access-derived evidence.
- Deterministic and real-Agent/external proof remain separate: all deterministic claims above are PASS within their stated temporary-bundle or static boundary; the provider-scoped Agent/external claim remains NOT_RUN on this host.
