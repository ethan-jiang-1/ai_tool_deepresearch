# Centralize Project Guidance Under OpenSpec - Progressive Plan

> Tracker ID: `centralize-project-guidance-under-openspec-progressive-plan`
> Parent plan: [`centralize-project-guidance-under-openspec.md`](centralize-project-guidance-under-openspec.md)
> Created: 2026-08-09
> Last updated: 2026-08-10
> Overall status: `done`
> Active checkpoint: none
> Current blocker: none
> Next legal action: none; this plan is closed.

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

### 2.4 Proposal-polish rule

For every change represented by this tracker, immediately after its proposal artifacts are complete and
before its Agent-owned plan review or any Apply work:

1. Add and perform a selected-change `polish-openspec-change` pass in the active change's formal task
   list.
2. Use the named workflow when it is available at execution time; otherwise perform and record an
   equivalent scoped artifact-polish review.
3. Convert every actionable finding into an ordinary unchecked repair task, complete those repairs, and
   rerun the affected planning validation/governance checks before the plan-review marker can close.
4. Keep `.agents/skills/**` and `.claude/skills/**` out of polish scope unless the user separately
   authorizes a change there.

This rule is prospective for already archived changes: do not backfill or claim a polish pass that was
not recorded in the historical change. It supplements the required actual-diff closeout review; it does
not replace it.

## 3. Current Position

```yaml
plan: centralize-project-guidance-under-openspec
overall_status: done
active_checkpoint: null
active_checkpoint_name: null
last_completed_checkpoint: P7
current_blocker: null
next_legal_action: none; this plan is closed
target_change_a: centralize-project-guidance-under-openspec
change_a_archive: openspec/changes/archive/2026-08-10-centralize-project-guidance-under-openspec/
target_change_b: prune-and-automate-project-guidance
change_b_archive: openspec/changes/archive/2026-08-10-prune-and-automate-project-guidance/
proposal_polish_rule: required_after_proposal_before_plan_review
change_a_polish_status: historical_not_claimed
change_b_polish_status: completed_equivalent_scoped_review
plan_preflight_passed: true
apply_entry_requested: true
target_edits_authorized: true
archive_status: archived
```

### Resume coordinate

No resume coordinate remains. Future guidance work begins with a new bounded
plan/change and current OpenSpec status, not by reopening this closed tracker.

## 4. Progressive Checkpoint Board

| Checkpoint | Outcome | Status | Progress | Exit evidence |
|---|---|---|---|---|
| P0 | Planning baseline and structural direction are explicit | `done` | 8/8 | Parent plan, baseline inspection, progressive tracker |
| P1 | Change A has coherent proposal artifacts ready for review | `done` | 13/13 | Archived Change A planning artifacts and completed task record |
| P2 | Change A passes plan review and Apply preflight | `done` | 10/10 | Archived plan-review marker and plan-mode governance evidence |
| P3 | Guidance topology and all current consumers are migrated | `done` | 33/35 + 2 skipped | Change A archive and current role-aware regressions |
| P4 | Change A is verified, synced, finalized, and archived | `done` | 20/20 | Governed finalizer success at the canonical archive location |
| P5 | Change A is observed and Change B receives a go/no-go decision | `done` | 9/9 | E-010 and D-010 |
| P6 | Change B prunes duplication and automates deterministic topology checks | `done` | 32/32 | Governed finalizer archived Change B at its canonical archive location |
| P7 | Backlog plans are closed with durable completion evidence | `done` | 10/10 | Both plans moved, indexes updated, and no active pointer remains |

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

**Status:** `done`

**Bounded outcome:** A scaffolded active OpenSpec change contains coherent proposal artifacts for the topology
migration, with capability discovery, delta requirements, design boundaries, tasks, verification planning,
and semantic-closure planning ready for Agent review.

**Entry condition:** P0 is complete.

**Target edits authorized:** No.

### Change resolution and instructions

- [x] **P1-01** Refresh current OpenSpec state with `openspec list --json`.
  - Completion: current root and active change list are recorded in the Progress Log.
  - Evidence needed: command result summary.
- [x] **P1-02** Confirm that `centralize-project-guidance-under-openspec` is not already an active or conflicting
  change.
  - Completion: either no conflict exists, or the existing change is deliberately selected and recorded.
- [x] **P1-03** Scaffold Change A with the OpenSpec CLI, never by manually creating its directory.
  - Completion: `.openspec.yaml` and resolved change root exist.
  - Evidence needed: resolved change path and `openspec status --change ... --json` summary.
- [x] **P1-04** Obtain artifact status and instructions in dependency order.
  - Completion: every artifact written in P1 uses its current OpenSpec instruction/template.

