# Centralize Project Guidance Under OpenSpec - Progressive Plan

> Tracker ID: `centralize-project-guidance-under-openspec-progressive-plan`
> Parent plan: [`centralize-project-guidance-under-openspec.md`](centralize-project-guidance-under-openspec.md)
> Created: 2026-08-09
> Last updated: 2026-08-09
> Overall status: `planning_baseline_complete`
> Active checkpoint: `P1 - OpenSpec proposal`
> Current blocker: none
> Next legal action: create and populate the bounded OpenSpec Change A proposal; do not edit target surfaces before Apply readiness passes

## 1. Tracker Purpose

This file is the execution tracker for the parent plan. The parent plan owns the full rationale, target
topology, authority model, risk analysis, and desired end state. This progressive plan owns only the
step-by-step delivery state:

- where the work currently is;
- what has actually completed;
- what evidence closes each task;
- what is blocked and why;
- what the single next legal action is;
- where a later Agent should resume after context loss.

This tracker is not an accepted spec, an Apply authorization, a test result, or proof that an OpenSpec
change is complete. OpenSpec artifacts and executable checks remain authoritative for their own facts.

## 2. How To Maintain This Tracker

### 2.1 Checkbox rules

- Use `- [ ]` for work that has not met its completion criterion.
- Use `- [x]` only after the listed evidence exists and has been recorded here or in the active change.
- Do not check a parent task merely because some child tasks are complete.
- Do not check an Agent-owned semantic review because a deterministic checker passed.
- Do not use a checkbox as a substitute for an OpenSpec task marker.
- When a task is deliberately inapplicable, leave it unchecked and record an explicit `skipped` decision in
  the Decision Log with its reason and owning artifact.

### 2.2 Status vocabulary

| Status | Meaning |
|---|---|
| `pending` | Legal work exists but has not started |
| `in_progress` | This is the one currently active checkpoint |
| `blocked` | A named fact prevents the next legal action |
| `done` | Every required checkbox and completion criterion is closed |
| `skipped` | An owning instruction made the step inapplicable and the reason is recorded |
| `not_started` | A later optional change has not received a go decision |

### 2.3 Update discipline

Before ending any work session:

1. Update the header's `Last updated`, `Overall status`, `Active checkpoint`, `Current blocker`, and
   `Next legal action`.
2. Check only tasks completed by current evidence.
3. Add every new evidence item to the Evidence Ledger.
4. Add or resolve blockers in the Blocker Log.
5. Add durable scope/structure decisions to the Decision Log.
6. Add one Progress Log row explaining what changed during the session.
7. Ensure exactly one unfinished checkpoint is marked `in_progress`, unless the whole plan is blocked or done.

## 3. Current Position

```yaml
plan: centralize-project-guidance-under-openspec
overall_status: planning_baseline_complete
active_checkpoint: P1
active_checkpoint_name: OpenSpec proposal
last_completed_checkpoint: P0
current_blocker: null
next_legal_action: scaffold Change A through the OpenSpec CLI and follow its artifact instructions
target_change_a: centralize-project-guidance-under-openspec
target_change_b: prune-and-automate-project-guidance
target_edits_authorized: false
archive_authorized: false
```

### Resume coordinate

A later Agent resumes here:

1. Read the Project Charter and root `CONTEXT.md` required by repository instructions.
2. Read the parent plan.
3. Read this tracker from `Current Position` through the active checkpoint.
4. Run `openspec list --json` to refresh active-change truth; do not trust this file for current OpenSpec state.
5. If Change A exists, resolve it with `openspec status --change "centralize-project-guidance-under-openspec" --json`.
6. Continue only the first unchecked legal task in the active checkpoint.

## 4. Progressive Checkpoint Board

| Checkpoint | Outcome | Status | Progress | Exit evidence |
|---|---|---|---|---|
| P0 | Planning baseline and structural direction are explicit | `done` | 8/8 | Parent plan, baseline inspection, progressive tracker |
| P1 | Change A has coherent proposal artifacts ready for review | `in_progress` | 0/13 | OpenSpec status shows requested planning artifacts done |
| P2 | Change A passes plan review and Apply preflight | `pending` | 0/10 | Review marker plus plan-mode governance PASS results |
| P3 | Guidance topology and all current consumers are migrated | `pending` | 0/35 | Target diff implements the approved task list |
| P4 | Change A is verified, synced, finalized, and archived | `pending` | 0/20 | Governed finalizer success and archive location |
| P5 | Change A is observed and Change B receives a go/no-go decision | `pending` | 0/9 | Measurement and explicit decision record |
| P6 | Change B prunes duplication and automates deterministic topology checks | `not_started` | 0/31 | Archived Change B or explicit no-go closure |
| P7 | Backlog plans are closed with durable completion evidence | `pending` | 0/10 | Both plan files moved to closed plans and indexes updated |

