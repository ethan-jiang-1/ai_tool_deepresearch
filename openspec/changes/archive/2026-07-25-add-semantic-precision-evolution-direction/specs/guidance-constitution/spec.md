> req: GCO-007, GCO-008

## ADDED Requirements

### Requirement: Abstraction direction makes semantic precision reviewable

The guidance suite SHALL maintain guidelines/evolution-abstraction-semantic-precision.md as a Charter-companion Evolution Direction. It SHALL reproduce the complete EWD 340 Argument Four paragraph that contains the canonical sentence, retain its primary-source link, and immediately follow the source text with a clearly separate project-context interpretation. The source paragraph and interpretation together SHALL explain that abstraction lets finite reasoning cover many cases by creating a semantic level at which reasoning can be precise; the interpretation SHALL NOT be presented as Dijkstra's own wording.

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

The Project Charter, Guidelines Index, OpenSpec proposal/design context, and the three charter-companion Evolution Directions SHALL route relevant future design through the current ordered triad:

1. abstraction as semantic precision;
2. simple reliable control; then
3. helper-oriented action responsibility.

The route SHALL preserve their distinct ownership: semantic precision decides whether an introduced concept yields a precise, bounded reasoning level; simple reliable control limits the necessary control shape; helper-oriented guidance assigns decision and legal mechanical execution responsibility. The route SHALL make guidelines/evolution-abstraction-semantic-precision.md discoverable beside the existing two companions.

The route SHALL NOT claim that every historical artifact was retroactively reviewed, require every mechanism guideline to repeat the whole triad, or treat the current count of directions as a permanent numerical invariant.

Project Charter SHALL carry no `defers_to` dependency. Every other effective Markdown guideline under `guidelines/` SHALL have exactly one `defers_to` entry, `guidelines/project-charter.md`. Charter SHALL present the current triad in semantic precision → simple reliable control → helper-oriented action responsibility order. Every other guideline SHALL place Charter before its applicable charter companions in `siblings`, and SHALL preserve that triad order among those companions.

Constitutional navigation—frontmatter, Reading Order, and Related Guidance—SHALL stay within `guidelines/`. It SHALL NOT route readers to AGENTS.md, openspec/config.yaml, downstream capability specs, framework files, experiments, or runtime bundles. This restriction does not erase necessary factual mechanism prose or a primary source embedded as source context; it constrains hierarchy and navigation, not the subject matter a focused guideline explains.

#### Scenario: A future relevant design receives the ordered route

- **WHEN** an author starts an architecture, recovery, mutation, Agent-facing, state, projection, interface, or workflow-concept design
- **THEN** openspec/config.yaml directs the author to consider semantic precision before simplicity and helper responsibility
- **AND** Project Charter and Guidelines Index expose the same current ordered triad

#### Scenario: Every active guideline has one Charter root

- **WHEN** the effective Markdown files under `guidelines/` are audited
- **THEN** Project Charter has no `defers_to`
- **AND** every other file has only `guidelines/project-charter.md` under `defers_to`
- **AND** its sibling route exposes Charter and the applicable current triad in semantic → simple → helper order
- **AND** a focused mechanism document need not restate the triad in its substantive mechanism prose

#### Scenario: Charter reading does not descend into implementation surfaces

- **WHEN** Project Charter is updated with the current evolution-direction route
- **THEN** its frontmatter has no defers_to and its Reading Order routes readers through same-layer guidance only
- **AND** every other effective guideline defers only to Project Charter
- **AND** constitutional navigation does not list AGENTS.md, openspec/config.yaml, downstream capability specs, framework/experiment surfaces, or active runtime bundles as targets

## Traceability Note

GCO-007 owns the abstraction-as-semantic-precision direction and its guidance-only boundary. GCO-008 owns the current ordered route through semantic precision, simple control, and helper responsibility. These requirements do not prove or alter runtime capability, Agent behavior, schema, CLI, Gate, receipt, trace, or version surfaces.