### Capability discovery

- [x] **P1-05** Read `openspec/specs/README.md` or obtain the current spec catalog.
  - Completion: candidate capability paths are selected by full `domain/capability` identity.
- [x] **P1-06** Inspect `governance/guidance-constitution` as the primary topology/constitutional candidate.
  - Completion: reuse/modify decision and evidence read are recorded in proposal capability discovery.
- [x] **P1-07** Inspect `agent/agent-context-routing` as the primary entry-route candidate.
  - Completion: reuse/modify decision and evidence read are recorded in proposal capability discovery.
- [x] **P1-08** Inspect `governance/change-feedback-loop`, plus any catalog candidates surfaced by current paths.
  - Completion: proposal states whether operation-path relocation changes observable behavior or only
    implementation coordinates.
- [x] **P1-09** Reject duplicate New capabilities unless no inspected current capability owns the observable
  behavior.
  - Completion: every New/Modified/Excluded decision has a bounded reason.

### Planning artifacts

- [x] **P1-10** Complete `proposal.md`.
  - Required content:
    - current root split and flat-role conflict;
    - Change A topology-only behavioral boundary;
    - Capability Discovery section;
    - explicit no-Harness-runtime-behavior claim boundary;
    - scope and non-goals;
    - migration impact summary.
- [x] **P1-11** Complete applicable delta specs.
  - Required coverage:
    - canonical Charter path and recursive constitution hierarchy;
    - role distinction between constitution, models, and operations;
    - root/Harness Charter -> Context entry routes;
    - current operation guidance path where accepted behavior requires it;
    - no duplicate live guidance root;
    - historical archive exclusion.
- [x] **P1-12** Complete `design.md`.
  - Required reasoning:
    - semantic precision for each directory role and intended reader;
    - one canonical path and no mirror under simple reliable control;
    - root adapters versus OpenSpec implementation center;
    - Agent/user/Engine responsibility boundary;
    - atomic migration and recovery unit;
    - OpenSpec CLI compatibility check for custom sibling directories;
    - path migration policy and test-scope policy.
- [x] **P1-13** Complete `tasks.md` and all project-required planning companions.
  - Required task properties:
    - dependency order is explicit;
    - plan-review and closeout-review markers are present when required;
    - `verification-plan.yaml` exists and uses accepted test classes;
    - `semantic-closure.yaml` exists with an honest status branch;
    - target edits occur only after Apply preflight;
    - actual completion commands and evidence locations are named.

### P1 exit check

- [x] OpenSpec status reports every requested P1 artifact as done or deliberately skipped by its own condition.
- [x] No target file outside the active change has been edited for migration.
- [x] Proposal scope still separates Change A from content pruning Change B.
- [x] Every claimed Modified capability was actually inspected.
- [x] Tasks contain independently observable completion criteria.
- [x] The tracker header advances to P2 only after all P1 completion facts are recorded.

## 7. P2 - Plan Review And Apply Readiness

**Status:** `done`

**Bounded outcome:** Agent-owned review finds the plan coherent, every finding is persisted as an ordinary task,
and the selected change passes deterministic plan-mode preflight before any target edit.

**Entry condition:** P1 exit check is complete.

### Tasks

- [x] **P2-01** Resolve the selected Change A status and read all completed planning artifacts as one coherent plan.
- [x] **P2-02** Obtain and read current `openspec/operations/change-feedback-loop.md` guidance from its current
  location at execution time.
- [x] **P2-03** Review capability ownership and confirm no topology rule is being duplicated across deltas.
- [x] **P2-04** Review every planned current/live consumer and ensure archive paths are excluded intentionally.
- [x] **P2-05** Review the target topology against OpenSpec CLI behavior; add a task if an extra `project/` layer
  is required by real CLI constraints.
- [x] **P2-06** Review `semantic-closure.yaml` semantically against planned changed surfaces.
- [x] **P2-07** Persist every review finding as an ordinary unchecked task with owner, smallest repair, and done
  condition.
- [x] **P2-08** Complete `openspec-feedback:plan-review` only after no open planning finding remains.
- [x] **P2-09** Run verification-routing plan mode and record PASS or its exact repair coordinate.
- [x] **P2-10** Run semantic-closure plan mode and record PASS or its exact repair coordinate.

### P2 exit check

- [x] Plan-review marker is complete exactly once.
- [x] No ordinary planning task remains incomplete before the first target edit.
- [x] Both required plan-mode governance checks pass.
- [x] The active change still resolves to the intended Change A.
- [x] `target_edits_authorized` in Current Position is changed to `true` only now.

