---
schema: command-experiment/v1
experiment: workflow-foundation
case: heavy-hitl1-manual-review
weight: heavy
case_goal: "Enumerate all 3 research_profile values + edge cases, prove the HITL1 gate correctly passes valid profiles and correctly fails invalid/partial ones. In auto mode the AI answers on behalf of the human; in manual mode the human writes payload."
runner: coding-agent
agent_mode: auto
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_wff_manual_*
trace: dpt_disp_wff_manual_*/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

`agent_mode: auto`（默认）：AI 自动为每个 test vector 生成 payload，不等待人工输入。
`agent_mode: manual`：AI 在 HITL1 步骤停下，等待人类写入 `rb_profile.yaml` 后继续。

---

# test-workflow-foundation-heavy-hitl1-manual-review

## Expected Runtime Path

1. 创建 disposable bundle
2. 按 test vector 表逐条写入 `rb_profile.yaml`，每条跑一次 `hitl1-recorded` gate
3. 每个 vector 记录一个 `check` event 到 trace
4. 从 trace 裁决：所有 `expect: pass` 的 vector 必须 `passed: true`，所有 `expect: fail` 的必须 `passed: false`
5. Cleanup

---

## Case Goal

证明 `hitl1-recorded` gate 能正确区分合法与非法 HITL1 payload：
- 3 种 `research_profile` 在 payload 完整时都能 pass
- `not_selected`、空 `must_answer`、缺失 marker 时 fail
- 正面 + 负面全覆盖

---

## Step 1: 创建 disposable bundle

```bash
REPO_ROOT=$(pwd)
B=$(node experiments/shared/new-disposable-bundle.mjs wff_manual --force)
echo "Bundle: $B"
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B 2>&1 | tail -1
```

---

## Step 2: 枚举 test vectors

每个 vector 是一个 HITL1 payload 变体。写入 → 跑 gate → 记录 check。

### Vector A: `quick_factual`（expect: pass）

```bash
REPO_ROOT=$(pwd)
B=$(ls -d dpt_disp_wff_manual_* | head -1)
cat > $B/rb_profile.yaml << 'EOF'
plan_basename: wff_manual
research_profile: quick_factual
root_must_answer_set:
  - "What are the key differences in AI regulation between the EU, US, and China?"
  - "Which regulatory approach has the strongest enforcement mechanism?"
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-06-21T15:00:00.000Z"
  hitl2:
    status: not_started
    answerability_class: not_assessed
    user_decision: not_started
    final_report_view: not_started
EOF
GATE=$(node DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs --bundle $B --current-node phases/phase-hitl1.md) || true
PASSED=$(echo "$GATE" | node experiments/shared/extract-field.mjs check.passed)
echo "quick_factual: passed=$PASSED (expect: true)"
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'hitl1-recorded',passed:$PASSED,detail:'vectorA: quick_factual (expect: pass)'})})"
```

### Vector B: `exploratory_map`（expect: pass）

```bash
REPO_ROOT=$(pwd)
B=$(ls -d dpt_disp_wff_manual_* | head -1)
cat > $B/rb_profile.yaml << 'EOF'
plan_basename: wff_manual
research_profile: exploratory_map
root_must_answer_set:
  - "What is the full landscape of AI governance frameworks worldwide?"
  - "Which jurisdictions are planning new AI legislation in 2026?"
  - "How do different regulatory philosophies affect innovation timelines?"
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-06-21T15:00:00.000Z"
  hitl2:
    status: not_started
    answerability_class: not_assessed
    user_decision: not_started
    final_report_view: not_started
EOF
GATE=$(node DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs --bundle $B --current-node phases/phase-hitl1.md) || true
PASSED=$(echo "$GATE" | node experiments/shared/extract-field.mjs check.passed)
echo "exploratory_map: passed=$PASSED (expect: true)"
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'hitl1-recorded',passed:$PASSED,detail:'vectorB: exploratory_map (expect: pass)'})})"
```

### Vector C: `claim_verification`（expect: pass）

```bash
REPO_ROOT=$(pwd)
B=$(ls -d dpt_disp_wff_manual_* | head -1)
cat > $B/rb_profile.yaml << 'EOF'
plan_basename: wff_manual
research_profile: claim_verification
root_must_answer_set:
  - "Is the claim that 'the EU AI Act will stifle innovation' supported by evidence?"
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-06-21T15:00:00.000Z"
  hitl2:
    status: not_started
    answerability_class: not_assessed
    user_decision: not_started
    final_report_view: not_started
EOF
GATE=$(node DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs --bundle $B --current-node phases/phase-hitl1.md) || true
PASSED=$(echo "$GATE" | node experiments/shared/extract-field.mjs check.passed)
echo "claim_verification: passed=$PASSED (expect: true)"
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'hitl1-recorded',passed:$PASSED,detail:'vectorC: claim_verification (expect: pass)'})})"
```

