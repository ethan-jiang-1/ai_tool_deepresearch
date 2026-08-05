---
schema: command-experiment/v2
experiment: reentry-debuggability
case: case-308-light-stale-queue-blocker
case_goal: "验证 queue conflict 检测: hitl2_recorded 状态下存在 stale prior-phase queue v2 active_window demand 时，check-reentry 返回 blocker + exit 1。"
verdict_mode: all
required_checks: [blocker-severity, correct-queue-item-id, done-no-blocker, done-warning, exit-code-1, queue-blocker-present]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: light
durable_evidence_roles: []
proof_subject: deterministic_contract
subject_execution: none
fixture: fixture_backed
runtime: real_disposable_bundle
external_calls: none
verdict_judge: deterministic
---

<!-- @impl EXA-005, EXA-006, EXA-007, PLR-003 -->

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` disposable experiment bundle 中执行。实验结果必须来自实际 CLI 调用；禁止 mock。

# case-308-light-stale-queue-blocker

验证 `check-reentry --at hitl2_recorded` 在 queue.v2 `active_window` 中存在 stale wave0 `queued` 项时产生 blocker + exit 1。

## Expected Runtime Path

1. 创建 disposable bundle，状态为 `hitl2_recorded`，queue.v2 `active_window[0]` 含 stale `queued` wave0 项 `[MAIN/SHELL]`
2. 跑 `check-reentry --at hitl2_recorded` `[MAIN/SHELL]`
3. 验证 exit 1 + blocker 含 stale `queue_item_id` `[MAIN/SHELL]`
4. 从 trace 裁决 `[MAIN/SHELL]`
5. 清理 `[MAIN/SHELL]`

---

## Step 1: 创建 stale-queue 场景

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs queue_blocker --case case-308 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"

# 状态已到 hitl2_recorded
cat > "$B/rb_status.json" << 'JSON'
{"bundle":"queue_blocker","current_mode":"execution","state":"in_progress","current_gate":"hitl2_recorded","next_gate":"readiness_passed"}
JSON

# Plan
cat > "$B/rb_plan.md" << 'MD'
---
topic_registry:
  - id: T01
    slug: topic-a
    title: Topic A
---
# Plan
MD

# Queue v2 — 含 stale wave0 queued active_window 项 (writes_to 影响 gate pass condition)
cat > "$B/rb_queue.json" << 'JSON'
{
  "schema_version": "queue.v2",
  "bundle_name": null,
  "queue_health": "ready",
  "stop_authorization_state": "unauthorized_continue_required",
  "active_window": [
    {
      "queue_item_id": "wave0-source-topic-a",
      "title": "Wave0 shared reference intake",
      "action": "Collect shared references for topic-a",
      "targets": { "controller": "main-agent" },
      "producer_rule": "shared_reference_intake",
      "lineage": { "topic_slug": "topic-a", "phase": "wave0" },
      "priority_class": "P3_current_gate_gap",
      "required_receipts": [],
      "done_condition": "Sources collected",
      "verification": { "engine": [], "agent": [] },
      "writes_to": ["reference/00-shared-foo.md", "artifacts/wave0/topic-a/source.yaml"],
      "status_sync": [],
      "completion_receipt": null,
      "failure_route": "queue_repair",
      "status": "queued",
      "restore_priority": "normal",
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z",
      "payload": {}
    }
  ],
  "refill_pool": [],
  "delegated_in_flight": {},
  "terminal_history": []
}
JSON

echo "research_style: quick_factual" > "$B/rb_profile.yaml"
touch "$B/rb_trace.jsonl"
mkdir -p "$B/_logs" && touch "$B/_logs/run.log"
mkdir -p "$B/seed_topics" && echo "# Topic A" > "$B/seed_topics/topic-a.md"

echo "B=$B"
```

→ 预期：bundle 创建，queue.v2 `active_window[0].queue_item_id` 为 stale wave0 queued 项。

---

## Step 2: 验证 blocker 检测

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
RESULT=$(node DEEP_RESEARCH_HARNESS/cli/check-reentry.mjs --bundle "$B" --at hitl2_recorded 2>&1)
EXIT=$?

echo "Exit: $EXIT"
echo "$RESULT" | grep -E '"blockers"|"queue_conflict"|"wave0' | head -10

node --input-type=module - "$B" "$RESULT" "$EXIT" <<'JS'
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
const __dirname = process.argv[2];
const result = JSON.parse(process.argv[3]);
const exitCode = parseInt(process.argv[4]);

const checks = [];

