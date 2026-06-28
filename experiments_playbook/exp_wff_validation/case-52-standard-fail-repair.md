---
schema: command-experiment/v1
experiment: wff-validation
case: case-52-standard-fail-repair
weight: light
case_goal: "证明 Transition Table 驱动的 repair——gate FAIL 时 Gate 返回 inspect/advice + next=null，Playbook 修复后 rerun，Transition Table 最终回答 next"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-52_wff_val_repair
trace: dpt_disp_case-52_wff_val_repair/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

Gate CLI 调 `resolveNodeTransitionDetailed()` 查 Transition Table。`failed` outcome 在表中无匹配 → `routing.kind: 'no_transition'`, `next=null`。Playbook 读 inspect/advice 修复后 rerun——Gate 以 `passed` outcome 重新查表 → Transition Table 回答 next。

# case-52-standard-fail-repair

## Expected Runtime Path

1. 创建 bundle + 删除关键文件制造 failure [MAIN/SHELL]
2. 第一次 gate: fail, next=null, inspect 列出缺失文件 [MAIN/SHELL]
3. 读 inspect → 修复缺失文件 → rerun [MAIN/SHELL]
4. 循环至 gate pass, Transition Table 最终回答 next [MAIN/SHELL]
5. 从 trace 裁决 + Cleanup

## Step 1: 创建 bundle + 展示 Transition Table

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs wff_val_repair --case case-52 --force)
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
    const m=item.match(/^Missing file: (.+)$/);
    if(m){const f=B+'/'+m[1];if(!existsSync(f)){writeFileSync(f,m[1]==='rb_status.json'?'{"current_mode":"execution","state":"in_progress","current_gate":"setup_ready","next_gate":"seed_topics_ready"}':(m[1]==='rb_plan.md'?'---\nplan_basename: wff_val_repair\n---\n# Repair plan\n':'# '+m[1]+'\n'));console.log('  修复: created '+m[1]);log.info('repair: '+m[1]);}}
  }
}
console.log('FAIL: exceeded max');process.exit(1);
JS
node $B/step3.mjs $B
```

→ attempt 1: FAIL, next=null（failed 在 Transition Table 中无匹配）
→ 修复 rb_plan.md → attempt 2: FAIL, next=null（第二个 rule 也 fail）
→ 修复 rb_status.json → attempt 3: PASS, next=phases/phase-hitl1.md

## Step 3.5: 预填后续 gate 所需的所有 artifact

repair loop 只创建了 `rb_plan.md` 和 `rb_status.json`。后续 gate（hitl1, wave0, wave1, wave2, readiness）各自需要检查文件——必须在此预填，否则 gate 在检查相应规则时 fail。

```bash
# --- HITL1 profile（hitl1-recorded gate 需要）---
cat > $B/rb_profile.yaml << 'EOF'
plan_basename: wff_val_repair
research_profile: quick_factual
root_must_answer_set:
  - "What is the current state of AI safety research?"
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-06-21T00:00:00.000Z"
  hitl2:
    status: recorded
    answerability_class: ready_substantive
    user_decision: proceed_to_readiness
    final_report_view: profile_default
    recorded_at: "2026-06-21T01:00:00.000Z"
EOF

# --- Wave1: skeleton + evidence-summary + question-list ---
mkdir -p $B/artifacts/wave1/topic-a
cat > $B/artifacts/wave1/topic-a/skeleton.md << 'EOF'
---
capability: foundation-placeholder
---
# Skeleton
Foundation skeleton for topic-a.
EOF
cat > $B/artifacts/wave1/topic-a/evidence-summary.md << 'EOF'
## Key Findings
1. AI safety is an active field [Source](https://example.com/ai-safety)
EOF
cat > $B/artifacts/wave1/topic-a/question-list.md << 'EOF'
## Topic Investigation Targets
1. What is AI safety?
## Question Reconciliation
N/A
## Emergent Question Protocol
N/A
## Exploration / Exploitation Decision
Proceed
EOF

# --- Wave2: synthesis + ledger + finding-index ---
mkdir -p $B/artifacts/wave2
cat > $B/artifacts/wave2/synthesis.md << 'EOF'
# Synthesis
Finding W2F-001: key insight. See [evidence](../wave1/topic-a/evidence-summary.md).
EOF
cat > $B/artifacts/wave2/cross-topic-ledger.md << 'EOF'
## Cross-Topic Scan Matrix
Scanned
## Wave1 Legacy Questions
Q1
## Cross-Topic Resolutions
None
## Emergent Cross-Topic Questions
None
## Exploration Decisions
Proceed
## HITL2 Handoff
Ready
EOF
cat > $B/artifacts/wave2/finding-index.yaml << 'EOF'
- finding_id: W2F-001
  category: legacy
  statement: "Test"
  sources: ["https://example.com"]
  confidence: medium
  decision: resolve_in_synthesis
EOF

# --- HITL2: decision brief ---
mkdir -p $B/artifacts/hitl2
echo "# Decision Brief" > $B/artifacts/hitl2/decision-brief.md

# --- Seed topics + reference（wave0 + readiness gate 需要）---
mkdir -p $B/seed_topics $B/artifacts/wave0/topic-a
echo "# Topic" > $B/seed_topics/topic-a.md
cat > $B/reference/_INDEX.md << 'EOF'
# Index
- [Topic](topic-a/source.yaml)
EOF
cat > $B/artifacts/wave0/topic-a/source.yaml << 'EOF'
- url: "https://example.com"
  title: "Test"
  retrieved_date: "2026-06-15"
  topic_tag: "topic-a"
EOF

# --- Additional reference files (wave0/wave1/readiness gates need these) ---
cat > $B/reference/README.md << 'EOF'
# Reference Directory
Flat reference directory for the case-52 research run.
EOF
cat > $B/reference/00-shared-foundation.md << 'EOF'
# Shared Foundation Reference
Baseline reference material for all topics.
EOF
cat > $B/reference/topic-a-foundation.md << 'EOF'
# Topic A — Foundation Reference
Source: [Test](https://example.com)
EOF

# --- Update rb_plan.md with topic_registry (seed-topics-ready gate needs this) ---
cat > $B/rb_plan.md << 'PLANEOF'
---
{"plan_basename":"wff_val_repair","derived_topic_count":1,"topic_registry":[{"id":"topic-a","slug":"topic-a","title":"AI Safety"}]}
---
# Research Plan: wff_val_repair
PLANEOF

# --- Phase completion trace events（后续 gate 检查 prior gate 时需要）---
for phase in instantiation hitl1 setup seed_topics wave0 wave1 wave2 hitl2; do
  echo "{\"event\":\"${phase}_completion\",\"phase\":\"$phase\"}" >> $B/rb_trace.jsonl
done
for g in instantiation-complete hitl1-recorded setup-ready seed-topics-ready wave0-complete wave1-complete wave2-complete hitl2-recorded; do
  echo "{\"event\":\"gate_attempt\",\"gate\":\"$g\",\"passed\":true}" >> $B/rb_trace.jsonl
done

echo "=== All artifacts pre-filled ==="
```

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


## Step 12: 结果解读

> ≥8 个 check，验证 Transition Table fail→repair→pass：
>   attempt 1: gate fail, next=null（failed 无匹配）
>   attempt 2: gate fail（第二个 rule 也 fail）
>   attempt 3: gate pass, next=phases/phase-hitl1.md（修复后 Transition Table 回答 next）
>   后续 phase 全部 pass。最后 check.passed=true 即通过。

## Step 13: Cleanup

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
rm -rf dpt_disp_case-52_wff_val_repair_*
```