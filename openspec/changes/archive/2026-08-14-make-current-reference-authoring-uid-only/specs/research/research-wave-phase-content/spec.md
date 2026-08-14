## ADDED Requirements

### Requirement: Wave reference materialization SHALL select one canonical UID binding form

Wave0 Phase-owned genuinely shared references SHALL write the `all` sentinel;
Wave1 Phase-owned one-Topic references SHALL write the exact submitted-backed
Topic UID; and Wave2 Phase-owned `00-cross-*` references SHALL write the exact
UID subset selected by their current finding/materialization facts. Wave
guidance and shared reference templates SHALL not teach `related_topic` as a
new writer choice.

The Agent remains responsible for deriving semantically correct scope from
accepted submitted/finding facts. The Engine validates only declared binding
shape and canonical membership; it SHALL not select a Topic set or create
evidence authority.

#### Scenario: Wave2 materializes selected finding scope without a W2F join

- **WHEN** a current eligible Wave2 finding selects Topics A and B for a
  consumer-facing `00-cross-*` projection
- **THEN** Phase guidance SHALL materialize a UID array containing A and B
- **AND** it SHALL not require the reference to carry a `W2F-*` metadata join
  or claim relevance to every Topic
