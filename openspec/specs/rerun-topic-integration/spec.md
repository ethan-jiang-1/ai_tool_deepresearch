# Rerun Topic Integration

> req: RTI-001, RTI-002, RTI-003, RTI-004, RTI-005

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

The wave1-complete gate SHALL include the following content quality rules providing semantic quality verification on top of structural checks:

1. **`source_url_article_level`**: reference file `source_url` SHALL point to article-level URL (path depth >= 2), SHALL NOT be homepage or shallow section URL (path is `/`, empty, `/index.*` only, or single segment like `/news/`). Detection scope: all `reference/*{topic}*.md` files on filesystem, independent of declaration ledger.

2. **`key_facts_min_lines`**: reference file `## Key Facts` section SHALL contain at least 5 lines starting with `- ` with substantive entries. Detection scope: all `reference/*{topic}*.md` files on filesystem.

3. **`reference_format`**: reference files SHALL use metadata block (`- key: value`) and include 9 required metadata fields and 5 standard sections; YAML frontmatter SHALL fail.

4. **`ledger_coverage`**: every `reference/*{topic}*.md` file on filesystem SHALL have a `role === 'reference'` declaration in `rb_output_declarations.jsonl`. If a filesystem reference file is not declared in the ledger, the gate SHALL fail. Filesystem is used only for orphan detection, not as provenance authority.

#### Scenario: Homepage URL rejected by article-level check

- **WHEN** a reference file contains `source_url: https://m-en.yna.co.kr/`
- **THEN** the `source_url_article_level` rule SHALL fail
- **AND** inspect SHALL list the file path and homepage URL

#### Scenario: Article URL passes article-level check

- **WHEN** a reference file contains `source_url: https://m-en.yna.co.kr/view/AEN20260113007053315`
- **THEN** the `source_url_article_level` rule SHALL pass

#### Scenario: Thin Key Facts section fails min-lines check

- **WHEN** a reference file `## Key Facts` section contains only 3 lines with `- ` entries
- **THEN** the `key_facts_min_lines` rule SHALL fail
- **AND** inspect SHALL list the file path and actual line count

#### Scenario: Filesystem-ledger mismatch detected

- **WHEN** filesystem has 8 `reference/05_south-korea-factor-*.md` files
- **AND** `rb_output_declarations.jsonl` has only 3 `role === 'reference'` declarations pointing to that topic
- **THEN** the `ledger_coverage` rule SHALL fail
- **AND** inspect SHALL list undeclared file paths

### Requirement: Gate shall not vacuously pass empty reference declarations

`checkContentDedup()` SHALL NOT vacuously pass when the declaration ledger contains no `role === "reference"` entries.

This check SHALL maintain ledger authority:
- Use only `rb_output_declarations.jsonl` `role === "reference"` entries as dedup input
- If ledger is missing or empty, fail closed
- If ledger exists but has no reference declaration, fail closed
- SHALL NOT scan filesystem and treat orphan reference files as valid dedup input
- Filesystem orphan references SHALL be failed by the `ledger_coverage` rule

#### Scenario: Empty reference declarations fail closed

- **WHEN** `rb_output_declarations.jsonl` exists but contains no `role === 'reference'` declaration
- **THEN** `content_dedup` SHALL fail
- **AND** inspect SHALL explain that no completed reference declarations are available

#### Scenario: Orphan reference is caught by ledger coverage

- **WHEN** filesystem contains a matching `reference/*{topic}*.md` file
- **AND** no declaration ledger entry declares that path
- **THEN** `ledger_coverage` SHALL fail
- **AND** `content_dedup` SHALL still not use the orphan file as a dedup input

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
