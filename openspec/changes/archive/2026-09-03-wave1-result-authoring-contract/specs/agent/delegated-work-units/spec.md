# delegated-work-units (delta)

> req: DEW-030, DEW-031

## ADDED Requirements

### Requirement: Generated source-claim authoring guidance SHALL state exact cache/degraded-ref and source_ref value domains with an accepted-and-degraded example

When a work-unit assignment's output contract declares `source_claims.allowed === true`, the Engine-generated
`task.md` Completion Contract authoring guidance SHALL state, for the actor, the exact legal value domains
of the result's source-claim fields:

- `cache_trail_refs[]` entries and `degraded_capture_ref` SHALL be described as requiring cache **leaf
  directory** paths drawn from the result's declared `cache_trails[]` set (the leaf directories that carry
  `websearch.json`/`page.md`/`meta.json`). Guidance SHALL explicitly forbid file paths inside a leaf such as
  `<leaf>/page.md`.
- `source_ref` SHALL be described as requiring either a current assigned output path from the assignment's
  `output_files` (an exact bundle-relative path declared in the result) or an authorized prior submitted
  output path exposed by claim-time source lineage. Guidance SHALL explicitly forbid leaf slugs or other
  free-form identifiers.
- claim `url` SHALL be described as requiring the URL recorded by the referenced cache leaf `meta.json`
  mapping (leaf is authoritative for the fetch), so claim url and leaf mapping stay consistent.

The guidance SHALL include one compact positive example containing exactly two accepted source claims — one
backed by a cache leaf directory through `cache_trail_refs`, one backed by an explicit degraded capture
through `degraded_capture_ref` — with `source_ref` values drawn from assigned output paths, so the actor sees
both legal outlet shapes before authoring. Cache/degraded refs in the example SHALL be leaf-directory-shaped
paths consistent with the assignment's cache policy root, and the guidance SHALL state that each such ref
must be declared in the result's `cache_trails[]` at submit (the actor authors those declarations; claim-time
envelope guidance cannot know them in advance). The example SHALL be derived from the assignment's own
declared cache policy and output paths, not from unrelated static prose.

#### Scenario: generated task names leaf-directory refs for a source-claims assignment

- **WHEN** a `wave1_topic_deepening` assignment whose output contract allows `source_claims` is claimed
- **THEN** its generated `task.md` SHALL state that `cache_trail_refs[]`/`degraded_capture_ref` require
  declared cache leaf directory paths
- **AND** it SHALL state that `<leaf>/page.md` file paths are not valid refs
- **AND** it SHALL name the assignment's cache policy root (e.g. `_cache/`) and at least one assigned output
  path inside the value-domain statement or the positive example

#### Scenario: generated task forbids slug source_ref

- **WHEN** a source-claims assignment's generated task guidance describes `source_ref`
- **THEN** it SHALL state the legal values are current assigned output paths or authorized prior submitted
  output paths
- **AND** it SHALL forbid leaf slugs and other free-form identifiers

#### Scenario: positive example shows both accepted and degraded outlets

- **WHEN** a source-claims assignment's generated task includes the accepted-and-degraded example
- **THEN** exactly one example claim SHALL use `cache_trail_refs` holding a cache leaf directory path
- **AND** exactly one example claim SHALL use `degraded_capture_ref` holding a cache leaf directory path
  recorded as the degraded capture
- **AND** the guidance SHALL state that each example cache/degraded ref must be declared in the result's
  `cache_trails[]` at submit
- **AND** each example `source_ref` SHALL equal an assigned output path exposed to the assignment

### Requirement: Dry-submit invalid-result SHALL report duplicate accepted claim URLs and their count

When dry-submit / submit validation already rejects a source-claims result for an accepted claim or
accepted-URL root (for example an `accepted_source_urls[]` entry with no matching accepted claim, or a cache
trail mismatch), and the result also declares more than one accepted claim entry for the same normalized
claim URL, the structured `invalid_result` SHALL additionally report each repeated URL, the number of
accepted claims carrying that URL, and the JSON-pointer range of those claims (first..last index within
`source_claims[]`) so the Agent can collapse duplicates in one deterministic edit. URL normalization SHALL
reuse the existing source-cache URL normalization used by claim/cache matching.

This diagnostic SHALL be purely enrichment of an already-failing result: it SHALL NOT by itself turn a
passing result into a failing one, SHALL NOT introduce a new standalone pass/fail root, and SHALL NOT relax
or strengthen the existing accepted-URL membership and cache/degraded ref checks. A result whose only
anomaly is repeated claim URLs (with every other source-claim/URL/cache check passing) SHALL keep its
existing verdict.

#### Scenario: duplicate accepted claim URLs are counted inside an invalid result

- **WHEN** a result declares 16 accepted `source_claims[]` entries across only 4 distinct claim URLs
- **AND** dry-submit rejects the result for an existing accepted-URL or cache-trail root
- **THEN** dry-submit SHALL report, per repeated URL, the number of accepted claims sharing it and the
  JSON-pointer range of those claims
- **AND** the diagnostic SHALL NOT depend on the Agent hand-counting the result

#### Scenario: duplicates alone do not change a passing verdict

- **WHEN** a result's accepted claims repeat a URL but every existing source-claim, accepted-URL, and
  cache/degraded check passes
- **THEN** the duplicate-claim enrichment SHALL NOT turn that result into a failure
- **AND** the result verdict SHALL be unchanged by this diagnostic