## 8. P3 - Apply Change A: Topology Migration

**Status:** `done`

**Bounded outcome:** Current project guidance is moved into approved role-specific OpenSpec surfaces, every live
consumer uses the new canonical paths, and no long-lived duplicate root remains.

**Entry condition:** P2 exit check is complete and Apply guidance authorizes target work.

### 8.1 Pre-edit boundary

- [x] **P3-01** Record the change-scoped worktree boundary before edits.
- [x] **P3-02** Confirm unrelated user changes are identified and excluded from the migration diff.
- [x] **P3-03** Re-read the approved task order and select the first implementation task.

### 8.2 Create role-specific target surfaces

- [x] **P3-04** Create `openspec/constitution/` through approved file moves/additions.
- [x] **P3-05** Create `openspec/constitution/evolution/`.
- [x] **P3-06** Create `openspec/guidance/models/`.
- [x] **P3-07** Create `openspec/operations/`.
- [x] **P3-08** Establish a concise role/authority entry for each target surface if required by the approved design.

### 8.3 Move canonical guidance files

- [x] **P3-09** Move `guidelines/project-charter.md` to the approved constitution path.
- [x] **P3-10** Move the semantic-precision evolution direction.
- [x] **P3-11** Move the simple-control evolution direction.
- [x] **P3-12** Move the helper-oriented evolution direction.
- [x] **P3-13** Move the framework/runtime model.
- [x] **P3-14** Move the agentic execution model.
- [x] **P3-15** Move the workflow/Chain mechanism model.
- [x] **P3-16** Move the Queue mechanism model.
- [x] **P3-17** Move the Sub-agent/Work Unit mechanism model.
- [x] **P3-18** Move change-feedback-loop operation guidance.
- [x] **P3-19** Move command-experiments operation guidance.
- [x] **P3-20** Move logging-conventions operation guidance.
- [x] **P3-21** Replace the old guidance index with the approved `openspec/README.md` control map through a
  history-preserving move where practical.

### 8.4 Repair document-local contracts

- [x] **P3-22** Update frontmatter role, scope, `defers_to`, and sibling coordinates by document role.
- [x] **P3-23** Update internal Markdown links after nested moves.
- [x] **P3-24** Preserve constitution triad order and EWD 340 source-context requirements.
- [x] **P3-25** Ensure operations retain their real accepted-spec/executable routes instead of being forced into
  Charter-only peers.
- [x] **P3-26** Avoid Change B prose pruning except where a path or role statement must change for correctness.

### 8.5 Update current consumers

- [x] **P3-27** Update root `AGENTS.md`, `CLAUDE.md`, and `README.md` entry routes.
- [x] **P3-28** Update root `CONTEXT.md` canon links while preserving its non-authority boundary.
- [x] **P3-29** Update Harness `AGENTS.md`, `CLAUDE.md`, `README.md`, and `COMMANDS.md` routes.
- [x] **P3-30** Update `openspec/config.yaml` evolution, boundary, experiment, and feedback pointers.
- [ ] **P3-31** Update supported `.agents` apply/archive operation entries.
  - `skipped`: Change A closeout established that these existing skill assets were not migration targets;
    `openspec/config.yaml` delivers the current feedback operation guidance through `openspec instructions`.
- [ ] **P3-32** Update supported `.claude` apply/archive operation entries and preserve pair synchronization.
  - `skipped`: same bounded correction as P3-31; the existing entry sources remain unchanged and the
    configuration-delivered route is covered by finalizer conformance.
- [x] **P3-33** Update active/main accepted path contracts according to the approved delta/sync sequence.

### 8.6 Update deterministic regressions

- [x] **P3-34** Make constitution/guidance scans recursive and role-aware; keep operations under their owning
  focused contracts.
- [x] **P3-35** Update every focused current-path consumer test named in the approved tasks.

### P3 exit check

- [x] Every approved canonical file exists at exactly one current path.
- [x] Root `guidelines/` has no remaining supported current document.
- [x] No duplicate mirror or symlink was introduced.
- [x] Root/Harness entry routes still point Charter before Context.
- [x] Harness research-entry selection prose remains unchanged in behavior.
- [x] The actual diff remains inside Change A scope.
- [x] The tracker header advances to P4 only after migration tasks and their evidence are recorded.

## 9. P4 - Verify, Close, Sync, And Archive Change A

**Status:** `done`

**Bounded outcome:** The migrated topology passes focused regressions and project governance; Agent-owned
closeout has no open finding; applicable deltas are synced; the governed finalizer archives Change A.

### 9.1 Direct topology checks

