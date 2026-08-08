# Progressive Delivery Plan

> Status: active / P1 and P2 archived; P3 unblocked for discovery
> Observed OpenSpec state: 2026-08-08, no active change. P1 archived as
> `2026-08-08-align-topic-focus-and-rerun-guidance`; P2 archived as
> `2026-08-08-add-traceable-topic-focus-coverage`.
> Scope: turn the confirmed Topic research-emphasis policy into small,
> reviewable OpenSpec changes without prematurely changing Harness behavior.

## Outcome

Deliver a novice-friendly way to express Topic research emphasis in natural
language, preserve it across legal reruns, make the additional work traceable,
and eventually let readers distinguish common baseline evidence from focused
incremental evidence.

The parent [design decision register](../README.md) remains the source for the
product decisions already accepted by the user. This directory is the delivery
control surface: it says what must be decided, proposed, verified, and archived
next.

## Why Progressive

The work crosses Agent UX, durable run guidance, rerun interpretation,
deterministic evidence checks, and reader-facing projections. A single change
would force unresolved policy into schema and Gate code, expand the blast
radius, and make failures hard to attribute. The slices below preserve the
existing HITL1 -> silent execution -> HITL2 rhythm and reuse current carriers
before adding structure.

```text
P0: Close remaining product semantics
  |
  +--> P1: Natural-language alignment and rerun guidance
          |
          +--> P2: Traceable focus coverage inside an existing Wave boundary
                  |
                  +--> P3: Reader evidence projection for baseline/increment
```

Only one proposed OpenSpec change is active at a time. A later slice may be
researched while an earlier slice is live, but it must not be proposed for
apply until its dependency has passed the stated exit check. A change also
must not enter `/opsx:apply` merely because its planning artifacts validate:
it first has to earn the explicit `ready for apply` outcome from
`$polish-openspec-change`.

## Progress Board

### P0 - Product closure, no OpenSpec change

- [x] Record the common-baseline, natural-language, rerun-history, and
  traceable-coverage decisions in the parent plan.
- [x] Audit the supplied completed bundle, existing carrier surfaces, current
  Gate boundary, and the apparent five-Topic prompt anchor.
- [x] Decide the reader-facing evidence model: how shared, Topic-specific,
  cross-Topic, baseline, and incremental material appear without becoming a
  second evidence authority.
- [x] Decide the routing meaning of focus coverage `partial` and `blocked`
  inside an existing Wave completion boundary.
- [x] Record the two decisions in the parent plan and pass P0 exit review.

Exit check: passed on 2026-08-08. The two decisions have an unambiguous reader
question, authority boundary, and no implied new lifecycle branch. P1's
proposal may now be created.

Detailed control: [00-product-closure.md](00-product-closure.md).

### P1 - Natural-language alignment and rerun guidance

- [x] Re-run OpenSpec discovery immediately before proposal creation; verify
  that no active change overlaps the selected capability set.
- [x] Create the focused proposal from
  [01-alignment-and-rerun-guidance.md](01-alignment-and-rerun-guidance.md).
- [x] Complete its required design, delta specs, `tasks.md`, and
  `verification-plan.yaml`.
- [x] Enter `/opsx:apply`, then apply, prove, close
  out, and archive the change before P2 begins.

P1 archived in commit `504a3d8cb`. Its deterministic contracts prove the
literal carrier, recovery, no-cap guidance, and rerun-history boundaries. The
retained real Agent-flow attempts are `NOT_RUN` or a quarantined failure, so
they are diagnostic evidence only and do not prove semantic focus handling.
P1 does not add focus-specific Gate behavior.

### P2 - Traceable focus coverage

- [x] Confirm P0 routing decision and P1 archived evidence. P2 must retain
  P1's real-Agent evidence boundary and cannot treat it as semantic success.
- [x] Create one focused proposal from
  [02-traceable-focus-coverage.md](02-traceable-focus-coverage.md).
- [x] Complete all required planning artifacts, then run
  `$polish-openspec-change <P2-change>` until it returns `ready for apply`.
