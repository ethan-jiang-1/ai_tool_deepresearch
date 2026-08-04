## Context

See [proposal.md](proposal.md) for motivation. C2 crosses two existing
deterministic contracts without changing either one:

- `TopicApplyPlanSchema` validates topic-state input. Its current
  `projectTopicApplyValidationErrors()` already removes unsafe retained input
  values, but an `invalid_union_discriminator` can collapse to a generic
  `invalid_union` result. `ProjectionSourceIdentitySchema` knows the raw
  `submitted_work|finding` union, while the existing Wave refinement makes
  Wave0/Wave1 legal only with `submitted_work` and Wave2 legal only with
  `finding`.
- `resolveWorkUnitAssignmentContract()` already reads only
  `queueItem.payload.assignment_mode` and rejects every other apparent source
  of assignment intent. `evaluateQueueDemandAdmission()` catches that direct
  failure as `assignment_contract_rejected`, but `operate-queue enqueue`
  currently turns it into an unstructured stderr string.

The affected runtime requirements are `CTS-004` and `QIV-001`. A C1 sync typo
also left the registered `CTS-009` text in the accepted main spec under a
literal `+### Requirement` line rather than a parsed requirement heading. The
requirement registry and C1 archived delta establish its intended content. C2
will restore that heading in place during spec sync without changing CTS-009
behavior. The delta specs otherwise retain their full existing contracts and
add the narrow feedback behavior from the proposal. No runtime bundle, Queue
state, ledger, schema wire value, or lifecycle contract needs migration.

## Goals / Non-Goals

**Goals:**

- Make a deterministic rejection sufficient for an Agent to perform the one
  already-authorized mechanical repair and rerun the same checkpoint.
- Preserve one validator/rule source for each fact while letting the result
  distinguish raw schema vocabulary from contextual legality.
- Preserve normal exit codes, valid-input behavior, and fail-before-mutation
  behavior.
- Restore CTS-009 as one parseable accepted-spec requirement during sync without
  reopening C1 implementation or adding a C2 runtime claim.

**Non-Goals:**

- Create a generic repair framework, response registry, new CLI, state,
  Queue status, Gate, controller, or retry path.
- Make `work_unit` an accepted alias, relabel `submitted_work`, or reinterpret
  Work-unit/submitted-provenance vocabulary.
- Infer a Wave1 assignment from a top-level field, receipt shape, ID, prose,
  `writes_to`, or any existing queue row.
- Repair input on the Agent's behalf, write `rb_queue.json`, change a task
  card, or make a claim about real Actor delivery behavior.
- Alter the behavior or normative content of CTS-009; its C1 text is restored
  as an accepted-spec heading only.

## Decisions

### 1. Feedback is an additive, non-authoritative result projection

The reader-facing object is not a new persisted model. It is an additive set of
fields on an existing rejected operation result that answers one bounded
question: the direct fact, legal repair surface, and same checkpoint.

| Rejection | Direct authority | Writable surface | Same checkpoint |
| --- | --- | --- | --- |
| Wave projection discriminator | `TopicApplyPlanSchema` plus its existing Wave refinement | retained apply input | `operate-topic-state apply` |
| Wave1 assignment mode | existing work-unit assignment contract | retained unqueued task card | `operate-queue enqueue` |

This is the semantic-precision boundary. It preserves the differences a repair
needs: schema-global versus Wave-contextual values, submitted provenance versus
an attempt label, and caller input versus Engine-owned Queue authority. A
reader may stop at the result; authority/audit still remains in the underlying
schema or assignment resolver.

Alternatives rejected:

- A durable feedback record would introduce a second truth surface for an
  ephemeral validation result.
- A generic feedback controller would add lifecycle behavior to a one-command
  repair loop.
- A Markdown-only explanation would leave the actual deterministic rejection
  opaque and could drift from the rule source.

### 2. Topic-state enriches the existing Zod projection without revalidating

