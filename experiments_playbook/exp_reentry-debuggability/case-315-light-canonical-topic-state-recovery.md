---
schema: command-experiment/v1
experiment: reentry-debuggability
case: case-315-light-canonical-topic-state-recovery
weight: light
case_goal: "验证 canonical topic add 的 plan-first crash、queue no-write blocker、单一 exact recover action 与恢复后的 UID-bound state，并证明 status/trace/profile 零 mutation。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-315_topic_state
trace: dpt_disp_case-315_topic_state/rb_trace.jsonl
verdict: trace-jsonl
production_distance: >
  使用 new-disposable-bundle、production topic-state helper crash hook、operate-topic-state 与 operate-queue CLI。
  只证明 canonical add、accepted workspace recovery、queue preflight 和 direct progress projection；不覆盖 C3B layout mutation、post-final override 或 state jump。
---

## Execution Contract

由 coding agent 逐 step 执行。禁止手改 canonical registry/seed 来伪造恢复、绕过 accepted workspace，或修改 control authority 制造 PASS。

# Case 315 — Canonical Topic-State Recovery

## Goal

On one real disposable bundle, prove canonical add is materialized before work, a plan-first crash exposes one exact recover action, queue preflight blocks during the accepted workspace, and recovery restores one UID-bound topic without mutating status/trace/profile.

## Step 1 — Create and enter HITL1

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs case-315-topic-state --force)
node DPT_FRAMEWORK/cli/gates/check-gate-instantiation-complete.mjs --bundle "$B" --current-node phases/phase-instantiation.md > /tmp/case315-inst.json
NEXT=$(node -e 'const x=JSON.parse(require("fs").readFileSync("/tmp/case315-inst.json"));process.stdout.write(x.check.next)')
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle "$B" --node "$NEXT" >/tmp/case315-hitl1.md
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "$B" --to hitl1_recorded >/tmp/case315-status.json
```

## Step 2 — Retain input and inject plan-first crash

```bash
cat > /tmp/case315-topic-input.json <<'JSON'
{"context":"hitl1","actions":[{"action":"add_topic","title":"Crash-safe canonical topic","slug_stem":"crash-safe-canonical-topic","must_answer":["Can canonical intent survive a plan-first crash?"],"scope_role":"primary","depends_on_topic_uids":[]}]}
JSON
B="$B" node --input-type=module <<'JS'
import { readFileSync } from 'node:fs';
import { applyCanonicalTopicState } from './DPT_FRAMEWORK/engine/helpers/canonical-topic-state.mjs';
try { applyCanonicalTopicState({ bundlePath: process.env.B, input: JSON.parse(readFileSync('/tmp/case315-topic-input.json')), crashAt: 'after_plan' }); }
catch (error) { if (!/after_plan/.test(error.message)) throw error; }
JS
```

## Step 3 — Inspect exact recovery and queue no-write blocker

```bash
node DPT_FRAMEWORK/cli/operate-topic-state.mjs inspect --bundle "$B" > /tmp/case315-inspect.json || test $? -eq 1
OP=$(node -e 'const x=JSON.parse(require("fs").readFileSync("/tmp/case315-inspect.json"));process.stdout.write(x.blockers[0].operation_id)')
cat > /tmp/case315-task.json <<'JSON'
{"queue_item_id":"wave0-source-01_crash-safe-canonical-topic","title":"blocked while seed pending","targets":{"controller":"main-agent"},"action":"do not enqueue before recovery","producer_rule":"source_intake","lineage":{"topic_slug":"01_crash-safe-canonical-topic"},"priority_class":"P5_new_reference_intake","required_receipts":[],"done_condition":"blocked","verification":{"engine":[],"agent":[]},"writes_to":[],"status_sync":[],"completion_receipt":null,"failure_route":"topic-state recover","status":"queued","restore_priority":"normal","payload":{"topic_slug":"01_crash-safe-canonical-topic"}}
JSON
node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue "$B" --task /tmp/case315-task.json > /tmp/case315-enqueue-blocked.json || test $? -eq 1
```

## Step 4 — Recover, inspect, and enqueue

```bash
node DPT_FRAMEWORK/cli/operate-topic-state.mjs recover --bundle "$B" --operation-id "$OP" > /tmp/case315-recover.json
node DPT_FRAMEWORK/cli/operate-topic-state.mjs inspect --bundle "$B" > /tmp/case315-clean.json
node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue "$B" --task /tmp/case315-task.json > /tmp/case315-enqueue.json
```

## Verdict

```bash
B="$B" node --input-type=module <<'JS'
import { readFileSync } from 'node:fs';
const json = (path) => JSON.parse(readFileSync(path));
const blocked = json('/tmp/case315-enqueue-blocked.json');
const recovered = json('/tmp/case315-recover.json');
const clean = json('/tmp/case315-clean.json');
const queued = json('/tmp/case315-enqueue.json');
const status = json(`${process.env.B}/rb_status.json`);
const pass = blocked.ok === false && blocked.reason_code === 'accepted_workspace'
  && recovered.verdict === 'committed' && clean.passed === true
  && clean.topics.length === 1 && clean.topics[0].state === 'not_started'
  && queued.ok === true && status.current_node === 'phases/phase-hitl1.md';
console.log(pass ? 'PASS' : 'FAIL');
if (!pass) process.exit(1);
JS
```

## Cleanup

```bash
rm -rf "$B" /tmp/case315-*.json /tmp/case315-hitl1.md
```
