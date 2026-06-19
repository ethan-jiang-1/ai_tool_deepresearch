---
schema: command-experiment/v1
experiment: wff-validation
case: simple-happy-path
weight: light
case_goal: "证明 Playbook（MD）读 Gate CLI 回答中的 next 字段来驱动 workflow——每步 CLI 告诉 Playbook 下一步是谁，Playbook 加载该 node 继续。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_wff_val_happy
trace: dpt_disp_wff_val_happy/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

Playbook 是 workflow controller。Manifest 是路由表。Playbook 从 manifest 拿到 `next` 传给 Gate CLI（`--next <phase>`）。**Gate CLI 在回答的 `check.next` 字段告诉 Playbook 下一步是谁。** Playbook 读这个值加载下一个 node——如果 CLI 回答的 next 不是预期值，立即 FAIL。

## Step 1: 创建 bundle + 加载路由表

```bash
B=$(node experiments/shared/new-disposable-bundle.mjs wff_val_happy --force)
echo "Bundle: $B"
echo ""
echo "=== 路由表 ==="
cat experiments/prototype-wff-validation/manifest.json
```

→ Playbook 记住每个 phase 对应的 gate 和 next。

---

以下 Step 2–10：Playbook 从 manifest 拿到 `gate` 和 `next`，传给 CLI。**CLI 回答的 `check.next` 就是下一步的 phase。** Playbook 读这个值，加载下一个 node。

---

## Step 2: instantiation

Playbook 查 manifest → gate=`instantiation-complete`，next=`hitl1`。传给 CLI。

```bash
cat > $B/step.mjs << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { createLogger } from '../DPT_FRAMEWORK/engine/logger.mjs';
import { createWorkflowRuntime, createState, assessNode } from '../DPT_FRAMEWORK/engine/workflow-chain.mjs';
import { spawnSync } from 'node:child_process';
const B = process.argv[2]; const node = process.argv[3]; const gate = process.argv[4]; const next = process.argv[5];
const log = createLogger({ file: B + '/_logs/run.log' });
const trace = createTrace(B + '/rb_trace.jsonl', { consoleEcho: true });
const r = assessNode(node, createState(), createWorkflowRuntime('engine', 'experiments/prototype-wff-validation/nodes'), trace);
if (r.status !== 'loaded') { console.log('FAIL: node load'); process.exit(1); }
console.log('JS回答: node loaded — ' + node);
log.info('node loaded: ' + node);
const { stdout } = spawnSync('node', ['DPT_FRAMEWORK/cli/gates/check-gate-'+gate+'.mjs', '--bundle', B, '--next', next], { encoding: 'utf-8' });
const gr = JSON.parse(stdout); trace.traceEntry('check', gr.check, { inspect: gr.inspect, advice: gr.advice });
log.info('gate ' + gr.check.gate + ' → ' + (gr.check.passed ? 'PASS' : 'FAIL') + ' next=' + gr.check.next + ' inspect=' + JSON.stringify(gr.inspect) + ' advice=' + JSON.stringify(gr.advice));
console.log('JS回答: gate — passed=' + gr.check.passed + ' next=' + gr.check.next + ' inspect=' + JSON.stringify(gr.inspect) + ' advice=' + JSON.stringify(gr.advice));
if (!gr.check.passed) { console.log('FAIL: expected PASS'); process.exit(1); }
if (gr.check.next !== next) { console.log('FAIL: expected next=' + next + ' got ' + gr.check.next); process.exit(1); }
JS
node $B/step.mjs $B "phases/phase-instantiation.md" "instantiation-complete" "phases/phase-hitl1.md"
```

→ CLI 回答：`passed=true, next=hitl1`。Playbook 读 `next` → 加载 `phase-hitl1.md`。

## Step 3: hitl1

```bash
cat > $B/step.mjs << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { createLogger } from '../DPT_FRAMEWORK/engine/logger.mjs';
import { createWorkflowRuntime, createState, assessNode } from '../DPT_FRAMEWORK/engine/workflow-chain.mjs';
import { spawnSync } from 'node:child_process';
const B = process.argv[2]; const node = process.argv[3]; const gate = process.argv[4]; const next = process.argv[5];
const log = createLogger({ file: B + '/_logs/run.log' });
const trace = createTrace(B + '/rb_trace.jsonl', { consoleEcho: true });
const r = assessNode(node, createState(), createWorkflowRuntime('engine', 'experiments/prototype-wff-validation/nodes'), trace);
if (r.status !== 'loaded') { process.exit(1); }
console.log('JS回答: node loaded — ' + node);
log.info('node loaded: ' + node);
const { stdout } = spawnSync('node', ['DPT_FRAMEWORK/cli/gates/check-gate-'+gate+'.mjs', '--bundle', B, '--next', next], { encoding: 'utf-8' });
const gr = JSON.parse(stdout); trace.traceEntry('check', gr.check, { inspect: gr.inspect, advice: gr.advice });
log.info('gate ' + gr.check.gate + ' → ' + (gr.check.passed ? 'PASS' : 'FAIL') + ' next=' + gr.check.next + ' inspect=' + JSON.stringify(gr.inspect) + ' advice=' + JSON.stringify(gr.advice));
console.log('JS回答: gate — passed=' + gr.check.passed + ' next=' + gr.check.next);
if (!gr.check.passed || gr.check.next !== next) { process.exit(1); }
JS
node $B/step.mjs $B "phases/phase-hitl1.md" "hitl1-recorded" "phases/phase-setup.md"
```

