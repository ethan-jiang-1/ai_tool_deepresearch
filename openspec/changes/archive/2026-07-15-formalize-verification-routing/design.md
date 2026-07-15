## Context

The repository already has four useful test shapes but lacks one canonical vocabulary for them: focused JS tests, JS integration tests, JS full-chain state tests, and coding-Agent-executed Markdown playbooks.

`_backlog/plans/tests-e2e-layer.md` correctly separates deterministic Engine proof from Agent proof, but models deterministic cross-phase scenarios as a new top-level `tests_e2e/` layer. The stable model uses one four-way class choice, then records proof subject and execution facts separately:

```text
test_class              control surface / owned boundary
--------------------    ------------------------------------------
unit                    JS-led / tests/
integration             JS-led / tests/integration/
deterministic_e2e       JS-led full chain / tests/e2e/
agent_flow_e2e          coding Agent + Markdown / experiments_playbook/
```

A selected live `dpt_rb_*` observation may be useful in a future change, but it is not a fifth test class. Treating the runtime object, cost, or proof subject as a peer class caused the original category error.

The initial rerun case also exposes two concrete proof failures: a checked task names a missing playbook, and the current integration test reimplements current-round filtering instead of consuming the real CLI. This change routes those claims without creating another runner or changing framework runtime behavior.

## Goals / Non-Goals

**Goals:**

- Define one canonical four-test-class taxonomy and an explicit claim-to-class route contract.
- Make new changes declare selected and not-applicable verification decisions before target edits.
- Keep route selection separate from native execution verdicts.
- Route focused deterministic rerun behavior to `unit`/`integration`, simulated Markdown-action long chains to `deterministic_e2e`, and the real-Agent direction/recovery playbook to `agent_flow_e2e`.
- Make rerun state combinations and failure/recovery paths cheap enough to run through canonical `npm test`, instead of depending on infrequently executed playbooks.
- Detect missing, misplaced, unsafe, duplicate-id, or unregistered declared assets without executing them.
- Converge duplicated verification prose to owned boundary facts plus pointers.

**Non-Goals:**

- Do not create repo-top-level `tests_e2e/`, a fifth test class, a universal runner, or `test:all`. `deterministic_e2e` remains under the existing `tests/` authority.
- Do not change `DPT_FRAMEWORK/`, framework schemas, runtime CLIs, bundle state, dependencies, or version.
- Do not implement the backlog's per-row projection-authority checker; no accepted Engine contract currently owns it.
- Do not make standard `openspec status/validate` pretend to understand a custom change artifact.
- Do not retroactively require archived changes or active changes created before this capability is accepted to gain a plan.
- Do not execute or mutate a production bundle.

## Decisions

### Decision 1: Make test class the only routing taxonomy

The route matrix is:

| Test class | Control surface | Allowed proof subject | Required boundary/profile | Forbidden overclaim |
| --- | --- | --- | --- | --- |
| `unit` | JS-led focused test | `deterministic_contract` | focused `tests/` path | broader chain or Agent behavior |
| `integration` | JS-led boundary test | `deterministic_contract` | `tests/integration/`; temporary bundle when needed | broader chain or Agent behavior |
| `deterministic_e2e` | JS-led full-chain test | `deterministic_contract` | `tests/e2e/`; temporary bundle | simulated actions as real Agent behavior |
| `agent_flow_e2e` | coding-Agent-executed Markdown | `deterministic_contract | agent_behavior` | `experiments_playbook/`; real disposable bundle | fixture facts as Agent behavior |

A deterministic assertion inside an `agent_flow_e2e` remains a deterministic proof subject. It does not become Agent-behavior proof merely because a coding Agent ran the playbook. Conversely, a real disposable bundle does not create another class; it is execution context.

Classification uses precedence rather than directory-first guessing:

