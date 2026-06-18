---
schema: command-experiment/v1
experiment: gate-fork
case: complex
case_goal: "验证 forkGate 全组合：规则优先级、四种返回、MD PDCA 双路径（branch 执行 / repair）。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_gf_complex
trace: dpt_disp_gf_complex/_trace_gf_complex.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` bundle 中执行。实验结果必须来自实际文件写入、Engine 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# test-gate-fork-complex

验证 forkGate 全功能：条件优先级、四种返回、MD PDCA 双路径。

## Expected Runtime Path

1. 创建 DPT run bundle，validate + inspect
2. 初始化 trace
3. 条件优先级 + branch 路由
4. Schema fail → MD fix → retry → check fail → repair → pass
5. Branch.when combined
6. 读 trace 裁决
7. 清理

---

## Step 1: 创建 Run Bundle

```bash
B=$(node experiments/shared/new-disposable-bundle.mjs gf_complex --force)
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B
node DPT_FRAMEWORK/cli/inspect-bundle.mjs $B
```

→ 预期：validate 5/5 passed。

---

## Step 2: 初始化 Trace

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_gf_complex"

cat > "$B/t.mjs" << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
const trace = createTrace('dpt_disp_gf_complex/_trace_gf_complex.jsonl');
trace.traceInit('gf-playbook/complex', { source: 'gf-playbook/complex' });
JS
node "$B/t.mjs" > /dev/null 2>&1
```

---

## Step 3: 条件优先级 + branch 路由

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_gf_complex"

cat > "$B/t.mjs" << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
const trace = createTrace('dpt_disp_gf_complex/_trace_gf_complex.jsonl');
import { forkGate } from '../DPT_FRAMEWORK/engine/gate-fork.mjs';

const SRC = 'gf-playbook/complex';

const RULES = [
  { key: 'blocked',  check: s => s.topicReadiness === 'blocked',      say: 'topic 被阻塞' },
  { key: 'low_refs', check: s => s.ref_count < s.ref_floor,           say: 'ref_count 不足' },
];

const BRANCHES = {
  'blocked':  { say: '上报给用户' },
  'low_refs': { say: '补充参考' },
};

// blocked beats low_refs
const r1 = forkGate(
  { ref_count: 2, ref_floor: 5, topicReadiness: 'blocked' },
  RULES, BRANCHES
);
trace.traceEntry('check', {
  source: SRC, step: 'blocked_first',
  passed: r1.branch === 'blocked' && r1.say === '上报给用户'
});

// low_refs when not blocked
const r2 = forkGate(
  { ref_count: 2, ref_floor: 5, topicReadiness: 'ready' },
  RULES, BRANCHES
);
trace.traceEntry('check', {
  source: SRC, step: 'low_refs',
  passed: r2.branch === 'low_refs' && r2.say === '补充参考'
});

// all pass
const r3 = forkGate(
  { ref_count: 5, ref_floor: 5, topicReadiness: 'ready' },
  RULES, BRANCHES
);
trace.traceEntry('check', {
  source: SRC, step: 'all_pass',
  passed: r3.branch === undefined && r3.rule === undefined
});
JS
node "$B/t.mjs" > /dev/null 2>&1
```

→ 预期：3 check 全 passed。

---

## Step 4: Schema fail → fix → check fail → repair → pass

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_gf_complex"

cat > "$B/t.mjs" << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
const trace = createTrace('dpt_disp_gf_complex/_trace_gf_complex.jsonl');
import { z } from 'zod';
import { forkGate } from '../DPT_FRAMEWORK/engine/gate-fork.mjs';

const SRC = 'gf-playbook/complex';

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

// schema fail
let state = { ref_count: 'bad', ref_floor: 5, topicReadiness: 'ready' };
let r = forkGate(state, RULES, BRANCHES);
trace.traceEntry('check', {
  source: SRC, step: 'schema_fail',
  passed: r.rule === 'bad_state' && r.errors[0].field === 'ref_count'
});

// MD fixes field → now low_refs fires
state = { ...state, ref_count: 2 };
r = forkGate(state, RULES, BRANCHES);
trace.traceEntry('check', {
  source: SRC, step: 'after_fix',
  passed: r.branch === 'low_refs' && r.say === '补充参考'
});

// MD reads branch '低引用' → executes action: add references → retry
let iterations = 0;
while (r.branch === 'low_refs' && iterations < 5) {
  state = { ...state, ref_count: state.ref_count + 2 };
  r = forkGate(state, RULES, BRANCHES);
  iterations++;
}
// After repair: all rules pass, no branch
trace.traceEntry('check', {
  source: SRC, step: 'pdca_pass',
  passed: r.branch === undefined && r.rule === undefined && iterations >= 1
});

// blocked → escalate
r = forkGate(
  { ref_count: 5, ref_floor: 5, topicReadiness: 'blocked' },
  RULES, BRANCHES
);
trace.traceEntry('check', {
  source: SRC, step: 'blocked',
  passed: r.branch === 'blocked' && r.say === '上报给用户'
});
JS
node "$B/t.mjs" > /dev/null 2>&1
```

→ 预期：4 check 全 passed。

---

## Step 5: 从 Trace 裁决

```bash
ROOT="$(git rev-parse --show-toplevel)" && cd "$ROOT"
B="dpt_disp_gf_complex"

cat > "$B/t.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
const trace = createTrace('dpt_disp_gf_complex/_trace_gf_complex.jsonl');
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

## Step 6: 清理

```bash
rm -rf $(node experiments/shared/new-disposable-bundle.mjs gf_complex)
echo "✓ Cleaned up."
```
