---
title: Residual bug systemic remediation
status: closed__c1_c2_archived__c3_not_admitted__all_cards_dispositioned
created: 2026-08-05
closed: 2026-08-05
source_bugs: BUG-188, BUG-192, BUG-193, BUG-195, BUG-196, BUG-197, BUG-198
change_budget: two_admitted_changes_plus_one_conditional_repair
---

# Residual Bug Systemic Remediation

## 1. Goal And Constraint

Close the remaining BUG-188, BUG-192, BUG-193, and BUG-195--198 cards by
their actual authority owners, not by treating every historical observation as
a current DPT Engine defect.

All repository behavior or verification-asset changes use the full OpenSpec
`propose -> polish -> apply -> archive` lifecycle. `polish` means running
`$polish-openspec-change` immediately after all proposal artifacts exist and
before `/opsx:apply`; it must earn a `ready for apply` result from two distinct
planning-review passes. This plan authorizes neither target edits nor a standing
experiment/retry loop. The default budget is **two focused OpenSpec changes
plus at most one conditional direct-root repair**:

1. C1 is immediately admissible because a current deterministic test is red.
2. C2 is admissible after C1 because no existing playbook covers the required
   current-head degraded-handoff observation.
3. C3 is conditional on C2 retaining one actual shared degraded-handoff
   violation; it repairs only the observed root.

No Change is currently admissible for host-owned wait presentation. A host
integration can only become a third candidate after the host exposes an
authoritative progress interface; this plan does not reserve a Change for it.

## 2. Current Triage

| Cards | Current finding | Owner | Disposition now |
| --- | --- | --- | --- |
| BUG-188, BUG-193 | The selected host now renders a background-agent row, elapsed/token counters, and spinner. It still does not expose a retained authoritative progress event, and DPT cannot change the host TUI or unblock a host `agent_wait`. BUG-193 is a Wave1 duplicate of BUG-188. | Host UI/runtime | External residual; no DPT Change. Keep BUG-193 linked as duplicate evidence, not a separate implementation route. |
| BUG-192, BUG-198 | The current loaded control surfaces already forbid user questions/A/B choices/phase skips and Phase-Agent direct research search. The only relevant current-head Wave2 run finalized `NOT_RUN` before any callable real search/fetch action, so neither compliant nor violating Agent behavior was observed. No existing playbook spans the required degraded Wave0 handoff through the Wave2 decision. | Agent behavior plus host tool surface | C2 creates one shared requalification case; C3 remains conditional on a retained violation. |
| BUG-195, BUG-196, BUG-197 | The current generated task/schema names `cache_trail_refs`; post-`work_done` semantic failures map to `fail_and_replace`; a fresh primary replacement can enqueue, claim, and submit. Retained native `PASS` report `d2e8115d-8b97-4ccd-8cdb-3dc2ea101236` matches the current case-164 playbook hash. | Existing work-unit contract | Closed as current-head no-reproduction; no Engine/schema/queue change is justified. Reopen only with a retained current direct root. |

There is no matching prior rejection in `.out-of-scope/` (the directory is
absent). Redundancy review covered `shared-silent-execution.md`,
`shared-subagent-protocol.md`, Wave1/Wave2 phase nodes, the work-unit submit
contract, its acceptance spec, and the focused tests listed below.

## 3. Non-Negotiable Boundaries

- A loaded `stop: no` phase may not create a third HITL, progress message,
  confirmation, A/B choice, invented skip route, or user continuation
  dependency. `check.next` plus `enter-phase` remains the only handoff route.
- New research evidence remains `queue demand -> work unit -> Sub-agent ->
  submit -> ledger -> Gate`. A Phase Agent does not directly search/fetch
  evidence, and the Engine does not observe or police host chat/tool calls.
- A `work_done` receipt and successful submit remain different facts. Do not
  add a lifecycle state or let a Phase Agent author a failed delegated result.
- Do not introduce a host watcher, retry scheduler, progress state, chat
  observer, WebSearch interceptor, or fallback provider.

These limits preserve a precise split: the Engine owns deterministic work-unit
facts; Markdown gives an Agent the legal next action; the host owns rendering,
native wait semantics, and tool availability.

## 4. C1: Reconcile Case-164 Evidence Contract

### Admission fact

