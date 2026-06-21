---
schema: command-experiment/v1
experiment: workflow-foundation
case: light-hitl1-claim-verification
weight: light
case_goal: "Prove the HITL1 gate passes when research_profile is claim_verification with a focused single-claim must-answer and recorded marker."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_wff_cv_*
trace: dpt_disp_wff_cv_*/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。AI 自动写入 claim_verification payload。

# test-workflow-foundation-hitl1-claim-verification

验证 `research_profile: claim_verification` 在 payload 完整时 gate 通过。

## Step 1: 创建 bundle

```bash
REPO_ROOT=$(pwd)
B=$(node experiments/shared/new-disposable-bundle.mjs wff_cv --force)
echo "Bundle: $B"
```

## Step 2: 写入 claim_verification payload

```bash
REPO_ROOT=$(pwd)
B=$(ls -d dpt_disp_wff_cv_* | head -1)
cat > $B/rb_profile.yaml << 'EOF'
plan_basename: wff_cv
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
echo "=== Payload ==="
grep -E 'research_profile|root_must_answer|status:|recorded_at' $B/rb_profile.yaml | head -6
```

## Step 3: 运行 hitl1-recorded gate

```bash
REPO_ROOT=$(pwd)
B=$(ls -d dpt_disp_wff_cv_* | head -1)
GATE=$(node DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs --bundle $B --current-node phases/phase-hitl1.md)
echo "$GATE" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log('passed:',j.check.passed);console.log('next:',j.check.next)})"
PASSED=$(echo "$GATE" | node -e "process.stdin.on('data',d=>{console.log(JSON.parse(d).check.passed)})")
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'hitl1-recorded',passed:$PASSED,detail:'claim_verification payload'})})"
```

## Step 4: Verdict

```bash
REPO_ROOT=$(pwd)
B=$(ls -d dpt_disp_wff_cv_* | head -1)
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B/_trace.jsonl')})"
```

## Step 5: Cleanup

```bash
REPO_ROOT=$(pwd)
B=$(ls -d dpt_disp_wff_cv_* | head -1)
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B')})"
```
