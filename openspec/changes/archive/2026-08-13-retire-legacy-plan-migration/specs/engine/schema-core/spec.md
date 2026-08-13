## MODIFIED Requirements

### Requirement: PlanSchema validates frontmatter fields

The schema module SHALL expose `CanonicalPlanSchema` and `PlanSchema`, where
`PlanSchema` accepts exactly the canonical plan shape: top-level
`topic_registry_version: "2"` and entries containing immutable `topic_uid`,
`id`, `slug`, `title`, non-empty unique `must_answer[]`, closed `scope_role`,
unique `depends_on_topic_uids[]`, and current `previous_layouts[]` lineage.

Canonical topic UIDs and all current/previous layout slugs SHALL be unique,
dependency UIDs SHALL resolve within the same registry, self-dependency SHALL
fail, and `derived_topic_count` SHALL equal registry length. The frontmatter
format MAY be JSON or YAML and `parseMdFrontmatter()` SHALL continue to parse
both.

A plan without the canonical marker or without the complete canonical topic
entries SHALL fail `PlanSchema`. The schema SHALL NOT retain a legacy union,
legacy topic-entry export, migration discriminator, default, conversion, or
upgrade route. A failed schema does not authorize rewriting `rb_plan.md`, seed
files, evidence, receipts, ledgers, or references.

New bundle templates SHALL include `topic_registry_version: "2"` with an
initially empty registry so empty pre-HITL1 state is unambiguously canonical.

#### Scenario: Canonical YAML frontmatter parses successfully

- **WHEN** YAML frontmatter contains valid canonical entries and matching
  derived count
- **THEN** `PlanSchema` and `CanonicalPlanSchema` SHALL succeed

#### Scenario: Canonical JSON frontmatter parses successfully

- **WHEN** JSON syntax contains valid canonical entries
- **THEN** YAML parsing, `PlanSchema`, and `CanonicalPlanSchema` SHALL succeed

#### Scenario: Legacy bundle remains readable for migration

- **WHEN** an older `rb_plan.md` omits `topic_registry_version: "2"` or uses
  only `{id,slug,title}` topic entries
- **THEN** `PlanSchema` SHALL fail as an unsupported current shape despite the
  historical file remaining human-readable
- **AND** no schema reader SHALL default, convert, migrate, or upgrade it

#### Scenario: Empty new registry is unambiguously canonical

- **WHEN** a new bundle has `topic_registry_version: "2"` and
  `topic_registry: []`
- **THEN** canonical parsing SHALL succeed before HITL1 while the HITL1 gate
  still requires approved non-empty topic intent

#### Scenario: HITL1 completion does not accept legacy compatibility alone

- **WHEN** HITL1 reads a plan that fails the current canonical contract
- **THEN** its existing plan prerequisite SHALL fail before downstream
  seed/profile symptoms
- **AND** it SHALL not offer migration, conversion, or upgrade

#### Scenario: Resumed legacy seed path remains compatible but non-extensible

- **WHEN** an existing historical plan is selected by a current Engine reader
- **THEN** its bytes MAY remain human-readable outside the Engine
- **AND** every current schema/seed/rerun path SHALL reject it rather than
  accept it as a non-extensible compatibility mode

#### Scenario: Current layout lineage remains valid

- **WHEN** a canonical topic contains one current coordinate and valid unique
  `previous_layouts[]` coordinates
- **THEN** `PlanSchema` SHALL preserve that lineage as canonical current
  identity data
- **AND** it SHALL not classify the field as a historical mutable-plan format