Progress counts are manual navigation aids. They are not completion authority. Update them whenever task
checkboxes change.

## 5. P0 - Planning Baseline

**Status:** `done`

**Bounded outcome:** The problem, target roles, migration sequence, known contract impact, and current baseline
are sufficiently explicit to begin an OpenSpec proposal without editing target surfaces.

### Tasks

- [x] **P0-01** Read the required Project Charter and root Context before substantive analysis.
  - Completion: both required documents were read in full during the exploration session.
  - Evidence: `E-001`.
- [x] **P0-02** Inventory the current `guidelines/` suite by file, role, frontmatter, headings, and size.
  - Completion: all 13 current Markdown files were classified; total size recorded as approximately 3,100 lines.
  - Evidence: `E-002`.
- [x] **P0-03** Inspect current accepted contracts that hard-code the guidance topology and entry route.
  - Completion: `governance/guidance-constitution` and `agent/agent-context-routing` were identified as primary
    candidate Modified capabilities.
  - Evidence: `E-003`.
- [x] **P0-04** Identify current live consumers of `guidelines/` paths.
  - Completion: root/Harness entries, OpenSpec config/specs, operation skills, and focused tests were mapped.
  - Evidence: `E-004`.
- [x] **P0-05** Run the focused baseline tests before proposing migration.
  - Completion: the baseline result and current failure root were recorded without attempting a fix.
  - Evidence: `E-005`.
- [x] **P0-06** Agree on the structural direction with the user.
  - Completion: OpenSpec-centered governance, role-based splitting, root adapters, and progressive execution were
    accepted as the planning direction.
  - Evidence: `E-006`.
- [x] **P0-07** Write the detailed parent plan.
  - Completion: parent plan contains goals, non-goals, topology, file mapping, two-change sequence, risks,
    verification, and acceptance criteria.
  - Evidence: `E-007`.
- [x] **P0-08** Create this progressive tracker and establish the resume protocol.
  - Completion: checkpoint board, task IDs, evidence ledger, blocker log, decision log, and progress log exist.
  - Evidence: `E-008`.

### P0 exit check

- [x] The work can enter Propose without target edits.
- [x] The current failing test is treated as structural evidence, not silently repaired.
- [x] Change A and Change B have distinct bounded outcomes.
- [x] The next legal action is one OpenSpec proposal, not a filesystem move.

## 6. P1 - OpenSpec Proposal For Change A

**Status:** `in_progress`

**Bounded outcome:** A scaffolded active OpenSpec change contains coherent proposal artifacts for the topology
migration, with capability discovery, delta requirements, design boundaries, tasks, verification planning,
and semantic-closure planning ready for Agent review.

**Entry condition:** P0 is complete.

**Target edits authorized:** No.

### Change resolution and instructions

- [ ] **P1-01** Refresh current OpenSpec state with `openspec list --json`.
  - Completion: current root and active change list are recorded in the Progress Log.
  - Evidence needed: command result summary.
- [ ] **P1-02** Confirm that `centralize-project-guidance-under-openspec` is not already an active or conflicting
  change.
  - Completion: either no conflict exists, or the existing change is deliberately selected and recorded.
- [ ] **P1-03** Scaffold Change A with the OpenSpec CLI, never by manually creating its directory.
  - Completion: `.openspec.yaml` and resolved change root exist.
  - Evidence needed: resolved change path and `openspec status --change ... --json` summary.
- [ ] **P1-04** Obtain artifact status and instructions in dependency order.
  - Completion: every artifact written in P1 uses its current OpenSpec instruction/template.

### Capability discovery

- [ ] **P1-05** Read `openspec/specs/README.md` or obtain the current spec catalog.
  - Completion: candidate capability paths are selected by full `domain/capability` identity.
- [ ] **P1-06** Inspect `governance/guidance-constitution` as the primary topology/constitutional candidate.
  - Completion: reuse/modify decision and evidence read are recorded in proposal capability discovery.
