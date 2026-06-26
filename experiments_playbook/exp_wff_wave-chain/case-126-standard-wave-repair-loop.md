---
schema: command-experiment/v1
experiment: wff-wave-chain
case: case-126-standard-wave-repair-loop
weight: light
case_goal: "Prove that when the wave2-complete gate fails (no valid Markdown links), the Agent can read inspect/advice, repair the synthesis by adding valid links, rerun the gate, and pass — with the full PDCA loop visible in trace."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-126_w2_repair_*
trace: dpt_disp_case-126_w2_repair_*/_logs/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。实验结果必须来自实际文件写入、gate CLI 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# case-126-standard-wave-repair-loop

## Expected Runtime Path

1. 创建 disposable bundle + pre-seed Wave0/Wave1 targets + 设置 wave2 status
2. 写 synthesis 含 NO valid Markdown links → gate fail
3. 展示完整 gate JSON output，逐条解释 inspect/advice
4. 修复 synthesis（添加 valid Markdown links），展示 before/after diff
5. Rerun gate → pass
6. 从 trace 裁决（mode: last，验证 fail→repair→pass PDCA 回路）
7. Cleanup

---

## Case Goal

证明 PDCA 修复回路：wave2-complete gate 因缺少有效引用而 fail → Agent 读 inspect/advice → 精准修复（添加指向真实文件的 Markdown links）→ rerun → pass。

---

## Step 1: 创建 bundle + pre-seed 所有依赖 + 设置 wave2 status

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs w2_repair --case case-126 --force)
echo "Bundle: $B"

# Validate
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B

# Write rb_plan with topic_registry
cat > $B/rb_plan.md << 'EOF'
---
plan_basename: w2_repair
derived_topic_count: 1
topic_registry:
  - id: t1
    slug: topic-a
    title: Topic A
---
# w2_repair Plan
EOF

# Set status to wave2
cat > $B/rb_status.json << 'EOF'
{
  "current_mode": "execution",
  "state": "in_progress",
  "current_gate": "wave2_complete",
  "next_gate": "hitl2_recorded"
}
EOF

# Pre-seed Wave0 artifacts
mkdir -p $B/artifacts/wave0/topic-a
cat > $B/artifacts/wave0/topic-a/source.yaml << 'EOF'
- url: "https://example.com/ai-safety"
  title: "Understanding AI Safety"
  retrieved_date: "2026-06-15"
  topic_tag: "topic-a"
EOF

# Pre-seed Wave1 artifacts (targets for valid Markdown links)
mkdir -p $B/artifacts/wave1/topic-a
cat > $B/artifacts/wave1/topic-a/skeleton.md << 'EOF'
---
slug: topic-a
title: Topic A Skeleton
---

