---
schema: command-experiment/v2
experiment: gate-loop
case: case-23-standard-full-pipeline
case_goal: "验证 checkGate 全组合：多规则优先级、schema/check/blocked 三种 fail、MD PDCA 回路。"
verdict_mode: all
required_checks: [after_fix, blocked_escalate, blocked_priority, custom, pdca_pass, schema_fail, schema_first]
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

# case-23-standard-full-pipeline

验证 checkGate 全功能：规则优先级、三种 fail 模式（schema/check/blocked）、MD PDCA 回路。

## Expected Runtime Path

1. 创建 DPT run bundle，validate + inspect
2. 初始化 trace
3. 规则优先级：schema > blocked > low_refs
4. Schema fail → MD fix → retry → check fail → MD repair → pass
5. Blocked → escalate
6. 读 trace 裁决
7. Native completion, then Supervisor-owned health and cleanup policy

---

## Step 1: 创建 Run Bundle

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs gl_complex --case case-23 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
node DEEP_RESEARCH_HARNESS/cli/validate-bundle.mjs $B
node DEEP_RESEARCH_HARNESS/cli/inspect-bundle.mjs $B
```

→ 预期：validate 5/5 passed。

---

## Step 2: 初始化 Trace

```bash

B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { createTrace } from './DEEP_RESEARCH_HARNESS/engine/trace.mjs';
const bundle = process.argv[2];
const trace = createTrace(`${bundle}/rb_trace.jsonl`);
const recordCheck = ({ step, source: _source, ...rest }) => trace.traceEntry('check', { source: 'playbook', gate: step, expected: true, ...rest });
trace.traceInit('gl-playbook/complex', { source: 'gl-playbook/complex' });
JS
```

---

## Step 3: 规则优先级 + schema fail → fix → check fail → repair → pass

```bash

B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { createTrace } from './DEEP_RESEARCH_HARNESS/engine/trace.mjs';
import { z } from 'zod';
import { checkGate } from './DEEP_RESEARCH_HARNESS/engine/gate-loop.mjs';

const bundle = process.argv[2];
const trace = createTrace(`${bundle}/rb_trace.jsonl`);
const recordCheck = ({ step, source: _source, ...rest }) => trace.traceEntry('check', { source: 'playbook', gate: step, expected: true, ...rest });

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
recordCheck({
  source: SRC, step: 'schema_first',
  passed: r.passed === false && r.say === 'state 结构不合法' && r.errors[0].field === 'ref_count'
});

// blocked beats low_refs (priority)
r = checkGate(
  { ref_count: 2, ref_floor: 5, topicReadiness: 'blocked' },
  RULES
);
recordCheck({
  source: SRC, step: 'blocked_priority',
  passed: r.passed === false && r.say.includes('阻塞')
});

// Phase 1: schema fail → MD fix
let state = { ref_count: 'bad', ref_floor: 5, topicReadiness: 'ready' };
r = checkGate(state, RULES);
recordCheck({
  source: SRC, step: 'schema_fail',
  passed: r.passed === false && r.errors[0].field === 'ref_count'
});

// MD reads errors → fixes field type → now triggers low_refs
state = { ...state, ref_count: 2 };
r = checkGate(state, RULES);
recordCheck({
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
recordCheck({
  source: SRC, step: 'pdca_pass',
  passed: r.passed === true && r.next === 'wave0' && iterations >= 1
});

// Phase 3: blocked → escalate
r = checkGate(
  { ref_count: 5, ref_floor: 5, topicReadiness: 'blocked' },
  RULES, 'next_step'
);
recordCheck({
  source: SRC, step: 'blocked_escalate',
  passed: r.passed === false && r.say.includes('阻塞')
});

// Custom rules (meta — engine knows nothing about domain)
const CUSTOM = [
  { key: 'urgent', check: s => s.severity === 'critical', say: '紧急情况' },
];
r = checkGate({ severity: 'critical' }, CUSTOM);
recordCheck({
  source: SRC, step: 'custom',
  passed: r.passed === false && r.say === '紧急情况'
});
JS
```

→ 预期：7 check 全 passed。

---

## Native Completion

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

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

Stop after native completion. The Autorun Supervisor owns health, durable audit, preservation, and optional clean-PASS cleanup of the complete case run root.