```text
coding Agent executes Markdown playbook?       -> agent_flow_e2e
else workflow-scale multi-checkpoint JS chain? -> deterministic_e2e
else production CLI/subprocess or owned surfaces? -> integration
else focused in-process contract?               -> unit
```

This order resolves three common collisions. A fixture-backed Markdown playbook remains `agent_flow_e2e`, not integration. A JS full-chain test remains `deterministic_e2e` even though it also uses CLIs and filesystem I/O. A focused in-process helper/schema test may use test-owned temporary fixture files without becoming integration. When a parser can be tested in-process but its CLI wrapper also needs filesystem/asset checks, those are separate unit and integration claims rather than one ambiguously classified file.

### Decision 2: Use a closed test-class state model

Each plan declares exactly all four canonical test classes, but claims belong only to selected classes:

```text
selected       -> one or more claims required
not_applicable -> zero claims, rationale required
```

This deliberately avoids a claim-level status field and a `deferred` escape hatch. A claim is an in-scope proof obligation and therefore must route to a selected test class. Future live-production observation belongs in the scope of a future change rather than as an empty pseudo-method carried through every plan.

For this change:

- `unit`: selected;
- `integration`: selected;
- `deterministic_e2e`: selected;
- `agent_flow_e2e`: selected.

### Decision 3: Define `verification-routing/v1` as a strict Zod contract

Add `openspec/governance/verification-routing-contract.mjs`. It owns parsing and semantic validation; the CLI imports it rather than implementing a second interpretation.

Base objects use `.strict()`. Cross-field rules use `.superRefine()`:

```yaml
schema_version: verification-routing/v1
change: <kebab-case-change-name>
test_classes:
  unit:
    status: selected | not_applicable
    rationale: <trimmed non-empty text>
  integration:
    status: selected | not_applicable
    rationale: <trimmed non-empty text>
  deterministic_e2e:
    status: selected | not_applicable
    rationale: <trimmed non-empty text>
  agent_flow_e2e:
    status: selected | not_applicable
    rationale: <trimmed non-empty text>
claims:
  - id: <unique kebab-case id>
    statement: <trimmed non-empty proof obligation>
    test_class: unit | integration | deterministic_e2e | agent_flow_e2e
    proof_subject: deterministic_contract | agent_behavior
    asset:
      kind: node_test | markdown_playbook
      path: <repo-relative path>
    execution_profile:
      fixture: none | setup_only | fixture_backed
      subject_execution: none | simulated_agent_actions | real_agent | real_subagent
      runtime: none | temporary_bundle | real_disposable_bundle
      external_calls: none | real
      verdict_judge: deterministic | real_human | ai_judge
    verdict_authority: node_test_exit | trace_jsonl
```

Exact class tuples:

| Test class | Control surface | Allowed proof subject | Asset kind | Verdict |
| --- | --- | --- | --- | --- |
| `unit` | JS-led | `deterministic_contract` | `node_test` | `node_test_exit` |
| `integration` | JS-led | `deterministic_contract` | `node_test` | `node_test_exit` |
| `deterministic_e2e` | JS-led full chain | `deterministic_contract` | `node_test` | `node_test_exit` |
| `agent_flow_e2e` | coding-Agent-executed Markdown | `deterministic_contract | agent_behavior` | `markdown_playbook` | `trace_jsonl` |

Additional invariants:

- `change` equals the `--change` argument and selected directory basename.
- Selected test classes have at least one claim; `not_applicable` classes have none.
- Claim ids are unique. Multiple claims may share one asset only when their complete route identity (`test_class`, `proof_subject`, `asset.kind`, `execution_profile`, and verdict authority) is identical; one file cannot be declared under conflicting classes or reality profiles.
- Asset kind is physical, not taxonomic: JS classes use `node_test`; `agent_flow_e2e` uses `markdown_playbook`. The schema does not reintroduce `regression` or `controlled` as asset kinds.
- `subject_execution` records how subject-Agent semantic work contributes to the verdict; it never records the coding-Agent playbook runner.
- `agent_flow_e2e` always requires `runtime: real_disposable_bundle`. A deterministic-contract claim MAY record `subject_execution: none | real_agent | real_subagent`, but its PASS remains limited to the deterministic contract. `proof_subject: agent_behavior` requires `subject_execution: real_agent | real_subagent` and `fixture: none | setup_only`. With `setup_only`, fixtures may establish preconditions but cannot produce any subject-Agent-attributed pass fact.
- `subject_execution: simulated_agent_actions` is allowed only in `deterministic_e2e`, where the JS driver asserts Engine consequences rather than Agent intelligence.
- `execution_profile.runtime` records active run-bundle context, not arbitrary filesystem use. A temporary fixture repository used by the governance checker therefore has `runtime: none`; the rerun integration/full-chain claims use `temporary_bundle`; playbooks use `real_disposable_bundle`.
- `verdict_judge` records semantic-judge provenance independently from the coding-Agent runner and subject execution. Current `exph_*` 901-949 cases map to `real_human`; 950-999 duals map to `ai_judge`; neither creates a fifth test class.
- A selected `verdict_judge: real_human` claim is acceptance-critical manual work and remains incomplete until a real human records the verdict through the case's accepted evidence surface. Plan/asset validation, `NOT RUN`, an AI-judge dual, or a coding-Agent summary cannot complete it.
- `unit` paths stay outside `tests/integration/` and `tests/e2e/`; `integration` paths are under `tests/integration/`; `deterministic_e2e` paths are under `tests/e2e/`. Behavior selects the class first; the path then conforms to it.
- A live-production observation is outside this v1 contract. `dpt_rb_*`, runtime selectors, and runtime-fact verdicts are not accepted stand-ins for a test class.
- Unknown/result-bearing keys fail because all plan objects are strict. The checker does not maintain a second blacklist as semantic truth.

The schema can express current proof shapes without adding another class:

| Proof shape | `test_class` | `proof_subject` | `subject_execution` | Runtime | Judge |
| --- | --- | --- | --- | --- | --- |
| focused in-process contract | `unit` | `deterministic_contract` | `none` | `none` | `deterministic` |
| CLI over fixture repository | `integration` | `deterministic_contract` | `none` | `none` | `deterministic` |
| CLI over temporary run bundle | `integration` | `deterministic_contract` | `none` | `temporary_bundle` | `deterministic` |
| JS full chain simulating Agent actions | `deterministic_e2e` | `deterministic_contract` | `simulated_agent_actions` | `temporary_bundle` | `deterministic` |
| fixture-backed standard Markdown playbook | `agent_flow_e2e` | `deterministic_contract` | `none` | `real_disposable_bundle` | `deterministic` |
| real subject-Agent playbook with trace checks | `agent_flow_e2e` | `agent_behavior` | `real_agent` | `real_disposable_bundle` | `deterministic` |
| real subject-Agent plus real-human review | `agent_flow_e2e` | `agent_behavior` | `real_agent` | `real_disposable_bundle` | `real_human` |
| real subject-Agent plus AI-judge dual | `agent_flow_e2e` | `agent_behavior` | `real_agent` | `real_disposable_bundle` | `ai_judge` |

The last two rows differ only in judge provenance, which is intentional: test control surface and proof subject are the same, while evidence interpretation is not interchangeable.

### Decision 4: One read-only checker with plan and assets modes

`openspec/governance/check-verification-routing.mjs` uses `yaml`, the Zod contract, and Node built-ins.

`--mode plan` checks:

- invocation and safe kebab-case change identity;
- plan existence and parseability;
- exact schema and closed four-test-class state model;
- claim uniqueness and exact class/profile tuples;
- lexical repository-relative path shape and ownership boundary;
- one nearest correction for each independent root cause.

