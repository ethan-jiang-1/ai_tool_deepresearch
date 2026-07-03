# Plan: Self-Documenting Phase + Relay Role Nodes

> Status: ready for OpenSpec tasking
> Scope: documentation and contract alignment only
> Intended change: `openspec/changes/harden-relay-pipeline/`
> Replaces: `_backlog/plans/self-documenting-phase-nodes.md`

## 0. Execution Intent

This plan defines a final cleanup for `harden-relay-pipeline`: make workflow node files self-identifying at first load.

The change has two node classes, each with a fixed first-load structure:

1. **Lifecycle phase node**: every file listed in `DPT_FRAMEWORK/workflows/manifest.json#/phases[]` gets `## 0. Execution Brief`.
2. **Relay role spec node**: the three subagent role guidance files are renamed to role-key-first filenames and get `## 0. Role Brief` plus one shared role-spec body structure.

The goal is not to change runtime behavior. The goal is to remove a recurrent Agent confusion point: when a coding agent cold-loads a node, it should immediately know whether it is executing a lifecycle phase or reading role guidance that a Phase Agent uses to construct relay `task.md`.

This work must be implemented through `openspec/changes/harden-relay-pipeline` as a final cleanup task before archive. The next implementation step is not "edit framework files from this plan"; it is:

1. update the active change artifacts so the new cleanup is part of the OpenSpec change contract;
2. add a new task section to `openspec/changes/harden-relay-pipeline/tasks.md`;
3. only then modify framework MD, validators, tests, and current references while marking those new tasks complete.

Accepted specs under `openspec/specs/` must be updated through the archive/sync path, not by ad hoc direct edits during this cleanup.

## 1. Decisions

### D1. Use Two Node Classes

| Class | Source of truth | Entry structure | Runtime identity |
|---|---|---|---|
| Lifecycle phase node | `manifest.phases[].node` | `## 0. Execution Brief` | Phase Agent executes this node and reaches its gate/terminal condition |
| Relay role spec node | active OpenSpec role-spec requirements | `## 0. Role Brief` + fixed role body | Phase Agent reads this guidance to construct relay slot `task.md`; Sub-agent does not directly lifecycle-load it |

Do not infer lifecycle status from filename, directory, `stop`, `gate`, or `node_type` alone. Manifest membership remains the lifecycle source of truth.

Validator inventory, tests, and phase `suggested_context` are enforcement/reference surfaces for relay role specs, not independent sources of truth.

### D2. Add `Execution Brief` To All 11 Lifecycle Phase Nodes

Add `## 0. Execution Brief` to every lifecycle phase listed in the manifest, not only the four currently most confusing files.

The full lifecycle inventory is:

| Phase key | Node |
|---|---|
| instantiation | `phases/phase-instantiation.md` |
| hitl1 | `phases/phase-hitl1.md` |
| setup | `phases/phase-setup.md` |
| seed-topics | `phases/phase-seed-topics.md` |
| wave0 | `phases/phase-wave0.md` |
| wave1 | `phases/phase-wave1.md` |
| wave2 | `phases/phase-wave2.md` |
| hitl2 | `phases/phase-hitl2.md` |
| readiness | `phases/phase-readiness.md` |
| rerun | `phases/phase-rerun.md` |
| final | `phases/phase-final.md` |

Rationale: once this becomes a convention, every cold-loaded phase teaches the same mental model. Mixed coverage would train the Agent that the brief is optional and would preserve the ambiguity this cleanup is meant to remove.

### D3. Keep The Existing 9-Section Phase Body

Do not rewrite phase nodes into a new structure. Insert `## 0. Execution Brief` after the H1 and before `## 1. Stage Goal`.

Every phase must retain the existing body sections:

1. `## 1. Stage Goal`
2. `## 2. Required Inputs`
3. `## 3. Allowed Actions`
4. `## 4. Expected Artifacts`
5. `## 5. Gate Command`
6. `## 6. On Gate Pass`
7. `## 7. On Gate Fail`
8. `## 8. Stop Behavior`
9. `## 9. Anti-Cheating Rules`

