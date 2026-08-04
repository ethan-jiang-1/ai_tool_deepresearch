## Why

`tests/integration/md/case-164-direct-output-candidate-contract.test.mjs` is
currently red: its runner slice starts at case 164 but ends at case 232, so it
also counts case 225's child-actor text and finds three occurrences instead of
the two case-164 child turns. The authoritative case-164 protocol still
requires three Subject turns and exactly two child invocations, so the defect
is in a brittle verification assertion, not in the delegated work-unit
contract.

## What Changes

- Isolate the case-164 runner entry at its actual next-entry boundary, then
  extract its ordered `messages` protocol rather than counting a phrase across
  later case definitions.
- Assert exactly three Subject messages, a child invocation in turns 1 and 3
  only, and no child invocation in the replacement-only turn 2.
- Retain the existing playbook, runner, setup-only boundary, native evidence,
  and `NOT_RUN` semantics unless the structural review proves one of those
  sources is itself inconsistent.
- Add focused negative coverage so a missing third turn, a child invocation in
  turn 2, or a changed child-invocation cardinality cannot silently pass.

The structural reader and protocol assertion remain test-local. Negative cases
pass synthetic message arrays to that pure assertion; they do not edit the
runner, invoke a real Agent, or turn a static integration test into an
experiment fixture.

This is a verification-only correction. It does not change an Engine schema,
Gate, lifecycle transition, queue/replacement behavior, experiment execution
policy, or the scope of the existing case-164 Agent-behavior claim.

The direct Source of Record is the case-164 runner configuration's ordered
`messages` array, delimited by the next case entry and cross-checked against
the registered playbook. The shortest correct loop is that direct protocol ->
one structural integration test -> one actionable mismatch. This removes a
cross-case, wording-sensitive count and avoids a new validator, state, retry
path, or second experiment authority.

Responsibility remains unchanged: the Playbook/Subject/child actors produce
real execution evidence; the Engine and native experiment artifacts retain
their existing verdict authority; the test only verifies the static protocol
shape. No user decision, host capability, or Actor-compliance claim is added.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This change repairs a test-only implementation of the existing
case-164 experiment contract, so `.openspec.yaml` declares `skip_specs: true`.

## Impact

- Affected target: `tests/integration/md/case-164-direct-output-candidate-contract.test.mjs`.
- Read-only cross-check sources: `experiments_env/shared/run-iterative-interaction-subject.mjs`,
  `experiments_playbook/exp_evidence-extraction/case-164-heavy-direct-output-candidate-contract.md`,
  and `experiments_playbook/PLAYBOOK_MANIFEST.md`.
- Focused verification: the case-164 integration test plus the existing
  work-unit submit/disposition and Wave replacement-guidance regressions.
- No dependencies, public API changes, framework version bump, or accepted
  specification change.
