---
schema: command-experiment/v1
experiment: wff-validation
case: simple-happy-path
weight: light
case_goal: "证明 Transition Table（transitions.chain.json）驱动 workflow——Gate CLI 以 --current-node 驱动，调 resolveNodeTransitionDetailed 查表获取 routing/next，Playbook 读 next 加载下一 node"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_wff_val_happy
trace: dpt_disp_wff_val_happy/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

Playbook 是 workflow controller。**Transition Table**（`transitions.chain.json`）是 Node 转移的单一事实来源——Gate CLI 以 `--current-node` 驱动，内部调 `resolveNodeTransitionDetailed()` 查表获取详细路由结果。Playbook 不需要持路由表、不需要传 `--next` flag——只传 `--current-node` 和 `--transitions` 告诉 Gate 表和当前 node，Gate 回答的 `check.next` 和 `routing` 就是下一步信息。

## Step 1: 创建 bundle + 展示 Transition Table

```bash
B=$(node experiments/shared/new-disposable-bundle.mjs wff_val_happy --force)
echo "Bundle: $B"
echo ""
echo "=== Transition Table（Node 转移的单一事实来源）==="
cat DPT_FRAMEWORK/workflows/transitions.chain.json
```

→ 8 条 (currentNodeRef, outcome) → next_node 映射。Gate CLI 用 `resolveNodeTransitionDetailed()` 查这张表。

---

以下 Step 2–10：每步 Playbook 让 Gate 查表——Gate 回答的 `check.next` 就是完整的 node 文件路径，Playbook 直接 `assessNode(next)` 加载。

---

## Step 2: instantiation

```bash
cat > $B/step.mjs << 'JS'
const {createTrace}=await import('../DPT_FRAMEWORK/engine/trace.mjs');
const {createLogger}=await import('../DPT_FRAMEWORK/engine/logger.mjs');
const {createWorkflowRuntime,createState,assessNode}=await import('../DPT_FRAMEWORK/engine/workflow-chain.mjs');
const {spawnSync}=await import('node:child_process');
const B=process.argv[2],node=process.argv[3],gate=process.argv[4];
const log=createLogger({file:B+'/_logs/run.log'});
const trace=createTrace(B+'/rb_trace.jsonl',{consoleEcho:true});
const r=assessNode(node,createState(),createWorkflowRuntime('engine','DPT_FRAMEWORK/workflows/nodes'),trace,log);
if(r.status!=='loaded'){console.log('FAIL: node load');process.exit(1);}
console.log('JS回答: node loaded — '+node);
log.info('node loaded: '+node);
const{stdout}=spawnSync('node',['DPT_FRAMEWORK/cli/gates/check-gate-'+gate+'.mjs','--bundle',B,'--current-node',node,'--transitions','DPT_FRAMEWORK/workflows/transitions.chain.json'],{encoding:'utf-8'});
const gr=JSON.parse(stdout);trace.traceEntry('check',{source:'playbook',...gr.check,inspect:gr.inspect,advice:gr.advice});
log.info('gate '+gr.check.gate+' → '+(gr.check.passed?'PASS':'FAIL')+' next='+gr.check.next);
console.log('JS回答: gate — passed='+gr.check.passed+' next='+gr.check.next);
if(!gr.check.passed){console.log('FAIL: expected PASS');process.exit(1);}
JS
node $B/step.mjs $B "phases/phase-instantiation.md" "instantiation-complete"
```

→ Gate 调 `resolveNodeTransitionDetailed(..., 'phases/phase-instantiation.md', 'passed')` → Transition Table 回答 `kind: 'next', next: 'phases/phase-hitl1.md'`。Playbook 拿到 `check.next`，继续。

## Step 3: hitl1

