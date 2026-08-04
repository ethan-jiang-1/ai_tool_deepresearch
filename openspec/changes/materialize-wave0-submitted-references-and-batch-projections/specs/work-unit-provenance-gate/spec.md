> req: WPG-017

## ADDED Requirements

### Requirement: Wave0 provenance SHALL distinguish legacy delegated references from submitted-backed Phase-owned projections

Wave0 provenance evaluation SHALL classify a shared reference by the authority it actually claims. A legacy delegated shared reference is valid only when its exact reference output is recorded by a successfully submitted historical Wave0 work-unit row. A current Phase-owned shared reference is valid only when deterministic backing resolves its normal `source_url` and scannable body to one exact submitted Wave0 source identity, written as `<work_id>/<ordinal>`, together with the authenticated source YAML, source URL, cache, result, and work-unit facts needed by the existing backing contract. URL equality or a work ID without the exact ordinal SHALL not select a source identity.

A Phase-owned reference SHALL NOT require its own path in delegated `output_files[]`; it is a consumer projection after submit, not a second delegated attempt. Conversely, a matching URL, source layer, `_INDEX.md` row, filename, source YAML on disk, bare `work_id`, or unsubmitted candidate SHALL NOT establish that backing. Ambiguous, malformed, superseded, or unsubmitted backing SHALL fail closed with the nearest submitted-backing root rather than being labeled a valid projection or delegated reference.

#### Scenario: valid legacy delegated Wave0 reference stays valid

- **WHEN** a historical submitted Wave0 ledger row records a shared-reference output that passes its recorded output and provenance checks
- **THEN** the provenance gate SHALL classify it as submitted delegated fetched evidence
- **AND** it SHALL not require a new Phase-owned backing form or a rewritten historical file

#### Scenario: exact submitted backing authorizes a Phase-owned Wave0 reference

- **WHEN** a Phase-owned `reference/00-shared-*.md` binds its metadata and scannable body backing to one current submitted Wave0 source identity and its authenticated source/cache/work-unit facts
- **THEN** provenance SHALL classify it as a Phase-owned projection
- **AND** its absence from delegated reference output declarations SHALL not be a delegated-bypass failure

#### Scenario: presentation surfaces cannot manufacture Wave0 authority

- **WHEN** a Wave0 shared-reference file or index row has a legal name and format but cannot resolve to one exact submitted source identity
- **THEN** provenance SHALL return a blocking submitted-backing diagnostic
- **AND** it SHALL not count the file as delegated evidence or a Phase-owned projection
