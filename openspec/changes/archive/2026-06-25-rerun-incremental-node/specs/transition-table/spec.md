# Transition Table (Delta)

> req: TRT-001

## ADDED Requirements

### Requirement: Chain table includes rerun node and HITL2 rerun exit

`transitions.chain.json` SHALL include:

1. A `rerun` outcome for `phases/phase-hitl2.md` routing to `phases/phase-rerun.md`
2. A `passed` outcome for `phases/phase-rerun.md` routing to `phases/phase-seed-topics.md`

The existing `passed` outcome for `phases/phase-hitl2.md` routing to `phases/phase-readiness.md` SHALL be preserved.

The chain SHALL continue to use canonical node fileRefs as keys, consistent with the existing node-keyed format. Outcomes SHALL use deterministic values (`passed`, `rerun`) that correspond to user decisions with fixed next-node targets.

#### Scenario: HITL2 passed routes to readiness

- **WHEN** `resolveNodeTransitionDetailed('transitions.chain.json', 'phases/phase-hitl2.md', 'passed', context)` is called
- **THEN** the result SHALL have `kind: 'next'`
- **AND** `next` SHALL be `phases/phase-readiness.md`

#### Scenario: HITL2 rerun routes to rerun node

- **WHEN** `resolveNodeTransitionDetailed('transitions.chain.json', 'phases/phase-hitl2.md', 'rerun', context)` is called
- **THEN** the result SHALL have `kind: 'next'`
- **AND** `next` SHALL be `phases/phase-rerun.md`

#### Scenario: Rerun node routes to seed-topics

- **WHEN** `resolveNodeTransitionDetailed('transitions.chain.json', 'phases/phase-rerun.md', 'passed', context)` is called
- **THEN** the result SHALL have `kind: 'next'`
- **AND** `next` SHALL be `phases/phase-seed-topics.md`

#### Scenario: Indeterminate decisions have no chain entry

- **WHEN** `resolveNodeTransitionDetailed('transitions.chain.json', 'phases/phase-hitl2.md', 'request_view_revision', context)` is called
- **THEN** the result SHALL have `kind: 'no_transition'`
