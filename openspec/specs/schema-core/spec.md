# schema-core Specification

> req: SCO-001, SCO-002, SCO-003, SCO-004, SCO-005, SCO-006, SCO-007, SCO-008, SCO-009, SCO-010, SCO-011, SCO-012
> inv: INV-SOR-001

## Purpose
Deep Research 的类型地基。定义所有领域枚举 (10 个) 和契约 (6 个)，以及 Gate 状态机转换表。纯 JavaScript (.mjs)，零编译，node 直接 import。
## Requirements
### Requirement: Six domain enums defined as Zod schemas

The schema SHALL define 11 Zod enums: the original 10 plus `rerun_ready` added to `CurrentGate`. `CurrentGate` SHALL include `rerun_ready` between `hitl2_recorded` and `readiness_passed` in its value set.

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

#### Scenario: HITL2UserDecision has 5 values
- **WHEN** `HITL2UserDecision.safeParse('proceed_to_readiness')` is called
- **THEN** it returns `{ success: true }`

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

#### Scenario: Queue contract validates queue v2

- **WHEN** `validate-bundle.mjs` checks `rb_queue.json`
- **THEN** queue demand items SHALL validate with `queue_item_id`
- **AND** delegated in-flight entries SHALL bind to Engine-allocated `work_id` values

#### Scenario: queue demand identity is distinct from work-unit identity

- **WHEN** a queue demand item uses `work_id` as its demand identifier
- **THEN** queue v2 validation SHALL fail
- **AND** the diagnostic SHALL require `queue_item_id`

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

PlanSchema SHALL validate `plan_basename` (string), `derived_topic_count` (number >= 0), and `topic_registry` (array of `{id, slug, title}` objects) from `rb_plan.md` frontmatter. The frontmatter format MAY be JSON or YAML (YAML 1.2 is a superset of JSON). The `parseMdFrontmatter()` function SHALL extract and parse the frontmatter block using `yaml.parse()`, which handles both formats.

#### Scenario: YAML frontmatter parses successfully

- **WHEN** `rb_plan.md` frontmatter uses YAML block format with `plan_basename`, `derived_topic_count`, `topic_registry`
- **THEN** `parseMdFrontmatter()` SHALL return a valid object and `PlanSchema.safeParse()` SHALL succeed

#### Scenario: JSON frontmatter in old bundles still parses

- **WHEN** `rb_plan.md` frontmatter uses JSON format (from older template or disposable bundle)
- **THEN** `parseMdFrontmatter()` SHALL still parse it correctly (YAML 1.2 is JSON superset)

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

