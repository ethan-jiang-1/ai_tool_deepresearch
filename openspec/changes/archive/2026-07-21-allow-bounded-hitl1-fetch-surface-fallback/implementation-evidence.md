# Implementation Evidence: allow-bounded-hitl1-fetch-surface-fallback

## Evidence Rules

- Change: `allow-bounded-hitl1-fetch-surface-fallback`
- Requirements: `PRP-002`, `PRP-005`
- A claim is `PASS` only when its selected native authority exists and validates.
- Deterministic tests prove Markdown/observer contracts only. They do not prove native fetch, curl, Agent behavior, or semantic page identity.
- Unavailable real-Agent capability or an unobserved optional fallback branch is `NOT_RUN`, never fixture-substituted `PASS`.
- The native case outcome and each change claim verdict remain separate; implementation evidence does not relabel either.

## Apply Context

| Fact | Value |
|---|---|
| Apply schema | `spec-driven` |
| Apply start commit | `290f68c404a6d57030586db14222faa7dec4d2f4` |
| Apply start UTC | `2026-07-21T00:23:26Z` |
| Node | `v20.19.6` |
| Platform | `Darwin arm64` |
| Initial progress | `0/19` |
| Initial dirty scope | Five approved Change artifacts only; no target implementation/test/experiment file modified |

## Verification Claims

| Claim | Native authority | Apply result |
|---|---|---|
| `hitl1-bounded-fetch-guidance-contract` | `node_test_exit` from `tests/integration/md/phase-hitl1-research-access.test.mjs` | PASS |
| `hitl1-fetch-fallback-case115-wiring` | `node_test_exit` from `tests/integration/experiments_env/hitl1-fetch-fallback-observer.test.mjs` | PASS |
| `hitl1-general-research-access-agent-flow` | case-115 bundle-root `trace_jsonl` through native completion | NOT_RUN |
| `hitl1-native-to-curl-fallback-agent-flow` | case-115 `hitl1-native-to-curl-fallback` playbook check in bundle-root `trace_jsonl` | NOT_RUN |

## Pre-Target Evidence

### PT-001 Verification routing plan

- Command: `node openspec/governance/check-verification-routing.mjs --change allow-bounded-hitl1-fetch-surface-fallback --mode plan`
- Native result: `Verification routing plan valid: allow-bounded-hitl1-fetch-surface-fallback (4 claims).`
- Verdict: `PASS` for route shape only.
- Boundary: `unit` and `deterministic_e2e` are explicitly not applicable. The two integration claims are deterministic contracts; only the two `agent_flow_e2e` claims may prove real Subject behavior.
- Residual risk: selected assets and runtime evidence remain pending until implementation.

## Implementation And Verification Log

### RED-001 Production HITL1 Markdown contract

- Command: `node --test tests/integration/md/phase-hitl1-research-access.test.mjs`
- Native result: exit 1; 7 tests, 4 pass and 3 fail.
- Expected failures: first eligible actual URL/native-first short circuit, exact standalone curl grammar, and permission/observation ownership.
- Boundary: all pre-existing observation/evidence/recovery tests remained green. No network call or runtime behavior was exercised.
- Verdict: `PASS` for task 1.2 red evidence; verification claim remains pending until the production Markdown turns this test green.

### RED-002 Case-115 observer and wiring contract

- Command: `node --test tests/integration/experiments_env/hitl1-fetch-fallback-observer.test.mjs`
- Native result: exit 1; 7 tests, 0 pass and 7 fail.
- Expected root: the shared observer accepts only cases 711/712/713 and the existing case-115 playbook still embeds its old profile-only verdict parser.
- Covered future behavior: public event ID deduplication, structured first URL, native/curl ordering, exact command, honest optional omission, failed contradictory checks, applicable PASS/FAIL projection, exit-3 `NOT RUN`, and unique case/runner/manifest wiring.
- Boundary: temporary synthetic transcript/profile/trace facts exercise the observer CLI contract only; there are no external calls and no Agent-behavior claim.
- Verdict: `PASS` for task 1.3 red evidence; verification claim remains pending until the observer/wiring test turns green.

### GREEN-001 Production HITL1 Markdown contract