`Execution Brief` is a first-load orientation layer, not a replacement for the detailed phase body.

### D4. Use Fixed `Execution Brief` Fields

Each lifecycle phase brief must contain these five fields, in this order and with these labels:

```markdown
## 0. Execution Brief

- **Objective:** ...
- **Start here:** ...
- **Path to pass:** ...
- **Completion check:** ...
- **Failure posture:** ...
```

Field meaning:

| Field | Required content |
|---|---|
| `Objective` | One sentence describing what this phase must accomplish |
| `Start here` | The first state/file/command/context the Agent should read |
| `Path to pass` | The shortest high-level path through the phase body to gate pass or terminal completion |
| `Completion check` | The exact gate command, user checkpoint, or terminal artifact condition |
| `Failure posture` | How to repair, retry, degrade, stop, or ask the user according to this node's stop behavior |

Use "Completion check" even for `gate: null` final; for final, the check is terminal delivery evidence in `final/`, not a gate CLI.

### D5. Rename The Three Relay Role Specs To Role-Key-First Filenames

Rename only the three relay role specs:

| Old path | New path | Role key |
|---|---|---|
| `phases/phase-wave0-subagent.md` | `phases/subagent-dpt-source-intake.md` | `dpt-source-intake` |
| `phases/phase-wave1-subagent.md` | `phases/subagent-dpt-evidence-extractor.md` | `dpt-evidence-extractor` |
| `phases/phase-wave2-subagent.md` | `phases/subagent-dpt-topic-scout.md` | `dpt-topic-scout` |

Rationale:

- `phase-*` implies lifecycle phase execution, which these files do not do.
- Role-key-first filenames align with `targets.delegates.role_key`.
- The wave number is already represented by the consuming phase and relay slot wave. The role key is the more stable identity.

The frontmatter `id` must match the new basename:

- `subagent-dpt-source-intake`
- `subagent-dpt-evidence-extractor`
- `subagent-dpt-topic-scout`

These files must not enter `manifest.phases[]` or `manifest.shared[]`. Their contract inventory is defined by active OpenSpec role-spec requirements, enforced by validator/tests, and referenced from phase `suggested_context`.

The H1 must not start with `# Phase:`. Use these exact role-oriented H1s:

- `# Relay Role: dpt-source-intake — Foundation Reference Intake`
- `# Relay Role: dpt-evidence-extractor — Topic-Specific Deepening`
- `# Relay Role: dpt-topic-scout — Gap-Fill Search`

### D6. Use A Single Machine-Readable Role Key Source Chain

Each relay role spec must declare the same role key in three places:

| Source | Required value |
|---|---|
| Filename | `subagent-<role-key>.md`, e.g. `subagent-dpt-evidence-extractor.md` |
| Frontmatter | `role: <role-key>` |
| `Role Brief` | `- **Role key:** <role-key>` |

The frontmatter `role` field must be present on all three role specs. This removes the current inconsistency where Wave2 declares `role: dpt-topic-scout` but Wave0/Wave1 do not. Validator/tests must assert filename, frontmatter `role`, and `Role Brief` agree.

Required role-spec frontmatter shape:

```yaml
node_type: shared
id: subagent-dpt-...
shared_scope: subagent-protocol
role: dpt-...
authority: guidance-only
execution_contract:
  surface: relay-subagent-role
  search_policy: subagent_performs_search
  loaded_by: phase-agent
  delivered_via: relay_task_md
requires:
  - shared/shared-subagent-protocol
  - shared/shared-schemas
suggested_context: []
```

Do not add `stop`, `gate`, or lifecycle `phase` frontmatter to role specs.

`node_type: shared` is a loader/dependency classification for these guidance files, not permission to add them to `manifest.shared[]` or to treat them as globally loaded shared guidance.

### D7. Use Fixed `Role Brief` Fields

Each relay role spec must contain these six fields, in this order and with these labels:

```markdown
## 0. Role Brief

- **Role key:** ...
- **Used by:** ...
- **Receives:** ...
- **Produces:** ...
- **Boundary:** ...
- **Handoff:** ...
```

Field meaning:

