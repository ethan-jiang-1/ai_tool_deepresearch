---
schema: command-experiment/v1
experiment: workflow-foundation
case: medium-wave-repair-loop
weight: light
case_goal: "Prove that when the wave2-complete gate fails (no valid Markdown links), the Agent can read inspect/advice, repair the synthesis by adding valid links, rerun the gate, and pass — with the full PDCA loop visible in trace."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_w2_repair_*
trace: dpt_disp_w2_repair_*/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。实验结果必须来自实际文件写入、gate CLI 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# test-medium-wave-repair-loop

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

证明 PDCA 修复回路：wave2-complete gate 因缺少有效引用而 fail → Agent 读 inspect/advice → 精准修复（添加指向真实文件的 Markdown links）→ rerun → pass。trace 中同时有 failed 和 passed 的 check event，`verdict('last')` 确认最后一次 pass。

选择 Wave2 gate 演示是因为引用链（Markdown link → 目标文件存在性）最容易演示 fail→fix→pass：只需改变 link target 路径即可在 fail 和 pass 之间切换，不需要修改 schema 或 trace。

---

## Step 1: 创建 bundle + pre-seed Wave0/Wave1 targets + 设置 wave2 status

先建好引用目标——这样 repair 时只需在 synthesis 中添加正确的 link 路径就能 pass。

```bash
REPO_ROOT=$(pwd)
B=$(node experiments/shared/new-disposable-bundle.mjs w2_repair --force)
echo "Bundle: $B"

# Validate
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B

# Set status to wave2
cat > $B/rb_status.json << 'EOF'
{
  "current_mode": "execution",
  "state": "in_progress",
  "current_gate": "wave2_complete",
  "next_gate": "hitl2_recorded"
}
EOF

# Pre-seed Wave0 reference target
mkdir -p $B/reference/topic-a
cat > $B/reference/topic-a/source.yaml << 'EOF'
- url: "https://example.com/ai-safety"
  title: "Understanding AI Safety"
  retrieved_date: "2026-06-15"
  topic_tag: "topic-a"
EOF

# Pre-seed Wave1 skeleton target
mkdir -p $B/artifacts/wave1/topic-a
cat > $B/artifacts/wave1/topic-a/skeleton.md << 'EOF'
---
slug: topic-a
title: Topic A Skeleton
capability: foundation-placeholder
---

# Topic A: Foundation Skeleton

## Open Questions
- How to measure alignment progress?
EOF

# Create Wave2 directory
mkdir -p $B/artifacts/wave2

echo "=== Pre-seeded artifact targets ==="
find $B/reference $B/artifacts -type f 2>/dev/null
```

预期：bundle 创建，status 指向 `wave2_complete`→`hitl2_recorded`，Wave0/Wave1 目标文件就绪。

## Step 2: 写 synthesis 含 NO valid Markdown links → gate FAIL

synthesis 文件存在且有正文内容，但其中的 Markdown links 全部指向不存在的文件。

```bash
cat > $B/artifacts/wave2/synthesis.md << 'ENDOFSYN'
# Cross-Topic Synthesis

## Pattern: AI Safety Across Topics

Based on the [nonexistent skeleton](../wave1/topic-a/nope.md) and
the [missing reference](../wave1/topic-b/also_missing.md), the key
finding is that AI safety requires multi-stakeholder coordination.

Another [dead link](../wave1/topic-c/ghost.md) points nowhere.
ENDOFSYN

echo "=== Synthesis (all dead links) ==="
cat $B/artifacts/wave2/synthesis.md

# Record trace event (needed by trace_event_present rule, even for fail case)
echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'","event":"wave2_completion"}' >> $B/rb_trace.jsonl

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle $B --current-node phases/phase-wave2.md || true)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'wave2-complete',passed:$PASSED,expected:false,detail:'attempt 1: all dead links, cross_field fail'})})"
```

预期：`check.passed: false`。inspect 列出 3 条死链接（`nope.md`, `also_missing.md`, `ghost.md`）。advice 建议添加指向已存在 Wave0/Wave1 artifact 的有效 Markdown link。

## Step 3: 展示 gate JSON output — Agent 读 inspect/advice

Agent 现在读这个 JSON output：

- `check.passed` — 预期 `false`
- `inspect` 数组 — 应包含指向 `cross_artifact_references` rule fail 的诊断，列出所有解析到的 Markdown links 及其解析状态（dead/valid）
- `advice` 数组 — 应包含 `failure_message`："No valid artifact references found in synthesis. Add at least one Markdown link..."

```bash
echo "=== Inspect ==="
echo "$GATE_OUTPUT" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);j.inspect.forEach((x,i)=>console.log('  ['+i+']',x))})"

echo ""
echo "=== Advice ==="
echo "$GATE_OUTPUT" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);j.advice.forEach((x,i)=>console.log('  ['+i+']',x))})"
```

## Step 4: 修复 synthesis — 添加 valid Markdown links

Agent 读到了 inspect/advice。现在修复：将 dead links 替换为指向真实文件的 valid links。

```bash
echo "=== Before repair ==="
cat $B/artifacts/wave2/synthesis.md

cat > $B/artifacts/wave2/synthesis.md << 'ENDOFSYN'
# Cross-Topic Synthesis

## Pattern: AI Safety Across Topics

Based on the [Topic A skeleton](../wave1/topic-a/skeleton.md), the key
finding is that AI safety requires multi-stakeholder coordination.
The skeleton's open question "How to measure alignment progress?"
points to a critical gap in current research.

The [reference metadata](../../reference/topic-a/source.yaml) from Wave0
provides background on AI safety approaches, confirming that alignment
measurement is an active but unresolved area.
ENDOFSYN

echo ""
echo "=== After repair ==="
cat $B/artifacts/wave2/synthesis.md
```

**展示 repair diff：**
- Dead links removed：`nope.md`, `also_missing.md`, `ghost.md`
- Valid links added：`../wave1/topic-a/skeleton.md`（→ 真实存在）, `../../reference/topic-a/source.yaml`（→ 真实存在）
- 正文内容保留并增强

## Step 5: Rerun gate — 预期 PASS

```bash
GATE_OUTPUT2=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle $B --current-node phases/phase-wave2.md || true)
echo "$GATE_OUTPUT2"
PASSED2=$(echo "$GATE_OUTPUT2" | node experiments/shared/extract-field.mjs check.passed)
NEXT=$(echo "$GATE_OUTPUT2" | node experiments/shared/extract-field.mjs check.next)
echo "gate: wave2-complete (attempt 2) | passed: $PASSED2 | next: $NEXT"
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'wave2-complete',passed:$PASSED2,detail:'attempt 2: repaired — valid links added, gate pass'})})"
```

预期：`check.passed: true`，`check.next: phases/phase-hitl2.md`。Agent 的修复生效了。

## Step 6: 从 trace 裁决（mode: last）

Trace 中应有 2 个 `check` event：第一个 `passed: false`（attempt 1），第二个 `passed: true`（attempt 2）。使用 `verdict('last')` —— 每个 gate 只取最后一条 check event 裁决。

```bash
echo "=== Trace evidence ==="
cat $B/_trace.jsonl | while read line; do
  echo "$line" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);const icon=j.passed?'\x1b[32mPASS\x1b[0m':'\x1b[31mFAIL\x1b[0m';console.log(icon,j.gate,'|',j.detail)})"
done

echo ""
echo "=== Verdict (mode: last) ==="
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B/_trace.jsonl', 'last')})"
```

## Step 7: Cleanup

```bash
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B')})"
```
