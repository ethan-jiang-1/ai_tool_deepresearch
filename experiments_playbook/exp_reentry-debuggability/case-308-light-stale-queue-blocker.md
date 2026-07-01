---
schema: command-experiment/v1
experiment: reentry-debuggability
case: case-308-light-stale-queue-blocker
weight: light
case_goal: "验证 queue conflict 检测: hitl2_recorded 状态下存在 stale prior-phase queue work 时，check-reentry 返回 blocker + exit 1。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-308_queue_blocker
trace: dpt_disp_case-308_queue_blocker/rb_trace.jsonl
verdict: trace-jsonl
production_distance: >
  本实验 fixture 写入预制的 rb_queue.json（含 stale wave0 queued 项）。文件由脚本生成，不涉及 Agent 搜索/判断。实验证明 Engine 的 queue conflict audit 能正确识别 prior-phase active work 并分类为 blocker。
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` disposable experiment bundle 中执行。实验结果必须来自实际 CLI 调用；禁止 mock。

# case-308-light-stale-queue-blocker

验证 `check-reentry --at hitl2_recorded` 在队列中存在 stale wave0 `queued` 项时产生 blocker + exit 1。

## Expected Runtime Path

1. 创建 disposable bundle，状态为 `hitl2_recorded`，队列含 stale `queued` wave0 项 `[MAIN/SHELL]`
2. 跑 `check-reentry --at hitl2_recorded` `[MAIN/SHELL]`
3. 验证 exit 1 + blocker 含 stale work id `[MAIN/SHELL]`
4. 从 trace 裁决 `[MAIN/SHELL]`
5. 清理 `[MAIN/SHELL]`

---

## Step 1: 创建 stale-queue 场景

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs queue_blocker --case case-308 --force)

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

# Queue — 含 stale wave0 queued 项 (writes_to 影响 gate pass condition)
cat > "$B/rb_queue.json" << 'JSON'
{
  "queue_health": "ready",
  "stop_authorization_state": "unauthorized_continue_required",
  "slot_1_current": {
    "work_id": "wave0-source-topic-a",
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
    "completion_receipt": "none",
    "failure_route": "queue_repair",
    "status": "queued",
    "preempted_from_slot": "not_applicable",
    "restore_priority": "normal",
    "created_at": "2026-01-01T00:00:00.000Z",
    "updated_at": "2026-01-01T00:00:00.000Z",
    "payload": {}
  },
  "slot_2_next": null, "slot_3_pending": null, "slot_4_pending": null, "slot_5_tail": null,
  "refill_pool": []
}
JSON

echo "research_style: quick_factual" > "$B/rb_profile.yaml"
touch "$B/rb_trace.jsonl"
mkdir -p "$B/_logs" && touch "$B/_logs/run.log"
mkdir -p "$B/seed_topics" && echo "# Topic A" > "$B/seed_topics/topic-a.md"

echo "B=$B"
```

→ 预期：bundle 创建，queue 含 stale wave0 queued 项。

---

## Step 2: 验证 blocker 检测

```bash
B= # populated from Step 1

RESULT=$(node DPT_FRAMEWORK/cli/check-reentry.mjs --bundle "$B" --at hitl2_recorded 2>&1)
EXIT=$?

echo "Exit: $EXIT"
echo "$RESULT" | grep -E '"blockers"|"queue_conflict"|"wave0' | head -10

cat > "$B/_verdict.mjs" << 'JS'
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
const __dirname = process.argv[2];
const result = JSON.parse(process.argv[3]);
const exitCode = parseInt(process.argv[4]);

const checks = [];

checks.push({
  ts: new Date().toISOString(), event: 'check',
  gate: 'exit-code-1', passed: exitCode === 1, expected: 1,
  detail: `Exit code: ${exitCode}`
});

const hasQueueBlocker = (result.blockers || []).some(b =>
  b.check === 'queue_conflict' && b.message.includes('wave0')
);
checks.push({
  ts: new Date().toISOString(), event: 'check',
  gate: 'queue-blocker-present', passed: hasQueueBlocker, expected: true,
  detail: `Queue conflict blocker found: ${hasQueueBlocker}`
});

const blockerForWave0 = (result.blockers || []).some(b =>
  b.check === 'queue_conflict' && b.detail?.phase === 'wave0' && b.detail?.work_id === 'wave0-source-topic-a'
);
checks.push({
  ts: new Date().toISOString(), event: 'check',
  gate: 'correct-work-id', passed: blockerForWave0, expected: true,
  detail: `Blocker names wave0-source-topic-a: ${blockerForWave0}`
});

checks.push({
  ts: new Date().toISOString(), event: 'check',
  gate: 'blocker-severity', passed: (result.blockers || []).every(b => b.severity === 'blocker'),
  expected: true,
  detail: 'All blockers have severity=blocker'
});

const tracePath = join(__dirname, '_logs', '_trace.jsonl');
for (const c of checks) writeFileSync(tracePath, JSON.stringify(c) + '\n', { flag: 'a' });
console.log(JSON.stringify(checks.map(c => ({ gate: c.gate, passed: c.passed }))));
JS
node "$B/_verdict.mjs" "$B" "$RESULT" "$EXIT"
```

