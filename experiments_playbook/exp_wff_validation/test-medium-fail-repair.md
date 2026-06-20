---
schema: command-experiment/v1
experiment: wff-validation
case: medium-fail-repair
weight: light
case_goal: "证明 Transition Table 驱动的 repair——gate FAIL 时 Gate 返回 inspect/advice + next=null，Playbook 修复后 rerun，Transition Table 最终回答 next"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_wff_val_repair
trace: dpt_disp_wff_val_repair/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

Gate CLI 调 `resolveNodeTransitionDetailed()` 查 Transition Table。`failed` outcome 在表中无匹配 → `routing.kind: 'no_transition'`, `next=null`。Playbook 读 inspect/advice 修复后 rerun——Gate 以 `passed` outcome 重新查表 → Transition Table 回答 next。

## Step 1: 创建 bundle + 展示 Transition Table

```bash
B=$(node experiments/shared/new-disposable-bundle.mjs wff_val_repair --force)
echo "Bundle: $B"
echo ""
echo "=== Transition Table ==="
cat DPT_FRAMEWORK/workflows/transitions.chain.json
```

→ 所有 gate 只有 `passed` 状态有 next。`failed` 无匹配 → `null`。

## Step 2: 删除 rb_plan.md + rb_status.json

```bash
rm $B/rb_plan.md $B/rb_status.json
echo "已删除 rb_plan.md + rb_status.json"
```

## Step 3: instantiation → 2 次 FAIL → 2 次修复 → Transition Table 回答 next

```bash
cat > $B/step3.mjs << 'JS'
const{createTrace}=await import('../DPT_FRAMEWORK/engine/trace.mjs');
const{createLogger}=await import('../DPT_FRAMEWORK/engine/logger.mjs');
const{createWorkflowRuntime,createState,assessNode}=await import('../DPT_FRAMEWORK/engine/workflow-chain.mjs');
const{spawnSync}=await import('node:child_process');
const{existsSync,writeFileSync}=await import('node:fs');
const B=process.argv[2];
const log=createLogger({file:B+'/_logs/run.log'});
const trace=createTrace(B+'/rb_trace.jsonl',{consoleEcho:true});
const gate='instantiation-complete',transitions='DPT_FRAMEWORK/workflows/transitions.chain.json';

const r=assessNode('phases/phase-instantiation.md',createState(),createWorkflowRuntime('engine','DPT_FRAMEWORK/workflows/nodes'),trace,log);
if(r.status!=='loaded')process.exit(1);
console.log('JS回答: node loaded — phases/phase-instantiation.md');
log.info('node loaded');

for(let i=0;i<5;i++){
  const{stdout}=spawnSync('node',['DPT_FRAMEWORK/cli/gates/check-gate-'+gate+'.mjs','--bundle',B,'--current-node','phases/phase-instantiation.md','--transitions',transitions],{encoding:'utf-8'});
  const gr=JSON.parse(stdout);trace.traceEntry('check',{source:'playbook',...gr.check,inspect:gr.inspect,advice:gr.advice});
  const icon=gr.check.passed?'PASS':'FAIL';
  console.log('attempt '+(i+1)+': '+icon+' next='+gr.check.next+' inspect='+JSON.stringify(gr.inspect));
  if(gr.check.passed){
    console.log('Transition Table answered next='+gr.check.next);
    log.info('gate PASS, next='+gr.check.next);
    process.exit(0);
  }
  console.log('Playbook: gate FAIL, next=null → 读 inspect → 修复');
  for(const item of gr.inspect){
    const m=item.match(/^Missing control file: (.+)$/);
    if(m){const f=B+'/'+m[1];if(!existsSync(f)){writeFileSync(f,m[1].endsWith('.json')?'{}':'# '+m[1]+'\n');console.log('  修复: created '+m[1]);log.info('repair: '+m[1]);}}
  }
}
console.log('FAIL: exceeded max');process.exit(1);
JS
node $B/step3.mjs $B
```

→ attempt 1: FAIL, next=null（failed 在 Transition Table 中无匹配）
→ 修复 rb_plan.md → attempt 2: FAIL, next=null（第二个 rule 也 fail）
→ 修复 rb_status.json → attempt 3: PASS, next=phases/phase-hitl1.md

