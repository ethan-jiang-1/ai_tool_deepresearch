> req: WPG-001, WPG-002, WPG-016

## MODIFIED Requirements

### Requirement: Gate SHALL verify submitted work-unit ledger rows

Work-unit provenance gates SHALL continue to read schema-valid, hash-valid Engine-written rows in bundle-root
`rb_output_declarations.jsonl` as current delegated coverage authority. Reconstructable
index/result/status/queue facts, bounded late-accept context, immutable acceptance fingerprints, and
supersession relations SHALL NOT count directly as coverage.

When `_work_units/_index.json` contains a submitted attempt with no supersession relation but its ledger row
is absent, gate/inspect SHALL classify one `submitted_declaration_missing` root, determine whether exact or
audited legacy `recover-declaration` is reachable through the existing work-unit owner, and mask dependent
output/cache/count symptoms. The gate SHALL remain failed until that operation restores a normal valid row;
reconstruction facts alone SHALL not become coverage.

When a submitted predecessor has a complete `work-unit.supersession.v1` relation and exactly matching
successor lineage, it SHALL remain historical acceptance but SHALL not be a current coverage candidate. Its
target ledger row MAY be missing or work-ID-attributable-but-drifted only when its version-applicable accepted
hash evidence and full `DEW-024` acceptance tuple validate: the marked immutable fingerprint for
`work-unit.submission.v1`, or the mutually compatible full legacy tuple and relation-frozen original hash for a
markerless predecessor. This bounded historical exception SHALL not accept
duplicate, unparseable, or unattributable JSONL corruption and SHALL not make the predecessor row current.
The gate SHALL remain failed for that obligation until the initial successor or its unique acyclic current
lineage leaf has a normal schema-valid, hash-valid submitted row with no valid relation making it historical.

#### Scenario: Hand-written ledger row is rejected

- **WHEN** a current candidate row lacks a valid `ledger_record_hash`, its version-applicable marked
  acceptance fingerprint or legacy mirror evidence, or the required result/receipt/output/cache/queue bindings
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

- **WHEN** a predecessor has one valid immutable supersession relation, matching successor lineage, and the
  required durable acceptance tuple, but its exact ledger row is missing
- **THEN** Gate MAY report historical acceptance without reconstructing or counting that predecessor
- **AND** current coverage SHALL remain absent until the successor's unique current lineage leaf has a
  hash-valid row through the existing normal-submit or audited-late-submit contract

#### Scenario: purpose text is durable

- **WHEN** active main specs are synced after this change
- **THEN** `work-unit-provenance-gate` Purpose SHALL describe submitted work-unit provenance gate behavior
- **AND** it SHALL NOT mention archived relay replacement history as the capability purpose

### Requirement: Gate SHALL verify work-unit submission presence

For each counted current ledger row, gates SHALL continue to verify submitted index, manifest, canonical
result, runtime receipt, beacon, nonce, outputs, cache/source claims, queue binding, and hashes. A
`work-unit.submission.v1` current row SHALL resolve current hashes ledger-first and verify the immutable index
acceptance fingerprint; markerless legacy rows SHALL use their explicit mirror compatibility branch.

For a missing current row without a supersession relation, the submission-presence evaluator SHALL inspect
only enough independent submitted surfaces to classify exact declaration recovery eligibility. It SHALL not
report successful submission presence or coverage before the row is restored. For a historical predecessor,
the evaluator SHALL instead verify the complete supersession relation, exact direct successor lineage,
one-successor cardinality, a unique acyclic chain through any accepted ordinary later edges, and the durable
`DEW-024` acceptance tuple. A broken relation, chain, or acceptance tuple SHALL remain the primary integrity
root and SHALL not be converted into a declaration-recovery or successor guess.

#### Scenario: Deterministic recovery eligibility is diagnosed

- **WHEN** a current submitted attempt's direct facts deterministically reproduce the recorded declaration
  hash and all binding surfaces agree
- **THEN** inspect SHALL report `recover-declaration` as reachable and provide one exact command target
- **AND** it SHALL not offer supersession in parallel

#### Scenario: Legacy recovery requires full original-hash evidence

- **WHEN** a legacy pre-unified-timestamp/pre-context current submitted attempt lacks its row
- **THEN** recovery eligibility SHALL require matching index/status/result/receipt/beacon/output/cache, queue
  terminal history and original submit/transaction evidence sufficient to reproduce the recorded hash
- **AND** any missing fact SHALL be named as the direct blocker
- **AND** if exact recovery is unavailable, supersession SHALL be considered only by the separate full
  `DEW-024` eligibility contract; otherwise the result SHALL remain `missing_contract`

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

## ADDED Requirements

### Requirement: Provenance gates SHALL derive current submitted coverage from immutable supersession relations

Work-unit provenance gates SHALL continue to require a schema-valid, hash-valid Engine-written submitted
ledger row for delegated coverage. A submitted predecessor with an Engine-audited immutable supersession
relation SHALL retain `status: submitted` and remain readable historical acceptance evidence, but SHALL not
count as current delegated coverage. The gate SHALL follow only a unique acyclic chain through valid direct
successor, ordinary retry/replacement, and later supersession edges, and SHALL require the current lineage
leaf's hash-valid row accepted through the existing normal submit or audited late-submit contract before
restored current coverage is counted; it SHALL not invent a
supersession-specific success branch.

Current content hashes and coverage SHALL resolve from the ledger first. Gate/inspect SHALL verify the
strict predecessor index relation's exact `schema_version`, `predecessor_work_id`,
`predecessor_queue_item_id`, `accepted_ledger_record_hash`, closed `root_code`, non-empty `reason`,
`recorded_at`, `tx_id`, and `successor_queue_item_id` fields. It SHALL require
`schema_version: work-unit.supersession.v1`, verify the five direct-parent queue lineage fields against their
predecessor work/queue ID, accepted hash, root, and transaction counterparts, and require the named successor
queue-item ID to match the actual successor demand. Relation cardinality and an acyclic one-leaf continuation
are also binding facts. When the predecessor ledger is missing or
work-ID-attributable-but-drifted, the historical relation is usable only with the version-applicable accepted
hash evidence and full durable acceptance tuple required by `DEW-024`; it still cannot count as current
coverage. Duplicate, unparseable, or
unattributable ledger corruption SHALL remain a ledger-integrity root and SHALL not be isolated as
historical. Gate/inspect SHALL root-first mask downstream coverage symptoms under a broken relation or
suspect transaction disposition. It SHALL separate a current artifact-content failure from ledger authority:
submit-owned preflight may assess direct integrity, while the formal Gate retains its existing content,
coverage, and cross-work-unit verdict.

#### Scenario: submitted predecessor relation is auditable but not current coverage

- **WHEN** a submitted predecessor retains `status: submitted` and has one valid Engine-audited immutable
  supersession relation
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
