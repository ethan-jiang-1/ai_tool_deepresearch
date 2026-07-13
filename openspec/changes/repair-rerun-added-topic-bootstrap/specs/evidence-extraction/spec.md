> req: EEX-001, EEX-002, EEX-003

## MODIFIED Requirements

### Requirement: isCountable reference判定

Engine SHALL 实现 `isCountable(ref)` 函数，返回 `{ countable: boolean, reason?: string }`。`isCountable()` SHALL answer only whether an already authority-selected reference is eligible for a numeric reference count. It SHALL require:

1. `acceptance_status` resolves to the accepted state used by the current reference contract; and
2. `source_url` exists and contains at least one URL-parseable value.

`isCountable()` SHALL NOT score prose quality or duplicate checks owned by the reference-format judgment layer. In particular, it SHALL NOT require a minimum character count in `## Core Content Capture`, a minimum bullet count in `## Key Facts`, exact section order/case/spacing, homepage/path depth, duplicate-looking URL identity, Jaccard similarity, or self-referential prose. Required semantic section availability remains owned by the shared reference-format evaluator; optional fact-count or prose-richness feedback MAY remain advisory.

When the file cannot be read or its metadata cannot be parsed sufficiently to evaluate accepted status and source URL, `isCountable()` SHALL return `{ countable: false, reason: "unparseable" }` or a narrower accepted-status/source-URL reason and SHALL NOT throw.

#### Scenario: Accepted reference with parseable source is countable

- **WHEN** an authority-selected reference declares accepted status and at least one parseable `source_url`
- **THEN** `isCountable(ref)` SHALL return `{ countable: true }`
- **AND** it SHALL NOT inspect prose length or Key Facts item count

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