- [x] Enter `/opsx:apply` only after that outcome; apply, prove, close out,
  and archive the change before P3 begins.

P2 proves that a declared focus has submitted evidence backing or a visible
limitation. It does not claim semantic correctness or create a third HITL. It
archived as `2026-08-08-add-traceable-topic-focus-coverage` after the governed
finalizer passed all archive checks. The deterministic tests prove the Engine
contract; Case 125 is registered as the real Agent-flow surface but was not
launched, so it supplies no current Agent-behavior outcome.

### P3 - Reader evidence projection

- [x] Confirm P2's actual output coordinates and reader evidence needs.
- [ ] Create one focused proposal from
  [03-reader-evidence-projection.md](03-reader-evidence-projection.md).
- [ ] Complete all required planning artifacts, then run
  `$polish-openspec-change <P3-change>` until it returns `ready for apply`.
- [ ] Enter `/opsx:apply` only after that outcome; apply, prove, close out,
  and archive the change.

P3 addresses the original `reference/` presentation problem. It presents
provenance-backed views; it does not relabel reference file count as research
quality.

## Per-Change Lifecycle Checklist

Use this checklist only after a slice's entry criteria pass. The actual
OpenSpec `tasks.md` becomes the execution source of record after proposal.

- [ ] Re-run `openspec list --json` and `openspec list --specs --json`; inspect
  only the relevant current main specs and any overlapping active change.
- [ ] Create a proposal with Chinese scope, explicit non-goals, capability
  discovery table, direct Source of Record, semantic-precision reflection,
  shortest legal control loop, and Agent/User/Engine boundary.
- [ ] Create design, delta specs, `tasks.md`, and `verification-plan.yaml`.
  Every task has one observable done condition and is small enough to complete
  independently.
- [ ] Run `$polish-openspec-change <change>` after the proposal and every
  `applyRequires` planning artifact are complete. It must perform at least two
  distinct review passes, repair every fact-determined finding in the change,
  and finish with its exact `ready for apply` outcome. Passing an ad hoc
  validation command is necessary evidence, but never a substitute for this
  gate.
- [ ] Invoke `/opsx:apply` only after the recorded `ready for apply` outcome.
  The polish skill's final strict validation, verification-routing, project
  requirement/spec, and `git diff --check` results are the apply-entry
  evidence.
- [ ] At apply entry, obtain current feedback guidance and complete the single
  `openspec-feedback:plan-review` task before the first target edit.
- [ ] Apply only the approved task list; keep Harness, tests, and playbooks
  read-only until that point.
- [ ] Run the slice's routed unit/integration/deterministic-E2E/agent-flow
  evidence, then record commands, results, and residual risk in the change.
- [ ] Complete delta/main semantic sync and re-comparison where applicable.
- [ ] Conduct the one `openspec-feedback:closeout-review`; turn every finding
  into an ordinary unchecked repair task.
- [ ] Pass strict OpenSpec validation, requirement-traceability, main-spec,
  capability-discovery, and verification-routing checks; archive only through
  `finalize-change-archive.mjs`.

## Stop Rules

Stop the current slice and return to P0 or its proposal/design artifact when:

- a requirement would add a new HITL checkpoint, separate lifecycle branch, or
  new canonical Topic identity;
- an alleged deterministic check needs the Engine to interpret free text or
  make a semantic research judgment;
- a proposed reader view would become a second source of evidence authority;
- its proof requires inventing source counts, receipts, Gate attempts, or
  agent-flow results rather than obtaining real evidence;
- a task cannot state one direct owner and a checkable done condition.

## Resume Protocol

On resumption, read this file, the parent plan, and the referenced phase file.
First run the two read-only OpenSpec listing commands again. Do not infer that
the observed active-change list is still current, and do not create a proposal
merely because a roadmap checkbox is visible. Before resuming an apply entry,
also confirm that the selected change has a recorded final
`$polish-openspec-change` outcome of `ready for apply`; otherwise resume
planning and polishing rather than `/opsx:apply`.
