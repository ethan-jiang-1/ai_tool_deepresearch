---
title: BUG-187-199 systemic remediation plan
status: closed_2026-08-05
current_stage: P4
created: 2026-08-04
revised: 2026-08-05
source_bugs: BUG-187, BUG-188, BUG-189, BUG-190, BUG-191, BUG-192, BUG-193, BUG-194, BUG-195, BUG-196, BUG-197, BUG-198, BUG-199
current_execution_model: chain_queue_work_unit
active_change: null
active_change_status: none_c1_c2_c3_c4_archived_2026-08-05
completed_change: surface-actionable-contract-feedback
completed_change_status: archived_2026-08-04
previous_completed_change: traceable-final-delivery-backing
previous_completed_change_status: archived_2026-08-04
earlier_completed_change: materialize-wave0-submitted-references-and-batch-projections
earlier_completed_change_status: archived_2026-08-04
target_code_authorization: no_active_change_target_edits
---

# BUG-187-199 Systemic Remediation Plan

> Status: Closed 2026-08-05. C1 is archived as
> [`2026-08-04-materialize-wave0-submitted-references-and-batch-projections`](../../openspec/changes/archive/2026-08-04-materialize-wave0-submitted-references-and-batch-projections/).
> Its strict validation, main-spec sync, closeout review, and governed archive
> transition are complete. C3 is archived as
> [`2026-08-04-traceable-final-delivery-backing`](../../openspec/changes/archive/2026-08-04-traceable-final-delivery-backing/)
> after apply, accepted-spec sync, strict validation, governance, feedback
> closeout, and the governed archive transition all passed.
> C2 is archived as
> [`2026-08-04-surface-actionable-contract-feedback`](../../openspec/changes/archive/2026-08-04-surface-actionable-contract-feedback/)
> after deterministic verification, main-spec sync, feedback closeout, and the
> governed archive transition all passed.
> C4 is archived as
> [`2026-08-05-legible-hitl1-capability-probe`](../../openspec/changes/archive/2026-08-05-legible-hitl1-capability-probe/)
> after implementation, accepted-spec sync, strict validation, governance,
> closeout, and the governed archive transition all passed.
>
> Progress: focused deterministic C1/C2 evidence is retained, including the
> source-only actor contract, submitted-backing convergence, batch deferred
> expansion, and actionable retained-input feedback. E1 is classified as a host
> UX residual. E2 now has one authorized current-head real-Actor replay: the
> native case result passed its five deterministic checks, while the host
> Supervisor separately timed out before native completion and remains recorded
> as `lifecycle_outcome: ERROR`. The replay requalified BUG-195/196/197 only;
> it does not cover degraded Wave0-to-Wave1 handoff or direct Wave2 search.
> A separate current-head case-232 observation reached the real Wave2 node but
> was honestly finalized `NOT_RUN` because the selected host provided no real
> external search capability. E2 is now classified as terminal host/Actor
> residual with no admitted framework change; P4 closeout remains.
>
> Scope: turn thirteen incident cards into the smallest set of independently
> reviewable system changes, while preserving the distinction between a proven
> deterministic defect, an Agent-flow observation, and a host UX limitation.

## 1. Current Decision

Do not repair these cards one by one. The current triage produces four bounded
OpenSpec change candidates and two evidence tracks:

