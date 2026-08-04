---
title: BUG-187-199 systemic remediation plan
status: p1_c1_openspec_artifacts_in_progress
current_stage: P1
created: 2026-08-04
revised: 2026-08-04
source_bugs: BUG-187, BUG-188, BUG-189, BUG-190, BUG-191, BUG-192, BUG-193, BUG-194, BUG-195, BUG-196, BUG-197, BUG-198, BUG-199
current_execution_model: chain_queue_work_unit
active_change: materialize-wave0-submitted-references-and-batch-projections
active_change_status: proposal_complete_specs_design_tasks_pending
target_code_authorization: not_authorized
---

# BUG-187-199 Systemic Remediation Plan

> Status: P1 active planning. C1 now has the active OpenSpec change
> [`materialize-wave0-submitted-references-and-batch-projections`](../../openspec/changes/materialize-wave0-submitted-references-and-batch-projections/)
> with `proposal.md` complete; `specs`, `design`, and `tasks` remain pending.
> This document still does not authorize target-code edits.
>
> Progress: P1 admission evidence is sufficient for C1 proposal work; its
> specification/design/task artifacts are now being developed.
> A stage moves only when its required artifact or evidence exists; individual
> checkboxes are not completion claims for work merely begun.
>
> Scope: turn thirteen incident cards into the smallest set of independently
> reviewable system changes, while preserving the distinction between a proven
> deterministic defect, an Agent-flow observation, and a host UX limitation.

## 1. Current Decision

Do not repair these cards one by one. The current triage produces four bounded
OpenSpec change candidates and two evidence tracks:

| Route | Cards | Current disposition | Next admission fact |
| --- | --- | --- | --- |
| C1. Wave0 submitted-evidence materialization at scale | [BUG-189](../bugs/BUG-189-shared-ref-count-floor-delegated-bypass.md), [BUG-191](../bugs/BUG-191-wave0-projection-ordinal-scaling.md) | Active OpenSpec change; proposal complete for the deterministic contract contradiction and impractical O(N) Agent input. | Delta specs, design, verification plan, and approved task list. |
| C2. Direct Agent contract feedback | [BUG-190](../bugs/BUG-190-source-identity-kind-naming-obscure.md), [BUG-194](../bugs/BUG-194-wave1-assignment-mode-payload-location.md), conditionally [BUG-195](../bugs/BUG-195-wave1-source-claims-cache-trail-refs-missing.md) | Deterministic feedback is too opaque; BUG-195 needs current real delivery evidence before changing a task contract that current head may already generate. | Exact current rejection payloads and, for BUG-195, a retained generated `task.md` from a real attempt. |
| C3. Traceable Final delivery | [BUG-199](../bugs/BUG-199-synthesis-no-evidence-citations.md) | Final delivery can claim evidence backing without a machine-checkable link to submitted evidence. | The current final-persist boundary and a minimal declared key-finding surface. |
| C4. Legible HITL1 capability probe | [BUG-187](../bugs/BUG-187-hitl1-capability-probe-opaque-to-user.md) | A valid capability probe is confusing because its purpose and result are not presented as a stable user-facing contract. | The controllable Markdown/Agent-facing output boundary, distinct from host-rendered tool logs. |
| E1. Host wait visibility | [BUG-188](../bugs/BUG-188-subagent-wait-no-progress-visibility.md), [BUG-193](../bugs/BUG-193-wave1-subagent-wait-no-progress-sibling.md) | Host/TUI observation; BUG-193 is a Wave1 duplicate of BUG-188, not a second framework root. | A selected-host capability observation showing whether wait can render progress without violating `stop: no`. |
| E2. Current-head real Actor requalification | [BUG-192](../bugs/BUG-192-degraded-gate-triggers-de-facto-hitl.md), [BUG-198](../bugs/BUG-198-phase-agent-direct-search-no-subagent.md), replay [BUG-195](../bugs/BUG-195-wave1-source-claims-cache-trail-refs-missing.md)/[BUG-196](../bugs/BUG-196-work-done-receipt-no-status-transition.md)/[BUG-197](../bugs/BUG-197-wave1-queue-blocks-reenqueue-after-failure.md) | Historical Actor behavior must not be converted into a new controller or status from static code alone. | An explicitly authorized, readable current-head bundle and bounded `agent_flow_e2e` observation. |

