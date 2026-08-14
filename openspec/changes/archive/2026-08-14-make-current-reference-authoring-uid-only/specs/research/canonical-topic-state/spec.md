## ADDED Requirements

### Requirement: Canonical reference binding SHALL resolve exact UID subsets

The shared Reference Markdown binding adapter SHALL resolve one scalar current
UID, the `all` sentinel, or a non-empty duplicate-free `related_topic_uids`
array of current registered UIDs into one canonical Topic-set conclusion. UID
array members SHALL be exact registered UIDs; unknown, duplicate, empty,
non-array, and conflicting simultaneous current binding forms SHALL fail with
one direct binding diagnostic.

Legacy `related_topic` SHALL remain a separately compatible historical-reader
input pending its own policy change. It SHALL not be required for, inferred
from, or emitted beside a valid new UID-array form.

#### Scenario: Exact UID subset resolves through the common adapter

- **WHEN** reference metadata contains `related_topic_uids` with two distinct
  registered current UIDs
- **THEN** the adapter SHALL resolve exactly those two canonical Topics
- **AND** it SHALL not require a slug, id, `all`, or legacy field

#### Scenario: Duplicate UID subset fails at one direct boundary

- **WHEN** `related_topic_uids` repeats a registered UID
- **THEN** the adapter SHALL reject the reference binding with one duplicate
  binding result
- **AND** it SHALL not broaden or silently deduplicate the declared scope
