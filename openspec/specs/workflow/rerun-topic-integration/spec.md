# Rerun Topic Integration

> req: RTI-001, RTI-002, RTI-003, RTI-005, RTI-006, RTI-007

## Purpose

Define rerun topic integration contracts: sub-agent reference file format, wave2 re-synthesis on topic addition, gate content quality rules for reference files, rerun-produced file traceability, cache trail requirements, and rerun direction round-count binding with crash-safe recovery.

## Requirements

### Requirement: Sub-agent reference file format specification

Rerun-produced reference files SHALL use the same metadata and semantic
contract as normal reference materialization. They SHALL expose the eight
common required metadata keys, exactly one current canonical topic-binding form
(`related_topic_uid` or `related_topic_uids`), and the five required non-empty
semantic sections: Key Facts, Core Content Capture, Relevance To This Research,
Quotable Terms / Concepts, and Risks And Limitations.

The shared parser SHALL tolerate harmless heading case/level, whitespace,
section order and list-marker presentation. A fixed heading level, fixed
section order, fixed prose length, or fixed Key Facts bullet count SHALL NOT be
a rerun-specific blocking rule. A retained historical reference containing
`related_topic` remains human-readable but SHALL return the common
`reference_topic_binding_legacy_unsupported` result when a current rerun reader
attempts to consume it; rerun SHALL not rewrite it, migrate it, or create a
metadata-only work unit.

#### Scenario: Rerun reference uses the normal tolerant semantic contract

- **WHEN** a rerun-added Topic materializes a reference with all required
  metadata, a current UID binding, and five non-empty semantic sections in an
  equivalent presentation
- **THEN** the same shared reference-format evaluator used by normal execution SHALL accept it
- **AND** rerun SHALL NOT impose a second fixed-order or fixed-quantity format path

#### Scenario: Historical UID binding does not require legacy-field rewrite

- **WHEN** an existing rerun-consumed reference has one exact registered `related_topic_uid` and no legacy `related_topic`
- **THEN** the shared resolver SHALL treat the topic binding as present
- **AND** the Agent SHALL NOT create a work unit solely to change metadata spelling

#### Scenario: Legacy reference cannot enter a current rerun evidence path

- **WHEN** a rerun encounters a retained reference containing `related_topic`
- **THEN** the current reader SHALL return
  `reference_topic_binding_legacy_unsupported`
- **AND** it SHALL not use that reference for rerun provenance, coverage, or
  reference materialization

#### Scenario: Sub-agent role definition includes reference format

- **WHEN** Phase Agent reads `phase-wave1-subagent.md` to construct sub-agent task context
- **THEN** the §2 Artifacts section SHALL include the reference file format specification after the evidence-summary and question-list format specifications
- **AND** the format specification SHALL reference `shared-reference-template.md` specific field and section header names

#### Scenario: Task card action text includes reference format checklist

- **WHEN** Phase Agent creates a task card for wave1 deepening
- **THEN** the `action` field SHALL include a complete checklist of the reference file format (9 metadata field names + 5 `##` section header names)
- **AND** the checklist SHALL explicitly state use of metadata block format (`- key: value`), not YAML frontmatter (`---`)

### Requirement: Rerun reference authoring SHALL preserve canonical binding cardinality

Rerun-produced rich references SHALL use the same new-output cardinality forms
as normal materialization: scalar UID, all sentinel, or exact UID subset. A
rerun writer SHALL preserve the semantically selected Topic scope and SHALL not
reintroduce `related_topic` merely because current or previous layout aliases
are available for historical reading.

#### Scenario: Rerun subset remains exact after layout history exists

- **WHEN** a rerun materializes a cross-Topic reference for a selected subset
  whose Topics have previous layout coordinates
- **THEN** it SHALL write the selected current UID array
- **AND** it SHALL not replace that subset with prior slugs or `all`

### Requirement: Wave2 full re-synthesis on action:add rerun

The Rerun-Aware Behavior section of `phase-wave2.md` SHALL distinguish `action: add` and `action: supplement` rerun scenarios.

When `action: add` (new topic), the Phase Agent SHALL perform full re-synthesis:
- Re-read all topic evidence-summary.md files (including the new topic)
- Rebuild the cross-topic scan matrix (from NxN to (N+1)x(N+1))
- Regenerate `synthesis.md`, `cross-topic-ledger.md`, `finding-index.yaml` from scratch
- Old synthesis may be preserved as `synthesis.prev-rerun-N.md` backup but SHALL NOT serve as baseline