→ 预期：exit 1，blocker 含 `wave0-source-topic-a`，`check: queue_conflict`。

---

## Step 3: 对比 — done 状态不产生 blocker

```bash
B= # populated from Step 1

# 把 stale 项改为 done
cat > "$B/rb_queue.json" << 'JSON'
{
  "queue_health": "ready",
  "stop_authorization_state": "unauthorized_continue_required",
  "slot_1_current": {
    "work_id": "wave0-source-topic-a",
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
    "completion_receipt": "none",
    "failure_route": "queue_repair",
    "status": "done",
    "preempted_from_slot": "not_applicable",
    "restore_priority": "normal",
    "created_at": "2026-01-01T00:00:00.000Z",
    "updated_at": "2026-01-01T00:00:00.000Z",
    "payload": {}
  },
  "slot_2_next": null, "slot_3_pending": null, "slot_4_pending": null, "slot_5_tail": null,
  "refill_pool": []
}
JSON

RESULT2=$(node DPT_FRAMEWORK/cli/check-reentry.mjs --bundle "$B" --at hitl2_recorded 2>&1)
EXIT2=$?

cat > "$B/_verdict_done.mjs" << 'JS'
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
  gate: 'done-no-blocker', passed: !hasQueueBlocker, expected: true,
  detail: `No queue conflict blocker for done item: ${!hasQueueBlocker}`
});
checks.push({
  ts: new Date().toISOString(), event: 'check',
  gate: 'done-warning', passed: hasQueueWarning, expected: true,
  detail: `Warning for prior-phase done item: ${hasQueueWarning}`
});

const tracePath = join(__dirname, '_logs', '_trace.jsonl');
for (const c of checks) writeFileSync(tracePath, JSON.stringify(c) + '\n', { flag: 'a' });
console.log(JSON.stringify(checks.map(c => ({ gate: c.gate, passed: c.passed }))));
JS
node "$B/_verdict_done.mjs" "$B" "$RESULT2" "$EXIT2"
```

→ 预期：done 状态不产生 blocker，仅产生 warning。

---

## Step 4: 从 trace 裁决

```bash
B= # populated from Step 1

cat > "$B/_final_verdict.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const __dirname = process.argv[2];
const tracePath = join(__dirname, '_logs', '_trace.jsonl');
const raw = readFileSync(tracePath, 'utf-8').trim();
const lines = raw.split('\n').filter(l => l.trim());
const events = lines.map(l => JSON.parse(l));
const checks = events.filter(e => e.event === 'check');
const failed = checks.filter(c => !c.passed);
const passed = checks.filter(c => c.passed);

console.log('══════ Verdict ══════');
for (const c of checks) console.log(`  ${c.passed ? 'PASS' : 'FAIL'}  ${c.gate}: ${c.detail}`);
console.log('══════════════════════');
console.log(`PASS: ${passed.length}  FAIL: ${failed.length}`);

if (failed.length > 0) { console.log('\nFAIL'); process.exit(1); }
console.log('\nPASS — stale queue detection correctly classifies active vs done prior-phase work.');
JS
node "$B/_final_verdict.mjs" "$B"
```

→ 预期：PASS。

---

## Cleanup

```bash
B= # populated from Step 1
rm -rf "$B" && echo "Cleaned up $B"
```
