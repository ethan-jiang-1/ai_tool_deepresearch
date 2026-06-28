---
schema: command-experiment/v1
experiment: gate-loop
case: case-23-standard-full-pipeline
weight: light
case_goal: "验证 checkGate 全组合：多规则优先级、schema/check/blocked 三种 fail、MD PDCA 回路。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-23_gl_complex
trace: dpt_disp_case-23_gl_complex/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` bundle 中执行。实验结果必须来自实际文件写入、Engine 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# case-23-standard-full-pipeline

验证 checkGate 全功能：规则优先级、三种 fail 模式（schema/check/blocked）、MD PDCA 回路。

## Expected Runtime Path

1. 创建 DPT run bundle，validate + inspect
2. 初始化 trace
3. 规则优先级：schema > blocked > low_refs
4. Schema fail → MD fix → retry → check fail → MD repair → pass
5. Blocked → escalate
6. 读 trace 裁决
7. 清理

---

## Step 1: 创建 Run Bundle

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs gl_complex --case case-23 --force)
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B
node DPT_FRAMEWORK/cli/inspect-bundle.mjs $B
```

→ 预期：validate 5/5 passed。

---

## Step 2: 初始化 Trace

```bash

cat > "$B/t.mjs" << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);
const trace = createTrace(__dirname + '/rb_trace.jsonl');
trace.traceInit('gl-playbook/complex', { source: 'gl-playbook/complex' });
JS
node "$B/t.mjs" > /dev/null 2>&1
```

---

## Step 3: 规则优先级 + schema fail → fix → check fail → repair → pass

```bash

cat > "$B/t.mjs" << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
import { z } from 'zod';
import { checkGate } from '../DPT_FRAMEWORK/engine/gate-loop.mjs';

const __dirname = esmDirname(import.meta.url);
const trace = createTrace(__dirname + '/rb_trace.jsonl');

const SRC = 'gl-playbook/complex';

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

// schema catches bad field first (even if check would also fail)
let r = checkGate(
  { ref_count: 'bad', ref_floor: 5, topicReadiness: 'blocked' },
  RULES
);
trace.traceEntry('check', {
  source: SRC, step: 'schema_first',
  passed: r.passed === false && r.say === 'state 结构不合法' && r.errors[0].field === 'ref_count'
});

// blocked beats low_refs (priority)
r = checkGate(
  { ref_count: 2, ref_floor: 5, topicReadiness: 'blocked' },
  RULES
);
trace.traceEntry('check', {
  source: SRC, step: 'blocked_priority',
  passed: r.passed === false && r.say.includes('阻塞')
});

// Phase 1: schema fail → MD fix
let state = { ref_count: 'bad', ref_floor: 5, topicReadiness: 'ready' };
r = checkGate(state, RULES);
trace.traceEntry('check', {
  source: SRC, step: 'schema_fail',
  passed: r.passed === false && r.errors[0].field === 'ref_count'
});

// MD reads errors → fixes field type → now triggers low_refs
state = { ...state, ref_count: 2 };
r = checkGate(state, RULES);
trace.traceEntry('check', {
  source: SRC, step: 'after_fix',
  passed: r.passed === false && r.say.includes('ref_count')
});

// Phase 2: check fail → MD repair in PDCA loop → pass
let iterations = 0;
while (!r.passed && iterations < 5) {
  state = { ...state, ref_count: state.ref_count + 2 };
  r = checkGate(state, RULES, 'wave0');
  iterations++;
}
trace.traceEntry('check', {
  source: SRC, step: 'pdca_pass',
  passed: r.passed === true && r.next === 'wave0' && iterations >= 1
});

// Phase 3: blocked → escalate
r = checkGate(
  { ref_count: 5, ref_floor: 5, topicReadiness: 'blocked' },
  RULES, 'next_step'
);
trace.traceEntry('check', {
  source: SRC, step: 'blocked_escalate',
  passed: r.passed === false && r.say.includes('阻塞')
});

// Custom rules (meta — engine knows nothing about domain)
const CUSTOM = [
  { key: 'urgent', check: s => s.severity === 'critical', say: '紧急情况' },
];
r = checkGate({ severity: 'critical' }, CUSTOM);
trace.traceEntry('check', {
  source: SRC, step: 'custom',
  passed: r.passed === false && r.say === '紧急情况'
});
JS
node "$B/t.mjs" > /dev/null 2>&1
```

→ 预期：7 check 全 passed。

---

## Step 4: 从 Trace 裁决

```bash

cat > "$B/t.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);
const trace = createTrace(__dirname + '/rb_trace.jsonl');
const raw = readFileSync(trace.traceFilePath(), 'utf-8').trim();
const events = JSON.parse('[' + raw.split('\n').join(',') + ']');
const checks = events.filter(x => x.event === 'check');
const passed = checks.filter(x => x.passed === true).length;
const failed = checks.filter(x => x.passed !== true).length;
console.log('checks:' + checks.length + ' passed:' + passed + ' failed:' + failed);
const ok = checks.length >= 7 && failed === 0;
console.log(ok ? '\x1b[32mCOMPLEX PASS\x1b[0m' : '\x1b[31mCOMPLEX FAIL\x1b[0m');
if (!ok) process.exit(1);
trace.traceCleanup();
JS
node "$B/t.mjs"
```

→ 预期：`checks >= 7, failed = 0`，COMPLEX PASS。

---


## Step 5: 结果解读

> 7 个 check，验证 checkGate 全组合（优先级 + PDCA）：
>   [schema_first] schema fail 优先于 check fail（同时存在时 schema 先触发）
>   [blocked_priority] blocked 优先于 low_refs
>   [schema_fail] 初始类型错误 → gate fail
>   [after_fix] MD 修复类型 → 触发 low_refs check fail
>   [pdca_pass] MD 循环修复 → gate pass + next="wave0"
>   [blocked_escalate] blocked → gate fail
>   [custom] 自定义 rule 工作正常
>   全部 expected:true → 7/7 PASS 即通过。

## Step 6: 清理

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
rm -rf dpt_disp_case-23_gl_*
echo "✓ Cleaned up."
```