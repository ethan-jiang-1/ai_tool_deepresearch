---
schema: command-experiment/v1
experiment: engine-boundary
case: case-405-light-trace-single-sink
weight: light
case_goal: "验证当前 framework/playbook trace 写入路径只写 bundle 根 rb_trace.jsonl，并且 disposable bundle 内不存在旧 trace JSONL sink。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-405_eb_trace
trace: dpt_disp_case-405_eb_trace/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

fixture-backed、无 Agent actor、无外部调用。必须触发当前 trace API、Queue CLI trace、Relay commit trace，并从 `rb_trace.jsonl` 与文件系统裁决；禁止写任何非 canonical trace JSONL。

# case-405-light-trace-single-sink

验证 trace 单 sink：所有当前 runtime/playbook trace event 都进入 bundle 根 `rb_trace.jsonl`。

---

## Step 1: 创建 Bundle

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs eb_trace --case case-405 --force)
echo "Bundle: $B"
```

---

## Step 2: 触发当前 trace 写入路径

```bash
cat > "$B/run-trace-paths.mjs" << 'JS'
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const B = path.resolve(process.argv[2]);
const REPO = process.cwd();
const tracePath = path.join(B, 'rb_trace.jsonl');
const traceMod = await import(pathToFileURL(path.join(REPO, 'DPT_FRAMEWORK/engine/trace.mjs')));
const relay = await import(pathToFileURL(path.join(REPO, 'DPT_FRAMEWORK/engine/subagent-relay.mjs')));

function record(passed, detail, extra = {}) {
  appendFileSync(tracePath, JSON.stringify({
    ts: new Date().toISOString(),
    event: 'check',
    source: 'case-405',
    gate: 'trace-single-sink',
    passed,
    expected: true,
    detail,
    ...extra,
  }) + '\n');
}

