# Evidence Extraction

> req: EEX-001, EEX-002, EEX-003, EEX-004

## Purpose

Define the Engine-side evidence extraction capabilities for assessing reference quality, counting references, and validating cache trails through the output declaration ledger.
## Requirements
### Requirement: isCountable reference判定

Engine SHALL 实现 `isCountable(ref)` 函数，返回 `{ countable: boolean, reason?: string }`。`isCountable()` SHALL answer only whether an already authority-selected reference is eligible for a numeric reference count. It SHALL require:

1. `acceptance_status` resolves to the accepted state used by the current reference contract, where the accepted family comprises the exact `accepted` value and the template-documented inline-warning form `accepted :warning:` (committed as the quoted YAML value `"accepted :warning:"`); and
2. `source_url` exists and contains at least one URL-parseable value.

`isCountable()` SHALL NOT score prose quality or duplicate checks owned by the reference-format judgment layer. In particular, it SHALL NOT require a minimum character count in `## Core Content Capture`, a minimum bullet count in `## Key Facts`, exact section order/case/spacing, homepage/path depth, duplicate-looking URL identity, Jaccard similarity, or self-referential prose. Required semantic section availability remains owned by the shared reference-format evaluator; optional fact-count or prose-richness feedback MAY remain advisory.

When the file cannot be read or its metadata cannot be parsed sufficiently to evaluate accepted status and source URL, `isCountable()` SHALL return `{ countable: false, reason: "unparseable" }` or a narrower accepted-status/source-URL reason and SHALL NOT throw.

#### Scenario: Accepted reference with parseable source is countable

- **WHEN** an authority-selected reference declares accepted status and at least one parseable `source_url`
- **THEN** `isCountable(ref)` SHALL return `{ countable: true }`
- **AND** it SHALL NOT inspect prose length or Key Facts item count

#### Scenario: Inline-warning accepted reference is countable

- **WHEN** an authority-selected reference commits `acceptance_status: "accepted :warning:"` (the quoted template-documented form) and at least one parseable `source_url`
- **THEN** `isCountable(ref)` SHALL return `{ countable: true }`
- **AND** the inline warning marker SHALL NOT narrow the numeric count eligibility

#### Scenario: Excluded and unknown statuses are not countable

- **WHEN** a reference declares `acceptance_status` `EXCLUDED` or any value outside the accepted family
- **THEN** `isCountable(ref)` SHALL return `{ countable: false }` with a reason naming the observed status
- **AND** the unquoted bare `accepted :warning:` form SHALL remain a frontmatter parse failure owned by the reference metadata reader, not a countability verdict

#### Scenario: Missing semantic section is not a count-floor symptom

- **WHEN** a reference has accepted status and a parseable source URL but lacks `Core Content Capture`
- **THEN** `isCountable(ref)` SHALL remain countable
- **AND** the shared reference-format check MAY report the one missing semantic section as its own root cause
- **AND** count-floor diagnostics SHALL NOT also describe the file as too thin

#### Scenario: Homepage-looking URL is not a countability blocker

- **WHEN** reference metadata contains a URL-parseable source that looks shallow, root-like, or homepage-like
- **THEN** `isCountable(ref)` SHALL NOT return a homepage/path-depth heuristic failure

#### Scenario: Missing or invalid source URL is not countable

- **WHEN** a reference lacks `source_url` or contains no URL-parseable value
- **THEN** `isCountable(ref)` SHALL return `{ countable: false }`
- **AND** the reason SHALL identify missing or invalid `source_url`

#### Scenario: Unparseable reference file returns not countable

- **WHEN** the reference file cannot be read or its metadata cannot be evaluated
- **THEN** `isCountable(ref)` SHALL return a non-countable result without throwing

#### Scenario: Accepted reference with substantive content is countable

> **@deprecated behavior** — The historical title is retained as an archive
> anchor. Substantive-content thresholds are not part of numeric eligibility;
> the accepted status and parseable source URL alone decide countability.

- **WHEN** reference 文件 metadata block 含 `acceptance_status: accepted`
- **AND** `source_url` is present and URL-parseable
- **AND** `## Core Content Capture` section >= 100 字符
- **AND** `## Key Facts` 含 >= 5 条 bullet
- **THEN** `isCountable(ref)` SHALL return `{ countable: true }`

