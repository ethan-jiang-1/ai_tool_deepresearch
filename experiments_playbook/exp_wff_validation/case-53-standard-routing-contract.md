---
schema: command-experiment/v1
experiment: wff-validation
case: case-53-standard-routing-contract
weight: light
case_goal: "验证 current-node 绑定、next / terminal / no_transition / config_error 四类 routing 结果，并确认 check.next 只在 next 时出现。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-53_wff_val_contract
trace: dpt_disp_case-53_wff_val_contract/_logs/_logs/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` bundle 中执行。实验结果必须来自实际文件写入、Engine/CLI 调用和 trace event；禁止 mock、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# case-53-standard-routing-contract

验证详细 routing contract：

- current-node 正确时返回 `next`
- current-node 绑定错误时返回 `invalid_input`
- control file 缺失时返回 `no_transition`
- synthetic terminal table 返回 `terminal`
- 恢复 bundle 后仍可回到 `next`

## Expected Runtime Path

1. 创建 bundle，validate + inspect
2. 正常 current-node + 正常 transitions -> `next`
3. 错误 current-node -> `invalid_input`
4. 删除控制文件 -> `no_transition`
5. 恢复控制文件并写入 terminal table -> `terminal`
6. 再次使用正常 transitions -> `next`
7. 从 trace 裁决
8. 清理

> 说明：第 5 步使用 bundle 内临时写入的 synthetic terminal transition table，只为验证 `terminal` 路由分支。

---

## Step 1: 创建 bundle

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs wff_val_contract --case case-53 --force)
node DPT_FRAMEWORK/cli/validate-bundle.mjs "$B"
node DPT_FRAMEWORK/cli/inspect-bundle.mjs "$B"
```

→ 预期：validate / inspect 通过。

---

## Step 2: 跑 routing contract

