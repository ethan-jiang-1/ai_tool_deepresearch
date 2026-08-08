# Implementation Evidence: add-traceable-topic-focus-coverage

Date: 2026-08-08

## Evidence Boundary

- Change requirements: `WAI-005`, `RWG-002`, `RWG-003`, and `RWP-002`.
- Deterministic tests establish only the Engine/CLI contract. They do not judge
  the natural-language usefulness of a commitment or prove real Agent behavior.
- Case 125 is an `agent_flow_e2e` execution surface. Its native completion is
  the only authority for a future PASS, FAIL, ERROR, or `NOT_RUN` outcome.
  No Subject Agent was launched for this apply because the required independent
  Agent and external search/fetch execution were not selected; no disposable
  run root, `rb_trace.jsonl`, or native completion is retained for this change.
  This absence is not a PASS, a FAIL, or a fabricated `NOT_RUN` observation.

## Implemented Contract

- `wave-depth-contracts.mjs` evaluates an optional exact `focus_coverage`
  declaration. It keeps no-focus behavior unchanged and accepts only current
  canonical Topic/current-round commitments whose covered refs are reviewed,
  hash-valid submitted Wave1 deepening rows with an explicit matching
  `rerun_count`.
- `wave-contract-evaluators.mjs` projects a valid `partial` or `blocked`
  result as the definition-owned, required-floor `focus_coverage_limit`
  finding. Invalid or repairable declarations remain depth-contract roots and
  mask that finding.
- Wave1 guidance uses the existing work-unit/submit/inspect loop; no focus
  queue kind, route, status, retry controller, or extra HITL was introduced.

## Selected Deterministic Evidence

| Command | Result | Claim boundary |
| --- | --- | --- |
| `node --test tests/engine/helpers/wave-depth-focus-coverage.test.mjs` | PASS: 4 tests | Exact structure, current Topic/round binding, reviewed submitted refs, and outcome matrix. |
| `node --test tests/engine/wave-depth-contracts.test.mjs tests/engine/helpers/wave-degradation-eligibility.test.mjs` | PASS: 27 tests | Existing depth behavior plus the narrow definition-owned degradation eligibility predicate. |
| `node --test tests/integration/cli/wave1-focus-coverage-contract.test.mjs` | PASS: 4 tests | Formal Gate/inspect clean, limited, and invalid partition using real-shaped submitted authority. |
| `node --test tests/e2e/wave1-focus-coverage-rerun.test.mjs` | PASS: 1 test | Historical backing fails a current rerun focus; a current normal Wave1 increment succeeds through the existing route. |
| `node DEEP_RESEARCH_HARNESS/host_tools/run-agent-experiment.mjs --case case-125-heavy-wave1-focus-coverage --dry-run --json` | PASS: selected 1 exact Case 125 surface | Registration/frontmatter selection only; it does not start an Agent, create a run bundle, or establish a case outcome. |
| `node openspec/governance/check-verification-routing.mjs --change add-traceable-topic-focus-coverage --mode assets` | PASS: 5 routed claims | Selected assets exist with their declared test classes and proof boundaries. |

## Agent-flow Coordinate And Residual Risk

- Planned execution coordinate:
  `experiments_playbook/exp_wff_wave-gates/case-125-heavy-wave1-focus-coverage.md`.
- The Case 125 policy finalizes an actual unavailable Subject/child/tool run as
  native `NOT_RUN`; it forbids fixture PASS. No such native completion exists
  for this apply, so real commitment selection, child research behavior, and
  Agent-authored limitation judgment remain unobserved.
- A future real execution must retain its Subject prompt/transcript/result,
  Subject evidence, Wave1 inspect JSON, and native completion under the
  Supervisor-owned disposable run root. It must not reuse this deterministic
  evidence as Agent-behavior proof.

## Release And Hygiene

- `CHANGELOG.md` and `DEEP_RESEARCH_HARNESS/RUN.md` publish the bounded
  behavior as `v0.80` without claiming fixture or Agent-flow proof.
- `git diff --check` passed before closeout validation.

## Post-Polish Traceability Correction

- The requirement registry identifies `WAI-005` as the Wave1 Gate/depth-review
  contract; `WAI-004` belongs to the separate inline per-Topic backfill
  behavior. The Wave1 Intake delta header, task ledger, implementation evidence,
  and the three new focused-test `@impl` annotations now consistently use
  `WAI-005`.
- The focused deterministic suite was rerun after that correction: the direct
  focus evaluator (4 tests), depth/degradation helpers (27 tests), formal
  Gate/inspect contract (4 tests), and rerun continuity chain (1 test) all
  passed.
- Post-correction governance passed: strict change validation, capability
  discovery, verification routing in both `plan` and `assets` modes, project
  requirement/spec validation, and `git diff --check`.

## Main-spec Sync

The `openspec-sync-specs` operation synchronized and then re-read all three
delta requirements. Each main spec retains its existing requirement and
scenarios; none contains a delta operation header.

| Capability | Requirement re-compared | Preserved boundary |
| --- | --- | --- |
| `research/wave1-intake` | `Wave1 gate checks deepening artifacts` | Submitted authority remains primary; `focus_coverage` is optional process evidence and historical rows cannot cover the current round. |
| `research/research-wave-gate-implementation` | `Wave1 complete gate rule set` | Invalid coverage remains a depth-contract root; valid limitations reuse only the existing definition-owned degradation partition. |
| `research/research-wave-phase-content` | `Wave1 phase body completeness with subagent boundary` | Focus wording stays Agent semantic context; repair stays in the existing work-unit/inspect loop with no new route or checkpoint. |

## Closeout Review

The current `change-feedback-loop/archive` guidance was obtained before this
review. The scoped change boundary is the files listed by the active-change
diff: Wave1 evaluator/definition/phase guidance, selected deterministic tests,
Case 125 plus its Subject adapter/manifest registration, release notes,
implementation evidence, delta specs, and their three synced main specs.

The traceability finding was repaired under task 4.5.1 and the focused suite
plus all required governance checks were rerun. The second polish pass examined
direct submitted binding, the limited-versus-invalid verdict partition, and the
unobserved Agent-flow boundary. It found no further actionable issue: invalid
or independent repair roots mask the definition-owned degradable limit;
declared limitations remain visible without becoming a new route; and Case 125
is still explicitly unexecuted rather than represented as Agent evidence.

Review conclusion: no open change-scoped finding. The direct-fact evaluator
does not parse user focus prose, current-round binding is tested in both an
initial-round and rerun-shaped chain, invalid roots mask the degradable limit,
and valid limits retain the existing verdict partition. The release text and
evidence do not elevate deterministic fixtures or the unexecuted Agent-flow
case into semantic proof. The unobserved Case 125 boundary remains a residual
risk, not a repair task, because its Playbook supplies the required native
execution and `NOT_RUN` policy without claiming a current run outcome.
