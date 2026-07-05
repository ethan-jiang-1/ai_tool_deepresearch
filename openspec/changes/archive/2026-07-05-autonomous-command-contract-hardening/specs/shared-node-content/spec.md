## MODIFIED Requirements

> req: SHC-006

### Requirement: Shared node authority boundary enforcement

Shared node authority-boundary wording SHALL use canonical phase-boundary terminology when prohibiting hidden phase movement.

Shared node bodies SHALL continue to avoid `phase`, `gate`, `next`, and `stop` frontmatter fields and SHALL NOT contain hidden phase instructions such as "run this command then continue to the next phase." When describing that prohibition, the wording SHALL distinguish:

- shared nodes SHALL NOT instruct phase handoff, next-node loading, or consuming a gate `check.next`;
- shared nodes SHALL NOT instruct source-gate status synchronization or `advance-status`; and
- shared nodes SHALL NOT claim target-phase work completion.

Shared nodes remain Agent-readable guidance or generated summaries, not lifecycle phase nodes and not deterministic boundary authorities.

#### Scenario: Shared node does not become hidden phase

- **WHEN** the Agent loads any shared node
- **THEN** the body SHALL NOT instruct phase handoff, status synchronization, or target work completion
- **AND** frontmatter SHALL remain `node_type: shared`
