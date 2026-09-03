# cache-raw-web-content (delta)

> req: CRC-009

## ADDED Requirements

### Requirement: Declared cache leaves SHALL fail submit-time validation on placeholder or filler content

A declared cache leaf SHALL be rejected by `operate-work-unit submit` when its `page.md` contains placeholder-only or filler-only content that does not capture the fetched page, or when its `meta.json` maps the leaf to a placeholder domain URL rather than a real fetched source. This enforcement SHALL run before the ledger row is appended (fail-fast), not only at wave gate time.

Placeholder/filler `page.md` content SHALL include: empty or whitespace-only pages; pages consisting solely of a heading with no body; pages whose body is a generic filler sentence such as "Deep research content."; and pages whose entire content is a heading plus a generic filler line. A `meta.json` mapping SHALL be treated as placeholder when every mapped URL field (`url`/`source_url`/`final_url`/`fetched_url`) uses a placeholder domain such as `example.com` or `example.org` and no real `source_slug` evidence exists. A mapping with at least one URL on a real (non-placeholder) domain SHALL NOT be treated as placeholder.

A leaf SHALL still be accepted when it records an explicit degraded-capture or fetch-failure reason, per the existing degraded-capture contract: `page.md` carries the explicit degraded/fetch-failure record (matching the existing cache-leaf page rule that `page.md` must contain fetched page content or an explicit degraded/fetch-failure record), with `meta.json` degraded signal fields as supporting evidence. An empty or whitespace-only `page.md` remains rejected regardless of meta signals, as today.

#### Scenario: Filler-page cache leaf is rejected at submit

- **WHEN** a submitted work-unit result declares a cache trail whose `page.md` is `# 04_moore-threads-mtt-s5000` followed by `Deep research content.` and whose `meta.json` has `url: https://example.com/04_moore-threads-mtt-s5000`
- **THEN** `operate-work-unit submit` SHALL reject the source/cache binding with a diagnostic naming the cache leaf path
- **AND** the ledger row SHALL NOT be appended for that source binding
- **AND** the result SHALL be repairable only by providing a real fetched page + real source URL, or an explicit degraded-capture record

#### Scenario: Placeholder-domain meta URL is rejected

- **WHEN** a cache leaf's `meta.json` maps every URL field (`url`/`source_url`/`final_url`/`fetched_url`) to `https://example.com/...` (or other IANA-reserved example domains) with no real `source_slug` evidence
- **THEN** submit-time cache-leaf validation SHALL treat the leaf as placeholder
- **AND** it SHALL reject the binding unless the result records an explicit degraded capture or access failure

#### Scenario: Real fetched content still passes

- **WHEN** a cache leaf's `page.md` contains non-empty fetched page text and `meta.json` maps to a real source URL/domain
- **THEN** the leaf SHALL remain eligible for cache content coverage after normal ledger and binding checks pass

#### Scenario: Explicit degraded capture still passes

- **WHEN** a leaf's `page.md` carries an explicit degraded-capture/fetch-failure record (per the existing cache-leaf page rule) and/or its `meta.json` carries degraded signal fields, and the page is otherwise placeholder-like
- **THEN** the leaf SHALL be accepted as a degraded capture and SHALL NOT be required to contain fetched page content beyond the degraded record
- **AND** an empty or whitespace-only `page.md` SHALL remain rejected even when `meta.json` carries degraded signals
