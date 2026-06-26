---
schema: command-experiment/v1
experiment: wff-validation
case: case-51-standard-happy-path
weight: light
case_goal: "证明 Transition Table（transitions.chain.json）驱动 workflow——Gate CLI 以 --current-node 驱动，调 resolveNodeTransitionDetailed 查表获取 routing/next，Playbook 读 next 加载下一 node"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-51_wff_val_happy
trace: dpt_disp_case-51_wff_val_happy/_logs/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

Playbook 是 workflow controller。**Transition Table**（`transitions.chain.json`）是 Node 转移的单一事实来源——Gate CLI 以 `--current-node` 驱动，内部调 `resolveNodeTransitionDetailed()` 查表获取详细路由结果。Playbook 不需要持路由表、不需要传 `--next` flag——只传 `--current-node` 和 `--transitions` 告诉 Gate 表和当前 node，Gate 回答的 `check.next` 和 `routing` 就是下一步信息。

# case-51-standard-happy-path

## Expected Runtime Path

1. 创建 bundle + 预填所有 phase artifact [MAIN/SHELL]
2. 逐 gate 推进: instantiation→hitl1→setup→seed-topics→wave0→wave1→wave2→hitl2→readiness [MAIN/SHELL]
3. 每个 gate: assessNode → gate CLI --current-node --transitions → Transition Table 回答 next [MAIN/SHELL]
4. Final node load → lifecycle 终止 [MAIN/SHELL]
5. 从 trace 裁决 (≥8 check events, 全部 passed:true) + Cleanup

## Step 1: 创建 bundle + 展示 Transition Table

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs wff_val_happy --case case-51 --force)
echo "Bundle: $B"
echo ""
echo "=== Transition Table（Node 转移的单一事实来源）==="
cat DPT_FRAMEWORK/workflows/transitions.chain.json
```

→ 8 条 (currentNodeRef, outcome) → next_node 映射。Gate CLI 用 `resolveNodeTransitionDetailed()` 查这张表。

---

以下 Step 2–10：每步 Playbook 让 Gate 查表——Gate 回答的 `check.next` 就是完整的 node 文件路径，Playbook 直接 `assessNode(next)` 加载。

---

## Step 1.5: 预填 bundle 内容（所有 gate 需要的 artifact + trace + status）

gate 检查的是真实文件。必须先写入 HITL1 payload、topic registry、wave artifacts、trace events、status 等。

```bash
# --- HITL1 profile ---
cat > $B/rb_profile.yaml << 'EOF'
plan_basename: case-51_wff_val_happy
research_profile: quick_factual
root_must_answer_set:
  - "What is the current state of AI safety research?"
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-06-21T00:00:00.000Z"
    research_profile_selection: quick_factual
  hitl2:
    status: recorded
    answerability_class: ready_substantive
    user_decision: proceed_to_readiness
    final_report_view: profile_default
    recorded_at: "2026-06-21T01:00:00.000Z"
EOF

# --- Plan with topic_registry ---
cat > $B/rb_plan.md << 'EOF'
---
{"plan_basename":"wff_val_happy","derived_topic_count":1,"topic_registry":[{"id":"topic-a","slug":"topic-a","title":"AI Safety"}]}
---
# Research Plan
EOF

# --- Seed topics ---
mkdir -p $B/seed_topics
cat > $B/seed_topics/topic-a.md << 'EOF'
---
slug: topic-a
title: AI Safety Research
---
# Topic: AI Safety
EOF

