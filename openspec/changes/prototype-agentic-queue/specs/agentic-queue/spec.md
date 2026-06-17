# Agentic Queue

> req: AGQ-001, AGQ-002, AGQ-003, AGQ-004, AGQ-005, AGQ-006

## ADDED Requirements

### Requirement: Structured queue state validates task cards
The prototype SHALL define a Zod-validated `AgenticQueueState` with queue identity, wave index, iteration counters, max iteration guard, queue status, slots, active slot key, stop condition, projection path, and ledger path. Every slot SHALL be a structured task card with stable key, role, status, dependency fields, receipt fields, artifact/result paths, retry fields, and priority.

#### Scenario: Valid queue state passes schema
- **WHEN** `AgenticQueueState.safeParse()` receives a queue with one producer, one verifier depending on the producer, one synthesizer depending on the verifier, and a supported stop condition
- **THEN** validation succeeds

#### Scenario: Unknown slot role is rejected
- **WHEN** a slot role is not `producer`, `verifier`, `repair`, or `synthesizer`
- **THEN** validation fails before the Engine runs the queue

#### Scenario: Verifier cannot verify itself
- **WHEN** a verifier slot has `verifies` equal to its own `key`
- **THEN** validation fails

### Requirement: Role slot lifecycle is Engine-owned
The prototype SHALL track slot lifecycle through an explicit transition table. Legal statuses SHALL include `pending`, `ready`, `running`, `done`, `failed`, `blocked`, and `skipped`. The Engine SHALL reject lifecycle transitions that are not present in the transition table.

#### Scenario: Producer moves through ready running done
- **WHEN** a pending producer's dependencies and required receipts are satisfied
- **THEN** the Engine may transition it from `pending` to `ready`, then `running`, then `done`

#### Scenario: Terminal done state rejects rollback
- **WHEN** a slot status is `done`
- **THEN** a later transition to `running` or `failed` is rejected

#### Scenario: Verifier waits for producer completion
- **WHEN** a verifier depends on a producer that is not `done`
- **THEN** the verifier remains `pending` or `blocked` and is not selected as active work

### Requirement: Iterative loop enforces stop conditions and retry guards
The prototype SHALL implement an Engine-owned iteration loop that selects ready work, verifies receipts, records completion, evaluates verifier verdicts, spawns repair work when needed, and checks stop conditions. The loop SHALL respect `maxIterations` and SHALL detect stalled state by state hashing or equivalent deterministic comparison.

#### Scenario: All required work verified completes the queue
- **WHEN** all required producer outputs have passing verifier verdicts and the synthesizer completes
- **THEN** `evaluateStopCondition()` returns a completed outcome

#### Scenario: Failed verifier spawns repair before completion
- **WHEN** a verifier returns `fail` or `needs_rework` for a producer
- **THEN** the Engine creates or activates a repair slot before the queue can complete

#### Scenario: Max iterations escalates instead of looping forever
- **WHEN** the queue cannot satisfy its stop condition within `maxIterations`
- **THEN** the Engine returns an escalated or blocked outcome and writes a trace event

#### Scenario: Stalled state is detected
- **WHEN** a repair iteration produces no deterministic state change
- **THEN** the Engine returns a stalled outcome instead of continuing indefinitely

### Requirement: Receipt-checked promotion and projection are fail-closed
The prototype SHALL check deterministic receipts before slot execution and before slot closeout. Supported receipt prefixes SHALL include `file:`, `json:`, `ledger:`, `slot:`, and `verdict:`. Unknown receipt prefixes SHALL be invalid. The prototype SHALL render an Agent-readable Markdown projection from structured state, and that projection SHALL NOT be accepted as machine state authority.

#### Scenario: Missing required receipt blocks execution
- **WHEN** `slot_1_current` has a required `file:<path>` receipt and the file does not exist
- **THEN** the Engine does not start the slot and records a repair or blocked outcome

#### Scenario: Unknown receipt prefix fails closed
- **WHEN** a receipt begins with an unsupported prefix such as `chat:`
- **THEN** receipt validation fails

#### Scenario: Projection renders current task without mutating queue authority
- **WHEN** `renderProjection(state, bundleDir)` is called
- **THEN** it writes a Markdown task card that describes the current slot
- **AND** subsequent Engine decisions still read JSON state and JSONL ledger/trace rather than treating the Markdown projection as authoritative

### Requirement: Ledger and trace record produced, verified, rejected, repaired, and synthesized work
The prototype SHALL write Engine trace JSONL for queue events and `check` verdicts. It SHALL write ledger JSONL entries for evidence lifecycle actions including `produced`, `verified`, `rejected`, `repaired`, and `synthesized`. Ledger entries SHALL include slot key, role, action, source tag, artifact or result path, timestamp, and lineage where applicable.

#### Scenario: Producer completion writes produced ledger entry
- **WHEN** a producer slot completes with a valid artifact path
- **THEN** the ledger includes an entry with action `produced` and source tag `[PRODUCED]`

#### Scenario: Verifier pass writes verified ledger entry
- **WHEN** a verifier records verdict `pass`
- **THEN** the ledger includes action `verified` and source tag `[VERIFIED]`

#### Scenario: Verifier failure writes rejected ledger entry
- **WHEN** a verifier records verdict `fail` or `needs_rework`
- **THEN** the ledger includes action `rejected` and source tag `[REJECTED]`

#### Scenario: Trace check events decide command experiment verdict
- **WHEN** a command experiment reads the trace JSONL
- **THEN** only `event === "check"` entries with `passed === true` count as successful verdict evidence

### Requirement: Command experiments prove simple, medium, and complex queue behavior
The prototype SHALL include Agent-readable command experiment playbooks under `DPT_FRAMEWORK/command_experiments/exp_agentic-queue/`. Each playbook SHALL create a real `dpt_disp_*` disposable bundle with the shared helper, run `validate-bundle.mjs` and `inspect-bundle.mjs`, import the prototype Engine, execute the queue mechanism, derive final verdict from trace JSONL `check` events, and clean up the bundle after success.

#### Scenario: Simple playbook proves pass path
- **WHEN** `test-simple.md` is executed by an agent
- **THEN** it proves producer completion, verifier pass, synthesizer completion, stop condition completion, and trace verdict PASS

#### Scenario: Medium playbook proves repair path
- **WHEN** `test-medium.md` is executed by an agent
- **THEN** it proves verifier failure, Engine-created repair, re-verification pass, ledger repair lineage, and trace verdict PASS

#### Scenario: Complex playbook proves blocked or escalated path
- **WHEN** `test-complex.md` is executed by an agent
- **THEN** it proves at least one fail-closed condition such as missing receipt, invalid dependency, stalled state, or max iteration escalation without fake trace or hand-written pass evidence
