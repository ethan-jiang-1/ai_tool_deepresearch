## Context

See `proposal.md` for motivation. Case 225 creates a canonical Wave1 Topic in
its setup, then queues a demand through `queueItemForWorkUnit()`. The helper
has a valid default Topic UID for callers that use its default fixture, but
Case 225 deliberately declares a different canonical Topic. The omitted
argument therefore makes the existing Queue admission reject an otherwise
valid demand before the playbook can reach its real Subject-Agent boundary.

The Queue admission contract already owns this identity check and must remain
strict. The playbook owns the missing binding at the producer boundary.

## Goals / Non-Goals

**Goals:**

- Make the one queued Case 225 Wave1 demand use the canonical Topic object's
  `topic_uid`.
- Make the existing Markdown contract regression prove that a playbook with a
  custom canonical Topic UID passes that UID into its queued demand.
- Preserve the registered real-Agent setup-only execution and native
  completion boundary for the later observation.

**Non-Goals:**

- Do not change Queue schemas, admission, work-unit lifecycle, topic identity,
  Subject-Agent behavior, native completion, or Supervisor timeout behavior.
- Do not add a Topic resolver, a Queue exception, a runtime repair action, or
  a new experiment case.
- Do not interpret the static regression as a Subject-Agent execution result.

## Decisions

### 1. Bind the queued demand from the Topic object created by the case

The `queueItemForWorkUnit()` call will receive `topic_uid: topic.topic_uid`.
The Topic object is the direct current source of record in the setup; passing
its value keeps the evidence path short:

```text
case-owned Topic object
  -> queue item with the same topic_uid
  -> existing strict Queue admission
  -> existing Subject-Agent boundary
```

**Alternative considered:** use the helper's default UID. Rejected because it
would make this case's custom Topic declaration semantically inert and again
diverge from the plan/registry identity that Queue admission checks.

**Alternative considered:** relax Queue admission when the helper default is
present. Rejected because the existing rejection is the correct deterministic
protection against cross-Topic work.

### 2. Extend the current contract test at the Markdown producer boundary

The focused integration regression will extract the case's canonical Topic UID
and assert that the queue helper call supplies that exact binding. It will use
a custom UID as the proof condition, so an omitted field cannot pass by
coinciding with the helper default.

**Alternative considered:** add a test-only helper invocation or hand-built
Queue snapshot. Rejected because it would test a different producer path and
could conceal the Markdown omission that caused the retained run to stop.

### 3. Preserve the existing semantic and responsibility boundaries

No state, projection, command, evaluator, or reader-facing concept is added.
The existing bounded reader question is whether Case 225 can construct a
Queue-admissible demand for its declared Topic before Subject launch. This is a
net simplification: one explicit source binding replaces a hidden default
mismatch and avoids a runtime repair or a second identity check. The user has
authorized this mechanical fixture correction and the follow-up run; the
Agent performs the edit, while Queue admission and native completion remain
the Engine's verdict authorities.

## Risks / Trade-offs

- [The helper signature changes later] -> the contract test fails at the
  playbook producer boundary and requires an explicit re-alignment.
- [The real run reaches a different boundary after admission succeeds] ->
  retain its native outcome separately; do not treat this fixture correction
  as evidence of broad Subject-Agent success.
- [A future case deliberately needs a distinct Topic] -> it must pass that
  identity explicitly and be covered by its own contract, rather than relying
  on this case's binding.

## Migration Plan

1. Add the focused contract assertion and demonstrate that the unbound
   playbook fails it.
2. Pass `topic.topic_uid` to the existing queue helper and rerun the focused
   test and registered-playbook validation.
3. Validate and archive this no-spec-delta change, then run Case 225 with the
   explicitly authorized remaining experiment budget.
4. Revert by removing the explicit binding only if the Case 225 canonical
   Topic declaration itself is retired; no runtime data migration is involved.
