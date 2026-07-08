# cache-raw-web-content Specification

> req: CRC-001, CRC-002, CRC-003, CRC-004, CRC-005, CRC-006, CRC-007

## Purpose

Define the standardized cache directory structure for raw web content fetched during deep research waves. The cache stores websearch results, fetched pages, and metadata in a consistent four-level hierarchy so that any reference can be traced back to its original raw source data for diagnostic and provenance verification.
## Requirements
### Requirement: Standardized cache directory structure

`_cache/` 目录 SHALL 遵循 `{wave}/{batch}/{scope}/{source_dir}/` 四级结构。每个 wave 的每次 queue drain 为独立 batch。每个 source 的原始网络内容 SHALL 写入 `{source_dir}/` 子目录，包含 `websearch.json`、`page.md`、`meta.json` 三个文件。

#### Scenario: Wave1 primary deepening caches raw web content
- **WHEN** Wave1 primary deepening Sub-agent executes WebSearch + WebFetch to find sources for a topic
- **THEN** it SHALL write each source's raw data to `_cache/wave1/primary/{topic_slug}/s{NN}_{source-slug}/`
- **AND** the directory SHALL contain `websearch.json` (raw search result), `page.md` (fetched page content), and `meta.json` (`{url, title, source_domain, source_name, fetched_at, fetch_method, fetch_chain, content_type, reliability_tier, reliability_basis, whitelist_status}`)
- **AND** the directory SHALL be created by the Phase Agent (`mkdir -p`) before spawning the Sub-agent
- **AND** the path SHALL be communicated to the Sub-agent via the spawn prompt and task card action text

#### Scenario: Wave0 supplementary re-fill caches raw web content
- **WHEN** Wave0 count-floor re-fill loop spawns a supplementary Sub-agent (gate attempt N)
- **THEN** it SHALL write raw data to `_cache/wave0/suppl-r{N}/{topic_slug}/s{NN}_{source-slug}/`
- **AND** `N` SHALL match the gate attempt number encoded in the task card's `work_id` (e.g. `wave0-suppl-{topic}-r2` → `suppl-r2`)

#### Scenario: Wave2 synthesis caches raw web content
- **WHEN** Wave2 synthesis `dpt-topic-scout` Sub-agent executes cross-topic scan
- **THEN** it SHALL write raw data to `_cache/wave2/synthesis/{finding_id}/s{NN}_{source-slug}/`
- **AND** `{finding_id}` SHALL come from the finding identifier in `finding-index.yaml`

### Requirement: Cache path delivery via spawn prompt

Cache path delivery for delegated work SHALL be delivered through the work-unit task/spawn prompt and manifest. Cache instructions SHALL bind cache output expectations to `work_id`, `queue_item_id`, `kind`, and the result schema.

#### Scenario: cache path binds to work unit

- **WHEN** a Wave0 source intake work unit is claimed
- **THEN** the prompt SHALL identify the cache policy and expected cache trail shape for that work unit

### Requirement: source-slug consistency between cache and reference

`_cache/` 下的 `{source-slug}` SHALL 与 `reference/` 下对应文件名中的 `<qualifier>` 一致，确保诊断时可从 reference 反查到原始缓存数据。

#### Scenario: Diagnosing a reference by its raw cache data
- **WHEN** any Agent needs to inspect the raw basis of `reference/01_topic-xinhua-box-office.md`
- **THEN** it SHALL be able to locate `_cache/wave1/primary/01_topic/sNN_xinhua-box-office/`
- **AND** `websearch.json` SHALL contain the original search query that led to this source
- **AND** `page.md` SHALL contain the original page content as fetched
- **AND** `meta.json` SHALL contain `{url, title, source_domain, source_name, fetched_at, fetch_method, fetch_chain, content_type, reliability_tier, reliability_basis, whitelist_status}` proving the source's provenance and authenticity

### Requirement: Cache is non-authority and deletable

