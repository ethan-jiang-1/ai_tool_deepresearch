---
schema: command-experiment/v1
experiment: gate-loop
case: medium
weight: light
case_goal: "验证 MD PDCA 回路：checkGate fail → MD 读 say/errors 修复 → retry checkGate → pass。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_gl_medium
trace: dpt_disp_gl_medium/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` bundle 中执行。实验结果必须来自实际文件写入、Engine 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# test-gate-loop-medium

验证 MD 拥有的 PDCA 回路：Engine 返回 fail → MD 读 `say`/`errors` 修复 → 重调 checkGate → 直到 pass。

## Expected Runtime Path

1. 创建 DPT run bundle，validate + inspect
2. 初始化 trace
3. PDCA: check fail → MD repair → retry → pass
4. PDCA: schema fail → MD fix field → retry → pass
5. PDCA: blocked → MD escalate
6. 读 trace 裁决
7. 清理

---

## Step 1: 创建 Run Bundle

```bash
B=$(node experiments/shared/new-disposable-bundle.mjs gl_medium --force)
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B
node DPT_FRAMEWORK/cli/inspect-bundle.mjs $B
```

→ 预期：validate 5/5 passed。

---

## Step 2: 初始化 Trace

```bash

cat > "$B/t.mjs" << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const trace = createTrace(__dirname + '/_trace.jsonl');
trace.traceInit('gl-playbook/medium', { source: 'gl-playbook/medium' });
JS
node "$B/t.mjs" > /dev/null 2>&1
```

---

## Step 3: PDCA 回路

```bash

cat > "$B/t.mjs" << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const trace = createTrace(__dirname + '/_trace.jsonl');
import { z } from 'zod';
import { checkGate } from '../DPT_FRAMEWORK/engine/gate-loop.mjs';

const SRC = 'gl-playbook/medium';

const StateSchema = z.object({
  ref_count: z.number(),
  ref_floor: z.number(),
  topicReadiness: z.enum(['ready', 'not_ready', 'blocked']),
});

const RULES = [
  { key: 'bad_state', schema: StateSchema,                              say: 'state 结构不合法' },
  { key: 'blocked',   check:  s => s.topicReadiness === 'blocked',      say: 'topic 被阻塞' },
  { key: 'low_refs',  check:  s => s.ref_count < s.ref_floor,           say: 'ref_count 不足' },
];

// --- Case 1: check fail → MD repair → retry → pass ---
let state = { ref_count: 2, ref_floor: 5, topicReadiness: 'ready' };
let r = checkGate(state, RULES, 'wave0');

trace.traceEntry('check', {
  source: SRC, step: 'case1_fail',
  passed: r.passed === false && r.say.includes('ref_count')
});

// MD reads say: "ref_count 不足" → repairs: add references
let iterations = 0;
while (!r.passed && iterations < 5) {
  state = { ...state, ref_count: state.ref_count + 2 };
  r = checkGate(state, RULES, 'wave0');
  iterations++;
}

trace.traceEntry('check', {
  source: SRC, step: 'case1_pass',
  passed: r.passed === true && r.next === 'wave0' && iterations >= 1
});

// --- Case 2: immediate pass ---
r = checkGate(
  { ref_count: 5, ref_floor: 5, topicReadiness: 'ready' },
  RULES, 'done'
);
trace.traceEntry('check', {
  source: SRC, step: 'case2_immediate',
  passed: r.passed === true && r.next === 'done'
});

// --- Case 3: schema fail → MD fix → retry ---
let bad = { ref_count: 'bad', ref_floor: 5, topicReadiness: 'ready' };
r = checkGate(bad, RULES);
trace.traceEntry('check', {
  source: SRC, step: 'case3_schema_fail',
  passed: r.passed === false && r.errors[0].field === 'ref_count'
});

// MD reads errors[0].field === 'ref_count' → fixes field type
bad = { ...bad, ref_count: 5 };
r = checkGate(bad, RULES, 'recovered');
trace.traceEntry('check', {
  source: SRC, step: 'case3_recovered',
  passed: r.passed === true && r.next === 'recovered'
});

// --- Case 4: blocked → MD escalate ---
r = checkGate(
  { ref_count: 5, ref_floor: 5, topicReadiness: 'blocked' },
  RULES, 'wave0'
);
trace.traceEntry('check', {
  source: SRC, step: 'case4_blocked',
  passed: r.passed === false && r.say.includes('阻塞')
});
JS
node "$B/t.mjs" > /dev/null 2>&1
```

→ 预期：6 check 全 passed。

---

## Step 4: 从 Trace 裁决

```bash

cat > "$B/t.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const trace = createTrace(__dirname + '/_trace.jsonl');
const raw = readFileSync(trace.traceFilePath(), 'utf-8').trim();
const events = JSON.parse('[' + raw.split('\n').join(',') + ']');
const checks = events.filter(x => x.event === 'check');
const passed = checks.filter(x => x.passed === true).length;
const failed = checks.filter(x => x.passed !== true).length;
console.log('checks:' + checks.length + ' passed:' + passed + ' failed:' + failed);
const ok = checks.length >= 6 && failed === 0;
console.log(ok ? '\x1b[32mMEDIUM PASS\x1b[0m' : '\x1b[31mMEDIUM FAIL\x1b[0m');
if (!ok) process.exit(1);
trace.traceCleanup();
JS
node "$B/t.mjs"
```

→ 预期：`checks >= 6, failed = 0`，MEDIUM PASS。

---

## Step 5: 清理

```bash
rm -rf dpt_disp_gl_*
echo "✓ Cleaned up."
```