- [ ] **P1-07** Inspect `agent/agent-context-routing` as the primary entry-route candidate.
  - Completion: reuse/modify decision and evidence read are recorded in proposal capability discovery.
- [ ] **P1-08** Inspect `governance/change-feedback-loop`, plus any catalog candidates surfaced by current paths.
  - Completion: proposal states whether operation-path relocation changes observable behavior or only
    implementation coordinates.
- [ ] **P1-09** Reject duplicate New capabilities unless no inspected current capability owns the observable
  behavior.
  - Completion: every New/Modified/Excluded decision has a bounded reason.

### Planning artifacts

- [ ] **P1-10** Complete `proposal.md`.
  - Required content:
    - current root split and flat-role conflict;
    - Change A topology-only behavioral boundary;
    - Capability Discovery section;
    - explicit no-Harness-runtime-behavior claim boundary;
    - scope and non-goals;
    - migration impact summary.
- [ ] **P1-11** Complete applicable delta specs.
  - Required coverage:
    - canonical Charter path and recursive constitution hierarchy;
    - role distinction between constitution, models, and operations;
    - root/Harness Charter -> Context entry routes;
    - current operation guidance path where accepted behavior requires it;
    - no duplicate live guidance root;
    - historical archive exclusion.
- [ ] **P1-12** Complete `design.md`.
  - Required reasoning:
    - semantic precision for each directory role and intended reader;
    - one canonical path and no mirror under simple reliable control;
    - root adapters versus OpenSpec implementation center;
    - Agent/user/Engine responsibility boundary;
    - atomic migration and recovery unit;
    - OpenSpec CLI compatibility check for custom sibling directories;
    - path migration policy and test-scope policy.
- [ ] **P1-13** Complete `tasks.md` and all project-required planning companions.
  - Required task properties:
    - dependency order is explicit;
    - plan-review and closeout-review markers are present when required;
    - `verification-plan.yaml` exists and uses accepted test classes;
    - `semantic-closure.yaml` exists with an honest status branch;
    - target edits occur only after Apply preflight;
    - actual completion commands and evidence locations are named.

### P1 exit check

- [ ] OpenSpec status reports every requested P1 artifact as done or deliberately skipped by its own condition.
- [ ] No target file outside the active change has been edited for migration.
- [ ] Proposal scope still separates Change A from content pruning Change B.
- [ ] Every claimed Modified capability was actually inspected.
- [ ] Tasks contain independently observable completion criteria.
- [ ] The tracker header advances to P2 only after all P1 completion facts are recorded.

## 7. P2 - Plan Review And Apply Readiness

**Status:** `pending`

**Bounded outcome:** Agent-owned review finds the plan coherent, every finding is persisted as an ordinary task,
and the selected change passes deterministic plan-mode preflight before any target edit.

**Entry condition:** P1 exit check is complete.

### Tasks

- [ ] **P2-01** Resolve the selected Change A status and read all completed planning artifacts as one coherent plan.
- [ ] **P2-02** Obtain and read current `openspec/operations/change-feedback-loop.md` guidance from its current
  location at execution time.
- [ ] **P2-03** Review capability ownership and confirm no topology rule is being duplicated across deltas.
- [ ] **P2-04** Review every planned current/live consumer and ensure archive paths are excluded intentionally.
- [ ] **P2-05** Review the target topology against OpenSpec CLI behavior; add a task if an extra `project/` layer
  is required by real CLI constraints.
- [ ] **P2-06** Review `semantic-closure.yaml` semantically against planned changed surfaces.
- [ ] **P2-07** Persist every review finding as an ordinary unchecked task with owner, smallest repair, and done
  condition.
- [ ] **P2-08** Complete `openspec-feedback:plan-review` only after no open planning finding remains.
- [ ] **P2-09** Run verification-routing plan mode and record PASS or its exact repair coordinate.
- [ ] **P2-10** Run semantic-closure plan mode and record PASS or its exact repair coordinate.

### P2 exit check

- [ ] Plan-review marker is complete exactly once.
- [ ] No ordinary planning task remains incomplete before the first target edit.
- [ ] Both required plan-mode governance checks pass.
- [ ] The active change still resolves to the intended Change A.
- [ ] `target_edits_authorized` in Current Position is changed to `true` only now.

## 8. P3 - Apply Change A: Topology Migration

**Status:** `pending`

