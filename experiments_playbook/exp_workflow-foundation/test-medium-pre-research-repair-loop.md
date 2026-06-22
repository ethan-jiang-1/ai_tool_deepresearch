---
schema: command-experiment/v1
experiment: workflow-foundation
case: medium-pre-research-repair-loop
weight: light
case_goal: "Prove that when the HITL1 gate fails (research_profile still not_selected), the Agent can read inspect/advice, repair the profile, rerun the gate, and pass — with the full PDCA loop visible in trace."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_wff_repair_*
trace: dpt_disp_wff_repair_*/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。实验结果必须来自实际文件写入、gate CLI 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# test-workflow-foundation-medium-repair-loop

## Expected Runtime Path

1. 创建 disposable bundle
2. 故意让 profile 处于默认状态（`research_profile: not_selected`）
3. 运行 hitl1-recorded gate → **预期 fail**
4. 展示 gate JSON output，解释 inspect/advice
5. 修复 profile（改 `research_profile` 为 `quick_factual`），展示 diff
6. Rerun same gate → **预期 pass**
7. 从 trace 裁决（trace 中同时有 failed 和 passed 的 check event）
8. Cleanup

---

## Case Goal

证明 PDCA 修复回路：gate fail → Agent 读 inspect/advice → 精准修复 → rerun → pass。trace 必须是完整证据链。

---

## Step 1: 创建 disposable bundle

```bash
REPO_ROOT=$(pwd)
B=$(node experiments/shared/new-disposable-bundle.mjs wff_repair --force)
echo "Bundle: $B"
```

## Step 2: 故意让 profile 处于默认状态

`new-disposable-bundle.mjs` 创建的 `rb_profile.yaml` 默认 `research_profile: not_selected`、`root_must_answer_set: []`、`hitl1.status: not_started`。**我们不做任何修改**，模拟"用户尚未回答 HITL1"的状态。

```bash
echo "=== Current profile (default — simulating unanswered HITL1) ==="
grep -E 'research_profile|root_must_answer|status' $B/rb_profile.yaml
```

展示：`research_profile: not_selected`、`root_must_answer_set: []`、`hitl1.status: not_started`。

## Step 3: 运行 hitl1-recorded gate — 预期 FAIL

这个 gate 检查 profile 是否已填写。当前 profile 全为默认值，应该 fail。

```bash
GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs --bundle $B --current-node phases/phase-hitl1.md || true)
echo "$GATE_OUTPUT"
```

**Agent 现在要读这个 JSON output：**

- `check.passed` — 预期 `false`
- `inspect` 数组 — 应包含：
  - 一条指向 `research_profile` 仍为 `not_selected` 的诊断
  - 一条指向 `root_must_answer_set` 为空的诊断
  - 一条指向 `hitl1.status` 不是 `recorded` 的诊断
- `advice` 数组 — 应包含每条 fail 的修复建议

trace 记录这个 fail：

```bash
PASSED=$(echo "$GATE_OUTPUT" | node experiments/shared/extract-field.mjs check.passed)
node -e "
import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m => {
  m.recordCheck('$B/_trace.jsonl', { gate: 'hitl1-recorded', passed: $PASSED, expected: false, detail: 'default profile — simulating unanswered HITL1' });
});
"
```

## Step 4: 修复 profile

Agent 读到了 inspect/advice。现在执行修复：把 `research_profile` 改成 `quick_factual`，填写 `root_must_answer_set`，写入 HITL1 marker。

```bash
echo "=== Before repair ==="
grep 'research_profile' $B/rb_profile.yaml

cat > $B/rb_profile.yaml << 'EOF'
plan_basename: wff_repair
research_profile: quick_factual
root_must_answer_set:
  - "What are the key risks in AI development?"
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-06-21T12:00:00.000Z"
  hitl2:
    status: not_started
    answerability_class: not_assessed
    user_decision: not_started
    final_report_view: not_started
EOF

echo "=== After repair ==="
grep 'research_profile' $B/rb_profile.yaml
```

**展示 repair diff：** `research_profile` 从 `not_selected` → `quick_factual`。这正是 Agent 读了 inspect 后所做的精准修复。

## Step 5: Rerun same gate — 预期 PASS

```bash
GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs --bundle $B --current-node phases/phase-hitl1.md || true)
echo "$GATE_OUTPUT"
```

`check.passed` — 预期 `true`。Agent 的修复生效了。

```bash
PASSED=$(echo "$GATE_OUTPUT" | node experiments/shared/extract-field.mjs check.passed)
node -e "
import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m => {
  m.recordCheck('$B/_trace.jsonl', { gate: 'hitl1-recorded', passed: $PASSED, detail: 'repaired profile — HITL1 recorded' });
});
"
```

## Step 6: 从 trace 裁决

Trace 中应有 2 个 `check` event：第一个 `passed: false`，第二个 `passed: true`。

```bash
node -e "
import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m => {
  m.verdict('$B/_trace.jsonl', 'last');
});
"
```

## Step 7: Cleanup

```bash
node -e "
import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m => {
  m.cleanup('$B');
});
"
```