```bash
cat > $B/step.mjs << 'JS'
const{createTrace}=await import('../DPT_FRAMEWORK/engine/trace.mjs');const{createLogger}=await import('../DPT_FRAMEWORK/engine/logger.mjs');const{createWorkflowRuntime,createState,assessNode}=await import('../DPT_FRAMEWORK/engine/workflow-chain.mjs');const{spawnSync}=await import('node:child_process');
const B=process.argv[2],node=process.argv[3],gate=process.argv[4];
const log=createLogger({file:B+'/_logs/run.log'});
const trace=createTrace(B+'/rb_trace.jsonl',{consoleEcho:true});
const r=assessNode(node,createState(),createWorkflowRuntime('engine','DPT_FRAMEWORK/workflows/nodes'),trace,log);
if(r.status!=='loaded')process.exit(1);
log.info('node loaded: '+node);
const{stdout}=spawnSync('node',['DPT_FRAMEWORK/cli/gates/check-gate-'+gate+'.mjs','--bundle',B,'--current-node',node,'--transitions','DPT_FRAMEWORK/workflows/transitions.chain.json'],{encoding:'utf-8'});
const gr=JSON.parse(stdout);trace.traceEntry('check',{source:'playbook',...gr.check,inspect:gr.inspect,advice:gr.advice});
if(!gr.check.passed||!gr.check.next)process.exit(1);
JS
node $B/step.mjs $B "phases/phase-hitl1.md" "hitl1-recorded"
```

→ `resolveNodeTransitionDetailed(..., 'phases/phase-hitl1.md', 'passed')` → `phases/phase-setup.md`

## Step 4: setup

```bash
cat > $B/step.mjs << 'JS'
const{createTrace}=await import('../DPT_FRAMEWORK/engine/trace.mjs');const{createLogger}=await import('../DPT_FRAMEWORK/engine/logger.mjs');const{createWorkflowRuntime,createState,assessNode}=await import('../DPT_FRAMEWORK/engine/workflow-chain.mjs');const{spawnSync}=await import('node:child_process');
const B=process.argv[2],node=process.argv[3],gate=process.argv[4];
const log=createLogger({file:B+'/_logs/run.log'});const trace=createTrace(B+'/rb_trace.jsonl',{consoleEcho:true});
const r=assessNode(node,createState(),createWorkflowRuntime('engine','DPT_FRAMEWORK/workflows/nodes'),trace,log);
if(r.status!=='loaded')process.exit(1);
const{stdout}=spawnSync('node',['DPT_FRAMEWORK/cli/gates/check-gate-'+gate+'.mjs','--bundle',B,'--current-node',node,'--transitions','DPT_FRAMEWORK/workflows/transitions.chain.json'],{encoding:'utf-8'});
const gr=JSON.parse(stdout);trace.traceEntry('check',{source:'playbook',...gr.check,inspect:gr.inspect,advice:gr.advice});
if(!gr.check.passed||!gr.check.next)process.exit(1);
JS
node $B/step.mjs $B "phases/phase-setup.md" "setup-ready"
```

→ `next = phases/phase-wave0.md`

## Step 5: wave0

```bash
cat > $B/step.mjs << 'JS'
const{createTrace}=await import('../DPT_FRAMEWORK/engine/trace.mjs');const{createLogger}=await import('../DPT_FRAMEWORK/engine/logger.mjs');const{createWorkflowRuntime,createState,assessNode}=await import('../DPT_FRAMEWORK/engine/workflow-chain.mjs');const{spawnSync}=await import('node:child_process');
const B=process.argv[2],node=process.argv[3],gate=process.argv[4];const log=createLogger({file:B+'/_logs/run.log'});const trace=createTrace(B+'/rb_trace.jsonl',{consoleEcho:true});
const r=assessNode(node,createState(),createWorkflowRuntime('engine','DPT_FRAMEWORK/workflows/nodes'),trace,log);
if(r.status!=='loaded')process.exit(1);
const{stdout}=spawnSync('node',['DPT_FRAMEWORK/cli/gates/check-gate-'+gate+'.mjs','--bundle',B,'--current-node',node,'--transitions','DPT_FRAMEWORK/workflows/transitions.chain.json'],{encoding:'utf-8'});
const gr=JSON.parse(stdout);trace.traceEntry('check',{source:'playbook',...gr.check,inspect:gr.inspect,advice:gr.advice});
if(!gr.check.passed||!gr.check.next)process.exit(1);
JS
node $B/step.mjs $B "phases/phase-wave0.md" "wave0-complete"
```

