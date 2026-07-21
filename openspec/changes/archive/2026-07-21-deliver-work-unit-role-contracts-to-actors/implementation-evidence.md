# Implementation Evidence: deliver-work-unit-role-contracts-to-actors

## Evidence Rules

- Change: `deliver-work-unit-role-contracts-to-actors`
- Requirements: `DEW-009`, `SNC-007`, `RWP-015`
- A routed claim is `PASS` only when its selected native authority exists and validates.
- Deterministic tests prove projection, wiring and Markdown contracts only. They do not prove real actor behavior, search, fetch, page content or curl execution.
- The retained real-actor receipt may support the separate conditional delegated-fallback observation `OBSERVED_PASS`, `OBSERVED_FAIL` or `UNOBSERVED`; that observation is neither a fifth routed claim nor a playbook verdict check.
- The case verdict, every routed claim and the conditional observation remain separate facts.

## Apply Context

| Fact | Value |
|---|---|
| Apply schema | `spec-driven` |
| Apply start commit | `a03ec2c87c45ecb9f8a143c61c6ea79fd3dd372a` |
| Apply start UTC | `2026-07-21T04:13:22Z` |
| Node | `v20.19.6` |
| Platform | `Darwin arm64` |
| Initial progress | `0/24` |
| Initial dirty scope | Seven approved Change artifacts only: proposal, design, tasks, verification plan and three delta specs; no target implementation, test or experiment file modified. |

## Verification Claims

| Claim | Native authority | Apply result |
|---|---|---|
| `work-unit-contract-projection-owner` | `node_test_exit` from `tests/engine/work-unit-contract-delivery.test.mjs` | PASS |
| `generated-envelope-delivers-role-and-authoring-contract` | `node_test_exit` from `tests/integration/engine/work-unit-role-contract-delivery.test.mjs` | PASS |
| `shared-delegated-fetch-guidance-contract` | `node_test_exit` from `tests/integration/md/subagent-fetch-contract-delivery.test.mjs` | PASS |
| `wave1-actor-first-return-contract-compliance` | case-221 bundle `trace_jsonl` | NOT_RUN: native completion absent after `agent_timeout` |

## Pre-Target Evidence

### PT-001 Verification routing plan

- Command: `node openspec/governance/check-verification-routing.mjs --change deliver-work-unit-role-contracts-to-actors --mode plan`
- Native result: `Verification routing plan valid: deliver-work-unit-role-contracts-to-actors (4 claims).`
- Verdict: `PASS` for routing shape only.
- Boundary: `unit`, `integration` and `agent_flow_e2e` are selected. `deterministic_e2e` is explicitly not applicable because this Change adds no persisted state, schema, Gate, transition or multi-phase deterministic chain. Deterministic assets do not claim actor, search or fetch behavior.
- Conditional observation: the delegated native-to-curl classification remains receipt-backed and separate from routed claims and case verdict checks.

## Implementation And Verification Log

### RED-001 Contract projection owners

- Command: `node --test tests/engine/work-unit-contract-delivery.test.mjs`
- Native result: exit 1 before test execution: `ERR_MODULE_NOT_FOUND` for `engine/helpers/work-unit-role-guidance.mjs`.
- Expected root: the production role/shared projection owner does not exist yet. The current direct-output owner also does not export the descriptor/closed-ID API imported by this test.
- Boundary: the test creates no active bundle, invokes no claim API and makes no network or Agent-behavior claim. Its fixture root is an explicit unit-test seam only; no production claim/CLI/queue/actor root override is introduced.
- Verdict: `PASS` for task 1.2 red evidence; the routed unit claim remains pending until the test turns green.

### RED-002 Current actor-bound envelope delivery

- Command: `node --test tests/integration/engine/work-unit-role-contract-delivery.test.mjs`
- Native result: exit 1; primary and accepted fallback generated surfaces lack the `Actor Guidance` role/shared delivery section, and supplementary Wave1 still contains unconditional paired-output wording.
- Focused control: `node --test --test-name-pattern="preserves the existing no-claim" tests/integration/engine/work-unit-role-contract-delivery.test.mjs` -> exit 0; the existing no-claim repair and legacy unbound constructor remain baseline behavior.
- Boundary: temporary bundles exercise only deterministic claim/envelope rendering. No actor, search, fetch or external call was invoked.
- Verdict: `PASS` for task 1.3 red evidence; the routed integration claim remains pending until the complete suite turns green.

### RED-003 Shared delegated fetch guidance

