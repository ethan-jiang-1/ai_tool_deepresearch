---
schema: command-experiment/v2
experiment: gate-loop
case: case-22-standard-repair-loop
case_goal: "验证 MD PDCA 回路：checkGate fail → MD 读 say/errors 修复 → retry checkGate → pass。"
verdict_mode: all
required_checks: [case1_fail, case1_pass, case2_immediate, case3_recovered, case3_schema_fail, case4_blocked]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: light
durable_evidence_roles: []
proof_subject: deterministic_contract
subject_execution: none
fixture: fixture_backed
runtime: real_disposable_bundle
external_calls: none
verdict_judge: deterministic
---

<!-- @impl EXA-005, EXA-006, EXA-007, PLR-003 -->

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` bundle 中执行。实验结果必须来自实际文件写入、Engine 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# case-22-standard-repair-loop

验证 MD 拥有的 PDCA 回路：Engine 返回 fail → MD 读 `say`/`errors` 修复 → 重调 checkGate → 直到 pass。

## Expected Runtime Path

1. 创建 DPT run bundle，validate + inspect
2. 初始化 trace
3. PDCA: check fail → MD repair → retry → pass
4. PDCA: schema fail → MD fix field → retry → pass
5. PDCA: blocked → MD escalate
6. 读 trace 裁决
5. Native completion, then Supervisor-owned health and cleanup policy
---

## Step 1: 创建 Run Bundle

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs gl_medium --case case-22 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B
node DPT_FRAMEWORK/cli/inspect-bundle.mjs $B
```

→ 预期：validate 5/5 passed。

---

## Step 2: 初始化 Trace

```bash

B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { createTrace } from './DPT_FRAMEWORK/engine/trace.mjs';
const bundle = process.argv[2];
const trace = createTrace(`${bundle}/rb_trace.jsonl`);
const recordCheck = ({ step, source: _source, ...rest }) => trace.traceEntry('check', { source: 'playbook', gate: step, expected: true, ...rest });
trace.traceInit('gl-playbook/medium', { source: 'gl-playbook/medium' });
JS
```

---

## Step 3: PDCA 回路

```bash

B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { createTrace } from './DPT_FRAMEWORK/engine/trace.mjs';
import { z } from 'zod';
import { checkGate } from './DPT_FRAMEWORK/engine/gate-loop.mjs';

const bundle = process.argv[2];
const trace = createTrace(`${bundle}/rb_trace.jsonl`);
const recordCheck = ({ step, source: _source, ...rest }) => trace.traceEntry('check', { source: 'playbook', gate: step, expected: true, ...rest });

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

recordCheck({
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

recordCheck({
  source: SRC, step: 'case1_pass',
  passed: r.passed === true && r.next === 'wave0' && iterations >= 1
});

// --- Case 2: immediate pass ---
r = checkGate(
  { ref_count: 5, ref_floor: 5, topicReadiness: 'ready' },
  RULES, 'done'
);
recordCheck({
  source: SRC, step: 'case2_immediate',
  passed: r.passed === true && r.next === 'done'
});

// --- Case 3: schema fail → MD fix → retry ---
let bad = { ref_count: 'bad', ref_floor: 5, topicReadiness: 'ready' };
r = checkGate(bad, RULES);
recordCheck({
  source: SRC, step: 'case3_schema_fail',
  passed: r.passed === false && r.errors[0].field === 'ref_count'
});

// MD reads errors[0].field === 'ref_count' → fixes field type
bad = { ...bad, ref_count: 5 };
r = checkGate(bad, RULES, 'recovered');
recordCheck({
  source: SRC, step: 'case3_recovered',
  passed: r.passed === true && r.next === 'recovered'
});

// --- Case 4: blocked → MD escalate ---
r = checkGate(
  { ref_count: 5, ref_floor: 5, topicReadiness: 'blocked' },
  RULES, 'wave0'
);
recordCheck({
  source: SRC, step: 'case4_blocked',
  passed: r.passed === false && r.say.includes('阻塞')
});
JS
```

→ 预期：6 check 全 passed。

---

## Step 4: Native Completion

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

## Step 5: 结果解读

> 6 个 check，验证 checkGate PDCA 回路：
>   [case1_fail] ref_count 不足 → gate fail + say 指出问题
>   [case1_pass] MD 循环修复 ref_count → gate pass + next="wave0"
>   [case2_immediate] 合法状态 → gate pass + next="done"
>   [case3_schema_fail] 类型错误 → gate fail + errors
>   [case3_recovered] MD 修复类型 → gate pass + next="recovered"
>   [case4_blocked] blocked 状态 → gate fail + say 包含"阻塞"
>   全部 expected:true → 6/6 PASS 即通过。

Stop after native completion. The Autorun Supervisor owns health, durable audit, preservation, and optional clean-PASS cleanup of the complete case run root.