#### Scenario: Reference with thin Core Content Capture is not countable

> **@deprecated behavior** — Retained as an archive anchor only. The
> `core_content_capture_too_thin` heuristic has no implementation and is
> excluded by this requirement's prose; thin content affects only the separate
> reference-format judgment layer.

- **WHEN** reference 文件 `## Core Content Capture` section 内容 < 100 字符
- **THEN** `isCountable(ref)` SHALL remain countable when accepted status and a
  parseable `source_url` are present, and the missing-substance signal SHALL
  remain owned by the shared reference-format evaluator

### Requirement: countReferences Engine计算

Engine SHALL implement `countReferences(baseDir, options?)` for gate reference floors and fork-router `ref_count`. Default authority mode SHALL collect submitted role=`reference` outputs and accepted Phase-owned reference projections through the existing backing classifier, scope them to the requested target/topic, and apply the narrow `isCountable()` accepted-status/source-URL predicate. It SHALL return `{ count, uncountable }` for audit transparency.

`count` SHALL be Engine-computed and SHALL NOT depend on Agent-provided numeric claims. `countReferences()` SHALL NOT grant authority to filesystem-only references, and diagnostic filesystem scans SHALL NOT satisfy gate or routing floors.

Reference format, semantic-section availability, index navigation, Key Facts presentation, submitted backing and cache/provenance checks SHALL remain separate direct checks. `countReferences()` SHALL NOT repeat those validators or turn one missing Markdown section into both a count-floor failure and a format failure. When candidate authority itself is missing or invalid, count diagnostics SHALL report that direct parent rather than a wall of per-file quality heuristics.

#### Scenario: Engine counts authority-backed accepted references

- **WHEN** five target-scoped references have accepted submitted/Phase-owned backing and parseable source URLs
- **THEN** `countReferences()` SHALL return count `5`
- **AND** prose length, section order and fact bullet count SHALL not change the numeric count

#### Scenario: Format failure remains separately actionable

- **WHEN** an authority-backed accepted reference is count-eligible but misses one required semantic section
- **THEN** the count floor SHALL evaluate the reference numerically
- **AND** reference-format SHALL return the missing section as the one nearest repair surface

#### Scenario: Countable orphan remains non-authoritative

- **WHEN** a filesystem-only reference has accepted status and a parseable URL but no submitted or accepted Phase-owned backing
- **THEN** default `countReferences()` SHALL NOT include it
- **AND** observability/provenance SHALL retain the authority blocker

#### Scenario: Per-topic scope remains exact

- **WHEN** topic B has many count-eligible references but topic A has none
- **THEN** topic A's scoped count SHALL remain zero
- **AND** no global count SHALL satisfy its floor

#### Scenario: Engine counts only countable references
- **WHEN** `rb_output_declarations.jsonl` declares 10 role=`reference` files
- **AND** 其中 7 个 declared reference files 满足 `isCountable()` 条件，3 个不满足
- **THEN** `countReferences(baseDir)` SHALL return `{ count: 7, uncountable: [...] }`
- **AND** `uncountable` 数组 SHALL 包含 3 个条目，每个含 `path` 和 `reason`

#### Scenario: Empty reference directory returns zero
- **WHEN** `rb_output_declarations.jsonl` has no declared role=`reference` files, or declared reference files are missing/unreadable
- **THEN** `countReferences(baseDir)` SHALL return `{ count: 0, uncountable: [] }`

#### Scenario: Countable orphan reference remains non-authoritative
- **WHEN** `reference/orphan.md` exists and satisfies `isCountable()`
- **AND** no `rb_output_declarations.jsonl` record declares that file
- **THEN** `countReferences(baseDir)` with default `source: "ledger"` SHALL NOT include it in the quality count
- **AND** file observability / ledger coverage SHALL still be able to flag the orphan authority gap

