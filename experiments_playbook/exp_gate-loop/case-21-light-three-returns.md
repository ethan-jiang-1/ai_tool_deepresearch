---
schema: command-experiment/v1
experiment: gate-loop
case: case-21-light-three-returns
weight: light
case_goal: "验证 checkGate 单次 checkpoint：pass、check fail、schema fail 三种返回。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-21_gl_simple
trace: dpt_disp_case-21_gl_simple/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` bundle 中执行。实验结果必须来自实际文件写入、Engine 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

## Reality Distance Ledger

| 维度 | 声明 |
|------|------|
| **Runtime context** | disposable bundle，`new-disposable-bundle.mjs` 创建 |
| **Framework path** | `checkGate()` from `DPT_FRAMEWORK/engine/gate-loop.mjs`（无 CLI 包装，函数即生产路径） |
| **Fixture input** | state/rule 对象在 playbook 内构造 — Engine-layer fixture |
| **Agent actor** | 无（fixture-backed） |
| **External calls** | 无 |
| **Verdict source** | `rb_trace.jsonl` `check` events |
| **不证明** | Agent gate 判断、repair 策略 — 仅证明 checkGate 三种返回 contract |



# case-21-light-three-returns

验证 checkGate 最小路径：MD 定义 rules → checkGate 返回三种结果（pass / check fail / schema fail）→ MD 读 `say` + `errors`。

## Expected Runtime Path

1. 创建 DPT run bundle，validate + inspect
2. 初始化 trace
3. checkGate checkpoint：pass / check fail / schema fail
4. 读 trace 裁决
5. 清理

---

## Step 1: 创建 Run Bundle

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs gl_simple --case case-21 --force)
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
trace.traceInit('gl-playbook/simple', { source: 'gl-playbook/simple' });
JS
node "$B/t.mjs" > /dev/null 2>&1
```

---

## Step 3: checkGate 三种返回

MD 定义 rules（领域知识），Engine 只做确定性 checkpoint。

```bash

cat > "$B/t.mjs" << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
import { z } from 'zod';
import { checkGate } from '../DPT_FRAMEWORK/engine/gate-loop.mjs';

const __dirname = esmDirname(import.meta.url);
const trace = createTrace(__dirname + '/rb_trace.jsonl');

const SRC = 'gl-playbook/simple';

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

// Return 1: pass with next
const p1 = checkGate(
  { ref_count: 5, ref_floor: 5, topicReadiness: 'ready' },
  RULES, 'wave0_search'
);
trace.traceEntry('check', {
  source: SRC, step: 'pass',
  passed: p1.passed === true && p1.next === 'wave0_search'
});

// Return 2: check rule fires
const p2 = checkGate(
  { ref_count: 2, ref_floor: 5, topicReadiness: 'ready' },
  RULES
);
trace.traceEntry('check', {
  source: SRC, step: 'check_fail',
  passed: p2.passed === false && p2.say.includes('ref_count')
});

// Return 3: schema rule fires — with errors
const p3 = checkGate(
  { ref_count: 'bad', ref_floor: 5, topicReadiness: 'ready' },
  RULES
);
trace.traceEntry('check', {
  source: SRC, step: 'schema_fail',
  passed: p3.passed === false && p3.say === 'state 结构不合法' && p3.errors[0].field === 'ref_count'
});

// Priority: blocked beats low_refs
const p4 = checkGate(
  { ref_count: 2, ref_floor: 5, topicReadiness: 'blocked' },
  RULES
);
trace.traceEntry('check', {
  source: SRC, step: 'priority',
  passed: p4.passed === false && p4.say.includes('阻塞')
});

// Pass without next
const p5 = checkGate(
  { ref_count: 5, ref_floor: 5, topicReadiness: 'ready' },
  RULES
);
trace.traceEntry('check', {
  source: SRC, step: 'pass_no_next',
  passed: p5.passed === true && p5.next === undefined
});
JS
node "$B/t.mjs" > /dev/null 2>&1
```

→ 预期：5 check 全 passed。

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

const ok = checks.length >= 5 && failed === 0;
console.log(ok ? '\x1b[32mSIMPLE PASS\x1b[0m' : '\x1b[31mSIMPLE FAIL\x1b[0m');
if (!ok) process.exit(1);

trace.traceCleanup();
JS
node "$B/t.mjs"
```

→ 预期：`checks >= 5, failed = 0`，SIMPLE PASS。

---


## Step 5: 结果解读

> 5 个 check，验证 checkGate 三种返回：
>   [pass] 合法状态 + next="wave0_search" → gate pass + next 指针
>   [check_fail] ref_count 不足 → gate fail + say 指向问题
>   [schema_fail] 类型错误 → gate fail + errors 指向字段
>   [priority] blocked 优先于 low_refs → say 包含"阻塞"
>   [pass_no_next] pass 但无 next → next=undefined
>   全部 expected:true → 5/5 PASS 即通过。

## Step 6: 清理

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
rm -rf dpt_disp_case-21_gl_*
echo "✓ Cleaned up."
```