**Bounded outcome:** Current project guidance is moved into approved role-specific OpenSpec surfaces, every live
consumer uses the new canonical paths, and no long-lived duplicate root remains.

**Entry condition:** P2 exit check is complete and Apply guidance authorizes target work.

### 8.1 Pre-edit boundary

- [ ] **P3-01** Record the change-scoped worktree boundary before edits.
- [ ] **P3-02** Confirm unrelated user changes are identified and excluded from the migration diff.
- [ ] **P3-03** Re-read the approved task order and select the first implementation task.

### 8.2 Create role-specific target surfaces

- [ ] **P3-04** Create `openspec/constitution/` through approved file moves/additions.
- [ ] **P3-05** Create `openspec/constitution/evolution/`.
- [ ] **P3-06** Create `openspec/guidance/models/`.
- [ ] **P3-07** Create `openspec/operations/`.
- [ ] **P3-08** Establish a concise role/authority entry for each target surface if required by the approved design.

### 8.3 Move canonical guidance files

- [ ] **P3-09** Move `guidelines/project-charter.md` to the approved constitution path.
- [ ] **P3-10** Move the semantic-precision evolution direction.
- [ ] **P3-11** Move the simple-control evolution direction.
- [ ] **P3-12** Move the helper-oriented evolution direction.
- [ ] **P3-13** Move the framework/runtime model.
- [ ] **P3-14** Move the agentic execution model.
- [ ] **P3-15** Move the workflow/Chain mechanism model.
- [ ] **P3-16** Move the Queue mechanism model.
- [ ] **P3-17** Move the Sub-agent/Work Unit mechanism model.
- [ ] **P3-18** Move change-feedback-loop operation guidance.
- [ ] **P3-19** Move command-experiments operation guidance.
- [ ] **P3-20** Move logging-conventions operation guidance.
- [ ] **P3-21** Replace the old guidance index with the approved `openspec/README.md` control map through a
  history-preserving move where practical.

### 8.4 Repair document-local contracts

- [ ] **P3-22** Update frontmatter role, scope, `defers_to`, and sibling coordinates by document role.
- [ ] **P3-23** Update internal Markdown links after nested moves.
- [ ] **P3-24** Preserve constitution triad order and EWD 340 source-context requirements.
- [ ] **P3-25** Ensure operations retain their real accepted-spec/executable routes instead of being forced into
  Charter-only peers.
- [ ] **P3-26** Avoid Change B prose pruning except where a path or role statement must change for correctness.

### 8.5 Update current consumers

- [ ] **P3-27** Update root `AGENTS.md`, `CLAUDE.md`, and `README.md` entry routes.
- [ ] **P3-28** Update root `CONTEXT.md` canon links while preserving its non-authority boundary.
- [ ] **P3-29** Update Harness `AGENTS.md`, `CLAUDE.md`, `README.md`, and `COMMANDS.md` routes.
- [ ] **P3-30** Update `openspec/config.yaml` evolution, boundary, experiment, and feedback pointers.
- [ ] **P3-31** Update supported `.agents` apply/archive operation entries.
- [ ] **P3-32** Update supported `.claude` apply/archive operation entries and preserve pair synchronization.
- [ ] **P3-33** Update active/main accepted path contracts according to the approved delta/sync sequence.

### 8.6 Update deterministic regressions

- [ ] **P3-34** Make constitution/guidance scans recursive and role-aware; keep operations under their owning
  focused contracts.
- [ ] **P3-35** Update every focused current-path consumer test named in the approved tasks.

### P3 exit check

- [ ] Every approved canonical file exists at exactly one current path.
- [ ] Root `guidelines/` has no remaining supported current document.
- [ ] No duplicate mirror or symlink was introduced.
- [ ] Root/Harness entry routes still point Charter before Context.
- [ ] Harness research-entry selection prose remains unchanged in behavior.
- [ ] The actual diff remains inside Change A scope.
- [ ] The tracker header advances to P4 only after migration tasks and their evidence are recorded.

## 9. P4 - Verify, Close, Sync, And Archive Change A

**Status:** `pending`

**Bounded outcome:** The migrated topology passes focused regressions and project governance; Agent-owned
closeout has no open finding; applicable deltas are synced; the governed finalizer archives Change A.

### 9.1 Direct topology checks