When `action: supplement` (adding dimensions to existing topic), maintain the current delta/append mode.

#### Scenario: action:add triggers full wave2 re-synthesis

- **WHEN** the seed topic file `## 本轮重跑方向` section contains `action: add`
- **THEN** the Phase Agent SHALL re-read evidence-summary.md for all topics (including the new one)
- **AND** the Phase Agent SHALL rebuild the scan matrix covering all (N+1)x(N+1)/2 topic pairs
- **AND** the Phase Agent SHALL generate synthesis.md from scratch (without delta section header markers)
- **AND** the Phase Agent SHALL NOT use delta/append mode

#### Scenario: action:supplement keeps delta/append mode

- **WHEN** the seed topic file `## 本轮重跑方向` section contains `action: supplement`
- **THEN** the Phase Agent SHALL retain the existing synthesis as baseline
- **AND** new analysis SHALL be appended as a delta section (`## Delta Synthesis (Rerun N)`)

### Requirement: Gate content quality rules for reference files

Rerun Wave1 SHALL use the normal Gate rule set and shared evaluators. Numeric countability SHALL require authority-selected accepted status plus a parseable source URL. Required semantic-section availability SHALL remain a separate `reference_format` responsibility. The historical blocking `key_facts_min_lines` rule SHALL be removed rather than retained as a rerun-specific floor; Key Facts quantity or prose richness MAY appear only as advisory feedback.

Source URL presence, submitted backing, canonical topic binding, accepted index navigation, cache/provenance integrity and genuinely missing required semantic sections SHALL remain blocking through their direct owners. Presentation tolerance SHALL NOT grant authority to filesystem-only references or weaken ledger/receipt/hash validation.

#### Scenario: Fewer than five Key Facts is not a rerun blocker

- **WHEN** an authority-backed rerun reference has accepted status, a parseable source URL and all five non-empty semantic sections but fewer than five Key Facts bullets
- **THEN** Wave1 SHALL NOT fail `key_facts_min_lines` or reduce the numeric count
- **AND** any quantity observation SHALL remain advisory and absent from `failed_rule_ids` and `hints[]`

#### Scenario: Missing semantic section remains blocking once

- **WHEN** an authority-backed rerun reference lacks the Core Content Capture semantic section
- **THEN** the shared reference-format evaluator SHALL return one missing-section root
- **AND** count-floor SHALL NOT repeat the same absence as a thin-content or zero-count symptom

#### Scenario: Homepage-looking URL is not rejected by path depth

- **WHEN** a reference file contains URL-parseable `source_url: https://m-en.yna.co.kr/`
- **AND** the file otherwise satisfies required metadata, section, ledger, cache, and provenance checks
- **THEN** no `source_url_article_level` or homepage/shallow heuristic SHALL fail the gate

#### Scenario: Invalid source URL is rejected as metadata shape

- **WHEN** a reference file omits `source_url` or contains a value that is not URL-parseable
- **THEN** the source metadata rule SHALL fail
- **AND** inspect SHALL list the file path and source_url issue

#### Scenario: Thin Key Facts section fails min-lines check

- **WHEN** a declared reference file `## Key Facts` section contains only 3 lines with `- ` entries
- **THEN** the `key_facts_min_lines` rule SHALL fail
- **AND** inspect SHALL list the file path and actual line count

#### Scenario: Filesystem-ledger mismatch detected

- **WHEN** filesystem has 8 `reference/05_south-korea-factor-*.md` files
- **AND** `rb_output_declarations.jsonl` has only 3 `role === 'reference'` declarations pointing to that topic
- **THEN** the `ledger_coverage` rule SHALL fail
- **AND** inspect SHALL list undeclared file paths

### Requirement: Rerun-produced files SHALL be traceable to rerun intent or declared provenance

When HITL2 rerun adds or supplements topics, new files created under `reference/`, `artifacts/`, `seed_topics/`, or `_cache/` SHALL be traceable to at least one of:
- HITL2 rerun rationale
- a seed topic `## 本轮重跑方向` action
- a queue work item and delegated output declaration
- a file explanation diagnostic with non-authoritative status

This traceability SHALL support reentry debugging and SHALL NOT replace ledger/receipt authority for files that participate in gate pass conditions.

#### Scenario: Added topic reference is traceable

- **WHEN** rerun `action: add` creates `reference/06_switzerland-factor-*.md`
- **THEN** the file SHALL either be declared through `rb_output_declarations.jsonl` or reported as an explained/unplanned file
- **AND** only the declared reference SHALL count toward gate pass