The routes are deliberately not all implementation work. C1 is an active
proposal; C2-C4 may become separate proposals when their admission facts are
captured. E1 and E2 are
investigation tracks with explicit terminal outcomes; neither creates a standing
run, retry loop, scheduler, or OpenSpec change by itself.

## 2. Completed Triage Baseline

- [x] Read and group BUG-187 through BUG-199 by authority owner rather than by
  visible symptom.
- [x] Confirm that `openspec list --json` had no active change before C1 was
  created on 2026-08-04.
- [x] Create the C1 OpenSpec change
  [`materialize-wave0-submitted-references-and-batch-projections`](../../openspec/changes/materialize-wave0-submitted-references-and-batch-projections/)
  and its proposal. `openspec status --change` reports `proposal: done`, with
  `specs` and `design` ready and `tasks` blocked on those artifacts.
- [x] Separate the proven Wave0 evidence/projection gap from the historical
  Wave1 failure cascade and the host wait presentation issue.
- [x] Run the P1 C1 focused current-head checks on 2026-08-04:
  `work-unit-assignment-contract` passed 10/10 and the Wave0 gate suite passed
  23/24 relevant subtests, including the submitted contribution and 19-to-20
  ordinal cases. This proves deterministic contract behavior only, not real
  Actor behavior.
- [ ] Classify the observed unrelated regression before relying on a full Wave0
  gate green result: `check-gate-wave0-complete` expects
  `wave0_work_unit_submission_presence.repair_kind=missing_contract`, while
  current output is `engine_operation` (the failing subtest is 1d). Do not fold
  this expectation drift into C1 without identifying its direct contract owner.
- [x] Record the present current-head facts that constrain later proposals:
  generated work-unit contracts contain `cache_trail_refs`; post-`work_done`
  semantic failures can become `fail_and_replace`; failed attempts have a
  replacement-successor path; and Phase-Agent direct research search is already
  prohibited by the phase contracts.

## 3. Shared Design Admission Rules

Every candidate below must pass this review order before it enters
`/opsx:propose`:

1. **Semantic precision.** State the reader, bounded question, necessary
   distinctions, and normal reasoning stop point required by
   [Abstraction as Semantic Precision](../../guidelines/evolution-abstraction-semantic-precision.md).
2. **Shortest correct control loop.** Identify the direct authority, one
   deterministic check, smallest actionable root cause, and one legal next
   action under [Simple Reliable Control](../../guidelines/evolution-simple-reliable-control.md).
3. **Action responsibility.** Keep new semantic/risk decisions with the user,
   ordinary legal mechanical work with the Agent, and deterministic judgment
   with the Engine, per
   [Helper-Oriented Agent](../../guidelines/evolution-helper-oriented-agent.md).
4. **Evidence discipline.** Deterministic fixtures may prove Engine behavior;
   Actor, host, search, and continuation claims require retained real execution
   evidence. Do not make a fixture, a tool configuration, or a chat transcript
   stand in for the other proof class.

The following proposals are rejected unless new evidence changes the analysis:

- A broad rewrite of Chain, Queue, Work Unit, or the research phase flow.
- A second authority path for Phase-Agent-authored evidence, a projection, or a
  final report.
- A generic host watcher, scheduler, chat observer, automatic retry tree, or
  third interaction checkpoint.
- A new `work_done` lifecycle status that merges an Actor's declaration of
  completion with the Engine's acceptance at submit.
- A Final Gate named `check-gate-final-complete`; Final intentionally has
  `gate: null`.

## 4. Progressive Tracking

| Stage | Outcome | Status |
| --- | --- | --- |
| P0 | Triage, current-head contract check, and route separation. | Complete |
| P1 | Capture admission facts and complete proposal artifacts only where a bounded deterministic or user-facing contract root exists. C1 proposal is complete; its specs/design/tasks remain in progress. | In progress |
| P2 | Stabilize submitted-evidence and feedback contracts through accepted C1/C2 work before applying C3 against their backing surfaces. | Pending |
| P3 | Activate E1/E2 only with a selected host or an explicitly authorized real bundle; classify each result before proposing code. | Pending |
| P4 | Archive accepted changes, update each bug card with its final disposition, and move this plan only when every route has a terminal outcome. | Pending |

## 5. C1: Wave0 Submitted-Evidence Materialization At Scale

