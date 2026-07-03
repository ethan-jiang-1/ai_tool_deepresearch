# Research Wave Phase Content (delta)

> req: RWP-002, RWP-004, RWP-005, RWP-008, RWP-010, RWP-011, RWP-014

## Purpose

Align wave phase content with the hardened relay pipeline. This change supersedes the older Wave1 foundation-placeholder boundary for this active change, and clarifies that relay role spec files are Phase-Agent-loaded role guidance, not manifest lifecycle phases executed directly by a Sub-agent.

## MODIFIED Requirements

### Requirement: Wave1 phase body completeness with subagent boundary

`phase-wave1.md` SHALL describe relay-driven topic-specific deepening, not a foundation-placeholder skeleton phase.

The Wave1 lifecycle node SHALL guide the Phase Agent to create one `topic_deepening` task card per topic in `rb_plan.md` `topic_registry`, using accepted TargetSpec wire shape:

- `targets.controller: "main-agent"`
- `targets.delegates.to: "sub-agent"`
- `targets.delegates.role_key: "dpt-evidence-extractor"`

Wave1 primary deepening SHALL produce, for each topic, paired artifacts plus rich reference files:

- `artifacts/wave1/{topic.slug}/evidence-summary.md`
- `artifacts/wave1/{topic.slug}/question-list.md`
- one or more `reference/{topic.slug}-<source-slug>.md` files when fetched sources are accepted

The phase body SHALL state that Wave1 WebSearch/WebFetch work MUST be delegated through the relay pipeline. Direct Phase Agent search followed by hand-written artifacts is not a legal Wave1 completion path.

#### Scenario: Wave1 lifecycle creates delegated deepening tasks

- **WHEN** Phase Agent loads `phase-wave1.md`
- **THEN** the body SHALL instruct it to enqueue `topic_deepening` task cards for topic registry entries
- **AND** each search-capable task card SHALL delegate to `dpt-evidence-extractor` through `targets.delegates`
- **AND** the Phase Agent SHALL complete task cards through delegated relay completion before running `wave1-complete`

#### Scenario: Wave1 no longer writes placeholder skeletons

- **WHEN** Wave1 completes under this change
- **THEN** `artifacts/wave1/{topic}/skeleton.md` with `capability: foundation-placeholder` SHALL NOT be the expected completion artifact
- **AND** `wave1-complete` SHALL be evaluated against relay-produced evidence summaries, question lists, declared references, and accepted quality/countability rules

### Requirement: Wave1 foundation placeholder boundary enforcement

Wave1 SHALL treat the old prohibition on claiming "topic-specific deepening completed" as a foundation-stage placeholder boundary superseded by this change. Under this change, Wave1 is allowed to claim topic-specific deepening only when the topic's evidence-producing outputs are covered by Engine-written output declarations and current-wave successful relay slot provenance.

Wave1 SHALL continue to forbid fake completion claims. The forbidden set shifts from "do not claim deepening at all" to "do not claim deepening without relay-backed evidence, declared references, cache trail handling, and gate pass."

`subagent: true` or equivalent metadata SHALL NOT be treated as future-only placeholder documentation for Wave1. Wave1 search work is an active delegated relay path in this change.

#### Scenario: Deepening claim requires current-wave relay provenance

- **WHEN** a Wave1 artifact claims topic-specific deepening completed
- **AND** the corresponding reference/evidence outputs are not covered by current-wave output declaration coverage and successful slot binding
- **THEN** `wave1-complete` SHALL fail provenance checks or emit bypass diagnostics according to this change

### Requirement: Wave1 future expansion tracks documentation

Any Future Expansion Guidance that remains in `phase-wave1.md` SHALL be clearly marked as beyond this change and SHALL NOT contradict the active relay-driven deepening path.

Future guidance MAY discuss richer multi-round exploration, candidate intake, fan-in review, or semantic quality gates, but SHALL NOT describe sub-agent dispatch or topic-specific deepening as absent from the current phase.

#### Scenario: Future guidance does not downgrade active Wave1

- **WHEN** a reader inspects `phase-wave1.md`
- **THEN** the body SHALL present relay-driven deepening as current required behavior
- **AND** any future guidance SHALL be limited to enhancements beyond the current single-pass / supplementary relay loops

### Requirement: Relay role spec files are role guidance

`subagent-dpt-source-intake.md`, `subagent-dpt-evidence-extractor.md`, and `subagent-dpt-topic-scout.md` SHALL be treated as relay subagent role specification files loaded by the Phase Agent. They are not manifest lifecycle phase nodes.

Each role spec SHALL state that:

- the Phase Agent reads the role spec to construct bounded relay slot instructions
- the Sub-agent actor receives the generated slot `task.md`, `result.schema.json`, runtime receipt file, and slot-local/cache paths
- the Sub-agent does not directly load the role spec file as a lifecycle Markdown node
- lifecycle `stop`, `gate`, and manifest routing semantics do not apply to these role specs

