> req: GCO-008

## MODIFIED Requirements

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

`openspec/README.md` SHALL be a demand-driven control map: it SHALL route a reader from a stated
task or uncertainty to the smallest applicable constitution, model, operation, accepted-spec, or
runtime-truth surface. It SHALL distinguish role navigation from authority, but SHALL NOT require a
reader to follow a complete sequential guidance list, reproduce a complete terminology glossary,
or cache current runtime/capability behavior. A role pointer may provide a compressed orientation;
the canonical owner SHALL retain the full definition or procedure. This contract does not impose a
fixed word or line limit, and it does not turn a prose-quality judgment into a deterministic
verdict.

The repository SHALL retain focused deterministic coverage for the topology facts that do not
require semantic judgment: canonical current role paths, required role frontmatter/authority
coordinates, current internal Markdown-link resolution, root/Harness route ordering and required
synchronized blocks, absence of a duplicate guidance root or mirror, and bounded current old-path
references. Those checks SHALL identify their owned repair surface. They SHALL NOT decide whether a
model answers a valuable question, whether a constitutional invariant is well-written, or whether
research judgment is semantically sufficient.

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

#### Scenario: Control map routes by trigger without becoming a second glossary

- **WHEN** a reader opens `openspec/README.md` to decide what to read next
- **THEN** it can select the smallest role-specific surface from its task or uncertainty
- **AND** it is not told to read every model or operation document in sequence
- **AND** it is directed to the canonical owner rather than a second full terminology or behavior definition

#### Scenario: Deterministic topology checks leave semantic review to the Agent

- **WHEN** a current guidance path, role coordinate, internal link, mirror, old-path reference, or
  synchronized entry-route block drifts
- **THEN** the focused topology regression fails at the owned repair surface
- **AND** the regression does not pass or fail a judgment about abstraction value, prose quality,
  or research evidence sufficiency
