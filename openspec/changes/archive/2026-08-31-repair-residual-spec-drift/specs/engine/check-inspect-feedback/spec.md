> req: CHI-004

## MODIFIED Requirements

### Requirement: Attempt recovery feedback SHALL expose one ownership-safe legal action

For attempt-owned feedback, public work-unit commands, inspect, and Gate projections SHALL distinguish
`busy`, active logical-owner mismatch, stale existing attempt binding, submit-owned integrity failure,
suspect transaction, supersession eligibility, and submitted historical coverage with an immutable relation.
Each independent primary root SHALL identify the direct fact, authoritative owner, one exact legal operation
or honest `missing_contract`, and the same checkpoint to rerun. A structured busy outcome is legal only for
a schema-valid global lock-owner record paired with its readable non-suspect `work-unit.transaction.v2`
journal. It SHALL expose the holder disposition and identify
the caller's requested operation/work ID separately from the holder transaction's ID, operation, and target
work/queue coordinates, state whether the holder targets the same attempt, and direct wait plus the caller's
same-operation rerun. It SHALL not label the candidate invalid or present timeout, re-claim, queue
reactivation, manual hash editing, or parallel replacement as competing actions. Logical-owner and busy
feedback SHALL not claim physical actor identity, process death, progress, or liveness.

Where an attributable missing ledger row is exactly recoverable, feedback SHALL name only
`recover-declaration` and the same checkpoint. Otherwise, where direct post-submit integrity drift and intact
parent authority make supersession legal, feedback SHALL name `supersede`; only its successful result SHALL
then name the successor's ordinary actor-observed claim/submit path or its unique legal current lineage leaf.
Index/status/terminal-queue drift,
duplicate or unattributable ledger corruption, and malformed supersession relations SHALL return
`missing_contract`, not a guessed successor. Where no drift makes correction legal, feedback SHALL name the
semantic/supplementary boundary rather than promising a mutable submitted row. The Engine
selects only deterministic legal operations; the Agent decides semantic content and executes the existing
mechanical operation; the user is asked only for a genuinely new semantic/risk decision.

When a lock/journal is unpaired, unreadable, target-mismatched, proof-incomplete, legacy, or `suspect`,
feedback SHALL return `suspect_transaction`, not `busy`. It SHALL name
`operate-work-unit recover-transaction <bundle> --tx-id <id>` only when no global lock is held and the named
v2 journal's complete exact-path before-image manifest can establish that no durable mutation remains;
otherwise its one action is `missing_contract`. Age SHALL not reclassify a pair as stale or dead.
`timeout-preflight` SHALL use the same root: any valid non-suspect v2 global holder blocks the current timeout
mutation, a `started` holder targeting the checked work ID additionally blocks both default and forced
terminalization as same-attempt integrity, and a suspect transaction receives no wait, force-timeout,
lock-deletion, or cleanup advice.

