# Implementation Evidence

Date: 2026-08-08

## Scope Result

This P1 change removes the HITL1 `3-5` anchor from the Agent-facing guidance
and replaces it with a minimum independent Topic map: one or more proposed
Topics, no preset upper cap, and reviewable thread grouping when needed. The
existing post-acceptance lower bound of one approved canonical Topic remains
unchanged.

An optional natural-language focus remains narrative guidance. HITL1 preserves
the user wording verbatim plus a separately labelled, user-correctable Agent
interpretation in the existing `rb_plan.md## Constraints > ### User Research
Controls` literal snapshot. HITL2 preserves the same two parts in its existing
`rationale`; phase-rerun uses them only to guide the current existing per-Topic
direction increment. No profile field, Topic field, parser, Gate input, source
quota, route, checkpoint, receipt, trace event, or historical-coverage claim
was added.

## Touched Surfaces

- HITL1/HITL2/rerun Agent guidance: the two brief files and the three phase
  files named in tasks 2 and 3.
- Deterministic contracts: the two new Markdown integration tests and the
  canonical-topic-state recovery assertion in
  `user-research-controls-contract.test.mjs`.
- Real-Agent playbook support: active case 716 and its manifest registration,
  the smallest setup/subject/observer extensions, plus case 712's retained
  labelled-rationale canary in the existing extreme-slow quarantine.
- Release surfaces: `CHANGELOG.md` and `DEEP_RESEARCH_HARNESS/RUN.md` at
  `v0.79`.

## Deterministic Verification

| Command | Native result | Proof boundary |
| --- | --- | --- |
| `node --test tests/integration/md/topic-research-emphasis-guidance.test.mjs tests/integration/md/topic-research-emphasis-rerun-guidance.test.mjs tests/integration/cli/user-research-controls-contract.test.mjs tests/integration/md/iterative-interaction-agent-flow-playbooks.test.mjs` | PASS: 17 tests, 4 suites | Markdown carrier/order/no-cap contracts, canonical apply/recovery, active-manifest quarantine wiring, and playbook text only; no Agent semantic claim. |
| `node DEEP_RESEARCH_HARNESS/cli/validate-workflow-package.mjs` | PASS: `passed: true`, no issues | Package structure and Markdown workflow validation. |
| `node DEEP_RESEARCH_HARNESS/cli/validate-playbook.mjs experiments_playbook` | PASS: 101 active-manifest playbooks | Active runnable corpus only; `exp_extrem_slow/` remains excluded. |
| `node --check experiments_env/shared/prepare-iterative-interaction-case.mjs` | PASS | Syntax only. |
| `node --check experiments_env/shared/run-iterative-interaction-subject.mjs` | PASS | Syntax only. |
| `node --check experiments_env/shared/observe-iterative-interaction-case.mjs` | PASS | Syntax only. |
| `node experiments_env/shared/prepare-iterative-interaction-case.mjs 716 --target-dir tests/.test-bundles` | PASS | Setup-only legal HITL1 boundary; the generated disposable bundle was removed after inspection. |
| `node DEEP_RESEARCH_HARNESS/host_tools/run-agent-experiment.mjs --case <711|712|716> --dry-run --json` | PASS for each exact selector | Manifest/frontmatter selection only; no Agent launch or behavior proof. |

## Real Agent-Flow Attempts And Quarantine

The launcher preflight succeeded:

```text
node DEEP_RESEARCH_HARNESS/host_tools/claude-deepseek.mjs --check
```

It confirmed the Agent executable, provider configuration, model credential
presence, and provider URL shape without exposing a credential value.

The supported Supervisor was invoked with its documented budget and timeout
limits. The following retained native Supervisor reports are the outcome
authority; their source playbooks were active at the time of each run.