### Requirement: Rerun-produced reference files SHALL have traceable cache trails

每个 rerun 产生的 reference 文件 SHALL 在 `rb_output_declarations.jsonl` 中有对应的 `cache_trails` 记录。Engine 的 `cache_coverage` gate 规则 SHALL 对 rerun 路径与首次运行路径一视同仁——不因 `rerun_count > 0` 而跳过 cache 验证。

This requirement applies to new rerun executions after this change is implemented. Existing legacy bundle declarations with empty `cache_trails` MAY be reported as Phase 1 warnings for compatibility, but that warning path SHALL NOT be interpreted as permission for new rerun `action:add` tasks to omit cache writing.

`check-reentry.mjs` 的 file observability audit SHALL 报告缺失 cache trail 的 reference 文件为 `unplanned_needs_explanation`（如果文件存在但无 cache trail）或 `orphan_authority_blocking`（如果文件存在但无 declaration）。该 finding SHALL use existing file observability classifications and mark the specific condition with `kind` or `check` = `cache_gap`; it SHALL NOT introduce a new top-level classification value.

#### Scenario: Rerun-added topic reference files have verified cache trails
- **WHEN** rerun `action: add` topic 的 Wave1 deepening 产生 5 个 reference 文件
- **AND** Phase Agent 通过 `complete()` 完成 delegated tasks
- **THEN** `rb_output_declarations.jsonl` 中每条对应 declaration 的 `cache_trails` SHALL 非空
- **AND** `cache_coverage` gate 规则 SHALL pass

#### Scenario: Legacy rerun reference file without cache trail is flagged
- **WHEN** an existing legacy rerun reference file exists but its declaration has empty `cache_trails`
- **THEN** `check-reentry` 的 file observability SHALL 报告该文件
- **AND** `cache_coverage` gate 规则 SHALL 按 cache-raw-web-content 中定义的两阶段策略处理：Phase 1 emit warning（兼容过渡期），Phase 2 fail

#### Scenario: New rerun action:add omitting cache trail is not acceptable
- **WHEN** this change is implemented
- **AND** a new rerun `action:add` delegated task produces reference files with empty `cache_trails`
- **THEN** file observability SHALL report a `cache_gap` condition using existing classifications
- **AND** the run SHALL be treated as not satisfying the successful rerun cache-trail path

### Requirement: Rerun direction SHALL bind to target round count with crash-safe recovery

Phase-rerun SHALL compute `target_rerun_count = profile.rerun_count + 1`. Before profile increment, the Agent SHALL place one structurally valid direction candidate for every affected add/update/direction-only Topic in the sanctioned topic-state input. The existing topic-state workspace SHALL atomically publish canonical Topic changes, touched seeds, and their target-round directions. After that commit/recovery succeeds, the existing phase-rerun profile owner SHALL increment profile `rerun_count` to target. Downstream phases SHALL activate direction only when its shared resolver state is `matching`.

The canonical writer SHALL render the exact `## 本轮重跑方向` heading and one bullet-form field per canonical label, replacing any prior direction section instead of appending another. The canonical fields SHALL be:

- `rerun_count`: non-negative target integer;
- `action`: `add` for canonical rerun `add_topic`, or `supplement` for `update_intent` and direction-only supplement;
- `new_search_dimensions`: non-empty Agent-authored guidance;
- `adjusted_depth`: non-empty Agent-authored guidance;
- `search_guardrails`: non-empty Agent-authored guidance; and
- `rationale_excerpt`: non-empty excerpt grounded in recorded HITL2 rationale.

Layout-only mutation SHALL preserve existing seed guidance and SHALL NOT create or replace direction. Unknown non-conflicting extension fields MAY be retained and SHALL NOT block readiness. Engine validation SHALL cover presence, uniqueness, enum/integer shape, target-count/action mapping, and non-empty canonical values. It SHALL NOT judge whether search dimensions, depth, guardrails or rationale wording are semantically good and SHALL NOT compare `rationale_excerpt` for semantic equivalence.

Stage 1 crash recovery SHALL inspect existing topic-state workspace first. An accepted workspace SHALL return the existing exact `recover` operation. After no workspace remains, a structurally complete future direction at `profile.rerun_count + 1` SHALL prove only that the seed-direction transaction committed before the existing profile-count step; it SHALL resume at that count owner. A malformed future direction SHALL expose its nearest seed structure root before count synchronization. An old matching/stale direction from a completed round SHALL NOT be mistaken for a new request or proof that all semantics for another rerun have been materialized. Without an accepted workspace, `phase-rerun` SHALL form and retain a fresh sanctioned topic-state input from the current recorded rationale; it SHALL NOT scan every seed to authorize a skip, directly append/replace a direction section, or increment the profile before that input is accepted.

