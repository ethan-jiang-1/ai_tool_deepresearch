# Apply Evidence

## Scope And Boundary

- Change: `enable-selected-host-research-tools`.
- This change enables the launcher-owned discovery configuration and a fresh private
  Subject settings identity. It does not create an alternate provider, grant host
  permission, change the selected adapter's native probe semantics, or authorize a
  retry loop.
- The earlier discovery-profile case-51 observation is not used for this claim. After
  review, the change used one explicit `assurance` scope containing only case-115.

## Claim Disposition

| Claim | Disposition | Evidence boundary |
| --- | --- | --- |
| `subject-settings-v2-enables-tool-discovery` | PASS | Focused deterministic runner contract; no real Agent runtime. |
| `launcher-enables-owned-tool-discovery` | PASS | Focused fake-child launcher contract; no provider call. |
| `selected-host-proves-available-search-fetch-path` | NOT_RUN | One fresh assurance-scoped real case-115 run retained no public `WebSearch` tool use, no returned candidate, and no same-URL fetch. |

## Fresh Assurance Observation

- Preflight command:

  ```bash
  node DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs \
    --run-profile assurance \
    --case case-115-heavy-hitl1-research-access-probe \
    --max-predicted-duration-ms 360000 \
    --max-total-budget-usd 1.00 \
    --max-case-budget-usd 1.00 \
    --timeout 360000 \
    --health-timeout 60000 \
    --dry-run --json
  ```

- The preflight selected exactly one case: case-115, under `profile: assurance` and
  `explicit_assurance_scope`; retained stale predictions were `308567 ms` and
  `$0.935117`. No other case was selected or omitted.
- Real-run command: the same command without `--dry-run`.
- Batch report: `.exp-bundles/_reports/022a0574-efb2-49ab-9fd9-8045fb503aae.json`.
- Native completion: `NOT_RUN`; Supervisor health: `CLEAN`; actual duration:
  `115278 ms`; actual cost: `$0.284056`; run root remains preserved.
- Native completion reason: `missing public WebSearch tool_use`.

## Retained Subject Facts

- The Subject runner completed one turn without timeout and created the v2 private
  settings file. Its non-sensitive settings projection records
  `ENABLE_TOOL_SEARCH: "true"`.
- The durable prompt records the requested tool list
  `Bash,Edit,Glob,Grep,Read,WebFetch,WebSearch,Write` and the selected generic,
  non-bypass adapter invocation.
- The real Claude `init.tools` array contained only `Bash`, `Edit`, and `Read`.
  Its terminal usage recorded `web_search_requests: 0` and `web_fetch_requests: 0`.
  It emitted no public `WebSearch` use and therefore could not establish a returned
  URL or same-URL fetch.
- The Subject's attempted unavailable-branch Bash/Edit writes were denied by the
  selected generic non-bypass host policy. The observer correctly finalized
  `NOT_RUN` rather than fabricating an unavailable observation or an available path.
- `node DPT_FRAMEWORK/host_tools/claude-deepseek.mjs --check` confirmed the local
  launcher, `.env`, and selected DeepSeek routing are present. This does not prove
  tool availability and is not cited as such.

## Stop Condition

This was the sole authorized assurance slice. The terminal `NOT_RUN` closes the
runtime observation for this change: no retry, budget increase, discovery queue
progression, or alternate provider was launched. The remaining boundary is selected
host/runtime tool and permission availability, which cannot be resolved by changing
the case, settings file, or deterministic observer.

## Deterministic Verification

- PASS `node openspec/governance/check-verification-routing.mjs --change enable-selected-host-research-tools --mode plan` and `--mode assets`: all three declared claims are valid and canonically routed.
- PASS `openspec validate enable-selected-host-research-tools --strict`.
- PASS focused verification:

  ```bash
  node --test \
    tests/integration/host-tools/claude-deepseek.test.mjs \
    tests/experiments_env/case-115-subject-runner.test.mjs \
    tests/integration/md/iterative-interaction-agent-flow-playbooks.test.mjs \
    tests/host_tools/research-access-adapter.test.mjs
  ```

  Result: 31 passing checks, 0 failures. These tests prove launcher/settings
  transport, non-bypass isolation, and adapter parsing boundaries only; they do not
  upgrade the provider-scoped claim.
- PASS `node openspec/governance/check-project-reqs.mjs`: 616 registered IDs, 53 retired, and 0 duplicate/orphan/unregistered/reused-retired IDs.
- PASS `node openspec/governance/check-project-specs.mjs`: 82 main spec files and 0 structural violations.
- PASS `git diff --check`.

## Final Verification And Closeout Review

- Re-ran the archive verification after the v0.68 release wording and main-spec sync:
  `check-verification-routing --mode assets`, strict OpenSpec validation, the four focused
  Node test files, project requirement/spec checks, and `git diff --check` all passed.
  The focused suite reported 31 passing checks and 0 failures.
- Agent-owned closeout review was scoped to this change's launcher, Subject runner,
  v2-only test assertions, release projection, LDC-002 main-spec sync, and change
  artifacts. Unrelated case-211/case-406 and backlog worktree changes were excluded.
- The review confirmed that the v2 private settings file is newly selected and
  fail-closed on reuse, the v1 file is not rewritten, caller extras cannot control
  the setting, and release text stops at a requestable surface. Delta LDC-002 text
  and scenarios are present in the accepted main spec. No actionable finding remains.
- This review does not rerun the provider. The retained single case-115 terminal
  `NOT_RUN` observation remains the complete runtime boundary for this change.