`projectTopicApplyValidationErrors()` remains the only result projector for a
failed `TopicApplyPlanSchema.safeParse()`. Apply will improve its leaf selection
for nested union issues, retain its safe-message/no-retained-value policy, and
add an RFC 6901 `json_pointer` alongside the compatible field path.

For the one recognized projection discriminator coordinate, the implementation
will factor the existing Wave-to-source-kind constraint into a single shared
declaration used both by the existing refinement and feedback projection. The
feedback may expose:

```json
{
  "path": "updates[0].entries[0].source_identity.kind",
  "json_pointer": "/updates/0/entries/0/source_identity/kind",
  "code": "invalid_union_discriminator",
  "allowed_values": ["submitted_work"],
  "schema_allowed_values": ["submitted_work", "finding"]
}
```

`allowed_values` always answers the selected valid Wave's repair question.
`schema_allowed_values` is optional explanatory context, never an alternate
legal set. If the Wave cannot be established from valid existing input, the
projector must leave the narrowed field absent instead of guessing. The outer
blocked result keeps its current `input_invalid`, `repair_kind: agent_action`,
retained-input surface, and same-apply rerun semantics.

The narrowed value comes only from the parsed Wave through that shared
Wave-to-kind declaration, not from a per-slot label: `pending_questions` is a
multi-Wave slot and therefore cannot decide the legal kind for a particular
packet. When present, `schema_allowed_values` comes from the selected nested
Zod discriminator issue's declared options rather than a second hand-maintained
union list. Both choices make the feedback a projection of the accepting rule,
not a second validator.

This is one direct schema/refinement source, not a parallel check. No accepted
packet becomes newly valid, and no input value is echoed back.

### 3. Queue admission preserves structured assignment facts to the CLI seam

The assignment resolver will attach structured metadata exactly where it
already rejects the missing/unknown Wave1 payload value. The metadata is data
about the direct failure, not a second condition: `coordinate`, JSON Pointer,
closed values, and the task-card owner. `evaluateQueueDemandAdmission()` will
preserve that metadata in its existing non-persisted
`assignment_contract_rejected` result.

The evaluator and enqueue seam recognize the structural metadata, never an
error message or `assignment_contract_rejected` alone, when choosing the new
feedback branch. That keeps a later receipt, reserved-selector, or other
assignment-contract rejection on its existing path.

`operate-queue enqueue` will explicitly emit that rejected admission result as
JSON on stdout and exit `1`. It will name the supplied task input as the
retained unqueued task-card repair surface, state that `rb_queue.json` is not
writable for this unqueued repair, and provide the same enqueue invocation
boundary. The Queue must not be saved and no queue success/repair trace event
may be written first. This JSON branch is selected only by the exact structured
missing/unknown-mode failure. A task with a legal mode that later fails a
receipt or another assignment-contract rule retains its existing generic error
channel and SHALL NOT gain a false assignment-mode coordinate or allowed-value
set. Existing unrelated invocation/configuration failures keep their current
behavior and exit classification.

The same admission evaluator is still used by enqueue, check, claim, and stale
repair. Those consumers may present their existing envelopes, but none may
duplicate the assignment-mode rule or infer it from a neighboring field.

Alternatives rejected:

- Catching the current error string in each CLI consumer would be brittle and
  create multiple rule interpretations.
- Auto-moving a top-level field or editing Queue state would make a rejected
  input appear admitted without an Agent-controlled repair.
- Adding an enqueue repair command would create a second mutation path for a
  fact that belongs to the original task card.

### 4. Control and responsibility remain deliberately small

The shortest loops remain direct-fact -> existing checker -> bounded feedback
-> Agent repair -> same checker. The only complexity added is a projection of
facts the check already knows. It avoids multiple source inspections, schema
commands before every retry, manual Queue edits, a diagnostic artifact, and a
new feedback layer.

