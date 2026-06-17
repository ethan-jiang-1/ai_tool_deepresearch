# test-workflow-load-complex (复杂)

验证 missing/cycle 错误行为、cursor 不前进、修正后可继续成功 advance。
Bundle: `dpt_rb_test_wl_complex/`，痕迹: `_trace_wl_complex.jsonl`

```bash
B="dpt_rb_test_wl_complex"
echo $'\x1b[36m═══ Complex: Error paths + recovery ═══\x1b[0m'
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
const TMP = join(__dir, '.wl-complex-tmp');
if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });

setTraceFile('dpt_rb_test_wl_complex/_trace_wl_complex.jsonl');
const SRC = 'wl-complex';
traceInit('wl-complex test', { source: SRC });

// Step 1: Missing dependency test
const missingPath = join(TMP, 'missing-workflow.json');
writeFileSync(missingPath, JSON.stringify({
  name: 'wl-missing',
  steps: ['missing-entry.md'],
}));

const m1 = loadWorkflowManifest(missingPath);
const rt1 = createWorkflowRuntime(m1);
const st1 = createInitialState();

const r1 = advanceWorkflow(st1, rt1);

traceEntry('check', { source: SRC, step: 'missing-status',
  passed: r1.status === 'error',
  detail: `status: ${r1.status}` });
traceEntry('check', { source: SRC, step: 'missing-cursor',
  passed: rt1.cursor === 0,
  detail: `cursor after error: ${rt1.cursor}` });
traceEntry('check', { source: SRC, step: 'missing-msg',
  passed: r1.error && (r1.error.includes('nonexistent-file.md') || r1.error.includes('File not found')),
  detail: `error: ${r1.error}` });
traceEntry('check', { source: SRC, step: 'missing-no-exec',
  passed: rt1.receipts.filter(r => r.type === 'file_executed').length === 0,
  detail: `file_executed count: ${rt1.receipts.filter(r => r.type === 'file_executed').length}` });

// Step 2: Cycle dependency test
const cyclePath = join(TMP, 'cycle-workflow.json');
writeFileSync(cyclePath, JSON.stringify({
  name: 'wl-cycle',
  steps: ['cycle-a.md'],
}));

const m2 = loadWorkflowManifest(cyclePath);
const rt2 = createWorkflowRuntime(m2);
const st2 = createInitialState();

const r2 = advanceWorkflow(st2, rt2);

traceEntry('check', { source: SRC, step: 'cycle-status',
  passed: r2.status === 'error',
  detail: `status: ${r2.status}` });
traceEntry('check', { source: SRC, step: 'cycle-cursor',
  passed: rt2.cursor === 0,
  detail: `cursor after error: ${rt2.cursor}` });
traceEntry('check', { source: SRC, step: 'cycle-msg',
  passed: r2.error && r2.error.includes('cycle') && r2.error.includes('cycle-a.md'),
  detail: `error: ${r2.error}` });
traceEntry('check', { source: SRC, step: 'cycle-no-exec',
  passed: rt2.receipts.filter(r => r.type === 'file_executed').length === 0,
  detail: `file_executed count: ${rt2.receipts.filter(r => r.type === 'file_executed').length}` });

// Step 3: Recovery — after cycle error, use a valid manifest and succeed
const validPath = join(TMP, 'valid-workflow.json');
writeFileSync(validPath, JSON.stringify({
  name: 'wl-valid',
  steps: ['wave-entry.md'],
}));

const m3 = loadWorkflowManifest(validPath);
const rt3 = createWorkflowRuntime(m3);
const st3 = createInitialState();

const r3 = advanceWorkflow(st3, rt3);

traceEntry('check', { source: SRC, step: 'recovery-status',
  passed: r3.status === 'advanced',
  detail: `status: ${r3.status}` });
traceEntry('check', { source: SRC, step: 'recovery-exec',
  passed: r3.state.executionOrder.includes('wave-entry.md'),
  detail: `executionOrder: ${JSON.stringify(r3.state.executionOrder)}` });

// Step 4: Malformed JSON frontmatter test
const malformedPath = join(TMP, 'malformed-workflow.json');
writeFileSync(malformedPath, JSON.stringify({
  name: 'wl-malformed',
  steps: ['malformed-entry.md'],
}));

const m4 = loadWorkflowManifest(malformedPath);
const rt4 = createWorkflowRuntime(m4);
const st4 = createInitialState();

const r4 = advanceWorkflow(st4, rt4);

traceEntry('check', { source: SRC, step: 'malformed-status',
  passed: r4.status === 'error',
  detail: `status: ${r4.status}` });
traceEntry('check', { source: SRC, step: 'malformed-cursor',
  passed: rt4.cursor === 0,
  detail: `cursor after error: ${rt4.cursor}` });
traceEntry('check', { source: SRC, step: 'malformed-msg',
  passed: r4.error && (r4.error.includes('Malformed JSON') || r4.error.includes('JSON')),
  detail: `error: ${r4.error}` });

rmSync(TMP, { recursive: true, force: true });
JS

node $B/t.mjs > /dev/null 2>&1

cat > $B/t.mjs << 'JS'
import { readFileSync } from 'node:fs';
import { setTraceFile, getTraceFile, traceCleanup } from '../experiments/prototype-workflow-load/trace.mjs';
setTraceFile('dpt_rb_test_wl_complex/_trace_wl_complex.jsonl');
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
echo $'\x1b[32mComplex done.\x1b[0m'
```