# --- Wave0: reference ---
mkdir -p $B/artifacts/wave0/topic-a
cat > $B/reference/_INDEX.md << 'EOF'
# Reference Index
- [AI Safety](topic-a/source.yaml)
EOF
# Per-topic reference file (wave1 gate count_floor expects reference/*topic-a-*.md)
cat > $B/reference/topic-a-foundation.md << 'EOF'
# Topic A — Foundation Reference
Source: [AI Safety Overview](https://example.com/ai-safety)
EOF
# README + 00-shared (wave0 gate requires both)
cat > $B/reference/README.md << 'EOF'
# Reference Directory
Flat reference directory for the case-51 research run.
EOF
cat > $B/reference/00-shared-foundation.md << 'EOF'
# Shared Foundation Reference
Baseline reference material for all topics.
EOF
cat > $B/artifacts/wave0/topic-a/source.yaml << 'EOF'
- url: "https://example.com/ai-safety"
  title: "AI Safety Overview"
  retrieved_date: "2026-06-15"
  topic_tag: "topic-a"
EOF

# --- Wave1: skeleton ---
mkdir -p $B/artifacts/wave1/topic-a
cat > $B/artifacts/wave1/topic-a/skeleton.md << 'EOF'
---
capability: foundation-placeholder
---
# Skeleton: AI Safety

This is a foundation-placeholder skeleton for topic-a.
EOF

# --- Wave1: evidence-summary + question-list ---
cat > $B/artifacts/wave1/topic-a/evidence-summary.md << 'EOF'
## Key Findings
1. AI safety research is an active and growing field [AI Safety Overview](https://example.com/ai-safety)
EOF

cat > $B/artifacts/wave1/topic-a/question-list.md << 'EOF'
## Topic Investigation Targets
1. What are the main dimensions of AI safety research?
## Question Reconciliation
N/A — foundation phase
## Emergent Question Protocol
N/A — deferred to expansion waves
## Exploration / Exploitation Decision
Continue to wave2 synthesis with current evidence
EOF

# --- Wave2: synthesis + ledger + finding-index ---
mkdir -p $B/artifacts/wave2
cat > $B/artifacts/wave2/synthesis.md << 'EOF'
# Cross-Topic Synthesis

Key findings from the research waves. Finding W2F-001: AI safety spans technical, policy, and societal dimensions.
See [topic-a skeleton](../wave1/topic-a/skeleton.md) and [evidence summary](../wave1/topic-a/evidence-summary.md) for details.
EOF

cat > $B/artifacts/wave2/cross-topic-ledger.md << 'EOF'
## Cross-Topic Scan Matrix
| Topic | Status | Key Finding |
|-------|--------|-------------|
| topic-a | foundation-complete | AI safety spans 3 dimensions |

## Wave1 Legacy Questions
- What are the main dimensions of AI safety research? (from question-list.md)

## Cross-Topic Resolutions
None — single topic foundation phase

## Emergent Cross-Topic Questions
None yet — deferred to expansion waves

## Exploration Decisions
Proceed to HITL2 with foundation-level findings

## HITL2 Handoff
Foundation evidence complete. Recommend expansion waves for deeper coverage.
EOF

cat > $B/artifacts/wave2/finding-index.yaml << 'EOF'
- finding_id: W2F-001
  category: legacy
  statement: "AI safety spans technical, policy, and societal dimensions"
  sources:
    - "../artifacts/wave0/topic-a/source.yaml"
  confidence: medium
  decision: resolve_in_synthesis
EOF

# --- HITL2: decision brief ---
mkdir -p $B/artifacts/hitl2
cat > $B/artifacts/hitl2/decision-brief.md << 'EOF'
# Final Review Decision Brief

Research is complete. All waves passed.
Proceed to readiness and final delivery.
EOF

# --- rb_status: start execution mode ---
cat > $B/rb_status.json << 'EOF'
{"current_mode":"execution","state":"in_progress","current_gate":"instantiation_complete","next_gate":"hitl1_recorded"}
EOF

# --- Phase completion trace events ---
for phase in instantiation hitl1 setup wave0 wave1 wave2 hitl2; do
  echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",\"event\":\"${phase}_completion\",\"phase\":\"$phase\"}" >> $B/rb_trace.jsonl
done

# hitl2-recorded gate checks for this specific event name
echo "{\"event\":\"hitl2_recorded\",\"phase\":\"hitl2\"}" >> $B/rb_trace.jsonl
# --- Gate attempt events (readiness gate audits these) ---
for g in instantiation-complete hitl1-recorded setup-ready seed-topics-ready wave0-complete wave1-complete wave2-complete hitl2-recorded; do
  echo "{\"event\":\"gate_attempt\",\"gate\":\"$g\",\"passed\":true}" >> $B/rb_trace.jsonl
done
echo "=== Pre-seed complete ==="
```

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
echo '{"current_mode":"execution","state":"in_progress","current_gate":"setup_ready","next_gate":"wave0_complete"}' > $B/rb_status.json
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
echo '{"current_mode":"execution","state":"in_progress","current_gate":"hitl1_recorded","next_gate":"setup_ready"}' > $B/rb_status.json
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
echo '{"current_mode":"execution","state":"in_progress","current_gate":"setup_ready","next_gate":"seed_topics_ready"}' > $B/rb_status.json
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
echo '{"current_mode":"execution","state":"in_progress","current_gate":"wave0_complete","next_gate":"wave1_complete"}' > $B/rb_status.json
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
echo '{"current_mode":"execution","state":"in_progress","current_gate":"wave1_complete","next_gate":"wave2_complete"}' > $B/rb_status.json
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
echo '{"current_mode":"execution","state":"in_progress","current_gate":"wave2_complete","next_gate":"hitl2_recorded"}' > $B/rb_status.json
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
echo '{"current_mode":"execution","state":"in_progress","current_gate":"hitl2_recorded","next_gate":"readiness_passed"}' > $B/rb_status.json
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
echo '{"current_mode":"execution","state":"in_progress","current_gate":"readiness_passed","next_gate":"none"}' > $B/rb_status.json
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


## Step 12: 结果解读

> ≥8 个 check，验证 Transition Table 驱动的 9 phase/8 gate 全部 pass：
>   每个 gate 的 check.passed=true 且 check.next 指向下一 phase。
>   Transition Table 是路由的单一事实来源。

## Step 13: Cleanup

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
rm -rf dpt_disp_case-51_wff_val_happy_*
```