| Historical case and report | Native outcome | Observed facts and proof boundary |
| --- | --- | --- |
| `case-711-heavy-hitl1-natural-acceptance`; `.exp-bundles/_reports/998f55be-8ea8-46f3-bb0c-581f5baf8e6f.json` | `NOT_RUN`, health `ISSUES`, `290876 ms`, `$0.352833` | Completion records `independent Subject Agent or required real tools unavailable`. It proves no natural-language acceptance behavior. |
| `case-716-heavy-hitl1-topic-focus`; `.exp-bundles/_reports/e1a24db5-2272-441d-9c4d-ac05eb47872f.json` | `NOT_RUN`, health `CLEAN`, `243081 ms`, `$0.249887` | Completion records the same unavailable-runtime boundary. It proves no broad-map or focus-correction behavior. |
| first `case-712-heavy-hitl2-natural-rerun` attempt; `.exp-bundles/_reports/eb5b74f6-7ca5-4e5a-8a02-4ba0abc81b6f.json` | lifecycle `ERROR`, `233859 ms`, `$1.002319` | The attempt stopped with `case_budget_exhausted` before native completion. It proves neither success nor failed HITL2 behavior. |
| second `case-712-heavy-hitl2-natural-rerun` attempt; `.exp-bundles/_reports/08d268bf-aa95-4873-a52a-8f85a3338f6b.json` | `FAIL`, health `ISSUES`, `446042 ms`, `$2.190943` | Native completion retains real Subject prompt/transcript/result evidence. `case-712-review-and-one-recommendation` and `case-712-natural-language-mapping` are false; `case-712-user-facing-contract` is true. This is a failed observed behavior, not a semantic success. |

The second case-712 run root is
`.exp-bundles/runs/08d268bf-aa95-4873-a52a-8f85a3338f6b/001-case-712-heavy-hitl2-natural-rerun-44570f7a-e441-40e7-ac67-c23905563725`.
Its `446042 ms` observed duration and `$2.190943` cost exceed the acceptable
canary envelope. The retained playbook has therefore moved to
`experiments_playbook/exp_extrem_slow/case-712-extreme-slow-hitl2-natural-rerun.md`.
It is no longer in the active manifest or active verification-routing claims,
so Autorun and Interactive cannot select it. No additional Agent-flow rerun
was started under the user's `$10` total cap.

## Residual Risk And Deliberate Deferrals

- The deterministic checks prove literal preservation and existing boundaries;
  they cannot prove an Agent semantically understood a user's natural-language
  focus.
- No Agent-flow case passed. The two HITL1 cases remain unavailable-runtime
  observations, and the native HITL2 canary remains an explicit failed
  interaction rather than evidence that the focus was understood.
- Case 712's health report also records a trace/log gate-attempt mismatch;
  quarantine preserves that diagnostic context without presenting it as a
  product-behavior conclusion.
- P2 focus coverage and P3 reader-facing evidence projection remain outside
  this P1 change.

## Spec Sync And Governance

The supported spec-sync operation updated the five existing main capabilities:

- `agent/hitl-ux` (`HIU-002`, `HIU-003`)
- `research/content-delivery-phase-content` (`CDP-001`)
- `research/pre-research-phase-content` (`PRP-012`, `PRP-014`)
- `research/user-research-controls` (`URC-001`)
- `workflow/rerun-incremental-node` (`REI-006`)

Each synchronized main requirement exactly matches its accepted delta block;
no main spec contains an ADDED/MODIFIED/REMOVED/RENAMED delta header. The
existing requirements and their registered IDs are preserved.

| Command | Native result |
| --- | --- |
| `openspec validate align-topic-focus-and-rerun-guidance --strict` | PASS |
| `node openspec/governance/check-project-specs.mjs` | PASS: 84 main specs, 0 violations |
| `node openspec/governance/check-project-reqs.mjs` | PASS: 640 registered IDs, 0 orphan IDs |
| `node openspec/governance/check-verification-routing.mjs --change align-topic-focus-and-rerun-guidance --mode assets` | PASS: 5 active claims after case-712 quarantine |
| `node openspec/governance/check-capability-discovery.mjs --change align-topic-focus-and-rerun-guidance` | PASS |

No separate `check-change-requirement-traceability.mjs` entry exists in this
repository; the project's available requirement-traceability check is
`check-project-reqs.mjs`, recorded above.

## Closeout Review Status

The completed change-scoped review covered the five synchronized requirements,
seven Agent-facing Markdown surfaces, deterministic contracts, real-Agent
playbook wiring, the quarantine boundary, release notes, and the
verification-plan boundary. No new actionable semantic, authority, scope, or
evidence-overclaim finding remained; the runtime-quarantine finding was
recorded and resolved as task 5.5.

The current archive guidance was obtained and all listed readiness checks pass.
No archive finalizer was invoked: the user requested Apply, not Archive. The
supported future transition remains
`node openspec/governance/finalize-change-archive.mjs --change align-topic-focus-and-rerun-guidance`.

The current non-archive readiness checks pass:

| Command | Native result |
| --- | --- |
| `git diff --check` | PASS |
| strict change, main-spec, requirement, capability-discovery, and verification-routing checks above | PASS |
| `rg -n '3-5' DEEP_RESEARCH_HARNESS/workflows/nodes/brief/hitl1.md DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-hitl1.md` | no matches |