- [ ] **P4-01** Verify every target file exists at its approved canonical path.
- [ ] **P4-02** Verify root `guidelines/` is absent or contains no supported current source, as specified.
- [ ] **P4-03** Scan current/live surfaces for old `guidelines/` references using the approved bounded roots.
- [ ] **P4-04** Confirm archived changes and excluded historical materials were not rewritten.
- [ ] **P4-05** Validate internal Markdown links for moved documents and current consumers.

### 9.2 Focused regressions

- [ ] **P4-06** Run the updated evolution-direction/constitution governance regression.
- [ ] **P4-07** Run the updated agent-context-routing regression.
- [ ] **P4-08** Run change-feedback finalizer/supported-entry conformance regressions.
- [ ] **P4-09** Run verification-routing knowledge-surface regressions.
- [ ] **P4-10** Run experiment terminology/knowledge-surface regressions.
- [ ] **P4-11** Run any additional tests selected by the verification plan.

### 9.3 Project governance and semantic review

- [ ] **P4-12** Run strict OpenSpec validation for Change A.
- [ ] **P4-13** Run requirement traceability, main-spec structure, taxonomy, discovery, verification-routing
  assets, and semantic-closure assets in the project-required order.
- [ ] **P4-14** Review the selected `semantic-closure.yaml` against the actual diff.
- [ ] **P4-15** Review the change-scoped actual diff, artifacts, and selected evidence.
- [ ] **P4-16** Add and complete ordinary repair tasks for every closeout finding.
- [ ] **P4-17** Complete `openspec-feedback:closeout-review` only after a fresh no-finding review.

### 9.4 Sync and governed archive

- [ ] **P4-18** Sync applicable delta specs to main specs through the supported Agent-owned route.
- [ ] **P4-19** Re-compare delta and main semantics after sync and rerun affected checks.
- [ ] **P4-20** Invoke the governed finalizer as the only final archive transition and record its success.

### P4 exit check

- [ ] Change A no longer appears as active and resolves at its canonical archive location.
- [ ] Governed finalizer output identifies success for the exact selected change.
- [ ] All Change A OpenSpec tasks are complete.
- [ ] Current live surfaces have no unsupported old guidance route.
- [ ] Parent plan and this tracker link the archive evidence.
- [ ] `target_edits_authorized` and `archive_authorized` are reset to `false` after completion.

## 10. P5 - Observe Change A And Decide Change B

**Status:** `pending`

**Bounded outcome:** The team measures the post-migration reading experience and makes an explicit go/no-go
decision for content pruning and deterministic topology automation.

### Tasks

- [ ] **P5-01** Record post-Change-A Charter line/word count.
- [ ] **P5-02** Record fixed Charter + Context entry load.
- [ ] **P5-03** Record root adapter sizes and duplicated definitions still observed.
- [ ] **P5-04** Exercise at least one normal repository entry and one Harness-local entry against the new routes.
- [ ] **P5-05** Inspect whether `openspec/README.md` is functioning as a router or has become another glossary.
- [ ] **P5-06** Inspect whether operation/model role selection is clear without reading every document.
- [ ] **P5-07** List concrete remaining duplication/automation candidates with their current owner.
- [ ] **P5-08** Decide whether Change B has enough bounded, current work to propose.
- [ ] **P5-09** Record one of:
  - `go`: proceed to P6 with an explicit Change B scope;
  - `no_go`: close the future work with a reason and re-entry trigger;
  - `blocked`: record the missing evidence or external state.

### P5 exit check

- [ ] Decision is based on post-migration evidence, not the pre-migration assumption alone.
- [ ] A no-go decision includes a future re-entry trigger.
- [ ] A go decision names a bounded Change B outcome and excludes topology rework already closed by Change A.

## 11. P6 - Change B: Prune And Automate Project Guidance

**Status:** `not_started`

**Bounded outcome:** Mandatory context is materially smaller, duplicate truth is removed, role-specific documents
are sharper, and deterministic topology facts are protected by focused checks without turning semantic
judgment into machine verdicts.

**Entry condition:** P5 records `go`.

### 11.1 Propose and review Change B

- [ ] **P6-01** Scaffold `prune-and-automate-project-guidance` through OpenSpec CLI.
- [ ] **P6-02** Perform fresh capability discovery against post-Change-A main specs.
- [ ] **P6-03** Write proposal, applicable deltas, design, tasks, verification plan, and semantic-closure record.
- [ ] **P6-04** Define numeric before/after measurements without treating line count alone as quality.
- [ ] **P6-05** Complete Agent-owned plan review and persist findings as tasks.
- [ ] **P6-06** Pass verification-routing and semantic-closure plan preflight.

