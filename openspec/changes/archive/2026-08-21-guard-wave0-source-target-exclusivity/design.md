## Context

See `proposal.md` for motivation. Current Wave0 assignments resolve every source-intake demand for one canonical Topic to the same required direct output, `artifacts/wave0/{topic.slug}/source.yaml`. Submit derives `source_contribution` from the complete validated array visible at submission time; RRM-007 then uses ledger order and strict prefix extension to assign global ordinals.

That model supports serial append but cannot authenticate simultaneous writers. The existing queue-demand admission helper already resolves canonical Topic binding and the immutable assignment output contract for enqueue, check, and claim, but it currently receives no current queue/in-flight target-owner facts. Claim previews a contiguous prefix before actor selection and rechecks queue/index bytes inside the existing work-unit transaction before mutation.

## Goals / Non-Goals

**Goals:**

- Derive one exact, non-persisted Wave0 target-owner fact from current accepted owners.
- Reuse one pure conflict verdict across enqueue, check, claim preview, and claim transaction recheck.
- Preserve claim batch atomicity and allow different-target Wave0 fan-out.
- Let an older queue containing duplicate targets drain serially without migration or destructive repair.
- Keep current submitted contribution and projection behavior unchanged.

**Non-Goals:**

- No concurrent fragment/patch output, Engine merge, compare-and-swap append, per-entry contribution schema, or source-array snapshot storage.
- No cache-trail/URL-based ownership inference and no deduplication change.
- No persistent target lock, scheduler, queue state, CLI command, Gate rule, recovery path, or historical ledger repair.
- No change to Wave1/Wave2 assignment independence.

## Decisions

### Derive target identity from the assignment contract

For each admitted `wave0_source_intake` card, the existing canonical Topic resolver and `resolveWorkUnitAssignmentContract()` remain the only route to the exact required tuple. The conflict key is the required output tuple's canonical `path` where role is `source_yaml` and direct contract is `wave0.source-metadata-array.v1`; it is not accepted from caller-authored `writes_to`, result declarations, task prose, queue ID, cache trail, or URL.

The pure admission result will expose the already resolved exact target for immediate consumers. An ephemeral Zod-validated fact shape will distinguish:

```text
candidate: { queue_item_id, target }
owner:     { owner_kind: queued | in_flight, queue_item_id, work_id? , target }
```

No form is persisted. Cross-field refinement requires `work_id` exactly for `in_flight` owners and exact candidate/owner target equality in a conflict result.

Alternative rejected: infer ownership from Topic slug directly in every caller. That duplicates assignment behavior and can drift when assignment path/version rules change.

### Build one ordered current-owner view in the existing adapter

The side-effect-free adapter will read schema-valid queue and work-unit authority using existing readers. It will resolve an unclaimed demand through the current canonical Topic plus assignment resolver, while an in-flight attempt's immutable target comes from its current-profile-valid index/queue binding and validated manifest `output_contract`; it will not reinterpret a claimed assignment from mutable current Topic state:

1. Delegated in-flight owners take precedence because an allocated attempt currently has write authority bound to its validated manifest output contract.
2. For unclaimed queue demand, scan `active_window` followed by canonical refill order; the first demand for an otherwise unowned target becomes its queue owner.
3. Later same-target demand receives a conflict that points at that owner.
4. The candidate being checked is excluded by queue identity, so it never conflicts with itself.
5. Terminal history and submitted ledger rows are not current owners. Their contribution remains governed by submit/projection contracts.

Enqueue treats the unqueued candidate as later than existing admitted demand. Check projects conflicts for later persisted cards without mutating them. Claim passes its requested contiguous prefix and existing in-flight owners into the same ordered evaluation.

Alternative rejected: add `target_owner` to `rb_queue.json`. It would duplicate derivable assignment truth, require migrations and recovery, and create stale owner state.

### Reject an unsafe requested batch, then let the Agent reduce it

Claim retains its existing all-or-nothing planned-prefix contract. If requested `--count N` includes a second owner for a target, the whole request returns zero claims with `wave0_source_target_conflict`. It does not silently shrink the requested batch because that would hide which requested contract was accepted.

The feedback names the exact target and current owner and uses the existing queue/claim-admission `repair_kind: agent_action`, not the attempt-recovery vocabulary's separate `wait` value. When the queue-order-earliest item is the owner and no attempt is in flight, the nearest legal action is to rerun claim with the largest conflict-free contiguous count, often `1`; when an attempt owns the target, the action is to poll, submit, repair, or terminalize that disclosed attempt through its existing contract and rerun admission. Once it terminalizes, normal admission is recomputed.

