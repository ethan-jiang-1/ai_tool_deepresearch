# Guidance Constitution

> req: GCO-001, GCO-002, GCO-003, GCO-004, GCO-005, GCO-006

## Purpose

Define a small, additive constitutional clarification for the guidance suite. It governs how future designs are reviewed; it does not define runtime behavior or replace the existing Charter structure.

## ADDED Requirements

### Requirement: Constitutional clarification preserves the existing Charter baseline

The Project Charter SHALL retain its existing top-level sections, core Agent/Markdown/Engine/runtime split, Authority Map, conflict order, routing links, and safety-critical anti-fabrication and anti-controller rules. This capability SHALL add clarification only at the identified local surfaces; it SHALL NOT use a constitutional change to remove, relocate, or broadly rewrite established guidance.

#### Scenario: The Charter remains recognizable after clarification

- **WHEN** this change updates the Project Charter
- **THEN** every pre-existing top-level Charter section remains present and continues to route readers to its existing owner
- **AND** the change adds no new current runtime behavior, directory manifest, or operational procedure

### Requirement: Constitutional admission is implementation-neutral

A rule SHALL enter the Charter only when it remains valid after removing current incident, BUG, Wave, CLI, file-format, and implementation names; constrains an invariant rather than a selected mechanism; rejects a future equivalent bad design; has a meaningful counterexample or limit; and leaves legitimate alternative mechanisms legal.

This admission test SHALL govern durable constitutional prose only. It SHALL NOT block an urgent local repair through an accepted OpenSpec capability change.

#### Scenario: A mechanism-specific remedy remains downstream

- **WHEN** a proposed rule names a specific command, closeout sequence, evaluator, retry count, byte threshold, or Gate policy
- **THEN** the rule SHALL remain in its owning accepted spec, active change, or mechanism guidance
- **AND** it SHALL NOT be elevated to the Charter solely because it addresses a current incident

### Requirement: Blocking obligations have an honest legal boundary

For an accepted cross-boundary deterministic obligation that can block advancement or support a closure claim, guidance SHALL require review of its direct authority, owner, legal producer or transition, applicable durable witness, consumer, and legal repair or explicit owner-routed, terminal, or missing-contract result.

This review obligation SHALL NOT itself require a new writer, receipt, state field, preflight, retry, or controller. Where no legal producer or repair exists, guidance SHALL expose that boundary and SHALL NOT invite an Agent or user to fabricate deterministic authority.

#### Scenario: A checker rejects a fact without a legal producer

- **WHEN** a deterministic checker requires a fact the normal caller cannot legally produce or commit
- **THEN** guidance SHALL identify the missing-contract, owner, or terminal boundary as the next legal result
- **AND** it SHALL NOT invent a hidden repair path or hand-authored authority

### Requirement: Public reentry is bounded and non-orchestrating

Guidance for an advertised Agent-facing public boundary SHALL require explicit public inputs, stated context preconditions, and the direct facts needed for a normal caller, including a fresh Agent/session where reentry is advertised, to make the bounded next legal action or receive an honest no-path result.

The boundary MAY be one command or a documented bounded protocol with explicit recovery seams. It SHALL NOT select semantic work, schedule turns, observe chat, infer liveness, or advance beyond its declared deterministic boundary. Action-ready SHALL NOT be represented as phase completion, real Agent behavior, host liveness, or external success.

#### Scenario: A public boundary does not become a workflow runner

- **WHEN** a public handoff or repair boundary completes its declared deterministic work
- **THEN** it SHALL report only its resulting legal state or recovery seam
- **AND** it SHALL NOT claim that a future Agent turn will occur or perform semantic workflow work itself

### Requirement: Action responsibility is distinct from liveness

Guidance SHALL distinguish authority, capability, permission, responsibility, liveness, and evidence. Possession of one SHALL NOT imply another unless an accepted contract explicitly says so.

Agent responsibility for ordinary mechanical work SHALL apply when a live turn, accepted legal operation, necessary direct facts, and required permission exist. Engine/CLI guidance SHALL NOT claim to guarantee or diagnose host continuation, model tool invocation, context retention, external-tool success, or the reason an Agent did not act. This qualification SHALL NOT transfer ordinary authorized mechanical work to the user.

#### Scenario: Autonomous wording remains conditional responsibility

- **WHEN** a non-interactive phase is described as autonomous or silent
- **THEN** the wording SHALL assign responsibility within a live legal opportunity
- **AND** it SHALL NOT promise host continuation or model tool invocation

### Requirement: Closure claims remain proportional to proof

Guidance SHALL state that a completion, closure, causal, or behavioral claim is limited to the object and evidence boundary it identifies, including relevant provenance, actor/host, and proof class. Deterministic fixtures prove deterministic contracts; real Agent, host, external, or human-judgment claims require their own observation boundary.

Manual alteration or a broken provenance/time chain SHALL be treated as claim- and boundary-scoped: the material MAY remain diagnostic evidence, but it SHALL NOT automatically close a stronger legal, causal, or runtime claim. This discipline SHALL NOT create an anti-tamper runtime mechanism or require fresh disposable replay for every conclusion.

#### Scenario: Historical diagnostic evidence is not overclaimed

- **WHEN** a historical bundle contains manually written authority or a broken provenance/time chain
- **THEN** it MAY support symptom, byte-level, or hypothesis diagnosis
- **AND** it SHALL NOT automatically prove a legal pass, real Agent behavior, or causal success of a future remediation
