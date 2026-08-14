## MODIFIED Requirements

### Requirement: Gate SHALL verify submitted work-unit ledger rows

Work-unit provenance gates SHALL use schema-valid, hash-valid Engine-written
rows in bundle-root `rb_output_declarations.jsonl` as current delegated
coverage authority only after the associated attempt has passed the complete
current profile boundary. The index record is the attempt-entry Source of
Record, manifest and beacon cross-check its profile, and the accepted ledger
fingerprint remains the submitted current acceptance representation.

An attempt with v1/v2 assignment, absent marked submission, legacy hash-mirror
representation, absent actor provenance, partial profile, or profile drift
SHALL produce one `unsupported_current_contract` root before Gate/inspect
counts coverage, evaluates a missing declaration, reconstructs a row, resolves
a supersession relation, or projects actor provenance. The Gate SHALL not
derive a current or historical acceptance conclusion from its row, path,
result, receipt, cache, status mirrors, runtime refs, or another record.

`legacy_non_work_unit_rows`, duplicate/unparseable/unattributable JSONL
corruption, and a malformed complete-current attempt remain their existing
distinct diagnostics. This change SHALL not suppress, delete, or reinterpret
those rows as current work-unit acceptance.

#### Scenario: Legacy work-unit row cannot count

- **WHEN** a hash-valid ledger row names an attempt without the complete
  current profile
- **THEN** provenance evaluation SHALL report
  `unsupported_current_contract` for that attempt before coverage computation
- **AND** the row SHALL not count as current coverage or historical accepted
  predecessor evidence

#### Scenario: Current row continues to count through ledger authority

- **WHEN** a complete current submitted attempt has matching current bindings
  and an immutable-fingerprint-valid ledger row
- **THEN** Gate SHALL retain the existing normal coverage evaluation
- **AND** it SHALL not require a second legacy representation or fallback

#### Scenario: Hand-written ledger row is rejected

- **WHEN** a current candidate row lacks a valid `ledger_record_hash`, its
  immutable current acceptance fingerprint, or the required
  result/receipt/output/cache/queue bindings
- **THEN** it SHALL not count as coverage

#### Scenario: Missing submitted declaration is one root

- **WHEN** a submitted current index/status/result binding has no supersession relation and its bundle ledger
  row is absent
- **THEN** gate/inspect SHALL report one missing-declaration root for that work ID
- **AND** dependent output coverage, cache mapping and count symptoms SHALL be masked until recovery is attempted

#### Scenario: Reconstruction facts are not direct coverage

- **WHEN** all declaration reconstruction facts exist without the current bundle ledger row
- **THEN** the gate SHALL remain failed
- **AND** advice SHALL identify the sanctioned `recover-declaration` action only

#### Scenario: Recovered row counts normally

- **WHEN** Engine recovery restores a schema-valid/hash-valid row bound to the current submitted attempt
- **THEN** subsequent gates SHALL evaluate it through the normal ledger path
- **AND** no recovery-specific gate success branch SHALL exist

#### Scenario: hand-written ledger row is rejected

- **WHEN** a row contains work-unit-looking fields but lacks a valid submit fingerprint or matching submitted
  index entry
- **THEN** `work_unit_ledger_exists` SHALL fail
- **AND** the row SHALL NOT count as coverage

#### Scenario: audited late-accepted row can count

- **WHEN** an audited late-accepted row passes normal row hash, result, receipt, output, cache, nonce, and
  index checks
- **AND** no submitted replacement or immutable supersession relation makes it historical
- **THEN** work-unit provenance SHALL count the row as submitted delegated coverage

#### Scenario: malformed or double-submitted late accept fails

- **WHEN** a late-accepted row has malformed audit fields
- **OR** another current work unit for the same demand is submitted
- **THEN** work-unit provenance SHALL fail closed
- **AND** diagnostics SHALL identify the late-accept conflict

#### Scenario: superseded missing predecessor row is historical only

- **WHEN** a complete current predecessor has one valid immutable supersession
  relation, matching successor lineage, and the required durable acceptance
  tuple, but its exact ledger row is missing
