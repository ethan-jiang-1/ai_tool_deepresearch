> req: POF-001

## RENAMED Requirements

- FROM: `### Requirement: Post-final recovery CLI SHALL expose one direct eligibility inspection`
- TO: `### Requirement: Post-final recovery SHALL expose one direct eligibility and request contract`

## MODIFIED Requirements

### Requirement: Post-final recovery SHALL expose one direct eligibility and request contract

The post-final recovery operation SHALL retain its existing role as the only
audited mutation path for evidence-expanding requests (new sources, Topics,
research conclusions, or research-profile changes). Presentation-only feedback
(reader, structure, length, wording, emphasis, or presentation of existing
verified evidence) SHALL stay in the Final node and SHALL NOT create, apply, or
suggest a post-final rerun request.

Such polish SHALL be handled by the Final Agent's bounded semantic judgment as a
presentation revision on the current primary version (see the
artifact-persistence-recovery presentation-revision semantics): the Evidence Map
backing set and submitted fact set remain unchanged, a compare-and-swap
update of the current latest primary bytes at the existing canonical target is
performed, the version's REVISIONS.md records the change, and any earlier
primary revision bytes remain immutable — no new global version is allocated. An evidence-expanding request SHALL use the existing audited
post-final rerun path and SHALL result in a new global version on the resulting
legal Final delivery. Mixed or ambiguous feedback SHALL be resolved by the
smallest clarification before routing, and SHALL NOT be auto-routed or have a
classification invented.

The Final Agent, not the Engine, SHALL classify that semantic boundary and ask
the smallest clarification when it is material. Mechanical eligibility SHALL NOT
by itself select rerun or imply that a clean Final has requested mutation.

#### Scenario: Clean terminal Final is eligible

> **@deprecated behavior** — The historical title is retained as an archive
> anchor. Clean terminal mechanics are necessary but no longer sufficient;
> current explicit evidence-expanding intent is also required for ReopenResearchPass ownership.

- **WHEN** the latest lineage is legal terminal Final with a valid primary report bound to that lineage, no active owner workspace/work, a supported available next increment, and a retained request for new evidence or research scope
- **THEN** inspect SHALL report eligible and return exact request/apply preparation bindings

#### Scenario: Presentation-only feedback remains in Final

- **WHEN** current feedback asks only to change reader, view, structure, length, wording, emphasis, appendix, or explanation of existing verified evidence
- **THEN** the Final Agent SHALL not construct or submit a ReopenResearchPass apply request
- **AND** the nearest owner SHALL be phases/phase-final.md

#### Scenario: Mechanical eligibility does not invent rerun intent

- **WHEN** a clean terminal Final mechanically could rerun but no current retained evidence-expanding request exists
- **THEN** inspect MAY report availability facts without making ReopenResearchPass the reentry owner
- **AND** the Engine SHALL not infer a request from Final inventory or chat history

#### Scenario: Inspect recognizes an accepted nonterminal recovery lineage

- **WHEN** committed ReopenResearchPass has legally entered rerun or later accepted descendant stages
- **THEN** inspect SHALL return unchanged with the one current owner without requiring terminal Final or testing another future increment

#### Scenario: Presentation polish does not allocate a version

- **WHEN** a user gives presentation-only feedback on a delivered Final report (e.g. reorder sections, shorten wording, restructure)
- **THEN** the Final Agent SHALL apply it as a presentation revision (CAS update of the current latest primary bytes)
- **AND** the version number SHALL NOT change and no post-final rerun request SHALL be created

#### Scenario: Evidence expansion still uses the audited rerun path

- **WHEN** a user request needs new sources, Topics, research conclusions, or a research-profile change
- **THEN** the existing audited post-final rerun path SHALL be used
- **AND** the resulting legal Final delivery SHALL allocate a new global version

#### Scenario: Ambiguous feedback asks first

- **WHEN** feedback mixes presentation and evidence-expanding elements or is ambiguous
- **THEN** the Final Agent SHALL ask the smallest clarification before routing
- **AND** SHALL NOT auto-route or invent a classification