- [x] **P4-01** Verify every target file exists at its approved canonical path.
- [x] **P4-02** Verify root `guidelines/` is absent or contains no supported current source, as specified.
- [x] **P4-03** Scan current/live surfaces for old `guidelines/` references using the approved bounded roots.
- [x] **P4-04** Confirm archived changes and excluded historical materials were not rewritten.
- [x] **P4-05** Validate internal Markdown links for moved documents and current consumers.

### 9.2 Focused regressions

- [x] **P4-06** Run the updated evolution-direction/constitution governance regression.
- [x] **P4-07** Run the updated agent-context-routing regression.
- [x] **P4-08** Run change-feedback finalizer/supported-entry conformance regressions.
- [x] **P4-09** Run verification-routing knowledge-surface regressions.
- [x] **P4-10** Run experiment terminology/knowledge-surface regressions.
- [x] **P4-11** Run any additional tests selected by the verification plan.

### 9.3 Project governance and semantic review

- [x] **P4-12** Run strict OpenSpec validation for Change A.
- [x] **P4-13** Run requirement traceability, main-spec structure, taxonomy, discovery, verification-routing
  assets, and semantic-closure assets in the project-required order.
- [x] **P4-14** Review the selected `semantic-closure.yaml` against the actual diff.
- [x] **P4-15** Review the change-scoped actual diff, artifacts, and selected evidence.
- [x] **P4-16** Add and complete ordinary repair tasks for every closeout finding.
- [x] **P4-17** Complete `openspec-feedback:closeout-review` only after a fresh no-finding review.

### 9.4 Sync and governed archive

- [x] **P4-18** Sync applicable delta specs to main specs through the supported Agent-owned route.
- [x] **P4-19** Re-compare delta and main semantics after sync and rerun affected checks.
- [x] **P4-20** Invoke the governed finalizer as the only final archive transition and record its success.

### P4 exit check

- [x] Change A no longer appears as active and resolves at its canonical archive location.
- [x] Governed finalizer output identifies success for the exact selected change.
- [x] All Change A OpenSpec tasks are complete.
- [x] Current live surfaces have no unsupported old guidance route.
- [x] Parent plan and this tracker link the archive evidence.
- [x] `target_edits_authorized` and `archive_authorized` are reset to `false` after completion.

## 10. P5 - Observe Change A And Decide Change B

**Status:** `done`

**Bounded outcome:** The team measures the post-migration reading experience and makes an explicit go/no-go
decision for content pruning and deterministic topology automation.

### Tasks

- [x] **P5-01** Record post-Change-A Charter line/word count.
  - `openspec/constitution/project-charter.md`: 379 lines / 3,165 words. Evidence: `E-010`.
- [x] **P5-02** Record fixed Charter + Context entry load.
  - Charter + `CONTEXT.md`: 866 lines / 6,194 words, versus the pre-Change-A 884-line baseline.
    The 18-line reduction is not a material shrink. Evidence: `E-010`.
- [x] **P5-03** Record root adapter sizes and duplicated definitions still observed.
  - Root `AGENTS.md` / `CLAUDE.md` / `README.md`: 72 / 72 / 66 lines; Harness equivalents:
    36 / 36 / 145 lines. The paired instruction files are intentionally synchronized, but the entry
    layer, Charter, control map, Context, and config still repeat core authority/route explanations.
- [x] **P5-04** Exercise at least one normal repository entry and one Harness-local entry against the new routes.
  - `tests/integration/md/agent-context-routing-contract.test.mjs` passes all six route assertions:
    root and Harness entries keep Charter -> Context before their respective routing surfaces.
- [x] **P5-05** Inspect whether `openspec/README.md` is functioning as a router or has become another glossary.
  - It is 165 lines / 2,160 words, contains a `Read in this order` sequence for 11 documents, a suite
    charter, role contract, and 20-term glossary. It is therefore a mixed router/glossary, not yet the
    short trigger router intended by Change B.
- [x] **P5-06** Inspect whether operation/model role selection is clear without reading every document.
  - Role roots are correct and their focused regressions pass, but the ordered 11-document list conflicts
    with the root adapter instruction to select only the relevant surface. A reader cannot rely on the
    control map alone to know that model/operation reads are demand-driven.
- [x] **P5-07** List concrete remaining duplication/automation candidates with their current owner.
  - Charter admission: `openspec/constitution/project-charter.md`; glossary ownership: `CONTEXT.md` and
    `openspec/guidance/models/agentic-execution-model.md`; lifecycle configuration: `openspec/config.yaml`;
    role/trigger route: `openspec/README.md`; structural assertions: focused tests under `tests/integration/md/`.
    Existing tests protect current paths, triad roles, and entry order, but do not express a bounded
    control-map-size/trigger shape, complete current-link validation, or a single reusable topology contract.
