> req: DEW-005

## MODIFIED Requirements

### Requirement: Submit SHALL be the only successful delegated completion transition

Normal `submit` and the existing audited `late-submit` SHALL remain the only operations that convert an eligible delegated attempt into successful completion, complete queue demand, and create submitted coverage. The narrow `recover-declaration` operation introduced for an already-submitted attempt SHALL NOT be a completion transition: it SHALL accept no new result, perform no research, allocate no work unit, change no queue outcome, and create no new actor provenance. It SHALL restore a missing bundle declaration row only when existing durable facts can prove one hash-identical historical row; it SHALL not synthesize a missing Wave0 contribution witness.

For a current-version claimed attempt, normal first submit and eligible first late-submit SHALL evaluate every resolved required output through the shared direct-output evaluator before any successful queue, index, status, result, receipt, cache, transaction, or ledger mutation. Each acceptance invocation SHALL obtain its own fresh bounded byte snapshot; a previous dry-submit PASS, prior bytes, mtime, or cached evaluator result SHALL NOT authorize formal acceptance. Formal submit remains the only normal first-acceptance authority.

For each accepted `wave0_source_intake` required output with direct contract
`wave0.source-metadata-array.v1`, the Engine SHALL derive one
`source_contribution` declaration from that same passed snapshot before writing
the submitted ledger row. The declaration SHALL contain only the exact
bundle-relative target, direct-contract ID, validated array length, and a
deterministic semantic digest of the ordered validated array. It SHALL be
Engine-generated, included in the ledger-record hash, and unavailable as a
caller-supplied result field. It answers only which prefix of the current
declared source array this accepted work unit observed; it is not a general
artifact-history service, an evidence ledger, a new receipt, or permission to
rewrite source bytes.

The submit owner SHALL verify the index-bound assignment_contract_version, hash-bound queue snapshot, canonical recorded Topic coordinates, and exact reconstructed manifest/beacon output contract before reading candidate output content. Missing or unknown current contract facts SHALL fail closed. An attempt with no assignment_contract_version SHALL use only the explicitly defined legacy submit semantics and SHALL NOT be upgraded by current framework or bundle version inference.

Same-content duplicate normal submit, audited late-submit replay, and recover-declaration are historical postcondition operations rather than new candidate acceptance. They SHALL validate their existing result_hash, ledger_record_hash, submitted index/status/queue postconditions, and original reconstruction facts without making historical success depend on current mutable artifact bytes. Duplicate and late-submit replay SHALL retain an already-recorded `source_contribution` declaration verbatim. `recover-declaration` SHALL not invoke the live direct-output evaluator or create a new content acceptance: an already-present row remains idempotent, and an absent row may be restored only if the no-contribution historical row shape reproduces its stored hash exactly. If an absent row's stored hash requires `source_contribution`, the contribution fact is not durable anywhere outside that row; recovery SHALL fail closed with one `missing_contract` / no-legal-recovery boundary, SHALL NOT reread current `source.yaml` to infer it, and SHALL NOT append a ledger row. Wave inspect/Gate SHALL continue to evaluate current post-submit artifact content.

The normal direct-output verdict still proves only that the snapshot read at first acceptance satisfied its contract. `result_hash` and the general `ledger_record_hash` SHALL NOT be described as global immutable artifact-byte claims. The narrow Wave0 `source_contribution` declaration is the sole exception: it binds only the semantic array prefix needed for later candidate ownership evaluation. This requirement SHALL NOT add an artifact hash, immutable-content claim, generic ledger field, or atomic byte-commit guarantee.

#### Scenario: Declaration recovery is not delegated completion

- **WHEN** `recover-declaration` restores a row for an already-submitted work ID
- **THEN** the original submitted attempt and terminal queue history SHALL remain unchanged
- **AND** the recovery SHALL not count as a new submit, actor execution, queue completion, or work-unit success path

#### Scenario: Unsubmitted attempt cannot use declaration recovery

