## MODIFIED Requirements

### Requirement: New rich references SHALL use canonical UID cardinality bindings

New rich-reference writers SHALL emit exactly one canonical Topic-binding form:
`related_topic_uid` with one exact registered UID, `related_topic_uid: all`
for a genuinely all-Topic source, or `related_topic_uids` with a non-empty
duplicate-free array of exact registered UIDs for an exact selected subset.
New writer guidance SHALL NOT select `related_topic` as a new-output form. The
derived `_INDEX.md` navigation `related_topic` cell SHALL render a stable
reader-facing label for every valid form without becoming Topic authority.

Existing Markdown bytes that contain `related_topic` remain directly readable
by people at their recorded paths. They are not valid current Engine
reference-format input, including a dual declaration beside a UID form; current
format validation SHALL report the shared
`reference_topic_binding_legacy_unsupported` result and SHALL not rewrite,
convert, move, or duplicate the file.

#### Scenario: Selected subset renders as one canonical metadata form

- **WHEN** a new `00-cross-*` reference covers exactly two current Topics
- **THEN** its metadata SHALL use `related_topic_uids` with precisely those two
  UIDs and no `related_topic` field
- **AND** index synchronization SHALL retain the reference as a cross-Topic
  navigation row

#### Scenario: New one-Topic writer does not choose legacy metadata

- **WHEN** a new Wave1 rich reference is materialized for one current Topic
- **THEN** it SHALL use the exact scalar `related_topic_uid`
- **AND** current templates and examples SHALL not offer `related_topic` as an
  alternative new-output field

#### Scenario: Preserved legacy Markdown is not current evidence input

- **WHEN** a reader encounters a historical reference containing
  `related_topic`
- **THEN** it SHALL retain the file bytes and human-readable Markdown
- **AND** it SHALL not treat the file as structurally valid current Engine
  evidence through that metadata form
