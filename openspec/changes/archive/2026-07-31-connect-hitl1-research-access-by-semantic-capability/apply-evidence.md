# Apply Evidence

## Entry Baseline

- 2026-07-31: `openspec status --change connect-hitl1-research-access-by-semantic-capability --json` reported all planning artifacts complete and the Change ready for apply.
- 2026-07-31: `openspec instructions apply --change connect-hitl1-research-access-by-semantic-capability --json` returned `change-feedback-loop/apply` guidance. The required plan review was completed before target edits; no actionable coherence finding was identified.
- 2026-07-31: `node openspec/governance/check-verification-routing.mjs --change connect-hitl1-research-access-by-semantic-capability --mode plan` passed with five routed claims.
- Initial unrelated worktree state is preserved: `_backlog/plans/framework-contract-remediation-openspec-sequence.md` and `openspec/governance/req-registry.yaml` were already modified; this Change directory was untracked.

## Verification Ledger

| Claim | Disposition | Evidence boundary |
| --- | --- | --- |
| adapter-contract-and-url-binding | PASS | Focused deterministic unit contract only; no provider call or availability claim. |
| case-115-runner-uses-selected-generic-permission-mode | PASS | Focused deterministic argv-builder unit contract only; no Agent runtime starts. |
| hitl1-guidance-and-gate-project-direct-adapter-root | PASS | Production CLI/guidance integration on temporary bundles only; no provider call. |
| unavailable-loop-preserves-hitl1-and-evidence-boundary | PASS | Deterministic disposable-bundle E2E only; no provider call or Agent availability claim. |
| selected-provider-establishes-same-url-available-observation | NOT_RUN | Real case-115 native completion recorded `NOT_RUN`: the selected Subject runtime emitted no public `WebSearch` tool use, so no same-URL available branch exists. |

## Deterministic Verification

- PASS `adapter-contract-and-url-binding`: `node --test tests/host_tools/research-access-adapter.test.mjs` passed 6 focused checks. It proves declaration parsing, unavailable-root normalization, caller-bypass rejection, and URL-binding fail-closed behavior only; it makes no provider call and does not establish provider availability.
- PASS `case-115-runner-uses-selected-generic-permission-mode`: `node --test tests/experiments_env/case-115-subject-runner.test.mjs` passed 3 focused checks. It proves case 115 constructs the selected generic argv without a bypass; no Agent runtime starts.
- PASS `hitl1-guidance-and-gate-project-direct-adapter-root`: `node --test tests/integration/cli/hitl1-research-access-adapter.test.mjs` passed 3 checks against production guidance and Gate CLIs on temporary bundles. The direct `surface_absent:` and `permission_required:` roots remain blocked at HITL1; an existing available observation retains Setup routing.
- PASS `unavailable-loop-preserves-hitl1-and-evidence-boundary`: `node --test tests/e2e/hitl1-research-access-adapter.test.mjs` passed 1 deterministic disposable-bundle check. It proves profile-only unavailable handling, preserved HITL1 choices, no Setup route, and no probe material in reference/cache/artifact/work-unit/output-declaration surfaces.
- PASS supporting regression: `node --test tests/integration/experiments_env/hitl1-fetch-fallback-observer.test.mjs tests/integration/cli/check-gate-hitl1-recorded.test.mjs tests/integration/md/phase-hitl1-research-access.test.mjs tests/integration/host-tools/claude-deepseek.test.mjs` passed 46 checks.
- PASS verification routing assets: `node openspec/governance/check-verification-routing.mjs --change connect-hitl1-research-access-by-semantic-capability --mode assets` reported all five selected claim assets in canonical routes.

## Provider-Scoped Agent-Flow Observation

- Real case-115 run root: `.exp-bundles/runs/d2a49214-11d4-44a5-985f-cc2b9747d07f/001-case-115-heavy-hitl1-research-access-probe-52234d1e-13d0-4827-ae42-df0d5f31ce2e/`.
- Native outcome authority: `agent-experiment-completion.json` records `outcome: NOT_RUN`, `not_run_reason: missing public WebSearch tool_use`, and a valid 13-event bundle trace. Its `durable_evidence` array is empty because the case did not establish a native verdict.
- Retained experiment-only diagnostic artifacts are the Subject prompt, transcript, and result under `dpt_disp_case-115_research_access_9/`; they remain outside every production research bundle and its evidence authority.
- `case-115-subject-prompt.json` records the selected adapter identity, `permission_mode: generic_non_bypass`, and `caller_supplied_permission_bypass: false`. The paired deterministic proof is PASS: `node --test tests/experiments_env/case-115-subject-runner.test.mjs` (3 checks), which verifies the runner's actual invocation builder rejects a caller-supplied bypass.
- The retained Subject result reports no callable `WebSearch` or `WebFetch` surface. It consequently emitted neither a returned candidate nor a same-URL fetch, and host policy also prevented its profile write. No available observation, trace, receipt, or research evidence was fabricated. The provider-scoped available-path claim is therefore `NOT_RUN`, not PASS.

## Governance Checks

- PASS `node openspec/governance/check-project-reqs.mjs`: 610 registered IDs, 53 retired, 0 duplicate/orphan/unregistered/reused-retired IDs.
- PASS `node openspec/governance/check-project-specs.mjs`: 80 main specs, 0 structural violations.
- PASS `openspec validate connect-hitl1-research-access-by-semantic-capability --strict`.
- PASS `git diff --check`.

## Archive Closeout

- Change-scoped review covered the selected adapter contract and helper, HITL1 guidance and Gate projection, case-115 runner/observer/playbook, focused tests, release notes, requirement registry entries `REA-001` through `REA-003`, `PRG-010`, and `PRP-015`, plus the three delta specs. The pre-existing `_backlog/plans/framework-contract-remediation-openspec-sequence.md` modification was explicitly excluded.
- No open implementation finding remains: the Agent owns semantic probe execution; the host bridge and observer preserve a deterministic binding/check boundary without performing research or authoring profile success; and Gate feedback remains on the existing ProfileSchema/field-value path.
- Delta specs were Agent-synced and re-compared with main specs: created `research-access-adapter`; added `PRG-010` to `pre-research-gate-implementation`; added `PRP-015` to `pre-research-phase-content`. Each delta requirement and req header is present in its main spec, with no delta operation header left in main.
- Post-sync PASS: `check-project-reqs` (610 IDs, 0 violations), `check-project-specs` (81 main specs, 0 violations), strict Change validation, verification-routing assets, and `git diff --check`.
- Residual external boundary remains explicit: the selected real Subject runtime lacked public `WebSearch`/`WebFetch`, so its available-path claim remains `NOT_RUN`; this Change does not grant host permission or fabricate an alternate provider path.
