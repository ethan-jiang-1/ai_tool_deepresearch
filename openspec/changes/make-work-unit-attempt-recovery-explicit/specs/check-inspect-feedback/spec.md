> req: CHI-004

## ADDED Requirements

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
