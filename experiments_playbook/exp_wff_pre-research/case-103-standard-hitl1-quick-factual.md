---
schema: command-experiment/v1
experiment: wff-pre-research
case: case-103-standard-hitl1-quick-factual
weight: light
case_goal: "Prove the HITL1 gate passes when research_profile is quick_factual with a valid must-answer set and recorded marker."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-103_wff_qf_*
trace: dpt_disp_case-103_wff_qf_*/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。AI 自动写入 quick_factual payload。

# case-103-standard-hitl1-quick-factual

验证 `research_profile: quick_factual` 在 payload 完整时 gate 通过。


## Expected Runtime Path

1. 创建 disposable bundle + 写入 rb_profile.yaml (quick_factual) [MAIN/SHELL]
2. 运行 hitl1-recorded gate [MAIN/SHELL]
3. 验证 check.passed=true, check.next=phases/phase-setup.md [MAIN/SHELL]
4. 从 trace 裁决 + Cleanup

## Step 1: 创建 bundle

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs wff_qf --case case-103 --force)
echo "Bundle: $B"
echo "$B" > /tmp/pb_bundle
```

## Step 2: 写入 quick_factual payload

```bash
REPO_ROOT=$(pwd)
B=$(cat /tmp/pb_bundle)
cat > $B/rb_profile.yaml << 'EOF'
plan_basename: wff_qf
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
echo "=== Payload ==="
grep -E 'research_profile|root_must_answer|status:|recorded_at' $B/rb_profile.yaml | head -6
```

## Step 3: 运行 hitl1-recorded gate

```bash
REPO_ROOT=$(pwd)
B=$(cat /tmp/pb_bundle)
GATE=$(node DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs --bundle $B --current-node phases/phase-hitl1.md)
echo "$GATE" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log('passed:',j.check.passed);console.log('next:',j.check.next)})"
PASSED=$(echo "$GATE" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'hitl1-recorded',passed:$PASSED,detail:'quick_factual payload'})})"
```

## Step 4: Verdict

```bash
REPO_ROOT=$(pwd)
B=$(cat /tmp/pb_bundle)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B/_trace.jsonl')})"
```


## Step 5: 结果解读

> 验证 HITL1 gate 接受 quick_factual profile：
>   写入合法 payload → gate pass, next=phases/phase-setup.md。

## Step 6: Cleanup

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
REPO_ROOT=$(pwd)
B=$(cat /tmp/pb_bundle)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B')})"
```