→ `next = phases/phase-wave1.md`

## Step 6: wave1

```bash
cat > $B/step.mjs << 'JS'
const{createTrace}=await import('../DPT_FRAMEWORK/engine/trace.mjs');const{createLogger}=await import('../DPT_FRAMEWORK/engine/logger.mjs');const{createWorkflowRuntime,createState,assessNode}=await import('../DPT_FRAMEWORK/engine/workflow-chain.mjs');const{spawnSync}=await import('node:child_process');
const B=process.argv[2],node=process.argv[3],gate=process.argv[4];const log=createLogger({file:B+'/_logs/run.log'});const trace=createTrace(B+'/rb_trace.jsonl',{consoleEcho:true});
const r=assessNode(node,createState(),createWorkflowRuntime('engine','DPT_FRAMEWORK/workflows/nodes'),trace,log);
if(r.status!=='loaded')process.exit(1);
const{stdout}=spawnSync('node',['DPT_FRAMEWORK/cli/gates/check-gate-'+gate+'.mjs','--bundle',B,'--current-node',node,'--transitions','DPT_FRAMEWORK/workflows/transitions.chain.json'],{encoding:'utf-8'});
const gr=JSON.parse(stdout);trace.traceEntry('check',{source:'playbook',...gr.check,inspect:gr.inspect,advice:gr.advice});
if(!gr.check.passed||!gr.check.next)process.exit(1);
JS
node $B/step.mjs $B "phases/phase-wave1.md" "wave1-complete"
```

→ `next = phases/phase-wave2.md`

## Step 7: wave2

```bash
cat > $B/step.mjs << 'JS'
const{createTrace}=await import('../DPT_FRAMEWORK/engine/trace.mjs');const{createLogger}=await import('../DPT_FRAMEWORK/engine/logger.mjs');const{createWorkflowRuntime,createState,assessNode}=await import('../DPT_FRAMEWORK/engine/workflow-chain.mjs');const{spawnSync}=await import('node:child_process');
const B=process.argv[2],node=process.argv[3],gate=process.argv[4];const log=createLogger({file:B+'/_logs/run.log'});const trace=createTrace(B+'/rb_trace.jsonl',{consoleEcho:true});
const r=assessNode(node,createState(),createWorkflowRuntime('engine','DPT_FRAMEWORK/workflows/nodes'),trace,log);
if(r.status!=='loaded')process.exit(1);
const{stdout}=spawnSync('node',['DPT_FRAMEWORK/cli/gates/check-gate-'+gate+'.mjs','--bundle',B,'--current-node',node,'--transitions','DPT_FRAMEWORK/workflows/transitions.chain.json'],{encoding:'utf-8'});
const gr=JSON.parse(stdout);trace.traceEntry('check',{source:'playbook',...gr.check,inspect:gr.inspect,advice:gr.advice});
if(!gr.check.passed||!gr.check.next)process.exit(1);
JS
node $B/step.mjs $B "phases/phase-wave2.md" "wave2-complete"
```

→ `next = phases/phase-hitl2.md`

## Step 8: hitl2

```bash
cat > $B/step.mjs << 'JS'
const{createTrace}=await import('../DPT_FRAMEWORK/engine/trace.mjs');const{createLogger}=await import('../DPT_FRAMEWORK/engine/logger.mjs');const{createWorkflowRuntime,createState,assessNode}=await import('../DPT_FRAMEWORK/engine/workflow-chain.mjs');const{spawnSync}=await import('node:child_process');
const B=process.argv[2],node=process.argv[3],gate=process.argv[4];const log=createLogger({file:B+'/_logs/run.log'});const trace=createTrace(B+'/rb_trace.jsonl',{consoleEcho:true});
const r=assessNode(node,createState(),createWorkflowRuntime('engine','DPT_FRAMEWORK/workflows/nodes'),trace,log);
if(r.status!=='loaded')process.exit(1);
const{stdout}=spawnSync('node',['DPT_FRAMEWORK/cli/gates/check-gate-'+gate+'.mjs','--bundle',B,'--current-node',node,'--transitions','DPT_FRAMEWORK/workflows/transitions.chain.json'],{encoding:'utf-8'});
const gr=JSON.parse(stdout);trace.traceEntry('check',{source:'playbook',...gr.check,inspect:gr.inspect,advice:gr.advice});
if(!gr.check.passed||!gr.check.next)process.exit(1);
JS
node $B/step.mjs $B "phases/phase-hitl2.md" "hitl2-recorded"
```

