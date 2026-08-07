> req: GSK-008

## MODIFIED Requirements

### Requirement: Cascade-masked diagnostics remain non-authority (GSK-008)

Primary Gate hints SHALL be projected only from the smallest independent
blocking root set after local prerequisite short-circuiting. Full forensic
details MAY remain in the durable gate diagnostic, but `hints[]` SHALL not
reproduce the flat failure wall. The framework SHALL use local guards and the
existing masked-rule mechanism; this change SHALL NOT introduce a generalized
dependency engine or persisted contract-lineage graph.

Repeated failure/fatigue output SHALL not replace the direct hint with generic
encouragement, tell the user to run ordinary commands, or recommend multiple
competing repair strategies. When an authorized mechanical path exists, the
Agent SHALL perform it and rerun the named Gate. Only new semantics,
risk/permission, external action, or `missing_contract` MAY form an escalation
boundary.

For the shared `phase_queue_drained` check, a schema-valid terminal-history
row with `failure_disposition: terminal_no_successor` SHALL be projected as its
own direct Queue terminal root. It SHALL name the original `queue_item_id` and
terminal reason, use `repair_kind: missing_contract`, and state that generic
Queue failure has no sanctioned successor. It SHALL not be hidden merely
because `active_window`, `refill_pool`, and `delegated_in_flight` are empty;
nor may it manufacture a repair command, ask for a direct Queue edit, or
reinterpret a delegated work-unit replacement relation as generic Queue
failure. Inspect and formal Gate consume the same direct finding and differ
only in their invoked rerun checkpoint.

#### Scenario: Fatigue does not erase the direct repair

- **WHEN** a Gate fails after the fatigue threshold
- **THEN** each primary root SHALL still expose its direct hint
- **AND** fatigue advice SHALL not become a substitute for `missing_fact`,
  `write_to`, or `rerun`

#### Scenario: Brittle heuristic is removed instead of patched again

- **WHEN** a gate rule produces repeated false positives and can only be kept
  by adding diagnostic-only mode, broad degradation exceptions, or special
  advice suppressions
- **THEN** the rule SHALL be removed from the phase-boundary gate unless it can
  be restated as a deterministic authority check
- **AND** the useful deterministic concern SHALL be moved to its proper schema,
  ledger, provenance, cache, trace, queue, or handoff check

#### Scenario: Cache drift does not bury the root cause

- **WHEN** a gate detects cache coverage drift that causes downstream output
  coverage symptoms
- **THEN** inspect SHALL identify cache coverage as the root cause
- **AND** downstream provenance symptoms SHALL be marked as symptoms or cascade
  details
- **AND** advice SHALL give one Engine-mediated repair target rather than
  separate manual edits for every symptom

#### Scenario: terminal Queue failure cannot masquerade as drain

- **WHEN** `rb_queue.json` has no active, refill, or delegated-in-flight demand
  but retains one `terminal_no_successor` row
- **THEN** Wave inspect and formal Gate SHALL both fail `phase_queue_drained`
  with that terminal Queue root
- **AND** the result SHALL not offer repair-card creation, direct JSON editing,
  or a competing Queue transition
