---
schema: command-experiment/v1
experiment: workflow-foundation
case: simple-wave1-boundary
weight: light
case_goal: "Prove that wave1-complete gate correctly detects missing placeholder marker and false completion claims; foundation placeholder boundary is deterministically enforced."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_w1_boundary_*
trace: dpt_disp_w1_boundary_*/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。实验结果必须来自实际文件写入、gate CLI 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# test-simple-wave1-boundary

## Expected Runtime Path

1. 创建 disposable bundle + pre-seed Wave0 reference + 设置 wave1-ready status
2. 写含 `capability: foundation-placeholder` 的 skeleton → gate pass
3. 写 unmarked skeleton（缺 marker）→ gate fail
4. 写含 "full subagent coverage completed" 的 skeleton → gate fail
5. 从 `_trace.jsonl` 裁决（预期 3 条 check：1 pass + 2 fail）
6. Cleanup

---

## Case Goal

证明：wave1-complete gate 通过 `pattern_match` 检测 skeleton artifact 是否标记了 `capability: foundation-placeholder`，并通过 `negate:true` 的 `pattern_match` 排除 false completion claim。

### Foundation 阶段 DO/DON'T

| DO（允许） | DON'T（禁止，会被 gate fail） |
|-----------|---------------------------|
| 写入 topic-scoped skeleton artifact | 声称 "full subagent coverage completed" |
| 显式标注 `capability: foundation-placeholder` | 声称 "deepening done" |
| 引用 Wave0 reference | 声称 "candidate intake completed" |
| 列出已知前提/open questions | 声称 "fan-in review completed" |
| `subagent: true` 只是 future marker | 移除或弱化 placeholder marker |

---

## Step 1: 创建 bundle + pre-seed Wave0 reference + 设置 wave1 status

```bash
REPO_ROOT=$(pwd)
B=$(node experiments/shared/new-disposable-bundle.mjs w1_boundary --force)
echo "Bundle: $B"

# Validate
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B

# Write topic_registry (1 topic)
cat > $B/rb_plan.md << 'EOF'
---
{
  "plan_basename": "w1_boundary",
  "derived_topic_count": 1,
  "topic_registry": [
    { "id": "t1", "slug": "topic-a", "title": "Topic A" }
  ]
}
---
EOF

# Set status to wave1
cat > $B/rb_status.json << 'EOF'
{
  "current_mode": "execution",
  "state": "in_progress",
  "current_gate": "wave1_complete",
  "next_gate": "wave2_complete"
}
EOF

# Pre-seed Wave1 directory
mkdir -p $B/artifacts/wave1/topic-a

# Pre-seed reference directory (Wave0 output, needed for realism)
mkdir -p $B/reference/topic-a
cat > $B/reference/topic-a/source.yaml << 'EOF'
- url: "https://example.com/ai-safety"
  title: "Understanding AI Safety"
  retrieved_date: "2026-06-15"
  topic_tag: "topic-a"
EOF

echo "=== Status ==="
cat $B/rb_status.json
echo "=== Registry ==="
head -12 $B/rb_plan.md
```

预期：bundle 创建，status 指向 `wave1_complete`→`wave2_complete`，registry 含 topic-a。

## Step 2: 写含 placeholder marker 的 skeleton → gate pass

```bash
cat > $B/artifacts/wave1/topic-a/skeleton.md << 'ENDOFSKEL'
---
slug: topic-a
title: Topic A Skeleton
capability: foundation-placeholder
---

# Topic A: Foundation Skeleton

## Known Premises
- AI safety is an active research area.
- Foundation reference provides background on key approaches.

## Key Dimensions
- Technical alignment
- Policy governance

## Open Questions
- How to measure alignment progress?
- What governance frameworks are emerging?

## References
- [Understanding AI Safety](../../reference/topic-a/source.yaml)
ENDOFSKEL

# Record trace event
echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'","event":"wave1_completion"}' >> $B/rb_trace.jsonl

echo "=== Skeleton ==="
head -5 $B/artifacts/wave1/topic-a/skeleton.md

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs --bundle $B --current-node phases/phase-wave1.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node -e "process.stdin.on('data',d=>{console.log(JSON.parse(d).check.passed)})")
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'wave1-complete',passed:$PASSED,detail:'skeleton with placeholder marker passes'})})"
```

预期：`check.passed: true`。

## Step 3: 写 unmarked skeleton（缺 marker）→ gate fail

```bash
cat > $B/artifacts/wave1/topic-a/skeleton.md << 'ENDOFSKEL'
---
slug: topic-a
title: Topic A Skeleton
---

# Topic A

Some content without the required placeholder marker.
ENDOFSKEL

echo "=== Skeleton (no marker) ==="
cat $B/artifacts/wave1/topic-a/skeleton.md

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs --bundle $B --current-node phases/phase-wave1.md || true)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node -e "process.stdin.on('data',d=>{console.log(JSON.parse(d).check.passed)})")
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'wave1-complete',passed:$PASSED,expected:false,detail:'missing placeholder marker should fail'})})"
```

预期：`check.passed: false`，`inspect` 指出缺失 `capability: foundation-placeholder`。

## Step 4: 写含 false completion claim 的 skeleton → gate fail

```bash
cat > $B/artifacts/wave1/topic-a/skeleton.md << 'ENDOFSKEL'
---
slug: topic-a
title: Topic A
capability: foundation-placeholder
---

# Topic A

full subagent coverage completed. All topics have been fully researched.
deepening done. No further work needed.
ENDOFSKEL

echo "=== Skeleton (with false claims) ==="
cat $B/artifacts/wave1/topic-a/skeleton.md

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs --bundle $B --current-node phases/phase-wave1.md || true)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node -e "process.stdin.on('data',d=>{console.log(JSON.parse(d).check.passed)})")
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'wave1-complete',passed:$PASSED,expected:false,detail:'false completion claim should fail'})})"
```

预期：`check.passed: false`，`inspect` 指出 forbidden pattern "full subagent coverage completed" 和 "deepening done"。

## Step 5: 从 trace 裁决

预期 3 条 `check` event：1 pass（Step 2）+ 2 fail（Step 3, 4）。

```bash
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B/_trace.jsonl')})"
```

## Step 6: Cleanup

```bash
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B')})"
```
