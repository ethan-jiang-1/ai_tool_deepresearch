# Guidance Constitution

> req: GCO-001, GCO-002, GCO-003, GCO-004, GCO-005, GCO-006

## Purpose

Define a small, additive constitutional clarification for the guidance suite. It governs how future designs are reviewed; it does not define runtime behavior or replace the existing Charter structure.

## ADDED Requirements

### Requirement: Constitutional clarification preserves authority boundaries

Constitutional guidance SHALL preserve the core Agent/Markdown/Engine/runtime authority split and defer to accepted specs, executable contracts, and runtime truth. It SHALL state implementation-neutral review laws; it SHALL NOT use prose to override accepted behavior, define a new runtime procedure, or imply a new capability.

#### Scenario: A constitutional clarification stays within its authority

- **WHEN** this change updates the Project Charter
- **THEN** it adds no new current runtime behavior or operational procedure
- **AND** it does not prevent a future, separately scoped OpenSpec change from reorganizing guidance where that is justified

### Requirement: Constitutional admission is implementation-neutral

A proposed durable constitutional invariant SHALL enter the Charter only when it remains valid after removing current incident, BUG, Wave, CLI, file-format, and implementation names; constrains an invariant rather than a selected mechanism; rejects a future equivalent bad design; and has a meaningful counterexample or limit. Where multiple legal mechanisms could satisfy the invariant, it SHALL NOT pre-approve a particular implementation.

This admission test SHALL govern durable constitutional prose only. It SHALL NOT block an urgent local repair through an accepted OpenSpec capability change.

#### Scenario: A mechanism-specific remedy remains downstream

- **WHEN** a proposed rule names a specific command, closeout sequence, evaluator, retry count, byte threshold, or Gate policy
- **THEN** the rule SHALL remain in its owning accepted spec, active change, or mechanism guidance
- **AND** it SHALL NOT be elevated to the Charter solely because it addresses a current incident

### Requirement: Blocking obligations have an honest legal boundary

For a proposed or changed cross-boundary deterministic obligation used to block advancement or establish a deterministic closure condition, guidance SHALL make reviewable the authoritative fact, its owning boundary, any legal means to establish or change it, and the honest result when none is in scope.

This review obligation SHALL NOT itself require a witness, receipt, consumer, writer, state field, preflight, retry, or controller unless an accepted contract independently requires one. Where no legal producer or repair exists, guidance SHALL expose that boundary and SHALL NOT invite an Agent or user to fabricate deterministic authority.

#### Scenario: A checker rejects a fact without a legal producer

- **WHEN** a deterministic checker requires a fact the normal caller cannot legally produce or commit
- **THEN** guidance SHALL identify the missing-contract, owner, or terminal boundary as the next legal result
- **AND** it SHALL NOT invent a hidden repair path or hand-authored authority

### Requirement: Public reentry is bounded and non-orchestrating

When a proposal or change explicitly declares an Agent-facing boundary for entry, handoff, or recovery, its guidance SHALL state the declared input and context boundary and enough authoritative facts for the bounded next legal action or an honest no-path result.

The boundary MAY be one command or a documented bounded protocol. It SHALL NOT select semantic work, schedule turns, observe chat, infer liveness, or advance beyond its declared deterministic boundary. It SHALL NOT represent a bounded legal result as phase completion, real Agent behavior, host liveness, or external success.

#### Scenario: A public boundary does not become a workflow runner

- **WHEN** a public handoff or repair boundary completes its declared deterministic work
- **THEN** it SHALL report only its resulting legal state or recovery seam
- **AND** it SHALL NOT claim that a future Agent turn will occur or perform semantic workflow work itself

### Requirement: Action responsibility is distinct from liveness

Guidance SHALL distinguish authority, capability, permission, responsibility, liveness, and evidence. Possession of one SHALL NOT imply another unless an accepted contract explicitly says so.

When a live Agent turn has required permission, an accepted legal operation, and the facts that operation requires, guidance SHALL assign ordinary mechanical work to the Agent. Engine/CLI guidance SHALL NOT claim to guarantee or infer host continuation, model tool invocation, context retention, external-tool success, or the reason an Agent did not act. This qualification SHALL NOT transfer ordinary authorized mechanical work to the user.

#### Scenario: Autonomous wording remains conditional responsibility

- **WHEN** a non-interactive phase is described as autonomous or silent
- **THEN** the wording SHALL assign responsibility within a live legal opportunity
- **AND** it SHALL NOT promise host continuation or model tool invocation

### Requirement: Closure claims remain proportional to proof

Guidance SHALL state that a completion, closure, causal, or behavioral claim is limited to the object and evidence boundary it identifies, including, as applicable, provenance, actor/host, and proof class. Deterministic fixtures prove deterministic contracts; real Agent, host, external, or human-judgment claims require their own observation boundary.

Evidence outside a claim's stated provenance or continuity boundary MAY remain diagnostic evidence, but it SHALL NOT automatically close a stronger legal, causal, or runtime claim. This discipline SHALL NOT pre-suppose a particular integrity mechanism or require fresh disposable replay for every conclusion.

#### Scenario: Historical diagnostic evidence is not overclaimed

- **WHEN** historical material lies outside the stated provenance or continuity boundary for a claim
- **THEN** it MAY support symptom, byte-level, or hypothesis diagnosis
- **AND** it SHALL NOT automatically prove a legal pass, real Agent behavior, or causal success of a future remediation
