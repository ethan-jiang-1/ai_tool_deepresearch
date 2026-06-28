---
schema: command-experiment/v1
experiment: wfn-rerun
case: case-304-light-gate-fail-max-count
weight: light
case_goal: "Rerun node boundary: rerun_count=3 → gate fail + no_transition."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-304_maxcount_*
trace: dpt_disp_case-304_maxcount_*/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。

# case-304-light-gate-fail-max-count

边界：`rerun_count=3` → gate fail → no_transition。

## Step 1: 创建 bundle

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs maxcount --case case-304 --force)
cat > $B/rb_profile.yaml << 'EOF'
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-06-15T10:00:00Z"
    research_profile: quick_factual
    root_must_answer_set: ["Test question?"]
  hitl2:
    status: recorded
    user_decision: rerun
    rationale: "Fourth attempt — should be blocked."
    rerun_count: 3
    recorded_at: "2026-06-20T10:00:00Z"
EOF
mkdir -p $B/seed_topics $B/reference
cat > $B/seed_topics/01_test.md << 'EOF'
---
id: "topic-01"
slug: "01_test"
title: "Test Topic"
---
# Test Topic
EOF
cat > $B/rb_status.json << 'EOF'
{ "current_mode": "execution", "state": "in_progress", "current_gate": "rerun_ready", "next_gate": "seed_topics_ready" }
EOF
```

## Step 2: gate fail

```bash
GO=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle $B --gate rerun-ready -- node DPT_FRAMEWORK/cli/gates/check-gate-rerun-ready.mjs --bundle $B --current-node phases/phase-rerun.md)
PASSED=$(echo "$GO" | node experiments_env/shared/extract-field.mjs check.passed)
echo "rerun-ready passed=$PASSED (expected: false)"
OK=false; [ "$PASSED" = "false" ] && OK=true
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'rerun-ready-max-count',passed:$OK,detail:'rerun_count=3 → gate fail'})})" $OK

HAS=$(echo "$GO" | grep -c "rerun_count" || true)
RK=$(echo "$GO" | node experiments_env/shared/extract-field.mjs routing.kind)
echo "inspect has rerun_count: $([ $HAS -gt 0 ] && echo yes || echo no) routing: $RK"
OK=false; [ $HAS -gt 0 ] && [ "$RK" = "no_transition" ] && OK=true
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'rerun-ready-routing',passed:$OK,detail:'inspect+routing verified'})})" $OK
```

## Step 3: Verdict

```bash
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m => m.verdict('$B/rb_trace.jsonl'))"
rm -rf $B
```

## 结果解读

> 验证 rerun 循环硬上限：`rerun_count=3` → gate fail → routing `no_transition`。第 4 次尝试被正确拦截。