| Route | Cards | Current disposition | Next admission fact |
| --- | --- | --- | --- |
| C1. Wave0 submitted-evidence materialization at scale | [BUG-189](../bugs/BUG-189-shared-ref-count-floor-delegated-bypass.md), [BUG-191](../bugs/BUG-191-wave0-projection-ordinal-scaling.md) | Archived C1 deterministic correction for the source-only submitted-backing and batch-deferred contract. | Deterministic route terminal; no real Actor adherence claim is made. |
| C2. Direct Agent contract feedback | [BUG-190](../bugs/BUG-190-source-identity-kind-naming-obscure.md), [BUG-194](../bugs/BUG-194-wave1-assignment-mode-payload-location.md), conditionally [BUG-195](../bugs/BUG-195-wave1-source-claims-cache-trail-refs-missing.md) | [`2026-08-04-surface-actionable-contract-feedback`](../../openspec/changes/archive/2026-08-04-surface-actionable-contract-feedback/) archived the two direct feedback loops after deterministic verification, spec sync, governance, and closeout; case-164 requalified BUG-195 as an Actor-delivery residual without a current deterministic root. | C2 route terminal; no validator inference or schema change is admitted. |
| C3. Traceable Final delivery | [BUG-199](../bugs/BUG-199-synthesis-no-evidence-citations.md) | [`2026-08-04-traceable-final-delivery-backing`](../../openspec/changes/archive/2026-08-04-traceable-final-delivery-backing/) archived the bounded Final Evidence Map and pre-persist submitted-backing admission after sync, verification, governance, and closeout. | C3 route terminal; semantic adequacy remains outside the deterministic proof boundary. |
| C4. Legible HITL1 capability probe | [BUG-187](../bugs/BUG-187-hitl1-capability-probe-opaque-to-user.md) | [`2026-08-05-legible-hitl1-capability-probe`](../../openspec/changes/archive/2026-08-05-legible-hitl1-capability-probe/) applied the bounded Phase/brief communication contract, passed focused static Markdown verification, completed spec sync, governance, closeout, and governed archive. A retained real case-115 run classified the selected host as a capability residual: no callable `WebSearch`, no writable bundle surface, and no native tool-log rendering to assess. | No C4 framework change is admitted from this run. A future re-run requires the selected host to expose the declared search surface and writable runtime path. |
| E1. Host wait visibility | [BUG-188](../bugs/BUG-188-subagent-wait-no-progress-visibility.md), [BUG-193](../bugs/BUG-193-wave1-subagent-wait-no-progress-sibling.md) | Selected-host observation completed: native Sub-agent and a visible host wait/display surface were available, but no authoritative progress-event channel or native completion was retained. BUG-193 remains a Wave1 duplicate of BUG-188, not a second framework root; no DPT controller is admitted. | Any future host integration must name an authoritative progress fact and host owner; the current observation is sufficient to close E1 as a host UX residual. |
| E2. Current-head real Actor requalification | [BUG-192](../bugs/BUG-192-degraded-gate-triggers-de-facto-hitl.md), [BUG-198](../bugs/BUG-198-phase-agent-direct-search-no-subagent.md), replay [BUG-195](../bugs/BUG-195-wave1-source-claims-cache-trail-refs-missing.md)/[BUG-196](../bugs/BUG-196-work-done-receipt-no-status-transition.md)/[BUG-197](../bugs/BUG-197-wave1-queue-blocks-reenqueue-after-failure.md) | Case-164 requalified BUG-195/196/197 on the current head: native completion `PASS`, all five checks passed, and no deterministic root was reproduced. The separate Supervisor lifecycle `ERROR` is a host timeout, not a DPT verdict. Case-232 reached the real Wave2 node but finalized `NOT_RUN` because the selected host exposed no callable real search surface; BUG-192/198 therefore terminate as host/Actor capability residuals, not behavior PASS. | Re-run only after the selected host exposes the declared real search surface and a new bounded degraded-handoff objective is explicitly authorized. |

The routes are deliberately not all implementation work. C1 is an archived
deterministic correction; C2-C4 may become separate proposals when their admission facts are
captured. E1 and E2 are
investigation tracks with explicit terminal outcomes; neither creates a standing
run, retry loop, scheduler, or OpenSpec change by itself.

## 2. Completed Triage Baseline

- [x] Read and group BUG-187 through BUG-199 by authority owner rather than by
  visible symptom.
- [x] Confirm that `openspec list --json` had no active change before C1 was
  created on 2026-08-04.
- [x] Create the C1 OpenSpec change
  [`2026-08-04-materialize-wave0-submitted-references-and-batch-projections`](../../openspec/changes/archive/2026-08-04-materialize-wave0-submitted-references-and-batch-projections/)
  and its proposal. `openspec status --change` reports `proposal: done`, with
  `specs` and `design` ready and `tasks` blocked on those artifacts.