A shared direction resolver/evaluator SHALL return one of the existing five states while also exposing normalized fields, occurrences, extensions, and structural roots:

| State | Condition | Meaning |
|---|---|---|
| `matching` | one parseable direction count equals profile | current-round direction |
| `stale` | one parseable direction count is below profile | previous-round residue |
| `future` | one parseable direction count is above profile | crash window; candidate is not current until count synchronization |
| `legacy_unbound` | no direction section, or a compatibility section without `rerun_count` | pre-v0.29/no-current-binding behavior |
| `invalid` | a present direction/field is ambiguous or unparseable | corrupt/unsupported structure |

Compatibility reading SHALL tolerate an explanatory heading suffix, optional list marker, and optional balanced asterisk-bold wrapper around field labels. It SHALL not require historical bundle migration for presentation. Duplicate direction sections, duplicate canonical fields, invalid action/round, or empty required canonical values in a matching/future candidate SHALL produce structural roots. Stale and legacy-unbound content SHALL retain existing pre-v0.29 behavior and SHALL not be upgraded into a current action by presentation normalization.

Wave phase classification and `checkRerunAddFullSynthesis` SHALL consume this one normalized result. No consumer SHALL retain a second local action/count regex. `matching` direction MAY activate `add`/`supplement`; `stale`, `future`, and `invalid` SHALL NOT activate downstream current-round action. A legacy-unbound compatibility section MAY retain existing pre-v0.29 action behavior, while absence of a direction section supplies no action.

The existing rerun-ready Gate SHALL reuse the same evaluator. It SHALL:

- derive the current Topic/seed scope from the canonical plan and reuse focused canonical seed binding rather than infer authority from directory entries or full topic-state health;
- inspect direction structure only for plan-bound seeds with a present current/future occurrence; absence alone, stale content, legacy-unbound content, and orphan seed files SHALL NOT identify an affected Topic or create a migration blocker;
- evaluate matching direction structure without creating a second parser;
- for a seed with any current/future occurrence or ambiguous duplicate involving one, return only the smallest cardinality/field root before dependent symptoms;
- after a future direction is structurally complete and targets exactly `profile + 1`, remain failed with one count-synchronization root pointing to the existing phase-rerun profile-count owner;
- reject any other future count as invalid rather than increment across multiple rounds; and
- pass direction readiness only when no structural/count-sync root remains.

Direction findings SHALL include exact seed/section/field or profile coordinate, the nearest legal owner, and the same rerun-ready command. An authorized seed correction is `repair_kind: agent_action`; a complete future direction routes to the existing profile count step without asking the user. Parent profile/rationale/lifecycle/plan/seed-binding failures SHALL mask dependent direction findings. The Gate SHALL NOT infer affected Topics from chat, directory membership, or rationale prose; add persistent affected-topic state; generate direction semantics; or create another CLI/Gate family.

This structural Gate does not prove that a new recorded rationale was mapped into a sanctioned topic-state input when no new operation was attempted. Atomic publication guarantees only that once an accepted action targets a Topic, its required direction cannot be omitted from that transaction. A durable operation-intent receipt is outside this requirement.

#### Scenario: Direction written with target before profile increment

- **WHEN** current profile `rerun_count` is 1 and sanctioned topic-state input contains affected directions
- **THEN** each direction candidate SHALL use `rerun_count: 2`
- **AND** topic-state SHALL atomically commit the affected seed directions with any canonical add/update
- **AND** the existing phase-rerun profile owner SHALL then increment profile to 2

#### Scenario: Crash after direction commit before profile increment

- **WHEN** direction has complete `rerun_count: 2` and profile remains 1 after topic-state workspace commit/recovery
- **THEN** the shared resolver SHALL return `future`
- **AND** rerun-ready SHALL remain failed with one count-synchronization root
- **AND** phase-rerun SHALL execute its existing profile increment before rerunning the same Gate

#### Scenario: Crash with accepted topic-state workspace resumes exact candidate

- **WHEN** apply published an accepted topic-state workspace but did not finish all staged seed/direction bytes
- **THEN** phase-rerun SHALL run the existing exact `operate-topic-state recover` action first
- **AND** SHALL NOT reconstruct or directly append direction from chat memory

#### Scenario: New rerun request is not mistaken for crash recovery