Cache files SHALL remain non-authority. Gate pass for delegated work SHALL depend on submitted work-unit ledger rows and required cache trail cross-checks, not raw cache presence alone.

#### Scenario: cache alone cannot pass

- **WHEN** cache files exist but no submitted work-unit ledger row declares them
- **THEN** gate cache coverage SHALL fail for delegated work

### Requirement: cache_trails SHALL be Engine-populated

`cache_trails` for delegated work SHALL be verified and written by `operate-work-unit submit`. The Agent-provided result MAY point to candidate cache files, but the Engine SHALL validate filesystem existence, expected shape, and kind policy before ledger append.

#### Scenario: submit writes verified cache trails

- **WHEN** a result declares valid cache trail files
- **THEN** submit SHALL write verified cache trails to the ledger row

### Requirement: Gate SHALL cross-validate cache trails（两阶段策略）

Gate cache coverage SHALL cross-validate submitted work-unit ledger `cache_trails` against filesystem state and output references. Cache trail checks SHALL fail when ledger/index/result/receipt binding is stale or absent.

#### Scenario: stale cache trail binding fails

- **WHEN** a ledger row declares a cache trail but the referenced result hash no longer matches the submitted result
- **THEN** cache coverage SHALL fail

### Requirement: Declared cache trails SHALL preserve fetched content or explicit degraded-capture records

Declared cache trails for accepted sources and references SHALL preserve the actual retrieval trail, not only the directory shape. A cache leaf SHALL contain `websearch.json`, `page.md`, and `meta.json`, and `page.md` SHALL be either a non-empty fetched page/content capture or an explicit degraded-capture/fetch-failure record that names the failure reason and fetch chain attempted.

Zero-byte `page.md`, placeholder-only content such as `# Cache page for ...`, or topic summaries that do not capture the fetched page SHALL NOT satisfy cache content coverage for an accepted source. Such files MAY remain as forensic evidence, but submit/gate diagnostics SHALL treat them as incomplete cache content unless the result explicitly records a degraded capture or access failure.

`meta.json` SHALL map the cache leaf back to the source/reference URL using a URL field, source slug, or equivalent mapping already accepted by cache coverage diagnostics. Cache content checks SHALL preserve ledger-only authority: undeclared filesystem cache leaves still do not count for delegated coverage.

For Wave1 topic deepening, every accepted source URL declared in submitted structured `source_claims[]` / `accepted_source_urls[]`, or repeated by topic reference metadata or `depth-review.yaml`, SHALL map to a submitted verified cache trail or explicit degraded-capture record. Topic reference metadata or depth-review entries absent from submitted structured claims MAY be diagnosed as drift/repair input, but SHALL NOT expand delegated coverage authority until repaired through a submitted result. Prose links in `evidence-summary.md` MAY be diagnosed when they are absent from structured source claims, but SHALL NOT be the primary coverage authority. A topic with more structured accepted source claims than mapped cache/degraded-capture records SHALL fail submit, preflight, or gate diagnostics before delegated coverage can pass.

The primary enforcement point for delegated cache content SHALL be `operate-work-unit submit` before a ledger row is appended. Wave gates and preflight/audit commands SHALL re-check submitted ledger cache bindings and fail or diagnose drift/incomplete cache content before delegated coverage can pass.

#### Scenario: Placeholder cache page fails content coverage

- **WHEN** a submitted work-unit result declares a cache trail for an accepted reference
- **AND** the leaf `page.md` contains only a placeholder header or is empty
- **THEN** `operate-work-unit submit` SHALL reject that source/cache binding unless the result explicitly records a degraded-capture or fetch-failure reason
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

#### Scenario: Wave1 accepted source claim requires matching cache trail

- **WHEN** Wave1 structured source claims list seven accepted source URLs for a topic
- **AND** submitted ledger rows expose verified cache trails for only two of those URLs
- **THEN** Wave1 cache coverage SHALL fail for the five unmapped source URLs
- **AND** diagnostics SHALL name the topic, missing source URLs, and affected work-unit identities when available