**System question:** Can a maintainer determine that every source in a submitted
Wave0 contribution has legal phase coverage without asking the Phase Agent to
author authority-bearing evidence files or hand-write one projection entry per
source?

**Direct authority:** the submitted ledger row together with its submitted
`source.yaml` and cache/provenance facts. A phase-owned materialized reference
or an Engine-expanded projection is a derived output, never a replacement
authority.

**Why these cards share one root:** BUG-189 exposes a contradiction: Wave0
guidance asks for `reference/00-shared-*`, while the generated delegated contract
admits only `source_yaml` as required output. BUG-191 exposes the complementary
scaling failure: the system correctly preserves per-source identity, but gives
the Agent an O(N) manual packet to express a batch deferred disposition.

**Candidate shape:** extend the existing Phase-owned backed-reference
materialization model to Wave0, using submitted Wave0 facts as the only source
of evidence authority. Add a mechanical batch-expansion path for a deferred
disposition so Agent input can be O(1), while the persisted coverage remains
identity-complete per source ordinal.

**Must preserve:**

- Submitted-work provenance and source identity/ordinal distinctions.
- The submitted ledger, not a filesystem-only Phase-Agent file, as Gate
  coverage authority.
- Per-source coverage after expansion; a batch instruction is input compression,
  not a relaxation of `return_map` completeness.
- One shared evaluator/check path for materialization, inspection, and the Wave0
  Gate where they decide the same fact.

**Must not do:** count arbitrary files under `reference/`; allow the Phase Agent
to create a parallel evidence authority; weaken the coverage floor; or replace
identity-bound deferred records with a vague work-unit-level acknowledgement.

**Tracking:**

- [x] Establish that BUG-189 is a deterministic instruction/contract mismatch,
  not a missing research artifact.
- [x] Establish that BUG-191 is an Agent-input scaling problem, not evidence for
  dropping individual source coverage.
- [x] Capture and execute the current-head fixture already retained in
  `tests/integration/cli/check-gate-wave0-complete.test.mjs`: one submitted
  Wave0 contribution owns ordinals `1..19`, a later legal contribution owns
  `/20`, and each identity currently requires an explicit projection entry or
  deferred disposition.
- [x] Create the C1 proposal describing the submitted-backing materialization
  and batch-deferred direction, without authorizing implementation.
- [ ] In C1 delta specs and design, state the exact materialization writer,
  input facts, output projection, collision/idempotence rule, and failure
  feedback.
- [ ] In C1 delta specs and design, state the batch-deferred input grammar and
  prove its deterministic, identity-complete expansion without adding
  persistent duplicate truth.
- [ ] Add C1 acceptance and verification cases for backed materialization,
  batch expansion, duplicate identity rejection, filesystem-only rejection,
  and idempotent rerun.
- [ ] After approval, apply only the accepted C1 task list; verify focused
  deterministic tests and one real bounded Actor observation if that evidence is
  separately authorized.
- [ ] Archive C1, update BUG-189/BUG-191 with concrete evidence, and reassess
  C3's final-backing assumptions.

## 6. C2: Direct Agent Contract Feedback

**System question:** When an Engine checkpoint rejects a packet or delegated
result, can the Agent identify the exact direct fact, legal write location, and
same-check rerun without reverse-engineering schemas or guessing vocabulary?

**Direct authority:** the existing schema and assignment/work-unit contracts.
The change is an Agent-facing interpretation of their deterministic lineage, not
a second validator or a new repair controller.

**Candidate scope:**

- BUG-190: report the precise JSON Pointer and valid discriminator values for
  `source_identity.kind`.
- BUG-194: report `payload.assignment_mode`, its allowed values, and the
  enqueue rerun boundary.
- BUG-195: only if a current real generated `task.md` omits the per-claim
  `cache_trail_refs` requirement. If current task generation already carries it,
  preserve the card as an Actor-delivery/requalification observation instead of
  changing schema or validator behavior.

**Must preserve:** `submitted_work` remains distinct from merely claimed
`work_unit`; changing it to a vague alias would erase the provenance distinction
the field currently answers. Feedback should use existing contract data and
state the owner/terminal boundary when no legal repair path exists.

**Must not do:** rename or alias the discriminator merely to match a familiar
term; infer missing cache bindings from unrelated disk contents; make Markdown
formatting a blocker; or create one new feedback implementation per caller.