Alternative rejected: reject every card in an already duplicated legacy queue. That would leave no legal way to drain it. Alternative rejected: automatically remove or merge later cards. Queue demand carries semantic intent that the Engine cannot discard or combine.

### Recheck target ownership under the existing claim transaction

Preview admission returns early feedback before actor and delivery work. The existing `recheckClaimPlan()` boundary under `withWorkUnitTransaction()` will rebuild fresh queue/index target facts and repeat the same evaluator before the first queue shift, work-ID allocation, envelope write, or success trace. Existing queue/index hash and prefix checks remain in place.

No new state machine is introduced. The applicable transition remains:

```text
queued owner --existing claim--> delegated_in_flight
delegated_in_flight --existing submit/fail/timeout/abandon--> terminal
blocked later demand --fresh admission after terminal--> eligible queue owner
```

### Keep conflict feedback out of stale-removal semantics

`wave0_source_target_conflict` is a temporary ordering dependency, not a stale or malformed task card. Queue check will return the structured owner/target/same-check information and SHALL not reuse generic advice to `repair --remove-stale`. Queue repair must not delete a valid blocked same-target demand solely because it is temporarily non-independent.

### Preserve the submitted contribution contract

`SourceContributionSchema`, ledger hashing/recovery, `evaluateDeclaredContributionGroup()`, and `<work_id>/<global ordinal>` identities remain unchanged. Focused regression will continue to prove that a deliberately non-monotonic accepted history fails closed. A separate serial supplement case will prove that target release after submission allows a later append and yields strict intervals.

Alternative rejected: accept equal full-array snapshots and divide ownership using cache trails or URLs. Those facts do not bind ordered array positions, duplicate URLs are legal distinct candidates, and the approach would fabricate historical attribution.

### Design review

**Semantic precision:** the tightened `independent Wave0 demand` asks only whether simultaneous candidates resolve to pairwise distinct exact direct-output targets. Demand purpose, Topic identity, target identity, current owner, and submitted ordinal ownership remain distinct. Reasoning stops at one conflict/no-conflict result.

**Simple reliable control:** direct assignment output plus current queue/in-flight facts replace the late Gate failure with the shortest legal loop: admit -> reject or claim -> terminalize -> re-admit. The change avoids a merge controller, target lock record, recovery state, fragment schema, and second projection reader.

**Helper-oriented responsibility:** the Agent decides how to combine research dimensions and whether a later supplement is still semantically needed; it executes the returned owner-completion/reduced-count/same-check loop. The Engine alone resolves exact targets, identifies current mechanical ownership, preserves transaction atomicity, and validates later contribution monotonicity. User direction cannot override target exclusivity.

## Risks / Trade-offs

- [Same-topic research loses parallel speed] -> Retain full cross-topic concurrency; one actor may cover multiple dimensions in its bounded brief, and later supplements remain legal after terminalization.
- [Older queues already contain duplicate targets] -> Treat the earliest unowned card as owner and drain serially; never require migration or deletion.
- [A target changes through canonical layout mutation] -> Resolve unclaimed demand from fresh current canonical Topic and assignment facts, but retain each in-flight attempt's validated immutable manifest target; existing quiescence/layout contracts remain prerequisites and malformed current-profile facts fail through their existing owner rather than being relabeled as a target conflict.
- [TOCTOU between preview and mutation] -> Repeat the identical target evaluation under the existing transaction lock alongside queue/index hash checks.
- [Generic queue repair deletes a temporarily blocked demand] -> Classify target conflict separately from stale admission and add regression that `repair --remove-stale` preserves it.
- [Feedback suggests waiting forever after a failed owner] -> Any existing terminal route releases ownership; the Agent follows current submit/fail/timeout/abandon/replacement feedback and reruns the same admission boundary.

## Migration Plan

1. Add ephemeral schemas/fact derivation and the pure target-conflict truth table without changing persisted schemas.
2. Route enqueue/check and claim preview/recheck through the new current-owner input; preserve byte-for-byte state on rejection.
3. Update Wave0 and shared batch guidance, then add focused unit/integration regressions.
4. Release normally. Existing non-monotonic submitted histories remain fail-closed and require no automatic mutation; existing duplicate queued demand drains serially.

Rollback removes the new admission constraint and guidance together. No persisted data rollback is required because the change writes no new runtime field or migration marker.
