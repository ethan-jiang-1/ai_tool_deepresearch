---
schema: command-experiment/v1
experiment: wff-pre-research
case: case-104-standard-hitl1-exploratory-map
weight: light
case_goal: "Prove the HITL1 gate passes when research_profile is exploratory_map with a broad must-answer set and recorded marker."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-104_wff_em_*
trace: dpt_disp_case-104_wff_em_*/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。AI 自动写入 exploratory_map payload。

# case-104-standard-hitl1-exploratory-map

验证 `research_profile: exploratory_map` 在 payload 完整时 gate 通过。


## Expected Runtime Path

1. 创建 disposable bundle + 写入 rb_profile.yaml (exploratory_map) [MAIN/SHELL]
2. 运行 hitl1-recorded gate [MAIN/SHELL]
3. 验证 check.passed=true, check.next=phases/phase-setup.md [MAIN/SHELL]
4. 从 trace 裁决 + Cleanup

## Step 1: 创建 bundle

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs wff_em --case case-104 --force)
echo "Bundle: $B"
echo "$B" > /tmp/pb_bundle
```

## Step 2: 写入 exploratory_map payload

`research_access` 使用 synthetic valid observation，只证明 deterministic gate mechanics，不证明真实 search/fetch capability。

```bash
REPO_ROOT=$(pwd)
B=$(cat /tmp/pb_bundle)
cat > $B/rb_profile.yaml << 'EOF'
plan_basename: wff_em
research_profile: exploratory_map
root_must_answer_set:
  - "What is the full landscape of AI governance frameworks worldwide?"
  - "Which jurisdictions are planning new AI legislation in 2026?"
  - "How do different regulatory philosophies affect innovation timelines?"
research_access:
  status: available
  probed_at: "2026-07-10T00:00:00.000Z"
  result_url: "https://example.com/deterministic-hitl1-fixture"
  fetch_outcome: success
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
GATE=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle $B --gate hitl1-recorded -- node DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs --bundle $B --current-node phases/phase-hitl1.md)
echo "$GATE" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log('passed:',j.check.passed);console.log('next:',j.check.next)})"
PASSED=$(echo "$GATE" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'hitl1-recorded',passed:$PASSED,detail:'exploratory_map payload'})})"
```

## Step 4: Verdict

```bash
REPO_ROOT=$(pwd)
B=$(cat /tmp/pb_bundle)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B/rb_trace.jsonl')})"
```


## Step 5: 结果解读

> 验证 HITL1 gate 接受 exploratory_map profile：
>   写入合法 payload → gate pass, next=phases/phase-setup.md。


## Step HH: Post-Execution Health

Standard profile — gate diagnostics, timeline consistency.

```bash
node experiments_env/shared/verify-bundle-health.mjs --bundle $B --profile standard
```

> 健康检查不改变 verdict。health status 由 runner report 记录。

## Step 6: Cleanup

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
REPO_ROOT=$(pwd)
B=$(cat /tmp/pb_bundle)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B')})"
```
