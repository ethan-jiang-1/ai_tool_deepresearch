---
schema: command-experiment/v1
experiment: wff-validation
case: medium-fail-repair
weight: light
case_goal: "证明 Playbook 读 JS 的 inspect/advice 逐次修复——gate 每次只报第一个问题，Playbook 修好后 rerun 才揭示下一个，直到全部 PASS"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_wff_val_repair
trace: dpt_disp_wff_val_repair/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

Playbook 是 workflow controller。Gate CLI 每次只报告第一个失败规则（`break` at first failure）。Playbook 读 inspect/advice → 修复 → rerun → gate 揭示下一个问题 → 再修 → 直到 PASS。

## Step 1: 创建 bundle + 加载路由表

```bash
B=$(node experiments/shared/new-disposable-bundle.mjs wff_val_repair --force)
echo "Bundle: $B"
cat experiments/prototype-wff-validation/manifest.json
```

→ 路由同 happy path。instantiation gate 有 2 条 file_exists rule。

## Step 2: 删除 rb_plan.md + rb_status.json 制造 2 个故障

```bash
rm $B/rb_plan.md $B/rb_status.json
echo "已删除 rb_plan.md + rb_status.json"
```

## Step 3: instantiation gate → 2 次 FAIL → 2 次修复 → PASS

```bash
cat > $B/step3.mjs << 'JS'
import { createTrace } from '../DPT_FRAMEWORK/engine/trace.mjs';
import { createLogger } from '../DPT_FRAMEWORK/engine/logger.mjs';
import { createWorkflowRuntime, createState, assessNode } from '../DPT_FRAMEWORK/engine/workflow-chain.mjs';
import { spawnSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';

const B = process.argv[2];
const log = createLogger({ file: B + '/_logs/run.log' });
const trace = createTrace(B + '/rb_trace.jsonl', { consoleEcho: true });
const gate = 'instantiation-complete';
const next = 'phases/phase-hitl1.md';

const r = assessNode('phases/phase-instantiation.md', createState(), createWorkflowRuntime('engine', 'experiments/prototype-wff-validation/nodes'), trace, log);
if (r.status !== 'loaded') { process.exit(1); }
console.log('JS回答: node loaded — phases/phase-instantiation.md');
log.info('node loaded: phases/phase-instantiation.md');

for (let attempt = 0; attempt < 5; attempt++) {
  const { stdout } = spawnSync('node', ['DPT_FRAMEWORK/cli/gates/check-gate-'+gate+'.mjs', '--bundle', B, '--next', next], { encoding: 'utf-8' });
  const gr = JSON.parse(stdout);
  trace.traceEntry('check', { source: 'playbook', ...gr.check, inspect: gr.inspect, advice: gr.advice });

  const icon = gr.check.passed ? 'PASS' : 'FAIL';
  console.log('attempt ' + (attempt+1) + ': gate ' + gr.check.gate + ' → ' + icon);
  console.log('  inspect: ' + JSON.stringify(gr.inspect));
  console.log('  advice:  ' + JSON.stringify(gr.advice));

  if (gr.check.passed) {
    console.log('ALL RULES PASS — gate cleared after ' + attempt + ' repair(s)');
    log.info('gate ' + gr.check.gate + ' → PASS after ' + attempt + ' repairs');
    process.exit(0);
  }

  console.log('Playbook: 读 inspect → 修复');
  for (const item of gr.inspect) {
    const m = item.match(/^Missing control file: (.+)$/);
    if (m) {
      const f = B + '/' + m[1];
      if (!existsSync(f)) {
        writeFileSync(f, m[1].endsWith('.json') ? '{}' : '# ' + m[1] + '\n\nCreated by Playbook repair.\n');
        console.log('  Playbook修复: created ' + m[1]);
        log.info('repair #' + (attempt+1) + ': created ' + m[1]);
      }
    }
  }
}
console.log('FAIL: exceeded max retries'); process.exit(1);
JS
node $B/step3.mjs $B
```

→ 预期：attempt 1 FAIL (rb_plan.md) → 修复 → attempt 2 FAIL (rb_status.json) → 修复 → attempt 3 PASS。

## Step 4–10: 其余 phase 逐个 PASS

