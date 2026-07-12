> req: CRC-008

## ADDED Requirements

### Requirement: Cache leaf validation SHALL use one Engine-owned contract projection

The Engine SHALL expose one canonical cache-leaf contract projection used by work-unit submit validation and gate/depth cache inspection. The projection SHALL define required direct leaf files, accepted source-mapping fields, and explicit degraded-capture signals.

Required direct files SHALL include `websearch.json`, `page.md`, and `meta.json`. Accepted source mapping SHALL require at least one of `url`, `source_url`, `final_url`, `fetched_url`, or `source_slug`. The metadata shape SHALL be defined with Zod, MAY preserve additional existing metadata fields, and SHALL use cross-field refinement for the mapping requirement. Placeholder-only page content SHALL remain invalid unless the same cache leaf records an explicit accepted degraded/fetch-failure condition.

Agent-facing cache guidance SHALL remain a non-authoritative projection of this Engine contract. Static regression SHALL compare the Engine-owned vocabulary with the relevant shared protocol, anti-cheating, and cache template/docs so required files or mapping fields cannot drift silently.

#### Scenario: Submit and gate use the same required files

- **WHEN** a cache leaf omits one required direct file
- **THEN** submit validation and gate/depth inspection SHALL identify the same missing file from the shared contract projection

#### Scenario: Source mapping requires one canonical field

- **WHEN** `meta.json` contains none of the accepted source-mapping fields
- **THEN** the shared Zod contract SHALL reject the cache leaf
- **AND** submit and inspect diagnostics SHALL name the missing mapping requirement

#### Scenario: Explicit degraded capture remains accepted

- **WHEN** `page.md` is placeholder-like because the fetch was blocked
- **AND** the cache leaf records an accepted explicit degraded/fetch-failure signal and source mapping
- **THEN** shared cache inspection SHALL classify the leaf as degraded rather than fabricated complete capture

#### Scenario: Documentation drift fails regression

- **WHEN** Agent-facing cache guidance omits or contradicts a required file or source-mapping field from the Engine-owned projection
- **THEN** static regression SHALL fail
- **AND** documentation SHALL remain non-authoritative at runtime