All five work-unit feedback surfaces — formal submit rejection, late-submit rejection, transaction
blocking, dry-submit, and inspect — SHALL emit the same `attempt_disposition` + `next` shape. The shape
SHALL carry the disposition root (one of the closed disposition vocabulary `unsupported_current_contract`, `not_submitted`, `historical`, `unresolved`, `current`, owned by the engine's attempt-disposition emission surface and locked by its unit test), the authoritative owner
surface, an exact legal operation or honest `missing_contract`, and the same checkpoint to rerun. A
recovery result (including `recoverWorkUnitTransaction`) SHALL NOT be a dead end: it SHALL carry the same
`next`/rerun coordinate for the checkpoint that produced the feedback, so the caller never has to
reconstruct the original command.

For attempt-owned work-unit recovery feedback (the five surfaces above), the emitted `recovery_action` (and `repair_kind`) value set SHALL be exactly the engine-owned export `WORK_UNIT_RECOVERY_ACTIONS` — the full closed set, including CLI-verb-spelled and underscore-spelled members; each emitted value SHALL honor the CLI verb declared for it in `RECOVERY_ACTION_CLI_VERB` or be an explicit no-verb wait/author/stop boundary. A feedback result SHALL NOT emit a recovery value outside that export, nor present a rerun coordinate contradicting the emitted value's declared verb mapping. Agent-facing work-unit recovery guidance
— including `COMMANDS.md`, `shared-subagent-protocol.md`, `cli/README.md`,
`command_playbook/provenance-forensics-guide.md`, and the wave phase nodes — SHALL spell those recovery
`repair_kind` values exactly as emitted and consistent with their `RUN.md` decision-table rows, and SHALL NOT present a recovery `repair_kind` value outside the engine-owned export. This rule SHALL NOT rename the
non-recovery `repair_kind` vocabularies owned by other surfaces (for example the gate-hint kinds
`agent_action`, `engine_operation`, `user_decision`, `external_action`, `missing_contract`, and the
topic-state/entry kinds), which keep their existing contract wording. A successful `supersede` result
SHALL place `tx_id` and `successor_queue_item_id` at the top level of the result (not nested inside the
relation object) and SHALL name the successor's ordinary actor-observed location, so the reader does not
have to reconstruct the next claim/submit path from nested fields. The mapping from disposition
root to `repair_kind` to CLI verb SHALL be stated in one test-locked decision table in `RUN.md`'s recovery
section, with one row per attempt-owned recovery `repair_kind` the engine can emit. A deterministic
regression SHALL assert that every such emitted `recovery_action` has a table row and honors its declared CLI verb mapping (or
explicit no-verb boundary), and SHALL additionally scan the full Agent-facing work-unit recovery guidance
surface for recovery `repair_kind` values that are not `WORK_UNIT_RECOVERY_ACTIONS` members or lack a `RUN.md` decision-table row, failing when one appears.

#### Scenario: contention feedback preserves the current attempt

- **WHEN** a formal submit receives global transaction-lock contention with a schema-valid lock owner and
  matching readable non-suspect v2 journal, whether or not a `started` holder targets the same work ID
- **THEN** feedback SHALL identify `busy` as the primary root and direct the same submit operation to rerun
  after wait
- **AND** it SHALL identify caller and holder coordinates separately
- **AND** it SHALL not direct the Agent to alter the candidate, terminalize the attempt, claim another item,
  or ask the user to run a command

#### Scenario: suspect transaction has no fictional wait path

- **WHEN** inspect, submit preflight, or timeout-preflight finds an unpaired, unreadable, target-mismatched,
  proof-incomplete, legacy, or `suspect` lock/journal
- **THEN** feedback SHALL identify `suspect_transaction` as the primary root
- **AND** it SHALL name only the exact `recover-transaction` operation when a v2 `started`/`suspect` journal is
  unlocked and its complete before-image proof can be compared, otherwise `missing_contract`
- **AND** it SHALL not recommend waiting, forced timeout, a manual deletion, or a generic cleanup command

#### Scenario: submitted drift exposes one correction boundary

- **WHEN** inspect finds supersession-eligible direct post-submit drift for a current submitted attempt whose
  index/status/terminal-queue authority remains exact and whose missing declaration is not exactly recoverable
- **THEN** feedback SHALL name the drifted surfaces and the audited supersede operation as the sole current
  correction path
- **AND** it SHALL not advise hand-editing ledger, index, queue, transaction, or hash authority

#### Scenario: exact declaration recovery precedes supersession

- **WHEN** a submitted attempt is missing its ledger row and the existing declaration-recovery evaluator can
  reproduce the accepted row exactly
- **THEN** feedback SHALL name only `recover-declaration` and the same inspect/Gate rerun
- **AND** it SHALL not offer `supersede` as a parallel action

#### Scenario: a same-attempt active transaction cannot be force-timed-out

- **WHEN** timeout-preflight finds a valid active v2 `started` journal whose target set contains the checked work ID
- **THEN** feedback SHALL identify the same-attempt transaction fact and same timeout-preflight rerun
- **AND** it SHALL not offer default timeout, forced timeout, journal recovery, or lock deletion

#### Scenario: all five surfaces emit the unified disposition shape

- **WHEN** a formal submit rejection, a late-submit rejection, a transaction block, a dry-submit, or an
  inspect emits attempt-owned feedback for the same attempt
- **THEN** each SHALL emit the same `attempt_disposition` + `next` shape with the same closed disposition
  vocabulary, owner surface, exact operation or `missing_contract`, and same-checkpoint rerun
- **AND** a deterministic regression SHALL assert shape consistency across the five surfaces

#### Scenario: repair kind matches the CLI verb

- **WHEN** an engine feedback emits a `repair_kind` naming a work-unit recovery operation
- **THEN** the value SHALL be a member of `WORK_UNIT_RECOVERY_ACTIONS` and SHALL honor its declared `RECOVERY_ACTION_CLI_VERB` verb mapping, or be an explicit no-verb wait/author/stop boundary
- **AND** the RUN.md recovery decision table SHALL contain that `repair_kind` row with the matching CLI verb
  and the checkpoint to rerun
- **AND** the lock regression SHALL fail if an emitted `repair_kind` has no table row

#### Scenario: recovery repair kind spelling is doc-surface locked

- **WHEN** any Agent-facing work-unit recovery guidance surface (`COMMANDS.md`,
  `shared-subagent-protocol.md`, `cli/README.md`, `command_playbook/provenance-forensics-guide.md`, or a
  wave phase node) mentions a work-unit recovery `repair_kind`
- **THEN** the value SHALL be a member of `WORK_UNIT_RECOVERY_ACTIONS` with a `RUN.md` decision-table row consistent with its declared verb mapping
- **AND** the deterministic decision-table regression SHALL scan those surfaces and fail when a recovery
  `repair_kind` appears that is outside the engine-owned export or lacks a `RUN.md` decision-table row

#### Scenario: recovery result is not a dead end

- **WHEN** `operate-work-unit recover-transaction` or `recover-declaration` returns a successful or
  idempotent result
- **THEN** the result SHALL carry the same-checkpoint rerun coordinate
- **AND** the caller SHALL not need to have preserved the original command from memory