- **THEN** Gate MAY report historical acceptance without reconstructing or counting that predecessor
- **AND** current coverage SHALL remain absent until the successor's unique current lineage leaf has a
  hash-valid row through the existing normal-submit or audited-late-submit contract

#### Scenario: purpose text is durable

- **WHEN** active main specs are synced after this change
- **THEN** `work-unit-provenance-gate` Purpose SHALL describe submitted work-unit provenance gate behavior
- **AND** it SHALL NOT mention archived relay replacement history as the capability purpose

### Requirement: Gate SHALL verify work-unit submission presence

For a complete current submitted attempt, submission-presence evaluation SHALL
continue to verify the submitted index, manifest, canonical result, runtime
receipt, beacon, nonce, outputs, cache/source claims, queue binding, hashes,
and ledger-first immutable acceptance fingerprint. A missing current ledger row
without a supersession relation SHALL retain the existing bounded declaration
recovery diagnosis, and a complete current superseded predecessor shall retain
the existing current-lineage rules.

Markerless legacy rows SHALL not use a mirror-compatibility branch. Before
submission-presence evaluation gathers recovery or supersession facts, an old
or missing discriminator SHALL return `unsupported_current_contract` and SHALL
not offer recovery, supersession, or an inferred current form.

#### Scenario: Current missing declaration retains its bounded diagnosis

- **WHEN** a complete current submitted attempt lacks its ledger row and its
  existing direct recovery facts are available
- **THEN** inspect SHALL retain the existing exact recovery eligibility
  diagnosis
- **AND** it SHALL not offer supersession in parallel

#### Scenario: Markerless attempt has no recovery branch

- **WHEN** a submitted-looking attempt uses status/index hash mirrors without
  `work-unit.submission.v1`
- **THEN** submission-presence evaluation SHALL return
  `unsupported_current_contract` before comparing those mirrors
- **AND** it SHALL not classify a declaration as recoverable or historical

#### Scenario: Deterministic recovery eligibility is diagnosed

- **WHEN** a current submitted attempt's direct facts deterministically reproduce the recorded declaration
  hash and all binding surfaces agree
- **THEN** inspect SHALL report `recover-declaration` as reachable and provide one exact command target
- **AND** it SHALL not offer supersession in parallel

#### Scenario: Legacy recovery is rejected before original-hash evaluation

- **WHEN** an old or markerless submitted-looking attempt lacks its row
- **THEN** recovery evaluation SHALL return `unsupported_current_contract`
  before original-hash, status, receipt, beacon, output, cache, queue, or
  transaction evidence is compared
- **AND** it SHALL not offer recovery, supersession, or `missing_contract` as
  an alternate interpretation of that attempt

#### Scenario: Conflicting submitted surfaces block recovery

- **WHEN** a purported submitted attempt has index, status, result, queue, actor, receipt, trace, transaction,
  or supersession-relation conflict
- **THEN** the checker SHALL not recommend declaration reconstruction or supersession
- **AND** it SHALL return the one nearest existing legal owner or `missing_contract`

#### Scenario: stale manifest binding fails

- **WHEN** a current ledger row references a `work_id` whose manifest claims a different `queue_item_id`
- **THEN** `work_unit_submission_presence` SHALL fail
- **AND** the gate SHALL report the mismatched surfaces

#### Scenario: historical relation does not become submission presence

- **WHEN** a predecessor has a valid supersession relation but no normal current successor row
- **THEN** its historical acceptance tuple SHALL not satisfy current submission presence
- **AND** Gate SHALL require the unique current lineage leaf's hash-valid normal-submit or audited-late-submit row

### Requirement: Wave0 provenance SHALL distinguish legacy delegated references from submitted-backed Phase-owned projections

Wave0 provenance evaluation SHALL classify a shared reference by the authority it actually claims. A current Phase-owned shared reference is valid only when deterministic backing resolves its normal `source_url` and scannable body to one exact retained complete-current submitted Wave0 source identity, written as `<work_id>/<ordinal>`, together with the authenticated source YAML, source URL, cache, result, and work-unit facts needed by the existing backing contract. For a retained direct source array, that exact identity stays with its ledger-ordered accepted contribution across a later rerun append; a generic current-round eligibility filter does not reassign it. URL equality or a work ID without the exact ordinal SHALL not select a source identity.