- [x] **P5-08** Decide whether Change B has enough bounded, current work to propose.
  - Yes. The current entry load, mixed control map, and identified deterministic gaps give a bounded
    content-ownership and topology-automation change independent of the completed migration.
- [x] **P5-09** Record one of:
  - `go`: proceed to P6 with an explicit Change B scope;
  - `no_go`: close the future work with a reason and re-entry trigger;
  - `blocked`: record the missing evidence or external state.
  - `go`: propose `prune-and-automate-project-guidance` to reduce mandatory entry load, make
    `openspec/README.md` a trigger router, assign one full owner to repeated meanings, and add only
    deterministic topology coverage. Excludes canonical path migration, Harness runtime behavior, and all
    `.agents/skills/**` and `.claude/skills/**` edits. Decision: `D-010`.

### P5 exit check

- [x] Decision is based on post-migration evidence, not the pre-migration assumption alone.
- [ ] `skipped`: no-go re-entry trigger is inapplicable because the recorded decision is `go` (D-010).
- [x] A go decision names a bounded Change B outcome and excludes topology rework already closed by Change A.

## 11. P6 - Change B: Prune And Automate Project Guidance

**Status:** `done`

**Bounded outcome:** Mandatory context is materially smaller, duplicate truth is removed, role-specific documents
are sharper, and deterministic topology facts are protected by focused checks without turning semantic
judgment into machine verdicts.

**Entry condition:** P5 records `go`.

### 11.1 Propose, polish, and review Change B

- [x] **P6-01** Scaffold `prune-and-automate-project-guidance` through OpenSpec CLI.
  - Change root: `openspec/changes/prune-and-automate-project-guidance/`. Evidence: `E-011`.
- [x] **P6-02** Perform fresh capability discovery against post-Change-A main specs.
  - Proposal records `governance/guidance-constitution` as Modified and four complete-path candidates as
    Verify-only; discovery and taxonomy checks pass. Evidence: `E-011`.
- [x] **P6-03** Write proposal, applicable deltas, design, tasks, verification plan, and semantic-closure record.
  - OpenSpec status is 4/4 complete; project-required `verification-plan.yaml` and
    `semantic-closure.yaml` are present. Evidence: `E-011`.
- [x] **P6-04** Define numeric before/after measurements without treating line count alone as quality.
  - Design requires before/after entry measurements plus ownership, route-preservation, and semantic-review
    evidence; it rejects a fixed word-count verdict. Evidence: `E-011`.
- [x] **P6-05** Perform the required selected-change proposal-polish pass immediately after Change B
  proposal artifacts are complete and before its Agent-owned plan review.
  - Completion: use `polish-openspec-change` when it is available at execution time; otherwise perform
    and record an equivalent scoped artifact-polish review. Convert every actionable finding into an
    ordinary unchecked repair task, complete those repairs, and rerun each affected planning
    validation/governance check.
  - Boundary: polish must not edit `.agents/skills/**` or `.claude/skills/**`; it supplements rather
    than replaces the plan and closeout reviews.
  - Evidence: `E-013`.
- [x] **P6-06** Complete Agent-owned plan review and persist findings as tasks.
  - Completion: no remaining actionable planning finding; the `openspec-feedback:plan-review` marker is
    complete exactly once. Evidence: `E-014`.
- [x] **P6-07** Pass verification-routing and semantic-closure plan preflight.
  - Completion: requirements, verification-routing plan, and semantic-closure plan checks pass after the
    completed review. Evidence: `E-014`.

### 11.2 Shrink mandatory surfaces

- [x] **P6-08** Apply the constitutional admission test to every Charter section.
- [x] **P6-09** Retain the minimal mandatory core: project nature, authority split, evidence honesty, OpenSpec
  lifecycle, and trigger router.
- [x] **P6-10** Move task-specific reference behind precise context pointers.
- [x] **P6-11** Reduce `openspec/README.md` to a role/trigger router.
- [x] **P6-12** Preserve root adapter behavior while removing repeated body text.

### 11.3 Deduplicate Context, config, models, and specs

- [x] **P6-13** Build a duplication map for Charter, Context, OpenSpec config, model canon, operations, and specs.
- [x] **P6-14** Assign one canonical owner to every repeated definition or rule.
- [x] **P6-15** Keep only compressed orientation or a trigger pointer at non-owning surfaces.
- [x] **P6-16** Remove directory/API facts that are cheap to inspect from the environment.
- [x] **P6-17** Preserve rationale only where config/code cannot explain why.

