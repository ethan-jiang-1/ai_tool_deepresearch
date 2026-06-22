---
schema: command-experiment/v1
experiment: gate-fork
case: simple
weight: light
case_goal: "验证 forkGate 单次 checkpoint：pass、branch matched、no-branch、schema fail 四种返回。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_gf_simple
trace: dpt_disp_gf_simple/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` bundle 中执行。实验结果必须来自实际文件写入、Engine 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# test-gate-fork-simple

验证 forkGate 最小路径：MD 定义 rules + branches → forkGate 返回四种结果。

## Expected Runtime Path

1. 创建 DPT run bundle，validate + inspect
2. 初始化 trace
3. forkGate checkpoint：pass / branch / no-branch / schema fail
4. 读 trace 裁决
5. 清理

---

## Step 1: 创建 Run Bundle

```bash
B=$(node experiments/shared/new-disposable-bundle.mjs gf_simple --force)
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
trace.traceInit('gf-playbook/simple', { source: 'gf-playbook/simple' });
JS
node "$B/t.mjs" > /dev/null 2>&1
```

---

## Step 3: forkGate 四种返回

```bash
cat > "$B/t.mjs" << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const trace = createTrace(__dirname + '/_trace.jsonl');
import { z } from 'zod';
import { forkGate } from '../DPT_FRAMEWORK/engine/gate-fork.mjs';

const SRC = 'gf-playbook/simple';

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

const BRANCHES = {
  'blocked':  { say: '上报给用户' },
  'low_refs': { say: '补充参考' },
};

// Return 1: pass — no rule matches, no branch
const r1 = forkGate(
  { ref_count: 5, ref_floor: 5, topicReadiness: 'ready' },
  RULES, BRANCHES
);
trace.traceEntry('check', {
  source: SRC, step: 'pass',
  passed: r1.branch === undefined && r1.rule === undefined && r1.say === '门禁通过，但没有分叉。'
});

// Return 2: branch matched — MD executes the action
const r2 = forkGate(
  { ref_count: 2, ref_floor: 5, topicReadiness: 'ready' },
  RULES, BRANCHES
);
trace.traceEntry('check', {
  source: SRC, step: 'branch',
  passed: r2.branch === 'low_refs' && r2.say === '补充参考'
});

// Return 3: rule matched but no branch — repair needed
const partial = { 'blocked': { say: '上报' } };
const r3 = forkGate(
  { ref_count: 2, ref_floor: 5, topicReadiness: 'ready' },
  RULES, partial
);
trace.traceEntry('check', {
  source: SRC, step: 'no_branch',
  passed: r3.branch === undefined && r3.rule === 'low_refs' && r3.say.includes('ref_count')
});

// Return 4: schema fail — with errors
const r4 = forkGate(
  { ref_count: 'bad', ref_floor: 5, topicReadiness: 'ready' },
  RULES, BRANCHES
);
trace.traceEntry('check', {
  source: SRC, step: 'schema_fail',
  passed: r4.rule === 'bad_state' && r4.errors[0].field === 'ref_count'
});

// Branch.when predicate confirms condition
const BW = { 'low_refs': { when: s => s.ref_count < s.ref_floor, say: '补充参考' } };
const r5 = forkGate(
  { ref_count: 2, ref_floor: 5, topicReadiness: 'ready' },
  RULES, BW
);
trace.traceEntry('check', {
  source: SRC, step: 'branch_when',
  passed: r5.branch === 'low_refs' && r5.say === '补充参考'
});

// Branch.when false → treated as no-branch
const BW2 = { 'low_refs': { when: s => s.ref_count < 0, say: '补' } };
const r6 = forkGate(
  { ref_count: 2, ref_floor: 5, topicReadiness: 'ready' },
  RULES, BW2
);
trace.traceEntry('check', {
  source: SRC, step: 'branch_when_false',
  passed: r6.branch === undefined && r6.rule === 'low_refs'
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
console.log(ok ? '\x1b[32mSIMPLE PASS\x1b[0m' : '\x1b[31mSIMPLE FAIL\x1b[0m');
if (!ok) process.exit(1);
trace.traceCleanup();
JS
node "$B/t.mjs"
```

→ 预期：`checks >= 6, failed = 0`，SIMPLE PASS。

---

## Step 5: 清理

```bash
rm -rf dpt_disp_gf_*
echo "✓ Cleaned up."
```