→ CLI 回答：`next=setup`。Playbook → 加载 `phase-setup.md`。

## Step 4: setup

```bash
cat > $B/step.mjs << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { createLogger } from '../DPT_FRAMEWORK/engine/logger.mjs';
import { createWorkflowRuntime, createState, assessNode } from '../DPT_FRAMEWORK/engine/workflow-chain.mjs';
import { spawnSync } from 'node:child_process';
const B = process.argv[2]; const node = process.argv[3]; const gate = process.argv[4]; const next = process.argv[5];
const log = createLogger({ file: B + '/_logs/run.log' });
const trace = createTrace(B + '/rb_trace.jsonl', { consoleEcho: true });
const r = assessNode(node, createState(), createWorkflowRuntime('engine', 'experiments/prototype-wff-validation/nodes'), trace);
if (r.status !== 'loaded') { process.exit(1); }
console.log('JS回答: node loaded — ' + node);
log.info('node loaded: ' + node);
const { stdout } = spawnSync('node', ['DPT_FRAMEWORK/cli/gates/check-gate-'+gate+'.mjs', '--bundle', B, '--next', next], { encoding: 'utf-8' });
const gr = JSON.parse(stdout); trace.traceEntry('check', gr.check, { inspect: gr.inspect, advice: gr.advice });
log.info('gate ' + gr.check.gate + ' → ' + (gr.check.passed ? 'PASS' : 'FAIL') + ' next=' + gr.check.next + ' inspect=' + JSON.stringify(gr.inspect) + ' advice=' + JSON.stringify(gr.advice));
console.log('JS回答: gate — passed=' + gr.check.passed + ' next=' + gr.check.next);
if (!gr.check.passed || gr.check.next !== next) { process.exit(1); }
JS
node $B/step.mjs $B "phases/phase-setup.md" "setup-ready" "phases/phase-wave0.md"
```

→ CLI 回答：`next=wave0`。

## Step 5: wave0

```bash
cat > $B/step.mjs << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { createLogger } from '../DPT_FRAMEWORK/engine/logger.mjs';
import { createWorkflowRuntime, createState, assessNode } from '../DPT_FRAMEWORK/engine/workflow-chain.mjs';
import { spawnSync } from 'node:child_process';
const B = process.argv[2]; const node = process.argv[3]; const gate = process.argv[4]; const next = process.argv[5];
const log = createLogger({ file: B + '/_logs/run.log' });
const trace = createTrace(B + '/rb_trace.jsonl', { consoleEcho: true });
const r = assessNode(node, createState(), createWorkflowRuntime('engine', 'experiments/prototype-wff-validation/nodes'), trace);
if (r.status !== 'loaded') { process.exit(1); }
console.log('JS回答: node loaded — ' + node);
log.info('node loaded: ' + node);
const { stdout } = spawnSync('node', ['DPT_FRAMEWORK/cli/gates/check-gate-'+gate+'.mjs', '--bundle', B, '--next', next], { encoding: 'utf-8' });
const gr = JSON.parse(stdout); trace.traceEntry('check', gr.check, { inspect: gr.inspect, advice: gr.advice });
log.info('gate ' + gr.check.gate + ' → ' + (gr.check.passed ? 'PASS' : 'FAIL') + ' next=' + gr.check.next + ' inspect=' + JSON.stringify(gr.inspect) + ' advice=' + JSON.stringify(gr.advice));
console.log('JS回答: gate — passed=' + gr.check.passed + ' next=' + gr.check.next);
if (!gr.check.passed || gr.check.next !== next) { process.exit(1); }
JS
node $B/step.mjs $B "phases/phase-wave0.md" "wave0-complete" "phases/phase-wave1.md"
```

→ `next=wave1`

## Step 6: wave1