- [x] Separate the proven Wave0 evidence/projection gap from the historical
  Wave1 failure cascade and the host wait presentation issue.
- [x] Run the P1 C1 focused current-head checks on 2026-08-04:
  `work-unit-assignment-contract` passed 10/10 and the Wave0 gate suite passed
  23/24 relevant subtests, including the submitted contribution and 19-to-20
  ordinal cases. This proves deterministic contract behavior only, not real
  Actor behavior.
- [x] Classify the observed Wave0 gate expectation drift. C1 task 4.5 found
  that a missing declaration with retained hash-bound index/status facts has a
  legal direct owner: the existing `recover-declaration` Engine operation, so
  `wave0_work_unit_submission_presence.repair_kind=engine_operation` is
  correct. The focused Gate regression now exercises recovery and passes; the
  opposite no-recovery-fact boundary remains fail-closed.
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
| P1 | Capture admission facts and complete proposal artifacts only where a bounded deterministic or user-facing contract root exists. C1 proposal, specs, design, task list, and implementation entry are complete. | Complete |
| P2 | Stabilize submitted-evidence and feedback contracts through accepted C1/C2 work before applying C3 against their backing surfaces. C1, C2, C3, and C4 are archived; remaining routes require their own admission facts. | Complete |
| P3 | Activate E1/E2 only with a selected host or an explicitly authorized real bundle; classify each result before proposing code. E1 and E2 are terminal residual classifications with no new framework root. | Complete |
| P4 | Archive accepted changes, update each bug card with its final disposition, and move this plan only when every route has a terminal outcome. | Complete; CLS-047 |

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

**Implemented C1 shape:** extend the existing Phase-owned backed-reference
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
- [x] In C1 delta specs and design, state the exact materialization writer,
  input facts, output projection, collision/idempotence rule, and failure
  feedback.
- [x] In C1 delta specs and design, state the batch-deferred input grammar and
  prove its deterministic, identity-complete expansion without adding
  persistent duplicate truth.
- [x] Add C1 acceptance and verification cases for backed materialization,
  batch expansion, duplicate identity rejection, filesystem-only rejection,
  and idempotent rerun.
- [x] Apply the approved C1 task list and retain focused deterministic evidence.
  No real Actor adherence claim is inferred from fixtures; the deterministic C1
  route is complete and the remaining host/Actor residuals are recorded in E1/E2.
- [x] Update BUG-189/BUG-191 with the concrete C1 behavior and proof boundary.
- [x] Complete C1 task 6 verification/sync/closeout and archive it. The
  governed finalizer archived C1 on 2026-08-04 after strict validation,
  requirements/spec governance, verification routing, and native archive all
  passed.
- [x] Reassess C3's final-backing assumptions using the archived C1 submitted
  contribution/projection boundary. C3 task 1.3 rechecked the normalized
  submitted declaration reader and `classifyReferenceAuthority()` immediately
  before target edits; no unsettled C2/provenance interface was duplicated.

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
- [x] Save exact current rejection evidence for the discriminator and Wave1
  enqueue cases on 2026-08-04. A real `operate-topic-state apply` against a
  disposable bundle returns only `updates[0]` / `invalid_union` for a Wave0
  `source_identity.kind: "work_unit"`; the nested current Zod issue is the
  exact `/updates/0/entries/0/source_identity/kind` discriminator with
  `submitted_work|finding`, while the Wave0 form admits only
  `submitted_work`. The legal write surface is the retained input packet and
  the returned same-`apply` rerun. A production `operate-queue enqueue`
  against an Engine-materialized canonical Topic returns only
  `assignment contract rejected: Wave1 assignment_mode must be primary or
  supplementary`; moving the same value to `payload.assignment_mode` makes
  the same enqueue succeed. The legal write surface is the unqueued task card,
  not `rb_queue.json`; allowed values are `primary|supplementary`.
