# Guidance Constitution

> req: GCO-001, GCO-002, GCO-003, GCO-004, GCO-005, GCO-006, GCO-007, GCO-008

## Purpose

Define implementation-neutral constitutional guidance for the guidance suite. It governs how future designs are reviewed, including justified semantic levels and the Charter-root navigation hierarchy; it does not define runtime behavior or replace the existing Charter structure.

## Requirements

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

### Requirement: Abstraction direction makes semantic precision reviewable

The guidance suite SHALL maintain `openspec/constitution/evolution/abstraction-semantic-precision.md` as a Charter-companion Evolution Direction. It SHALL reproduce the complete EWD 340 Argument Four paragraph that contains the canonical sentence, retain its primary-source link, and immediately follow the source text with a clearly separate project-context interpretation. The source paragraph and interpretation together SHALL explain that abstraction lets finite reasoning cover many cases by creating a semantic level at which reasoning can be precise; the interpretation SHALL NOT be presented as Dijkstra's own wording.

When a relevant design introduces or materially changes a named state, projection, status, concept, Module, or reader-facing view, it SHALL first make reviewable:

- the bounded question and intended reader for which the new thing improves reasoning;
- the distinctions that must remain because they change the conclusion, available next action, or evidence scope, and the cases that are genuinely equivalent for that question; and
- why normal reading can reach a precise conclusion, including an explicit unknown or unresolved result, without reconstructing the lower layer.

This reflection SHALL be short connected reasoning, not a required field schema, four-part form, deterministic validator, or assertion that every abstraction is lossless or reversible. The direction SHALL require a justified abstraction to reduce lower-layer reconstruction or conceptual clutter for its stated question.

The direction SHALL NOT use guidance prose to create runtime authority, make a projection authoritative, turn Markdown into deterministic truth, prescribe a controller/state/validator, assign permission, or require Engine/CLI to judge research relevance, evidence choice, or synthesis quality.

#### Scenario: A proposed concept earns a semantic level

- **WHEN** a proposal or design introduces a reader-facing concept, state, projection, status, Module, or workflow distinction
- **THEN** its semantic-precision reflection identifies the bounded question and reader it makes more exact
- **AND** it identifies the decision-relevant distinctions that remain visible rather than hiding them behind a new name
- **AND** it explains the normal reasoning stop point or a precise unknown/unresolved result

#### Scenario: The source context is present rather than decorative

- **WHEN** an Agent reads the canonical abstraction direction
- **THEN** it can read the complete original EWD 340 Argument Four paragraph containing the canonical sentence and follow its primary-source link in that same document
- **AND** it can read a clearly labelled project-context interpretation immediately after that source text
- **AND** the interpretation distinguishes Dijkstra's intellectual-manageability argument from vague hiding, lossless compression, or Engine semantic judgment

#### Scenario: Scoped precision does not pretend semantic certainty

- **WHEN** a design applies the direction to evidence selection, research relevance, or synthesis quality
- **THEN** it states the applicable evidence or review boundary
- **AND** it SHALL NOT claim that the direction authorizes Engine/CLI to make that semantic judgment as a deterministic verdict

### Requirement: Current evolution directions route relevant design through ordered reviews

The Project Charter, OpenSpec control map, OpenSpec proposal/design context, and the three
Charter-companion Evolution Directions SHALL route relevant future design through the current
ordered triad:

1. abstraction as semantic precision;
2. simple reliable control; then
3. helper-oriented action responsibility.

The route SHALL preserve their distinct ownership: semantic precision decides whether an
introduced concept yields a precise, bounded reasoning level; simple reliable control limits the
necessary control shape; helper-oriented guidance assigns decision and legal mechanical execution
responsibility. The route SHALL make
`openspec/constitution/evolution/abstraction-semantic-precision.md` discoverable beside the
existing two companions.

The route SHALL NOT claim that every historical artifact was retroactively reviewed, require every
mechanism model or operation document to repeat the whole triad, or treat the current count of
directions as a permanent numerical invariant.

The canonical project-guidance topology SHALL contain exactly these current role roots:

- `openspec/constitution/` for the Project Charter and constitutional Evolution Directions;
- `openspec/guidance/models/` for non-authoritative system-understanding models; and
- `openspec/operations/` for current Agent-facing procedures with their explicit authority limits.

`openspec/constitution/project-charter.md` SHALL carry no `defers_to` dependency. Every other
effective constitution Markdown document under `openspec/constitution/` SHALL have exactly one
`defers_to` entry, `openspec/constitution/project-charter.md`. Charter SHALL present the current
triad in semantic precision -> simple reliable control -> helper-oriented action responsibility
order. Constitution companions SHALL place Charter before their applicable companions in
`siblings`, and SHALL preserve that triad order among those companions.

Model navigation SHALL identify its canonical model role without representing model documents as
Charter companions. Operation guidance SHALL declare every real external authority needed by its
procedure and SHALL NOT be forced into the constitution peer set. In particular,
`openspec/operations/change-feedback-loop.md` SHALL continue to defer to the Charter, accepted
`governance/change-feedback-loop` behavior, and the governed archive finalizer. No current
supported document may retain the retired project-guidance root as a second root, mirror, or
compatibility route.

Constitutional navigation--frontmatter, Reading Order, and Related Guidance--SHALL stay within
`openspec/constitution/`. It SHALL NOT route readers to root adapters, `openspec/config.yaml`,
downstream capability specs, framework files, experiments, or runtime bundles. This restriction
does not erase necessary factual mechanism prose, an operation document's explicit authority
coordinate, or a primary source embedded as source context; it constrains constitutional hierarchy
and navigation, not the subject matter a focused document explains.

#### Scenario: A future relevant design receives the ordered route

- **WHEN** an author starts an architecture, recovery, mutation, Agent-facing, state, projection,
  interface, or workflow-concept design
- **THEN** `openspec/config.yaml` directs the author to consider semantic precision before
  simplicity and helper responsibility
- **AND** Project Charter and the OpenSpec control map expose the same current ordered triad

#### Scenario: Constitution and operations retain distinct authority routes

- **WHEN** current project guidance is audited after the topology migration
- **THEN** the Charter has no `defers_to`, every non-Charter constitution document defers only to
  the canonical Charter, and its sibling route exposes the applicable triad in semantic -> simple
  -> helper order
- **AND** model documents are not classified as constitutional peers
- **AND** operation guidance with an accepted-spec or finalizer dependency retains that explicit
  external authority instead of being forced into a Charter-only dependency set

#### Scenario: Charter reading does not descend into implementation surfaces

- **WHEN** the Project Charter is updated with the current evolution-direction route
- **THEN** its frontmatter has no `defers_to` and its Reading Order routes readers through the
  constitutional surface only
- **AND** constitutional navigation does not list root adapters, `openspec/config.yaml`, downstream
  capability specs, framework/experiment surfaces, or active runtime bundles as targets
- **AND** the repository exposes no current supported retired guidance root or duplicate Charter