```bash
cat > $B/step.mjs << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { createLogger } from '../DPT_FRAMEWORK/engine/logger.mjs';
import { createWorkflowRuntime, createState, assessNode } from '../DPT_FRAMEWORK/engine/workflow-chain.mjs';
import { spawnSync } from 'node:child_process';
const B = process.argv[2]; const node = process.argv[3]; const gate = process.argv[4]; const next = process.argv[5];
const log = createLogger({ file: B + '/_logs/run.log' });
const trace = createTrace(B + '/rb_trace.jsonl', { consoleEcho: true });
const r = assessNode(node, createState(), createWorkflowRuntime('engine', 'experiments/prototype-wff-validation/nodes'), trace);
if (r.status !== 'loaded') { process.exit(1); }
console.log('JS回答: node loaded — ' + node);
log.info('node loaded: ' + node);
const { stdout } = spawnSync('node', ['DPT_FRAMEWORK/cli/gates/check-gate-'+gate+'.mjs', '--bundle', B, '--next', next], { encoding: 'utf-8' });
const gr = JSON.parse(stdout); trace.traceEntry('check', gr.check, { inspect: gr.inspect, advice: gr.advice });
log.info('gate ' + gr.check.gate + ' → ' + (gr.check.passed ? 'PASS' : 'FAIL') + ' next=' + gr.check.next + ' inspect=' + JSON.stringify(gr.inspect) + ' advice=' + JSON.stringify(gr.advice));
console.log('JS回答: gate — passed=' + gr.check.passed + ' next=' + gr.check.next);
if (!gr.check.passed || gr.check.next !== next) { process.exit(1); }
JS
node $B/step.mjs $B "phases/phase-wave1.md" "wave1-complete" "phases/phase-wave2.md"
```

→ `next=wave2`

## Step 7: wave2

```bash
cat > $B/step.mjs << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { createLogger } from '../DPT_FRAMEWORK/engine/logger.mjs';
import { createWorkflowRuntime, createState, assessNode } from '../DPT_FRAMEWORK/engine/workflow-chain.mjs';
import { spawnSync } from 'node:child_process';
const B = process.argv[2]; const node = process.argv[3]; const gate = process.argv[4]; const next = process.argv[5];
const log = createLogger({ file: B + '/_logs/run.log' });
const trace = createTrace(B + '/rb_trace.jsonl', { consoleEcho: true });
const r = assessNode(node, createState(), createWorkflowRuntime('engine', 'experiments/prototype-wff-validation/nodes'), trace);
if (r.status !== 'loaded') { process.exit(1); }
console.log('JS回答: node loaded — ' + node);
log.info('node loaded: ' + node);
const { stdout } = spawnSync('node', ['DPT_FRAMEWORK/cli/gates/check-gate-'+gate+'.mjs', '--bundle', B, '--next', next], { encoding: 'utf-8' });
const gr = JSON.parse(stdout); trace.traceEntry('check', gr.check, { inspect: gr.inspect, advice: gr.advice });
log.info('gate ' + gr.check.gate + ' → ' + (gr.check.passed ? 'PASS' : 'FAIL') + ' next=' + gr.check.next + ' inspect=' + JSON.stringify(gr.inspect) + ' advice=' + JSON.stringify(gr.advice));
console.log('JS回答: gate — passed=' + gr.check.passed + ' next=' + gr.check.next);
if (!gr.check.passed || gr.check.next !== next) { process.exit(1); }
JS
node $B/step.mjs $B "phases/phase-wave2.md" "wave2-complete" "phases/phase-hitl2.md"
```

→ `next=hitl2`

## Step 8: hitl2

```bash
cat > $B/step.mjs << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { createLogger } from '../DPT_FRAMEWORK/engine/logger.mjs';
import { createWorkflowRuntime, createState, assessNode } from '../DPT_FRAMEWORK/engine/workflow-chain.mjs';
import { spawnSync } from 'node:child_process';
const B = process.argv[2]; const node = process.argv[3]; const gate = process.argv[4]; const next = process.argv[5];
const log = createLogger({ file: B + '/_logs/run.log' });
const trace = createTrace(B + '/rb_trace.jsonl', { consoleEcho: true });
const r = assessNode(node, createState(), createWorkflowRuntime('engine', 'experiments/prototype-wff-validation/nodes'), trace);
if (r.status !== 'loaded') { process.exit(1); }
console.log('JS回答: node loaded — ' + node);
log.info('node loaded: ' + node);
const { stdout } = spawnSync('node', ['DPT_FRAMEWORK/cli/gates/check-gate-'+gate+'.mjs', '--bundle', B, '--next', next], { encoding: 'utf-8' });
const gr = JSON.parse(stdout); trace.traceEntry('check', gr.check, { inspect: gr.inspect, advice: gr.advice });
log.info('gate ' + gr.check.gate + ' → ' + (gr.check.passed ? 'PASS' : 'FAIL') + ' next=' + gr.check.next + ' inspect=' + JSON.stringify(gr.inspect) + ' advice=' + JSON.stringify(gr.advice));
console.log('JS回答: gate — passed=' + gr.check.passed + ' next=' + gr.check.next);
if (!gr.check.passed || gr.check.next !== next) { process.exit(1); }
JS
node $B/step.mjs $B "phases/phase-hitl2.md" "hitl2-recorded" "phases/phase-readiness.md"
```

