## Context

See [proposal.md](proposal.md) for the motivation. The affected source files
already express their current contracts: selected existing bundles require the
current same-root entry/map pair; HITL1 names the repair kinds its current
roots can actually emit; historical `related_topic` is human-readable but not
current Engine input; and a new work-unit envelope requires the complete v3 /
submission-v1 / actor-v1 profile. One actor-delivery assertion still expects
an incomplete envelope to publish without actor guidance, while the focused
work-id fixture supplies neither its current assignment facts nor its actor
profile.

The drift is limited to Markdown assertions, one public RUN.md projection, and
test-owned envelope setup. No test proves an alternate production path, and no
target edit may alter the existing owner.

## Goals / Non-Goals

**Goals:**

- Make every affected test state the current observable boundary rather than
  a retired literal or legacy fixture shape.
- Put the existing logical-actor/non-liveness boundary where a RUN.md reader
  can see it without inferring it from a lower-level work-unit guide.
- Keep current-envelope proof strict by supplying the exact profile in positive
  test setup and asserting rejection of the incomplete legacy envelope.

**Non-Goals:**

- Changing entry selection, selected-bundle preflight, HITL1 repair routing,
  historical reference readability, work-unit profile validation, or any
  production guidance outside `RUN.md`.
- Adding a compatibility reader, fallback, migration, alias, state, command,
  or accepted requirement.
- Broad wording normalization of `CONTEXT.md`, root instructions, Harness
  docs, or test assets not named in the proposal.

## Decisions

### Use owner-based assertions, not literal historical phrases

The routing test will verify the current pair preflight, current invalid-pair
stop, new-run default, and pre-entry prohibition without requiring the
pre-C3 phrases that described old routes. The HITL1 assertion will distinguish
its real `user_decision`, `agent_action`, `engine_operation`, and
`missing_contract` cases from the generic capability vocabulary: it must not
require an `external_action` branch with no current HITL1 root. The reference
test will assert the current writer/rejection split directly.

Alternative rejected: change the current docs to recover old phrases or add
an unused repair kind. That would create a misleading compatibility projection
instead of testing the present owner contract.

### Add one bounded RUN.md safety statement

`RUN.md` will state that `actor_execution` is a logical attempt binding, not
physical-writer authentication or host/sub-agent liveness proof. It will point
the reader back to the existing work-unit/receipt path for actionable facts;
it will not introduce a new check, observation, recovery command, or actor
state.

Alternative rejected: leave the fact only in deeper role/protocol guides.
`RUN.md` already serves as a public recovery surface, so omitting this limit
lets its reader overinterpret the binding.

### Centralize the current actor fixture in existing test support

Add one test-only helper in `tests/engine/work-unit-test-helpers.mjs` that
returns a fully explicit delegated actor execution object for a supplied
current role key. The two generated-guidance integration tests and the focused
work-id fixture will use it when directly calling `createWorkUnit`; the work-id
fixture will also provide its current Wave0 assignment facts. This keeps the
fixture's actor-v1 fields synchronized and does not relax
`writeWorkUnitEnvelope` or infer a role from a legacy shape.

Alternative rejected: remove the profile check or hand-write partial
manifests. Both would weaken the current fail-closed boundary. Duplicating the
multi-field actor object in each positive test would make the same current
profile drift likely again.

### Keep incomplete legacy construction as an explicit rejection test

The actor-delivery asset will retain its no-claim repair check, but replace its
old successful unbound-construction branch with the current result: a direct
creation missing the actor-v1 profile throws the current unsupported-contract
error before it publishes a manifest, beacon, task, result schema, or actor
guidance. It will not use the fixture helper for that negative branch.

Alternative rejected: repair the old branch with a synthesized profile. That
would remove the only focused guard for the current fail-closed envelope
boundary and make a retired construction path appear valid.

### Responsibility and control boundary

No new semantic layer or control loop is introduced. Existing accepted specs
and Engine code remain the Source of Record; Markdown/tests are derived
consumer projections. The Agent performs the approved alignment edits, the
Engine retains routing/envelope verdict authority, and no user decision is
needed during normal execution. This is the shortest legal loop: an existing
owner fact -> one projection/fixture correction -> its existing focused test.

## Risks / Trade-offs

- [A rewritten assertion silently weakens a behavior guard] -> Each changed
  assertion names a current owner fact and retains a negative assertion against
  the corresponding retired path; review the exact test diff before Apply.
- [RUN.md wording is mistaken for actor-authentication support] -> State the
  negative boundary together with the existing logical binding and do not name
  any provider, host probe, or recovery mechanism.
- [Fixture helper becomes a production-shaped authority] -> Keep it under
  `tests/`, pass its values explicitly to test-only creation calls, and verify
  production Engine files have no target diff.
- [One change hides unrelated C8 cleanup] -> The task list names only the ten
  observed failure points; `CONTEXT.md`, root/Harness entry docs, specs, and
  runtime sources are protected scans.

## Migration Plan

No runtime or data migration exists. Apply the guidance/test alignment as one
atomic source-control change. Rollback is a normal revert before archive; no
run bundle, receipt, ledger, schema, or historical Markdown is rewritten.