### 11.4 Deepen model and operation documents

- [x] **P6-18** Ensure each model answers one bounded reader question and has a normal reasoning stop point.
- [x] **P6-19** Evaluate Chain/Queue/Work Unit names and perform only justified semantic renames.
- [x] **P6-20** Separate logging behavior contracts from runtime-observability procedure.
- [x] **P6-21** Delete an operation/model document if its remaining interface provides no leverage.
- [x] **P6-22** Ensure every retained operation has trigger, ordered steps, completion criteria, and authority limit.

### 11.5 Automate deterministic topology facts

- [x] **P6-23** Check canonical path uniqueness.
- [x] **P6-24** Check role-specific frontmatter.
- [x] **P6-25** Check current internal links.
- [x] **P6-26** Check root/Harness adapter route order and synchronized blocks.
- [x] **P6-27** Check forbidden duplicate mirrors.
- [x] **P6-28** Check bounded current/live old-path references.
- [x] **P6-29** Confirm semantic quality, abstraction value, and research judgment remain Agent/human reviews.

### 11.6 Verify and archive Change B

- [x] **P6-30** Record before/after entry-load measurements and deleted duplicate meanings.
  - Evidence: `E-015` and archived Change B `apply-evidence.md` record the entry measurements, owner map,
    deleted duplicate meaning, and residual boundary.
- [x] **P6-31** Complete focused tests, governance checks, closeout review, and sync.
  - Evidence: Change B archived evidence records 39/39 selected integration tests, strict/asset/archive
    governance passes, a fresh no-finding closeout review, and delta/main re-comparison.
- [x] **P6-32** Complete governed finalization and record residual risks and future triggers without keeping
  Change B artificially active.
  - Evidence: `E-016`; residual semantic usefulness remains an Agent/human review boundary, and future
    guidance changes require a new bounded OpenSpec change.

### P6 exit check

- [x] Change B is archived through the governed finalizer.
- [x] Mandatory entry load is smaller without losing required route behavior.
- [x] Deterministic topology rules have executable protection.
- [x] Semantic design review has not been converted into a checkbox-only or Engine verdict system.

## 12. P7 - Close The Backlog Plan

**Status:** `done`

**Bounded outcome:** The planning records accurately state what shipped, what did not ship, and where durable
authority/evidence now lives; active plan indexes no longer claim unfinished work.

### Tasks

- [x] **P7-01** Confirm Change A archive evidence is linked in both parent and progressive plans.
- [x] **P7-02** Confirm Change B is either archived or has an explicit no-go/blocked closure with re-entry trigger.
- [x] **P7-03** Reconcile every unchecked task: complete it, record a deliberate skip, or carry it into a named
  new plan/change.
  - Completed work has no unchecked ordinary task. P3-31 and P3-32 remain explicitly `skipped` under D-009
    because stable `.agents` and `.claude` entries are intentionally not edit targets; the P5 no-go branch
    remains explicitly `skipped` under D-010 because the recorded decision was `go`.
- [x] **P7-04** Write a concise final outcome summary in the parent plan.
- [x] **P7-05** Set this tracker's header to `done`, with no active checkpoint or blocker.
- [x] **P7-06** Move the parent plan to `_backlog/_done/_closed_plans/` without renaming it.
- [x] **P7-07** Move this progressive plan to `_backlog/_done/_closed_plans/` without renaming it.
- [x] **P7-08** Remove the active entry from `_backlog/plans/README.md`.
- [x] **P7-09** Add closure entries to `_backlog/_done/_closed_plans/README.md` and update the done index/count
  required by backlog conventions.
- [x] **P7-10** Verify no active plan points to the old active locations as current state.

### P7 exit check

- [x] Active plan index no longer lists this work.
- [x] Closed-plan indexes identify the completion or honest terminal boundary.
- [x] No unfinished task exists only in chat; P3-31/P3-32 and the P5 no-go line are explicit skipped branches
  under D-009/D-010.
- [x] Current behavior claims are limited to archived changes and recorded verification evidence.

## 13. File-Move Tracking Matrix

Do not check a row until the canonical move, internal link repair, and owning focused verification are all
complete.