`node --test tests/integration/md/case-164-direct-output-candidate-contract.test.mjs`
currently fails. Its prose and the archived DEW-014/015 verification plan say
the canary has three Subject turns and two child actors, but the test counts a
plain phrase across a runner slice and expects two matches while receiving
three. This is a current deterministic verification drift, not an inference
from the historical BUG-195--197 incident.

### Proposed OpenSpec scope

Create one focused C1 proposal whose question is: can a maintainer determine
that case-164 still describes exactly the intended three-turn/two-child
recovery protocol without relying on accidental prose repetition?

The change may update the test and only the runner/playbook metadata required
to make that assertion structural. It must inspect the case-164 `messages`
array or another direct protocol projection, distinguish Subject turns from
child invocations, and retain the existing setup-only and `NOT_RUN` boundaries.
It must not change DPT work-unit behavior, synthesize Actor evidence, or widen
the experiment.

### Required proof and closeout

1. Reproduce the current red test before edits.
2. Add a regression that fails for either a missing third Subject turn, a child
   invoked in Turn 2, or fewer/more than the two required child invocations.
3. Run the focused case-164 test, the work-unit submit/disposition suite, and
   the Wave replacement-guidance test. The existing baseline has the latter
   Engine/guidance checks green; the C1 test must make the full selected set
   green.
4. Reconcile BUG-195--197 against the repaired asset and retained native
   case-164 evidence. If no new direct root appears, record them as current-head
   no-reproduction closeouts rather than modifying schema, queue, or Gate
   policy. If a new direct root appears, stop C1 and open a separate bounded
   proposal only for that root.

## 5. Shared Requalification Gate For BUG-192 And BUG-198

Do not open C2 merely because static Markdown contains the correct words. A
fresh authorized `agent_flow_e2e` run must first meet all of these prerequisites:

1. The selected host exposes callable real search/fetch, native child execution,
   and a writable disposable bundle path.
2. The case has one bounded objective: start from a real degraded Wave0 handoff,
   load Wave1, then reach the real Wave2 new-evidence decision. It retains the
   Subject prompt/transcript/result, host/version/mode, bundle status/trace,
   Gate JSON, and tool-call evidence.
3. Profile selection and a new explicit duration/budget envelope authorize that
   one case. No historical `--case` forcing, background retry, or fallback
   provider is permitted.

The run ends at its first terminal `PASS`, `FAIL`, `NOT_RUN`, selection
omission, or budget boundary. A static test, configured tool name, or partial
host transcript is not behavior proof.

## 6. C2: Degraded Handoff Requalification Case

C2 creates the missing one-case `agent_flow_e2e` observation surface. It
starts from a current degraded Wave0 handoff, loads Wave1, then reaches the
Wave2 new-evidence decision under one explicit cost and duration envelope. Its
native completion retains the Subject prompt/transcript/result, host facts,
bundle status/trace, Gate JSON, and tool-call evidence. `PASS`, `FAIL`,
`NOT_RUN`, selection omission, and budget boundary remain distinct outcomes.

C2 does not change the current production handoff or search policy. A static
test or configured tool name remains insufficient. It must not add a host
watcher, retry scheduler, progress state, chat observer, WebSearch interceptor,
fallback provider, skip route, or lifecycle state.

## 7. C3: Degraded Handoff Contract Repair (Only On C2 Reproduction)

C3 opens only if C2 observes either forbidden behavior: an unsolicited user
choice/phase skip after a legal degraded handoff, or a Phase-Agent direct
research search/fetch in Wave2.

The two cards share one root only in that case: the Agent left the loaded
phase's direct legal action after a degraded handoff. Keep C3 narrowly in the
Agent-facing handoff surface:

- state the one legal next action immediately after the accepted handoff;
- preserve `check.next`, `enter-phase`, the existing search policy, and the
  queue/work-unit path as their current authorities;
- add focused Markdown/integration checks for the explicit action and negative
  prohibitions; and
- rerun the same bounded real-Agent scenario after apply.

C3 must not add an Engine chat observer, a tool-call interceptor, an automatic
continuation controller, a skip/degraded route, or a new lifecycle state. If
C2 does not reproduce a violation, close BUG-192/198 as current-head
unobserved behavior residuals and do not create C3.

## 8. Host Wait Route For BUG-188 And BUG-193