### 11.2 Shrink mandatory surfaces

- [ ] **P6-07** Apply the constitutional admission test to every Charter section.
- [ ] **P6-08** Retain the minimal mandatory core: project nature, authority split, evidence honesty, OpenSpec
  lifecycle, and trigger router.
- [ ] **P6-09** Move task-specific reference behind precise context pointers.
- [ ] **P6-10** Reduce `openspec/README.md` to a role/trigger router.
- [ ] **P6-11** Preserve root adapter behavior while removing repeated body text.

### 11.3 Deduplicate Context, config, models, and specs

- [ ] **P6-12** Build a duplication map for Charter, Context, OpenSpec config, model canon, operations, and specs.
- [ ] **P6-13** Assign one canonical owner to every repeated definition or rule.
- [ ] **P6-14** Keep only compressed orientation or a trigger pointer at non-owning surfaces.
- [ ] **P6-15** Remove directory/API facts that are cheap to inspect from the environment.
- [ ] **P6-16** Preserve rationale only where config/code cannot explain why.

### 11.4 Deepen model and operation documents

- [ ] **P6-17** Ensure each model answers one bounded reader question and has a normal reasoning stop point.
- [ ] **P6-18** Evaluate Chain/Queue/Work Unit names and perform only justified semantic renames.
- [ ] **P6-19** Separate logging behavior contracts from runtime-observability procedure.
- [ ] **P6-20** Delete an operation/model document if its remaining interface provides no leverage.
- [ ] **P6-21** Ensure every retained operation has trigger, ordered steps, completion criteria, and authority limit.

### 11.5 Automate deterministic topology facts

- [ ] **P6-22** Check canonical path uniqueness.
- [ ] **P6-23** Check role-specific frontmatter.
- [ ] **P6-24** Check current internal links.
- [ ] **P6-25** Check root/Harness adapter route order and synchronized blocks.
- [ ] **P6-26** Check forbidden duplicate mirrors.
- [ ] **P6-27** Check bounded current/live old-path references.
- [ ] **P6-28** Confirm semantic quality, abstraction value, and research judgment remain Agent/human reviews.

### 11.6 Verify and archive Change B

- [ ] **P6-29** Record before/after entry-load measurements and deleted duplicate meanings.
- [ ] **P6-30** Complete focused tests, governance checks, closeout review, sync, and governed finalization.
- [ ] **P6-31** Record residual risks and future triggers without keeping Change B artificially active.

### P6 exit check

- [ ] Change B is archived, or a P5 no-go/blocked decision honestly closes this checkpoint.
- [ ] Mandatory entry load is smaller without losing required route behavior.
- [ ] Deterministic topology rules have executable protection.
- [ ] Semantic design review has not been converted into a checkbox-only or Engine verdict system.

## 12. P7 - Close The Backlog Plan

**Status:** `pending`

**Bounded outcome:** The planning records accurately state what shipped, what did not ship, and where durable
authority/evidence now lives; active plan indexes no longer claim unfinished work.

### Tasks

- [ ] **P7-01** Confirm Change A archive evidence is linked in both parent and progressive plans.
- [ ] **P7-02** Confirm Change B is either archived or has an explicit no-go/blocked closure with re-entry trigger.
- [ ] **P7-03** Reconcile every unchecked task: complete it, record a deliberate skip, or carry it into a named
  new plan/change.
- [ ] **P7-04** Write a concise final outcome summary in the parent plan.
- [ ] **P7-05** Set this tracker's header to `done`, with no active checkpoint or blocker.
- [ ] **P7-06** Move the parent plan to `_backlog/_done/_closed_plans/` without renaming it.
- [ ] **P7-07** Move this progressive plan to `_backlog/_done/_closed_plans/` without renaming it.
- [ ] **P7-08** Remove the active entry from `_backlog/plans/README.md`.
- [ ] **P7-09** Add closure entries to `_backlog/_done/_closed_plans/README.md` and update the done index/count
  required by backlog conventions.
- [ ] **P7-10** Verify no active plan points to the old active locations as current state.

### P7 exit check

- [ ] Active plan index no longer lists this work.
- [ ] Closed-plan indexes identify the completion or honest terminal boundary.
- [ ] No unfinished task exists only in chat.
- [ ] Current behavior claims are limited to archived changes and recorded verification evidence.

