## 1. OpenSpec and governance

- [ ] 1.1 Register LOG-006 and LOG-007 in `openspec/governance/req-registry.yaml` during implementation.
- [x] 1.2 Update this change's proposal/design/specs to accident-grade logging scope.

## 2. Logger and gate shared helpers

- [ ] 2.1 `createRunLogger()` writes `logger_ready` heartbeat with `pid`, without requiring it to be the first run.log line.
- [ ] 2.2 `writeGateAttempt()` keeps the shared gate logging entrypoint and includes `diagnostic_path` in failed gate log detail when available.
- [ ] 2.3 `emitGateResult()` can log early invalid/config gate results through `writeGateAttempt()` when a bundle path is available.
- [ ] 2.4 Gate CLI wrappers pass the bundle path to `emitGateResult()` for early errors.
- [ ] 2.5 Unit tests cover heartbeat, early gate error logging, and diagnostic pointer logging.

## 3. Engine: queue-manager logging (LOG-006)

- [ ] 3.1 `enqueue()` logs `queue_enqueue_attempt` and `queue_enqueue_done`.
- [ ] 3.2 `claim()` logs `queue_claim_attempt`, `queue_claim`, and `queue_claim_empty`.
- [ ] 3.3 `complete()` logs `queue_complete_attempt`, `queue_complete_reject`, `queue_complete_receipt_fail`, and `queue_complete`.
- [ ] 3.4 `fail()` logs `queue_fail_attempt` and `queue_fail`.
- [ ] 3.5 `preempt()` logs `queue_preempt_attempt`, `queue_preempt_reject`, and `queue_preempt`.
- [ ] 3.6 `saveQueue()` and `loadQueue()` log attempt/done/exception outcomes.
- [ ] 3.7 Unit tests verify queue log events for success, empty, reject, and receipt-fail paths.

## 4. Engine: subagent-relay logging (LOG-006)

- [ ] 4.1 `stageSubagentSlots()` logs `relay_stage_attempt`, `relay_stage_empty`, `relay_stage_done`, and exceptions.
- [ ] 4.2 `recordAgentSpawnRequested()` logs `relay_spawn_requested`.
- [ ] 4.3 `ingestAgentReceipt()` logs receipt ingest attempt/done/failed.
- [ ] 4.4 `commitSlotResult()` logs commit attempt, schema fail/path escape, and success/failure outcome.
- [ ] 4.5 `collectAndMergeSubagentResults()`, `forkRouter()`, and `convergeRepair()` log collect/all-failed/merge/refork/repair outcomes.
- [ ] 4.6 Unit tests verify relay log events on lifecycle, invalid result, all-failed, and repair paths.

## 5. Agent-facing logging instructions

- [ ] 5.1 `buildSpawnPrompt()` includes "Diagnostic logging" with 6 event types using `log-event.mjs` command examples.
- [ ] 5.2 `shared-subagent-protocol.md` reflects the log-event CLI contract and forbidden logging content.
- [ ] 5.3 Wave repair/supplementary loop phase nodes require `repair_loop_start`, `repair_action`, `repair_loop_done`, and escalation/degradation logs.

## 6. Validation

- [ ] 6.1 Run `openspec validate fix-logger-reliability --strict`.
- [ ] 6.2 Run `node openspec/governance/check-project-reqs.mjs`.
- [ ] 6.3 Run `node openspec/governance/check-project-specs.mjs`.
- [ ] 6.4 Run focused regression tests for logger, gate helpers, queue-manager, and subagent-relay.
- [ ] 6.5 Run all regression tests: `node --test tests/`.