- Command: `node --test tests/integration/md/subagent-fetch-contract-delivery.test.mjs`
- Native result: exit 1; `shared-page-fetch-guidance.md` does not exist and none of the five active role files directly requires it. Existing role-local fetch text therefore remains outside the proposed shared owner.
- Boundary: the test reads shipped Markdown and frontmatter only. It performs no fetch, shell command, network operation or actor execution.
- Verdict: `PASS` for task 1.4 red evidence; the routed Markdown integration claim remains pending until the suite turns green.

### GREEN-001 Direct-output closed owner

- Command: `node --test tests/engine/helpers/direct-output-contract.test.mjs`
- Native result: exit 0; 9 tests passed.
- Observed: evaluator dispatch and immutable bounded actor descriptors now share one closed contract table. Existing fresh-byte read, path safety and root-code behavior remain covered by the pre-existing evaluator suite.
- Boundary: this proves the direct-output owner only; role projection and envelope delivery remain pending.

### GREEN-002 Role guidance projection owner

- Command: `node --test tests/engine/work-unit-contract-delivery.test.mjs`
- Native result: exit 0; 3 tests passed.
- Observed: lifecycle-resolved policy/key parity, canonical contained role/dependency resolution, actor-delivery filtering, exact page-fetch identity, and deep-frozen projection all validate using temporary framework roots. The explicit root seam is named for tests and no production claim API accepts it.
- Boundary: this is a pure unit proof. Production claim wiring remains intentionally deferred until the shared guidance and roles exist.

### GREEN-003 Envelope delivery seam

- Command: `node --test tests/engine/work-unit-index.test.mjs tests/engine/work-unit-lifecycle.test.mjs`
- Native result: exit 0; 14 tests passed.
- Observed: task and spawn renderers now accept one optional, validated ephemeral actor-delivery projection. Legacy calls without actor binding retain their prior output; this task does not activate claim-time role reads or mutate persisted envelope schemas.

### GREEN-004 Shared page-fetch guidance

- Command: `node --test --test-name-pattern="ships one actor-delivered" tests/integration/md/subagent-fetch-contract-delivery.test.mjs`
- Native result: exit 0; selected shared-guidance test passed.
- Observed: the new Markdown has the closed identity/frontmatter, one same-URL native/browser/Node/curl sequence, bounded curl controls, independent permission, batching, diagnostic receipt fields and no submit authority.
- Boundary: role dependency migration remains pending; this is Markdown contract validation only.

### GREEN-005 Role migration and package consistency

- Commands: `node --test tests/integration/md/subagent-fetch-contract-delivery.test.mjs`; `node DPT_FRAMEWORK/cli/validate-workflow-package.mjs`.
- Native result: Markdown suite exit 0, 3 tests passed; package report `{ "passed": true, "issues": [] }`.
- Observed: the three closed registered roles and two auxiliary role docs each directly require the one actor-delivered shared fetch node. Role-local chains and obsolete fetch language were removed; the package validator verifies direct dependency, exact shared identity, exclusion from manifest shared, and registered-versus-auxiliary consistency.
- Boundary: no fetch or actor runtime was executed.

### GREEN-006 Formal claim delivery wiring

- Commands: `node --test tests/integration/engine/work-unit-role-contract-delivery.test.mjs`; `node --test tests/engine/work-unit-actor.test.mjs tests/engine/work-unit-claim.test.mjs tests/engine/work-unit-index.test.mjs`.
- Native result: integration suite exit 0, 4 tests passed; focused regression exit 0, 15 tests passed.
- Observed: `claimWorkUnits` now performs delivery preflight only after an existing `allow_claim` decision and before the existing write transaction. The same ephemeral role/shared/direct-descriptor projection reaches both generated task and spawn surfaces. Existing no-claim repair, fallback cardinality, queue/index behavior and legacy construction remain covered.
- Boundary: no persisted manifest, beacon, result, receipt, queue or ledger field was added.

### GREEN-007 Deterministic regression and hygiene

- Commands: `node DPT_FRAMEWORK/cli/validate-work-unit-hygiene.mjs`; `node DPT_FRAMEWORK/cli/validate-workflow-package.mjs`; focused Node suites for direct-output, new delivery owners, generated envelope delivery, shared fetch Markdown and work-unit submit.
- Native result: hygiene passed; package report `{ "passed": true, "issues": [] }`; 82 focused tests passed, 0 failed.
- Observed: assignment resolver, persisted schema/version, queue snapshot, evaluator, dry-submit/formal submit, receipt, provenance, ledger and Gate-facing submit authority retain their existing paths. No deterministic asset asserts actor, search or fetch behavior.

### GREEN-008 Release and governance intermediates