A Phase-owned reference SHALL NOT require its own path in delegated `output_files[]`; it is a consumer projection after submit, not a second delegated attempt. Conversely, a matching URL, source layer, `_INDEX.md` row, filename, source YAML on disk, bare `work_id`, or unsubmitted candidate SHALL NOT establish that backing. Ambiguous, malformed, superseded, or unsubmitted backing SHALL fail closed with the nearest submitted-backing root rather than being labeled a valid projection or delegated reference.

#### Scenario: Legacy Wave0 rich-reference has no projection authority

- **WHEN** a submitted Wave0 ledger row records a shared-reference output under a v1/v2 or markerless attempt profile
- **THEN** the provenance gate SHALL return `unsupported_current_contract` before classifying it as delegated evidence or Phase-owned backing
- **AND** it SHALL not require a rewritten historical file or infer a current source identity

#### Scenario: exact submitted backing authorizes a Phase-owned Wave0 reference

- **WHEN** a Phase-owned `reference/00-shared-*.md` binds its metadata and scannable body backing to one retained submitted Wave0 source identity and its authenticated source/cache/work-unit facts
- **THEN** provenance SHALL classify it as a Phase-owned projection
- **AND** its absence from delegated reference output declarations SHALL not be a delegated-bypass failure

#### Scenario: retained Phase-owned backing survives a later source append

- **WHEN** a Phase-owned reference cites a valid prior source identity and a later rerun accepts an appended source in the same canonical direct-output target
- **THEN** provenance SHALL retain the prior reference's exact original backing while the later contribution owns only its appended ordinal interval
- **AND** it SHALL not classify the prior reference as drifted merely because its work unit is not current-round demand coverage

#### Scenario: presentation surfaces cannot manufacture Wave0 authority

- **WHEN** a Wave0 shared-reference file or index row has a legal name and format but cannot resolve to one exact submitted source identity
- **THEN** provenance SHALL return a blocking submitted-backing diagnostic
- **AND** it SHALL not count the file as delegated evidence or a Phase-owned projection

### Requirement: Gate SHALL detect delegated bypass by phase

Delegated-bypass diagnostics SHALL continue to identify direct/orphan outputs,
non-work-unit delegated artifacts, hand-written declarations, and current
work-unit rows through the shared normalized ledger conclusion. A complete
current superseded predecessor may remain historical context only under its
existing immutable relation and current-lineage requirements.

An old or incomplete work-unit attempt SHALL be surfaced through the same
`unsupported_current_contract` boundary before a bypass reader classifies it
as current, historical, missing, malformed, or unsubmitted. The reader SHALL
not use raw history to create a compatibility conclusion or hide a real bypass.
`legacy_non_work_unit_rows` remain diagnostic-only rows outside this attempt
profile decision.

#### Scenario: Unsupported work-unit input is not hidden as historical

- **WHEN** a raw declaration points at an attempt with an unsupported current
  profile
- **THEN** the bypass diagnostic SHALL return
  `unsupported_current_contract` for that attempt
- **AND** it SHALL not suppress the row as a compatible historical predecessor

#### Scenario: bypass diagnostic is failure evidence

- **WHEN** a phase output exists without submitted work-unit ledger coverage
- **THEN** `delegated_bypass_suspected` SHALL report the file
- **AND** the diagnostic SHALL NOT provide alternate pass authority

#### Scenario: superseded predecessor is historical rather than bypass evidence

- **WHEN** a raw declaration reader exposes a complete current submitted
  predecessor with one valid immutable supersession relation and matching
  successor lineage
- **THEN** `delegated_bypass_suspected` SHALL not report that predecessor as a hand-written or non-submitted declaration
- **AND** the Gate SHALL continue to evaluate the successor's current submitted coverage through the normal normalized-ledger path

