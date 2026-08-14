## MODIFIED Requirements

### Requirement: Canonical reference binding SHALL resolve exact UID subsets

The shared Reference Markdown binding adapter SHALL resolve one scalar current
UID, the `all` sentinel, or a non-empty duplicate-free `related_topic_uids`
array of current registered UIDs into one canonical Topic-set conclusion. UID
array members SHALL be exact registered UIDs; unknown, duplicate, empty,
non-array, and conflicting simultaneous current binding forms SHALL fail with
one direct binding diagnostic.

`related_topic` is a retired historical reader form. Metadata containing that
key, whether alone or beside an otherwise valid current UID form, SHALL return
one `reference_topic_binding_legacy_unsupported` result. The adapter SHALL NOT
parse current/previous ids or slugs from that field, prefer a UID field, infer
a replacement binding, or create an alias path. A legacy-only rejection is a
current Engine boundary, not a request or permission to alter historical bytes.

#### Scenario: Exact UID subset resolves through the common adapter

- **WHEN** reference metadata contains `related_topic_uids` with two distinct
  registered current UIDs and no `related_topic`
- **THEN** the adapter SHALL resolve exactly those two canonical Topics
- **AND** it SHALL not require a slug, id, `all`, or legacy field

#### Scenario: Duplicate UID subset fails at one direct boundary

- **WHEN** `related_topic_uids` repeats a registered UID
- **THEN** the adapter SHALL reject the reference binding with one duplicate
  binding result
- **AND** it SHALL not broaden or silently deduplicate the declared scope

#### Scenario: Legacy-only binding is unsupported by the current reader

- **WHEN** a historical reference contains `related_topic` but no current UID
  binding form
- **THEN** the adapter SHALL return one
  `reference_topic_binding_legacy_unsupported` result at the metadata boundary
- **AND** it SHALL not resolve its id, slug, sentinel, or comma-separated list

#### Scenario: Dual binding does not preserve the retired reader branch

- **WHEN** a reference contains a valid current UID form and `related_topic`
- **THEN** the adapter SHALL return the same
  `reference_topic_binding_legacy_unsupported` result
- **AND** it SHALL not select either field by precedence