### Vector D: `not_selected`（expect: fail — 默认值未改）

```bash
REPO_ROOT=$(pwd)
B=$(ls -d dpt_disp_wff_manual_* | head -1)
cat > $B/rb_profile.yaml << 'EOF'
plan_basename: wff_manual
research_profile: not_selected
root_must_answer_set:
  - "Some question"
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-06-21T15:00:00.000Z"
  hitl2:
    status: not_started
    answerability_class: not_assessed
    user_decision: not_started
    final_report_view: not_started
EOF
GATE=$(node DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs --bundle $B --current-node phases/phase-hitl1.md) || true
PASSED=$(echo "$GATE" | node experiments/shared/extract-field.mjs check.passed)
echo "not_selected: passed=$PASSED (expect: false)"
INSPECT=$(echo "$GATE" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log(j.inspect.filter(x=>x.includes('not_selected')).length>0)})")
echo "inspect mentions not_selected: $INSPECT"
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'hitl1-recorded',passed:$PASSED,expected:false,detail:'vectorD: not_selected (expect: fail)'})})"
```

### Vector E: empty `root_must_answer_set`（expect: fail）

```bash
REPO_ROOT=$(pwd)
B=$(ls -d dpt_disp_wff_manual_* | head -1)
cat > $B/rb_profile.yaml << 'EOF'
plan_basename: wff_manual
research_profile: quick_factual
root_must_answer_set: []
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-06-21T15:00:00.000Z"
  hitl2:
    status: not_started
    answerability_class: not_assessed
    user_decision: not_started
    final_report_view: not_started
EOF
GATE=$(node DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs --bundle $B --current-node phases/phase-hitl1.md) || true
PASSED=$(echo "$GATE" | node experiments/shared/extract-field.mjs check.passed)
echo "empty must_answer: passed=$PASSED (expect: false)"
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'hitl1-recorded',passed:$PASSED,expected:false,detail:'vectorE: empty must_answer (expect: fail)'})})"
```

### Vector F: missing `hitl1.status`（expect: fail）

```bash
REPO_ROOT=$(pwd)
B=$(ls -d dpt_disp_wff_manual_* | head -1)
cat > $B/rb_profile.yaml << 'EOF'
plan_basename: wff_manual
research_profile: quick_factual
root_must_answer_set:
  - "Some question"
human_decision_checkpoints:
  hitl1:
    status: not_started
  hitl2:
    status: not_started
    answerability_class: not_assessed
    user_decision: not_started
    final_report_view: not_started
EOF
GATE=$(node DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs --bundle $B --current-node phases/phase-hitl1.md) || true
PASSED=$(echo "$GATE" | node experiments/shared/extract-field.mjs check.passed)
echo "hitl1 not recorded: passed=$PASSED (expect: false)"
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'hitl1-recorded',passed:$PASSED,expected:false,detail:'vectorF: hitl1 not recorded (expect: fail)'})})"
```

---

## Step 3: 从 trace 裁决

```bash
REPO_ROOT=$(pwd)
B=$(ls -d dpt_disp_wff_manual_* | head -1)

echo "=== Trace evidence ==="
cat $B/_trace.jsonl | while read line; do
  echo "$line" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);const icon=j.passed?'\x1b[32m✓\x1b[0m':'\x1b[31m✗\x1b[0m';console.log(icon,j.gate,'|',j.detail)})"
done

echo ""
echo "=== Expected vs Actual ==="
cat $B/_trace.jsonl | node -e "
process.stdin.on('data', d => {
  const lines = d.trim().split('\n').filter(Boolean);
  const checks = lines.map(l => JSON.parse(l)).filter(e => e.event === 'check');
  let allCorrect = true;
  for (const c of checks) {
    const expectPass = c.detail.includes('expect: pass');
    const correct = c.passed === expectPass;
    const mark = correct ? '\x1b[32m✓\x1b[0m' : '\x1b[31mWRONG\x1b[0m';
    console.log(mark, c.detail.split('(')[1]?.replace(')',''), '| got passed='+c.passed);
    if (!correct) allCorrect = false;
  }
  console.log('');
  console.log(allCorrect ? '\x1b[32mAll vectors correct\x1b[0m' : '\x1b[31mSome vectors wrong\x1b[0m');
  if (!allCorrect) process.exit(1);
});
"
```

## Step 4: Cleanup

```bash
REPO_ROOT=$(pwd)
B=$(ls -d dpt_disp_wff_manual_* | head -1)
node -e "
import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m => {
  m.cleanup('$B');
});
"
```
