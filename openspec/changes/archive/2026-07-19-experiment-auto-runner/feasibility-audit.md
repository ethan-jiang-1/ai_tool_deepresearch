# Agent Experiment Autorun feasibility audit

This is an explore-time implementation audit, not implementation evidence. Counts describe the 97 current `experiments_playbook/exp_*/case-*.md` files observed on 2026-07-18. `case-compatibility-ledger.yaml` is the checked 97-case target baseline: it removes pure-JS wrapper case-316, restores real-human case-901, and locks every target path, cost, family, explicit creator, runtime-state binding, verdict mode, required check IDs, bundle/health roles, proof profile, NOT_RUN rule, durable evidence roles and migration flags. Apply refreshes observed facts only if the worktree changes; it may not silently weaken a target row.

Explore-time launcher probe on 2026-07-18: repo launcher preflight passed with Claude Code 2.1.199 and configured DeepSeek endpoint; a real stdin `stream-json`/verbose/no-session-persistence/bypass invocation produced init/assistant/result JSONL, repo cwd, and Task/WebSearch/WebFetch tool availability. The minimal one-word response reported 21,738 input tokens and USD 0.109165. This proves transport/log shape only, not playbook or Subject-Agent behavior, and makes explicit host budget control an apply blocker.

Interactive launch feasibility on the same worktree: local `claude --help` documents interactive default invocation as `claude [options] [command] [prompt]`; `-p`, structured output, no-session persistence and max budget are print-only. The largest current case source is 34,264 bytes and the larger historical Interactive instruction is 6,296 bytes, so the exact instruction + rendered case + binding envelope is comfortably below the planned conservative 128 KiB UTF-8 positional-prompt cap. Apply still tests the final rendered corpus maximum and fail-closed oversize path; no PTY wrapper or stdin/TTY multiplexing is assumed.

## 1. Why a universal wrapper is insufficient

The current corpus is not one verdict/creator shape:

| Dimension | Observed current state | Apply consequence |
|---|---:|---|
| Filename cost | 40 light / 37 standard / 20 heavy | Cost is a selector/runtime-cost fact, not a health profile. |
| Shared verdict family | 39 `wff-playbook-utils` / 23 `writeTraceVerdict` | Shared migration covers 62 cases, not the suite. |
| Custom/prose verdict | 35 | Each needs a checked native-completion disposition; no raw-trace fallback. |
| Explicit current health invocation | 31 | The other 66 need an explicit `health_profile` decision, not a cost-derived default. |
| Current local cleanup lexical hit | 91 | Playbook-local cleanup must leave the autorun path before Supervisor cleanup is authoritative. |
| `/tmp` cross-block state | 16 | Move to run-root `_playbook_state/` or bundle-local files. |
| Repo-relative `experiments_env/...` lexical hit | 94 | Preserve repo command cwd; rewriting almost the whole corpus to absolute paths is unnecessary risk. |
| Direct `node DPT_FRAMEWORK/...` lexical hit | 72 | Preserve repo command cwd and the single repo-root framework source. |
| Relative framework import lexical hit | 27 | Same: do not manufacture run-root source links or mass-rewrite stable imports. |
| `process.cwd()` lexical hit | 3 | These currently mean repo command root; fixed repo cwd preserves that meaning while explicit args own run targets. |
| Explicit NOT_RUN semantics | 13 | Preserve as native NOT_RUN; do not collapse into FAIL, ERROR or PASS. |
| No executable code fence | 2 | Agent-behavior playbooks need an exact setup/finalizer/NOT_RUN boundary without replacing the intelligent actor. |
| Pure `node --test` invoker | 1 | Route honestly; a Headless Agent wrapper cannot upgrade JS-led proof. |

The finalizer can unify the completed handoff, but it cannot turn every mechanism into `all checks` by assumption. The ledger currently locks 97 unique target identities and 502 unique-within-case required IDs; apply must produce those case-specific facts and only then use the common finalizer. A shared helper that writes one repeated case-level `gate` while hiding distinct assertions in `label` is not compliant: migrated trace checks use the ledger IDs as real stable `gate` values.

## 2. Run-root feasibility

The earlier case-root-cwd design without source links is rejected by the current corpus audit: 94/97 playbooks name repo-relative `experiments_env/...`, 72 name direct `node DPT_FRAMEWORK/...`, 27 contain relative framework imports, and 3 call `process.cwd()`. Rewriting those source coordinates only to avoid a link would create broad semantic risk. Run-root framework/experiments links are also rejected because they blur source and run data. The selected design is:

1. Supervisor creates a unique case run root and strict `agent-experiment-run/v1` context.
2. Supervisor keeps expected context/source/rendered values in memory and launches the Agent with validated repo command root as fixed cwd.
3. Framework, experiments environment and tests remain only at repo root, with no copy/symlink/hardlink under `.exp-bundles/`; existing repo-relative source paths remain valid.
4. Source playbooks use only `{{RUN_CONTEXT_SH}}`, `{{CASE_RUN_ROOT_SH}}`, and `{{PLAYBOOK_STATE_DIR_SH}}`; Supervisor validates and deterministically substitutes shell-quoted absolute values, then binds both source and rendered digests.
5. Disposable, production-instantiate and fixture/preparation creators receive explicit rendered `--target-dir`; every result is registered immediately under a V2 stable role in case-local structured state and later blocks resolve that role explicitly; finalizer receives explicit rendered `--context` plus role-bound bundles. The checked ledger is the migration baseline that supplies those V2 roles during apply, but archived change data is never runtime authority. Ordinary repo/test invocation remains unchanged, and no env/cwd/chat/latest-run discovery owns target selection.

This is a cleanup/authority boundary, not an OS security sandbox. Claude runs in a real bypass-permission mode and trusted playbooks can still issue an arbitrary absolute write whether cwd is repo root or case root. Static playbook/render validation, source/rendered digests, no-shell spawn, explicit creator targets and path checks reduce accidental escape; they do not justify claiming hostile-code isolation. CI hosts should supply their own OS sandbox when that threat model matters.

The 16 current `/tmp` users are case-102, 103, 104, 105, 112, 114, 115, 181, 182, 201, 315, 318, 711, 712, 713 and 951. Their handoff moves to the rendered playbook-state path or bundle. Existing main creator surfaces already accept `--target-dir` (`new-disposable-bundle.mjs`, `instantiate-run-bundle.mjs`, `run-fixture-backed-case.mjs`); iterative/rerun preparation helpers that currently hard-code `process.cwd()` need narrow explicit-target changes. Migration is incomplete while any selected autorun path requires a run-root framework link, writes a repo-root bundle, or leaves an unresolved runtime token.

## 3. Named exceptional shapes

### Prose-only real-actor cases

- case-604 and case-605 have no executable code fence. They are prior real-Sub-agent behavior claims, not candidates for fixture replacement. Both use `proof_subject: agent_behavior`, `subject_execution: real_subagent`, `fixture: setup_only`, `runtime: real_disposable_bundle`, `external_calls: real`, `verdict_judge: deterministic`, and `health_profile: heavy`.
- Their visible flow must be context-contained Wave0 setup → real `operate-work-unit claim` → hand the claim-generated task/beacon/prompt to a native Claude Task/Sub-agent → require Sub-agent-owned result/receipt/output/cache writes → real submit → observer checks → finalizer. The Headless Playbook Agent may orchestrate the native Task tool but may not write Subject output.
- case-604 required checks: `real-subagent-result-written`, `real-subagent-receipt-nonce-preserved`, `real-subagent-submit-succeeded`, `no-chat-only-return`.
- case-605 required checks: `real-subagent-submit-succeeded`, `inspect-bundle-no-active-leak`, `repo-root-no-runtime-leak`.
- If the native Task/Sub-agent or required real search/fetch surface is unavailable, invoke native NOT_RUN with the declared reason and preserve the run root. Do not run a fixture or parent-written substitute.

### JS/helper-led recipes

- case-403, case-214 and case-317 expose only one helper/runner block.
- They may remain Headless-Playbook-Agent executions only if the report labels their proof subject `deterministic_contract` and the helper stops owning cleanup/final outcome.
- case-316 only invokes focused `node --test` commands. Disposition: retire it from the current manifest/runnable playbook location and retain the JS tests as the real authority; merely launching those tests through Claude must not be reported as Agent behavior proof.
- case-305 has one block but directly expresses its mechanism and trace verdict; it is a normal mechanical finalizer migration, not optional-runner-only.

### Real-human / AI-judge pair

- The final 901/951 pair proves topic-rewrite Agent behavior and therefore cannot let the Playbook Agent's own rewrite count as Subject Agent execution.
- Both use `proof_subject: agent_behavior`, `subject_execution: real_agent`, `fixture: setup_only`, `runtime: real_disposable_bundle`, `external_calls: real`; case-901 judge is `real_human`, case-951 judge is `ai_judge`, and both use Light health because the bundle stops at the HITL boundary.
- The Playbook Agent prepares the legal bundle and launches one independent Subject Agent session that alone writes the rewrite/profile/probe facts; preserve its runtime transcript/evidence. Then 901 obtains a real-human checklist verdict through Interactive replay, while 951's Playbook Agent performs the separately tagged AI review.
- Required checks include stable subject-runtime/rewrite evidence, the real structural Gate result, and one structured judge check whose `verdict_judge` matches V2. Remove current hard-coded `AI_VERDICT=pass`; an AI judge must actually inspect and decide. Neither half completes the other.