- [x] Decide that existing static contract metadata is sufficient: the
  `TopicApplyPlanSchema`/its current schema projection and the existing
  `work-unit-assignment-contract` are the sole rule sources. C2 may project
  their path/closed-value/owner/rerun facts, but must not add a validator,
  alias, or repair controller.
- [x] Keep BUG-195 inactive for C2. Current-head source-claim schema,
  task-envelope generator, Phase Wave1 control surface, and role guidance all
  name `cache_trail_refs`; no fresh real Actor-generated task omission has
  been observed. A future observation must retain the failing `task.md`,
  result receipt, and dry-submit response before proposing a delivery-contract
  change.
- [x] Create the C2 change
  [`2026-08-04-surface-actionable-contract-feedback`](../../openspec/changes/archive/2026-08-04-surface-actionable-contract-feedback/)
  on 2026-08-04. Its proposal-only stage authorized no target implementation,
  test, accepted-spec, or governance-file edit.
- [x] Specify focused positive and negative checks for path, enum, owner, and
  same-check rerun feedback, including prerequisite short-circuit behavior.
  The active C2 change contains four routed CTS-004/QIV-001 deterministic
  claims across helper and production-CLI boundaries; its strict validation,
  routing-plan check, requirement/spec governance, and diff check passed on
  2026-08-04.
- [x] Polish the C2 change through two distinct passes on 2026-08-04. Whole
  change coherence restored the pre-existing C1 CTS-009 heading as a
  no-runtime, in-sync normalization task rather than allowing it to be absorbed
  into CTS-004 or duplicated. The risk-led pass keeps Wave-context legality
  separate from the raw Zod union and multi-Wave slot metadata, and confines
  Queue JSON stdout to structured missing/unknown `payload.assignment_mode`
  feedback so other assignment failures retain their existing path. Strict
  OpenSpec validation, verification-route validation, requirement governance,
  main-spec governance, and tracked/untracked whitespace checks all pass. C2
  is ready for apply; no target code, test, accepted-spec, or governance file
  has been edited during proposal/polish.
- [x] Apply C2 on 2026-08-04. CTS-004 now selects the nested discriminator
  issue, reports its exact JSON Pointer, raw union values, Wave-legal value,
  retained-input surface, and same apply rerun. QIV-001 now carries direct
  `payload.assignment_mode` metadata from the assignment resolver to enqueue,
  which emits JSON only for that record and preserves unrelated assignment
  errors. Focused deterministic evidence passed: CTS helper 34, CTS CLI 14,
  QIV helper 7, QIV CLI 36, and all four routed asset claims.
- [x] Sync C2 deltas, re-run governance, and complete the C2 closeout review.
  On 2026-08-04 CTS-004/QIV-001 were merged into main specs, the C1 CTS-009
  heading was normalized without semantic change, all selected verification
  assets plus strict/spec/requirement governance passed, and a rerun-path
  whitespace closeout finding was repaired and reverified. BUG-195 remains
  requalification. Case-164 later supplied that bounded real Actor evidence and
  classified the card as an Actor-delivery residual; it did not establish a
  universal compliance guarantee or authorize a schema change.
- [x] Run the governed archive transition for
  `surface-actionable-contract-feedback`. On 2026-08-04,
  `finalize-change-archive.mjs` returned `outcome: archived` with all eight
  checks passed and archived the change as
  `2026-08-04-surface-actionable-contract-feedback`.

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
- [x] Locate the exact final-persist acceptance boundary and choose the smallest
  declared key-finding representation that lets a reader stop at one traceable
  answer: the bounded `Evidence Map` table in
  [`2026-08-04-traceable-final-delivery-backing`](../../openspec/changes/archive/2026-08-04-traceable-final-delivery-backing/).
- [x] Define accepted backing surfaces and the submitted-ledger/provenance rule:
  exact submitted `source_yaml` / `evidence_summary` outputs or an existing
  submitted-backed `reference/` classification; failed, unsubmitted, cache,
  Final, index, and filesystem-only artifacts fail closed.