- **WHEN** a claimed, timed-out, failed, abandoned, or unknown work ID has no submitted declaration row
- **THEN** `recover-declaration` SHALL reject before ledger mutation
- **AND** `write_to` SHALL name the existing legal submit/late-submit/new-attempt boundary rather than a declaration file

#### Scenario: successful submit completes one queue demand

- **WHEN** a valid result is submitted for a claimed work unit
- **THEN** the Engine SHALL complete the bound `queue_item_id`
- **AND** append exactly one work-unit ledger row for that `work_id`

#### Scenario: Wave0 submit records a contribution boundary

- **WHEN** first submit accepts a schema-valid Wave0 `source.yaml` array with
  nineteen ordered entries
- **THEN** its submitted declaration SHALL record the exact target, contract ID,
  length `19`, and the semantic digest of those nineteen entries
- **AND** neither the Agent nor its result JSON SHALL provide, choose, or alter
  that declaration

#### Scenario: Later append cannot rewrite prior contribution

- **WHEN** a later legal Wave0 submit sees the same target extended from
  nineteen to twenty entries
- **THEN** its declaration SHALL bind the twenty-entry prefix from that later
  acceptance
- **AND** the earlier nineteen-entry declaration SHALL remain hash-bound
  historical data rather than being rewritten or re-evaluated from the new file

#### Scenario: normal submit still rejects timed-out attempts

- **WHEN** a work unit is `timed_out`
- **AND** a caller invokes normal `operate-work-unit submit`
- **THEN** submit SHALL reject
- **AND** no queue completion or ledger append SHALL occur

#### Scenario: normal first submit rereads after dry-submit

- **WHEN** dry-submit passes and an assigned required output changes before normal formal submit
- **THEN** formal submit SHALL acquire a fresh snapshot and decide acceptance from that snapshot
- **AND** the earlier dry-submit PASS SHALL not authorize queue completion or ledger append

#### Scenario: current contract drift blocks first acceptance

- **WHEN** the index marker, manifest contract, beacon contract, or hash-bound queue snapshot cannot reconstruct one identical expected contract
- **THEN** normal submit SHALL reject before success mutation
- **AND** it SHALL not fall back to the legacy role normalizer or actor-declared contract data

#### Scenario: duplicate normal submit does not depend on live artifact bytes

- **WHEN** a normally submitted Wave0 work unit receives a same-result duplicate
  submit after its source file has changed
- **THEN** duplicate handling SHALL decide idempotency from recorded result and
  ledger bindings plus durable postconditions
- **AND** it SHALL retain the original `source_contribution` rather than
  evaluate current bytes as a new accepted contribution
- **AND** current artifact content SHALL remain the Wave inspect/Gate
  responsibility

#### Scenario: declaration recovery does not reaccept candidate content

- **WHEN** recover-declaration restores an exact-reconstructable historical row
  for an already-submitted work ID
- **THEN** it SHALL reconstruct the original hash-identical row without
  rereading live required-output content for a new verdict
- **AND** recovery SHALL not advertise a new direct-contract acceptance time or
  contribution boundary

#### Scenario: direct evaluation does not create artifact hash authority

- **WHEN** first submit accepts a required-output snapshot
- **THEN** the verdict SHALL state only that the evaluated snapshot passed at
  that invocation
- **AND** no ledger or index field other than the narrow `source_contribution`
  declaration SHALL imply that later bytes are hash-bound by this change

#### Scenario: Missing contribution witness fails closed

- **WHEN** a current Wave0 first submit recorded a hash-bound
  `source_contribution`, its declaration row is later absent, and current
  `source.yaml` has changed
- **THEN** recover-declaration SHALL return one `missing_contract` / no-legal-
  recovery boundary before ledger mutation
- **AND** it SHALL not derive a replacement contribution from current source
  bytes, result data, index/status hash values, queue history, trace, or
  transaction metadata
#### Scenario: Non-Wave0 outputs do not gain general artifact immutability

- **WHEN** first submit accepts a required output other than
  `wave0.source-metadata-array.v1`
- **THEN** no `source_contribution` declaration SHALL be created
- **AND** the ledger SHALL not imply a global immutable-content or
  artifact-versioning contract
