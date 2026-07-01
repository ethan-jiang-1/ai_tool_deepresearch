## 1. Registry update

- [ ] 1.1 Register LOG-006, LOG-007 in `openspec/governance/req-registry.yaml`（LOC-010 已存在，无需注册）

## 2. Engine: queue-manager logging (LOG-006)

- [ ] 2.1 `enqueue()` — add entry log with work_id and slot (or `refill_pool`)
- [ ] 2.2 `claim()` — add entry log `claim_attempt`; add `claim_empty` when slot_1 is empty
- [ ] 2.3 `complete()` — add entry log `complete_attempt` before validation; add `complete_reject` on delegated validation fail; add `complete_receipt_fail` on receipt fail
- [ ] 2.4 `fail()` — add entry log `fail_attempt` with work_id and reason
- [ ] 2.5 `preempt()` — add entry log `preempt_attempt` with work_id, slot, and reason
- [ ] 2.6 `saveQueue()` — add entry log `queue_save` with queue_id and queue_health
- [ ] 2.7 `loadQueue()` — add entry log `queue_load` with queue_id and existed flag
- [ ] 2.8 Unit test: verify log events fire on each code path (`tests/engine/queue-manager.test.mjs`)

## 3. Engine: subagent-relay logging (LOG-006)

- [ ] 3.1 `stageSubagentSlots()` — add entry log `relay_stage` with waveIndex and slotCount
- [ ] 3.2 `commitSlotResult()` — add entry log `relay_commit_attempt`; add `relay_commit_schema_fail` on schema failure; add `relay_commit_path_escape` on path escape; add `relay_commit` on success
- [ ] 3.3 `collectAndMergeSubagentResults()` — add entry log `relay_collect`; add `relay_all_failed` when all failed; add `relay_merge` with ref_count and branch
- [ ] 3.4 `forkRouter()` — add log `fork` with branch, ref_count, ref_floor
- [ ] 3.5 `convergeRepair()` — add entry log `repair_attempt`; add `repair_stalled` on stall; add `repair_done` on success
- [ ] 3.6 Unit test: verify relay log events on each lifecycle stage (`tests/engine/subagent-relay.test.mjs`)

## 4. Sub-agent spawn prompt logging (LOG-007, LOC-010)

- [ ] 4.1 `buildSpawnPrompt()` — add "Diagnostic logging" section with 6 event types (search_start, search_done, fetch_done, file_written, error, work_done), format examples, level conventions, and what NOT to log
- [ ] 4.2 Update `shared-subagent-protocol.md` — reflect logging instructions in sub-agent contract

## 5. Logger heartbeat (LOG-004)

- [ ] 5.1 `createRunLogger()` — write `logger_ready` heartbeat line with `pid: process.pid` on initialization
- [ ] 5.2 Unit test: verify heartbeat appears as first log line (`tests/engine/logger.test.mjs` or equivalent)

## 6. Gate attempt logging (LOC-006)

- [ ] 6.1 `check-gate-wave0-complete.mjs` — add log after execution: gate name, passed, inspect_count, advice_count
- [ ] 6.2 `check-gate-wave1-complete.mjs` — same

## 7. Governance and validation

- [ ] 7.1 Run `node openspec/governance/check-project-reqs.mjs`
- [ ] 7.2 Run `node openspec/governance/check-project-specs.mjs`
- [ ] 7.3 Run all regression tests: `node --test tests/`