## 13. File-Move Tracking Matrix

Do not check a row until the canonical move, internal link repair, and owning focused verification are all
complete.

| ID | Current source | Proposed current target | Status | Evidence |
|---|---|---|---|---|
| F-01 | `guidelines/README.md` | `openspec/README.md` | pending | |
| F-02 | `guidelines/project-charter.md` | `openspec/constitution/project-charter.md` | pending | |
| F-03 | `guidelines/evolution-abstraction-semantic-precision.md` | `openspec/constitution/evolution/abstraction-semantic-precision.md` | pending | |
| F-04 | `guidelines/evolution-simple-reliable-control.md` | `openspec/constitution/evolution/simple-reliable-control.md` | pending | |
| F-05 | `guidelines/evolution-helper-oriented-agent.md` | `openspec/constitution/evolution/helper-oriented-agent.md` | pending | |
| F-06 | `guidelines/framework-runtime-boundary.md` | `openspec/guidance/models/framework-runtime-boundary.md` | pending | |
| F-07 | `guidelines/agentic-execution-model.md` | `openspec/guidance/models/agentic-execution-model.md` | pending | |
| F-08 | `guidelines/agentic-workflow-mechanism.md` | `openspec/guidance/models/agentic-workflow-mechanism.md` | pending | |
| F-09 | `guidelines/agentic-queue-mechanism.md` | `openspec/guidance/models/agentic-queue-mechanism.md` | pending | |
| F-10 | `guidelines/agentic-subagent-mechanism.md` | `openspec/guidance/models/agentic-subagent-mechanism.md` | pending | |
| F-11 | `guidelines/change-feedback-loop.md` | `openspec/operations/change-feedback-loop.md` | pending | |
| F-12 | `guidelines/command-experiments.md` | `openspec/operations/command-experiments.md` | pending | |
| F-13 | `guidelines/logging-conventions.md` | `openspec/operations/logging-conventions.md` | pending | |

The final target paths remain subject to the accepted Change A design and real OpenSpec CLI constraints. If a
path changes, update the parent plan, this matrix, delta specs, tasks, and consumers together.

## 14. Consumer Tracking Matrix

| ID | Consumer group | Required outcome | Status | Evidence |
|---|---|---|---|---|
| C-01 | Root `AGENTS.md` / `CLAUDE.md` | New Charter -> root Context route, paired semantics preserved | pending | |
| C-02 | Root `README.md` | New route before scoped directory selection | pending | |
| C-03 | Root `CONTEXT.md` | New canon links, glossary non-authority preserved | pending | |
| C-04 | Harness `AGENTS.md` / `CLAUDE.md` | Parent Charter -> Context route, synchronized block | pending | |
| C-05 | Harness `README.md` / `COMMANDS.md` | New guidance links, research entry behavior unchanged | pending | |
| C-06 | `openspec/config.yaml` | All current guidance pointers use approved paths/order | pending | |
| C-07 | Main/active specs | Accepted path requirements match approved topology | pending | |
| C-08 | `.agents` operation skills | Apply/archive obtain current operation guidance | pending | |
| C-09 | `.claude` operation entries | Same supported route and selected-change identity | pending | |
| C-10 | Constitution regression | Recursive role-aware hierarchy and triad | pending | |
| C-11 | Context-routing regression | All six entry surfaces retain ordering/boundaries | pending | |
| C-12 | Feedback finalizer regression | Supported entry inventory and operation path converge | pending | |
| C-13 | Experiment/verification regressions | Knowledge pointers resolve to current operations | pending | |
| C-14 | Live-reference scan | No unsupported old path outside explicit exclusions | pending | |

## 15. Evidence Ledger

| Evidence ID | Date | Object | Evidence boundary | Result / location |
|---|---|---|---|---|
| E-001 | 2026-08-09 | Required pre-read | Conversation-scoped repository exploration | Full Charter and root Context read |
| E-002 | 2026-08-09 | Guidance inventory | Current `guidelines/*.md` only | 13 Markdown files, roles/headings/frontmatter mapped |
| E-003 | 2026-08-09 | Accepted path contracts | Current main specs inspected | `governance/guidance-constitution`, `agent/agent-context-routing` |
| E-004 | 2026-08-09 | Live consumers | Bounded current surfaces; archives excluded from intended migration | Root/Harness/config/skills/tests map recorded in parent plan |
| E-005 | 2026-08-09 | Focused baseline tests | Two current deterministic documentation test files | 10 pass, 1 fail; `change-feedback-loop.md` Charter-only hierarchy mismatch |
| E-006 | 2026-08-09 | User direction | Conversation decision | OpenSpec-centered role split and progressive delivery requested |
| E-007 | 2026-08-09 | Parent plan | Backlog planning artifact | `_backlog/plans/centralize-project-guidance-under-openspec.md` |
| E-008 | 2026-08-09 | Progressive tracking | Backlog tracking artifact | This file |