- Command: `node --test tests/integration/md/phase-hitl1-research-access.test.mjs`
- Native result: exit 0; 7 tests passed.
- Observed: one first eligible actual URL, native-success short circuit, exact standalone single-quoted curl with HTTP(S)/timeout/redirect/glob bounds, permission ownership, current-writer surface label, unavailable recovery and evidence exclusion are visible in the production phase.
- One-truth-path audit: no diff under schema, CLI, Engine, transitions, Wave guidance or other authority owners; no new profile field, Gate, status, trace contract, controller or retry state.
- Verdict: `PASS` for `hitl1-bounded-fetch-guidance-contract` at the focused-test boundary; broader package/regression execution remains pending.

### GREEN-002 Focused contracts and workflow package

- Commands: `node --test tests/integration/md/phase-hitl1-research-access.test.mjs tests/integration/experiments_env/hitl1-fetch-fallback-observer.test.mjs`; `node DPT_FRAMEWORK/cli/validate-workflow-package.mjs`.
- Native result: 14 tests passed; package validator returned `{ "passed": true, "issues": [] }`.
- Observed: the existing case/runner/manifest wiring, stable-ID observer normalization, exact optional fallback witness projections, exit-3 `NOT RUN` protocol and shipped production Markdown validate together.
- Boundary: no external call or Subject execution occurred. These results prove `hitl1-bounded-fetch-guidance-contract` and `hitl1-fetch-fallback-case115-wiring` only.
- Verdict: both integration claims `PASS`; real Agent-flow claims remain pending.

### REAL-001 Canonical case-115 Agent Experiment Autorun

- Command: `node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs --case case-115-heavy-hitl1-research-access-probe --max-total-budget-usd 5 --max-case-budget-usd 5`.
- Batch: `ee5a3cf8-25a2-4a46-9ff6-d5f70a6291c6`; report: `.exp-bundles/_reports/ee5a3cf8-25a2-4a46-9ff6-d5f70a6291c6.json`.
- Preserved run root: `.exp-bundles/runs/ee5a3cf8-25a2-4a46-9ff6-d5f70a6291c6/001-case-115-heavy-hitl1-research-access-probe-799cb539-56f9-4303-ab04-1ca788da3bc6/`.
- Native result: `NOT_RUN`, Agent process completed, health `CLEAN`, cost USD `0.444916`; completion reason: `missing public WebSearch tool_use`.
- Bound Subject source: retained `dpt_disp_case-115_research_access_5/case-115-subject-transcript.jsonl`; its bundle-root `agent_transcript_digest` is `5394dd7efbb76ca9db947b2cf84dedf70f14577576008e95120bf67959a1c758` over 741318 bytes.
- Direct boundary: the launched Subject advertised only `Bash`, `Edit` and `Read`, so the observer could not bind the required public `WebSearch`/`WebFetch` facts. The Subject wrote `research_access.available` with `fetch_surface: curl`, but profile state and Subject narration cannot replace those public events; the real `hitl1-recorded` Gate also failed on the setup-only bundle's empty canonical Topic state and status prerequisites.
- General claim verdict: `NOT_RUN`. The observer exit-3 artifact and native completion agree; no case PASS/FAIL is inferred from the retained transcript.

### REAL-002 Optional fallback witness classification

- Native authority inspected: the preserved bundle-root `rb_trace.jsonl` from REAL-001.
- Result: no `hitl1-native-to-curl-fallback` check exists. The observer stopped before writing verdict checks because required stable-ID public `WebSearch` facts were absent.
- Fallback claim verdict: `NOT_RUN`, independently of the native case outcome. The profile's `fetch_surface: curl`, non-empty curl output or Subject prose is not substitute authority.
- Run policy: no second playbook, fixture substitution or rerun solely to chase native-failure-to-curl-success was used.
- Residuals: this Claude-specific run does not prove Codex `web_search.open_page` behavior; the deterministic observer can bind public non-error/non-empty bytes and the Subject's recorded judgment but cannot independently prove arbitrary HTML semantic identity.

### REGRESSION-001 Focused HITL1 and full repository tests

