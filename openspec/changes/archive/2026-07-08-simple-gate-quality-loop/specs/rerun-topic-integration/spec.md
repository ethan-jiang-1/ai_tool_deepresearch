## MODIFIED Requirements

> req: RTI-003

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

## REMOVED Requirements

> req: RTI-004

### Requirement: Gate shall not vacuously pass empty reference declarations

**Reason**: This requirement is tied to retired `content_dedup`. Empty reference declarations remain invalid when a phase requires references, but that authority belongs to current ledger coverage, work-unit provenance, count_floor, cache, schema, and artifact checks.

**Migration**: Remove `checkContentDedup()` from rerun topic gate expectations. Use ledger coverage, work-unit provenance, cache coverage/content, and reference schema/count checks to fail missing reference authority.

#### Scenario: Empty reference declarations fail through current authority

- **WHEN** `rb_output_declarations.jsonl` exists but contains no required `role === 'reference'` declaration for the target topic
- **THEN** current ledger/count/provenance checks SHALL fail as applicable
- **AND** `content_dedup` SHALL NOT run or emit advice

#### Scenario: Orphan reference is caught by ledger coverage

- **WHEN** filesystem contains a matching `reference/*{topic}*.md` file
- **AND** no declaration ledger entry declares that path
- **THEN** `ledger_coverage` SHALL fail
- **AND** no retired dedup check SHALL use the orphan file as input
