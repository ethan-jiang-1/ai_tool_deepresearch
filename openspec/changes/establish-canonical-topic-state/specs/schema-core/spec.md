> req: SCO-002, SCO-013

## MODIFIED Requirements

### Requirement: PlanSchema validates frontmatter fields

The schema module SHALL expose:

- `LegacyPlanSchema` for plans without canonical version marker and existing `{id,slug,title}` topic entries;
- `CanonicalPlanSchema` requiring top-level `topic_registry_version: "2"` and entries containing immutable `topic_uid`, `id`, `slug`, `title`, non-empty unique `must_answer[]`, closed `scope_role`, and unique `depends_on_topic_uids[]`;
- `PlanSchema` as the compatibility union used by general bundle readers/validation.

Canonical topic UIDs and slugs SHALL be unique, dependency UIDs SHALL resolve within the same registry, self-dependency SHALL fail, and `derived_topic_count` SHALL equal registry length. The frontmatter format MAY be JSON or YAML and `parseMdFrontmatter()` SHALL continue to parse both.

Legacy acceptance by `PlanSchema` SHALL mean only that the old bundle is readable. New-run HITL1 completion and topic-state `add_topic`/`update_intent` SHALL require `CanonicalPlanSchema`. Canonical-mode setup/seed readiness SHALL validate the canonical invariants, while resumed legacy bundles SHALL retain the existing accepted read/gate compatibility path until sanctioned rerun migration. That compatibility path SHALL NOT authorize new canonical topic mutation.

New bundle templates SHALL include `topic_registry_version: "2"` with an initially empty registry so empty pre-HITL1 state is unambiguously canonical. Legacy bundles lacking the marker remain migratable.

#### Scenario: Canonical YAML frontmatter parses successfully
- **WHEN** YAML frontmatter contains valid canonical entries and matching derived count
- **THEN** `PlanSchema` and `CanonicalPlanSchema` SHALL succeed

#### Scenario: Canonical JSON frontmatter parses successfully
- **WHEN** JSON syntax contains valid canonical entries
- **THEN** YAML parsing, `PlanSchema`, and `CanonicalPlanSchema` SHALL succeed

#### Scenario: Legacy bundle remains readable for migration
- **WHEN** an older bundle contains `{id,slug,title}` entries
- **THEN** `LegacyPlanSchema` and compatibility `PlanSchema` SHALL succeed
- **AND** `CanonicalPlanSchema` plus ordinary add-topic/update-intent SHALL fail with migration-required feedback
- **AND** only sanctioned rerun `migrate_legacy` MAY convert it to canonical form

#### Scenario: Empty new registry is unambiguously canonical
- **WHEN** a new bundle has `topic_registry_version: "2"` and `topic_registry: []`
- **THEN** canonical parsing SHALL succeed before HITL1 while the HITL1 gate still requires approved non-empty topic intent

#### Scenario: HITL1 completion does not accept legacy compatibility alone
- **WHEN** HITL1 gate reads a legacy-compatible but non-canonical plan
- **THEN** the gate SHALL fail at the canonical plan prerequisite and SHALL NOT emit downstream seed/profile symptoms

#### Scenario: Resumed legacy seed path remains compatible but non-extensible
- **WHEN** an existing legacy bundle has not entered sanctioned rerun migration
- **THEN** its accepted legacy reader/gate path MAY continue without pretending canonical UID binding exists
- **AND** it SHALL NOT add or refine topics through canonical topic-state apply
