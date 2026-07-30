> req: AGQ-026

## ADDED Requirements

### Requirement: Submitted predecessors with immutable supersession relations SHALL create a fresh queue successor without reactivation

When an Engine-audited submitted predecessor has an immutable supersession relation, the queue SHALL retain
the predecessor's existing terminal-history record and `status: submitted` as historical acceptance evidence
and SHALL create at most one fresh queue demand with a new `queue_item_id`. The new demand SHALL derive from
the exact terminal-history `item` snapshot and preserve each listed immutable contract and extension field,
including `title`, optional `kind`, `targets`, `action`, `producer_rule`, non-supersession `lineage`,
`priority_class`, `required_receipts`, `done_condition`, `verification`, `writes_to`, `status_sync`,
`completion_receipt`, `failure_route`, and `payload`. It SHALL change only the fresh `queue_item_id`, ordinary
queued status/timestamps, transient queue-placement `restore_priority` (reset to `normal`), and the five flat
direct-parent supersession fields. Its
lineage SHALL carry exact non-empty `supersession_of_work_id`,
`supersession_of_queue_item_id`, `supersession_accepted_ledger_record_hash`, `supersession_root`, and
`supersession_tx_id` fields matching the immutable predecessor index relation. Specifically,
`predecessor_work_id` SHALL map to `supersession_of_work_id`, `predecessor_queue_item_id` to
`supersession_of_queue_item_id`, `accepted_ledger_record_hash` to
`supersession_accepted_ledger_record_hash`, `root_code` to `supersession_root`, and `tx_id` to
`supersession_tx_id`; the relation's `successor_queue_item_id` SHALL equal the new demand's `queue_item_id`.
Relation-only `schema_version`, `reason`, and `recorded_at` SHALL not be copied into queue lineage. The index
relation SHALL own that correction fact; queue lineage is a required cross-check and SHALL not outvote,
synthesize, or repair it.
When a predecessor already carries those five fields, the new demand SHALL replace them with the new direct
edge while retaining earlier edges in the predecessor terminal snapshot/index history. The demand SHALL enter
one existing ordinary queue location and be claimed only through normal current actor observation.

The queue SHALL not move the predecessor terminal item back into `active_window`, rewrite its terminal
history, reuse its work ID or queue-item ID, allocate a work ID during supersession, or create a second
current completion record. Repeated supersession lookup SHALL return the same successor and its current
ordinary queued/in-flight/terminal location. It SHALL refuse any sibling demand or lineage/snapshot mismatch.
A terminal successor remains the only possible parent for a later operation allowed by its own ordinary
status contract: submitted drift uses supersession on that successor; failed/abandoned uses existing
replacement; timed-out uses existing retry/late-submit semantics. These accepted edges SHALL form one acyclic
lineage ending in one current leaf; a branch, cycle, missing snapshot, or conflicting edge SHALL fail closed.
Within a timeout-retry chain for one queue demand, the existing audited late-submit contract SHALL determine
the leaf rather than greatest `attempt_index`: an eligible late-accepted timed-out attempt becomes the leaf
only after its queued retry is removed or its claimed retry is abandoned, while a submitted retry blocks the
late-submit. Validated retry cleanup SHALL not count as a sibling branch. The earlier superseded predecessor
SHALL not reopen.

#### Scenario: correction does not reactivate the parent queue item or rewrite submitted status

- **WHEN** a submitted predecessor receives a valid immutable supersession relation
- **THEN** its original queue item SHALL remain in historical terminal state
- **AND** its work-unit status SHALL remain `submitted`
- **AND** the Engine SHALL create one fresh successor queue-item ID in an ordinary queue location
- **AND** its supersession lineage SHALL exactly cross-check the immutable predecessor index relation
- **AND** no direct queue-reactivate operation or manual movement of the parent item is required

#### Scenario: repeated supersession does not create sibling demand

- **WHEN** the same submitted predecessor already has a queued or in-flight successor from its immutable
  supersession relation
- **THEN** a repeat request SHALL return that same successor identity and location
- **AND** a different newly supplied audit reason SHALL not replace the relation or alter the successor
- **AND** it SHALL not create another queue demand or another claimed work ID

#### Scenario: conflicting successor lineage fails before queue mutation

- **WHEN** a predecessor relation names a successor but an existing queue location, claimed work unit, or
  terminal record for that successor has a mismatched snapshot or supersession lineage
- **THEN** supersession lookup SHALL fail on one relation-integrity root
- **AND** it SHALL not enqueue a sibling, rewrite either lineage, or reactivate the predecessor

#### Scenario: a terminal successor does not reopen an earlier predecessor

- **WHEN** the unique successor has reached an ordinary terminal state
- **THEN** another request against the earlier predecessor SHALL return that terminal successor as historical
  disposition without mutation
- **AND** any later legal correction SHALL target the successor under its own status contract

#### Scenario: successor lineage has one current leaf

- **WHEN** an initial supersession successor later follows an accepted timeout, replacement, or supersession
  edge
- **THEN** queue projection SHALL resolve one acyclic current lineage leaf through exact terminal snapshots
- **AND** a branch, cycle, missing edge, or conflicting direct-parent lineage SHALL fail before further mutation

#### Scenario: late-submit cleanup selects one timeout-retry leaf

- **WHEN** an initial supersession successor times out and an eligible earlier attempt is accepted through the
  existing audited late-submit contract
- **THEN** lineage resolution SHALL select that late-accepted submitted attempt after validating queued or
  claimed retry cleanup and the unique terminal `done` row
- **AND** it SHALL not select by greatest `attempt_index`, count an abandoned retry as a sibling branch, or
  reopen the superseded predecessor
- **AND** an already submitted retry SHALL continue to block late-submit and remain the only current leaf
