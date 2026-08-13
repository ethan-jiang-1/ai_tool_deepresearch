# C6c: Decide the Unrecorded-Actor Provenance Policy

> Candidate change: `retire-unrecorded-actor-provenance`
>
> Status: reader fanout evidence complete; user policy decision pending
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

No choice is selected. The dangerous non-option is silently defaulting a
missing actor to a real current actor class.

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
- [ ] Characterize current delegated and authorized fallback claims separately
  from any legacy fixture.
- [ ] User selects A, B, or C.
- [ ] A proposal proves that a missing actor produces one explicit
  rejection/opaque result and can never be rewritten as a real actor identity.

## Expected verification

```bash
node --test tests/engine/work-unit-actor-submit.test.mjs \
  tests/engine/work-unit-submit.test.mjs \
  tests/engine/work-unit-lifecycle.test.mjs
node --test tests/integration/cli/operate-work-unit.test.mjs \
  tests/engine/helpers/gate-helpers-provenance.test.mjs
node DEEP_RESEARCH_HARNESS/cli/validate-workflow-package.mjs
```
