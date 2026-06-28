## Stage 1. OpenSpec — pivot scope to separate Queue and Relay

Intent: replace the old 12-slot coupling with the agreed mechanism: Queue active window is not the Relay work pool.

- [x] 1.1 Revise proposal/design to remove `MAX_QUEUE_SLOTS = MAX_CONCURRENT_SUBAGENTS + 4`
- [x] 1.2 Revise agentic-queue delta to define `QUEUE_ACTIVE_WINDOW_SLOTS = 5`, `SLOT_NAMES`, and `pendingCount(queue)`
- [x] 1.3 Revise subagent-dispatch delta to keep Relay concurrency on `MAX_CONCURRENT_SUBAGENTS` and current-task payload fan-out

## Stage 2. Queue constants, engine, and schema

Intent: create one Queue slot-shape SSOT and make schema/engine consume it without import cycles.

- [x] 2.1 Add/export `QUEUE_ACTIVE_WINDOW_SLOTS`, `SLOT_NAMES`, and pending slot names from a pure Queue constants module
- [x] 2.2 Update `queue-manager.mjs` to import/re-export Queue slot constants and use `SLOT_NAMES` for validation, promote, preempt, refill, and canonical file shape
- [x] 2.3 Add/export `pendingCount(queue)` as active non-null Queue slots plus refill pool length
- [x] 2.4 Update `schema/contracts/queue.mjs` to build `QueueSchema` slot keys from shared `SLOT_NAMES`

## Stage 3. CLI

Intent: expose Queue task depth to agents without implying Relay work-pool semantics.

- [x] 3.1 Add `node DPT_FRAMEWORK/cli/operate-queue.mjs count <bundle>` outputting `{ "pending": N, "active_window": A, "refill_pool": P }`

## Stage 4. Tests

Intent: prove the 5-slot Queue contract, pending count, schema shape, and CLI count.

- [x] 4.1 Update queue unit tests for `QUEUE_ACTIVE_WINDOW_SLOTS === 5`, `SLOT_NAMES`, generic promote/preempt behavior, and `pendingCount()`
- [x] 4.2 Update schema tests so `QueueSchema` validates the five-slot shape from shared `SLOT_NAMES`
- [x] 4.3 Add CLI integration test for `operate-queue count`

## Stage 5. Documentation and accepted specs

Intent: make the simple mental model clear for future coding agents.

- [x] 5.1 Update accepted subagent-dispatch spec to remove stale hardcoded concurrency values and pending-Queue-as-Relay-pool language
- [x] 5.2 Update guidelines to state Queue active window is not Relay work pool; Relay fan-out happens inside the current Queue task
- [x] 5.3 Update shared subagent protocol and heavy batch playbook to reference Relay SSOT and current batch task payload

## Stage 6. Verification

Intent: run the requested regression and governance checks.

- [x] 6.1 Run `node --test tests/engine/queue-manager.test.mjs`
- [x] 6.2 Run `node --test tests/schema/contracts/queue.test.mjs`
- [x] 6.3 Run `node --test tests/integration/cli/operate-queue.test.mjs`
- [x] 6.4 Run `node --test tests/engine/subagent-relay.test.mjs`
- [x] 6.5 Run `node openspec/governance/check-project-reqs.mjs`
- [x] 6.6 Run `node openspec/governance/check-project-specs.mjs`
- [x] 6.7 Run `openspec validate unify-queue-concurrency-constants --strict`

## Stage 7. Test gap close — post-implementation audit

Intent: the existing tests verify correct behavior in isolation, but several structural invariants are not machine-enforced. This stage closes those gaps so the coupling rejection is provably correct.

### Registry

- [x] 7.1 Add AGQ-019 and AGQ-020 to `openspec/governance/req-registry.yaml` (delta spec defines them; registry is missing both)

### Constant independence

- [x] 7.2 Add `assert.notEqual(QUEUE_ACTIVE_WINDOW_SLOTS, MAX_CONCURRENT_SUBAGENTS)` in `tests/engine/queue-manager.test.mjs` AGQ-019 block — currently the independence is only in comments/test names
- [x] 7.3 Fix `tests/integration/cli/operate-queue.test.mjs` count test: replace hardcoded `{pending:3, active_window:2, refill_pool:1}` with values computed from fixture data via `SLOT_NAMES`

### Integration

- [x] 7.4 Add full pipeline integration test: enqueue delegated task → claim(advice.delegates_required=true) → stageSubagentSlots → writeRuntimeReceipt → ingestAgentReceipt → commitSlotResult → complete(slot_result_ref) → assert feedback.passed + ledger
- [x] 7.5 Add `pendingCount` exclusion test: stage sub-agent slots on disk, assert `pendingCount(queue)` unchanged — per spec "SHALL NOT include Relay sub-agent slots"

### Verification

- [x] 7.6 Run `node --test tests/engine/queue-manager.test.mjs`
- [x] 7.7 Run `node --test tests/integration/cli/operate-queue.test.mjs`
- [x] 7.8 Run `find tests/ -name '*.test.mjs' | xargs node --test` (full regression)
- [x] 7.9 Run `node openspec/governance/check-project-reqs.mjs`
- [x] 7.10 Run `openspec validate unify-queue-concurrency-constants --strict`