## Step 4–10: 其余 phase

```bash
for node_gate in \
  "phases/phase-hitl1.md:hitl1-recorded" \
  "phases/phase-setup.md:setup-ready" \
  "phases/phase-wave0.md:wave0-complete" \
  "phases/phase-wave1.md:wave1-complete" \
  "phases/phase-wave2.md:wave2-complete" \
  "phases/phase-hitl2.md:hitl2-recorded" \
  "phases/phase-readiness.md:readiness-passed"; do
  IFS=':' read -r node gate <<< "$node_gate"
  echo "$node → $gate"
  cat > $B/s.mjs << 'JS2'
const{createTrace}=await import('../DPT_FRAMEWORK/engine/trace.mjs');const{createLogger}=await import('../DPT_FRAMEWORK/engine/logger.mjs');const{createWorkflowRuntime,createState,assessNode}=await import('../DPT_FRAMEWORK/engine/workflow-chain.mjs');const{spawnSync}=await import('node:child_process');
const B=process.argv[2],node=process.argv[3],gate=process.argv[4];
const log=createLogger({file:B+'/_logs/run.log'});const trace=createTrace(B+'/rb_trace.jsonl',{consoleEcho:true});
const r=assessNode(node,createState(),createWorkflowRuntime('engine','DPT_FRAMEWORK/workflows/nodes'),trace,log);
if(r.status!=='loaded')process.exit(1);
const{stdout}=spawnSync('node',['DPT_FRAMEWORK/cli/gates/check-gate-'+gate+'.mjs','--bundle',B,'--current-node',node,'--transitions','DPT_FRAMEWORK/workflows/transitions.chain.json'],{encoding:'utf-8'});
const gr=JSON.parse(stdout);trace.traceEntry('check',{source:'playbook',...gr.check,inspect:gr.inspect,advice:gr.advice});
log.info('gate '+gr.check.gate+' → '+(gr.check.passed?'PASS':'FAIL')+' next='+gr.check.next);
if(!gr.check.passed||!gr.check.next)process.exit(1);
JS2
  node $B/s.mjs $B "$node" "$gate" || { echo "FAIL"; exit 1; }
done
echo "final (no gate)"
cat > $B/s.mjs << 'JS2'
const{createTrace}=await import('../DPT_FRAMEWORK/engine/trace.mjs');const{createLogger}=await import('../DPT_FRAMEWORK/engine/logger.mjs');const{createWorkflowRuntime,createState,assessNode}=await import('../DPT_FRAMEWORK/engine/workflow-chain.mjs');
const B=process.argv[2];const log=createLogger({file:B+'/_logs/run.log'});const trace=createTrace(B+'/rb_trace.jsonl',{consoleEcho:true});
const r=assessNode('phases/phase-final.md',createState(),createWorkflowRuntime('engine','DPT_FRAMEWORK/workflows/nodes'),trace,log);
if(r.status!=='loaded')process.exit(1);
JS2
node $B/s.mjs $B
```

## Step 11: trace 最终裁决

```bash
cat > $B/verify.mjs << 'JS'
const{readFileSync}=await import('fs');const B=process.argv[2];
const e=readFileSync(B+'/rb_trace.jsonl','utf-8').trim().split('\n').filter(Boolean).map(JSON.parse);
const c=e.filter(x=>x.event==='check'),f=c.filter(x=>!x.passed);
console.log('checks: '+c.length+' ('+(c.length-f.length)+' PASS, '+f.length+' FAIL)');
c.forEach(x=>console.log('  '+(x.passed?'PASS':'FAIL')+' '+x.gate+' next='+(x.next||'null')+' inspect='+JSON.stringify(x.inspect||[])));
if(f.length<2||(c.length-f.length)<1||!c[c.length-1].passed)process.exit(1);
console.log('\nFAIL-REPAIR WITH TRANSITION TABLE: PASS');
JS
node $B/verify.mjs $B
```

## Cleanup

```bash
rm -rf dpt_disp_wff_val_repair_*
```