**Tracking:**

- [x] Identify opaque error feedback, rather than schema invalidity, as the
  direct root for BUG-190 and BUG-194.
- [x] Verify the current generated contract includes `cache_trail_refs`; BUG-195
  remains conditional until a fresh generated-task observation says otherwise.
- [ ] Save exact current rejection JSON for the discriminator and Wave1 enqueue
  cases, including the legal repair surface and rerun command.
- [ ] Decide whether existing static contract metadata can produce the feedback
  without a second rule source; record the answer in a C2 proposal.
- [ ] If BUG-195 activates, retain the failing `task.md`, result receipt, and
  dry-submit response before proposing the narrowest delivery-contract change.
- [ ] Specify focused positive and negative checks for path, enum, owner, and
  same-check rerun feedback, including prerequisite short-circuit behavior.
- [ ] After approval, apply and archive C2; mark BUG-195 fixed only with fresh
  real Actor evidence or leave it routed to E2.

## 7. C3: Traceable Final Delivery

**System question:** Before final delivery is persisted, can a reader trace each
declared key finding to a legal, submitted backing surface without asking the
Engine to judge the prose's truth or quality?

**Direct authority:** declared key-finding references plus their resolved paths
and submitted backing. The check may validate reference shape, path existence,
and submitted provenance; semantic adequacy remains an Agent/human judgment.

**Candidate shape:** define a minimal, explicit key-finding surface at the
existing final-persist boundary and run one deterministic citation/backing check
before the final file is accepted. This is delivery validation, not a new
lifecycle Gate and not a report-wide regex scan for every sentence.

**Must preserve:** Final's terminal non-interactive role; `gate: null`; the
distinction between a `reference/` projection and submitted evidence authority;
and exclusion or honest labeling of failed-work diagnostic artifacts.

**Must not do:** add `check-gate-final-complete`; treat any existing file path as
evidence; infer a finding's citation from nearby prose; or claim that a citation
proves a semantic conclusion is correct.

**Tracking:**

- [x] Establish that the zero-citation Final report is a separate delivery
  defect, not evidence that the `reference/` directory should contain every
  source.
- [ ] Locate the exact final-persist acceptance boundary and choose the smallest
  declared key-finding representation that lets a reader stop at one traceable
  answer.
- [ ] Define accepted backing surfaces and the submitted-ledger/provenance rule;
  explicitly reject failed/unsubmitted artifacts as Final evidence authority.
- [ ] Write a C3 proposal that shows why a pre-persist check is sufficient and
  why a Final Gate or content-quality validator is not.
- [ ] Specify focused tests for zero citation, missing path, unsubmitted backing,
  valid backing, and a citation that is structurally valid but semantically not
  judged by the Engine.
- [ ] Apply only after C1/C2 have stabilized any affected backing contracts;
  archive C3 and update BUG-199 with a retained delivery example.

## 8. C4: Legible HITL1 Capability Probe

**System question:** Can a user understand that the neutral search/fetch action
at HITL1 exit is a bounded capability check rather than unrelated research or a
new decision request?

**Direct authority:** the existing HITL1 capability-probe procedure and its
recorded result. The user-facing explanation is a Markdown/Agent-flow contract;
it does not become a new runtime truth owner.

**Candidate shape:** add one fixed neutral probe query, a short non-decision
notice before the probe, and a concise result after it. The wording must make
clear that the check is about research access and does not ask the user to take
action.

**Must preserve:** `research_access` remains where current accepted contracts
place it until a separate authority analysis justifies a move; HITL1 remains the
same decision checkpoint; and a host's compulsory tool-call rendering remains a
host fact rather than a promise the framework can suppress.

**Must not do:** add an interaction mode, move infrastructure observations into
a new status/diagnostic authority merely for presentation, expose fallback
internals as the normal success message, or promise a duration/host capability
the framework cannot control.

**Tracking:**

- [x] Identify the stable UX root: the probe is valid, but its purpose and
  outcome are not legible as one bounded action.
- [ ] Identify which notice/result text is controlled by the phase Markdown and
  which visual output is forced by the selected host.
- [ ] Write a C4 proposal with the fixed query, notice, success/unavailable
  result, and the no-new-decision rule.
- [ ] Verify the revised control surface against a retained real HITL1
  observation when a run is separately authorized; static Markdown inspection
  alone cannot prove host rendering behavior.
