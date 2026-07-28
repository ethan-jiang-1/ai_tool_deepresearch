## Context

The existing `advance-status` CLI derives a terminal status window from the
manifest and transition chain, then writes `current_gate` and `next_gate` to a
copied status object before appending its `phase_transition` trace. BUG-135
shows that preserving the old `state` creates contradictory runtime truth at
the one terminal transition.

`rb_status.json` is the direct lifecycle source of record. The affected
semantic level is an existing RunState value, `completed`, for one bounded
reader question: has the ordinary readiness-to-Final handoff committed? It
must retain the difference between that completed terminal window and the
accepted post-final recovery flow, which deliberately returns to the existing
rerun status window after a different, trace-bound operation.

## Goals / Non-Goals

**Goals:**

- Commit `state: completed` only with the normal `readiness_passed / none`
  terminal status window.
- Retain status-write/trace-append rollback as one atomic transaction over the
  complete status object.
- Prove terminal success, trace failure rollback, and post-final recovery
  compatibility through existing production CLIs and disposable bundles.

**Non-Goals:**

- Redefining `not_started`, `in_progress`, or `blocked` for intermediate
  phases.
- Adding a completion gate, status normalizer, recovery operation, writer, or
  derived consumer-side completion predicate.
- Changing Final content delivery, trace grammar, post-final eligibility, or
  rerun route selection.

## Decisions

### 1. Set completion in the existing next-status construction

The normal terminal condition is fully determined by existing direct facts:
`targetGateEnum === 'readiness_passed'` and derived `nextGateEnum === 'none'`.
Apply will add `state: 'completed'` to that one next-status object only under
this condition. The existing `writeFileSync(status)` then trace append path
already owns atomic restoration from `previousStatusRaw`.

**Alternative considered:** a new terminal-status validator or a separate
post-write mutator. Either creates a second completion authority and can leave
the gate pair and lifecycle state independently durable, so it is rejected.

### 2. Preserve the post-final exception unchanged

The accepted post-final path calls `advance-status --to hitl2_recorded` after a
trace-bound rerun load. It does not derive the terminal condition and therefore
must retain its current status object behavior. This preserves the distinction
between terminal delivery and legal reentry without inventing a transition
table entry or an additional lifecycle state.

**Alternative considered:** infer completion from every `next_gate: none` at a
shared status layer. That broadens behavior beyond the normal terminal
handoff and obscures ownership, so it is rejected.

### 3. Test the CLI transaction, not a mock state projection

Focused integration tests will keep using temporary bundle status/trace files
and invoke the production CLI. The terminal case asserts the whole triple; the
existing trace-permission fault case asserts byte-for-byte status rollback; the
existing post-final recovery fixture proves the rerun exception remains
compatible with a completed terminal bundle.

## Risks / Trade-offs

- A condition keyed only to one terminal gate could miss a future terminal
  route -> Mitigation: bind it to both existing terminal facts and retain the
  transition-chain-derived `none` condition.
- A broad edit could alter post-final recovery -> Mitigation: keep the change
  local to normal next-status construction and execute existing recovery tests.
- Test environments may allow appending despite a read-only trace -> Mitigation:
  retain the current fault seam and compare complete status bytes, not only the
  lifecycle field.

## Migration Plan

1. Add the bounded field assignment and focused regressions.
2. Run selected integration and recovery suites, governance checks, and strict
   OpenSpec validation.
3. Existing terminal bundles retaining the historical inconsistent state are
   not bulk rewritten. Their runtime status remains historical; new successful
   normal terminal transitions write the correct triple.
4. If trace rollback fails in verification, revert the scoped code change and
   retain the existing transaction until a separate atomicity change is
   specified.

## Open Questions

None. The existing transition table, status schema, and post-final regression
fixtures define the applicable boundary.