The DPT repository cannot repair the host's wait renderer. The current host
already disproves the historical "completely static" display claim, while its
display counters/spinner are not authoritative DPT progress facts.

Only the host owner can make a future integration admissible by documenting a
stable interface with: a task identity, timestamped progress/terminal events,
retention/read API, and ownership of stalled versus running classification.
Until then, do not add a DPT progress projection, polling controller, silent
execution exception, or artificial heartbeat. Once such an interface exists,
triage it as a new host-integration request rather than reopening BUG-188/193
as an Engine defect.

## 9. Step-By-Step Checklist

### 8.1 Triage Baseline

- [x] 8.1.1 Read and group BUG-188, BUG-192, BUG-193, and BUG-195--198 by
  authority owner; record that the current Engine path covers BUG-195--197,
  while BUG-188/193 are host-owned and BUG-192/198 need real-Actor evidence.
- [x] 8.1.2 Complete redundancy and prior-rejection checks over the current
  control surfaces, work-unit contracts, focused tests, and `.out-of-scope/`.
- [x] 8.1.3 Reproduce the case-164 integration-test drift: expected two raw
  phrase matches, received three.

### 8.2 C1: Case-164 Verification Contract

- [x] 8.2.1 Create OpenSpec change
  `repair-case-164-verification-contract` with `skip_specs: true`; proposal,
  task list, and verification-routing plan pass `openspec validate --strict`
  and routing-plan validation.
- [x] 8.2.2 Run `$polish-openspec-change` for C1 immediately after proposal
  generation. Require two distinct planning-review passes and a `ready for
  apply` outcome before `/opsx:apply`; record any resolved planning findings in
  the C1 artifacts rather than leaving them only in chat.
- [x] 8.2.3 Entered `/opsx:apply` for C1 after task 8.2.2; completed its plan
  review and verification-routing pre-edit task before touching the target
  test.
- [x] 8.2.4 Replaced the raw phrase-count assertion with a structural check of
  exactly three ordered Subject messages, with real-child instructions in
  turns 1 and 3 only. Preserve the runner, playbook, native evidence, and
  `NOT_RUN` boundary unless a source inconsistency is proven.
- [x] 8.2.5 Added negative regression coverage for a missing third turn, a
  child instruction in turn 2, and any incorrect count of child-bearing
  turns.
- [x] 8.2.6 Run C1's selected tests, verification-routing asset validation,
  strict OpenSpec validation, requirement governance, main-spec governance,
  and closeout review. All C1 tasks pass and the change is ready to archive.
- [x] 8.2.7 Archived C1 through `/opsx:archive` as
  `2026-08-05-repair-case-164-verification-contract`, following the governed
  archive transition, before starting the BUG-195--197 disposition.

### 8.3 BUG-195, BUG-196, BUG-197 Disposition

- [x] 8.3.0 Resolved the locator discrepancy. The 2026-08-01 native `PASS`
  report is `.exp-bundles/_reports/d2e8115d-8b97-4ccd-8cdb-3dc2ea101236.json`
  (`sha256: fe6f9f62a709e872759d4d94a762856c0f31c504df9a5189041b11d48d9f2390`);
  its completion hash is
  `9dfd25089683cab80524fb39e26c4551d2874bff5c84ef0f326c358603ee22dc`.
  The retained source-playbook hash equals current case-164 exactly.
- [x] 8.3.1 Re-read C1's structural test plus the retained native result.
  The submitted replacement declares `cache_trail_refs`; the first attempt
  terminates `semantic_contract:key_findings_missing_or_empty` rather than
  `return_to_actor`; and fresh `case-164-primary-2` submits after failed
  `case-164-primary-1`.
- [x] 8.3.2 Added no-current-reproduction closeouts to BUG-195--197 and moved
  them to `_done/_fixed_bugs/`. No schema, queue, Gate policy, or retry
  controller changed.
- [x] 8.3.3 C1 exposed no new direct root. The focused current case-164,
  work-unit disposition/submit, and Wave replacement-guidance suite passed
  76/76, so no additional Change was proposed.

### 8.4 BUG-192 And BUG-198 Requalification Gate

