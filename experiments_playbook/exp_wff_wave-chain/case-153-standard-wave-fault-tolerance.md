---
schema: command-experiment/v1
experiment: wff-wave-chain
case: case-153-standard-wave-fault-tolerance
weight: light
case_goal: "Prove that wave gate CLIs do not crash on malformed YAML, correctly report partial dead links in inspect while passing overall, and detect status drift — all returning clear inspect/advice without silent pass or crash."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-153_wf_fault_*
trace: dpt_disp_case-153_wf_fault_*/_logs/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。实验结果必须来自实际文件写入、gate CLI 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# case-153-standard-wave-fault-tolerance

## Expected Runtime Path

三个独立 case，各用独立 disposable bundle。不修复错误，只证明 gate 检测正确、不崩溃、返回清晰 inspect/advice。

1. **Case 1**: Malformed YAML → wave0-complete gate 的 `schema_valid` fail，inspect 指向 parse error
2. **Case 2**: Partial dead links → wave2-complete gate pass（`min_valid_refs=1` 满足），但 inspect 报告 dead links
3. **Case 3**: Status drift → wave2-complete gate fail，inspect 指向 status mismatch
4. 从各 bundle trace 分别裁决
5. Cleanup all bundles

---

## Case Goal

证明 gate CLI 的容错性：
- **不崩溃**：malformed YAML 不导致 gate crash，仍返回合法 JSON
- **不 silent pass**：status drift 被精确检测并 fail
- **inspect 完整**：partial dead links 场景 gate 整体 pass，但 inspect 仍列出 dead links

---

## Case 1: Malformed YAML → wave0-complete gate fail（schema_valid）

```bash
REPO_ROOT=$(pwd)

B1=$(node experiments_env/shared/new-disposable-bundle.mjs wf_fault1 --case case-153 --force)
echo "Case 1 Bundle: $B1"

# Write 1-topic registry (YAML frontmatter)
cat > $B1/rb_plan.md << 'EOF'
---
plan_basename: wf_fault1
derived_topic_count: 1
topic_registry:
  - id: t1
    slug: topic-a
    title: Topic A
---
# Plan
EOF

# Set wave0 status
cat > $B1/rb_status.json << 'EOF'
{"current_mode":"execution","state":"in_progress","current_gate":"wave0_complete","next_gate":"wave1_complete"}
EOF

# Create minimal valid reference artifacts (so only the malformed YAML fails)
cat > $B1/reference/_INDEX.md << 'EOF'
# Reference Index
| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 00-shared-test.md | secondary | practitioner | Tier 2 | topic-a | wave0_foundation | accepted | 2026-06-15 |
EOF

cat > $B1/reference/README.md << 'EOF'
# Reference Evidence
Flat reference directory.
EOF

cat > $B1/reference/00-shared-test.md << 'EOF'
# Test
- source_url: https://example.com/ok
- acceptance_status: accepted
- source_type: secondary
- tier: Tier 2
- evidence_role: foundation
- trust_level: practitioner
- why_it_matters: test
- accessed_at: 2026-06-15
- related_topic: topic-a

## Key Facts
- test
## Core Content Capture
test
## Relevance To This Research
test
## Quotable Terms / Concepts
- test
## Risks And Limitations
- test
EOF

# Intentionally malformed YAML (unclosed bracket)
mkdir -p $B1/artifacts/wave0/topic-a
cat > $B1/artifacts/wave0/topic-a/source.yaml << 'EOF'
- url: "https://example.com/ok"
  title: "Valid Entry"
  retrieved_date: "2026-06-15"
  topic_tag: "topic-a"
- url: [unclosed bracket makes this invalid YAML
  title: "Broken Entry"
EOF

echo "=== Malformed YAML ==="
cat $B1/artifacts/wave0/topic-a/source.yaml


echo ""
echo "=== Running wave0-complete gate ==="
GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle $B1 --current-node phases/phase-wave0.md || true)
echo "$GATE_OUTPUT"

echo "$GATE_OUTPUT" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log('is JSON: true');console.log('passed:',j.check.passed);console.log('inspect count:',j.inspect.length);j.inspect.forEach((x,i)=>console.log('  inspect['+i+']:',x))})"

PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B1/_logs/_trace.jsonl',{gate:'wave0-complete',passed:$PASSED,expected:false,detail:'case1: gate survived malformed YAML, schema_valid fail with clear inspect'})})"
```