| ID | Current source | Proposed current target | Status | Evidence |
|---|---|---|---|---|
| F-01 | `guidelines/README.md` | `openspec/README.md` | done | E-009 |
| F-02 | `guidelines/project-charter.md` | `openspec/constitution/project-charter.md` | done | E-009 |
| F-03 | `guidelines/evolution-abstraction-semantic-precision.md` | `openspec/constitution/evolution/abstraction-semantic-precision.md` | done | E-009 |
| F-04 | `guidelines/evolution-simple-reliable-control.md` | `openspec/constitution/evolution/simple-reliable-control.md` | done | E-009 |
| F-05 | `guidelines/evolution-helper-oriented-agent.md` | `openspec/constitution/evolution/helper-oriented-agent.md` | done | E-009 |
| F-06 | `guidelines/framework-runtime-boundary.md` | `openspec/guidance/models/framework-runtime-boundary.md` | done | E-009 |
| F-07 | `guidelines/agentic-execution-model.md` | `openspec/guidance/models/agentic-execution-model.md` | done | E-009 |
| F-08 | `guidelines/agentic-workflow-mechanism.md` | `openspec/guidance/models/agentic-workflow-mechanism.md` | done | E-009 |
| F-09 | `guidelines/agentic-queue-mechanism.md` | `openspec/guidance/models/agentic-queue-mechanism.md` | done | E-009 |
| F-10 | `guidelines/agentic-subagent-mechanism.md` | `openspec/guidance/models/agentic-subagent-mechanism.md` | done | E-009 |
| F-11 | `guidelines/change-feedback-loop.md` | `openspec/operations/change-feedback-loop.md` | done | E-009 |
| F-12 | `guidelines/command-experiments.md` | `openspec/operations/command-experiments.md` | done | E-009 |
| F-13 | `guidelines/logging-conventions.md` | `openspec/operations/logging-conventions.md` | done | E-009 |

The final target paths remain subject to the accepted Change A design and real OpenSpec CLI constraints. If a
path changes, update the parent plan, this matrix, delta specs, tasks, and consumers together.

## 14. Consumer Tracking Matrix