# Topic A: Foundation Skeleton
## Open Questions
- How to measure alignment progress?
EOF
cat > $B/artifacts/wave1/topic-a/evidence-summary.md << 'EOF'
## Key Findings
1. AI safety requires multi-stakeholder coordination [Source](https://example.com/ai-safety)
EOF
cat > $B/artifacts/wave1/topic-a/question-list.md << 'EOF'
## Topic Investigation Targets
1. How to measure alignment?
## Question Reconciliation
N/A
## Emergent Question Protocol
N/A
## Exploration / Exploitation Decision
Proceed
EOF

# Pre-seed seed_topics
mkdir -p $B/seed_topics
cat > $B/seed_topics/topic-a.md << 'EOF'
---
id: t1
slug: topic-a
title: Topic A
---
# Topic A
## Key Dimensions
- test
## Known Premises
- test
## Open Questions
- test
EOF

# Pre-seed ledger + finding-index (needed by wave2 gate)
mkdir -p $B/artifacts/wave2
cat > $B/artifacts/wave2/cross-topic-ledger.md << 'EOF'
## Cross-Topic Scan Matrix
| Dim | Status |
|-----|--------|
| alignment | active |
## Wave1 Legacy Questions
- How to measure alignment?
## Cross-Topic Resolutions
None
## Emergent Cross-Topic Questions
None
## Exploration Decisions
Proceed
## HITL2 Handoff
Pending
EOF
cat > $B/artifacts/wave2/finding-index.yaml << 'EOF'
- finding_id: W2F-001
  category: legacy
  statement: "test"
  sources: []
  confidence: medium
  decision: resolve_in_synthesis
EOF

echo "=== Pre-seeded artifact targets ==="
find $B/artifacts -type f 2>/dev/null
```

预期：bundle 创建，status 指向 `wave2_complete`→`hitl2_recorded`，所有依赖就绪。

## Step 2: 写 synthesis 含 NO valid Markdown links → gate FAIL

```bash
cat > $B/artifacts/wave2/synthesis.md << 'ENDOFSYN'
# Cross-Topic Synthesis

W2F-001: AI safety requires multi-stakeholder coordination.

## Pattern: AI Safety Across Topics

Based on the [nonexistent skeleton](../wave1/topic-a/nope.md) and
the [missing reference](../wave1/topic-b/also_missing.md), the key
finding is that AI safety requires multi-stakeholder coordination.

Another [dead link](../wave1/topic-c/ghost.md) points nowhere.
ENDOFSYN

echo "=== Synthesis (all dead links) ==="
cat $B/artifacts/wave2/synthesis.md

echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'","event":"wave2_completion"}' >> $B/rb_trace.jsonl

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle $B --current-node phases/phase-wave2.md || true)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_logs/_trace.jsonl',{gate:'wave2-complete',passed:$PASSED,expected:false,detail:'attempt 1: all dead links, cross_field fail'})})"
```

预期：`check.passed: false`。inspect 列出死链接。

## Step 3: 展示 gate JSON output — Agent 读 inspect/advice

```bash
echo "=== Inspect ==="
echo "$GATE_OUTPUT" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);j.inspect.forEach((x,i)=>console.log('  ['+i+']',x))})"

echo ""
echo "=== Advice ==="
echo "$GATE_OUTPUT" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);j.advice.forEach((x,i)=>console.log('  ['+i+']',x))})"
```

## Step 4: 修复 synthesis — 添加 valid Markdown links

```bash
echo "=== Before repair ==="
cat $B/artifacts/wave2/synthesis.md

cat > $B/artifacts/wave2/synthesis.md << 'ENDOFSYN'
# Cross-Topic Synthesis

W2F-001: AI safety requires multi-stakeholder coordination.

## Pattern: AI Safety Across Topics

Based on the [Topic A skeleton](../wave1/topic-a/skeleton.md), the key
finding is that AI safety requires multi-stakeholder coordination.

The [source YAML](../wave0/topic-a/source.yaml) from Wave0 confirms
that alignment measurement is an active but unresolved area.

The [evidence summary](../wave1/topic-a/evidence-summary.md) supports
this with finding 1.
ENDOFSYN

echo ""
echo "=== After repair ==="
cat $B/artifacts/wave2/synthesis.md
```

## Step 5: Rerun gate — 预期 PASS

```bash
GATE_OUTPUT2=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle $B --current-node phases/phase-wave2.md)
echo "$GATE_OUTPUT2"
PASSED2=$(echo "$GATE_OUTPUT2" | node experiments_env/shared/extract-field.mjs check.passed)
echo "gate: wave2-complete (attempt 2) | passed: $PASSED2"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_logs/_trace.jsonl',{gate:'wave2-complete',passed:$PASSED2,detail:'attempt 2: repaired — valid links added, gate pass'})})"
```

预期：`check.passed: true`。

## Step 6: 从 trace 裁决（mode: last）

```bash
echo "=== Trace evidence ==="
cat $B/_logs/_trace.jsonl | while read line; do
  echo "$line" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);const icon=j.passed?'\x1b[32mPASS\x1b[0m':'\x1b[31mFAIL\x1b[0m';console.log(icon,j.gate,'|',j.detail)})"
done

echo ""
echo "=== Verdict (mode: last) ==="
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B/_logs/_trace.jsonl', 'last')})"
```


## Step 7: 结果解读

> 验证 wave gate PDCA 回路：
>   gate fail → read inspect/advice → repair → rerun → gate pass。
>   trace 含 fail+pass 两条 gate_attempt。

## Step 8: Cleanup

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B')})"
```