→ `next=readiness`

## Step 9: readiness

```bash
cat > $B/step.mjs << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { createLogger } from '../DPT_FRAMEWORK/engine/logger.mjs';
import { createWorkflowRuntime, createState, assessNode } from '../DPT_FRAMEWORK/engine/workflow-chain.mjs';
import { spawnSync } from 'node:child_process';
const B = process.argv[2]; const node = process.argv[3]; const gate = process.argv[4]; const next = process.argv[5];
const log = createLogger({ file: B + '/_logs/run.log' });
const trace = createTrace(B + '/rb_trace.jsonl', { consoleEcho: true });
const r = assessNode(node, createState(), createWorkflowRuntime('engine', 'experiments/prototype-wff-validation/nodes'), trace);
if (r.status !== 'loaded') { process.exit(1); }
console.log('JS回答: node loaded — ' + node);
log.info('node loaded: ' + node);
const { stdout } = spawnSync('node', ['DPT_FRAMEWORK/cli/gates/check-gate-'+gate+'.mjs', '--bundle', B, '--next', next], { encoding: 'utf-8' });
const gr = JSON.parse(stdout); trace.traceEntry('check', gr.check, { inspect: gr.inspect, advice: gr.advice });
log.info('gate ' + gr.check.gate + ' → ' + (gr.check.passed ? 'PASS' : 'FAIL') + ' next=' + gr.check.next + ' inspect=' + JSON.stringify(gr.inspect) + ' advice=' + JSON.stringify(gr.advice));
console.log('JS回答: gate — passed=' + gr.check.passed + ' next=' + gr.check.next);
if (!gr.check.passed || gr.check.next !== next) { process.exit(1); }
JS
node $B/step.mjs $B "phases/phase-readiness.md" "readiness-passed" "phases/phase-final.md"
```

→ `next=final`

## Step 10: final（无 gate，终止）

```bash
cat > $B/step.mjs << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { createWorkflowRuntime, createState, assessNode } from '../DPT_FRAMEWORK/engine/workflow-chain.mjs';
const B = process.argv[2];
const trace = createTrace(B + '/rb_trace.jsonl', { consoleEcho: true });
const r = assessNode('phases/phase-final.md', createState(), createWorkflowRuntime('engine', 'experiments/prototype-wff-validation/nodes'), trace);
if (r.status !== 'loaded') { process.exit(1); }
console.log('JS回答: node loaded — phases/phase-final.md — no gate, lifecycle complete');
log.info('node loaded: phases/phase-final.md — no gate, lifecycle complete');
log.info('node loaded: ' + node);
JS
node $B/step.mjs $B
```

→ manifest gate=null, next=null。Lifecycle 终止。

---

## Step 11: trace 裁决

```bash
cat > $B/verify.mjs << 'JS'
import { readFileSync } from 'node:fs';
const B = process.argv[2];
const events = readFileSync(B + '/rb_trace.jsonl', 'utf-8').trim().split('\n').map(JSON.parse);
const loads = events.filter(e => e.event === 'load_start');
const checks = events.filter(e => e.event === 'check');
const failed = checks.filter(e => !e.passed);

console.log('phase loads: ' + loads.length);
loads.forEach(e => console.log('  ' + e.entry));
console.log('gate checks: ' + checks.length + ' (' + checks.filter(e=>e.passed).length + ' PASS, ' + failed.length + ' FAIL)');
checks.forEach(e => console.log('  ' + e.gate + ' → ' + (e.passed ? 'PASS' : 'FAIL') + ' next=' + (e.next || 'null')));

let ok = true;
if (loads.length < 9) { console.log('\x1b[31mFAIL: expected >=9 loads\x1b[0m'); ok = false; }
if (checks.length < 8) { console.log('\x1b[31mFAIL: expected >=8 checks\x1b[0m'); ok = false; }
if (failed.length > 0) { console.log('\x1b[31mFAIL: ' + failed.length + ' checks failed\x1b[0m'); ok = false; }
if (!ok) process.exit(1);
console.log('\n\x1b[32mALL VERIFICATIONS PASSED\x1b[0m');
JS
node $B/verify.mjs $B
```

## Cleanup

```bash
rm -rf dpt_disp_wff_val_happy_*
```
