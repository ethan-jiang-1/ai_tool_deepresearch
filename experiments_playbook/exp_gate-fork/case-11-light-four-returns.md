---
schema: command-experiment/v2
experiment: gate-fork
case: case-11-light-four-returns
case_goal: "验证 forkGate 单次 checkpoint：pass、branch matched、no-branch、schema fail 四种返回。"
verdict_mode: all
required_checks: [branch, branch_when, branch_when_false, no_branch, pass, schema_fail]
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

## Reality Distance Ledger

| 维度 | 声明 |
|------|------|
| **Runtime context** | disposable bundle，`new-disposable-bundle.mjs` 创建 |
| **Framework path** | `forkGate()` from `DEEP_RESEARCH_HARNESS/engine/gate-fork.mjs`（无 CLI 包装，函数即生产路径） |
| **Fixture input** | state/rule/branch 对象在 playbook 内构造 — Engine-layer fixture |
| **Agent actor** | 无（fixture-backed） |
| **External calls** | 无 |
| **Verdict source** | `rb_trace.jsonl` `check` events |
| **不证明** | Agent gate 判断、workflow 路由 — 仅证明 forkGate 四种返回 contract |

# case-11-light-four-returns

验证 forkGate 最小路径：MD 定义 rules + branches → forkGate 返回四种结果。

## Expected Runtime Path

1. 创建 DPT run bundle，validate + inspect
2. 初始化 trace
3. forkGate checkpoint：pass / branch / no-branch / schema fail
4. 读 trace 裁决
5. Native completion, then Supervisor-owned health and cleanup policy
---

## Step 1: 创建 Run Bundle

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs gf_simple --case case-11 --force --target-dir {{CASE_RUN_ROOT_SH}})
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
trace.traceInit('gf-playbook/simple', { source: 'gf-playbook/simple' });
JS
```

---

## Step 3: forkGate 四种返回

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { createTrace } from './DEEP_RESEARCH_HARNESS/engine/trace.mjs';
import { z } from 'zod';
import { forkGate } from './DEEP_RESEARCH_HARNESS/engine/gate-fork.mjs';

const bundle = process.argv[2];
const trace = createTrace(`${bundle}/rb_trace.jsonl`);
const recordCheck = ({ step, source: _source, ...rest }) => trace.traceEntry('check', { source: 'playbook', gate: step, expected: true, ...rest });

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
recordCheck({
  source: SRC, step: 'pass',
  passed: r1.branch === undefined && r1.rule === undefined && r1.say === '门禁通过，但没有分叉。'
});

// Return 2: branch matched — MD executes the action
const r2 = forkGate(
  { ref_count: 2, ref_floor: 5, topicReadiness: 'ready' },
  RULES, BRANCHES
);
recordCheck({
  source: SRC, step: 'branch',
  passed: r2.branch === 'low_refs' && r2.say === '补充参考'
});

// Return 3: rule matched but no branch — repair needed
const partial = { 'blocked': { say: '上报' } };
const r3 = forkGate(
  { ref_count: 2, ref_floor: 5, topicReadiness: 'ready' },
  RULES, partial
);
recordCheck({
  source: SRC, step: 'no_branch',
  passed: r3.branch === undefined && r3.rule === 'low_refs' && r3.say.includes('ref_count')
});

// Return 4: schema fail — with errors
const r4 = forkGate(
  { ref_count: 'bad', ref_floor: 5, topicReadiness: 'ready' },
  RULES, BRANCHES
);
recordCheck({
  source: SRC, step: 'schema_fail',
  passed: r4.rule === 'bad_state' && r4.errors[0].field === 'ref_count'
});

// Branch.when predicate confirms condition
const BW = { 'low_refs': { when: s => s.ref_count < s.ref_floor, say: '补充参考' } };
const r5 = forkGate(
  { ref_count: 2, ref_floor: 5, topicReadiness: 'ready' },
  RULES, BW
);
recordCheck({
  source: SRC, step: 'branch_when',
  passed: r5.branch === 'low_refs' && r5.say === '补充参考'
});

// Branch.when false → treated as no-branch
const BW2 = { 'low_refs': { when: s => s.ref_count < 0, say: '补' } };
const r6 = forkGate(
  { ref_count: 2, ref_floor: 5, topicReadiness: 'ready' },
  RULES, BW2
);
recordCheck({
  source: SRC, step: 'branch_when_false',
  passed: r6.branch === undefined && r6.rule === 'low_refs'
});
JS
```

→ 预期：6 check 全 passed。

---

## Step 4: Native Completion

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

## Step 5: 结果解读

> 6 个 check，验证 forkGate 四种返回合约：
>   [pass] 合法状态无 rule 触发 → gate 返回 pass
>   [branch] low_refs 触发 → gate 返回 branch + say
>   [no-branch] rule 匹配但 branch map 无对应 → gate 返回 rule + say，无 branch
>   [schema_fail] 类型错误 → gate 返回 schema rule + errors
>   [branch_when] Branch.when true → 正常分叉
>   [branch_when_false] predicate false → 不分叉，退回 no-branch
>   全部 expected:true → 6/6 PASS 即通过。

Stop after native completion. The Autorun Supervisor owns health, durable audit, preservation, and optional clean-PASS cleanup of the complete case run root.