→ `next = phases/phase-readiness.md`

## Step 9: readiness

```bash
cat > $B/step.mjs << 'JS'
const{createTrace}=await import('../DPT_FRAMEWORK/engine/trace.mjs');const{createLogger}=await import('../DPT_FRAMEWORK/engine/logger.mjs');const{createWorkflowRuntime,createState,assessNode}=await import('../DPT_FRAMEWORK/engine/workflow-chain.mjs');const{spawnSync}=await import('node:child_process');
const B=process.argv[2],node=process.argv[3],gate=process.argv[4];const log=createLogger({file:B+'/_logs/run.log'});const trace=createTrace(B+'/rb_trace.jsonl',{consoleEcho:true});
const r=assessNode(node,createState(),createWorkflowRuntime('engine','DPT_FRAMEWORK/workflows/nodes'),trace,log);
if(r.status!=='loaded')process.exit(1);
const{stdout}=spawnSync('node',['DPT_FRAMEWORK/cli/gates/check-gate-'+gate+'.mjs','--bundle',B,'--current-node',node,'--transitions','DPT_FRAMEWORK/workflows/transitions.chain.json'],{encoding:'utf-8'});
const gr=JSON.parse(stdout);trace.traceEntry('check',{source:'playbook',...gr.check,inspect:gr.inspect,advice:gr.advice});
if(!gr.check.passed||!gr.check.next)process.exit(1);
JS
node $B/step.mjs $B "phases/phase-readiness.md" "readiness-passed"
```

→ `next = phases/phase-final.md`

## Step 10: final（无 gate，终止）

```bash
cat > $B/step.mjs << 'JS'
const{createTrace}=await import('../DPT_FRAMEWORK/engine/trace.mjs');const{createLogger}=await import('../DPT_FRAMEWORK/engine/logger.mjs');const{createWorkflowRuntime,createState,assessNode}=await import('../DPT_FRAMEWORK/engine/workflow-chain.mjs');
const B=process.argv[2];const log=createLogger({file:B+'/_logs/run.log'});const trace=createTrace(B+'/rb_trace.jsonl',{consoleEcho:true});
const r=assessNode('phases/phase-final.md',createState(),createWorkflowRuntime('engine','DPT_FRAMEWORK/workflows/nodes'),trace,log);
if(r.status!=='loaded')process.exit(1);
log.info('lifecycle complete');
JS
node $B/step.mjs $B
```

→ manifest gate=null → 不出 gate CLI → lifecycle 终止。

---

## Step 11: trace 最终裁决

```bash
cat > $B/verify.mjs << 'JS'
const{readFileSync}=await import('fs');const B=process.argv[2];
const e=readFileSync(B+'/rb_trace.jsonl','utf-8').trim().split('\n').filter(Boolean).map(JSON.parse);
const c=e.filter(x=>x.event==='check'),f=c.filter(x=>!x.passed);
console.log('checks: '+c.length+' ('+(c.length-f.length)+' PASS, '+f.length+' FAIL)');
c.forEach(x=>console.log('  '+x.gate+' → '+(x.passed?'PASS':'FAIL')+' next='+(x.next||'null')));
if(f.length>0||c.length<8)process.exit(1);
console.log('\nALL CHECKS PASSED');
JS
node $B/verify.mjs $B
```

## Cleanup

```bash
rm -rf dpt_disp_wff_val_happy_*
```
