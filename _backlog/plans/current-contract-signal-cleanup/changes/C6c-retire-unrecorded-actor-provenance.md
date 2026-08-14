# C6c: Decide the Unrecorded-Actor Provenance Policy

> Merged candidate change: `retire-legacy-work-unit-attempt-inputs` (C6a+C6b+C6c)
>
> Planned execution batch: dashboard item 16 `C6a+C6b+C6c`, conditional on C6a/C6b policy alignment
>
> Status: policy A governed-archived as dashboard item 16 (`7a96ca254`)
>
> Risk: L4

## One question

May the current Engine stop accepting an attempt that has no
`actor_contract_version` / `actor_execution` record, instead of projecting its
unknown provenance as `legacy_unrecorded`?

This is a provenance question, not an assignment or submission-format cleanup.
It applies even when the same old attempt also matches C6a or C6b.

## Verified boundary

- The normal current claim path evaluates a role-bound actor observation and
  writes `work-unit.actor.v1` plus `actor_execution` onto the claim surfaces.
  Current actor facts distinguish a delegated sub-agent from an authorized
  Phase Agent fallback.
- Historical index, manifest, and beacon records can omit those fields. The
  ledger schema has a dedicated `LegacyActorExecutionSchema` whose value is
  `execution_actor_class: legacy_unrecorded`, unknown observation, and
  `legacy_compatibility` policy decision.
- On submit, a missing actor record is projected into that dedicated unknown
  provenance shape. `inspect` and attempt-disposition projection also use
  `legacy_unrecorded` when no recorded actor exists.
- This is intentionally safer than inventing `delegated_subagent` or
  `phase_agent_fallback`: neither physical actor authentication nor liveness is
  proven for the old attempt.

## Possible policies

| Choice | Current Engine treatment | Main benefit | Main consequence |
|---|---|---|---|
| A. Reject actor-unrecorded attempts | Require current actor provenance before submit, recovery, inspection, or provenance evaluation | One provenance model for Engine computation | Historical attempts with otherwise valid evidence stop being usable through current Engine paths |
| B. Opaque historical display | Show raw coordinates without synthesizing an actor projection or allowing Gate/recovery computation | Preserves human audit while ending provenance compatibility | Every consumer must distinguish raw display from actor-backed authority |
| C. Retain explicit unknown provenance | Keep `legacy_unrecorded` as a bounded read-only projection | Avoids fabricating identity and preserves historical inspection | Retains an extra provenance interpretation |

**Selected: A. Reject actor-unrecorded attempts.** The Engine will need one
owned unsupported-current-contract result before submission, recovery,
inspection, supersession, or provenance evaluation. It SHALL NOT project
`legacy_unrecorded`, default the attempt to `delegated_subagent` or
`phase_agent_fallback`, or silently drop the old record during an Engine safety
scan. Historical bytes may remain human-readable, but they no longer
participate in current Engine computation.

## Effects and side effects to assess

- An actor-policy cleanup must preserve the current claim preflight and its
  delegated-versus-fallback authorization rules. Those are not legacy
  compatibility.
- A submit rejection can alter ledger construction, inspection output,
  provenance checks, declaration recovery, and supersession for old attempts.
  A code change that only removes the schema union would leave those consumers
  ambiguous.
- Old evidence must never be relabeled as having been executed by a delegated
  sub-agent or a Phase Agent fallback merely because that is the current
  default workflow.

## Proposal gate

- [x] Current actor-v1 claim path and the explicit unknown projection
  identified.
- [x] Submit, inspect, and attempt-disposition consumers identified at first
  pass.
- [x] Map every actor-provenance consumer, including ledger validation,
  provenance/Gate evaluation, recovery, supersession, CLI output, guidance,
  and accepted specs.
- [x] Characterize current delegated and authorized fallback claims separately
  from any legacy fixture. Completed 2026-08-14: both current paths write
  `work-unit.actor.v1` and the exact `actor_execution` through claim, submit,
  ledger, and inspect; an available probe binds `delegated_subagent`, while an
  unavailable probe permits `phase_agent_fallback` only under its existing
  authorization rule. The selected actor/submit/lifecycle/CLI/provenance suite
  passed without mutating a real run bundle.
- [x] User selects A, B, or C. Completed 2026-08-14: user selected A; an
  attempt with absent actor provenance is to be rejected before current Engine
  computation, without an actor identity inference or compatibility adapter.
- [x] The unified C6a+C6b+C6c proposal proves that a missing actor produces
  one explicit rejection result and can never be rewritten as a real actor
  identity. Completed 2026-08-14: `retire-legacy-work-unit-attempt-inputs`
  passed strict and planning-governance checks plus risk-led polish;
  implementation and governed archive completed as dashboard item 16.
- [x] Merge gate decided 2026-08-14: C6a/C6b/C6c share a tightly coupled
  work-unit attempt Source of Record, the same reject policy, substantially
  overlapping readers/tests, and one atomic rollback boundary. C6d and
  `legacy_non_work_unit_rows` remain out of scope.

## Expected verification

```bash
node --test tests/engine/work-unit-actor-submit.test.mjs \
  tests/engine/work-unit-submit.test.mjs \
  tests/engine/work-unit-lifecycle.test.mjs
node --test tests/integration/cli/operate-work-unit.test.mjs \
  tests/engine/helpers/gate-helpers-provenance.test.mjs
node DEEP_RESEARCH_HARNESS/cli/validate-workflow-package.mjs
```
