## ADDED Requirements

> req: CRC-007

### Requirement: Declared cache trails SHALL preserve fetched content or explicit degraded-capture records

Declared cache trails for accepted sources and references SHALL preserve the actual retrieval trail, not only the directory shape. A cache leaf SHALL contain `websearch.json`, `page.md`, and `meta.json`, and `page.md` SHALL be either a non-empty fetched page/content capture or an explicit degraded-capture/fetch-failure record that names the failure reason and fetch chain attempted.

Zero-byte `page.md`, placeholder-only content such as `# Cache page for ...`, or topic summaries that do not capture the fetched page SHALL NOT satisfy cache content coverage for an accepted source. Such files MAY remain as forensic evidence, but submit/gate diagnostics SHALL treat them as incomplete cache content unless the result explicitly records a degraded capture or access failure.

`meta.json` SHALL map the cache leaf back to the source/reference URL using a URL field, source slug, or equivalent mapping already accepted by cache coverage diagnostics. Cache content checks SHALL preserve ledger-only authority: undeclared filesystem cache leaves still do not count for delegated coverage.

The primary enforcement point for delegated cache content SHALL be `operate-work-unit submit` before a ledger row is appended. Wave gates and preflight/audit commands SHALL re-check submitted ledger cache bindings and fail or diagnose drift/incomplete cache content before delegated coverage can pass.

#### Scenario: Placeholder cache page fails content coverage

- **WHEN** a submitted work-unit result declares a cache trail for an accepted reference
- **AND** the leaf `page.md` contains only a placeholder header or is empty
- **THEN** `operate-work-unit submit` SHALL reject or record incomplete cache content before ledger append
- **AND** later gate or preflight diagnostics SHALL report incomplete cache content if an already-submitted binding drifts or was accepted by an older path
- **AND** the diagnostic SHALL name the cache leaf and source/reference path when available

#### Scenario: Fetched content capture satisfies cache content coverage

- **WHEN** `page.md` contains non-empty fetched page text, cleaned page content, or captured excerpts tied to the source URL
- **AND** `meta.json` maps the leaf to the same source URL or source slug
- **THEN** the cache leaf SHALL be eligible to satisfy cache content coverage after normal ledger and binding checks pass

#### Scenario: Degraded capture is explicit

- **WHEN** a source cannot be fetched after the required fetch chain is attempted
- **THEN** `page.md` or `meta.json` SHALL record an explicit degraded-capture or fetch-failure reason
- **AND** the work-unit result/reference SHALL not present that source as fully fetched content

#### Scenario: Filesystem-only cache leaf remains non-authoritative

- **WHEN** a cache leaf has valid-looking content but no submitted work-unit ledger declaration
- **THEN** the cache leaf SHALL NOT count as delegated coverage
- **AND** diagnostics MAY report it only as cleanup or repair input