| Field | Required content |
|---|---|
| `Role key` | Exact delegated role key, e.g. `dpt-evidence-extractor` |
| `Used by` | Which lifecycle phase loads this spec as role guidance |
| `Receives` | What the spawned Sub-agent actually receives: slot-local `task.md`, `result.schema.json`, runtime receipt, and bounded files |
| `Produces` | Role-specific output files/result shape |
| `Boundary` | What this role must not do: no gate, no queue mutation, no WorkflowState mutation, no phase judgment outside its role |
| `Handoff` | How the Phase Agent collects result: runtime receipt -> `commitSlotResult()` -> `operate-queue complete --result` with `slot_result_ref` |

### D8. Use A Fixed Relay Role Spec Body Structure

Do not stop at adding `Role Brief`. All three relay role specs must follow the same role-oriented body structure after the H1:

1. `## 0. Role Brief`
2. `## Purpose`
3. `## 1. Search Focus`
4. `## 2. Artifacts`
5. `## 3. Execution Within Relay Slot`
6. `## 4. Page Content Fetching`
7. `## 5. Anti-Cheating Rules`
8. `## 6. Relationship to Phase Agent`

Allowed local title refinements keep the same canonical stem:

- `## 1. Search Focus — Foundation Reference`
- `## 1. Search Focus — Topic-Specific Deep Evidence`
- `## 1. Search Focus — Gap-Fill Search`
- `## 2. Artifacts — ...`
- Role-specific suffixes such as `(Wave1-Specific)` are fine under `Anti-Cheating Rules`.

Role specs must not use lifecycle-phase section titles as their primary structure:

- Do not use `## 1. Stage Goal`.
- Do not use `## 5. Gate Command`.
- Do not use `## 8. Stop Behavior`.

Rationale: the user-facing distinction is not only "phase nodes have an execution brief; role specs have a role brief." It is "phase nodes and role specs have two different full body structures." Without this, Wave2 can remain phase-shaped even after the rename.

### D9. Wave2 Suggested Context Must Include Two Role Specs

`phase-wave2.md` must suggest both role specs:

```yaml
suggested_context:
  - phases/subagent-dpt-topic-scout
  - phases/subagent-dpt-evidence-extractor
```

Reason: Wave2's primary gap-fill/search role is `dpt-topic-scout`, but Wave2 backing supplementary tasks can still use `dpt-evidence-extractor`. The phase brief and body should make this explicit so the Agent does not "simplify" Wave2 into a single-role phase.

### D10. Do Not Blanket-Require `shared-gate-rules`

Do not add `shared/shared-gate-rules` to every phase `requires` as a blanket move.

First update `shared-gate-rules.md` because its current prose is stale in important places:

- Wave0 now uses `reference/_INDEX.md`, `reference/README.md`, `reference/00-shared-*.md`, and `artifacts/wave0/{topic}/source.yaml`, with relay provenance and count/cache/dedup checks.
- Wave1 now produces relay-backed `evidence-summary.md`, `question-list.md`, and `reference/{topic.slug}-*.md`; it is no longer a skeleton/foundation-placeholder phase.
- Readiness currently checks `reference/_INDEX.md`, not `reference/index.md`.
- Wave2 has conditional relay provenance for search/promoted cross references, not an unconditional whole-phase subagent hard gate.

Final dependency policy for this cleanup:

- Do not add any new `requires:` entry for `shared/shared-gate-rules`.
- Preserve existing `suggested_context` references where they already exist.
- Add the Wave2 role-spec `suggested_context` entries required by D9.
- Do not add new `suggested_context` references unless the active OpenSpec task explicitly records the phase-specific reason.

This keeps the cleanup focused: update stale gate prose and avoid a new mandatory context expansion.

## 2. Per-Node Brief Guidance

The implementation must write concise, phase-specific content. Do not copy one generic paragraph 11 times.

