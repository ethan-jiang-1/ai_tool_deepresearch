> req: BUM-005

## ADDED Requirements

### Requirement: BUNDLE_MAP.md offers a portable continuation card

For a newly instantiated production or disposable runtime bundle,
`BUNDLE_MAP.md` SHALL begin its navigation content with a concise continuation
card. The card SHALL:

- state that the map's containing directory is the candidate active bundle
  root for a supplied/reachable map;
- expose creator-rendered paths from that root to the framework root and repo
  command root used at creation;
- invite a user to provide the reachable map or its containing bundle to an Agent and
  state a continuation, inspection, supplement, question, or post-delivery
  request in ordinary language;
- expose the template-rendered `bundle_name` as a static identification/
  navigation fact; and
- point to the one framework-owned existing-bundle continuation playbook.

The relative coordinates SHALL be creation-time navigation facts only. They
SHALL NOT authenticate or select a framework source tree. An Agent MAY use
them only after a DPT source tree is already selected in its current workspace;
a coordinate outside that context, or one that is stale, moved, missing or
inaccessible, SHALL be reported as a direct boundary rather than replaced with
a guessed path.

The card SHALL retain the passive-map boundary. It SHALL NOT claim that its
text, attachment, static identity values, coordinates, or a user's request proves runtime
identity, grants permission, selects a phase/route, enters a node, changes
status, passes a Gate, drains a queue, records a decision, or authorizes
post-final mutation. It SHALL direct the Agent to reachable bundle control
files, trace and existing Engine diagnostics for current truth.

The card SHALL NOT duplicate lifecycle commands, workflow prose, a framework
copy, mutable status, or an `AGENTS.md`/`CLAUDE.md` bridge at bundle root.

#### Scenario: New bundle supplies an understandable continuation entry

- **WHEN** a production or disposable creator creates a bundle beneath an
  explicit target directory that is not a framework sibling
- **THEN** its root `BUNDLE_MAP.md` SHALL invite a user to attach the map or
  bundle and express the requested next work in ordinary language
- **AND** it SHALL identify the rendered bundle name and framework/repo
  coordinates derived from the creator's actual source tree
- **AND** it SHALL link to the canonical framework continuation playbook

#### Scenario: Card attachment does not become runtime authority

- **WHEN** an Agent receives an opened `BUNDLE_MAP.md` whose containing
  directory is reachable in its current workspace
- **THEN** it SHALL resolve the containing directory and creation-time
  framework relation
  before using the map as navigation
- **AND** it SHALL obtain current phase, gate, queue, evidence and decision
  facts from active bundle controls, trace and existing Engine feedback
- **AND** it SHALL NOT infer those facts from card text or `bundle_name`

#### Scenario: Coordinate does not select an untrusted framework

- **WHEN** a map coordinate resolves outside the DPT source tree already
  selected in the Agent's current workspace
- **THEN** the card/playbook SHALL report the missing framework-context
  boundary
- **AND** it SHALL NOT execute framework commands from that coordinate or
  treat the map as framework authentication

#### Scenario: Card remains a passive map

- **WHEN** a reader follows the continuation card
- **THEN** the card SHALL point to one framework-owned procedure rather than
  copy lifecycle command sequences or write directions
- **AND** it SHALL NOT create a run-local Agent bridge, mutable card field or
  duplicate framework control surface

#### Scenario: Attachment without reachable coordinates remains a boundary

- **WHEN** a map is copied, moved, or supplied without a reachable containing
  bundle or creator-rendered framework coordinate
- **THEN** the card/playbook SHALL report that the current workspace cannot
  establish bundle/framework navigation
- **AND** it SHALL NOT claim host attachment selected a run or substitute a
  guessed framework path

#### Scenario: Existing map remains readable without card wording

- **WHEN** a historical bundle has the current `BUNDLE_MAP.md` layout but
  lacks the new continuation invitation or static coordinate lines
- **THEN** existing bundle inspection, map reading and reentry diagnostics
  SHALL remain available
- **AND** the framework SHALL NOT require a bulk rewrite, manifest migration
  or a new card schema marker
