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
supported document may retain `guidelines/` as a second guidance root, mirror, or compatibility
route.

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
- **AND** the repository exposes no current supported `guidelines/` root or duplicate Charter
