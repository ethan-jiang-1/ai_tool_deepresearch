> req: CRC-008

## ADDED Requirements

### Requirement: Cache leaf validation SHALL use one Engine-owned contract projection

The Engine SHALL expose one canonical cache-leaf contract projection used by work-unit submit validation, gate/depth cache inspection, and file-observability cache diagnostics. The projection SHALL define required direct leaf files, accepted source-mapping fields, and explicit degraded-capture signals.

Canonical base direct files SHALL include `websearch.json`, `page.md`, and `meta.json`. When an assigned work-unit cache policy declares additional `leaf_files`, the effective required set SHALL be the stable deduplicated union of the canonical base files and the policy additions; policy input SHALL NOT remove a base file. This change SHALL NOT alter who may assign work-unit cache policy. Accepted source mapping SHALL require at least one of `url`, `source_url`, `final_url`, `fetched_url`, or `source_slug`. The metadata shape SHALL be defined with Zod, MAY preserve additional existing metadata fields, and SHALL use cross-field refinement for the mapping requirement. Placeholder-only page content SHALL remain invalid unless the same cache leaf records an explicit accepted degraded/fetch-failure condition.

Agent-facing cache guidance SHALL remain a non-authoritative projection of this Engine contract. Static regression SHALL compare the Engine-owned vocabulary with the relevant shared protocol, anti-cheating, and cache template/docs so required files or mapping fields cannot drift silently.

#### Scenario: Submit and gate use the same required files

- **WHEN** a cache leaf omits one required direct file
- **THEN** submit validation, gate/depth inspection, and file-observability diagnostics SHALL identify the same missing file from the shared contract projection

#### Scenario: Assigned policy can add but not remove base files

- **WHEN** a work-unit manifest adds `snapshot.json` through `cache_policy.leaf_files`
- **THEN** the effective contract SHALL require `snapshot.json` plus the three canonical base files
- **AND** omitting base filenames from the assigned list SHALL not make those base files optional

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
