---
schema: command-experiment/v1
experiment: wfn-rerun
case: case-306-standard-two-round-delta
weight: light
case_goal: "Agent-driven: two rounds of rerun — verify rerun_count increment and ## 本轮重跑方向 section update."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-306_tworound_*
trace: dpt_disp_case-306_tworound_*/rb_trace.jsonl
verdict: filesystem
agent_dependency: "This case depends on Agent writing ## 本轮重跑方向 sections and incrementing rerun_count. Verdict via filesystem checks (YAML + grep) — not gate-verifiable."
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。Agent 写 direction hints + increment rerun_count。Verdict 靠文件系统检查。

# case-306-standard-two-round-delta

## Step 1: 创建 bundle

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs tworound --case case-306 --force)
cat > $B/rb_profile.yaml << 'EOF'
plan_basename: tworound
research_profile: quick_factual
root_must_answer_set: ["What is the regulatory landscape?"]
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
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m => m.verdict('$B/rb_trace.jsonl'))"
rm -rf $B
```

## 结果解读

> 验证两轮 rerun delta：`rerun_count` 0→1→2 递增，Round 1 写 direction hints（含新增 topic），Round 2 更新 topic-01 为 supplement + depth 升级，未变更 topic 的 section 保留不覆盖。
