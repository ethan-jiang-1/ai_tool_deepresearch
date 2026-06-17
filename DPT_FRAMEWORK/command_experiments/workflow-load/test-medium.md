# test-workflow-load-medium (中等)

验证 dependency-first 执行顺序、cache hit + 重新执行。
Bundle: `dpt_rb_test_wl_medium/`，痕迹: `_trace_wl_medium.jsonl`

```bash
B="dpt_rb_test_wl_medium"
echo $'\x1b[36m═══ Medium: Dependency chain + cache/re-execute ═══\x1b[0m'
mkdir -p $B

cat > $B/t.mjs << 'JS'
import { setTraceFile, traceInit, traceEntry, getTraceFile, traceCleanup } from '../experiments/prototype-workflow-load/trace.mjs';
import {
  loadWorkflowManifest,
  createWorkflowRuntime,
  createInitialState,
  advanceWorkflow,
} from '../experiments/prototype-workflow-load/workflow-load.mjs';
import { writeFileSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dir, '.wl-medium-tmp');
if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });

setTraceFile('dpt_rb_test_wl_medium/_trace_wl_medium.jsonl');
const SRC = 'wl-medium';
traceInit('wl-medium test', { source: SRC });

// Step 1: Chain dependency test — verify dependency-first order
const chainManifestPath = join(TMP, 'chain-workflow.json');
writeFileSync(chainManifestPath, JSON.stringify({
  name: 'wl-chain',
  steps: ['chain-entry.md'],
}));

const manifest1 = loadWorkflowManifest(chainManifestPath);
const runtime1 = createWorkflowRuntime(manifest1);
const state1 = createInitialState();

const r1 = advanceWorkflow(state1, runtime1);

const order = r1.state.executionOrder;
const policyIdx = order.indexOf('chain-policy.md');
const contextIdx = order.indexOf('chain-context.md');
const entryIdx = order.indexOf('chain-entry.md');

traceEntry('check', { source: SRC, step: 'chain-order',
  passed: policyIdx >= 0 && contextIdx >= 0 && entryIdx >= 0 && policyIdx < contextIdx && contextIdx < entryIdx,
  detail: `executionOrder: ${JSON.stringify(order)}` });
traceEntry('check', { source: SRC, step: 'chain-cursor',
  passed: runtime1.cursor === 1,
  detail: `cursor: ${runtime1.cursor}` });

// Step 2: Cache + re-execution test
const cacheManifestPath = join(TMP, 'cache-workflow.json');
writeFileSync(cacheManifestPath, JSON.stringify({
  name: 'wl-cache',
  steps: ['repeat-step1.md', 'repeat-step2.md'],
}));

const manifest2 = loadWorkflowManifest(cacheManifestPath);
const runtime2 = createWorkflowRuntime(manifest2);
let state2 = createInitialState();

// First advance loads shared-lib
const r2 = advanceWorkflow(state2, runtime2);
state2 = r2.state;

const firstReads = runtime2.receipts.filter(r => r.type === 'file_read' && r.fileRef === 'shared-lib.md');
traceEntry('check', { source: SRC, step: 'cache-first-read',
  passed: firstReads.length === 1,
  detail: `shared-lib file_read count (advance 1): ${firstReads.length}` });

// Second advance: shared-lib should be cache_hit (content cached) but still re-executed
const r3 = advanceWorkflow(state2, runtime2);
state2 = r3.state;

const cacheHits = runtime2.receipts.filter(r => r.type === 'cache_hit' && r.fileRef === 'shared-lib.md');
const totalExecs = runtime2.receipts.filter(r => r.type === 'file_executed' && r.fileRef === 'shared-lib.md');

traceEntry('check', { source: SRC, step: 'cache-hit',
  passed: cacheHits.length >= 1,
  detail: `shared-lib cache_hit count: ${cacheHits.length}` });
traceEntry('check', { source: SRC, step: 'cache-re-execute',
  passed: totalExecs.length === 2 && state2.counters.sharedLib === 2,
  detail: `shared-lib execs: ${totalExecs.length}, counter: ${state2.counters.sharedLib}` });

rmSync(TMP, { recursive: true, force: true });
JS

node $B/t.mjs > /dev/null 2>&1

cat > $B/t.mjs << 'JS'
import { readFileSync } from 'node:fs';
import { setTraceFile, getTraceFile, traceCleanup } from '../experiments/prototype-workflow-load/trace.mjs';
setTraceFile('dpt_rb_test_wl_medium/_trace_wl_medium.jsonl');
const lines = readFileSync(getTraceFile(), 'utf-8').trim().split('\n');
const events = lines.map(JSON.parse);
const checks = events.filter(e => e.event === 'check');
const passed = checks.filter(e => e.passed).length;
const failed = checks.filter(e => !e.passed).length;
console.log(`checks:${checks.length} passed:${passed} failed:${failed} total:${events.length}`);
if (failed > 0) {
  for (const c of checks.filter(e => !e.passed)) {
    console.log(`FAIL ${c.step}: ${c.detail}`);
  }
}
traceCleanup();
JS

node $B/t.mjs
rm -rf $B
echo $'\x1b[32mMedium done.\x1b[0m'
```
