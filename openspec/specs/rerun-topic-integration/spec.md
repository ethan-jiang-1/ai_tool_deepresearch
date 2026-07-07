# Rerun Topic Integration

> req: RTI-001, RTI-002, RTI-003, RTI-005, RTI-006

## Purpose

TBD — see delta spec in change harden-rerun-topic-integration.

## Requirements

### Requirement: Sub-agent reference file format specification

`phase-wave1-subagent.md` SHALL contain a reference file format specification aligned with `shared-reference-template.md` metadata block format.

The format specification SHALL include:
- File naming: `reference/{topic.slug}-<source-slug>.md`
- Metadata block: 9 required fields (`source_url`, `acceptance_status`, `source_type`, `tier`, `evidence_role`, `trust_level`, `why_it_matters`, `accessed_at`, `related_topic`), using `- key: value` format, placed before the first `## ` header
- 5 standard section headers: `## Key Facts`, `## Core Content Capture`, `## Relevance To This Research`, `## Quotable Terms / Concepts`, `## Risks And Limitations`, in fixed order

The specification SHALL be consistent with `shared-reference-template.md`. When constructing task cards, the Phase Agent SHALL inline this format specification into the `action` field (already present in `phase-wave1.md` L58 and L285-289).

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

The wave1-complete gate SHALL include deterministic reference-file checks on top of structural checks. These checks SHALL avoid guess-based content and URL heuristics that can feed noisy repair instructions back to the Markdown Controller.

The current gate-owned checks are:

1. **`source_url_present` / parseable source metadata**: reference files SHALL include a non-empty, URL-parseable `source_url` metadata value. The gate SHALL NOT classify homepage-looking, shallow-path, duplicate-looking, or one-segment URLs as uncountable or invalid based on path-depth heuristics.

2. **`key_facts_min_lines`**: reference file `## Key Facts` section SHALL contain at least 5 lines starting with `- ` with substantive entries. Detection scope: ledger-declared reference files for the current target.

3. **`reference_format`**: reference files SHALL use metadata block (`- key: value`) and include 9 required metadata fields and 5 standard sections; YAML frontmatter SHALL fail.

4. **`ledger_coverage`**: every `reference/*{topic}*.md` file on filesystem SHALL have a `role === 'reference'` declaration in `rb_output_declarations.jsonl`. If a filesystem reference file is not declared in the ledger, the gate SHALL fail. Filesystem is used only for orphan detection, not as provenance authority.

The gate SHALL NOT include `source_url_article_level`, `content_dedup`, duplicate URL, homepage/shallow URL, Jaccard similarity, or self-reference heuristics as blocking checks or diagnostic advice.

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