```bash
cat > "$B/routing-contract.mjs" << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const B = process.argv[2];
const trace = createTrace(join(B, '_logs', '_trace.jsonl'), { consoleEcho: false });
const SRC = 'wff-validation/complex-routing-contract';
trace.traceInit('wff-validation: complex routing contract', { source: SRC });

const realTransitions = 'DPT_FRAMEWORK/workflows/transitions.chain.json';
const instantiationNode = 'phases/phase-instantiation.md';
const wrongNode = 'phases/phase-wave0.md';

const originalPlan = readFileSync(join(B, 'rb_plan.md'), 'utf-8');
const originalStatus = readFileSync(join(B, 'rb_status.json'), 'utf-8');

function runGate(transitionsPath, currentNodeRef) {
  return spawnSync('node', [
    'DPT_FRAMEWORK/cli/gates/check-gate-instantiation-complete.mjs',
    '--bundle', B,
    '--current-node', currentNodeRef,
    '--transitions', transitionsPath,
  ], { encoding: 'utf-8' });
}

function decode(result) {
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    data: JSON.parse(result.stdout),
  };
}

function emit(step, passed, detail, extra = {}) {
  trace.traceEntry('check', { source: SRC, step, passed, detail, ...extra });
}

let res = decode(runGate(realTransitions, instantiationNode));
emit('next:status', res.status === 0 && res.data.check?.passed === true,
  `exit=${res.status}`, { routing: res.data.routing?.kind, next: res.data.check?.next });
emit('next:routing', res.data.routing?.kind === 'next' && res.data.check?.next === 'phases/phase-hitl1.md',
  `routing=${res.data.routing?.kind}, next=${res.data.check?.next}`, { routing: res.data.routing?.kind, next: res.data.check?.next });

res = decode(runGate(realTransitions, wrongNode));
emit('binding:status', res.data.check?.passed === false,
  `exit=${res.status}`, { routing: res.data.routing?.kind, next: res.data.check?.next });
emit('binding:routing', res.data.routing?.kind === 'invalid_input' && res.data.check?.next === null,
  `routing=${res.data.routing?.kind}, next=${res.data.check?.next}`, { routing: res.data.routing?.kind, next: res.data.check?.next });
emit('binding:diagnostics', Array.isArray(res.data.inspect) && Array.isArray(res.data.advice),
  `inspect=${res.data.inspect?.length ?? 'n/a'}, advice=${res.data.advice?.length ?? 'n/a'}`);

rmSync(join(B, 'rb_plan.md'), { force: true });
rmSync(join(B, 'rb_status.json'), { force: true });
res = decode(runGate(realTransitions, instantiationNode));
emit('no_transition:status', res.status === 1 && res.data.check?.passed === false,
  `exit=${res.status}`, { routing: res.data.routing?.kind, next: res.data.check?.next });
emit('no_transition:routing', res.data.routing?.kind === 'no_transition' && res.data.check?.next === null,
  `routing=${res.data.routing?.kind}, next=${res.data.check?.next}`, { routing: res.data.routing?.kind, next: res.data.check?.next });

writeFileSync(join(B, 'rb_plan.md'), originalPlan);
writeFileSync(join(B, 'rb_status.json'), originalStatus);
writeFileSync(join(B, 'transitions-terminal.chain.json'), JSON.stringify({
  'phases/phase-instantiation.md': { passed: null },
}, null, 2) + '\n');
res = decode(runGate(join(B, 'transitions-terminal.chain.json'), instantiationNode));
emit('terminal:status', res.status === 0 && res.data.check?.passed === true,
  `exit=${res.status}`, { routing: res.data.routing?.kind, next: res.data.check?.next });
emit('terminal:routing', res.data.routing?.kind === 'terminal' && res.data.check?.next === null,
  `routing=${res.data.routing?.kind}, next=${res.data.check?.next}`, { routing: res.data.routing?.kind, next: res.data.check?.next });

res = decode(runGate(realTransitions, instantiationNode));
emit('recovery:status', res.status === 0 && res.data.check?.passed === true,
  `exit=${res.status}`, { routing: res.data.routing?.kind, next: res.data.check?.next });
emit('recovery:routing', res.data.routing?.kind === 'next' && res.data.check?.next === 'phases/phase-hitl1.md',
  `routing=${res.data.routing?.kind}, next=${res.data.check?.next}`, { routing: res.data.routing?.kind, next: res.data.check?.next });
JS
node "$B/routing-contract.mjs" "$B"
```

→ 预期：11 个 check 全部 passed。

---

## Step 3: 从 trace 裁决

```bash
cat > "$B/verify.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';

const bundle = process.argv[2];
const trace = createTrace(bundle + '/_logs/_logs/_trace.jsonl', { consoleEcho: false });
const raw = readFileSync(trace.traceFilePath(), 'utf-8').trim();
const events = raw ? raw.split('\n').map(JSON.parse) : [];
const checks = events.filter(e => e.event === 'check');
const passed = checks.filter(e => e.passed === true);
const failed = checks.filter(e => e.passed !== true);

console.log('checks: ' + checks.length + ' (' + passed.length + ' PASS, ' + failed.length + ' FAIL)');
for (const c of checks) console.log('  ' + c.step + ' → ' + (c.passed ? 'PASS' : 'FAIL'));
if (failed.length > 0 || checks.length !== 11) process.exit(1);
console.log('\nALL CHECKS PASSED');

trace.traceCleanup();
JS
node "$B/verify.mjs" "$B"
```


## Step 4: 结果解读

> 5 个 check，验证 4 种 routing 结果：
>   [next] 正常 current-node + transitions → routing.kind="next"
>   [invalid_input] 错误 current-node → routing.kind="invalid_input"
>   [no_transition] 缺失 control file → routing.kind="no_transition"
>   [terminal] synthetic terminal table → check.next=null, routing.kind="terminal"
>   [recovery] 恢复正常 transitions → routing.kind="next"
>   全部 expected:true → 5/5 PASS 即通过。

## Step 5: Cleanup

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
rm -rf "$B"
```