> req: GSK-004

## MODIFIED Requirements

### Requirement: Gate CLI evaluates rules from definition

Gate rule evaluation SHALL evolve the existing structured finding shape implemented by `wave-contract-findings.mjs`; it SHALL NOT introduce a parallel failure object. `makeContractFinding()`, `buildContractEvaluation()`, and `projectInspectContract()` SHALL retain their current classification/surface/expected/repair/detail behavior while adding the observed fact, blocking basis, repair kind/resolved write coordinate, masking, and checkpoint context needed by formal Gate projection. For a definition-owned rule, the evaluator SHALL attach the resolved static basis/repair to the concrete failure finding. For a checker-owned rule, the detecting helper SHALL return the concrete blocking finding(s) directly. Wave formal Gate and side-effect-free inspect SHALL consume the same findings for shared rules; formal-only lifecycle/config rules SHALL use the same finding shape through shared Gate helpers. CLI wrappers SHALL not reconstruct hints from `inspect[]`, `advice[]`, `failure_message`, exception text, or filename regexes after evaluation. `findingsFromCheckResult()` or another compatibility adapter MAY convert prose-only results only when they remain advisory or diagnostic-only; any result that blocks the current inspect or formal Gate SHALL provide a structured finding directly rather than deriving rule identity or repair lineage from prose position/prefix.

The shared finding SHALL preserve rule identity, closed-enum `blocking_basis`, direct observed fact, checked authority coordinate, expected contract, root-specific repair kind/resolved write coordinate, classification, and masking relationship needed to project `failed_rule_ids`, `hints[]`, `inspect[]`, and `advice[]` consistently. Finding `id` MAY identify a concrete diagnostic instance, while `rule_id` SHALL be the stable identity used for formal failed-rule projection and attempt comparison. `buildContractEvaluation()` SHALL derive `failed_rule_ids` from blocking findings' `rule_id`, not from a message-indexed or otherwise instance-local `id`. Multiple independent instances or root types of one rule SHALL remain distinguishable through their findings and resolved hint coordinates. This is an in-memory result shape, not persistent state or a second verdict.

Primary root selection and ordering SHALL come from structured classification, prerequisite masking, and stable rule identity. `gateMessagePriority()` or equivalent error-string regex classification SHALL NOT decide `failed_rule_ids` or `hints[]` ordering. Gate-attempt trend comparison SHALL use stable `failed_rule_ids`; a legacy diagnostic without stable IDs SHALL be excluded from comparison, making the current result the first comparable sample rather than comparing `inspect[]` prose.

Wave0/Wave1/Wave2 definitions SHALL include one shared `phase_queue_drained` rule evaluated by the existing pure wave-contract path. Its direct Source of Record SHALL be schema-valid `rb_queue.json`; pass requires `active_window`, `refill_pool`, and `delegated_in_flight` all to be empty. The evaluator SHALL check file existence, JSON parsing and the existing `QueueSchema` directly; it SHALL NOT call a loader that auto-creates an in-memory empty queue when the file is absent, and SHALL NOT persist schema defaults. This is a global quiescent-handoff invariant, not the delegated-only `phase_drained` projection returned by claim. The rule SHALL use `blocking_basis: authority_integrity` and SHALL be degradation-ineligible. The evaluator SHALL NOT infer queue-item phase from IDs, producer prose, kind prefixes, file paths, or phase-order heuristics, and SHALL NOT create a completion manifest/state. Side-effect-free Wave inspect and formal Gate SHALL consume the same fact finding for this rule.

If queue authority is missing, unreadable, or schema-invalid, the rule SHALL report that prerequisite root with `repair_kind: missing_contract` and mask derived drain symptoms; it SHALL NOT authorize direct queue editing.

If the queue is valid and `delegated_in_flight` is non-empty, the rule SHALL return that bounded root first and point `write_to` to the existing `operate-work-unit inspect` checkpoint. Only after in-flight work is empty, an `active_window` residual SHALL produce one bounded front-demand root. The rule SHALL read only the front item's direct `targets` owner: `targets.delegates.to: sub-agent` points to the current Wave's `operate-work-unit claim` checkpoint, otherwise `targets.controller: main-agent` points to `operate-queue claim`. It SHALL NOT derive phase from item id, kind, producer, path, or prose.

If `active_window` is empty while `refill_pool` remains non-empty, the finding SHALL use `repair_kind: missing_contract`: current public operations do not expose a sanctioned refill-only transition, and `operate-queue check` does not repair that state. The rule SHALL NOT add a new refill command, ask for a queue hand edit, or falsely present an unreachable Engine operation.

For reachable roots, the Agent SHALL follow the returned owner checkpoint, execute legal mechanical drain/submit/repair/wait/timeout-preflight/terminal work, and rerun the same Wave checkpoint. The rule SHALL NOT ask the user to run ordinary commands, auto-terminalize work, choose a semantic failure reason, or present competing recovery routes.