预期：gate 不 crash，返回合法 JSON。`check.passed: false`。inspect 指向 YAML parse error 或 schema validation failure。

---

## Case 2: Partial dead links → wave2-complete gate pass（cross_field 含 dead link 报告）

```bash
B2=$(node experiments_env/shared/new-disposable-bundle.mjs wf_fault2 --case case-153 --force)
echo "Case 2 Bundle: $B2"

# Write topic_registry
cat > $B2/rb_plan.md << 'EOF'
---
plan_basename: wf_fault2
derived_topic_count: 1
topic_registry:
  - id: t1
    slug: topic-a
    title: Topic A
---
# Plan
EOF

# Set wave2 status
cat > $B2/rb_status.json << 'EOF'
{"current_mode":"execution","state":"in_progress","current_gate":"wave2_complete","next_gate":"hitl2_recorded"}
EOF

# Pre-seed all required artifacts
mkdir -p $B2/artifacts/wave0/topic-a
cat > $B2/artifacts/wave0/topic-a/source.yaml << 'EOF'
- url: "https://example.com/ai-safety"
  title: "Understanding AI Safety"
  retrieved_date: "2026-06-15"
  topic_tag: "topic-a"
EOF

mkdir -p $B2/artifacts/wave1/topic-a
cat > $B2/artifacts/wave1/topic-a/skeleton.md << 'EOF'
# Topic A Skeleton
## Open Questions
- How to measure alignment?
EOF
cat > $B2/artifacts/wave1/topic-a/evidence-summary.md << 'EOF'
## Key Findings
1. AI safety requires coordination [Source](https://example.com/ai-safety)
EOF
cat > $B2/artifacts/wave1/topic-a/question-list.md << 'EOF'
## Topic Investigation Targets
1. How to measure?
## Question Reconciliation
N/A
## Emergent Question Protocol
N/A
## Exploration / Exploitation Decision
Proceed
EOF

mkdir -p $B2/seed_topics
cat > $B2/seed_topics/topic-a.md << 'EOF'
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

mkdir -p $B2/artifacts/wave2
cat > $B2/artifacts/wave2/cross-topic-ledger.md << 'EOF'
## Cross-Topic Scan Matrix
| Dim | Status |
## Wave1 Legacy Questions
- Q1
## Cross-Topic Resolutions
None
## Emergent Cross-Topic Questions
None
## Exploration Decisions
Proceed
## HITL2 Handoff
Done
EOF
cat > $B2/artifacts/wave2/finding-index.yaml << 'EOF'
- finding_id: W2F-001
  category: legacy
  statement: "test"
  sources: []
  confidence: medium
  decision: resolve_in_synthesis
EOF

# Write synthesis: 1 valid link + 2 dead links
cat > $B2/artifacts/wave2/synthesis.md << 'ENDOFSYN'
# Cross-Topic Synthesis

W2F-001: Alignment measurement is an open challenge.

## Pattern: AI Safety

Based on the [valid skeleton reference](../wave1/topic-a/skeleton.md) and
[evidence summary](../wave1/topic-a/evidence-summary.md),
the key finding is that alignment measurement is an open challenge.

Additional context from [dead link A](../wave1/topic-a/nope.md) and
[dead link B](../wave1/topic-b/missing.md) would strengthen this analysis.
ENDOFSYN


echo "=== Running wave2-complete gate ==="
GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle $B2 --current-node phases/phase-wave2.md || true)
echo "$GATE_OUTPUT"

echo "$GATE_OUTPUT" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log('passed:',j.check.passed);console.log('inspect count:',j.inspect.length);j.inspect.forEach((x,i)=>console.log('  inspect['+i+']:',x))})"

PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B2/_logs/_trace.jsonl',{gate:'wave2-complete',passed:$PASSED,expected:true,detail:'case2: gate pass (min_valid_refs=1 met) but inspect reports dead links'})})"
```

