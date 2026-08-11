# schema-core Specification

> req: SCO-001, SCO-002, SCO-003, SCO-004, SCO-005, SCO-006, SCO-007, SCO-008, SCO-009, SCO-010, SCO-011, SCO-012, SCO-013, SCO-014
> inv: INV-SOR-001

## Purpose
Deep Research 的类型地基。定义所有领域枚举 (10 个) 和契约 (6 个)，以及 Gate 状态机转换表。纯 JavaScript (.mjs)，零编译，node 直接 import。
## Requirements
### Requirement: Six domain enums defined as Zod schemas

The schema SHALL retain the current lifecycle and HITL/profile Zod enums, including
`CurrentGate` with `rerun_ready` between `hitl2_recorded` and `readiness_passed` and
the six-value `HITL2UserDecision` set. It SHALL additionally define closed
research-access vocabulary for `china` and `overseas` source groups, the declared
fixed sample IDs, compact sample terminal outcomes, and executor-neutral direct
retrieval surface categories. The existing source-class and candidate vocabulary
remains readable only for legacy observations; it SHALL NOT constrain the current
direct-sample writer.

The new access vocabulary SHALL distinguish real content, login-required,
challenge, HTTP-denied, rate-limited, transport-inconclusive, other failed,
whole-probe no-request, and round-budget-not-attempted terminal outcomes.
Whole-probe no-request means no declared page request began because the isolated
probe relay failed or the executor had no already-permitted direct retrieval surface;
it is distinct from a known individual sample that could not start before the round
budget. It SHALL not encode a provider, tool name, user language, VPN state,
IP/geography, HTTP status code, retry count, or network diagnosis.

`HITL2UserDecision` SHALL contain six schema values:

- `not_started` as the pre-decision sentinel; and
- `proceed_to_readiness`, `request_view_revision`, `repair`, `rerun`, `stop_blocked` as the five recorded decision values accepted by the HITL2 gate.

The presence of the `not_started` schema sentinel SHALL NOT make it a gate-pass decision. `human_decision_checkpoints.hitl2.status: recorded` still requires one of the five actionable values.

#### Scenario: Direct-sample vocabulary is closed

- **WHEN** ProfileSchema receives a current direct-sample observation
- **THEN** it SHALL accept only declared source groups, sample IDs, outcome values,
  and surface categories
- **AND** it SHALL reject an undeclared sample, provider name, or status-code field

#### Scenario: Legacy vocabulary remains readable

- **WHEN** a legacy profile contains the previous source-class envelope or bounded
  candidate metadata
- **THEN** the existing legacy schema branch SHALL remain readable
- **AND** the current HITL1 writer SHALL not emit those search-derived fields

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

The system SHALL retain Zod contracts for bundle control file validation, including the Queue contract's queue-v2 demand and work-unit distinctions. The Profile contract SHALL retain optional legacy-compatible `research_access`; new bundle templates initialize it as `status: unprobed`, and a legacy profile without the field remains readable as unprobed.

`unprobed` SHALL contain only `status: unprobed`. A completed current observation SHALL be strict and status-discriminated, require an ISO 8601 `probed_at`, and carry one complete statically bounded direct-sample observation for every controller declared sample. Each sample entry SHALL contain its fixed sample ID, matching source group, and one terminal outcome; only a `content` outcome MAY carry one truthful executor-neutral surface category. No field may carry a URL, body, header, credential, query, candidate, response status, retry/attempt history, or provider identity.

The current writer SHALL set `status: available` only when at least one non- diagnostic core sample returned real content. It SHALL set `status: unavailable` when no core sample returned real content. An unavailable current observation SHALL also retain one non-empty direct summary reason. A current observation may include a transport-inconclusive or round-budget-not-attempted sample terminal outcome without claiming a network owner. The profile schema validates the declared data shape and the status/content invariant; it SHALL NOT infer source relevance, choose a repair, decide whether the user may proceed, or predict later network availability.

The whole-probe no-request branch SHALL be `status: unavailable`, carry the required direct summary reason, contain every declared sample exactly once with `outcome: not_attempted`, and carry no retrieval surface. It SHALL not be used for a sample that was skipped after the round began; that sample uses `round_budget_not_attempted`. Neither no-attempt branch asserts that its sample is unreachable or establishes an `access_boundary`.

Legacy available and unavailable observations with their HTTP(S) result URL, search/fetch labels, candidate metadata, source-class envelope, and optional paired access-boundary fields SHALL remain readable without migration. The current direct-sample format and the legacy search-derived format SHALL NOT be mixed in one observation. The optional legacy `access_boundary` continues to be paired and closed when present; the new per-sample outcomes do not fabricate a boundary classification.

