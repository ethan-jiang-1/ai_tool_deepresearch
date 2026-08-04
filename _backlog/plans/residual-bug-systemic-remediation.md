---
title: Residual bug systemic remediation
status: active_evidence_gated_remediation
created: 2026-08-05
source_bugs: BUG-188, BUG-192, BUG-193, BUG-195, BUG-196, BUG-197, BUG-198
change_budget: at_most_two_openspec_changes
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
experiment/retry loop. The total budget is **at most two focused OpenSpec
changes**:

1. C1 is immediately admissible because a current deterministic test is red.
2. C2 is conditional on one retained current-head real-Agent reproduction of
   the shared degraded-handoff behavior.

No Change is currently admissible for host-owned wait presentation. A host
integration can only become a third candidate after the host exposes an
authoritative progress interface; this plan does not reserve a Change for it.

## 2. Current Triage

| Cards | Current finding | Owner | Disposition now |
| --- | --- | --- | --- |
| BUG-188, BUG-193 | The selected host now renders a background-agent row, elapsed/token counters, and spinner. It still does not expose a retained authoritative progress event, and DPT cannot change the host TUI or unblock a host `agent_wait`. BUG-193 is a Wave1 duplicate of BUG-188. | Host UI/runtime | External residual; no DPT Change. Keep BUG-193 linked as duplicate evidence, not a separate implementation route. |
| BUG-192, BUG-198 | The current loaded control surfaces already forbid user questions/A/B choices/phase skips and Phase-Agent direct research search. The only relevant current-head Wave2 run finalized `NOT_RUN` before any callable real search/fetch action, so neither compliant nor violating Agent behavior was observed. | Agent behavior plus host tool surface | One shared requalification gate, then at most C2. |
| BUG-195, BUG-196, BUG-197 | The current generated task/schema names `cache_trail_refs`; post-`work_done` semantic failures map to `fail_and_replace`; a fresh primary replacement can enqueue, claim, and submit. The retained case-164 real replay followed this path. | Existing work-unit contract | No Engine/schema/queue change is justified. First repair its currently red verification asset, then close these cards from current evidence unless that repair reveals a distinct root. |

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

## 6. C2: Degraded Handoff Contract Reentry (Conditional)

C2 opens only if the requalification run observes either forbidden behavior:
an unsolicited user choice/phase skip after a legal degraded handoff, or a
Phase-Agent direct research search/fetch in Wave2.

The two cards share one root only in that case: the Agent left the loaded
phase's direct legal action after a degraded handoff. Keep C2 narrowly in the
Agent-facing handoff surface:

- state the one legal next action immediately after the accepted handoff;
- preserve `check.next`, `enter-phase`, the existing search policy, and the
  queue/work-unit path as their current authorities;
- add focused Markdown/integration checks for the explicit action and negative
  prohibitions; and
- rerun the same bounded real-Agent scenario after apply.

C2 must not add an Engine chat observer, a tool-call interceptor, an automatic
continuation controller, a skip/degraded route, or a new lifecycle state. If
the requalification does not reproduce a violation, close BUG-192/198 as
current-head unobserved behavior residuals and do not create C2.

## 7. Host Wait Route For BUG-188 And BUG-193

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

## 8. Step-By-Step Checklist

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

- [ ] 8.3.1 After C1 is green, re-read its test evidence and the retained
  native case-164 result. Confirm that `cache_trail_refs`, post-`work_done`
  `fail_and_replace`, and fresh primary replacement remain distinct current
  paths.
- [ ] 8.3.2 If no new deterministic root appears, add a no-current-reproduction
  closeout to each card and move BUG-195--197 to the appropriate completed
  backlog location. Do not change schema, queue, Gate policy, or introduce a
  retry controller.
- [ ] 8.3.3 If C1 exposes a new direct root, record the exact owner and
  failing checkpoint, then amend this plan before proposing any additional
  Change. That root must not be folded into C2 by convenience.

### 8.4 BUG-192 And BUG-198 Requalification Gate

- [ ] 8.4.1 Confirm that the selected host provides callable real search/fetch,
  native child execution, and a writable disposable bundle path. If any is
  absent, retain the terminal `NOT_RUN`/host-capability boundary and do not
  create C2.
- [ ] 8.4.2 Obtain one explicit objective and duration/budget envelope; run a
  fresh profile dry-run and use its first eligible selection only. No forced
  historical case, fallback provider, or retry loop.
- [ ] 8.4.3 Execute at most one bounded `agent_flow_e2e` observation from a
  real degraded Wave0 handoff through the Wave2 new-evidence decision; retain
  the Subject transcript/result, host facts, bundle status/trace, Gate JSON,
  and tool-call evidence.
- [ ] 8.4.4 Classify the first terminal outcome as `PASS`, `FAIL`, `NOT_RUN`,
  selection omission, or budget boundary. Static Markdown or a configured tool
  name is not a substitute for this evidence.

### 8.5 C2: Degraded Handoff Contract Reentry (Only On Reproduction)

- [ ] 8.5.1 Create C2 only when task 8.4.4 observes an unsolicited user
  choice/phase skip or a Phase-Agent direct research search/fetch. Otherwise
  mark this branch not applicable and close BUG-192/198 as current-head
  unobserved behavior residuals.
- [ ] 8.5.2 After C2 proposal artifacts are complete, run
  `$polish-openspec-change` before any apply work. Require two distinct passes,
  `ready for apply`, and change-artifact capture of every resolved finding.
- [ ] 8.5.3 If C2 is admitted and polished, use one focused OpenSpec proposal
  to reinforce
  the direct legal action after degraded handoff and the existing delegated
  search boundary. Do not add a chat observer, tool interceptor, new state,
  automatic continuation controller, or new skip route.
- [ ] 8.5.4 Apply, verify, and archive C2 through its approved task list, then
  rerun the same bounded real-Agent observation before claiming behavioral
  remediation.

### 8.6 BUG-188 And BUG-193 Host Disposition

- [ ] 8.6.1 Record the host-owned disposition for BUG-188: the current host
  already supplies display-only spinner/counters, but no DPT-consumable
  authoritative progress event. Do not open a DPT Change for this fact.
- [ ] 8.6.2 Close BUG-193 as the Wave1 duplicate of BUG-188, preserving its
  cross-phase observation without creating a second implementation route.
- [ ] 8.6.3 Reopen this host route only when the host owner documents a stable
  progress interface with task identity, timestamped progress/terminal events,
  retention/read API, and a stalled-versus-running owner.

### 8.7 Plan Closure

- [ ] 8.7.1 Confirm C1 has a terminal OpenSpec outcome and every residual card
  has either a completed disposition, an explicit host-owned boundary, or one
  current requalification result.
- [ ] 8.7.2 Confirm no unadmitted controller, retry loop, host adapter, or
  broad rewrite remains queued under this plan.
- [ ] 8.7.3 Move this plan to `_backlog/_done/_closed_plans/` using the normal
  backlog archival ritual only after all applicable checklist branches are
  complete or explicitly not applicable.