Lexical path validation rejects absolute paths, backslashes, empty segments, `.`/`..`, and normalized escape. It does not require planned assets to exist.

`--mode assets` repeats plan mode and then checks:

- repository assets exist as regular files;
- `realpath` remains inside the repository and required ownership root;
- unit/integration/deterministic-E2E assets are `tests/**/*.test.mjs` at their declared class boundary;
- `agent_flow_e2e` assets are `experiments_playbook/**/case-*.md`;
- `agent_flow_e2e` assets pass `DPT_FRAMEWORK/cli/validate-playbook.mjs`;
- filename stem matches frontmatter `case`;
- the case id/stem is globally unique across runnable playbooks;
- the exact path has one active entry in `experiments_playbook/RUN_EXPS.md`.

The checker does not inspect prose to decide whether an Agent truly acted. Plan declarations, frontmatter, file existence, and manifest registration are route facts; actual step execution and trace are native evidence.

Primary failure output follows one shape:

```text
claim: <id or plan>
missing_fact: <direct violated invariant>
write_to: <plan field or declared asset/manifest>
rerun: node openspec/governance/check-verification-routing.mjs --change <name> --mode <same-mode>
```

### Decision 5: Treat lifecycle integration honestly

`verification-plan.yaml` is a repo-specific planning artifact, not an artifact declared by the current `spec-driven` OpenSpec schema. Therefore:

- `openspec status` may still report planning complete without understanding it;
- `openspec validate` validates proposal/design/spec/tasks, not this custom plan;
- `openspec/config.yaml` proposal/task rules tell future Agents to create and check it;
- every future change's apply task list places plan-mode checking before target edits;
- every archive closure places asset-mode checking beside the existing governance checks.

This bootstrap change necessarily implements the parser/checker before it can dogfood plan mode. That exception is narrow: parser, checker, and their focused `unit`/`integration` assets land first; plan mode then passes before the stale VER registry descriptions, rerun proof, `tests/e2e/`, playbook, config, or knowledge-surface targets change. This is sufficient demand-side wiring for the repo's Agent-driven OpenSpec process, but it is not described as a native OpenSpec CLI hook.

### Decision 6: Add `tests/e2e/` as the deterministic-E2E boundary

`tests/e2e/` exists for long deterministic chains where running isolated helpers is too narrow and running an `agent_flow_e2e` playbook is too expensive or infrequent. It remains ordinary `node:test` execution and is included by canonical `npm test` discovery.

The driver models Markdown/Agent behavior only as controlled input mutations:

```text
JS driver writes an Agent-owned MD/YAML/artifact input
  -> real CLI/schema/gate reads it
  -> real transition/status/work-unit/receipt/trace path runs
  -> node:test asserts structured output, authority bytes and trace
  -> on failure, repair the Agent-owned input and rerun the same checkpoint
```

Allowed simulated actions include writing or repairing seed-topic direction sections, phase artifacts, fixture-labeled human answers/profile inputs, and other non-Engine surfaces assigned by the real Markdown flow. A fixture may also construct actor-produced candidate output, `result.json`, cache leaves, and runtime-receipt events when a work-unit path is under test; those files are labeled fixture inputs and remain non-authoritative until the real submit CLI accepts their exact bindings. Forbidden shortcuts include hand-writing `rb_status.json` transitions, accepted/submitted index or status, declaration ledger rows, gate attempts, transition witnesses, trace verdicts, or any other Engine-owned success authority. The suite does not claim real user or Agent participation.

The initial `tests/e2e/rerun-round-continuity.test.mjs` first creates a production-shaped bundle through `instantiate-run-bundle.mjs`, then runs the real predecessor gates/handoffs/status synchronization needed to establish a legal baseline HITL2 window. Only then does it cover HITL2 -> phase-rerun -> seed-topics -> wave0 -> wave1 -> wave2 -> HITL2. Direct `writeGateAttempt()` setup is forbidden because it would hide upstream chain drift.