- [ ] Archive C4 and classify any remaining raw tool-log visibility as a host
  residual rather than a framework regression.

## 9. E1: Host Wait Visibility

BUG-193 is retained as a cross-phase reproduction of BUG-188, but it is not a
separate implementation candidate. Current evidence says the Engine can inspect
progress and avoids timing out active work; the observed failure is a static
host `agent_wait` display while the Phase Agent cannot issue another tool call.

`stop: no` also prohibits the proposed user-facing progress updates. A static
"Waiting" affordance is therefore host/TUI-owned unless the selected host offers
a legal non-interactive progress surface.

**Tracking:**

- [x] Deduplicate BUG-193 under BUG-188 while preserving it as Wave1 evidence.
- [x] Establish that the reported wait self-recovers after a sub-agent finishes;
  it is not evidence of an Engine deadlock.
- [ ] Obtain a selected-host capability record: blocking/non-blocking wait,
  progress event delivery, and whether rendered progress is visible without a
  user-facing Phase-Agent message.
- [ ] Run one bounded host observation only under a fresh explicit budget and
  evidence objective; retain the host/version/mode and native display result.
- [ ] If the host exposes a suitable surface, open a host-integration-scoped
  proposal only after identifying the authoritative progress facts.
- [ ] If it does not, record `host UX residual`, close this track without a DPT
  controller, and do not weaken silent execution to simulate progress.

## 10. E2: Current-Head Real Actor Requalification

This track prevents historic execution behavior from becoming invented Engine
mechanisms. It covers the degraded false-choice/direct-search observations in
BUG-192 and BUG-198, and replays BUG-195/196/197 because current static contracts
already contain targeted behavior that differs from the incident report.

The current model distinguishes an Actor's `work_done` receipt from Engine
acceptance at submit. Do not add a `work_done` status: it would conflate those
two questions. Likewise, current contracts already prohibit direct Phase-Agent
research search and provide failed-attempt replacement; do not add a chat
observer, scheduler, hidden controller, or generalized degraded-mode path unless
fresh evidence identifies a missing deterministic handoff/context fact.

**Required evidence package:** exact generated `task.md`; relevant
`runtime-receipt.jsonl`; dry-submit JSON before and after `work_done`; fail and
replacement JSON; Phase-entry rendering; host/tool transcript; bundle trace;
and the selected host/version/mode. The observation must be a bounded,
authorized `agent_flow_e2e` run, not a hand-written fixture.

**Tracking:**

- [x] Record current-head static facts that make the historical BUG-195/196/197
  interpretation insufficient for a new change.
- [x] Record that BUG-192/198 involve Actor behavior under degraded context, not
  proof that an Engine transition is missing.
- [ ] Obtain explicit authorization for one readable, disposable current-head
  bundle and a narrow `agent_flow_e2e` evidence objective.
- [ ] Capture the complete evidence package without hand-editing receipts,
  status, ledger, cache, or task outputs.
- [ ] Classify the first terminal result: deterministic missing fact,
  Agent-contract delivery gap, host capability boundary, or no reproduction.
- [ ] Open one focused proposal only for a proven deterministic/missing-contract
  root. Otherwise record the terminal observation against the affected card(s).
- [ ] Re-run the same bounded observation after any accepted fix; do not widen
  into a background canary program or claim Actor success from fixture tests.

## 11. Sequencing And Closure

The intended order is C1 and C2 first, C4 independently whenever its
presentation boundary is established, and C3 only after source/backing contracts
are stable enough to name its legal citations. E1 and E2 remain dormant until
their explicit activation conditions are met; they do not block deterministic
proposals that already have direct roots.

This plan closes only when every route has one of these terminal dispositions:

- an archived OpenSpec change with retained verification evidence;
- a rejected proposal with the direct reason recorded;
- a real observation classified as host/Actor residual with no missing framework
  contract; or
- a successor plan that names a newly discovered independent root.

Before closure:

- [ ] Update each BUG-187-199 card with its final route, evidence boundary, and
  fixed/rejected/residual disposition.
- [ ] Confirm no active OpenSpec change remains incomplete for a route marked
  resolved.
- [ ] Move this plan to `_backlog/_done/_closed_plans/` and update both plan
  indexes only after all routes above are terminal.
