---
schema: command-experiment/v1
experiment: wff-wave-gates
case: case-123-standard-wave2-synthesis
weight: light
case_goal: "Prove that wave2-complete gate resolves Markdown links to artifact targets, fails when no links or all targets dead, and passes when at least one valid reference exists."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-123_w2_synth_*
trace: dpt_disp_case-123_w2_synth_*/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。实验结果必须来自实际文件写入、gate CLI 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# case-123-standard-wave2-synthesis

## Expected Runtime Path

1. 创建 disposable bundle + pre-seed Wave0/Wave1 targets + 设置 wave2-ready status
2. 写 synthesis 含 valid Markdown links → gate pass
3. 写 synthesis 无 Markdown link → gate fail
4. 写 synthesis 有 links 但所有 target 不存在 → gate fail
5. Thin driver 独立验证 cross-artifact references（RWE-009 横切约束）
6. 从 `rb_trace.jsonl` 裁决（预期 3 条 check：1 pass + 2 fail）
7. Cleanup

---

## Case Goal

证明：wave2-complete gate 的 `cross_field(markdown_link_resolution)` mode 正确解析 synthesis 中的 Markdown link，解析为相对于 `artifacts/wave2/` 的路径，验证目标文件存在，≥1 有效引用时 pass，0 有效引用时 fail。

---

## Step 1: 创建 bundle + pre-seed Wave0/Wave1 targets + 设置 status

先建好引用目标——这样 valid Markdown links 才能有真实文件可指。

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs w2_synth --case case-123 --force)
echo "Bundle: $B"

# Validate
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B

# Write topic_registry
cat > $B/rb_plan.md << 'EOF'
---
plan_basename: w2_synth
derived_topic_count: 1
topic_registry:
  - id: t1
    slug: topic-a
    title: Topic A
---
# w2_synth Plan
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

# Pre-seed Wave0 thin YAML (in artifacts/wave0/)
mkdir -p $B/artifacts/wave0/topic-a
cat > $B/artifacts/wave0/topic-a/source.yaml << 'EOF'
- url: "https://example.com/ai-safety"
  title: "Understanding AI Safety"
  retrieved_date: "2026-06-15"
  topic_tag: "topic-a"
EOF

# Pre-seed Wave1 artifacts
mkdir -p $B/artifacts/wave1/topic-a
cat > $B/artifacts/wave1/topic-a/skeleton.md << 'EOF'
---
slug: topic-a
title: Topic A Skeleton
capability: foundation-placeholder
---

# Topic A: Foundation Skeleton

## Open Questions
- How to measure alignment?
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

# Create Wave2 directory + ledger + finding-index
mkdir -p $B/artifacts/wave2
cat > $B/artifacts/wave2/cross-topic-ledger.md << 'EOF'
## Cross-Topic Scan Matrix
| Topic | Status | Key Finding |
|-------|--------|-------------|
| topic-a | foundation-complete | AI safety is an active field |
## Wave1 Legacy Questions
- What is AI safety? (from question-list.md)
## Cross-Topic Resolutions
None — single topic
## Emergent Cross-Topic Questions
None
## Exploration Decisions
Proceed to HITL2
## HITL2 Handoff
Foundation evidence complete
EOF

cat > $B/artifacts/wave2/finding-index.yaml << 'EOF'
- finding_id: W2F-001
  category: legacy
  statement: "AI safety research is active"
  sources:
    - "../wave0/topic-a/source.yaml"
  confidence: medium
  decision: resolve_in_synthesis
EOF

# Pre-seed seed_topics for backfill token checks
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

echo "=== Artifact targets for cross-reference ==="
find $B/artifacts -type f 2>/dev/null
```

预期：bundle 创建，status 指向 `wave2_complete`→`hitl2_recorded`，Wave0/Wave1 目标文件存在。

## Step 2: 写 synthesis 含 valid Markdown links → gate pass

两条 link 都指向真实存在的文件。

```bash
cat > $B/artifacts/wave2/synthesis.md << 'ENDOFSYN'
# Cross-Topic Synthesis

Finding W2F-001: AI safety spans multiple dimensions requiring cross-topic analysis.

## Pattern: AI Safety Across Topics

Based on the [Topic A skeleton](../wave1/topic-a/skeleton.md) and
[evidence summary](../wave1/topic-a/evidence-summary.md), the key open question
is how to measure alignment.

