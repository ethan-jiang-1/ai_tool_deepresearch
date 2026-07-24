# schema-core Specification

> req: SCO-001, SCO-002, SCO-003, SCO-004, SCO-005, SCO-006, SCO-007, SCO-008, SCO-009, SCO-010, SCO-011, SCO-012, SCO-013, SCO-014
> inv: INV-SOR-001

## Purpose
Deep Research 的类型地基。定义所有领域枚举 (10 个) 和契约 (6 个)，以及 Gate 状态机转换表。纯 JavaScript (.mjs)，零编译，node 直接 import。
## Requirements
### Requirement: Six domain enums defined as Zod schemas

The schema SHALL define the current 11 Zod enums, including the lifecycle `CurrentGate` values and the HITL/profile enums used by `ProfileSchema`. `CurrentGate` SHALL include `rerun_ready` between `hitl2_recorded` and `readiness_passed` in its value set.

`HITL2UserDecision` SHALL contain six schema values:

- `not_started` as the pre-decision sentinel; and
- `proceed_to_readiness`, `request_view_revision`, `repair`, `rerun`, `stop_blocked` as the five recorded decision values accepted by the HITL2 gate.

The presence of the `not_started` schema sentinel SHALL NOT make it a gate-pass decision. `human_decision_checkpoints.hitl2.status: recorded` still requires one of the five actionable values.

#### Scenario: HumanCheckpointStatus has 5 values

- **WHEN** `HumanCheckpointStatus.safeParse('pending_user')` is called
- **THEN** it returns `{ success: true }`
- **WHEN** `HumanCheckpointStatus.safeParse('invalid')` is called
- **THEN** it returns `{ success: false }`

#### Scenario: AnswerabilityClass has 4 values

- **WHEN** `AnswerabilityClass.safeParse('ready_substantive')` is called
- **THEN** it returns `{ success: true }`
- **WHEN** `AnswerabilityClass.safeParse('invalid')` is called
- **THEN** it returns `{ success: false }`

#### Scenario: HITL2UserDecision has 6 schema values

- **WHEN** `HITL2UserDecision.safeParse()` is called for `not_started` or any of the five recorded decision values
- **THEN** it returns `{ success: true }`
- **WHEN** it is called with `repair_and_rerun` or another unsupported value
- **THEN** it returns `{ success: false }`

#### Scenario: FinalReportView has 7 values

- **WHEN** `FinalReportView.safeParse('executive_brief')` is called
- **THEN** it returns `{ success: true }`

#### Scenario: CurrentGate accepts rerun_ready

- **WHEN** `CurrentGate.safeParse('rerun_ready')` is called
- **THEN** it returns `{ success: true }`

#### Scenario: StatusSchema accepts rerun_ready as current_gate

- **WHEN** `StatusSchema.safeParse({ current_mode: 'execution', state: 'in_progress', current_gate: 'rerun_ready', next_gate: 'seed_topics_ready' })` is called
- **THEN** it returns `{ success: true }`

### Requirement: Six Zod contracts

The system SHALL provide Zod contracts for bundle control file validation. The Queue contract SHALL validate queue v2 `rb_queue.json` with queue demand items keyed by `queue_item_id`, ordered `active_window`, ordered `refill_pool`, `delegated_in_flight`, and `terminal_history`. Work-unit attempt state SHALL be validated through work-unit index, manifest, result, receipt, and ledger schemas rather than queue demand item schema.

The Profile contract SHALL support an optional legacy-compatible `research_access` observation. New bundle templates SHALL initialize it with `status: unprobed`. The observation SHALL use strict status-discriminated branches and validate only direct recorded facts:

- `unprobed` SHALL contain only `status: unprobed` and SHALL NOT carry URL, fetch success, timestamp, reason, tool-surface, candidate-count, or candidate-ordinal claims;
- `available` SHALL require an ISO 8601 `probed_at`, an HTTP(S) `result_url`, and `fetch_outcome: success`; optional trim-non-empty `search_surface` and `fetch_surface` strings MAY record audit labels;
- `unavailable` SHALL require an ISO 8601 `probed_at`, `fetch_outcome: failed | blocked | not_attempted`, and a trim-non-empty `reason`; optional `result_url` SHALL be HTTP(S) when present, and optional `search_surface` / `fetch_surface` SHALL be trim-non-empty when present.