| Node | Objective guidance | Start-here guidance | Completion check |
|---|---|---|---|
| `phase-instantiation.md` | Create a real run bundle surface | user research question + instantiate CLI | `check-gate-instantiation-complete.mjs` |
| `phase-hitl1.md` | Collect and persist research profile/HITL1 decisions | `brief/hitl1.md`, original question, `rb_profile.yaml` | user response recorded + `hitl1-recorded` gate |
| `phase-setup.md` | Verify instantiated bundle structural consistency | control files, scaffold dirs, HITL1 marker | `check-gate-setup-ready.mjs` |
| `phase-seed-topics.md` | Materialize topic registry into search-relevant seed topic files | `rb_plan.md` topic_registry + queue CLI | `check-gate-seed-topics-ready.mjs` |
| `phase-wave0.md` | Run relay-backed foundation source intake | queue state + role `dpt-source-intake` | `check-gate-wave0-complete.mjs` |
| `phase-wave1.md` | Run relay-backed topic deepening | queue state + role `dpt-evidence-extractor` | `check-gate-wave1-complete.mjs` |
| `phase-wave2.md` | Produce cross-topic synthesis and relay-backed new search evidence when needed | Wave1 artifacts, finding-index, queue state, two role specs | `check-gate-wave2-complete.mjs` |
| `phase-hitl2.md` | Present final review decision brief and persist user decision | Wave artifacts + `brief/hitl2.md` | user decision recorded + `hitl2-recorded` gate |
| `phase-readiness.md` | Run final deterministic precheck | trace/profile/status/required artifacts | `check-gate-readiness-passed.mjs` |
| `phase-rerun.md` | Translate HITL2 rerun intent into incremental topic changes | HITL2 rationale + existing seed topics | `check-gate-rerun-ready.mjs` |
| `phase-final.md` | Deliver final report artifacts from verified bundle state | readiness-passed bundle state | at least one final artifact exists under `final/` |

## 3. Wave-Specific Body Cleanups

### Seed-Topics, Wave0, Wave1, Wave2: Explicit Transition Trigger

Queue-driven phases must make the transition from execution loop to closeout/gate unmissable.

Add a short subsection near the execution-loop/closeout boundary in:

- `phase-seed-topics.md`
- `phase-wave0.md`
- `phase-wave1.md`
- `phase-wave2.md`

Recommended wording shape:

```markdown
#### Transition trigger

When `operate-queue claim <bundle> ...` returns `item: null`, the active queue is drained for this phase. Move to the closeout/gate section; do not invent more work unless the gate inspect/advice or the phase refill loop asks for it.
```

Use the existing section numbering style of each file. Do not force identical heading levels if that would disrupt the current document.

### Wave1/Wave2: Make Enforcement Boundary Hard To Miss

Wave1 and Wave2 contain Agent-discipline conditions that gates do not fully validate. Convert those ordinary prose paragraphs into prominent blockquotes.

Required idea:

```markdown
> **ENFORCEMENT BOUNDARY — READ THIS**
>
> The following checks are Agent discipline unless this phase explicitly says a gate rule enforces them. Gate CLI validates structural/status/provenance checks; it does not replace content-level judgment. Before running the gate, self-check these items and record/repair gaps according to this phase.
```

Do not claim the gate enforces a content-quality rule unless the gate definition actually does.

### Wave2: Remove Context-Dependent "(不变)" References

Wave2 must define the taxonomy in place.

Finding types must be listed:

- `wave1_legacy_question`
- `cross_topic_resolution`
- `cross_topic_emergent_question`

Decision values must be listed:

- `use_existing_evidence`
- `exploit_search`
- `explore_search`
- `defer_hitl2`
- `requires_internal_data`
- `record_only`

Do not use wording like "三类 finding（不变）" or "6 种 decision（不变）" without listing the values.

### Wave2: Add Delegated Completion Path

Wave2 must describe the same delegated completion path as Wave0/Wave1 for tasks that use relay:

1. Phase Agent stages/spawns a relay Sub-agent.
2. Relay ingestion validates runtime receipt.
3. `commitSlotResult()` commits the slot `result.json`.
4. Phase Agent calls `operate-queue complete --result <result.json>` with `slot_result_ref`.

Also state the boundary: Wave2 synthesis/backfill main-agent work does not require relay, but any new search/evidence/reference output must be relay-backed.