- [x] 8.4.1 Requested the selected-host capability path through the one
  permitted assurance selection. Supervisor stopped before launch because
  `duration_prediction_unavailable`; callable real search/fetch, child
  execution, and bundle-write capability therefore remain unobserved rather
  than absent or proven available.
- [x] 8.4.2 Used the explicit C2 objective and `$3`/900-second envelope for one
  assurance selection, then retained the one read-only dry-run's selection
  basis. No forced historical case, fallback provider, or retry loop occurred.
- [x] 8.4.3 Requested at most one bounded `agent_flow_e2e` observation. It did
  not launch, so no Subject transcript/result, host fact, bundle status/trace,
  Gate JSON, or tool-call evidence exists.
- [x] 8.4.4 Classified the first result as a Supervisor selection omission
  (`duration_prediction_unavailable`), not `PASS`, `FAIL`, `NOT_RUN`, budget
  boundary, or Agent-behavior evidence. Static Markdown and configured tools
  remain non-substitutes.

### 8.5 C2: Degraded Handoff Requalification Case

- [x] 8.5.1 Proposed C2 as `add-degraded-handoff-requalification-case` for the
  missing degraded Wave0 -> Wave1 -> Wave2 observation. Its verified routing
  plan selects `agent_flow_e2e` and distinguishes `PASS`, `FAIL`, `NOT_RUN`,
  selection omission, and budget boundary.
- [x] 8.5.2 Ran `$polish-openspec-change` after C2 proposal completion. The
  coherence pass corrected native-versus-Supervisor terminal authority and the
  risk-led pass added same-session Wave2 surface reload plus an actual
  delegated new-evidence route. `openspec validate --strict`, verification
  routing plan, project requirement/spec checks, and `git diff --check` pass:
  `add-degraded-handoff-requalification-case` is ready for apply.
- [x] 8.5.3 Applied, verified, and archived C2 as
  `2026-08-05-add-degraded-handoff-requalification-case` through its approved
  task list and governed finalizer. Static assets and all change validation
  passed. The one permitted assurance invocation ended at Supervisor selection
  with `duration_prediction_unavailable`; it created no native completion or
  Subject behavior evidence and was not retried. This honest selection boundary
  does not claim production behavioral remediation.

### 8.6 C3: Degraded Handoff Contract Repair (Only On C2 Reproduction)

- [x] 8.6.1 Assessed C3 admission: C2 retained no actual prohibited Subject
  action because the Supervisor stopped at selection. C3 is not applicable;
  this is not a behavior closeout for BUG-192/198.
- [x] 8.6.2 Recorded C2's selection-omission boundary on BUG-192 and BUG-198,
  then moved them to `_done/_fixed_bugs/` as current-head unobserved behavior
  residuals. Neither card claims Agent compliance or remediation.
- [x] 8.6.3 C3 proposal and polish are not applicable: no C2 retained actual
  prohibited Subject behavior to authorize them.
- [x] 8.6.4 C3 implementation is not applicable; no chat observer, tool
  interceptor, state, controller, or skip route was added.
- [x] 8.6.5 C3 apply/archive and C2 rerun are not applicable because C3 was not
  admitted; this plan makes no behavioral-remediation claim.

### 8.7 BUG-188 And BUG-193 Host Disposition

- [x] 8.7.1 Recorded and closed BUG-188 as a host-owned disposition: the current
  host supplies display-only spinner/counters, but no DPT-consumable
  authoritative progress event. No DPT Change was opened.
- [x] 8.7.2 Closed BUG-193 as BUG-188's Wave1 duplicate and preserved its
  cross-phase observation without a second implementation route.
- [x] 8.7.3 Recorded the host-route reopen criterion: task identity,
  timestamped progress/terminal events, a retention/read API, and an explicit
  stalled-versus-running owner must come from the host owner.

### 8.8 Plan Closure

- [x] 8.8.1 C1 and C2 have terminal OpenSpec archive outcomes. Every listed card
  now has a completed no-reproduction disposition, a host-owned boundary, or a
  current selection/requalification result.
- [x] 8.8.2 Confirmed no unadmitted controller, retry loop, host adapter, or
  broad rewrite remains queued by this plan.
- [x] 8.8.3 Moved this completed plan to `_backlog/_done/_closed_plans/` under
  the normal backlog archival ritual; future host capability or retained direct
  behavior evidence starts a new bounded intake rather than reopening a branch.