| ID | Consumer group | Required outcome | Status | Evidence |
|---|---|---|---|---|
| C-01 | Root `AGENTS.md` / `CLAUDE.md` | New Charter -> root Context route, paired semantics preserved | done | E-009, E-010 |
| C-02 | Root `README.md` | New route before scoped directory selection | done | E-009, E-010 |
| C-03 | Root `CONTEXT.md` | New canon links, glossary non-authority preserved | done | E-009, E-010 |
| C-04 | Harness `AGENTS.md` / `CLAUDE.md` | Parent Charter -> Context route, synchronized block | done | E-009, E-010 |
| C-05 | Harness `README.md` / `COMMANDS.md` | New guidance links, research entry behavior unchanged | done | E-009, E-010 |
| C-06 | `openspec/config.yaml` | All current guidance pointers use approved paths/order | done | E-009 |
| C-07 | Main/active specs | Accepted path requirements match approved topology | done | E-009 |
| C-08 | `.agents` operation skills | Apply/archive obtain current operation guidance | done | E-009; config-delivered guidance, sources unchanged |
| C-09 | `.claude` operation entries | Same supported route and selected-change identity | done | E-009; config-delivered guidance, sources unchanged |
| C-10 | Constitution regression | Recursive role-aware hierarchy and triad | done | E-009, E-010 |
| C-11 | Context-routing regression | All six entry surfaces retain ordering/boundaries | done | E-009, E-010 |
| C-12 | Feedback finalizer regression | Supported entry inventory and operation path converge | done | E-009 |
| C-13 | Experiment/verification regressions | Knowledge pointers resolve to current operations | done | E-009 |
| C-14 | Live-reference scan | No unsupported old path outside explicit exclusions | done | E-009 |

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
| E-009 | 2026-08-10 | Change A archive | Governed finalizer / archived task record | `openspec/changes/archive/2026-08-10-centralize-project-guidance-under-openspec/`; all archive task checkboxes complete |
| E-010 | 2026-08-10 | Post-Change-A observation | Current live entry/config/control-map files plus focused route regressions | Charter 379/3,165; Charter + Context 866/6,194; current six-entry route regression 11/11 pass; Change B `go` basis |
| E-011 | 2026-08-10 | Change B proposal | Active change planning artifacts and plan-mode governance | `openspec/changes/prune-and-automate-project-guidance/`; OpenSpec 4/4 complete, strict validation, requirements plan, discovery, taxonomy, verification-routing plan, and semantic-closure plan PASS |
| E-012 | 2026-08-10 | Change B tracker and planning-artifact update | User-directed proposal-polish policy | Every future tracker change schedules polish after proposal and before plan review; Change B has the formal task/design sequence, while no historical Change A polish is claimed |
| E-013 | 2026-08-10 | Change B proposal polish | Equivalent scoped artifact-polish review because the named workflow was unavailable | Reviewed proposal, GCO-008 delta, design, tasks, verification plan, semantic-closure record, and feedback guidance; repaired the polish ordering, then strict validation, requirements plan, discovery, taxonomy, verification-routing plan, and semantic-closure plan PASS |
| E-014 | 2026-08-10 | Change B plan review and preflight | Selected planning artifacts, current configuration-delivered Apply guidance, worktree boundary, and plan-mode checks | No open actionable planning finding; exactly one plan-review marker is complete; strict validation, requirements plan, discovery, taxonomy, verification-routing plan, and semantic-closure plan PASS; only tracker/design/tasks are modified |
| E-015 | 2026-08-10 | Change B Apply simplification and topology regression | Selected target guidance, root/Harness entries, and seven selected integration suites | Charter 379/3,165 -> 100/621; Context 487/3,029 -> 74/629; control map 165/2,160 -> 52/535; config 335/2,233 -> 217/1,473; config-delivered operation guidance remains valid; 39/39 selected integration tests PASS; see `apply-evidence.md` |
| E-016 | 2026-08-10 | Change B governed archive | `finalize-change-archive.mjs` structured result | Archived as `2026-08-10-prune-and-automate-project-guidance` at `openspec/changes/archive/2026-08-10-prune-and-automate-project-guidance/`; all 11 finalizer checks passed |

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
| D-009 | 2026-08-10 | Preserve `.agents/skills/**` and `.claude/skills/**` unchanged; deliver project-specific feedback lifecycle guidance through `openspec/config.yaml` | implemented in Change A | A supported entry contract requires a distinct source change |
| D-010 | 2026-08-10 | P5 records `go` for bounded Change B `prune-and-automate-project-guidance` | active | OpenSpec proposal discovery finds no viable bounded scope or accepted-spec ownership blocks the change |
| D-011 | 2026-08-10 | Every tracker change requires a selected-change polish pass after proposal completion and before plan review or Apply | active | A future proposal is completed without a formal polish task, or the named workflow and an equivalent scoped review are both unavailable |
| D-012 | 2026-08-10 | Retain the detailed models and operation procedures as their bounded canonical owners; simplify mandatory entry surfaces and make those owners demand-driven instead | implemented in Change B Apply | A future reader-boundary review shows a document lacks a bounded question, normal stop, or authority limit |
| D-013 | 2026-08-10 | Close the two-change guidance-centralization plan after both governed archives and indexed plan closure | implemented | A future guidance, topology, or ownership change needs a new bounded plan/change |

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
| 2026-08-10 | P1 -> P4 | Change A planned, applied, verified, synced, and finalized; a closeout repair retained existing lifecycle skill sources and moved project-specific operation delivery to config | E-009 | Observe migration before deciding Change B |
| 2026-08-10 | P5 -> P6 | Measured current entry load and routes; recorded `go` for bounded content pruning and deterministic topology automation | E-010, D-010 | P6-01: scaffold Change B through OpenSpec CLI |
| 2026-08-10 | P6 proposal | Scaffolded Change B and completed proposal, GCO-008 delta, design, tasks, verification plan, and semantic-closure record; plan-mode structure checks pass | E-011 | P6-05: proposal polish before plan review or target edits |
| 2026-08-10 | P6 tracker | Established the mandatory post-proposal polish rule and moved Change B polish ahead of plan review; no historical Change A polish is claimed | E-012, D-011 | P6-05: proposal polish before plan review or target edits |
| 2026-08-10 | P6 proposal polish | Completed an equivalent scoped artifact-polish review, repaired the task/design sequence, and reran affected planning checks | E-013 | P6-06: Agent-owned plan review before any target edit |
| 2026-08-10 | P6 plan review | Completed the feedback-lifecycle plan review and all plan preflight checks with no open finding; Apply has not been requested | E-014 | Await explicit Apply entry, then P6-08 |
| 2026-08-10 | P6 Apply | Narrowed Charter/Context/control-map/config prompt context, retained model/operation owners, added topology coverage, and passed all selected integration regressions | E-015, D-012 | P6-30: record final measurements and begin governance/closeout/sync |
| 2026-08-10 | P6 -> P7 | Synced GCO-008, closed the finalizer-task self-block, passed fresh closeout and archive checks, and archived Change B through the governed finalizer | E-016, D-013 | P7-06: move both completed plans and update backlog indexes |
| 2026-08-10 | P7 closure | Moved both completed plans to `_closed_plans/`, removed the active-plan row, and added CLS-056/CLS-057 with updated done count | E-016, D-013 | P7-10: verify no active pointer remains |
| 2026-08-10 | P7 done | Verified both new closed-plan paths, their local links, the closed/done indexes, and the absence of an active-plan pointer | E-016, D-013 | none; plan closed |

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