The `available` and `unavailable` branches MAY carry the legacy-compatible bounded candidate metadata pair:

- `eligible_candidate_count` SHALL be an integer from `0` through `3`, representing the number of syntactically eligible search candidates actually considered by the completed probe;
- when `eligible_candidate_count` is greater than zero, `final_candidate_ordinal` SHALL be an integer from `1` through `eligible_candidate_count` and identify the final considered candidate, including a branch that stops before fetch because no legal surface is available;
- when `eligible_candidate_count` is zero, `final_candidate_ordinal` SHALL be absent; and
- both fields MAY be absent together for legacy profiles, but the current HITL1 writer SHALL record the internally consistent count/ordinal shape for every completed probe.

When candidate metadata is present on `available`, its count SHALL be at least `1` and its ordinal SHALL be present. A current observation with positive candidate count SHALL retain the final considered HTTP(S) `result_url`; `unavailable` MAY record count `0` with no ordinal and no URL for a search that produced no considered candidate, or a positive count with its final ordinal and URL for an attempted or no-legal-path branch. Legacy observations without the metadata pair remain readable under the preceding compatibility rule.

Missing `research_access` in a legacy profile SHALL remain schema-readable and SHALL be treated by HITL1 checks as unprobed, not as available. The Profile contract SHALL NOT store a derived gate verdict, response body, query text or history, candidate URL list, retry list, or HTTP status matrix for this observation.

#### Scenario: Queue contract validates queue v2

- **WHEN** `validate-bundle.mjs` checks `rb_queue.json`
- **THEN** queue demand items SHALL validate with `queue_item_id`
- **AND** delegated in-flight entries SHALL bind to Engine-allocated `work_id` values

#### Scenario: queue demand identity is distinct from work-unit identity

- **WHEN** a queue demand item uses `work_id` as its demand identifier
- **THEN** queue v2 validation SHALL fail
- **AND** the diagnostic SHALL require `queue_item_id`

#### Scenario: available research access is internally consistent

- **WHEN** `research_access.status` is `available`
- **THEN** ProfileSchema SHALL require an ISO probe timestamp, HTTP(S) result URL, and `fetch_outcome: success`
- **AND** missing or contradictory available observations SHALL fail validation

#### Scenario: unavailable research access carries direct failure facts

- **WHEN** `research_access.status` is `unavailable`
- **THEN** ProfileSchema SHALL require an ISO probe timestamp, non-success fetch outcome, and non-empty reason
- **AND** a success claim in the unavailable branch SHALL fail validation

#### Scenario: bounded candidate metadata is internally consistent

- **WHEN** an available observation records `eligible_candidate_count: 3` and `final_candidate_ordinal: 3`, or an unavailable no-candidate observation records `eligible_candidate_count: 0` without an ordinal
- **THEN** ProfileSchema SHALL accept the observation when its status-specific facts are otherwise valid
- **AND** it SHALL reject an ordinal without a positive count, an ordinal greater than the count, a count outside `0..3`, an ordinal on a zero-count observation, an available observation with zero candidate count, or a metadata-bearing positive-count observation without its final `result_url`

#### Scenario: legacy observation remains readable without candidate metadata

- **WHEN** a legacy available or unavailable `research_access` observation has no candidate metadata fields
- **THEN** ProfileSchema SHALL remain readable for compatibility
- **AND** the current writer requirement SHALL NOT turn old bundle bytes into a migration prerequisite

#### Scenario: unprobed cannot claim success or probe metadata

- **WHEN** `research_access.status` is `unprobed` with timestamp, URL, outcome, reason, tool-surface, candidate-count, or candidate-ordinal fields
- **THEN** ProfileSchema SHALL fail validation rather than silently accepting contradictory fields

#### Scenario: legacy profile is unprobed rather than available

- **WHEN** an existing profile has no `research_access` field
- **THEN** ProfileSchema SHALL remain readable for compatibility
- **AND** HITL1 checks SHALL treat the capability as unprobed

### Requirement: Rerun tracking field in HITL2 profile

The HITL2 section of `rb_profile.yaml` SHALL support one optional field for rerun tracking:

- `rerun_count`: non-negative integer, default 0. Tracks how many times the rerun path has been taken.

The field SHALL be optional to maintain backward compatibility with existing bundles. Bundles without this field SHALL be treated as `rerun_count: 0`.

