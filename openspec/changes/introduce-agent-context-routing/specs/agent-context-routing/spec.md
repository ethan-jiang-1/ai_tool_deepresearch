> req: ACR-001, ACR-002, ACR-003, ACR-004

## Purpose

Give every substantive repository task a short, authoritative-vocabulary entry
route that preserves the Deep Research Tool's agentic architecture without
turning a glossary or ADR into a competing behavior or runtime authority.

## ADDED Requirements

### Requirement: Project glossary preserves canonical terminology boundaries

The repository SHALL provide one root `CONTEXT.md` as the shared glossary for
substantive project work. It SHALL distinguish the project, framework,
framework directory, research run, active bundle, LLM Agent, Markdown control
surface, Engine, runtime truth, and deterministic/evidence boundaries needed
to avoid treating the framework as a traditional JavaScript workflow
controller.

`CONTEXT.md` SHALL state that it is a vocabulary-alignment surface and SHALL
defer behavior, executable contracts, and current runtime facts to their
existing Sources of Record. Its terminology SHALL remain aligned with the
guidance terminology canon rather than establishing independent definitions.

#### Scenario: Agent establishes the correct control model from the glossary

- **WHEN** a Coding Agent reads root `CONTEXT.md` for a substantive task
- **THEN** it can distinguish LLM judgment, Markdown Agent Flow, Engine
  deterministic checkpoints, and active-bundle runtime truth
- **AND** it SHALL NOT treat the glossary as a Gate verdict, executable
  contract, or current run state

#### Scenario: Glossary preserves critical similarly named distinctions

- **WHEN** a Coding Agent needs to reason about framework/runtimes or phase
  advancement
- **THEN** root `CONTEXT.md` SHALL distinguish framework from active bundle,
  Gate definition from Gate verdict, and phase handoff from work completion
- **AND** it SHALL direct the Agent to the existing authority when the glossary
  alone cannot answer the needed behavior or runtime question

### Requirement: Agent entry routes require the project glossary

Root `AGENTS.md` SHALL require every substantive repository task to read
`guidelines/project-charter.md` and then root `CONTEXT.md` before task work.
The requirement SHALL preserve the Charter as the first guidance read and
shall not turn `CONTEXT.md` into a replacement for instruction discovery or
task-specific authoritative sources.

`DPT_FRAMEWORK/AGENTS.md` SHALL route framework work to root `CONTEXT.md` as
the project-wide glossary. It SHALL not create or require a separate
`DPT_FRAMEWORK/CONTEXT.md`; framework-local operational documentation remains
the authority for framework entry and command execution.

#### Scenario: Root task receives the vocabulary route

- **WHEN** a Coding Agent begins a substantive task from the repository root
- **THEN** root `AGENTS.md` SHALL direct it to read the Project Charter before
  root `CONTEXT.md`
- **AND** the route SHALL make the glossary applicable before the Agent
  interprets architecture, terminology, or ownership boundaries

#### Scenario: Framework task does not fork the glossary

- **WHEN** a Coding Agent enters `DPT_FRAMEWORK/` for framework work
- **THEN** its local `AGENTS.md` SHALL direct it to the root glossary
- **AND** the local route SHALL preserve the framework README, COMMANDS, and
  applicable playbooks as the framework operating surfaces
- **AND** no framework-local context glossary SHALL be introduced

### Requirement: Root architecture decision record explains the control split

The repository SHALL maintain a root `docs/adr/` decision record. Its first
record SHALL explain the durable decision that semantic research and
multi-stage Agent Flow remain LLM/Markdown-driven while the Engine owns
deterministic checkpoints and feedback.

The ADR SHALL record this as an architectural trade-off against a JavaScript
workflow-controller design. It SHALL not redefine current runtime behavior,
override accepted OpenSpec contracts, or become an instruction source that
replaces the Charter or entry routes.

#### Scenario: Maintainer can recover the reason for the split

- **WHEN** a maintainer considers moving research orchestration or semantic
  judgment into JavaScript
- **THEN** the root ADR SHALL explain why that is outside the selected
  architecture
- **AND** it SHALL identify the Engine as the deterministic trust root rather
  than the Agent Flow controller

### Requirement: Context routing remains regression-protected

The project SHALL have deterministic JS-led regression coverage that reads the
actual repository documentation and verifies the required root-to-framework
context routing and glossary non-authority boundary.

The regression SHALL detect removal, reversal, or replacement of the required
Charter-then-context route. It SHALL not infer whether an Agent actually read
the documents, judge prose quality, or claim real Agent behavior.

#### Scenario: Required entry route is removed or reversed

- **WHEN** root or framework Agent instructions omit the required glossary
  route, or root instructions place `CONTEXT.md` before the Charter
- **THEN** the deterministic documentation regression SHALL fail
- **AND** it SHALL identify the violated routing boundary