#### Scenario: Inspect and formal Gate share the same repair coordinates

- **WHEN** Wave inspect and formal Gate evaluate the same unchanged bytes and shared blocking rule
- **THEN** both SHALL return the same `rule_id`, `repair_kind`, `missing_fact`, and `write_to`
- **AND** their rerun commands SHALL differ only by the checkpoint actually invoked

#### Scenario: Message wording does not change root order or trend

- **WHEN** two equivalent failures use different human-readable `inspect[]` or `failure_message` wording
- **THEN** their primary root order and attempt-trend identity SHALL remain determined by stable structured rule IDs
- **AND** changing prose SHALL NOT create a regression, convergence, or different repair hint

#### Scenario: Diagnostic instance id does not become failed rule identity

- **WHEN** two blocking findings share one stable `rule_id` but have different file/topic instance `id` values
- **THEN** `check.failed_rule_ids` SHALL contain the stable rule identity rather than the two diagnostic ids
- **AND** `hints[]` SHALL retain the exact separate repair coordinate for each independent instance

#### Scenario: Prose adapter cannot manufacture a blocking root

- **WHEN** a return-map or helper result fails the current inspect command
- **THEN** it SHALL provide an explicit structured finding with stable rule identity and repair coordinate
- **AND** the framework SHALL NOT create the blocking finding by parsing an `[id]` prefix or matching `inspect[]` with `advice[]` by array position

#### Scenario: filesystem-only output fails gate rule

- **WHEN** a gate rule evaluates delegated output coverage
- **AND** only filesystem output exists without submitted work-unit ledger coverage
- **THEN** the gate CLI SHALL fail that rule

#### Scenario: Wave completion blocks non-empty queue containers

- **WHEN** Wave0, Wave1, or Wave2 inspect/Gate reads a schema-valid queue whose active window, refill pool, or delegated-in-flight map is non-empty
- **THEN** the shared `phase_queue_drained` rule SHALL fail before phase completion
- **AND** the finding SHALL name the non-empty direct coordinates and one existing Engine owner boundary
- **AND** the Agent SHALL perform the authorized mechanical action and rerun the same checkpoint without a user decision

#### Scenario: Empty queue uses no phase inference

- **WHEN** all three queue containers are empty
- **THEN** `phase_queue_drained` SHALL pass without inspecting queue-item IDs, producer rules, writes-to paths, phase order, trace, checkpoint, or chat state

#### Scenario: Future-looking residual is not inferred away

- **WHEN** a schema-valid queue contains a residual item whose id, kind, prose, or path appears to refer to a later phase
- **THEN** the current Wave Gate SHALL still fail the global quiescent-handoff rule
- **AND** the evaluator SHALL NOT classify that item as permissible future demand from heuristic metadata

#### Scenario: In-flight work is the nearest drain root

- **WHEN** delegated in-flight work and queued demand are both present
- **THEN** the rule SHALL first direct the Agent to the existing work-unit inspect checkpoint
- **AND** queued-demand repair SHALL be reevaluated after in-flight work is resolved rather than presented as a competing first action

#### Scenario: Active-front target selects the existing owner

- **WHEN** in-flight work is empty and the active-window front is delegated demand
- **THEN** the root SHALL point to the current Wave's role-bound work-unit claim checkpoint
- **AND** when the front is non-delegated main-agent demand it SHALL instead point to `operate-queue claim`
- **AND** neither branch SHALL infer phase or owner from id, kind, producer prose, or file path

#### Scenario: Refill-only state exposes a missing contract

- **WHEN** `active_window` is empty and `refill_pool` is non-empty
- **THEN** the rule SHALL fail with `repair_kind: missing_contract`
- **AND** it SHALL NOT claim that queue check mutates the state, invent a refill command, or advise direct queue editing

#### Scenario: Invalid queue masks drain symptoms

- **WHEN** `rb_queue.json` is missing, unreadable, or schema-invalid
- **THEN** the rule SHALL return one direct queue-authority prerequisite root
- **AND** it SHALL NOT additionally report per-container or per-item drain symptoms

#### Scenario: Missing queue is not defaulted to drained

- **WHEN** `rb_queue.json` does not exist
- **THEN** the checker SHALL fail the queue-authority prerequisite
- **AND** it SHALL NOT call auto-create loading behavior, synthesize an empty queue in memory as pass evidence, or write a queue file

#### Scenario: Fatigue cannot degrade queue quiescence

- **WHEN** a Wave Gate reaches any fatigue/degradation threshold while `phase_queue_drained` is failing
- **THEN** the Gate SHALL remain failed
- **AND** the queue rule SHALL NOT appear in a degradation-eligible allowlist or degraded handoff
