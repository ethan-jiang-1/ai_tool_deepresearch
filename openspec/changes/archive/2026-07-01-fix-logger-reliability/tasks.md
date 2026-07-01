## 1. OpenSpec and governance

- [x] 1.1 When implementation scope is opened beyond this change directory, register LOG-006 and LOG-007 in `openspec/governance/req-registry.yaml`.
- [x] 1.2 Update this change's proposal/design/specs to accident-grade logging scope.
- [x] 1.3 When implementation scope is opened beyond this change directory, update `guidelines/logging-conventions.md` so its LOC-006 guidance no longer lists the old summary closed-set and instead points to the accepted accident-grade event set.

## 2. Logger and gate shared helpers

- [x] 2.1 `createRunLogger()` writes `logger_ready` heartbeat with `pid`, without requiring it to be the first run.log line.
- [x] 2.2 `writeGateAttempt()` precomputes failed gate `diagnostic_path`, includes it in failed gate log detail, and reuses the same path for diagnostic artifact + trace pointer.
- [x] 2.3 `writeGateFailureDiagnostic()` returns explicit write status, and `writeGateAttempt()` writes failed gate diagnostic artifacts before logging `diagnostic_path`; if artifact write fails, it logs `diagnostic_write_failed:true` with reason and omits `diagnostic_path`.
- [x] 2.4 `parseGateCliArgs()` preserves a supplied bundle path in error returns so early errors can be logged when possible.
- [x] 2.5 `emitGateResult()` can log early invalid/config gate results through `writeGateAttempt()` when a bundle path is available; missing `--bundle` remains non-loggable.
- [x] 2.6 Gate CLI wrappers pass the bundle path to `emitGateResult()` for early errors.
- [x] 2.7 Unit tests cover heartbeat, early gate error logging, diagnostic pointer logging, and diagnostic write failure behavior.

## 3. Engine: queue-manager logging (LOG-006)

- [x] 3.1 `enqueue()` logs `queue_enqueue_attempt`, `queue_enqueue_done`, and `queue_enqueue_exception`.
- [x] 3.2 `claim()` logs `queue_claim_attempt`, `queue_claim_done`, `queue_claim_empty`, and `queue_claim_exception`.
- [x] 3.3 `complete()` logs `queue_complete_attempt`, `queue_complete_reject`, `queue_complete_receipt_fail`, `queue_complete_done`, `queue_complete_exception`, and delegated ledger append attempt/done/exception.
- [x] 3.4 `fail()` logs `queue_fail_attempt`, `queue_fail_done`, and `queue_fail_exception`.
- [x] 3.5 `preempt()` logs `queue_preempt_attempt`, `queue_preempt_done`, and `queue_preempt_exception`.
- [x] 3.6 `saveQueue()` and `loadQueue()` log attempt/done/exception outcomes.
- [x] 3.7 Unit tests verify queue log events for success, empty, reject, receipt-fail, save/load exception paths, representative fine-event-to-broad-kind mappings, and pure in-memory calls without an initialized run logger remain no-log/no-throw.

## 4. Engine: subagent-relay logging (LOG-006)

- [x] 4.1 `stageSubagentSlots()` logs `relay_stage_attempt`, `relay_stage_empty`, `relay_stage_done`, and exceptions.
- [x] 4.2 `recordAgentSpawnRequested()` logs spawn attempt/requested/exception.
- [x] 4.3 `ingestAgentReceipt()` logs receipt ingest attempt/done/failed/exception.
- [x] 4.4 `commitSlotResult()` logs commit attempt, schema fail/path escape, done, and exception outcomes.
- [x] 4.5 Bundle-aware relay callers log fork attempt/done/exception, collect/empty/all-failed/merge/refork/exception outcomes, and repair outcomes without making pure `forkRouter()` / `convergeRepair()` discover bundle state.
- [x] 4.6 Unit tests verify relay log events on lifecycle, invalid result, path escape, missing receipt/result, all-failed, repair paths, and representative fine-event-to-broad-kind mappings.

## 5. Agent-facing logging instructions

- [x] 5.1 `buildSpawnPrompt()` includes "Diagnostic logging" with 6 event types using copyable `log-event.mjs` command examples, absolute bundle path, absolute path to `DPT_FRAMEWORK/cli/log-event.mjs`, lowercase `--level info|warn|error`, and detail JSON with `kind`, `slotKey`, `roleAgentKey`.
- [x] 5.2 `shared-subagent-protocol.md` reflects the log-event CLI contract and forbidden logging content.
- [x] 5.3 All phase nodes with autonomous gate repair/retry loops require `repair_loop_start`, `repair_action`, `repair_loop_done`, and escalation/degradation logs; at minimum cover instantiation, setup, hitl1, hitl2 repair branch, seed-topics, wave0, wave1, wave2, readiness, and terminal/degraded rerun handling.

## 6. Validation

- [x] 6.1 Run `openspec validate fix-logger-reliability --strict`.
- [x] 6.2 Run `node openspec/governance/check-project-reqs.mjs`.
- [x] 6.3 Run `node openspec/governance/check-project-specs.mjs`.
- [x] 6.4 Run focused regression tests for logger, gate helpers, queue-manager, and subagent-relay.
- [x] 6.5 Run all regression tests: `node --test tests/`.
