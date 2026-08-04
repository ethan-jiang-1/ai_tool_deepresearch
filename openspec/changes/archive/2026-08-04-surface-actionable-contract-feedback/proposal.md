## Why

`BUG-190` and `BUG-194` expose the same control-loop defect at two different
Engine boundaries. The Engine correctly rejects an invalid retained packet or
an unqueued Wave1 task card, but its current feedback omits the direct
coordinate, context-legal closed values, legal write surface, or same-command
rerun. An Agent must therefore reverse-engineer an already-declared contract
before it can make an ordinary mechanical repair.

The source incidents are
`_backlog/bugs/BUG-190-source-identity-kind-naming-obscure.md` and
`_backlog/bugs/BUG-194-wave1-assignment-mode-payload-location.md`. Their
current admission evidence and the deliberately excluded `BUG-195` observation
boundary are recorded in
`_backlog/plans/bug-187-199-systemic-remediation-plan.md`.

## What Changes

- Extend existing topic-state Zod-error projection so a rejected
  `wave_projection` packet can expose the exact JSON Pointer for a bad
  `source_identity.kind`, the raw schema discriminator vocabulary when useful,
  and the narrower value legal for the selected Wave. For Wave0 and Wave1 that
  repair value is `submitted_work`; for Wave2 it remains `finding`.
- Preserve `TopicApplyPlanSchema` as the only topic-state validator. The
  result will enrich its existing bounded `validation_errors[]`, primary
  coordinate, retained-input repair surface, and same-`apply` rerun rather than
  add an alias, second validator, writer, state, or repair command.
- Extend the existing delegated queue-demand admission result for an
  assignment-contract rejection. `operate-queue enqueue` will emit a
  structured exit-1 response that names `payload.assignment_mode`, the closed
  `primary|supplementary` values, the retained unqueued task card as the legal
  repair surface, and the same enqueue rerun. This JSON branch applies only to
  that direct missing/unknown-mode failure; unrelated assignment-contract
  failures retain their existing error behavior.
- Keep the existing work-unit assignment resolver as the sole rule source.
  The queue feedback will project its direct failure; it will neither infer
  assignment intent from top-level fields, receipts, IDs, or prose nor permit
  edits to `rb_queue.json`.
- During accepted-spec sync, normalize the literal malformed `+### Requirement`
  heading for registered `CTS-009` that C1 wrote into the main topic-state
  spec. Preserve the archived C1 requirement exactly as one proper heading;
  do not add runtime work, a duplicate requirement, or a new requirement ID.
- Release the implemented framework behavior as **v0.71** during apply,
  including the matching `CHANGELOG.md` and `DPT_FRAMEWORK/RUN.md` update.

### Scope And Non-Goals

This change is limited to the deterministic feedback surfaces proven by
BUG-190 and BUG-194. It does not rename or accept `work_unit` as an alias for
the `submitted_work` wire discriminator; that discriminator records submitted
provenance and is intentionally distinct from a Work unit. It does not alter
projection ownership, Queue/Work-unit lifecycle, topic-state authorization,
assignment receipt shapes, or exit success semantics.

`BUG-195` is not included. Current source-claim schema, task-envelope
generation, Wave1 control guidance, and extractor guidance already name
per-claim `cache_trail_refs`; no retained current real Actor-generated omission
has been admitted. A future change requires that distinct evidence package,
not a speculative delivery-contract change here.

The CTS-009 heading normalization is an accepted-spec structural correction,
not an expansion of C2. Its authority is the registered `CTS-009` ID and the
archived C1 delta. It changes neither C1 behavior nor C2's two feedback loops.

### Semantic Precision, Control, And Responsibility

The reader is an Agent repairing one rejected command. Its bounded question is
"Which exact contract fact may I change, where may I change it, and which same
checkpoint proves the repair?" The feedback preserves distinctions that change
the answer: global Zod-union vocabulary versus selected-Wave legality,
`submitted_work` provenance versus a generic Work-unit label, a retained
topic-state input packet versus an unqueued task card, and Agent-writable
input versus Engine-owned `rb_queue.json`. The Agent can stop at this bounded
feedback record or receive an honest owner/no-path boundary without rebuilding
schemas or code.

The shortest legal loops are:

```text
retained topic-state input -> existing TopicApplyPlanSchema -> precise feedback
  -> correct the retained input -> rerun the same apply

retained unqueued task card -> existing assignment contract -> precise feedback
  -> set payload.assignment_mode -> rerun the same enqueue
```

No Gate, lifecycle state, feedback controller, retry tree, mutation route, or
second validator is added. The Agent performs the already-authorized mechanical
input repair and rerun; the Engine continues to decide schema and assignment
validity; the user retains only new semantic, risk, or permission decisions,
none of which are required by these ordinary repair loops.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `canonical-topic-state`: invalid topic-state apply feedback shall retain the
  existing validator's authority while safely exposing context-precise
  discriminator expectations and the existing retained-input rerun loop.
- `queue-input-validation`: delegated enqueue admission shall project
  assignment-contract failures as actionable structured feedback at the task
  card boundary without mutating or authorizing edits to Queue authority.

## Impact

- Framework code: `canonical-topic-state` validation projection, the existing
  work-unit assignment-contract error boundary, shared delegated-demand
  admission result, and `operate-topic-state` / `operate-queue` output seams.
- Framework guidance: only the existing command/task surfaces that need to
  consume the enriched feedback; no new lifecycle documentation or Actor
  delivery contract is introduced.
- Verification: focused helper and CLI integration coverage will prove exact
  coordinates, context-legal values, JSON stdout/exit-1 behavior, no queue or
  topic-state mutation on rejection, and unchanged valid input behavior.
  These deterministic fixtures do not claim current real Actor behavior.
- Governance and release: no new requirement ID is needed because the runtime
  work refines existing `CTS-004` and `QIV-001`, while sync restores the
  already-registered `CTS-009` heading without changing its behavior. Apply
  will update the v0.71 release surfaces and the remediation-plan/bug
  dispositions only after focused verification passes. No dependency is added.
