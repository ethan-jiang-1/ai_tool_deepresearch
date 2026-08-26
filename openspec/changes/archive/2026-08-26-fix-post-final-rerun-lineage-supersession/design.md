## Context

See `proposal.md - Why` for motivation. Current state that shapes the approach:

- `handoff-helpers.mjs` builds a single linear descendant chain after an accepted post-final
  reentry (`continuousNormalDescendant`): it iterates every later `gate_attempt`, maps each through
  `edgeForAttempt` (which already returns `null` for `passed:false` attempts), then calls
  `makeHandoff` → `supersededBy`. Any candidate that `supersededBy` flags is dropped from the chain.
  The chain is then validated as strictly linear: each handoff `sourceNode` must equal the previous
  `targetNode`.
- `supersededBy(events, candidate)` currently returns the first later event at the same
  `gate` + `currentNodeRef` where (`e.passed !== true` OR `e.next !== source.next`).
- `edgeForAttempt` already excludes failed attempts from the handoffs array itself; the only way a
  failed attempt enters the chain is through `supersededBy` dropping a *passed* predecessor.
- `validateEnterPhaseTarget` selects the latest legal passed handoff and checks the requested node;
  `enter-phase.mjs` then separately runs `evaluateFinalEntryAdmission` and hard-fails — two verdict
  points that can contradict (BUG-245).
- The real trace (`dpt_rb_chinese-ai-inference-chips-vs-nvidia`) is strictly linear through two rerun
  rounds; the discontinuity is manufactured by `supersededBy` dropping the round-1 `hitl2→rerun` pass
  (732), so the chain jumps from a `hitl2` target to a `rerun` source.

## Goals / Non-Goals

**Goals:**
- Fix `supersededBy` so a failed attempt never supersedes a passed pass (BUG-244) and a
  different-`next` pass at the same gate/node is a separate lifecycle event, not a supersession
  (BUG-241), restoring a continuous descendant chain for multi-round post-final rerun.
- Make `enter-phase phase-final` expose a single non-contradictory authorization verdict (BUG-245).
- Keep the change minimal and local to the handoff/authorization surface; update the six tests that
  encode the old (wrong) failed-attempt-supersedes assumption and add deterministic regression
  coverage for the multi-round chain.

**Non-Goals:**
- No change to C5 event writing, post-final recovery workspace, rerun_count / style projection,
  or Final inventory series.
- No new lifecycle state, no sixth C5 stage, no widening of lifecycle authority.
- No hand-editing of the real bundle's trace/ledger/status.

## Decisions

**D1 — Narrow the `supersededBy` predicate to "literal re-run of the same decision".**

Replace the current superseder test (any later same-gate+node attempt where `passed!==true` OR
`next!==candidate.next`) with: a later attempt supersedes only when it is `passed:true`, has the
**same** `next`, and no different-gate `gate_attempt` occurs between the candidate and it.

- `passed:false` → `continue` (BUG-244). Rationale: `edgeForAttempt` already proves failed attempts
  never form a handoff; letting them also erase a prior passed pass was the defect. The chain-linearity
  guard, not supersession, correctly handles a stale pass.
- different `next` → `continue` (BUG-241). Rationale: the same HITL2 gate legitimately fires with
  `→rerun` in intermediate rounds and `→readiness` in the final round; these are distinct lifecycle
  events. The linear chain is the real authority — it naturally holds all round passes because each
  target equals the next source (hitl2→rerun→…→hitl2→readiness→…→final).
- intervening different-gate progress → no supersede. Rationale: this is what separates a genuine
  same-point re-run (adjacent re-attempts of the same decision) from a later round's independent
  re-entry (many different gates fire in between). It is exactly the difference between "I re-ran
  wave0 and re-decided wave0→wave1" and "round N ended hitl2→rerun, then a full new round ran".

*Alternatives considered:*
- Drop supersession from the descendant chain entirely and rely only on chain linearity. Rejected:
  supersession is still load-bearing for `latestLegalPassedHandoff`/preflight choosing the newest of
  two genuine same-point re-runs, and removing it would leave the eligibility of the "latest" decision
  ambiguous.
- Require same-`next` without the intervening-progress guard. Rejected: two *consecutive* rerun rounds
  that both end `hitl2→rerun` would wrongly collapse the first and re-break the chain on a third run.

**D2 — Fold the Final admission into `validateEnterPhaseTarget` as the single verdict.**

When the requested/selected target is `phases/phase-final.md`, `validateEnterPhaseTarget` runs the
existing `evaluateFinalEntryAdmission` on the chosen handoff before returning; if it fails, return
`ok:false` with the admission reason as the sole reason. `enter-phase.mjs` then no longer needs its
separate post-`Authorized` hard-fail for the final node.

Rationale: this preserves the exact deterministic admission facts (all invariants of
`evaluateFinalEntryAdmission` unchanged) while giving the Phase Agent one non-contradictory reason.
*Alternative:* keep the two-step flow and just reword messages — rejected because it leaves the
contradictory `Authorized` then `hard-fail` shape that BUG-245 reports.

Impact on other callers of `validateEnterPhaseTarget`: `recovery-contract.mjs`
`assessStructuredRecoveryAction` (kind `enter_phase`) and the gate-helpers re-export. For a
`enter_phase` recovery action targeting `phases/phase-final.md`, the admission gate now participates
in reachability — that is the intended single-verdict semantics and no existing test exercises
`enter_phase → phase-final` through `assessStructuredRecoveryAction` (verified in
`tests/engine/helpers/recovery-contract.test.mjs`). Non-final targets are unaffected
(`evaluateFinalEntryAdmission` returns `applicable: false`).

## Risks / Trade-offs

- [Relaxed supersession could leave two equal `next` passes from *different* real rounds un-collapsed.]
  → The intervening-progress guard plus strict chain linearity keeps exactly one live path; the newest
  handoff is still selected by `latestLegalPassedHandoff` when a genuine re-run exists. Covered by the
  deterministic regression scenario.
- [The corrected semantics flip existing regression expectations that encode the old
  failed-attempt-supersedes behavior.] → Six test sites are affected and updated together:
  `tests/engine/handoff-helpers.test.mjs` (2), `tests/integration/cli/enter-phase.test.mjs` (1),
  `tests/integration/cli/advance-status.test.mjs` (1), the `runSupersededBranch` boundary checks
  in `tests/integration/cli/handoff-witnessing-lifecycle.test.mjs`, and test 13 in
  `tests/integration/cli/check-gate-readiness-passed.test.mjs` (the gate now clears preflight and
  fails on content instead of a handoff-witness gap). This is the intended correction: a failed
  re-attempt must not roll back a real passed pass.
- [Folding admission into `validateEnterPhaseTarget` changes behavior for other callers of that
  function.] → Only the final-node path is affected; non-final targets short-circuit (`applicable:
  false`), and the same admission facts are enforced as before, just earlier and as the single reason.
  The recovery-contract caller gains the same single-verdict semantics; no existing test regresses.

## Migration Plan

No deployment/rollback surface beyond code + tests: implement `supersededBy` + `validateEnterPhaseTarget`
in `handoff-helpers.mjs`, drop the redundant final admission hard-fail in `enter-phase.mjs`, update the
six superseded-pass test sites, add the multi-round regression, then run `node --test` and the OpenSpec
governance checkers before sync/archive.

## Open Questions

None — the supersede predicate, the single-verdict shape, and non-goals are resolved above.
