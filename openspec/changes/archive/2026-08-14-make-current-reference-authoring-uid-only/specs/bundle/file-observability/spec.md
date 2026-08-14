## ADDED Requirements

### Requirement: File observability SHALL retain exact reference UID subsets

File observability SHALL consume the shared reference-binding conclusion for a
valid `related_topic_uids` metadata array and attach durable reference facts to
exactly its resolved canonical Topics. It SHALL retain the existing direct
binding failure projection for invalid arrays and SHALL not infer an all-Topic
fact from a selected subset.

#### Scenario: Selected subset creates no unrelated Topic footprint

- **WHEN** a reference declares a valid UID array for Topics A and B in a
  registry that also contains Topic C
- **THEN** observability SHALL attach the reference footprint to A and B only
- **AND** it SHALL not report C as referenced by that file