The suite uses a two-level shape to keep cost controlled:

- one baseline builder produces an immutable legal pre-rerun bundle through real CLI boundaries once per test run, then stores a byte snapshot outside the active bundle path;
- the happy case continues through the complete rerun chain;
- before each serialized scenario, the harness restores that snapshot to the same original active bundle path, injects one independent non-Engine variation, and runs the affected real suffix without sharing prior scenario mutations.

The baseline is not a committed fixture or cross-run cache. Its trace, status, work-unit, ledger, gate, beacon, and absolute bundle-root binding facts are generated afresh by the production paths in the same test process. Restore SHALL reuse the original active bundle path: copying the snapshot to another bundle path would invalidate absolute work-unit beacon bindings and is therefore forbidden. Same-path restore only amortizes repeated predecessor work after that proof has run; it does not rebind or manufacture Engine authority.

The scenario matrix is:

| Scenario class | Required observation |
| --- | --- |
| baseline + happy rerun chain | real predecessor and rerun gates/transitions/status synchronization reach the expected next HITL2 window |
| missing/malformed profile or required phase artifact | owning checkpoint fails closed, latest legal state is unchanged, root cause names the repair boundary |
| stale/invalid direction at Wave2 consumer | real resolver consumer does not activate stale/invalid `action:add` semantics |
| future/crash-window direction at Wave2 consumer | real resolver consumer preserves accepted future-direction behavior; fixture then simulates Markdown recovery by bringing profile count into match without rewriting direction |
| current/legacy work-unit rows | candidate actor files pass through real submit; real `--eligible-rows` returns only accepted current rows and reports legacy exclusion warnings |
| partial phase artifact or failed gate | downstream transitions do not run; repair followed by the same gate can continue |
| malformed structured authority | CLI fails explicitly and does not replace or normalize Engine-owned truth through test code |

The suite SHALL keep the baseline, immutable byte snapshot, and same-path restored scenario state under `os.tmpdir()`, use `spawnSync` argument arrays rather than shell command interpolation, serialize scenarios that share the restored path, record pre/post authority snapshots around expected failures, and clean up in `after()` while preserving enough assertion context in the test output. A helper under `tests/e2e/helpers/` may wrap repeated CLI invocation, candidate fixture creation, byte snapshots, same-path restore, authority snapshots, and legal baseline construction; it cannot rewrite absolute bindings, calculate a gate/transition outcome, append a verdict trace, or become an alternate Engine implementation.

### Decision 7: Route the rerun proof set without inventing an Engine contract

This change owns seven selected claims:

| Claim | Test class | Proof subject | Asset | Proof boundary |
| --- | --- | --- | --- | --- |
| routing contract schema | `unit` | `deterministic_contract` | `tests/governance/verification-routing-contract.test.mjs` | direct strict parser behavior; no subprocess or repository asset lookup |
| routing checker CLI/assets | `integration` | `deterministic_contract` | `tests/integration/governance/check-verification-routing.test.mjs` | real checker process, filesystem/path and asset-registration behavior |
| direction resolver | `unit` | `deterministic_contract` | existing focused resolver test | deterministic helper only |
| current-round CLI filtering | `integration` | `deterministic_contract` | `tests/integration/cli/rerun-round-continuity.test.mjs` | actual `operate-work-unit inspect --eligible-rows` JSON/exit |
| knowledge-surface convergence | `integration` | `deterministic_contract` | `tests/integration/md/verification-routing-knowledge-surfaces.test.mjs` | static cross-document contract for canonical identifiers, owned pointers, and retired competing taxonomy at high-frequency entry surfaces |
| rerun deterministic full chain | `deterministic_e2e` | `deterministic_contract` | `tests/e2e/rerun-round-continuity.test.mjs` | JS-simulated Agent-owned inputs through real CLI/gate/transition/status/trace paths |
| Agent direction/recovery | `agent_flow_e2e` | `agent_behavior` | `experiments_playbook/exp_wfn_rerun/case-318-heavy-rerun-direction-recovery.md` | real Agent action over fresh disposable bundle; trace verdict |

