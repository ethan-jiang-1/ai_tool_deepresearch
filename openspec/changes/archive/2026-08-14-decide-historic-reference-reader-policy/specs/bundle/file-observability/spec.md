## MODIFIED Requirements

### Requirement: File observability SHALL consume canonical layout resolution

File observability SHALL use the shared UID/layout resolver for current seeds
and topic-bearing artifact/reference paths. Its reference reader SHALL be a
thin adapter over that resolver rather than an independent regular-expression
identity map. Current seed paths SHALL be audited against current registry
layout. Accepted artifact/reference paths with UID-bound metadata SHALL remain
at their recorded locations and SHALL be classified through the same canonical
binding conclusion. An accepted layout workspace SHALL be the primary root and
SHALL mask derivative seed mismatch findings.

Previous layouts remain compatibility inputs for their accepted non-reference
artifact families. A reference containing `related_topic`, alone or dual with
a UID form, SHALL be reported as the shared
`reference_topic_binding_legacy_unsupported` metadata root and SHALL not be
classified under a canonical topic, accepted as historical coverage, or used to
derive a footprint. File observability SHALL NOT synthesize missing expected
artifact/reference paths for every previous slug, require metadata-only mass
rewrites, or treat the retired key as a second authority; it remains read-only
and does not alter the reference bytes.

#### Scenario: Old submitted path remains valid historical coverage

- **WHEN** immutable provenance records a previous slug and an accepted
  non-reference artifact remains at its recorded path
- **THEN** observability SHALL bind that path to the same UID and report the
  topic's current slug without requiring a move

#### Scenario: Workspace masks cascade

- **WHEN** a prepared layout workspace temporarily leaves old and new seed paths on disk
- **THEN** observability SHALL return one exact recovery blocker
- **AND** SHALL NOT report the two seed paths as two canonical topics

#### Scenario: Missing historical alias path is not an error

- **WHEN** a UID has a previous slug with no artifact/reference file at that coordinate
- **THEN** observability SHALL NOT create a missing-path finding solely from layout history

#### Scenario: Historical reference spelling does not require rewrite

- **WHEN** a reference contains `related_topic` with a current or previous id,
  slug, sentinel, or comma-separated list
- **THEN** observability SHALL report one
  `reference_topic_binding_legacy_unsupported` result at that reference
- **AND** it SHALL not infer a topic footprint, report a dangling id, or
  recommend or perform a rewrite

#### Scenario: Gate and observability share binding outcome

- **WHEN** Wave1 reference checks and file observability read the same
  reference metadata and registry facts
- **THEN** both SHALL return the same canonical UID set or the same binding
  reason code
- **AND** neither SHALL maintain a second raw-field precedence rule