- [x] Write and polish the C3 proposal/design/specs: pre-persist admission at
  the existing crash-safe writer is sufficient; Final remains `gate: null` and
  the Engine makes no content-quality verdict.
- [x] Specify and run focused deterministic proof for absent/empty/malformed
  maps, target-relative safe and unsafe links, submitted direct/reference
  backing, unsubmitted diagnostics, generic-persist redirect, crash-recovery
  sweep re-admission, and structurally valid but semantically unjudged
  declarations. The selected 2026-08-04 test commands passed 5/5, 18/18,
  11/11, and 36/36 cases respectively; they do not claim real Actor behavior.
- [x] Apply the approved C3 task list through focused verification. The archived
  change is
  [`2026-08-04-traceable-final-delivery-backing`](../../openspec/changes/archive/2026-08-04-traceable-final-delivery-backing/);
  BUG-199 records the deterministic boundary and residual Agent/human
  semantic-review ownership.
- [x] Complete C3 spec sync, requirement/spec governance, and feedback closeout.
  The accepted specs contain ARP-004, CDP-006, FDB-001, and FDB-002 once each;
  strict validation, routing, requirement/spec governance, and focused
  deterministic tests passed. The legacy Final `gate: none` wording was also
  reconciled to the shipped `gate: null` / no-`next` terminal contract.
- [x] Run the governed C3 archive transition. The finalizer archived C3 as
  `2026-08-04-traceable-final-delivery-backing` after status, artifacts, tasks,
  strict validation, requirement/spec governance, verification routing, and
  native archive checks all passed. Historical Final reports remain untouched;
  actual guidance-following behavior remains outside this deterministic route's
  proof boundary; no unresolved framework route is implied.

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
- [x] Identify which notice/result text is controlled by the phase Markdown and
  which visual output is forced by the selected host. `phase-hitl1.md` owns the
  pre-probe notice, fixed-query instruction, and concise result wording;
  `brief/hitl1.md` owns the surrounding HITL1 exit copy. Native tool-call rows,
  transport/security failures, and any shell output are selected-host rendering
  facts declared by `research-access-adapter.md`, so C4 can explain the probe
  but cannot promise to suppress those host surfaces.
- [x] Complete and polish the active C4 OpenSpec proposal:
  [`legible-hitl1-capability-probe`](../../openspec/changes/archive/2026-08-05-legible-hitl1-capability-probe/).
  Its proposal, two delta specs, design, task ledger, and four-class
  verification plan are complete; strict OpenSpec validation and plan-mode
  verification routing pass. The proposal assigns a fixed query, exact
  non-decision/result wording, v0.72 release target, glossary boundary, and no
  host-rendering promise. Target code was subsequently modified only through
  the approved Apply task list.
- [x] Write a C4 proposal with the fixed query, notice, success/unavailable
  result, and the no-new-decision rule. The active proposal is polished and
  then applied with its plan review. It makes no current real-host or real-Actor
  behavior claim.
- [x] Apply the C4 Markdown contract through
  [`2026-08-05-legible-hitl1-capability-probe`](../../openspec/changes/archive/2026-08-05-legible-hitl1-capability-probe/):
  the brief owns exact Chinese notice/result text; the Phase uses the fixed
  neutral query and places the direct observation result before the existing
  HITL1 Gate; the normal silent exit remains Gate-pass-only. Focused static
  Markdown coverage passed 9/9 and verification-routing assets passed. This is
  not real-host rendering or real-Actor proof.
- [x] Verify the revised control surface against a retained real HITL1
  observation. On 2026-08-05, case
  `case-115-heavy-hitl1-research-access-probe` ran through the selected
  `deepseek_anthropic_compatible` host with a real Subject Agent. The Subject
  loaded the current Phase and emitted the exact unavailable result, but native
  completion was `NOT_RUN` because `WebSearch` was not callable and host policy
  denied bundle writes/Gate execution; profile remained
  `research_access: unprobed`, health was CLEAN, and no native tool-log
  rendering occurred.
  Batch `bf4bbc95-e66d-4554-b4ab-167f18856a5e` retained the prompt,
  transcript, result, completion, and bundle. Classify this terminal result as
  selected-host capability residual, not C4 framework regression or PASS.
