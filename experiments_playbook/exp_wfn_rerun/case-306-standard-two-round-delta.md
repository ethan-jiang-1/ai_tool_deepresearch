---
schema: command-experiment/v2
experiment: wfn-rerun
case: case-306-standard-two-round-delta
case_goal: "Agent/filesystem projection only: two scripted rerun rounds update rerun_count and ## 本轮重跑方向 sections; this is not gate or real-Agent proof."
verdict_mode: all
required_checks: [round1-delta, round2-delta]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: standard
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

由 coding agent 在真实 disposable experiment bundle 中执行 scripted Agent/filesystem mutations。Verdict 只检查 YAML/Markdown 文件结果；不得把 PASS 描述为 rerun gate、handoff、real Agent judgment 或 lifecycle proof。

# case-306-standard-two-round-delta

## Step 1: 创建 bundle

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs tworound --case case-306 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
cat > $B/rb_profile.yaml << 'EOF'
plan_basename: tworound
research_profile: quick_factual
root_must_answer_set: ["What is the regulatory landscape?"]
# Synthetic deterministic fixture only; not proof of real Agent research capability.
research_access:
  status: available
  probed_at: "2026-07-10T00:00:00.000Z"
  result_url: "https://example.com/case-306-fixture"
  fetch_outcome: success
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-06-15T10:00:00Z"
  hitl2:
    status: recorded
    user_decision: rerun
    rationale: "Round 1: Add economic impact analysis."
    rerun_count: 0
    recorded_at: "2026-06-20T10:00:00Z"
EOF
mkdir -p $B/seed_topics $B/reference
cat > $B/seed_topics/01_regulation.md << 'EOF'
---
id: "topic-01"
slug: "01_regulation"
title: "AI Regulation Framework"
must_answer: ["What are current frameworks?"]
---
# AI Regulation Framework
## 主题定位 Core regulatory topic.
## must_answer 1. What are current frameworks?
## 假设与缺口 Known: EU AI Act. Gap: US unclear.
EOF
cat > $B/seed_topics/02_industry.md << 'EOF'
---
id: "topic-02"
slug: "02_industry"
title: "Industry Adoption"
must_answer: ["How are companies adopting?"]
---
# Industry Adoption
## 主题定位 Industry adoption baseline.
## must_answer 1. How are companies adopting?
## 假设与缺口 Known: Tech leads. Gap: Non-tech unclear.
EOF
cat > $B/rb_status.json << 'EOF'
{ "current_mode": "execution", "state": "in_progress", "current_gate": "rerun_ready", "next_gate": "seed_topics_ready" }
EOF
```

## Step 2: Round 1 — Agent writes direction hints

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
REPO_ROOT=$(pwd)
echo "" >> $B/seed_topics/01_regulation.md
echo "## 本轮重跑方向" >> $B/seed_topics/01_regulation.md
echo "- **action**: keep" >> $B/seed_topics/01_regulation.md
echo "- **rationale_excerpt**: Round 1" >> $B/seed_topics/01_regulation.md
echo "" >> $B/seed_topics/02_industry.md
echo "## 本轮重跑方向" >> $B/seed_topics/02_industry.md
echo "- **action**: keep" >> $B/seed_topics/02_industry.md
echo "- **rationale_excerpt**: Round 1" >> $B/seed_topics/02_industry.md
cat > $B/seed_topics/03_economic.md << 'EMDEOF'
---
id: "topic-03"
slug: "03_economic"
title: "Economic Impact"
---
# Economic Impact
## 主题定位 New topic round 1.
## 本轮重跑方向
- **action**: add
- **new_search_dimensions**: "economic impact analysis"
- **rationale_excerpt**: Round 1
EMDEOF
node -e "const fs=require('fs');const y=require('yaml');const p=y.parse(fs.readFileSync('$B/rb_profile.yaml','utf-8'));p.human_decision_checkpoints.hitl2.rerun_count=1;fs.writeFileSync('$B/rb_profile.yaml',y.stringify(p));"

# Verify R1
R1_OK=true
C=$(node -e "const fs=require('fs');const y=require('yaml');const p=y.parse(fs.readFileSync('$B/rb_profile.yaml','utf-8'));console.log(p.human_decision_checkpoints.hitl2.rerun_count);")
[ "$C" != "1" ] && R1_OK=false
grep -q "action.*add" $B/seed_topics/03_economic.md || R1_OK=false
grep -q "## 本轮重跑方向" $B/seed_topics/01_regulation.md || R1_OK=false
echo "Round1: count=$C ok=$R1_OK"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'round1-delta',passed:$R1_OK,detail:'rerun_count=1 + direction hints'})})" $R1_OK
```

## Step 3: Round 2 — Agent updates rationale + direction

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
REPO_ROOT=$(pwd)
node -e "const fs=require('fs');const y=require('yaml');const p=y.parse(fs.readFileSync('$B/rb_profile.yaml','utf-8'));p.human_decision_checkpoints.hitl2.rerun_count=2;fs.writeFileSync('$B/rb_profile.yaml',y.stringify(p));"
cat > $B/seed_topics/01_regulation.md << 'ENDOFFILE'
---
id: "topic-01"
slug: "01_regulation"
title: "AI Regulation Framework"
---
# AI Regulation Framework
## 主题定位 Core topic.
## 本轮重跑方向
- **action**: supplement
- **new_search_dimensions**: "cost-benefit analysis"
- **adjusted_depth**: exploratory_map
- **rationale_excerpt**: Round 2
ENDOFFILE

# Verify R2
R2_OK=true
C=$(node -e "const fs=require('fs');const y=require('yaml');const p=y.parse(fs.readFileSync('$B/rb_profile.yaml','utf-8'));console.log(p.human_decision_checkpoints.hitl2.rerun_count);")
[ "$C" != "2" ] && R2_OK=false
grep -q "action.*supplement" $B/seed_topics/01_regulation.md || R2_OK=false
grep -q "cost-benefit" $B/seed_topics/01_regulation.md || R2_OK=false
grep -q "exploratory_map" $B/seed_topics/01_regulation.md || R2_OK=false
grep -q "## 本轮重跑方向" $B/seed_topics/02_industry.md || R2_OK=false
[ -f $B/seed_topics/03_economic.md ] || R2_OK=false
echo "Round2: count=$C ok=$R2_OK"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'round2-delta',passed:$R2_OK,detail:'rerun_count=2 + direction updated'})})" $R2_OK
```

## Step 4: Verdict

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

## Step 7: 结果解读

> 仅验证 scripted filesystem projection：`rerun_count` 0→1→2，Round 1/2 的 Markdown direction sections 按预期变化。此 case 不调用 gate，也不证明 real Agent 能正确判断 rerun 内容。

Stop after native completion. The Autorun Supervisor owns Standard health, audit, preservation, and optional clean-PASS cleanup.