```bash
for step in \
  "4:phases/phase-hitl1.md:hitl1-recorded:phases/phase-setup.md:hitl1" \
  "5:phases/phase-setup.md:setup-ready:phases/phase-wave0.md:setup" \
  "6:phases/phase-wave0.md:wave0-complete:phases/phase-wave1.md:wave0" \
  "7:phases/phase-wave1.md:wave1-complete:phases/phase-wave2.md:wave1" \
  "8:phases/phase-wave2.md:wave2-complete:phases/phase-hitl2.md:wave2" \
  "9:phases/phase-hitl2.md:hitl2-recorded:phases/phase-readiness.md:hitl2" \
  "10:phases/phase-readiness.md:readiness-passed:phases/phase-final.md:readiness"; do
  IFS=':' read -r num node gate next key <<< "$step"
  echo "Step $num: $key → gate=$gate"
  cat > $B/s.mjs << 'JS2'
import {createTrace}from'../DPT_FRAMEWORK/engine/trace.mjs';import {createLogger}from'../DPT_FRAMEWORK/engine/logger.mjs';import {createWorkflowRuntime,createState,assessNode}from'../DPT_FRAMEWORK/engine/workflow-chain.mjs';import {spawnSync}from'node:child_process';
const B=process.argv[2],node=process.argv[3],gate=process.argv[4],next=process.argv[5];
const log=createLogger({file:B+'/_logs/run.log'});
const trace=createTrace(B+'/rb_trace.jsonl',{consoleEcho:true});
const r=assessNode(node,createState(),createWorkflowRuntime('engine','experiments/prototype-wff-validation/nodes'),trace,log);
if(r.status!=='loaded')process.exit(1);
log.info('node loaded: '+node);
const{stdout}=spawnSync('node',['DPT_FRAMEWORK/cli/gates/check-gate-'+gate+'.mjs','--bundle',B,'--next',next],{encoding:'utf-8'});
const gr=JSON.parse(stdout);trace.traceEntry('check',{source:'playbook',...gr.check,inspect:gr.inspect,advice:gr.advice});
log.info('gate '+gr.check.gate+' → '+(gr.check.passed?'PASS':'FAIL')+' next='+gr.check.next);
console.log('  gate: '+(gr.check.passed?'PASS':'FAIL')+' next='+gr.check.next);
if(!gr.check.passed||gr.check.next!==next)process.exit(1);
JS2
  node $B/s.mjs $B "$node" "$gate" "$next"
done
echo "Step 11: final (no gate)"
cat > $B/s.mjs << 'JS2'
import {createTrace}from'../DPT_FRAMEWORK/engine/trace.mjs';import {createLogger}from'../DPT_FRAMEWORK/engine/logger.mjs';import {createWorkflowRuntime,createState,assessNode}from'../DPT_FRAMEWORK/engine/workflow-chain.mjs';
const B=process.argv[2];const log=createLogger({file:B+'/_logs/run.log'});
const trace=createTrace(B+'/rb_trace.jsonl',{consoleEcho:true});
const r=assessNode('phases/phase-final.md',createState(),createWorkflowRuntime('engine','experiments/prototype-wff-validation/nodes'),trace,log);
if(r.status!=='loaded')process.exit(1);
log.info('node loaded: phases/phase-final.md — lifecycle complete');
console.log('  node loaded — lifecycle complete');
JS2
node $B/s.mjs $B
```

## Step 12: trace 最终裁决

```bash
cat > $B/verify.mjs << 'JS'
import { readFileSync } from 'node:fs';
const B = process.argv[2];
const events = readFileSync(B + '/rb_trace.jsonl', 'utf-8').trim().split('\n').map(JSON.parse);
const checks = events.filter(e => e.event === 'check');
const checksFail = checks.filter(e => !e.passed);
const checksPass = checks.filter(e => e.passed);

console.log('total checks: ' + checks.length + ' (' + checksFail.length + ' FAIL, ' + checksPass.length + ' PASS)');
checks.forEach(e => console.log('  ' + e.gate + ' → ' + (e.passed ? 'PASS' : 'FAIL') + ' inspect=' + JSON.stringify(e.inspect||[])));

let ok = true;
if (checksFail.length < 2) { console.log('FAIL: expected >=2 check FAIL (sequential reveals)'); ok = false; }
if (checksPass.length < 1) { console.log('FAIL: expected >=1 check PASS after repair'); ok = false; }
if (!checks[checks.length-1].passed) { console.log('FAIL: final check not PASS'); ok = false; }
if (!ok) process.exit(1);
console.log('FAIL-REPAIR VERIFICATION: PASS');
JS
node $B/verify.mjs $B
```

## Cleanup

```bash
rm -rf dpt_disp_wff_val_repair_*
```
