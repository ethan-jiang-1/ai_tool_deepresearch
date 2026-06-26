---
schema: command-experiment/v1
experiment: gate-fork
case: case-12-standard-repair-retry
weight: light
case_goal: "验证 forkGate + MD PDCA：branch → MD 执行，no-branch → MD repair → retry forkGate → branch/pass。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-12_gf_medium
trace: dpt_disp_case-12_gf_medium/_logs/_logs/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` bundle 中执行。实验结果必须来自实际文件写入、Engine 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# case-12-standard-repair-retry

验证 forkGate 分叉后的 MD PDCA 回路。

## Expected Runtime Path

1. 创建 DPT run bundle，validate + inspect
2. 初始化 trace
3. Branch match → MD executes
4. No-branch → MD repair → retry → pass
5. Schema fail → MD fix → retry → branch match
6. 读 trace 裁决
7. 清理

---

## Step 1: 创建 Run Bundle

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs gf_medium --case case-12 --force)
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
const trace = createTrace(__dirname + '/_logs/_logs/_trace.jsonl');
trace.traceInit('gf-playbook/medium', { source: 'gf-playbook/medium' });
JS
node "$B/t.mjs" > /dev/null 2>&1
```

---

## Step 3: PDCA 回路

```bash

cat > "$B/t.mjs" << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
import { z } from 'zod';
import { forkGate } from '../DPT_FRAMEWORK/engine/gate-fork.mjs';

const __dirname = esmDirname(import.meta.url);
const trace = createTrace(__dirname + '/_logs/_logs/_trace.jsonl');

const SRC = 'gf-playbook/medium';

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

// Branches missing 'low_refs' → triggers repair path
const BRANCHES_NO_LOW = { 'blocked': { say: '上报给用户' } };

// --- Case 1: branch match → MD executes ---
let state = { ref_count: 2, ref_floor: 5, topicReadiness: 'ready' };
let r = forkGate(state, RULES, BRANCHES);
trace.traceEntry('check', {
  source: SRC, step: 'case1_branch',
  passed: r.branch === 'low_refs' && r.say === '补充参考'
});

// --- Case 2: no-branch → MD repair → retry → pass ---
r = forkGate(state, RULES, BRANCHES_NO_LOW);
trace.traceEntry('check', {
  source: SRC, step: 'case2_no_branch',
  passed: r.branch === undefined && r.rule === 'low_refs'
});

// MD reads say: "ref_count 不足" → repairs
state = { ...state, ref_count: state.ref_count + 4 };
r = forkGate(state, RULES, BRANCHES_NO_LOW);
trace.traceEntry('check', {
  source: SRC, step: 'case2_repaired',
  passed: r.rule === undefined && r.branch === undefined  // pass — no rule matches
});

// --- Case 3: schema fail → MD fix → retry → branch ---
let bad = { ref_count: 'bad', ref_floor: 5, topicReadiness: 'ready' };
r = forkGate(bad, RULES, BRANCHES);
trace.traceEntry('check', {
  source: SRC, step: 'case3_schema_fail',
  passed: r.rule === 'bad_state' && r.errors[0].field === 'ref_count'
});

// MD reads errors → fixes field type
bad = { ...bad, ref_count: 2 };
r = forkGate(bad, RULES, BRANCHES);
trace.traceEntry('check', {
  source: SRC, step: 'case3_recovered',
  passed: r.branch === 'low_refs' && r.say === '补充参考'
});

// --- Case 4: blocked priority ---
r = forkGate(
  { ref_count: 2, ref_floor: 5, topicReadiness: 'blocked' },
  RULES, BRANCHES
);
trace.traceEntry('check', {
  source: SRC, step: 'case4_blocked',
  passed: r.branch === 'blocked' && r.say === '上报给用户'
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
import { esmDirname } from '../DPT_FRAMEWORK/engine/esm-dirname.mjs';
const __dirname = esmDirname(import.meta.url);
const trace = createTrace(__dirname + '/_logs/_logs/_trace.jsonl');
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


## Step 5: 结果解读

> 6 个 check，验证 forkGate MD PDCA 回路：
>   [case1_branch] 状态触发 low_refs → gate 正确分叉到 branch
>   [case2_no_branch] branch map 缺 low_refs → gate 返回 rule 但无 branch（需 repair）
>   [case2_repaired] MD 修复 ref_count → gate pass（rule 不触发）
>   [case3_schema_fail] 类型错误 → gate 返回 schema rule
>   [case3_recovered] MD 修复类型 → gate 分叉到 low_refs branch
>   [case4_blocked] blocked 优先级最高 → 先于 low_refs 触发
>   全部 expected:true → 6/6 PASS 即通过。

## Step 6: 清理

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
rm -rf dpt_disp_case-12_gf_*
echo "✓ Cleaned up."
```