The role mapping SHALL be:

| Role spec | Role key | Primary consuming phase |
|-----------|----------|-------------------------|
| `subagent-dpt-source-intake.md` | `dpt-source-intake` | Wave0 |
| `subagent-dpt-evidence-extractor.md` | `dpt-evidence-extractor` | Wave1 and Wave2 backing supplementary tasks |
| `subagent-dpt-topic-scout.md` | `dpt-topic-scout` | Wave2 gap-fill/search |

`subagent-dpt-topic-scout.md` SHALL define the `dpt-topic-scout` gap-fill/search role. Any accepted wording that a Sub-agent receives instructions from the old Wave2 subagent file is narrowed by this change to mean "instructions derived from the role spec and delivered via relay task.md."

#### Scenario: Wave2 role spec is delivered through relay task files

- **WHEN** Wave2 triggers `decision=exploit_search` or `decision=explore_search`
- **THEN** the Phase Agent SHALL use `subagent-dpt-topic-scout.md` as role guidance
- **AND** the spawned Sub-agent SHALL receive bounded slot files rather than directly executing `subagent-dpt-topic-scout.md`

#### Scenario: Role spec is not in manifest lifecycle

- **WHEN** workflow package validation examines manifest phases
- **THEN** no `subagent-dpt-*` role spec SHALL appear in `manifest.phases[]`
- **AND** lifecycle header injection SHALL NOT be applied to those role spec files

### Requirement: Wave2 phase body completeness

Wave2 SHALL keep the main synthesis/backfill task path under Phase Agent control. `artifacts/wave2/synthesis.md`, `artifacts/wave2/cross-topic-ledger.md`, `artifacts/wave2/finding-index.yaml`, and seed-topic backfill edits do not by themselves require a Wave2 subagent slot.

When Wave2 creates new search/evidence/reference outputs, including optional `reference/00-cross-*.md` promoted references, those outputs SHALL be delegated through relay and covered by Wave2 output declaration coverage and current-wave slot binding.

`phase-wave2.md` SHALL list both relay role specs in `suggested_context`:

- `phases/subagent-dpt-topic-scout`
- `phases/subagent-dpt-evidence-extractor`

Wave2 SHALL define its finding taxonomy in place, rather than relying on context-dependent "unchanged" wording. It SHALL list finding types `wave1_legacy_question`, `cross_topic_resolution`, and `cross_topic_emergent_question`, and decision values `use_existing_evidence`, `exploit_search`, `explore_search`, `defer_hitl2`, `requires_internal_data`, and `record_only`.

Wave2 SHALL describe delegated completion for relay-backed new search/evidence/reference tasks as: Phase Agent stages/spawns relay Sub-agent, relay ingestion validates runtime receipt, `commitSlotResult()` commits slot `result.json`, and Phase Agent calls `operate-queue complete --result <result.json>` with `slot_result_ref`.

#### Scenario: Wave2 synthesis alone remains main-agent work

- **WHEN** Wave2 only produces synthesis, cross-topic ledger, finding index, and seed-topic backfill from existing evidence
- **THEN** absence of `_subagents/wave_02/` SHALL NOT fail the phase by itself

#### Scenario: Wave2 promoted reference is relay-backed

- **WHEN** Wave2 writes `reference/00-cross-*.md`
- **THEN** that reference SHALL be covered by a Wave2 delegated relay completion
- **AND** filesystem-only creation of the reference SHALL NOT satisfy provenance checks

#### Scenario: Wave2 suggested context keeps both role specs available

- **WHEN** Phase Agent loads `phase-wave2.md`
- **THEN** the node SHALL suggest `phases/subagent-dpt-topic-scout`
- **AND** the node SHALL suggest `phases/subagent-dpt-evidence-extractor`
- **AND** the body SHALL explain that backing supplementary tasks may still use `dpt-evidence-extractor`

### Requirement: Rerun action:add SHALL include full cache trail

For rerun `action:add`, Wave0 and Wave1 added-topic search/intake SHALL follow the same relay and cache trail rules as first-run topic intake/deepening.

The phase bodies SHALL require task card action text and subagent role specs to provide cache leaf paths and Agent Output Declaration fields so delegated `complete()` can populate verified `cache_trails`. This preserves the accepted `cache_coverage` two-phase strategy; it does not lower cache coverage to a global warning.

#### Scenario: Added topic uses first-run relay provenance

- **WHEN** HITL2 rerun adds a new topic
- **THEN** Wave0/Wave1 search tasks for that topic SHALL use delegated relay task cards
- **AND** output declarations and cache trails SHALL be produced through the same completion boundary used on first run

## REMOVED Requirements

None. The placeholder Wave1 requirements are superseded for this active change through MODIFIED requirements above rather than removed from main specs in this round.