- [x] Archive C4 through the governed finalizer. On 2026-08-05,
  `finalize-change-archive.mjs` returned `outcome: archived` with all eight
  checks passed and archived the change as
  `2026-08-05-legible-hitl1-capability-probe`. This closes the deterministic
  C4 change lifecycle only; it does not close the separate host/Actor
  observation boundary.

## 9. E1: Host Wait Visibility

BUG-193 is retained as a cross-phase reproduction of BUG-188, but it is not a
separate implementation candidate. Current evidence says the Engine can inspect
progress and avoids timing out active work. The selected host exposed a dynamic
TUI display surface, but it did not expose an authoritative progress-event
channel to the bundle or prove native completion. The remaining gap is therefore
host/TUI-owned; it is not a missing Engine wait controller.

`stop: no` also prohibits the proposed user-facing progress updates. The
observed display surface does not authorize weakening silent execution.

On 2026-08-05, one bounded interactive run of
`case-406-heavy-real-subagent-boundary` used batch
`b963a31b-c6f7-4ddd-ba20-1c3600d46c99` and exact run root
`/Users/bowhead/ai_tool_deepresearch/.exp-bundles/runs/b963a31b-c6f7-4ddd-ba20-1c3600d46c99/001-case-406-heavy-real-subagent-boundary-81264b4d-045d-4d13-b0d6-cb7248728c34/`.
The selected host launched the native `dpt-source-intake` Sub-agent; the TUI
rendered a background-agent row with elapsed time/token count, a waiting
indicator, and spinner updates. The Supervisor nevertheless timed out at
`300108ms` with `lifecycle_outcome: ERROR`, `native_outcome: null`, and
`reason: agent_timeout`. The exact disposable bundle shows the work unit was
claimed, but `runtime-receipt.jsonl` is empty, `result.json` is absent, and
`rb_trace.jsonl` contains setup/claim facts only, with no progress event or
completion. This proves a host display observation, not Actor success or an
Engine progress contract.

**Tracking:**

- [x] Deduplicate BUG-193 under BUG-188 while preserving it as Wave1 evidence.
- [x] Establish that the reported wait self-recovers after a sub-agent finishes;
  it is not evidence of an Engine deadlock.
- [x] Obtain a selected-host capability record: the native Sub-agent surface
  was available and the host rendered dynamic wait/display status, but the
  bounded run retained no authoritative progress-event delivery or completion.
- [x] Run one bounded host observation with a fresh exact bundle and evidence
  objective; retain the host mode, native display result, Supervisor report,
  and work-unit claim/progress boundary.
- [x] Decide that the observed display surface is not a sufficient
  host-integration contract: no authoritative progress facts were retained,
  so no host-integration-scoped OpenSpec proposal is admitted.
- [x] Record `host UX residual`, close this track without a DPT controller, and
  keep silent execution unchanged. A future host change may reopen E1 only
  with an explicit progress fact and owner.

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
- [x] Obtain explicit authorization for one readable, disposable current-head
  bundle and a narrow `agent_flow_e2e` evidence objective. Case-164 used the
  exact retained bundle rooted at
  `.exp-bundles/runs/90d42e99-77b1-4af7-8f51-96898325082a/`.
- [x] Capture the complete evidence package without hand-editing receipts,
  status, ledger, cache, or task outputs. The exact generated task, both
  runtime receipts, before/after dry-submit JSON, fail/replacement JSON,
  Subject transcript/result, native trace, and hash evidence are retained in
  the case root.
- [x] Classify the first terminal result: the current head did not reproduce
  BUG-195/196/197. The real first child emitted `work_done`, was rejected on
  its semantic contract, and the fresh primary replacement was independently
  searched, submitted, and recorded in the ledger. The host Supervisor's
  timeout remains a separate host lifecycle boundary.