Add future evidence with a stable ID. For command evidence, record the exact selected change/object, command,
exit result, and artifact path. Do not paste an unbounded console transcript when a concise result and durable
artifact coordinate are sufficient.

## 16. Decision Log

| Decision ID | Date | Decision | Status | Revisit trigger |
|---|---|---|---|---|
| D-001 | 2026-08-09 | Treat `openspec/` as the project-control implementation center | planning default | Accepted Change A design chooses another topology due to real CLI constraint |
| D-002 | 2026-08-09 | Keep root behavior files and `CONTEXT.md` as discovery interfaces | planning default | Tooling provides an equally discoverable, tested root interface |
| D-003 | 2026-08-09 | Split constitution, guidance models, and operations by reader role | planning default | Semantic-precision review shows a role does not answer a distinct bounded question |
| D-004 | 2026-08-09 | Do not create a generic `guardrails/` directory | planning default | A concrete enforceable interface with distinct authority is proposed |
| D-005 | 2026-08-09 | Deliver topology migration and content pruning as two changes | planning default | OpenSpec dependency analysis proves a smaller different sequence is required |
| D-006 | 2026-08-09 | Do not rewrite archived OpenSpec changes | planning default | A separate historical migration requirement is explicitly approved |
| D-007 | 2026-08-09 | Do not keep a permanent old-path mirror or symlink | planning default | A named external consumer requires a bounded compatibility adapter |
| D-008 | 2026-08-09 | Preserve filenames during Change A where possible | planning default | Correct path semantics or collision requires an approved rename |

Planning defaults guide proposal authoring but are not accepted behavior. Change A artifacts must make the
authoritative scoped decisions.

## 17. Blocker Log

| Blocker ID | Opened | Checkpoint | Blocking fact | Owner / repair coordinate | Status | Closed evidence |
|---|---|---|---|---|---|---|
| None | | | No current blocker | | | |

When blocked:

1. Set the header and Current Position to `blocked`.
2. Name the direct observed fact, not a theory about why an Agent or host failed.
3. Record the authority that can change the fact.
4. Record one legal repair/retry coordinate, or an honest no-path boundary.
5. Leave downstream tasks unchecked.

## 18. Progress Log

| Date | Checkpoint | Work completed | Evidence | Stopped at / next action |
|---|---|---|---|---|
| 2026-08-09 | P0 | Explored current topology, contracts, consumers, and baseline regression | E-001 through E-006 | Write detailed parent plan |
| 2026-08-09 | P0 | Created parent plan and active-plan index entry | E-007 | Create progressive tracker |
| 2026-08-09 | P0 -> P1 | Created progressive tracker, checkpoint board, ledgers, and resume protocol | E-008 | Scaffold Change A through OpenSpec CLI |

## 19. Session Update Template

Append one Progress Log row and use this template while updating the header/checkpoints:

```markdown
### YYYY-MM-DD - <checkpoint>

Completed:
- <task IDs and observable outcomes>

Evidence:
- <evidence IDs, commands, paths, or OpenSpec status facts>

Blocked:
- none
<!-- or: <blocker ID, direct fact, owner, repair/retry coordinate> -->

Next legal action:
- <exactly one action>

Resume coordinate:
- <first unchecked task ID>
```

## 20. Final Closure Rule

This progressive plan is complete only when:

- Change A is archived through the governed finalizer;
- Change B is either archived or explicitly closed by a measured no-go/blocked decision;
- all remaining tasks have a completed, skipped, or transferred disposition;
- the parent plan contains the final outcome and durable evidence coordinates;
- both planning files are moved to `_backlog/_done/_closed_plans/`;
- active and closed backlog indexes reflect the actual state.

Until then, the first unchecked legal task in the active checkpoint is the resume point. Chat summaries may
explain progress, but they do not replace this tracker, the active OpenSpec artifacts, or executable evidence.
