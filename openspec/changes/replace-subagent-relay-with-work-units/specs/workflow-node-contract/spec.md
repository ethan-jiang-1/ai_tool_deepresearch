> req: WNC-001, WNC-007, WNC-008, WNC-009

## RENAMED Requirements

- FROM: `### Requirement: Self-documenting lifecycle and relay role nodes`
- TO: `### Requirement: Self-documenting lifecycle and work-unit sub-agent guidance nodes`

## MODIFIED Requirements

### Requirement: Phase node metadata contract

Phase node metadata SHALL describe lifecycle phase nodes, shared guidance, and work-unit sub-agent task guidance without using removed delegated mechanism names as production surfaces. `execution_contract` SHALL remain Agent-readable and validator-enforceable guidance, but deterministic authority SHALL come from queue state, submitted work-unit ledger rows, trace, and gate CLI verdicts.

#### Scenario: delegated metadata names work-unit guidance

- **WHEN** a phase node references delegated guidance
- **THEN** the metadata SHALL identify work-unit sub-agent task guidance and submitted coverage requirements

### Requirement: Workflow package consistency validation

Workflow package consistency validation SHALL check manifest membership, frontmatter, gate definitions, transition tables, loader cache, dependency plans, and work-unit sub-agent guidance references. Validation SHALL reject delegated guidance that claims production authority without work-unit task, submit, and gate coverage contracts.

#### Scenario: delegated guidance is validated through work-unit contracts

- **WHEN** workflow validation sees delegated guidance
- **THEN** it SHALL require work-unit-compatible metadata and dependency wiring

### Requirement: Autonomous contract header injection for lifecycle stop:no phases

Autonomous contract header injection SHALL apply only to manifest lifecycle phases with `stop: "no"`. Work-unit sub-agent task guidance and other non-lifecycle task surfaces SHALL NOT receive lifecycle autonomous or terminal-delivery headers solely because their frontmatter resembles a phase node.

#### Scenario: work-unit sub-agent guidance does not receive lifecycle header

- **WHEN** `assessNode()` loads work-unit sub-agent task guidance
- **THEN** it SHALL NOT inject the lifecycle autonomous header unless the file is a manifest lifecycle phase

### Requirement: Universal silent execution dependency for lifecycle stop:no phases

Every manifest lifecycle phase node with `stop: "no"` in its frontmatter SHALL include `shared/shared-silent-execution` in its `requires` array. Work-unit sub-agent task guidance and other phase-like files outside manifest lifecycle membership are outside this requirement.

#### Scenario: sub-agent task guidance is outside lifecycle dependency rule

- **WHEN** dependency closure evaluates a work-unit sub-agent task guidance file
- **THEN** it SHALL NOT treat that file as a manifest lifecycle phase

### Requirement: Self-documenting lifecycle and work-unit sub-agent guidance nodes

Every work-unit sub-agent guidance file SHALL contain a concise role or task brief immediately after the H1. The brief SHALL orient the sub-agent to assigned work-unit identity, inputs, outputs, boundary, and return contract. Orientation text SHALL NOT replace schemas, queue state, submitted output declarations, trace, transition routing, or gate CLI verdicts as deterministic authority.

#### Scenario: work-unit sub-agent guidance has task brief

- **WHEN** a sub-agent receives work-unit guidance
- **THEN** the guidance SHALL state assigned identity, boundary, expected outputs, and return contract

### Requirement: Header injection uses manifest membership and execution_contract surface

Header injection SHALL use manifest lifecycle membership as authority. `execution_contract.surface` SHALL reinforce that lifecycle phase surfaces and work-unit sub-agent task guidance surfaces are different execution surfaces.

#### Scenario: work-unit guidance surface does not receive lifecycle header

- **WHEN** `assessNode()` loads a guidance file with a work-unit sub-agent task surface
- **THEN** lifecycle header injection SHALL be skipped unless manifest lifecycle membership also applies