`case-318` is the first currently unoccupied global case identity after existing current files. It remains in the existing `exp_wfn_rerun` family. It is `heavy` because the proof depends on real Agent semantic action, consistent with `guidelines/command-experiments.md`; external WebSearch/WebFetch calls are not required and the Reality Distance Ledger records `external_calls: none`. Apply also repairs the narrower stale cost descriptions in `experiments_playbook/README.md` and `experiments_playbook/RUN_EXPS.md`, which currently describe `heavy` as external-call/subagent work only.

The `agent_flow_e2e` case declares `fixture: setup_only`, `subject_execution: real_agent`, `runtime: real_disposable_bundle`, and `verdict_judge: deterministic`. It may create a legal pre-interruption fixture through accepted setup/CLI paths. The fixture boundary ends before the subject Agent produces the direction and recovery action; those pass facts cannot be written by inline JS or shell. If a real subject-Agent execution surface is unavailable, the case is NOT RUN and the `proof_subject: agent_behavior` claim remains incomplete. A clean PASS deletes the bundle; FAIL or health issues preserve it for diagnosis.

### Decision 8: Defer backlog per-row projection authority

The backlog scenario asks for a deterministic check that every current-round eligible work id appears in a projection entry or explicit no-projection disposition. Repository inspection found no accepted Engine/CLI that owns this comparison. Existing return-map checks validate structure and reference quality, not eligible-row-to-projection completeness.

Adding this behavior would change `DPT_FRAMEWORK/`, require a new accepted contract/caller/gate decision, and trigger version review. Reimplementing it inside a test would violate One Truth Path. Therefore this change records the scenario as deferred behavior work and proves only the existing `--eligible-rows` contract.

### Decision 9: One canonical taxonomy, short knowledge pointers

After archive, the accepted `openspec/specs/verification-routing/spec.md` is the only taxonomy/route authority. Other surfaces retain only owned facts:

| Surface | Owned fact after apply |
| --- | --- |
| `openspec/config.yaml` | artifact-generation/task discipline and asset ownership pointers |
| `openspec/governance/req-registry.yaml` | concise requirement registry summaries using canonical identifiers |
| `AGENTS.md`, `CLAUDE.md` | concise hard rule for repository asset placement |
| `guidelines/project-charter.md` | directory/authority responsibility rows |
| root/test/experiment README files | local execution and navigation facts |
| `guidelines/command-experiments.md` | `agent_flow_e2e` playbook design/navigation pointer |

Ordinal "layer" identifiers are retired. Local documents may still use ordinary prose such as "test scope" where it is not a competing method name.

### Decision 10: Converge accepted specs with the smallest semantic delta

A terminology audit scanned all 74 current main specs under `openspec/specs/` for E2E, controlled/Agent-driven experiments, regression, unit/integration, disposable-bundle, and production-bundle language. Hits were classified by whether they teach test routing, describe an individual playbook, or merely use "end-to-end" for a business chain.

Only one accepted requirement needs semantic delta:

| Requirement | Conflict | Delta |
| --- | --- | --- |
| WDC-005 `Test and experiment boundary` | teaches regression as only `unit + integration`, omitting `deterministic_e2e` | replace with all four canonical classes and owned directories |

AGT-010 does not need a delta. Its optional-heavy rule belongs to handoff witnessing and remains intact. This change is allowed to make a different real-Agent case acceptance-critical because its own verification plan explicitly selects an `agent_behavior` claim; that local decision neither reclassifies standard/heavy playbooks nor changes AGT-010 archive semantics. Other accepted phrases such as "controlled E2E", "Agent-driven E2E", "standard E2E", and queue/wave behavior "end-to-end" remain valid descriptive language. They do not ask an Agent to choose a competing route and are mapped by the canonical verification-routing spec. Rewriting them mechanically would create churn without reducing ambiguity. Specific case names remain implementation mappings in the plan/design/tasks and experiment navigation; capability specs use proof roles so renumbering does not require a semantic spec change.

