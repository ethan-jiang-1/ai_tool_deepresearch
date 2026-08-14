# schema-core Specification

> req: SCO-001, SCO-002, SCO-004, SCO-005, SCO-006, SCO-007, SCO-008, SCO-009, SCO-010, SCO-011, SCO-012, SCO-013, SCO-014
> inv: INV-SOR-001

## Purpose
Deep Research 的类型地基。定义所有领域枚举 (10 个) 和契约 (6 个)。纯 JavaScript (.mjs)，零编译，node 直接 import。
## Requirements
### Requirement: Six domain enums defined as Zod schemas

The schema SHALL retain the current lifecycle and HITL/profile Zod enums, including
`CurrentGate` with `rerun_ready` between `hitl2_recorded` and `readiness_passed` and
the six-value `HITL2UserDecision` set. It SHALL additionally define closed
research-access vocabulary for `china` and `overseas` source groups, the declared
fixed sample IDs, compact sample terminal outcomes, and executor-neutral direct
retrieval surface categories. Retired source-class, candidate, and access-boundary
vocabulary SHALL NOT remain a current enum or profile contract surface.

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

The system SHALL retain Zod contracts for bundle control file validation, including the Queue contract's queue-v2 demand and work-unit distinctions. The Profile contract SHALL keep `research_access` optional: new bundle templates initialize it as `status: unprobed`, while a profile without the field remains schema-valid outside a checkpoint that explicitly requires a completed observation.

`unprobed` SHALL contain only `status: unprobed`. A completed current observation SHALL be strict and status-discriminated, require an ISO 8601 `probed_at`, and carry one complete statically bounded direct-sample observation for every controller declared sample. Each sample entry SHALL contain its fixed sample ID, matching source group, and one terminal outcome; only a `content` outcome MAY carry one truthful executor-neutral surface category. No field may carry a URL, body, header, credential, query, candidate, response status, retry/attempt history, or provider identity.

The current writer SHALL set `status: available` only when at least one non- diagnostic core sample returned real content. It SHALL set `status: unavailable` when no core sample returned real content. An unavailable current observation SHALL also retain one non-empty direct summary reason. A current observation may include a transport-inconclusive or round-budget-not-attempted sample terminal outcome without claiming a network owner. The profile schema validates the declared data shape and the status/content invariant; it SHALL NOT infer source relevance, choose a repair, decide whether the user may proceed, or predict later network availability.

The whole-probe no-request branch SHALL be `status: unavailable`, carry the required direct summary reason, contain every declared sample exactly once with `outcome: not_attempted`, and carry no retrieval surface. It SHALL not be used for a sample that was skipped after the round began; that sample uses `round_budget_not_attempted`. Neither no-attempt branch asserts that its sample is unreachable or establishes a host, network, or owner boundary.

An earlier URL/fetch/search/candidate/source-class/access-boundary research-access envelope SHALL fail ProfileSchema as an unsupported current shape. The schema SHALL NOT default, convert, migrate, upgrade, retain a discriminator for, or infer a direct-sample observation from that envelope.

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

#### Scenario: Unprobed cannot claim probe material

- **WHEN** `research_access.status` is `unprobed` with a timestamp, direct-sample
  entries, URL/candidate metadata, reason, surface, or boundary fields
- **THEN** ProfileSchema SHALL fail rather than silently accepting contradictory data

#### Scenario: No-request relay fact is distinct from a spent round budget

- **WHEN** the isolated probe cannot begin any direct page request because its relay
  failed or the current executor has no already-permitted direct surface
- **THEN** ProfileSchema SHALL accept only the complete unavailable whole-probe
  `not_attempted` form with a direct summary reason
- **AND** it SHALL reject using `round_budget_not_attempted` as a relay substitute,
  or mixing the whole-probe no-request outcome with attempted sample results

### Requirement: Rerun tracking field in HITL2 profile

The HITL2 section of `rb_profile.yaml` SHALL support one optional field for rerun tracking:

- `rerun_count`: non-negative integer, default 0. Tracks how many times the rerun path has been taken.

The field SHALL be optional to maintain backward compatibility with existing bundles. Bundles without this field SHALL be treated as `rerun_count: 0`.

Rerun direction hints (topic adjustment plan) SHALL be written into `seed_topics/{slug}.md` files as a `## 本轮重跑方向` section, NOT into the profile. This keeps per-topic instructions co-located with the topic data that downstream phases already read.

#### Scenario: Old bundle without rerun_count is valid

- **WHEN** a bundle created before this change is validated
- **THEN** missing `rerun_count` SHALL default to 0 and validation SHALL pass

### Requirement: Schema is directly importable by node
All schema files SHALL be valid JavaScript (.mjs) that `node` can import directly without compilation.

#### Scenario: node imports schema
- **WHEN** `node -e "import('./DEEP_RESEARCH_HARNESS/schema/index.mjs')"` is run
- **THEN** it succeeds without errors

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
