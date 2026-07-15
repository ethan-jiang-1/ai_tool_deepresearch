# Rerun Topic Integration

> req: RTI-001, RTI-002, RTI-003, RTI-005, RTI-006, RTI-007

## Purpose

Define rerun topic integration contracts: sub-agent reference file format, wave2 re-synthesis on topic addition, gate content quality rules for reference files, rerun-produced file traceability, cache trail requirements, and rerun direction round-count binding with crash-safe recovery.

## Requirements

### Requirement: Sub-agent reference file format specification

Rerun-produced reference files SHALL use the same metadata and semantic contract as normal reference materialization. They SHALL expose the eight common required metadata keys, one canonical topic-binding form resolved from exact `related_topic_uid` or compatible legacy `related_topic`, and the five required non-empty semantic sections: Key Facts, Core Content Capture, Relevance To This Research, Quotable Terms / Concepts, and Risks And Limitations.

The shared parser SHALL tolerate harmless heading case/level, whitespace, section order and list-marker presentation. A fixed heading level, fixed section order, fixed prose length, or fixed Key Facts bullet count SHALL NOT be a rerun-specific blocking rule. Existing historical references that resolve through the canonical adapter SHALL not require metadata-only mass rewrite.

#### Scenario: Rerun reference uses the normal tolerant semantic contract

- **WHEN** a rerun-added Topic materializes a reference with all required metadata and five non-empty semantic sections in an equivalent presentation
- **THEN** the same shared reference-format evaluator used by normal execution SHALL accept it
- **AND** rerun SHALL NOT impose a second fixed-order or fixed-quantity format path

#### Scenario: Historical UID binding does not require legacy-field rewrite

- **WHEN** an existing rerun-consumed reference has one exact registered `related_topic_uid` and no legacy `related_topic`
- **THEN** the shared resolver SHALL treat the topic binding as present
- **AND** the Agent SHALL NOT create a work unit solely to change metadata spelling

#### Scenario: Sub-agent role definition includes reference format

- **WHEN** Phase Agent reads `phase-wave1-subagent.md` to construct sub-agent task context
- **THEN** the §2 Artifacts section SHALL include the reference file format specification after the evidence-summary and question-list format specifications
- **AND** the format specification SHALL reference `shared-reference-template.md` specific field and section header names

#### Scenario: Task card action text includes reference format checklist

- **WHEN** Phase Agent creates a task card for wave1 deepening
- **THEN** the `action` field SHALL include a complete checklist of the reference file format (9 metadata field names + 5 `##` section header names)
- **AND** the checklist SHALL explicitly state use of metadata block format (`- key: value`), not YAML frontmatter (`---`)

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

Phase-rerun Stage 3 SHALL compute `target_rerun_count = profile.rerun_count + 1` and write `rerun_count: <target>` into `## 本轮重跑方向` before incrementing the profile count. After writing the direction, the profile `rerun_count` SHALL be incremented to `target`. Downstream phases SHALL compare the direction's `rerun_count` with the profile's current `rerun_count` — only equal values SHALL activate direction actions.

Stage 1 SHALL check whether a direction section already exists with `rerun_count == target_rerun_count` (i.e., `profile.rerun_count + 1`). If so, the direction was already written for this round — skip to the increment-and-gate step (crash recovery). If the section does not exist or its `rerun_count != target`, proceed to Stage 3.

A shared direction resolver function `resolveRerunDirection(content, profileRerunCount)` SHALL return one of five deterministic states:

| State | Condition | Meaning |
|---|---|---|
| `matching` | direction.rerun_count == profile | Current-round direction |
| `stale` | direction.rerun_count < profile | Previous-round residue |
| `future` | direction.rerun_count > profile | Crash window — direction written, profile not yet incremented |
| `legacy_unbound` | No `rerun_count` field | Pre-v0.29 bundle |
| `invalid` | Field present but unparseable | Corrupt |

This resolver SHALL be used by Wave phase classification and `checkRerunAddFullSynthesis`. No consumer SHALL implement its own direction state logic.

#### Scenario: Direction written with target before profile increment

- **WHEN** current profile `rerun_count` is 1
- **THEN** phase-rerun SHALL compute `target_rerun_count = 2`
- **AND** SHALL write `rerun_count: 2` into direction section
- **AND** SHALL then increment profile to 2

#### Scenario: Crash after direction write, before profile increment

- **WHEN** direction has `rerun_count: 2` and profile has `rerun_count: 1` (crash window)
- **AND** phase-rerun re-executes
- **THEN** Stage 1 SHALL compute target = 1 + 1 = 2
- **AND** SHALL find direction with `rerun_count: 2 == 2` (matches target)
- **AND** SHALL skip to increment step (profile 1 → 2) and gate

#### Scenario: New rerun request is not mistaken for crash recovery

- **WHEN** round 2 completed (profile=2, direction.rerun_count=2)
- **AND** user triggers round 3 rerun
- **THEN** Stage 1 SHALL compute target = 2 + 1 = 3
- **AND** direction has `rerun_count: 2 != 3` (does not match target)
- **AND** SHALL proceed to Stage 3 to write new direction with `rerun_count: 3`

#### Scenario: Direction resolver returns stale for old action

- **WHEN** `checkRerunAddFullSynthesis` reads a seed with direction `rerun_count: 1`
- **AND** profile `rerun_count` is 2
- **THEN** `resolveRerunDirection` SHALL return `stale`
- **AND** the evaluator SHALL NOT apply `action: add` from this direction

#### Scenario: Legacy direction without rerun_count is not blocked

- **WHEN** a seed topic has direction section without `rerun_count` field
- **THEN** `resolveRerunDirection` SHALL return `legacy_unbound`
- **AND** consumers SHALL apply existing pre-v0.29 behavior