## 4. Required Impact Investigation

Impact investigation has two parts:

1. **Rename residual scan**: find every current reference to old role-spec filenames.
2. **Non-rename required impact review**: update files whose content must change even if they do not contain old role-spec filenames.

Do both. A clean old-name `rg` is necessary but not sufficient.

### Rename Residual Scan

Before implementation, run a fresh current-contract residual scan:

```bash
rg "phase-wave0-subagent|phase-wave1-subagent|phase-wave2-subagent" \
  --glob '!_original_*' \
  --glob '!openspec/specs/**' \
  --glob '!openspec/changes/archive/**' \
  --glob '!_backlog/_done/**' \
  --glob '!_backlog/plans/self-documenting-phase-role-nodes-plan.md'
```

The implementation must inspect every hit. Do not perform blind search-and-replace across historical notes.

This plan file itself contains old names intentionally in the rename mapping and residual-scan command. Exclude this plan from the implementation residual scan, or classify it explicitly as `planning-note allowed`. Do not count this plan against `current-contract: 0`.

After the current-contract scan is clean, run a broader historical/accounting scan for reporting:

```bash
rg "phase-wave0-subagent|phase-wave1-subagent|phase-wave2-subagent" \
  --glob '!_original_*' \
  --glob '!_backlog/plans/self-documenting-phase-role-nodes-plan.md'
```

This broader scan may find `openspec/changes/archive/**`, `_backlog/_done/**`, and accepted specs awaiting archive/sync. Classify them; do not rewrite historical archives.

### Current-Contract Surfaces To Update From Rename Hits

These surfaces should have zero old role-spec filenames after implementation:

| Surface | Expected work |
|---|---|
| Framework phase MD | Update `suggested_context` and prose references in Wave0/Wave1/Wave2; Wave2 gets both role specs |
| Relay role specs | Rename files, update frontmatter IDs, add `Role Brief`, align Wave2 body with role-spec identity |
| Shared MD | Update `shared-schemas.md` old role-spec paths and structure references; update stale `shared-gate-rules.md` content |
| Validator | Update `consistency-validator.mjs` role inventory to new filenames; make missing role specs a reported issue if not already covered |
| Engine tests | Update workflow-chain header-injection fixture paths and comments |
| MD integration tests | Add manifest-driven `Execution Brief` test and role-spec `Role Brief` test |
| Active OpenSpec change | Update `harden-relay-pipeline` proposal/design/tasks and relevant active delta specs |
| Current backlog/guidelines | Update future-facing old paths in `_backlog/todos`, `_backlog/bugs`, and `guidelines/` |

Known current-contract files from the pre-plan investigation include:

- `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md`
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md`
- `DPT_FRAMEWORK/workflows/nodes/shared/shared-schemas.md`
- `DPT_FRAMEWORK/engine/consistency-validator.mjs`
- `tests/engine/workflow-chain.test.mjs`
- `openspec/changes/harden-relay-pipeline/proposal.md`
- `openspec/changes/harden-relay-pipeline/tasks.md`
- `openspec/changes/harden-relay-pipeline/specs/workflow-node-contract/spec.md`
- `openspec/changes/harden-relay-pipeline/specs/research-wave-phase-content/spec.md`
- `guidelines/agentic-subagent-mechanism.md`
- `_backlog/bugs/BUG-014-phase-agent-bypasses-subagent-relay-regression.md`
- `_backlog/todos/todo-coding-agent-setup-ux.md`
- `_backlog/todos/todo-evidence-extraction.md`
- `_backlog/todos/todo-evidence-quality.md`
- `_backlog/todos/todo-explore-exploit.md`

This list is not a substitute for the required `rg` scan.

### Non-Rename Required Impacts

The following files or surfaces must be reviewed even if the old-name scan does not find them:

| Surface | Why it matters |
|---|---|
| `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave2.md` frontmatter | Must add `suggested_context` with both `phases/subagent-dpt-topic-scout` and `phases/subagent-dpt-evidence-extractor`; the file may not currently contain old role-spec filenames |
| All 11 `manifest.phases[].node` files | Must add `## 0. Execution Brief` regardless of old-name references |
| `DPT_FRAMEWORK/workflows/nodes/shared/shared-gate-rules.md` | Must update stale gate summaries; old role-spec filenames are not the trigger |
| `DPT_FRAMEWORK/workflows/manifest.json` | Must remain unchanged for role specs; use it to drive lifecycle tests |
| `DPT_FRAMEWORK/workflows/transitions.chain.json` | No behavior change is expected; if a diff appears, the active OpenSpec task must justify why lifecycle routing changed |
| `tests/integration/md` | Must gain brief-structure tests even if no old filenames are present |
| Active OpenSpec delta inventory | Must include any new delta capability needed for shared node content, not only files that mention old role names |