The same audit scanned the high-frequency project entry and governance surfaces. `openspec/config.yaml`, `AGENTS.md`, and `CLAUDE.md` currently teach the obsolete unit+integration / controlled / real-environment layer model; `openspec/governance/req-registry.yaml` still summarizes VER as three methods and a proposed fourth layer; `experiments_playbook/README.md` repeats `tests/` as only unit+integration and narrows `heavy` to external-call work; `experiments_playbook/RUN_EXPS.md` repeats the same narrow cost rule; and `tests/README.md` does not expose `tests/e2e/`. These are apply targets because they directly guide future LMs. Ordinary "end-to-end" phrases in capability specs remain untouched where they describe behavior rather than classify a test.

## Apply Target Manifest

| Action | Surface | Control impact |
| --- | --- | --- |
| Add | `openspec/governance/verification-routing-contract.mjs` | one direct route schema/parser |
| Add | `openspec/governance/check-verification-routing.mjs` | one read-only route checker |
| Add | `tests/governance/verification-routing-contract.test.mjs` | focused direct-parser unit coverage |
| Add | `tests/integration/governance/check-verification-routing.test.mjs` | real checker CLI/filesystem integration coverage |
| Add | `tests/integration/md/verification-routing-knowledge-surfaces.test.mjs` | narrow static guard against competing taxonomy at high-frequency guidance surfaces |
| Add | `tests/e2e/README.md` | deterministic-E2E class, simulation boundary and execution contract |
| Add | `tests/e2e/rerun-round-continuity.test.mjs` | deterministic rerun full-chain and fault matrix |
| Add | `experiments_playbook/exp_wfn_rerun/case-318-heavy-rerun-direction-recovery.md` | one `agent_flow_e2e` real subject-Agent proof |
| Add | change-local `implementation-evidence.md` | apply report only, not verdict authority |
| Modify | `tests/integration/cli/rerun-round-continuity.test.mjs` | replace test-local filtering with real CLI consumption |
| Modify | `experiments_playbook/RUN_EXPS.md` | exact case-318 registration |
| Modify | `openspec/config.yaml` | future plan/task discipline and short taxonomy pointer |
| Modify | `openspec/governance/req-registry.yaml` | replace stale three-method/fourth-layer VER summaries with canonical `test_class` wording |
| Move | `tests/governance/check-project.test.mjs` to `tests/integration/governance/check-project.test.mjs` | align existing governance CLI coverage with the integration class |
| Move | `tests/helpers/run-gate-with-monitor.test.mjs` and `tests/schema/verify-bundle-health.test.mjs` to `tests/integration/experiments_env/` | align public experiment-helper subprocess/runtime-bundle coverage with the integration class |
| Split | CLI scenario from `tests/engine/queue-manager-receipts-cli-render.test.mjs` into `tests/integration/cli/operate-queue-receipts-render.test.mjs` | keep focused queue-manager imports unit-class while routing the production CLI path to integration |
| Split | production-CLI scenarios from `tests/schema/research-styles-computation.test.mjs` into `tests/integration/cli/apply-research-style.test.mjs` | retain in-process schema/style computations as unit-class and route bundle/CLI behavior to integration |
| Modify through delta sync | `openspec/specs/workflow-directory-contract/spec.md` | align WDC-005 with the canonical four-class model |
| Modify | `AGENTS.md`, `CLAUDE.md`, README/guideline surfaces named in tasks | remove duplicate taxonomy prose; retain owned facts/pointers |
| Modify after native proof | `_backlog/plans/tests-e2e-layer.md`, `openspec/changes/seed-backfill-round-continuity/tasks.md` | historical/source reconciliation only |
| Delete/avoid | repo-top-level `tests_e2e/`, mixed runner scripts, duplicate taxonomy prose, test-local Engine filtering, direct submitted-state/ledger writes, or Engine-owned authority fabrication | net control simplification |