checks.push({
  ts: new Date().toISOString(), event: 'check',
  source: 'playbook',
  gate: 'exit-code-1', passed: exitCode === 1, expected: true,
  detail: `Exit code: ${exitCode}`
});

const hasQueueBlocker = (result.blockers || []).some(b =>
  b.check === 'queue_conflict' && b.message.includes('wave0')
);
checks.push({
  ts: new Date().toISOString(), event: 'check',
  source: 'playbook',
  gate: 'queue-blocker-present', passed: hasQueueBlocker, expected: true,
  detail: `Queue conflict blocker found: ${hasQueueBlocker}`
});

const blockerForWave0 = (result.blockers || []).some(b =>
  b.check === 'queue_conflict' && b.detail?.phase === 'wave0' && b.detail?.queue_item_id === 'wave0-source-topic-a'
);
checks.push({
  ts: new Date().toISOString(), event: 'check',
  source: 'playbook',
  gate: 'correct-queue-item-id', passed: blockerForWave0, expected: true,
  detail: `Blocker names queue_item_id wave0-source-topic-a: ${blockerForWave0}`
});

checks.push({
  ts: new Date().toISOString(), event: 'check',
  source: 'playbook',
  gate: 'blocker-severity', passed: (result.blockers || []).every(b => b.severity === 'blocker'),
  expected: true,
  detail: 'All blockers have severity=blocker'
});

const tracePath = join(__dirname, 'rb_trace.jsonl');
for (const c of checks) writeFileSync(tracePath, JSON.stringify(c) + '\n', { flag: 'a' });
console.log(JSON.stringify(checks.map(c => ({ gate: c.gate, passed: c.passed }))));
JS
```

→ 预期：exit 1，blocker 含 `wave0-source-topic-a`，`check: queue_conflict`。

---

## Step 3: 对比 — done 状态不产生 blocker

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
# 把 stale active_window 项改为 done
cat > "$B/rb_queue.json" << 'JSON'
{
  "schema_version": "queue.v2",
  "bundle_name": null,
  "queue_health": "ready",
  "stop_authorization_state": "unauthorized_continue_required",
  "active_window": [
    {
      "queue_item_id": "wave0-source-topic-a",
      "title": "Wave0 shared reference intake",
      "action": "Collect shared references",
      "targets": { "controller": "main-agent" },
      "producer_rule": "shared_reference_intake",
      "lineage": { "topic_slug": "topic-a", "phase": "wave0" },
      "priority_class": "P3_current_gate_gap",
      "required_receipts": [],
      "done_condition": "Done",
      "verification": { "engine": [], "agent": [] },
      "writes_to": ["reference/00-shared-foo.md"],
      "status_sync": [],
      "completion_receipt": null,
      "failure_route": "queue_repair",
      "status": "done",
      "restore_priority": "normal",
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z",
      "payload": {}
    }
  ],
  "refill_pool": [],
  "delegated_in_flight": {},
  "terminal_history": []
}
JSON

RESULT2=$(node DEEP_RESEARCH_HARNESS/cli/check-reentry.mjs --bundle "$B" --at hitl2_recorded 2>&1)
EXIT2=$?

node --input-type=module - "$B" "$RESULT2" "$EXIT2" <<'JS'
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
const __dirname = process.argv[2];
const result = JSON.parse(process.argv[3]);
const exitCode = parseInt(process.argv[4]);

const checks = [];
const hasQueueBlocker = (result.blockers || []).some(b => b.check === 'queue_conflict');
const hasQueueWarning = (result.warnings || []).some(w => w.check === 'queue_conflict' && w.severity !== 'info');

checks.push({
  ts: new Date().toISOString(), event: 'check',
  source: 'playbook',
  gate: 'done-no-blocker', passed: !hasQueueBlocker, expected: true,
  detail: `No queue conflict blocker for done item: ${!hasQueueBlocker}`
});
checks.push({
  ts: new Date().toISOString(), event: 'check',
  source: 'playbook',
  gate: 'done-warning', passed: hasQueueWarning, expected: true,
  detail: `Warning for prior-phase done item: ${hasQueueWarning}`
});

const tracePath = join(__dirname, 'rb_trace.jsonl');
for (const c of checks) writeFileSync(tracePath, JSON.stringify(c) + '\n', { flag: 'a' });
console.log(JSON.stringify(checks.map(c => ({ gate: c.gate, passed: c.passed }))));
JS
```

→ 预期：done 状态不产生 blocker，仅产生 warning。

---

## Native Completion

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

Stop after native completion. The Autorun Supervisor owns health, durable audit, preservation, and optional clean-PASS cleanup of the complete case run root.