Rerun direction hints (topic adjustment plan) SHALL be written into `seed_topics/{slug}.md` files as a `## 本轮重跑方向` section, NOT into the profile. This keeps per-topic instructions co-located with the topic data that downstream phases already read.

#### Scenario: Old bundle without rerun_count is valid

- **WHEN** a bundle created before this change is validated
- **THEN** missing `rerun_count` SHALL default to 0 and validation SHALL pass

### Requirement: Gate transition table covers all states
> **@deprecated** — The abstract FSM in `schema/contracts/gate.mjs` (GATE_MACHINE_STATES / GATE_TRANSITIONS) is no longer the canonical transition source. The canonical truth source is `workflows/transitions.chain.json` + `engine/ask-next.mjs` (resolveNodeTransitionDetailed). The GateTransitionTable SHALL be retained for backward compatibility but SHALL NOT be the reference for new features. See: openspec/specs/transition-table/spec.md.

The abstract FSM originally defined transitions for 8 states: instantiation_complete, setup_ready, wave0_complete, wave1_complete, wave2_complete, hitl2_pending_user, readiness_passed, blocked_terminal. The current lifecycle uses 11 gate states (see `CurrentGate` enum in `schema/enums.mjs`).

#### Scenario: Every non-terminal state has at least one transition
- **WHEN** the deprecated GateTransitionTable is validated
- **THEN** non-terminal states each have ≥ 1 transition entry

#### Scenario: PASS events follow correct gate order
> **@deprecated** — This scenario describes the old abstract FSM (instantiation→setup→wave0, no hitl1/seed-topics). The canonical chain (transitions.chain.json) is: instantiation→hitl1→setup→seed-topics→wave0→wave1→wave2→hitl2→readiness→final.

- **WHEN** PASS_SETUP fires from instantiation_complete
- **THEN** next state is setup_ready (old FSM only; canonical chain routes instantiation→hitl1 first)
- **WHEN** PASS_WAVE0 fires from setup_ready
- **THEN** next state is wave0_complete (old FSM only; canonical chain routes setup→seed-topics first)

#### Scenario: REOPEN returns to correct prior gate
- **WHEN** REOPEN fires from wave0_complete
- **THEN** next state is setup_ready
- **WHEN** REOPEN fires from wave1_complete
- **THEN** next state is wave0_complete

#### Scenario: HITL2 user actions route correctly
- **WHEN** USER_PROCEED fires from hitl2_pending_user
- **THEN** next state is readiness_passed
- **WHEN** USER_REPAIR fires from hitl2_pending_user
- **THEN** next state is wave1_complete

### Requirement: Schema is directly importable by node
All schema files SHALL be valid JavaScript (.mjs) that `node` can import directly without compilation.

#### Scenario: node imports schema
- **WHEN** `node -e "import('./DPT_FRAMEWORK/schema/index.mjs')"` is run
- **THEN** it succeeds without errors

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

### Requirement: stripMdFrontmatter extracts body from Markdown

`stripMdFrontmatter(mdContent)` SHALL strip the YAML frontmatter block (delimited by `---`) from a Markdown string and return the trimmed body. If no frontmatter block exists, it SHALL return the trimmed input unchanged. This is the inverse operation of `parseMdFrontmatter()`.

#### Scenario: Strips frontmatter and returns body

- **WHEN** input is `---\nplan_basename: foo\n---\n\n# Plan\n\nSome content\n`
- **THEN** output SHALL be `# Plan\n\nSome content`

#### Scenario: Passes through content with no frontmatter

- **WHEN** input is `# Just a title\n\nNo frontmatter here\n`
- **THEN** output SHALL be `# Just a title\n\nNo frontmatter here`

#### Scenario: Empty input returns empty

- **WHEN** input is `""` (empty string)
- **THEN** output SHALL be `""`

#### Scenario: Frontmatter-only input returns empty

- **WHEN** input is `---\nplan_basename: foo\n---\n`
- **THEN** output SHALL be `""` (body is empty after frontmatter stripped and trimmed)

#### Scenario: Body `---` not mistaken for frontmatter

- **WHEN** input is `---\nplan: foo\n---\n\n# Plan\n\n--- not frontmatter ---\n`
- **THEN** output SHALL be `# Plan\n\n--- not frontmatter ---` (only first `---` pair stripped, anchored to start of string)

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