No `DPT_FRAMEWORK/` or runtime bundle surface is modified.

## Complexity Burden Of Proof

1. **Which failure is newly caught?** Missing/misrouted/unregistered proof assets and fixture-as-Agent route declarations, including the observed checked-but-absent rerun case.
2. **Which Source of Record is read?** `verification-plan.yaml` for route intent; repository paths and `RUN_EXPS.md` for selected asset registration. Native verdict sources remain separate.
3. **Why not reuse current governance checks?** Existing checks own requirement IDs and spec structure, not claim-to-test-class routing. Combining them would create unrelated authorities in one checker.
4. **What is removed or avoided?** A parallel taxonomy, mixed runner, duplicate taxonomy definitions, manual asset-memory rule, test-local eligible-row filtering, and reliance on expensive playbooks for deterministic long-chain feedback.
5. **What is the one next action?** Repair the named plan field/asset/manifest entry and rerun the same checker mode.
6. **What proves the control does not misblock?** Focused valid/invalid/path/read-only tests for the shared Zod parser and CLI.

## Risks / Trade-offs

- **Plan becomes outcome authority** -> strict schema contains no result fields; checker reports route validity only.
- **Checker becomes a runner** -> it may invoke only the canonical frontmatter validator for static asset validation, never a playbook/test/Agent execution.
- **Not-applicable hides unfinished evidence** -> selected test classes require claims, not-applicable classes forbid them, and v1 has no deferred status.
- **Plan lies about Agent execution** -> asset mode cannot prove semantic action; native trace execution remains mandatory and task closure stays incomplete on NOT RUN.
- **Custom artifact looks natively enforced** -> design/spec explicitly distinguish repo discipline from OpenSpec schema enforcement.
- **Scope expands into missing per-row behavior** -> scenario is explicitly deferred rather than implemented in a test or hidden helper.
- **E2E driver becomes a fake Engine** -> it may mutate only Agent-owned inputs; every deterministic consequence and authority mutation must come from real production boundaries, with no second transition/gate/receipt implementation.
- **Long-chain suite becomes slow and brittle** -> keep external calls and real Agent work out of `tests/e2e/`, reuse focused tests for local contracts, restore one runtime-generated baseline only at its original path, assert only independent chain/failure facts, and keep the focused file within a 60-second local timeout budget.
- **Long-chain proof exposes an existing framework bug** -> do not weaken the assertion or patch framework behavior outside the approved manifest; record the failing native boundary and return to explore/update the active change before expanding implementation scope or version impact.

## Migration Plan

1. At apply entry, create `implementation-evidence.md`, audit but do not yet edit the stale VER registry summaries, implement the shared Zod contract/checker, and run plan mode before non-bootstrap target edits.
2. Replace rerun test-local filtering with actual CLI consumption; retain focused resolver coverage.
3. Add `tests/e2e/README.md` and the deterministic rerun full-chain/fault matrix, then run it through canonical `npm test` discovery.
4. Add and execute case-318 with exact runner registration and native trace verdict.
5. Converge knowledge surfaces to canonical identifiers, owned facts, and pointers.
6. Only after native proof, annotate the backlog source and reconcile the previously checked missing-playbook task.
7. Run asset mode, focused/full `node_test` execution, playbook validation/execution, OpenSpec strict validation, and both existing governance checks.

Rollback before archive is a repository-local revert of governance, proof, and documentation changes. There is no runtime state migration, framework version rollback, or production-bundle recovery.

## Open Questions

None. Per-row projection authority is a consciously deferred behavior change, not unresolved scope inside this change.