The Agent owns correcting its retained input and rerunning a legal command. The
Engine owns the deterministic rejection and safe feedback. The user has no
ordinary action in either loop; new semantic/risk/permission decisions remain
outside the result contract. This is a local convergence toward the
helper-oriented direction without treating human-directed language as
permission or introducing a new interaction point.

### 5. Compatibility, terminology, and release are explicit

Existing callers retain `reason_code: input_invalid` or
`reason_code: assignment_contract_rejected`, their valid-success output, and
the normal `0`/`1`/`2` exit distinction. New feedback keys are additive.
`submitted_work` remains the serialized provenance discriminator defined in
`CONTEXT.md`, while a Work unit remains an Engine-allocated attempt; no glossary
change is needed because C2 clarifies use rather than introduces a term.

The existing Engine-owned repair path for already queued historical cards
remains a compatibility surface outside this unqueued enqueue loop. It does
not make direct `rb_queue.json` editing legal, and C2's new feedback does not
redirect a freshly rejected task card to it.

Because the C2 output contract changes user-visible framework behavior, apply
will release it as v0.71 in the existing changelog and RUN banner. The release
note must say that feedback projects existing contracts and does not add an
alias, validator, automatic repair, or Actor-behavior proof.

### 6. CTS-009 is restored as specification structure, not C2 behavior

The current main `canonical-topic-state` spec has the C1 CTS-009 body, but its
heading begins with the literal `+###` recorded in commit `0f64d6f0d`. The
registered ID and the archived C1 delta are the authoritative semantic source.
During the supported agent-driven sync, the main spec will normalize that one
literal prefix in place and compare the resulting body to the archived delta.
The active C2 delta names CTS-009 as a modified requirement only so sync has a
canonical desired block; it MUST NOT append a second block, revise C1 behavior,
or produce a runtime implementation task.

## Risks / Trade-offs

- **Context projection accidentally disagrees with validation** -> Factor the
  Wave-to-kind constraint used by the current refinement and feedback into one
  source, then exercise each Wave plus invalid-Wave fallback.
- **A nested Zod issue exposes retained data** -> Keep the existing safe
  projection allowlist; tests assert absent arbitrary input values and stack
  data.
- **CLI JSON handling changes unrelated queue errors** -> Handle only the
  structured admission result at the enqueue boundary, preserve other exit
  paths, and run existing queue integration coverage.
- **Feedback implies the Queue can be edited directly** -> Make the task-card
  repair surface and Queue prohibition an explicit result/spec assertion; test
  that rejected enqueue leaves Queue bytes and trace authority unchanged.
- **The special queue JSON branch swallows another assignment error** -> Attach
  metadata only at the existing mode check; test a legal mode with invalid
  receipts remains outside that feedback branch.
- **Sync duplicates or loses CTS-009** -> Normalize the literal heading in
  place from the archived C1 delta, then require exactly one parsed CTS-009
  block and the project-spec governance check after sync.
- **C2 is mistaken for an Actor-delivery fix** -> Keep BUG-195 and E2 outside
  the claims/verification plan; deterministic fixture evidence says nothing
  about a current real Actor following guidance.

## Migration Plan

1. Before target edits, recheck the direct Zod/refinement and assignment
   resolver seams named above, then run the routed verification-plan check.
2. Implement the two additive feedback projections and their focused unit
   coverage before changing either production CLI boundary.
3. Add CLI integration coverage over temporary bundles proving exact output,
   exit codes, non-mutation, and valid-input compatibility.
4. Update only the v0.71 release surfaces and the remediation-plan/bug status
   after deterministic verification passes. During agent-driven spec sync,
   first normalize the one literal CTS-009 heading in place from the archived
   C1 delta, then merge C2's CTS-004/QIV-001 behavior changes and prove that
   CTS-009 appears exactly once before archive.

Rollback is a coherent framework-version revert. There is no runtime data,
workspace, trace family, schema migration, or persisted feedback record to
undo.
