## ADDED Requirements

### Requirement: BUNDLE_MAP.md offers a portable continuation card

For a newly instantiated production or disposable runtime bundle,
`BUNDLE_MAP.md` SHALL begin its navigation content with a concise continuation
card. The card SHALL:

- state that the map's containing directory is the candidate active bundle
  root for a supplied/attached map;
- invite a user to provide the map or its containing bundle to an Agent and
  state a continuation, inspection, supplement, question, or post-delivery
  request in ordinary language;
- expose the template-rendered `bundle_name` and creation framework version as
  static identification/navigation facts; and
- point to the one framework-owned existing-bundle continuation playbook.

The card SHALL retain the passive-map boundary. It SHALL NOT claim that its
text, attachment, static identity values, or a user's request proves runtime
identity, grants permission, selects a phase/route, enters a node, changes
status, passes a Gate, drains a queue, records a decision, or authorizes
post-final mutation. It SHALL direct the Agent to reachable bundle control
files, trace and existing Engine diagnostics for current truth.

The card SHALL NOT duplicate lifecycle commands, workflow prose, a framework
copy, mutable status, or an `AGENTS.md`/`CLAUDE.md` bridge at bundle root.

#### Scenario: New bundle supplies an understandable continuation entry

- **WHEN** the production instantiator creates a new runtime bundle
- **THEN** its root `BUNDLE_MAP.md` SHALL invite a user to attach the map or
  bundle and express the requested next work in ordinary language
- **AND** it SHALL identify the rendered bundle name and creation framework
  version
- **AND** it SHALL link to the canonical framework continuation playbook

#### Scenario: Card attachment does not become runtime authority

- **WHEN** an Agent receives an attached or opened `BUNDLE_MAP.md`
- **THEN** it SHALL resolve the containing directory and framework relation
  before using the map as navigation
- **AND** it SHALL obtain current phase, gate, queue, evidence and decision
  facts from active bundle controls, trace and existing Engine feedback
- **AND** it SHALL NOT infer those facts from card text or `bundle_name`

#### Scenario: Card remains a passive map

- **WHEN** a reader follows the continuation card
- **THEN** the card SHALL point to one framework-owned procedure rather than
  copy lifecycle command sequences or write directions
- **AND** it SHALL NOT create a run-local Agent bridge, mutable card field or
  duplicate framework control surface

#### Scenario: Existing map remains readable without card wording

- **WHEN** a historical bundle has the current `BUNDLE_MAP.md` layout but
  lacks the new continuation invitation or static version line
- **THEN** existing bundle inspection, map reading and reentry diagnostics
  SHALL remain available
- **AND** the framework SHALL NOT require a bulk rewrite, manifest migration
  or a new card schema marker