### Non-default creators

- case-73 and case-102 exercise production `instantiate-run-bundle.mjs`. Each must use two direct-child bundles: a fresh `dpt_disp_*` verdict/experiment bundle whose trace owns required checks, plus a fresh `dpt_rb_*` production-instantiator subject bundle created through the real CLI with explicit case-root target. Both are completion-declared required health targets. The `dpt_rb_*` is disposable case-owned subject evidence, not a separately selected live production run; V2 runtime remains `real_disposable_bundle` and PASS must not be reported as live-production evidence.
- case-318 uses its iterative/rerun preparation path and `/tmp` state; migrate the preparation helper and state handoff, not its real Subject Agent semantics.
- Current fixture-case helpers may remain thin mechanism executors, but must not cleanup, turn missing actors into PASS, or become the Agent Autorun Supervisor/final verdict authority.

### Multi-bundle cases

At least these current cases create multiple bundles and need explicit roles in completion:

| Case | Observed bundles | Verdict/health disposition |
|---|---:|---|
| case-51 | 3 | One aggregate verdict bundle; all three are required health targets. |
| case-73 | 2 target | Fresh `dpt_disp_*` verdict bundle + real-CLI-created `dpt_rb_*` production-instantiator subject; both required Standard health, no live-production claim. |
| case-102 | 2 target | Fresh `dpt_disp_*` verdict bundle + real-CLI-created `dpt_rb_*` production-instantiator subject; both required Standard health, no live-production claim. |
| case-112 | 2 | Preserve native `last` policy; retain bad-JSON as a declared non-health auxiliary, aggregate its stable fact into the healthy repair-verdict trace, and do not delete it mid-playbook. |
| case-135 | 3 | Aggregate verdict bundle is required; intentionally corrupted auxiliary bundle is declared but not a health target. |
| case-153 | 10 | Aggregate checks live in the primary invalid bundle; declare all ten, health the primary, preserve PASS+ISSUES. |
| case-213 | 2 | Declare both; retain the playbook-selected aggregate verdict bundle. |
| case-224 | 4 | Happy/aggregate bundle is verdict + required Heavy health target; declare orphan-output, shallow-depth-review and cache-thin negative auxiliaries without health authority. |
| case-235 | 3 | Declare all; retain the playbook-selected aggregate verdict bundle. |

The compatibility ledger must verify this list rather than treating it as exhaustive; static creator-call count alone misses helper-created bundles.

## 4. Policy fields that still require per-case assignment

Every registered playbook needs:

- `verdict_mode: all|last` (current known `last`: case-111 and case-112; compatibility audit must confirm no custom equivalent);
- unique stable `bundle_roles[]`, one `verdict_role`, and non-empty `health_roles[]` containing that verdict role; these are static authority policy, while native completion supplies only this run's role→path binding;
- `health_profile: light|standard|heavy`, selected from the lifecycle/evidence actually present rather than filename cost;
- a complete verification-aligned V2 proof profile for every case; 901–999 judge values are additionally cross-validated against the accepted pair/band and structured trace provenance.

### Agent-behavior profile ledger

Exactly these final active cases claim Subject Agent behavior and therefore require independent subject runtime after setup:

| Subject execution | Cases | Shared V2 constraints |
|---|---|---|
| `real_agent`, external real | 115, 232, 711, 712, 713, 901, 951 | `proof_subject: agent_behavior`, `fixture: setup_only`, `runtime: real_disposable_bundle`, `external_calls: real`; deterministic judge except 901/951. |
| `real_agent`, external none | 318 | Same agent-behavior/setup/runtime constraints, but the direction-recovery claim needs no network call. |
| `real_subagent`, external real | 163, 211, 221, 223, 234, 604, 605 | Agent-behavior/setup/runtime constraints; use the case's real work-unit/native Sub-agent and real/attempted search/fetch path. |
| `real_subagent`, external none | 406 | Real work-unit actor boundary without a network-behavior claim. |

