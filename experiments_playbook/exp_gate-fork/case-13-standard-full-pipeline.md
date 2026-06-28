---
schema: command-experiment/v1
experiment: gate-fork
case: case-13-standard-full-pipeline
weight: light
case_goal: "验证 forkGate 全组合：规则优先级、四种返回、MD PDCA 双路径（branch 执行 / repair）。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-13_gf_complex
trace: dpt_disp_case-13_gf_complex/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` bundle 中执行。实验结果必须来自实际文件写入、Engine 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# case-13-standard-full-pipeline

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
B=$(node experiments_env/shared/new-disposable-bundle.mjs gf_complex --case case-13 --force)
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
trace.traceInit('gf-playbook/complex', { source: 'gf-playbook/complex' });
JS
node "$B/t.mjs" > /dev/null 2>&1
```

---

## Step 3: 条件优先级 + branch 路由

```bash

cat > "$B/t.mjs" << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
import { forkGate } from '../DPT_FRAMEWORK/engine/gate-fork.mjs';

const __dirname = esmDirname(import.meta.url);
const trace = createTrace(__dirname + '/rb_trace.jsonl');

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

cat > "$B/t.mjs" << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
import { z } from 'zod';
import { forkGate } from '../DPT_FRAMEWORK/engine/gate-fork.mjs';

const __dirname = esmDirname(import.meta.url);
const trace = createTrace(__dirname + '/rb_trace.jsonl');

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


## Step 6: 结果解读

> 7 个 check，验证 forkGate 全组合：
>   [blocked_first] blocked 优先于 low_refs → 正确分叉到 blocked
>   [low_refs] 未 blocked 时 low_refs 正常触发
>   [all_pass] 合法状态 → 无 rule 无 branch
>   [schema_fail] 类型错误 → gate 返回 schema rule
>   [after_fix] MD 修复类型 → gate 正确分叉到 low_refs
>   [pdca_pass] MD 循环修复 ref_count → 最终 pass
>   [blocked] blocked 场景 → 正确分叉
>   全部 expected:true → 7/7 PASS 即通过。

## Step 7: 清理

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
rm -rf dpt_disp_case-13_gf_*
echo "✓ Cleaned up."
```