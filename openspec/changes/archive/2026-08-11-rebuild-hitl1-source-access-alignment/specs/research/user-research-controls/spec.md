# research/user-research-controls (delta)

## MODIFIED Requirements

### Requirement: Optional user research controls have one durable run snapshot

HITL1 SHALL preserve optional user research controls in the current bundle's
`rb_plan.md## Constraints > ### User Research Controls`; this subsection remains the
sole durable narrative authority for the per-run control brief. The existing
no-controls form, supplied-controls label, faithful literal snapshot, focus wording,
legacy compatibility, and host-file helper boundary remain unchanged.

The snapshot is captured once for ordinary user controls. A completed material
HITL1 source-access alignment MAY make one bounded amendment to that same snapshot:
it SHALL retain the user's literal final decision to adjust source semantics or to
proceed under the final observed direct-access scope, and it SHALL not duplicate the
raw observation, URLs, tool output, network setting, provider name, retry history,
or an inferred future-access claim. The structured `research_access` observation
remains the sole owner of direct probe facts. An environment-retry request is not a
final amendment; only the final resolved user decision may be recorded.

An acceptance of current scope SHALL not silently weaken an explicit hard source
constraint. The snapshot SHALL preserve that constraint and record the accepted
limitation as user research guidance. It SHALL not add a profile enum, Topic field,
Gate input, lifecycle field, external path, cross-run memory, machine-scored
semantic schema, parser, or override token.

#### Scenario: Final accepted limitation is recoverable guidance

- **WHEN** the user clearly says to proceed under the final observed direct-access
  limitations
- **THEN** HITL1 SHALL append one faithful literal access-alignment decision to the
  existing controls snapshot
- **AND** the direct probe facts remain only in `research_access`

#### Scenario: Environment retry does not create history

- **WHEN** the user asks for another probe after managing their own environment
- **THEN** the controls snapshot SHALL not append an interim retry record
- **AND** the fresh probe replaces the current structured observation rather than
  accumulating a network history or requiring the Agent to verify the change

#### Scenario: Hard source constraint remains explicit

- **WHEN** a user accepts current access limits while retaining a strict source
  policy
- **THEN** the controls snapshot SHALL preserve both the original constraint and the
  literal accepted limitation
- **AND** later research SHALL not silently substitute prohibited sources
