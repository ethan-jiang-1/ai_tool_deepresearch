## MODIFIED Requirements

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