The Profile contract SHALL NOT store a derived gate verdict, response body, query text or history, candidate URL list, retry list, or HTTP status matrix for this observation. The statically bounded direct-sample set SHALL NOT become such a matrix: it SHALL retain at most one closed-enumeration result per declared sample and SHALL NOT retain per-attempt records, response bodies, HTTP status codes, query text, or candidate URL lists for any sample.

#### Scenario: Queue contract validates queue v2

- **WHEN** `validate-bundle.mjs` checks `rb_queue.json`
- **THEN** queue demand items SHALL validate with `queue_item_id`
- **AND** delegated in-flight entries SHALL bind to Engine-allocated `work_id` values

#### Scenario: queue demand identity is distinct from work-unit identity

- **WHEN** a queue demand item uses `work_id` as its demand identifier
- **THEN** queue v2 validation SHALL fail
- **AND** the diagnostic SHALL require `queue_item_id`

#### Scenario: Current observation records both source groups

- **WHEN** a current HITL1 probe completes a round
- **THEN** ProfileSchema SHALL require exactly one terminal entry for every declared
  China and overseas sample and reject duplicate, missing, or group-mismatched IDs
- **AND** it SHALL reject a current observation that contains a URL, candidate list,
  response body, retry history, or provider-specific field

#### Scenario: Current availability follows real content

- **WHEN** a complete current observation has at least one core `content` sample
- **THEN** `status: available` SHALL be valid and `status: unavailable` SHALL fail
- **WHEN** no core sample has real content
- **THEN** `status: unavailable` with a non-empty direct summary reason SHALL be
  valid and `status: available` SHALL fail

#### Scenario: Legacy observations remain readable

- **WHEN** an earlier `research_access` observation uses its existing URL,
  candidate, source-class, or paired-boundary form
- **THEN** ProfileSchema SHALL accept it under the legacy branch without defaulting
  it into the new direct-sample format
- **AND** the new writer requirement SHALL not rewrite existing bundle bytes

#### Scenario: Unprobed cannot claim probe material

- **WHEN** `research_access.status` is `unprobed` with a timestamp, direct-sample
  entries, legacy URL/candidate metadata, reason, surface, or boundary fields
- **THEN** ProfileSchema SHALL fail rather than silently accepting contradictory data

#### Scenario: No-request relay fact is distinct from a spent round budget

- **WHEN** the isolated probe cannot begin any direct page request because its relay
  failed or the current executor has no already-permitted direct surface
- **THEN** ProfileSchema SHALL accept only the complete unavailable whole-probe
  `not_attempted` form with a direct summary reason
- **AND** it SHALL reject using `round_budget_not_attempted` as a relay substitute,
  or mixing the whole-probe no-request outcome with attempted sample results

#### Scenario: source-class envelope stays statically bounded

- **WHEN** a legacy observation records unique closed-enumeration reachability results for declared source classes
- **THEN** ProfileSchema SHALL accept it when its status-specific facts are otherwise valid
- **AND** it SHALL reject a duplicate class entry, an undeclared class entry, an available observation with no reachable class, an unavailable observation with a reachable class, and any per-class attempt list, response body, HTTP status code, query text, or candidate URL list

#### Scenario: access boundary is paired, closed, and status-consistent

- **WHEN** a legacy available or unavailable observation records a boundary-location and boundary-extent value
- **THEN** ProfileSchema SHALL accept only values inside the two closed enumerations
- **AND** it SHALL reject a boundary location without its extent, an extent without its location, `available` with universal extent or without both reachable and unreachable classes, `unavailable` with class-scoped extent, and either value on unprobed observation

#### Scenario: unclassified legacy observation remains valid

- **WHEN** a legacy available or unavailable observation has no `access_boundary` value (and an unavailable branch carries its required non-empty reason)
- **THEN** ProfileSchema SHALL accept the observation
- **AND** it SHALL NOT infer, default, or normalize a boundary value from the reason text

#### Scenario: bounded candidate metadata is internally consistent

- **WHEN** a legacy available observation records `eligible_candidate_count: 3` and `final_candidate_ordinal: 3`, or a legacy unavailable no-candidate observation records `eligible_candidate_count: 0` without an ordinal
- **THEN** ProfileSchema SHALL accept the observation when its status-specific facts are otherwise valid
- **AND** it SHALL reject an ordinal without a positive count, an ordinal greater than the count, a count outside `0..3`, an ordinal on a zero-count observation, an available observation with zero candidate count, or a metadata-bearing positive-count observation without its final `result_url`

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
- **WHEN** `node -e "import('./DEEP_RESEARCH_HARNESS/schema/index.mjs')"` is run
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