#### Scenario: raw history does not hide a real bypass

- **WHEN** a raw declaration row is not a valid historical predecessor and cannot resolve to a hash-valid current submitted ledger row
- **THEN** `delegated_bypass_suspected` SHALL report that row as bypass evidence
- **AND** it SHALL not classify the row historical merely because another work unit exists for the same phase

#### Scenario: drifted historical-looking raw row remains bypass evidence

- **WHEN** a raw declaration names a superseded predecessor but its ledger hash
  does not exactly match a normalized `hash_valid_historical` entry
- **THEN** `delegated_bypass_suspected` SHALL report the row as bypass evidence
- **AND** it SHALL not suppress the row merely because its work ID has a valid
  supersession relation

### Requirement: Provenance gates SHALL derive current submitted coverage from immutable supersession relations

Provenance gates SHALL continue to require a schema-valid, hash-valid,
Engine-written submitted ledger row for complete current delegated coverage.
A complete current predecessor with a valid Engine-audited immutable
supersession relation remains historical acceptance and cannot count until its
unique current lineage leaf has a normal current ledger row.

The Gate SHALL not validate a version-applicable legacy accepted hash tuple for
an old/markerless/unrecorded attempt. Its direct profile failure is
`unsupported_current_contract`; it is neither a new supersession root nor a
request to migrate, repair, or rewrite the predecessor. Broken relation or
current ledger integrity remain their existing fail-closed roots.

#### Scenario: Current lineage leaf remains the only coverage path

- **WHEN** a complete current predecessor has a valid immutable supersession
  relation and its unique current successor leaf has a valid ledger row
- **THEN** the successor leaf MAY satisfy normal current delegated coverage
- **AND** the predecessor SHALL remain historical only

#### Scenario: Legacy predecessor cannot become historical acceptance

- **WHEN** a purported superseded predecessor lacks any current attempt
  discriminator
- **THEN** Gate/inspect SHALL return `unsupported_current_contract` before
  relation or legacy-tuple evaluation
- **AND** it SHALL not treat that predecessor as accepted historical evidence

#### Scenario: submitted predecessor relation is auditable but not current coverage

- **WHEN** a complete current submitted predecessor retains `status: submitted`
  and has one valid Engine-audited immutable supersession relation
- **THEN** Gate diagnostics MAY show its validated acceptance tuple as historical submitted evidence
- **AND** the row SHALL not satisfy current delegated coverage until its unique current lineage leaf has a
  hash-valid row through the existing normal-submit or audited-late-submit contract

#### Scenario: malformed declared supersession relation fails as one direct root

- **WHEN** a submitted predecessor has a partial supersession relation or a successor lineage claim and the
  relation is missing, mismatched, duplicated, references an invalid `accepted_ledger_record_hash`, or lacks
  required durable acceptance evidence
- **THEN** Gate/inspect SHALL fail on one supersession-integrity root
- **AND** dependent missing-output, cache, and bypass symptoms SHALL be masked in primary feedback

#### Scenario: unattributable JSONL corruption remains a ledger root

- **WHEN** a predecessor is declared superseded but the ledger contains an unparseable, duplicate, or corrupt
  line that cannot be uniquely attributed to that predecessor work ID
- **THEN** Gate/inspect SHALL fail on ledger integrity rather than ignore the line as historical
- **AND** no current row or successor relation SHALL bypass that root

#### Scenario: current successor lineage leaf uses only the normal coverage path

- **WHEN** the initial successor or its unique legal current lineage leaf is claimed and submitted through the
  ordinary work-unit contract
- **THEN** its schema-valid/hash-valid ledger row MAY satisfy current delegated coverage
- **AND** no supersession flag, predecessor status, or historical fingerprint SHALL independently grant pass

#### Scenario: branched or cyclic successor lineage fails closed

- **WHEN** successor, retry/replacement, or later supersession evidence forms a branch, cycle, missing edge, or
  conflicting direct-parent lineage
- **THEN** Gate/inspect SHALL fail on one lineage-integrity root
- **AND** no reachable submitted row SHALL be selected as current coverage
