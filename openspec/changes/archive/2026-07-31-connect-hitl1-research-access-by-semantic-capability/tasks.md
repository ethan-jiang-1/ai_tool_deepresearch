## 0. Plan Review

- [x] 0.1 Complete the change plan review before any target edit (openspec-feedback:plan-review).
- [x] 0.2 Run `node openspec/governance/check-verification-routing.mjs --change connect-hitl1-research-access-by-semantic-capability --mode plan`; done when all four claim routes validate before target edits.

## 1. Selected Adapter Contract

- [x] 1.1 REA-001: Add the selected Claude CLI / `deepseek_anthropic_compatible` Agent-readable adapter contract under `DPT_FRAMEWORK/host_tools/`, naming its generic non-bypass `claude-deepseek.mjs` host bridge, native `WebSearch` and same-URL `WebFetch` invocations, output facts, binding evidence, and unavailable roots; done when no registry, environment-based selection, credential surface, or caller-supplied bypass option is introduced.
- [x] 1.2 REA-001, REA-002: Bind the adapter to the existing thin `claude-deepseek.mjs` native-runtime bridge; done when the launched Phase Agent, not JS/CLI, chooses the neutral query and executes the bounded search/fetch sequence, the bridge cannot mutate a bundle, retry, or add/pass a permission-bypass option, and absent-surface/permission failures return structured direct facts.
- [x] 1.3 REA-002, REA-003: Add focused unit coverage in `tests/host_tools/research-access-adapter.test.mjs`; done when same-URL mismatch, no candidate, permission boundary, caller-supplied bypass rejection, and synthetic-success non-proof cases are fail-closed and no test makes a real provider call.
- [x] 1.4 REA-001, REA-003: Add focused unit coverage in `tests/experiments_env/case-115-subject-runner.test.mjs`; done when case-115's Subject runner builds the selected generic launcher argv without a caller-supplied permission-bypass option, and no test starts a real Agent runtime.

## 2. HITL1 Delivery And Gate Feedback

- [x] 2.1 PRP-015: Update HITL1 phase/shared guidance to read the selected contract and let the Agent execute already-authorized probe mechanics; done when unavailable preserves user semantics, writes only the existing honest profile observation, and never asks the user to run pipeline commands or hand-edit authority.
- [x] 2.2 PRG-010: Update `check-gate-hitl1-recorded.mjs` feedback to project adapter-owned unavailable roots through the existing ProfileSchema/field-value path; done when it names the owner and same-probe/Gate rerun without adding a checker, preflight success, write path, or Setup route.
- [x] 2.3 PRP-015, PRG-010: Add `tests/integration/cli/hitl1-research-access-adapter.test.mjs`; done when real production CLI/guidance paths return the direct absent-surface and permission feedback on temporary bundles and retain existing available-path behavior.
- [x] 2.4 REA-002, REA-003, PRP-015, PRG-010: Add `tests/e2e/hitl1-research-access-adapter.test.mjs`; done when a deterministic disposable bundle proves the unavailable loop, profile-only observation, unchanged HITL1 routing, and no evidence/cache/work-unit leakage without external calls.

## 3. Provider-Scoped Observation And Release

- [x] 3.1 REA-002, REA-003: Extend the existing `experiments_playbook/exp_wff_pre-research-repair/case-115-heavy-hitl1-research-access-probe.md` and its Subject runner for the selected Claude CLI / `deepseek_anthropic_compatible` generic non-bypass contract; done when it proves only that real Subject Agent's search -> returned URL -> same-URL fetch observation under the same no-bypass mode, its retained execution evidence is paired with the deterministic runner-argv proof, and it preserves case-115's existing broad bounded-probe verdict for its honest unavailable branch.
- [x] 3.2 REA-003: Run the selected provider observation through case-115 on a real disposable bundle and record its declared experiment-evidence references in `apply-evidence.md`; done only when it records both the native case outcome and the C5 available-path claim disposition. Only a retained trace that proves an available same-URL branch may mark that C5 claim PASS; unavailable/permission-denied is `NOT_RUN` for that claim even if case-115's broad protocol verdict passes, and raw probe data remains outside the production research bundle/evidence authority.
- [x] 3.3 Update `CHANGELOG.md` with the proposal-declared `v0.65` release; done when it describes one selected adapter and does not claim provider availability beyond the observed host.
- [x] 3.4 Synchronize the `DPT_FRAMEWORK/RUN.md` version banner and current release summary with `v0.65`; done when it matches the changelog without introducing a second entry path.

## 4. Verification And Archive Readiness

- [x] 4.1 Run the selected unit, integration, deterministic E2E, and provider-scoped Agent-flow verification; record every verification-plan claim in `apply-evidence.md` as PASS, FAIL, or NOT_RUN with its evidence boundary.
- [x] 4.2 Run `node openspec/governance/check-verification-routing.mjs --change connect-hitl1-research-access-by-semantic-capability --mode assets`; done when all selected test and playbook assets exist in their canonical routes.
- [x] 4.3 Run `node openspec/governance/check-project-reqs.mjs`; done when it reports 0 duplicate, orphan, unregistered, and reused-retired requirement IDs.
- [x] 4.4 Run `node openspec/governance/check-project-specs.mjs`; done when it reports 0 deltaHeaderInMain, missingPurpose, missingRequirements, and missingReqHeader violations.
- [x] 4.5 Run `openspec validate connect-hitl1-research-access-by-semantic-capability --strict` and `git diff --check`; done when both pass for the completed change.
- [x] 4.6 Complete the change-scoped actual-diff closeout review (openspec-feedback:closeout-review).