Case-901 uses `real_human` judge and case-951 uses `ai_judge`; every other case in the table uses deterministic judge over subject/runtime facts. All other final active cases use `proof_subject: deterministic_contract`, `subject_execution: none`, `external_calls: none`, and deterministic judge; their per-case fixture value is `none` or `fixture_backed` according to the visible Reality Distance Ledger. In particular, cases 114 and 306 remain deterministic, and cases 181/182 remain explicit fixture-backed formatting/gate contracts rather than semantic topic-rewrite Agent proof.

Migration must not let the Headless/Interactive Playbook Agent satisfy any row in this table itself. If an existing case currently says “current Agent” or “Phase Agent” without an independent actor adapter (notably 115 and 232), add the narrow independent Subject Agent boundary or reduce/remove the claim through explore; do not silently classify the Playbook Agent as subject.

### Agent-behavior durable evidence ledger

Outer Playbook-Agent `stream-json` is not sufficient evidence for a nested actor. V2 `durable_evidence_roles[]` and native completion SHALL use these minimum role sets; PASS cleanup is forbidden until exact declared files are exported outside the case root:

| Cases | Minimum durable roles | Cleanup note |
|---|---|---|
| 115, 232, 318, 711, 712, 713 | `subject_prompt`, `subject_transcript`, `subject_result` | Independent Agent session bytes/results must survive; a Playbook-Agent summary is not a substitute. |
| 901 | `subject_prompt`, `subject_transcript`, `subject_result`, `judge_record` | Interactive v1 preserves the full root; real-human judge record remains native evidence. |
| 951 | `subject_prompt`, `subject_transcript`, `subject_result`, `judge_record` | Export both independent Subject runtime and separately tagged AI judge record before Headless cleanup. |
| 163, 211, 221, 223, 234, 406, 604, 605 | `subject_task`, `subject_result`, `subject_receipt`, `subject_output` | Native Task/Sub-agent handoff plus Engine-accepted result/nonce/output evidence; missing applicable file is NOT_RUN or ERROR, never PASS cleanup. |

Each role maps to one containment-valid non-symlink regular file under a completion-declared bundle. The final per-case ledger may add roles but may not drop these minima. NOT_RUN may omit roles when its declared actor capability is unavailable; PASS/FAIL may not.

Thirty-one cases currently invoke health explicitly: case-51, 52, 53, 101, 103, 104, 105, 106, 111, 113, 114, 115, 123, 124, 131, 132, 133, 134, 135, 162, 201, 202, 203, 301, 302, 303, 304, 318, 711, 712 and 713. These are evidence for initial policy assignment, not automatically correct policy. The bundle-lifecycle review for all 97 is captured in the baseline below and remains subject to the named go/no-go probes, not ad hoc apply-time downgrades.

### Accepted-spec hygiene audit

A full `openspec/specs/**/spec.md` path check found 15 references to 10 unique nonexistent `experiments_playbook/*.md` surfaces. They are all owned by delta-covered requirements in this change: PLR-001/003 (`RUN.md`/`RUN_EXPS.md`), PRE-001–008 (five legacy workflow-foundation `test-*` paths), AGQ-006/010 (legacy taxonomy/seed-topics path), RWE-007/009 (legacy review/synthesis roles), and STM-005 (legacy seed-topics-boundary path). Keyword review also found PRG-007/008 and RWG-007 still asserting dual `_trace.jsonl` verdict sinks, plus VER-001/AGQ-006 unconditional or playbook-local cleanup. Dedicated deltas now route each owner requirement to current manifest roles, one root trace, native completion and explicit Supervisor cleanup; TRW-005 or guideline prose is not used as permission to edit another main spec silently.

### Proposed V2 health-profile ledger

The following health projection is derived from the complete target ledger (after restore-901/retire-316). It is based on the bundle facts the case claims, not filename cost. The YAML ledger, not this compact projection, owns row-by-row migration facts. Apply must not silently switch a case to make cleanup green.

| Profile | Case IDs | Rationale |
|---|---|---|
| light (43) | 11, 12, 13, 21, 22, 23, 31, 32, 33, 41, 42, 43, 74, 75, 106, 115, 181, 182, 202, 203, 301, 302, 303, 304, 305, 307, 308, 309, 310, 311, 312, 313, 314, 315, 317, 407, 601, 602, 603, 606, 711, 901, 951 | Root trace/schema is the applicable bundle-health floor; Heavy-cost case 711 and the 9NN pair stop at early/semantic boundaries rather than claiming full provenance surfaces. |
| standard (26) | 51, 52, 53, 71, 73, 78, 101, 102, 103, 104, 105, 111, 112, 113, 123, 124, 131, 132, 133, 134, 135, 151, 152, 153, 201, 306 | Gate diagnostics and trace/log timeline are applicable. Deliberate negative/corrupt auxiliaries remain declared non-targets or honest PASS+ISSUES; profile is not downgraded for cleanup. |
| heavy (28) | 114, 161, 162, 163, 211, 212, 213, 214, 221, 222, 223, 224, 231, 232, 233, 234, 235, 318, 401, 402, 403, 404, 405, 406, 604, 605, 712, 713 | The claim exercises work-unit ledger/receipt/output/cache provenance or a later full lifecycle where those surfaces are applicable. Missing/intentional-negative provenance remains visible as ISSUES. |