- [x] Open one focused proposal only for a proven deterministic/missing-contract
  root. No such root was identified, so no target code or OpenSpec change is
  admitted from this replay.
- [x] No accepted fix was introduced, so a post-fix rerun is not applicable to
  this result. A separate case-232 current-head observation reached
  `phases/phase-wave2.md` but finalized `NOT_RUN`: the Subject timed out with
  zero real WebSearch/WebFetch requests and the bundle retained no finding or
  direct-search evidence. Classify BUG-192/198 as selected-host capability
  residuals; rerun only after the host state changes and a fresh bounded
  objective is authorized. Do not claim Actor success from fixture tests.

**E2 case-164 result (2026-08-05):**

- Supervisor lifecycle: `lifecycle_outcome: ERROR`, `reason: agent_timeout`,
  `duration_ms: 600185`, `native_outcome: null`, with the exact run root and
  audit record retained. This is evidence about host completion, not the
  native case verdict.
- Native finalizer: `outcome: PASS`; all five deterministic checks passed.
  The first child returned `key_findings_missing_or_empty` with
  `fail_and_replace`; the Subject preserved the first output hashes, created
  and claimed fresh primary `case-164-primary-2`, and a distinct second child
  produced independent source/cache facts before the replacement-only submit.
- BUG-195 boundary: the generated task's authoritative result schema exposes
  per-claim `cache_trail_refs`; the second real result includes that field for
  its claim and formal submit succeeds. The empty starter array is not itself
  a missing claim contract. This proves one current Actor path, not universal
  guidance compliance.
- BUG-196 boundary: after a real `work_done` receipt, dry-submit proceeds to
  semantic validation and returns `fail_and_replace`, not `return_to_actor`.
  No new `work_done` status is warranted.
- BUG-197 boundary: fail plus fresh primary enqueue/claim/submit succeeds; the
  failed attempt has no submitted ledger row and the replacement has exactly
  one. The reported permanent duplicate-topic block is not reproduced.
- BUG-192/198 are outside this case: it starts at Wave1, contains no degraded
  Wave0 gate handoff, and does not observe Phase-Agent direct Wave2 search.

**E2 case-232 result (2026-08-05):**

- The real Subject loaded `phases/phase-wave2.md` after a witnessed Wave1 Gate
  pass and `load_complete` trace event.
- The selected host did not expose a callable real search surface: the Subject
  result reports `SIGTERM`, timeout/aborted tools, and zero
  `web_search_requests`/`web_fetch_requests`. No Wave2 finding, direct-search
  attempt, or delegated targeted-search result was produced.
- Native completion is `NOT_RUN` with the explicit reason
  `independent Subject Agent runtime or real external search unavailable`.
  This is an honest host capability boundary, not a PASS/FAIL statement about
  BUG-192/198 behavior. No search interceptor, degraded controller, or
  alternate evidence authority is admitted.

## 11. Sequencing And Closure

The intended order is C1 and C2 first, C4 independently whenever its
presentation boundary is established, and C3 only after source/backing contracts
are stable enough to name its legal citations. E1 and E2 were activated only
after their explicit conditions were met and now have terminal host/Actor
residual classifications; they do not authorize deterministic proposals without
a new direct root.

This plan closes only when every route has one of these terminal dispositions:

- an archived OpenSpec change with retained verification evidence;
- a rejected proposal with the direct reason recorded;
- a real observation classified as host/Actor residual with no missing framework
  contract; or
- a successor plan that names a newly discovered independent root.

Closeout:

- [x] Update each BUG-187-199 card with its final route, evidence boundary, and
  fixed/rejected/residual disposition. C1-C4 cards record archived deterministic
  boundaries; E1 records the host UX residual; E2 records the current-head
  Actor replay and selected-host capability residual.
- [x] Confirm no active OpenSpec change remains incomplete for a route marked
  resolved. `openspec list --json` returned `changes: []` on 2026-08-05.
- [x] Move this plan to `_backlog/_done/_closed_plans/` and update both plan
  indexes after all routes reached a terminal disposition. Closed as CLS-047
  on 2026-08-05.