### Accepted Specs

Accepted specs under `openspec/specs/` currently may contain old filenames. Because this cleanup belongs to active change `harden-relay-pipeline`, do not directly edit accepted specs during implementation unless the OpenSpec workflow explicitly calls for syncing.

Plan the accepted-spec update as archive/sync work:

- Active delta specs must describe the new role-spec names and brief requirements.
- Archive/sync should later update accepted main specs so the old names disappear from the accepted baseline.

Residual reporting must distinguish:

| Category | Rule |
|---|---|
| Current implementation/framework/tests/guidelines/current backlog | old names must be 0 |
| Active OpenSpec change | old names must be 0 |
| Accepted specs before archive/sync | allowed only as "pending archive/sync baseline" and explicitly documented |
| `openspec/changes/archive/**` | allowed as history |
| `_backlog/_done/**` | allowed as history |
| `_original_*` | do not read unless explicitly asked |

After archive/sync, `openspec/specs/**` should also have zero old role-spec filenames except explicitly historical references.

## 5. Implementation Shape For OpenSpec

The implementation must begin by extending the active OpenSpec change. Do not implement the rename/brief/test edits as loose workspace edits from this backlog plan alone.

Required OpenSpec artifact updates:

| Artifact | Required update |
|---|---|
| `openspec/changes/harden-relay-pipeline/tasks.md` | Add a new final task section for this cleanup; tasks start unchecked and are checked off as implementation lands |
| `openspec/changes/harden-relay-pipeline/proposal.md` | Update Workflow MD / validator impact to use the new role-spec filenames and the two-node-class framing |
| `openspec/changes/harden-relay-pipeline/design.md` | Add or revise the decision text so `Execution Brief` / `Role Brief` are first-load orientation structures, not runtime authority |
| `workflow-node-contract` delta | Specify manifest lifecycle phase `Execution Brief`, relay role spec `Role Brief`, role filename inventory, and non-manifest role boundary |
| `research-wave-phase-content` delta | Specify Wave0/Wave1/Wave2 role spec names, Wave2 two-role suggested context, Wave2 taxonomy wording, and delegated completion path |
| `shared-node-content` delta | Create if absent, or update if present, to cover `shared-schemas.md` role path references and `shared-gate-rules.md` stale summary updates |

OpenSpec artifact update order:

1. Add the new task section to `tasks.md` with unchecked items.
2. Run and record the impact investigation from §4 as task 7.1 before framework edits.
3. Update proposal/design/delta specs so the active change authorizes the cleanup.
4. Run `openspec validate harden-relay-pipeline --strict`.
5. Implement framework/shared/test/reference edits task by task.
6. Mark each new task complete immediately after its implementation and verification pass.

Add a final task section to `openspec/changes/harden-relay-pipeline/tasks.md`, for example:

```markdown
## 7. Self-Documenting Phase + Relay Role Nodes

- [ ] 7.1 Run and record rename residual scan + non-rename required impact review for this cleanup.
- [ ] 7.2 Update active delta specs/proposal/design to capture two node classes, fixed brief/body structures, shared-node-content impact, and non-authority boundaries.
- [ ] 7.3 Rename three relay role spec files to role-key-first filenames and update role frontmatter/briefs/body structure.
- [ ] 7.4 Add `## 0. Execution Brief` to all 11 manifest lifecycle phase nodes.
- [ ] 7.5 Apply Wave1/Wave2 boundary and Wave2 taxonomy/delegated-completion wording cleanup.
- [ ] 7.6 Update shared guidance (`shared-schemas.md`, `shared-gate-rules.md`) and all current references.
- [ ] 7.7 Update validators/tests for role inventory, manifest lifecycle brief coverage, role brief coverage, role body structure, and header-injection boundary.
- [ ] 7.8 Run workflow/package, phase-template, targeted node:test, OpenSpec, and categorized residual-reference validation.
- [ ] 7.9 Record residual old-name classification and accepted-spec archive/sync follow-up.
```

Keep the tasks as implementation tasks, not just documentation tasks, because the rename and test updates touch framework contracts. The tasks are the execution ledger for the actual change: after this backlog plan is accepted, future work should be driven from these OpenSpec tasks, not from this file directly.

## 6. Test Plan

### New/Adjusted Tests

1. Add or adjust a manifest-driven MD integration test:
   - Load `DPT_FRAMEWORK/workflows/manifest.json`.
   - Iterate every `manifest.phases[].node`.
   - Assert the file contains `## 0. Execution Brief`.
   - Assert the five labels exist exactly and in order: `Objective`, `Start here`, `Path to pass`, `Completion check`, `Failure posture`.
   - Assert `## 0. Execution Brief` appears after the H1 and before `## 1. Stage Goal`.
   - Assert role specs are not accidentally included through this manifest loop.
   - Assert every `manifest.phases[].node` file keeps the existing 9-section phase body.

2. Add or adjust a role-spec MD integration test:
   - Assert the three renamed files exist.
   - Assert each contains `## 0. Role Brief`.
   - Assert the six labels exist exactly and in order: `Role key`, `Used by`, `Receives`, `Produces`, `Boundary`, `Handoff`.
   - Assert each declares the expected `Role key`.
   - Assert each frontmatter has matching `id` and `role`.
   - Assert role-spec frontmatter does not contain lifecycle fields `gate`, `stop`, or `phase`.
   - Assert each has `execution_contract.surface: relay-subagent-role`.
   - Assert each has `execution_contract.loaded_by: phase-agent`.
   - Assert each has `execution_contract.delivered_via: relay_task_md`.
   - Assert none of the three files appears in `manifest.phases[]`.
   - Assert each follows the fixed role body structure: `Purpose`, `Search Focus`, `Artifacts`, `Execution Within Relay Slot`, `Page Content Fetching`, `Anti-Cheating Rules`, `Relationship to Phase Agent`.
   - Assert role specs do not use lifecycle-primary headings such as `## 1. Stage Goal`, `## 5. Gate Command`, or `## 8. Stop Behavior`.
   - Assert role-spec H1 matches the exact H1s specified in D5, not `# Phase:`.

3. Adjust workflow-chain/header-injection tests:
   - Use one renamed real role spec to assert non-manifest relay role specs do not receive lifecycle autonomous/terminal headers.
   - Use a separate synthetic non-manifest relay-like fixture with `stop: "no"` to preserve the manifest-membership boundary regression: lifecycle header injection must not be triggered by `stop: "no"` or relay-like frontmatter alone.
   - Do not add `stop` to real role specs just to satisfy the header-injection test; D6 forbids lifecycle frontmatter on role specs.

4. Adjust consistency-validator tests:
   - Verify the new role inventory.
   - Add a missing-role-spec failure case if the validator currently skips missing role spec files.
   - Verify role specs have frontmatter `role`, expected `id`, `relay-subagent-role` execution surface, and are absent from `manifest.phases[]`.
   - Verify lifecycle phases keep `surface: phase-agent`; role specs keep `surface: relay-subagent-role`.

5. Add or adjust active OpenSpec artifact tests only if this repo already has OpenSpec artifact regression tests for change directories. Do not invent a new OpenSpec testing framework for this cleanup; `openspec validate harden-relay-pipeline --strict` remains the primary OpenSpec artifact check.

### Validation Commands

Run these before marking the OpenSpec cleanup task complete:

```bash
node DPT_FRAMEWORK/cli/validate-workflow-package.mjs
```

```bash
node DPT_FRAMEWORK/cli/validate-phase-templates.mjs \
  DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md \
  DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md \
  DPT_FRAMEWORK/workflows/nodes/phases/phase-wave2.md
```

```bash
node --test \
  tests/engine/workflow-chain.test.mjs \
  tests/engine/consistency-validator.test.mjs \
  tests/integration/md/*.test.mjs
```

```bash
openspec validate harden-relay-pipeline --strict
```

```bash
git diff --check -- \
  _backlog/plans/self-documenting-phase-role-nodes-plan.md \
  openspec/changes/harden-relay-pipeline \
  DPT_FRAMEWORK \
  tests \
  guidelines \
  _backlog/todos \
  _backlog/bugs
```

Residual reference check:

```bash
rg "phase-wave0-subagent|phase-wave1-subagent|phase-wave2-subagent" \
  --glob '!_original_*' \
  --glob '!openspec/specs/**' \
  --glob '!openspec/changes/archive/**' \
  --glob '!_backlog/_done/**' \
  --glob '!_backlog/plans/self-documenting-phase-role-nodes-plan.md'
```

Broader accounting reference check:

```bash
rg "phase-wave0-subagent|phase-wave1-subagent|phase-wave2-subagent" \
  --glob '!_original_*' \
  --glob '!_backlog/plans/self-documenting-phase-role-nodes-plan.md'
```

The residual output must be categorized in the implementation notes:

- current-contract: 0 remaining
- pending accepted-spec archive/sync: listed, if any
- archive/history: allowed only under documented historical paths
- planning-note: this plan file allowed only if the residual scan intentionally includes it

## 7. Acceptance Criteria For This Cleanup

The OpenSpec cleanup task is complete only when all of the following are true:

- `openspec/changes/harden-relay-pipeline/tasks.md` contains the new section and all new tasks are checked.
- Active change artifacts validate with `openspec validate harden-relay-pipeline --strict`.
- All 11 manifest lifecycle phase nodes contain ordered `Execution Brief` fields and retain the 9-section phase body.
- The three role specs have the new filenames, exact role H1s, matching `id`/`role`/`Role key`, `Role Brief`, fixed role body structure, and no lifecycle frontmatter.
- Wave2 phase `suggested_context` includes both `subagent-dpt-topic-scout` and `subagent-dpt-evidence-extractor`.
- `shared-schemas.md` and `shared-gate-rules.md` are updated for the new role paths and current gate summaries.
- Validator and MD tests cover lifecycle brief structure, role brief/body structure, role inventory, and non-manifest header boundary.
- Current-contract residual scan returns zero old role-spec filenames.
- Broader accounting residual scan is categorized, with accepted specs listed as archive/sync follow-up if still present.
- No runtime queue schema, gate semantics, relay protocol, transition routing, or finding-index schema changes are introduced.

## 8. Non-Goals

This cleanup must not:

- Change queue schema or queue state transition semantics.
- Change relay slot protocol semantics.
- Change gate pass/fail semantics.
- Change finding-index schema.
- Add new npm dependencies.
- Move research judgment into JS.
- Make role specs manifest lifecycle phases.
- Treat `Execution Brief` or `Role Brief` prose as machine authority over schema, queue, trace, receipt, or gate verdicts.

## 9. Implementation Notes

- Use `git mv` for the three tracked role spec renames.
- Keep edits tightly scoped; avoid opportunistic rewrites.
- Preserve existing phase body detail; add orientation, do not erase contract text.
- Update prose references manually after inspecting each hit; avoid blind replacement in historical archive paths.
- Keep `Role Brief` role-oriented. Do not use phase-node section titles like `Stage Goal`, `Gate Command`, or `Stop Behavior` inside role specs unless there is a local reason and the role boundary remains clear.
- Wave2 role spec must require `shared/shared-schemas`, aligning it with Wave0/Wave1 role specs and the required role-spec frontmatter shape in D6.
- If a validator or test currently treats role spec absence as non-fatal, tighten it in this change because role specs are now explicit contract inventory.
