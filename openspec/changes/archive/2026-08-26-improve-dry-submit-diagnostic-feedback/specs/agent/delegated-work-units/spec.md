## ADDED Requirements

### Requirement: Dry-submit cache-URL mismatch diagnostics SHALL carry the recorded leaf urls

When dry-submit rejects an accepted source claim because its cache trail leaf records different urls than the claim url (`accepted source claim cache trail maps to a different URL`), or rejects an `accepted_source_urls[]` entry with no matching claim, the diagnostic SHALL carry, in addition to the claim-side url and the cache trail path, the actual normalized urls recorded in the leaf `meta.json` (the `url`/`source_url`/`final_url`/`fetched_url` values through the existing cache-leaf normalization) so the Agent can repair in one step without reading `meta.json`. The verdict and rejection semantics SHALL NOT change.

#### Scenario: Cache trail leaf records a url that differs from the claim url

- **WHEN** dry-submit compares an accepted source claim url (e.g. `https://finance.sina.com.cn/a`) against its declared cache trail leaf whose `meta.json` records `url: https://finance.sina.com.cn/a?cref=cj`
- **THEN** dry-submit SHALL reject with the existing mismatch reason
- **AND** the diagnostic SHALL include the claim-side url, the cache trail path, and the recorded leaf urls (including the `?cref=cj` variant) so the Agent can repair without reading `meta.json`

#### Scenario: accepted_source_urls entry has no matching claim

- **WHEN** an `accepted_source_urls[]` entry has no matching accepted `source_claims[]` entry
- **THEN** dry-submit SHALL reject with the existing reason
- **AND** the diagnostic SHALL include the mismatching url and the accepted claim urls already declared, so the Agent can identify the exact repair coordinate

### Requirement: Dry-submit runtime-receipt schema diagnostics SHALL carry the raw value, all affected lines, and the expected format

When dry-submit rejects a runtime receipt because a receipt event fails its schema (e.g. an invalid ISO datetime in `ts`), the diagnostic SHALL include (a) the failing field's raw string value (e.g. `Invalid datetime: "2026-08-26T01:25:25.3NZ"`), (b) every affected line number rather than only the first failing line, and (c) the legal format expectation (e.g. ISO 8601 UTC like `2026-08-26T01:25:25.300Z`), so the Agent can repair all offending lines in one step. The schema verdict and rejection semantics SHALL NOT change.

#### Scenario: Receipt contains an invalid datetime across multiple lines

- **WHEN** every line of a runtime receipt carries `ts: "2026-08-26T01:25:25.3NZ"` (non-standard millisecond suffix) and dry-submit validates the receipt
- **THEN** dry-submit SHALL reject with the receipt schema failure
- **AND** the diagnostic SHALL include the raw invalid value (`2026-08-26T01:25:25.3NZ`), every affected line number (not only line 1), and the legal ISO 8601 UTC format expectation

#### Scenario: Receipt line with a missing required field

- **WHEN** a receipt event is missing a required field (e.g. `kind`) and dry-submit validates the receipt
- **THEN** dry-submit SHALL reject with the receipt schema failure
- **AND** the diagnostic SHALL name the missing field path and the affected line number