Go/no-go probes after the contract/Supervisor skeleton but before mass migration:

1. case-41 shape: one valid bundle, required-check coverage, Light CLEAN, no local cleanup;
2. case-111 shape: `last` considered set and required-check coverage;
3. case-112 shape: `last` aggregate verdict over a healthy repair bundle while the retained bad-JSON bundle is declared/raw-bound but excluded from V2 health authority;
4. case-135 shape: valid standard verdict target plus raw-bound malformed non-health auxiliary;
5. case-51 shape: one verdict bundle, three declared/required Standard targets;
6. case-153 shape: ten declarations and honest PASS+ISSUES preservation;
7. case-711 shape: Heavy filename cost with Light health and NOT_RUN/real-subject separation;
8. case-73/102 shape: disposable verdict authority plus production-instantiator subject bundle, both contained/declared/healthy without live-production overclaim;
9. case-318 shape: repo-cwd source execution plus explicit rendered preparation target/state, with no source link or repo-root bundle leak;
10. case-406 shape: actual native real-Sub-agent PASS with declared subject task/result/receipt/output, durable evidence export and no external-call dependency;
11. case-224 shape: one happy aggregate verdict bundle plus three declared non-health negative auxiliaries, with no filesystem-order authority.

If a probe shows the contract cannot represent the case without mechanism-specific Supervisor logic, apply stops and returns to `/opsx:explore`; it does not add a hidden fallback or silently change the proof claim.

## 5. Apply-entry planning readiness

Apply-entry readiness means the implementation path is fully specified and mechanically partitioned; it does not pretend that post-implementation evidence already exists. As of this audit round, the planning baseline captures and checks:

- parsed `case-compatibility-ledger.yaml`: 97 unique target cases/paths, restore-901/retire-316, exact task-batch union, 39/37/21 cost, 43/26/28 health, 39/23/31/2/2 family split, 16 Agent-behavior rows, 502 stable required IDs, exact role-bound bundle/health plans and durable evidence cross-fields;
- exact native completion/finalizer boundary for shared, custom and prose/real-actor cases, including 604/605;
- fixed repo command cwd plus deterministic runtime-token rendering and source/rendered digest binding, without source copies/links;
- explicit creator target, V2-owned stable role authority, and an atomic sequential case-local bundle-role registry whose no-overwrite rule applies to existing role/path bindings rather than the pre-created registry file, without env/chat/filesystem-order handoff;
- exact production-instantiator dual-bundle disposition for 73/102 and corrected four-bundle disposition for 224;
- exact per-Agent-behavior durable evidence minima/export-before-cleanup contract;
- all 91 current local-cleanup, 31 local-health and 16 `/tmp` migration hits represented by ledger flags;
- required Headless total/per-case USD budget, final-cost accounting and stop-on-unknown/exhausted behavior, grounded by a real transport probe;
- deterministic-first implementation order, eleven pre-mass-migration go/no-go probes, and explicit return-to-explore conditions rather than hidden fallback.

Apply may start only after task 0.1/2.7 refresh confirms the worktree has not drifted from this baseline. A drift is reconciled in the ledger/change first; implementation may not silently weaken a row.

## 6. Apply stop gates and archive blockers

These are implementation evidence, so they are produced during apply rather than falsely required before apply begins:

- registry registration for PRE-008/VER-006 and all declared delta/main-spec synchronization work;
- production contracts, state CLI, Supervisor, finalizer, creator adapters and all 97 playbook migrations implemented without fallback;
- eleven go/no-go probes pass before mass migration continues;
- no current playbook-local Autorun health/cleanup, unresolved token, repo-root bundle leak or source link remains;
- focused deterministic tests, ledger/manifest compatibility validation and knowledge-surface guards pass;
- real Headless Playbook-Agent canary and actual no-network real-Sub-agent case-406 canary pass with durable evidence after optional cleanup;
- final project requirement/spec/routing/manifest/OpenSpec gates pass before archive.