#### Scenario: Per-topic scoped count does not use global reference count
- **WHEN** gate rule target is `reference/*topic-a*.md`
- **AND** ledger declares 6 countable references for topic-b and 0 for topic-a
- **THEN** `countReferences(baseDir, { targetGlob: "reference/*topic-a*.md", topic: "topic-a" })` SHALL return `{ count: 0, ... }`
- **AND** the topic-a `count_floor` rule SHALL fail even though the bundle has countable references for other topics

### Requirement: ref_count 改为 Engine 计算

Work-unit result processing and fork routing SHALL derive `ref_count` from Engine-selected submitted/backed reference authority and the narrow count-eligibility predicate. Agent-provided `evidenceCount` SHALL remain ignored.

Gate `count_floor` SHALL use `countReferences()` for numeric cardinality only. Required format, section availability, source/backing, index and provenance contracts SHALL remain owned by their existing shared evaluators. Engine-computed `ref_count` SHALL NOT depend on prose length, Key Facts bullet count, duplicate URL, homepage/path depth, Jaccard, self-reference, or retired content heuristics.

#### Scenario: Work-unit processing uses Engine count

- **WHEN** submitted/backed target references include three accepted parseable source projections
- **THEN** Engine-derived `ref_count` SHALL be `3`

#### Scenario: Agent numeric count is ignored

- **WHEN** an Agent reports `evidenceCount: 99` but Engine authority contains three eligible references
- **THEN** `ref_count` SHALL remain `3`

#### Scenario: Content presentation does not alter routing count

- **WHEN** two eligible references differ only in prose length, list style, heading case or section order
- **THEN** those presentation differences SHALL NOT change Engine-derived `ref_count`
- **AND** independently missing required semantic sections MAY still be reported by the shared format evaluator

#### Scenario: work-unit submit path uses Engine-computed ref_count

- **WHEN** Wave0 source intake submits a work-unit result and ledger row declaring 8 reference files but only 6 are `isCountable()`
- **THEN** the Engine-computed `ref_count` SHALL be `6`

#### Scenario: Agent evidenceCount is ignored even when larger

- **WHEN** a sub-agent result declares `evidenceCount: 99`
- **AND** submitted declarations contain only 3 countable references
- **THEN** Engine-derived `ref_count` SHALL be `3`
- **AND** the Agent numeric claim SHALL NOT affect branch routing

#### Scenario: Retired heuristics do not change ref_count

- **WHEN** two accepted declared references share a URL-looking value, have shallow-looking URLs, or have similar Key Facts wording
- **THEN** those heuristic signals SHALL NOT reduce Engine-derived `ref_count`
- **AND** they SHALL NOT appear as gate advice from `countReferences()`

### Requirement: cache_trails 文件系统验证

Engine SHALL validate every path in a submitted work-unit result `cache_trails` array:

1. Path is inside the bundle and does not escape.
2. Path is under `_cache/`.
3. Path is a leaf source directory rather than a parent collection directory.
4. Directory exists.
5. Directory contains `websearch.json`, `page.md`, and `meta.json`.

Validated paths SHALL be written to `OutputDeclarationLedgerRecord.cache_trails` as `z.array(z.string())` path strings. Unsafe or non-leaf paths SHALL fail submit closed. Missing or incomplete leaf contents SHALL NOT be written to the ledger, and Engine SHALL emit warning diagnostics to trace/log during the staged enforcement period.

Gate `cache_coverage` rules SHALL dynamically check at gate time whether ledger cache trail paths still exist and remain complete. For each role=`reference` output file, `cache_coverage` SHALL also verify that at least one declared cache leaf plausibly maps to that reference by matching `meta.json.url` to the reference `source_url` and/or matching the cache leaf slug to `output_files[].source_slug` or reference filename qualifier. A declaration-level non-empty `cache_trails` array alone SHALL NOT prove per-reference provenance.

#### Scenario: valid cache trail written to ledger

- **WHEN** a work-unit result `cache_trails` entry names `_cache/wave1/primary/topic-a/s01_source/`
- **AND** the leaf directory passes cache trail validation
- **THEN** submit SHALL write that path string to `OutputDeclarationLedgerRecord.cache_trails`

#### Scenario: unsafe cache trail rejects submit

- **WHEN** a work-unit result declares a cache trail outside the bundle
- **THEN** submit SHALL fail closed
- **AND** no ledger row SHALL be appended