预期：`check.passed: true`（1 valid link ≥ min_valid_refs）。inspect 列出 2 条 dead links。

---

## Case 3: Status drift → wave2-complete gate fail（status_value mismatch）

```bash
B3=$(node experiments_env/shared/new-disposable-bundle.mjs wf_fault3 --case case-153 --force)
echo "Case 3 Bundle: $B3"

# Write topic_registry
cat > $B3/rb_plan.md << 'EOF'
---
plan_basename: wf_fault3
derived_topic_count: 1
topic_registry:
  - id: t1
    slug: topic-a
    title: Topic A
---
# Plan
EOF

# Pre-seed all artifacts correctly
mkdir -p $B3/artifacts/wave0/topic-a $B3/artifacts/wave1/topic-a $B3/artifacts/wave2 $B3/seed_topics

cat > $B3/artifacts/wave0/topic-a/source.yaml << 'EOF'
- url: "https://example.com/ai-safety"
  title: "Understanding AI Safety"
  retrieved_date: "2026-06-15"
  topic_tag: "topic-a"
EOF

cat > $B3/artifacts/wave1/topic-a/evidence-summary.md << 'EOF'
## Key Findings
1. Test [Source](https://example.com/test)
EOF
cat > $B3/artifacts/wave1/topic-a/question-list.md << 'EOF'
## Topic Investigation Targets
1. Test?
## Question Reconciliation
N/A
## Emergent Question Protocol
N/A
## Exploration / Exploitation Decision
Proceed
EOF

cat > $B3/seed_topics/topic-a.md << 'EOF'
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

cat > $B3/artifacts/wave2/synthesis.md << 'ENDOFSYN'
# Synthesis
W2F-001: Test finding.
See [evidence](../wave1/topic-a/evidence-summary.md) for details.
ENDOFSYN

cat > $B3/artifacts/wave2/cross-topic-ledger.md << 'EOF'
## Cross-Topic Scan Matrix
| Dim | Status |
## Wave1 Legacy Questions
- Q1
## Cross-Topic Resolutions
None
## Emergent Cross-Topic Questions
None
## Exploration Decisions
Proceed
## HITL2 Handoff
Done
EOF
cat > $B3/artifacts/wave2/finding-index.yaml << 'EOF'
- finding_id: W2F-001
  category: legacy
  statement: "test"
  sources: []
  confidence: medium
  decision: resolve_in_synthesis
EOF

# BUT set current_gate to wrong value
cat > $B3/rb_status.json << 'EOF'
{"current_mode":"execution","state":"in_progress","current_gate":"wave1_complete","next_gate":"hitl2_recorded"}
EOF

echo "=== Status (drifted) ==="
cat $B3/rb_status.json


echo "=== Running wave2-complete gate ==="
GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle $B3 --current-node phases/phase-wave2.md || true)
echo "$GATE_OUTPUT"

echo "$GATE_OUTPUT" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log('passed:',j.check.passed);console.log('inspect count:',j.inspect.length);j.inspect.forEach((x,i)=>console.log('  inspect['+i+']:',x))})"

PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B3/_logs/_trace.jsonl',{gate:'wave2-complete',passed:$PASSED,expected:false,detail:'case3: status drift detected'})})"
```

预期：`check.passed: false`。inspect 指向 `status_value` rule fail。

---

## Step 4: 从各 bundle trace 分别裁决

```bash
echo "=== Case 1 Verdict (malformed YAML) ==="
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B1/_logs/_trace.jsonl')})"

echo ""
echo "=== Case 2 Verdict (partial dead links) ==="
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B2/_logs/_trace.jsonl')})"

echo ""
echo "=== Case 3 Verdict (status drift) ==="
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B3/_logs/_trace.jsonl')})"
```


## Step 5: 结果解读

> 验证 wave gate CLI 容错：
>   malformed YAML → gate 不崩溃，返回 clear inspect
>   partial dead links → gate 正确报告
>   status drift → gate 正确检测
>   全部边界场景 gate 不崩溃。

## Step 6: Cleanup all bundles

```bash
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B1')})"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B2')})"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B3')})"
```
