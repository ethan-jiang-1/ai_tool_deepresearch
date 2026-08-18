> req: PHS-009

## ADDED Requirements

### Requirement: Decisions SHALL retain accepted rerun intent revisions newest-first

`rb_plan.md## Decisions` SHALL be the existing host-file history for accepted
post-HITL1 research-intent revisions. A complete revision SHALL use the heading
`### Rerun intent revision: <target_rerun_count>` and these fixed visible labels:
`Target rerun count`, `This-round delta`, `Affected canonical Topics`,
`Superseded or withdrawn requirements`, `Accepted Agent interpretation`,
`Current active amendments relative to HITL1 baseline`, and
`Accepted user wording`. An empty set SHALL be stated explicitly rather than
inferred.

The first six labels and values SHALL each occupy one bounded bullet line; a
missing or empty set SHALL use explicit `none`. Only `Accepted user wording` MAY
be multiline. Every accepted wording line SHALL remain under that label as
Markdown blockquote content: a non-empty line is prefixed with `> ` and an empty
line with `>`. A user-supplied heading, checkbox-looking line, Decisions heading,
or other Markdown structure SHALL therefore remain quoted content and SHALL NOT
become a host-file section or revision entry. This containment is an Agent
authoring rule; it SHALL NOT add an Engine parser, decoder, or semantic check.

Complete accepted revisions SHALL be newest-first and immutable. The newest
complete revision is the current amendment set; readers SHALL combine it with
the HITL1 controls baseline and SHALL NOT merge older deltas back into current
intent. Older entries preserve what was accepted at that revision, including a
requirement later withdrawn or replaced. Unaccepted conversation drafts and
presentation-only Final feedback SHALL NOT be written as revisions.

The section remains Agent-readable Markdown. No Engine parser, schema field,
Gate rule, lifecycle state, or semantic-equivalence check SHALL be added for
revision prose. Existing canonical host-file writers SHALL preserve every
accepted revision while refreshing only their already-owned plan surfaces.
Legacy bundles without revision entries remain readable and SHALL NOT receive
reconstructed history.

#### Scenario: Second rerun preserves first-round history

- **WHEN** rerun 1 accepts amendments A and B, then rerun 2 replaces A with A2 and withdraws B
- **THEN** the rerun 2 entry SHALL appear above rerun 1 and state current active amendments as A2
- **AND** the unchanged rerun 1 entry SHALL still show that A and B were accepted at that earlier revision

#### Scenario: Current reader stops at baseline plus newest revision

- **WHEN** an Agent resumes a bundle with two complete Decisions revisions
- **THEN** it SHALL use the HITL1 baseline plus the newest revision's complete active amendments as current research intent
- **AND** it SHALL NOT scan chat or union superseded requirements from older revisions into the current set

#### Scenario: User Markdown remains inside the accepted-wording field

- **WHEN** accepted user wording contains `## Progress`, `## Decisions`, a checkbox-looking line, or a blank line
- **THEN** every such line SHALL remain inside the revision's linewise blockquote
- **AND** none of that wording SHALL be interpreted as a host-file section, revision heading, or progress item

#### Scenario: Topic-state replacement preserves revision history

- **WHEN** canonical topic-state apply refreshes plan frontmatter and the standard Topic Registry presentation after one or more accepted revisions exist
- **THEN** every Decisions revision SHALL remain byte-preserved outside the writer's existing owned target
- **AND** no revision SHALL be moved into profile, Topic, Gate, or Engine authority

#### Scenario: Legacy plan does not invent history

- **WHEN** a readable legacy bundle has no rerun intent revision in Decisions
- **THEN** existing controls, profile, and direction compatibility behavior SHALL remain available
- **AND** the Agent SHALL NOT infer or backfill historical revisions from artifacts, filenames, or chat