- Version command: `node --test tests/engine/framework-version.test.mjs tests/engine/version-management.test.mjs`.
- Native result: framework version and RUN banner alignment passed. One unrelated `version-management` test fails because it reads the archived/missing active-change path `openspec/changes/simplify-iterative-research-interaction/specs/run-entry/spec.md`.
- Governance commands: verification routing assets -> 4 claims valid; project requirements -> 562 registered, 53 retired, 0 orphan; project specs -> 77 main spec files, 0 violations.
- Boundary: `v0.40` describes deterministic actor-contract delivery and shared guidance only; it does not claim native actor/fetch success or bug closure.

### REAL-001 Canonical case-221 Autorun

- Command: `node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs --case case-221-heavy-batch-subagent --max-total-budget-usd 5 --max-case-budget-usd 5`.
- Batch: `9ec2f8f4-1357-415a-a5e2-eec6ee2f5005`; preserved run root: `.exp-bundles/runs/9ec2f8f4-1357-415a-a5e2-eec6ee2f5005/001-case-221-heavy-batch-subagent-defffa9d-5a83-45e5-aeaf-2d13eefd2910/`.
- Native result: lifecycle `ERROR`, reason `agent_timeout`, duration `600124` ms, cost `0`; no native completion, inspect or Gate verdict was produced.
- Partial durable facts: both claimed real actors recorded `work_done`, passed predictive dry-submit and formal submit. The representative actor's two manifest-derived Wave1 targets had matching pre/post SHA-256 values. These facts do not replace the selected `trace_jsonl` native-completion authority for the routed general claim.
- Routed claim verdict: `NOT_RUN` because selected native authority is absent; the exact Supervisor lifecycle error remains recorded rather than relabeled as PASS or FAIL.
- Run policy: one canonical Autorun only; no fixture substitution, parent-authored output or rerun to chase a fallback branch.

### REAL-002 Delegated fallback observation

- Native authority inspected: representative actor's durable `runtime-receipt.jsonl`, result/cache/source declarations and formal submit facts in REAL-001.
- Result: `UNOBSERVED`. The receipt records successful `node_fetch` attempts, but no same-URL native blocked/unavailable predecessors and no bounded curl success. The required native-to-curl branch therefore did not occur.
- Boundary: this is not a routed fifth claim, playbook check, submit condition or cross-runtime conclusion. It leaves BUG-096 delegated residual active.

### REGRESSION-001 Focused and full repository tests

- Focused command: work-unit/direct-output/role/phase/Autorun suites.
- Focused result: 138 tests passed, 0 failed.
- Full command: `npm test`.
- Full result: 2157 tests, 2142 passed and 15 failed.
- Exact unrelated reproduction 1: `node --test tests/engine/version-management.test.mjs` -> one failure reads missing archived path `openspec/changes/simplify-iterative-research-interaction/specs/run-entry/spec.md`.
- Exact unrelated reproduction 2: `node --test tests/integration/cli/handoff-witnessing-lifecycle.test.mjs` -> `main:wave0-pass-fatigue-advice` E2E assertion failure.
- Exact unrelated reproduction 3: `node --test tests/integration/host-tools/claude-deepseek.test.mjs` -> 13 launcher-fixture failures; this Change does not modify the launcher or its test contract.
- Verdict: routed deterministic claims PASS at their focused native authorities. The real-actor claim remains `NOT_RUN` for the independent native-completion boundary above.

## Residual Risk

- The only canonical case-221 Autorun timed out before native completion, inspect and Gate. Its partial actor artifacts cannot close BUG-098 or prove the routed real-actor claim.
- The representative actor used successful `node_fetch`; native-to-curl fallback is `UNOBSERVED`, so BUG-096's delegated residual remains active. This Claude-specific receipt is not evidence about Codex `web_search.open_page` behavior.
- Full repository test status is recorded separately from the four routed claims; focused delivery suites are native PASS, while unrelated historical failures remain outside the claim map.

## Final Scope And Non-Goal Audit

- Added: one pure role/shared projection helper, one closed direct-output descriptor projection, one ephemeral envelope delivery parameter, one actor-delivered shared fetch guidance node, focused deterministic tests, and a strengthened existing case-221 proof contract.
- Removed: duplicated role-local fetch chains and obsolete active Python-style fallback wording.
- Preserved: persisted work-unit manifest/beacon/result/index/queue/receipt/ledger schemas and versions; existing actor decision, dry-submit/formal submit, provenance, Gate, transition and repair paths.
- No dependency or lockfile changed. No Python, persisted role marker/snapshot, actor selector, second validator/submit path, fetch controller, retry tree, user co-runner, fabricated runtime evidence or new workflow-manifest shared entry was added.
- Existing unrelated `.claude/` and `.codex/` workspace changes were not part of this Change and were not modified by this apply.