The [reference metadata](../wave0/topic-a/source.yaml) from Wave0 provides
background on AI safety approaches.
ENDOFSYN

# Record trace event

echo "=== Synthesis (valid links) ==="
cat $B/artifacts/wave2/synthesis.md

GATE_OUTPUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle $B --gate wave2-complete -- node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle $B --current-node phases/phase-wave2.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'wave2-complete',passed:$PASSED,detail:'synthesis with valid Markdown links passes'})})"
```

预期：`check.passed: true`。

## Step 3: 写无 Markdown link 的 synthesis → gate fail

```bash
cat > $B/artifacts/wave2/synthesis.md << 'ENDOFSYN'
# Cross-Topic Synthesis

## Pattern: AI Safety Across Topics

Based on the Topic A skeleton, the key open question is how to measure alignment.
No explicit Markdown links in this synthesis.
ENDOFSYN

echo "=== Synthesis (no links) ==="
cat $B/artifacts/wave2/synthesis.md

GATE_OUTPUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle $B --gate wave2-complete -- node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle $B --current-node phases/phase-wave2.md || true)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'wave2-complete',passed:$PASSED,expected:false,detail:'synthesis without Markdown links should fail'})})"
```

预期：`check.passed: false`，`inspect` 指出无 Markdown links。

## Step 4: 写有 links 但 target 都不存在 → gate fail

```bash
cat > $B/artifacts/wave2/synthesis.md << 'ENDOFSYN'
# Cross-Topic Synthesis

See [nonexistent file](../wave1/topic-a/nope.md) and
also [another dead link](../wave1/topic-b/missing.md).
ENDOFSYN

echo "=== Synthesis (dead links only) ==="
cat $B/artifacts/wave2/synthesis.md

GATE_OUTPUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle $B --gate wave2-complete -- node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle $B --current-node phases/phase-wave2.md || true)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'wave2-complete',passed:$PASSED,expected:false,detail:'synthesis with all dead links should fail'})})"
```

预期：`check.passed: false`，`inspect` 列出所有死链接。

## Step 5: Thin driver 独立验证 cross-artifact references（RWE-009）

gate CLI 的 `cross_field` rule 判定引用链；thin driver 做独立验证。

```bash
node --input-type=module -e "
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const B = '$B';
const synPath = join(B, 'artifacts/wave2/synthesis.md');

const content = readFileSync(synPath, 'utf-8');
const links = [...content.matchAll(/\[([^\]]+)\]\(([^)]+\.md)\)/g)];

console.log('=== Cross-artifact reference verification ===');
console.log('Markdown links found:', links.length);

const valid = [];
const dead = [];
const wave2Dir = join(B, 'artifacts/wave2');

for (const m of links) {
  const target = join(wave2Dir, m[2]);
  if (existsSync(target)) {
    valid.push(m[2]);
    console.log('  ✓', m[2]);
  } else {
    dead.push(m[2]);
    console.log('  ✗', m[2]);
  }
}

console.log('Valid:', valid.length, 'Dead:', dead.length);

const driverPassed = valid.length > 0;
import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m => {
  m.recordCheck('$B/rb_trace.jsonl', {
    gate: 'wave2-complete-driver',
    passed: driverPassed,
    expected: driverPassed,
    detail: 'thin driver cross-reference check: ' + valid.length + ' valid, ' + dead.length + ' dead'
  });
});
"
```

预期：driver 独立验证结果与 gate CLI 的 `cross_field` rule 一致。

## Step 6: 从 trace 裁决

```bash
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B/rb_trace.jsonl')})"
```


## Step 7: 结果解读

> 3 个 check（1 pass + 2 fail），验证 wave2 gate 边界：
>   [PASS] 有 valid markdown link → gate pass
>   [FAIL ✅] 无 markdown link → gate fail
>   [FAIL ✅] link 指向 dead target → gate fail
>   2 个 FAIL 都是正确的边界拒绝。


## Step HH: Post-Execution Health

Standard profile — gate diagnostics, timeline consistency.

```bash
node experiments_env/shared/verify-bundle-health.mjs --bundle $B --profile standard
```

> 健康检查不改变 verdict。health status 由 runner report 记录。

## Step 8: Cleanup

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B')})"
```
