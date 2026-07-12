> req: SCO-014

## ADDED Requirements

### Requirement: Canonical plan schema SHALL validate topic layout lineage

`CanonicalPlanSchema` SHALL accept C3A entries with absent `previous_layouts` as an empty list and validate each historical item as an exact `{id,slug}` pair. Existing C3A current id/slug shapes SHALL remain readable. Every current or historical slug SHALL map to one topic UID, historical coordinates SHALL differ from that topic's current coordinate, and duplicate history entries SHALL fail. Continuous `01..NN` ids and `NN_<stem>` slugs SHALL be enforced for successful `mutate_layout` output by the operation target builder, not as a new global read-compatibility gate.

`derived_topic_count` SHALL continue to equal registry length. The schema SHALL NOT add active/retired state, tombstone collections or a second topic registry.

#### Scenario: C3A canonical plan remains readable
- **WHEN** a valid canonical entry has no `previous_layouts` field
- **THEN** canonical parsing SHALL treat it as empty layout history

#### Scenario: Pre-C3B coordinate shape remains readable
- **WHEN** a C3A canonical plan uses an accepted non-normalized current id/slug shape
- **THEN** canonical parsing SHALL remain compatible while mutate-layout MAY normalize the final target

#### Scenario: Cross-topic alias collision fails
- **WHEN** one topic's current or previous slug equals another topic's current or previous slug
- **THEN** canonical parsing SHALL fail at the earliest layout-lineage invariant