function runNode(args) {
  return execFileSync(process.execPath, args, { cwd: REPO, encoding: 'utf-8', stdio: 'pipe' });
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

// Current trace API path.
const trace = traceMod.createTrace(tracePath, { consoleEcho: false });
trace.traceEntry('check', { source: 'case-405-api', gate: 'trace-api', passed: true, expected: true, detail: 'createTrace writes rb_trace.jsonl' });

// Queue CLI path.
writeFileSync(path.join(B, 'rb_status.json'), JSON.stringify({
  current_gate: 'wave0_complete',
  next_gate: 'wave1_complete',
  current_mode: 'execution',
  state: 'in_progress',
}) + '\n');
writeFileSync(path.join(B, 'task.json'), JSON.stringify({
  work_id: 'case405-queue',
  title: 'Trace queue path',
  targets: { controller: 'main-agent' },
  action: 'complete a non-delegated queue item',
  producer_rule: 'case405',
  lineage: {},
  priority_class: 'P5_new_reference_intake',
  required_receipts: ['none'],
  done_condition: 'done',
  verification: { engine: [], agent: [] },
  writes_to: [],
  status_sync: [],
  completion_receipt: 'none',
  failure_route: 'test',
  payload: {},
}));
runNode(['DPT_FRAMEWORK/cli/operate-queue.mjs', 'enqueue', B, '--task', path.join(B, 'task.json')]);
runNode(['DPT_FRAMEWORK/cli/operate-queue.mjs', 'claim', B, '--actor', 'main-agent']);
writeFileSync(path.join(B, 'result.json'), JSON.stringify({ work_id: 'case405-queue', receipt: 'none', summary: 'done' }));
runNode(['DPT_FRAMEWORK/cli/operate-queue.mjs', 'complete', B, '--result', path.join(B, 'result.json')]);

// Relay commit path.
const slot = relay.createSlot({
  key: 'case405-relay',
  slotIndex: 0,
  roleAgentKey: 'dpt-source-intake',
  taskDescription: 'trace single sink relay path',
}, 1);
mkdirSync(path.join(B, path.dirname(slot.resultPath)), { recursive: true });
relay.writeSlotStatus(slot, 'running', B);
writeFileSync(path.join(B, slot.receiptPath), [
  JSON.stringify({ event: 'agent_runtime_started', slotKey: slot.key, roleAgentKey: slot.roleAgentKey, receiptNonce: slot.receiptNonce }),
  JSON.stringify({ event: 'agent_result_ready', slotKey: slot.key, roleAgentKey: slot.roleAgentKey, receiptNonce: slot.receiptNonce }),
].join('\n') + '\n');
mkdirSync(path.join(B, 'reference'), { recursive: true });
writeFileSync(path.join(B, 'reference/case405.md'), '---\nsource_url: https://trace-source.test/article\n---\n## Key Facts\nTrace single sink fixture.\n');
const cacheLeaf = '_cache/wave0/primary/case405/s01_trace';
mkdirSync(path.join(B, cacheLeaf), { recursive: true });
writeFileSync(path.join(B, cacheLeaf, 'websearch.json'), '[]');
writeFileSync(path.join(B, cacheLeaf, 'page.md'), '# Page\n');
writeFileSync(path.join(B, cacheLeaf, 'meta.json'), JSON.stringify({ url: 'https://trace-source.test/article' }));
const committed = relay.commitSlotResult(slot, B, {
  slotKey: slot.key,
  roleAgentKey: slot.roleAgentKey,
  status: 'done',
  summary: 'trace relay path',
  evidenceCount: 1,
  references: [{ title: 'Trace', url: 'https://trace-source.test/article', quote: '', relevance: 'fixture' }],
  confidence: 0.9,
  notes: [],
  output_files: [{ path: 'reference/case405.md', role: 'reference', source_url: 'https://trace-source.test/article' }],
  cache_trails: [`${cacheLeaf}/`],
}, { platform: 'fixture', runtimeMode: 'unknown', runtimeAgentId: 'case405-fixture' });
record(committed.ok === true, 'Relay commit writes current trace path');

const events = readFileSync(tracePath, 'utf-8').trim().split('\n').filter(Boolean).map(JSON.parse);
record(events.some((e) => e.source === 'case-405-api'), 'trace API event found in rb_trace.jsonl');
record(events.some((e) => e.event === 'queue_completed' && e.work_id === 'case405-queue'), 'Queue CLI event found in rb_trace.jsonl');
record(events.some((e) => e.event === 'agent_result_received' && e.key === 'case405-relay'), 'Relay event found in rb_trace.jsonl');

const oldTraceName = String.raw`(^|/)_tr` + String.raw`ace(?:[_.-].*)?\.jsonl$`;
const badTraceFiles = walk(B)
  .map((file) => path.relative(B, file))
  .filter((rel) => rel !== 'rb_trace.jsonl')
  .filter((rel) => new RegExp(`${oldTraceName}|_tr` + `ace_agq_cli|_tr` + `ace_subagent|rbrb_tr` + `ace`).test(rel));
record(badTraceFiles.length === 0, 'No non-canonical trace JSONL sink exists in disposable bundle', { badTraceFiles });
console.log('case-405 trace paths completed');
JS

node "$B/run-trace-paths.mjs" "$B"
```

→ 预期：`case-405 trace paths completed`。

---

## Step 3: 从 Trace 裁决

```bash
cat > "$B/verdict.mjs" << 'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const B = process.argv[2];
const events = readFileSync(path.join(B, 'rb_trace.jsonl'), 'utf-8').trim().split('\n').filter(Boolean).map(JSON.parse);
const checks = events.filter((e) => e.event === 'check' && (e.source === 'case-405' || e.source === 'case-405-api'));
const failed = checks.filter((c) => c.passed !== true);
const ok = checks.length >= 6 && failed.length === 0;
writeFileSync(path.join(B, 'case-405-verdict.json'), JSON.stringify({ ok, checks: checks.length, failed: failed.length }, null, 2));
console.log(`checks: ${checks.length}, failed: ${failed.length}`);
for (const f of failed) console.log(`FAIL ${f.gate}: ${f.detail}`);
console.log(ok ? '\x1b[32mCASE-405 PASS\x1b[0m' : '\x1b[31mCASE-405 FAIL\x1b[0m');
if (!ok) process.exit(1);
JS
node "$B/verdict.mjs" "$B"
```

→ 预期：`CASE-405 PASS`。

---

## Step 4: PASS-only 清理

```bash
if node -e "const fs=require('fs'); const p=process.argv[1] + '/case-405-verdict.json'; process.exit(JSON.parse(fs.readFileSync(p, 'utf8')).ok ? 0 : 1)" "$B"; then
  rm -rf "$B"
  echo "✓ Cleaned up after PASS."
else
  echo "FAIL preserved for inspection: $B"
  exit 1
fi
```