- Focused command: `node --test tests/schema/profile.test.mjs tests/schema/contracts/profile.test.mjs tests/integration/cli/check-gate-hitl1-recorded.test.mjs tests/integration/cli/apply-research-style.test.mjs tests/integration/md/phase-hitl1-research-access.test.mjs tests/integration/md/iterative-interaction-contract.test.mjs tests/integration/md/iterative-interaction-agent-flow-playbooks.test.mjs tests/integration/md/canonical-topic-state-contract.test.mjs tests/integration/md/gate-hint-controller-contract.test.mjs tests/integration/experiments_env/hitl1-fetch-fallback-observer.test.mjs`.
- Focused result: 85 tests passed, 0 failed.
- Full command: `npm test`.
- Full result: 2140 tests, 2125 passed and 15 failed. All failures are outside this Change's target/diff and are excluded from its four verification claims.
- Exact unrelated reproduction 1: `node --test tests/engine/version-management.test.mjs` -> 4 passed, 1 failed because the test reads removed active-change path `openspec/changes/simplify-iterative-research-interaction/specs/run-entry/spec.md`.
- Exact unrelated reproduction 2: `node --test tests/integration/cli/handoff-witnessing-lifecycle.test.mjs` -> 1 failed at `main:wave0-pass-fatigue-advice`; this Change does not modify Wave0 guidance, Gate diagnostics or handoff lifecycle authority.
- Exact unrelated reproduction 3: `node --test tests/integration/host-tools/claude-deepseek.test.mjs` -> 1 passed, 13 failed in the host launcher fixture contract; this Change does not modify `claude-deepseek.mjs` or its test.
- Verdict: relevant regression surface `PASS`; full-suite unrelated failures are recorded rather than relabeled as Change claim failures.

### HARDENING-001 Complete no-eligible-result observation

- Red command: `node --test --test-name-pattern='public empty Links|public ineligible first result' tests/integration/experiments_env/hitl1-fetch-fallback-observer.test.mjs` -> 2 failed because complete no-eligible-result facts exited 3 as `NOT RUN`.
- Green command: `node --test tests/integration/experiments_env/hitl1-fetch-fallback-observer.test.mjs` -> 10 passed.
- Result: an empty structured Links array or ineligible first result now produces the general honest unavailable check from direct facts, without selecting a later result or adding the optional fallback witness. Literal IPv6 prefix checks no longer reject ordinary eligible domains such as `fda.gov`.
- Boundary: no production runtime behavior changed; this closes only the verification observer's fail-closed classification boundary.

### CLOSURE-001 Governance and strict validation

- `node openspec/governance/check-verification-routing.mjs --change allow-bounded-hitl1-fetch-surface-fallback --mode assets` -> 4 claims valid.
- `node openspec/governance/check-project-reqs.mjs` -> 562 registered, 53 retired, 0 orphan; all IDs consistent.
- `node openspec/governance/check-project-specs.mjs` -> 77 main spec files, 0 violations.
- `openspec validate allow-bounded-hitl1-fetch-surface-fallback --strict` -> valid.
- Final focused verification: 17 tests passed across the production HITL1 and case-115 observer contracts; workflow package validator returned `{ "passed": true, "issues": [] }`.
- Version projection: latest `CHANGELOG.md` entry and both `DPT_FRAMEWORK/RUN.md` v0.39 surfaces align; the focused version assertions passed.
- `git diff --check` -> clean.
- Closure statement: only BUG-096's HITL1/main-Agent bounded fallback path is fixed here. Delegated actor contract delivery and whole-bug closure remain with `deliver-work-unit-role-contracts-to-actors`.

## Residual Risk

- The current real Subject runner is Claude-specific; Codex `web_search.open_page` remains unobserved by this Change.
- The deterministic observer can bind non-error/non-empty curl bytes and the Subject's recorded judgment, but it cannot independently prove arbitrary HTML semantic identity.
- The fallback branch may remain claim-level `NOT_RUN` when the authenticated runtime does not exhibit native-failure-to-curl-success.

## Final Scope And Non-Goal Audit

- Claim map is complete: both deterministic integration claims are `PASS`; both real Agent-flow claims are honestly `NOT_RUN` with native authority and retained evidence references.
- Production ownership remains one-truth-path: the only behavior edit under `DPT_FRAMEWORK/` is `workflows/nodes/phases/phase-hitl1.md`; schema, Gate/CLI, Engine, transition, status, Wave/work-unit, evidence, provenance, receipt and ledger owners are unchanged.
- No dependency or Python was added. `package.json` and lockfiles are unchanged.
- No `fallback_used`, surface registry/list, attempt history, retry state/tree, fetch controller, new HITL/Gate/status/trace contract, second URL/tier, offline-report path or user command co-runner was added.
- Real runtime facts are preserved under the Supervisor-owned `.exp-bundles/` run root and referenced here; no profile, trace, Subject event, page bytes, Gate outcome or completion evidence was fabricated.
- Release scope is narrow: v0.39 fixes BUG-096's HITL1/main-Agent path only. Delegated actor delivery remains owned by `deliver-work-unit-role-contracts-to-actors`; this Change does not close BUG-096 as a whole.