- **WHEN** round 2 completed with profile and old direction count 2
- **AND** the user triggers round 3 rerun
- **THEN** the old matching direction SHALL NOT prove round 3 materialization
- **AND** the Agent SHALL derive a new sanctioned topic-state input from recorded round-3 rationale with target count 3

#### Scenario: Old matching direction cannot bypass a fresh topic-state operation

- **WHEN** a new recorded rerun rationale exists, no accepted topic-state workspace remains, and one or more seeds still contain matching directions from the completed round
- **THEN** phase-rerun SHALL retain a fresh add/update/direction-only input and invoke the existing topic-state apply owner before profile increment
- **AND** it SHALL NOT treat the old matching sections as a transaction receipt or directly edit those seed sections

#### Scenario: Direction resolver returns stale for old action

- **WHEN** `checkRerunAddFullSynthesis` reads a seed with direction count 1 and profile count 2
- **THEN** the shared resolver SHALL return `stale`
- **AND** the evaluator SHALL NOT apply `action: add` from that direction

#### Scenario: Legacy direction without rerun_count is not blocked

- **WHEN** a pre-v0.29 seed direction section has no `rerun_count`
- **THEN** the shared resolver SHALL return `legacy_unbound`
- **AND** consumers SHALL retain existing pre-v0.29 behavior without presentation-only migration

#### Scenario: Canonical supplement direction has one complete shape

- **WHEN** sanctioned `update_intent` or `set_rerun_direction` prepares target round 4
- **THEN** the Agent-authored candidate SHALL contain one exact heading and all six canonical fields
- **AND** `action` SHALL be `supplement`

#### Scenario: Canonical add action maps from topic-state operation

- **WHEN** sanctioned topic-state applies `add_topic`
- **THEN** the new UID-bound seed direction SHALL use `action: add`
- **AND** topic-state SHALL reject a mismatched supplement candidate before workspace publication

#### Scenario: Direction-only supplement preserves canonical intent

- **WHEN** rationale changes only search/depth guidance for an existing Topic
- **THEN** `set_rerun_direction` SHALL atomically replace its seed direction with `action: supplement`
- **AND** registry intent bytes SHALL remain unchanged

#### Scenario: Layout-only mutation does not invent direction

- **WHEN** sanctioned rerun performs only rename, reorder, renumber, or safe remove through layout mutation
- **THEN** existing seed guidance SHALL be preserved for retained Topics
- **AND** no direction SHALL be written without add/update/supplement semantics

#### Scenario: Reported legacy presentation remains readable

- **WHEN** a direction uses a heading suffix, omits list markers, and wraps labels in balanced bold while retaining parseable values
- **THEN** the shared reader SHALL preserve matching/stale/future classification
- **AND** compatibility SHALL NOT require presentation-only migration

#### Scenario: Missing supplement field blocks at one root

- **WHEN** a matching supplement direction omits `adjusted_depth`
- **THEN** rerun-ready SHALL fail with one nearest root naming the seed and `adjusted_depth`
- **AND** feedback SHALL direct the Agent to repair through the sanctioned direction/topic-state owner and rerun the same Gate
- **AND** dependent Wave search/projection symptoms SHALL not be emitted at this checkpoint

#### Scenario: Duplicate direction is ambiguous

- **WHEN** one seed contains two direction occurrences or repeats a canonical field and at least one occurrence claims current/future round
- **THEN** readiness SHALL fail closed at the duplicate section/field root
- **AND** SHALL NOT select a winner by file order

#### Scenario: Unknown extension remains compatible

- **WHEN** a complete canonical direction also contains non-conflicting `target_dimension`
- **THEN** readiness SHALL not fail solely because of that extension
- **AND** downstream consumers SHALL use only normalized canonical fields

#### Scenario: Engine does not judge direction semantics

- **WHEN** all canonical direction fields are structurally valid
- **THEN** Engine SHALL not decide whether search dimensions, depth, guardrails or rationale excerpt are substantively good
- **AND** semantic quality SHALL remain owned by the Agent and recorded user rationale

#### Scenario: Incomplete future direction repairs before count synchronization

- **WHEN** profile count is 1 and a future direction targets 2 but has empty `search_guardrails`
- **THEN** rerun-ready SHALL report the seed field root before its count-synchronization root
- **AND** profile SHALL not increment until the candidate is structurally complete

#### Scenario: Future direction cannot route forward

- **WHEN** every future direction is structurally complete but profile remains below target
- **THEN** rerun-ready SHALL still fail and return the existing phase-rerun count owner
- **AND** SHALL NOT route to seed-topics until the directions become matching
