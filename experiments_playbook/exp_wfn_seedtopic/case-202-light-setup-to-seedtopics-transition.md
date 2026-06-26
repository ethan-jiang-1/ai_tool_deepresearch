---
schema: command-experiment/v1
experiment: wfn-seedtopic
case: case-202-light-setup-to-seedtopics-transition
weight: light
case_goal: "验证 setup-ready gate → seed-topics phase → seed-topics-ready gate 过渡机制：status 推进、slug 三重一致、gate.next 指向 wave0。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-202_s2s_
trace: dpt_disp_case-202_s2s_*/_logs/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。不依赖具体 topic 内容——只验证过渡机制。

# case-202-light-setup-to-seedtopics-transition

## Case Goal

证明 setup→seed-topics 过渡的机制正确：
1. setup-ready gate pass → next = phase-seed-topics.md
2. Agent 推进 status（gate 只读不写）
3. seed-topics-ready gate 校验 slug 三重一致（registry == filename stem == frontmatter slug）
4. gate.next = phase-wave0.md

## Step 1: 起点状态 — 模拟 HITL1 已写入 topic_registry，setup-ready 刚通过

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs s2s --case case-202 --force)
echo "Bundle: $B"

node DPT_FRAMEWORK/cli/validate-bundle.mjs $B

# topic_registry 由 HITL1 写入，Agent 只读不写。
# slug 含 NN_ 前缀（如 01_topic-a），id 承载编号。
cat > $B/rb_plan.md << 'EOF'
---
plan_basename: case-202_s2s
derived_topic_count: 1
topic_registry:
  - id: "01"
    slug: 01_topic-a
    title: Topic A
---
# Plan
EOF

# rb_profile.yaml: HITL1 must be recorded (setup-ready gate prerequisite)
cat > $B/rb_profile.yaml << 'EOF'
plan_basename: case-202_s2s
research_profile: quick_factual
root_must_answer_set:
  - "test question"
human_decision_checkpoints:
  hitl1:
    status: recorded
  hitl2:
    status: not_started
    answerability_class: not_assessed
    user_decision: not_started
    final_report_view: not_started
EOF

# setup-ready 刚通过，Agent 现在要进入 seed-topics phase
cat > $B/rb_status.json << 'EOF'
{"current_mode":"execution","state":"in_progress","current_gate":"setup_ready","next_gate":"seed_topics_ready"}
EOF

echo "=== Plan ===" && head -10 $B/rb_plan.md
echo "=== Status ===" && cat $B/rb_status.json
```

## Step 2: Setup-ready gate → next = phase-seed-topics

```bash
echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'","event":"gate_attempt","gate":"setup-ready","passed":true}' >> $B/rb_trace.jsonl

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-setup-ready.mjs --bundle $B --current-node phases/phase-setup.md || true)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
NEXT=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.next)
echo "setup-ready: passed=$PASSED next=$NEXT"
```

预期：`passed: true`，`next: phases/phase-seed-topics.md`。

## Step 3: Agent 推进 status + 物化 seed topic

Agent 读 phase-seed-topics.md → 推进 status → 按 registry 创建 seed_topics/<slug>.md。

```bash
# Agent 推进 status
cat > $B/rb_status.json << 'EOF'
{"current_mode":"execution","state":"in_progress","current_gate":"seed_topics_ready","next_gate":"wave0_complete"}
EOF

# 物化：文件名 = slug.md，frontmatter slug == 文件名 stem == registry slug
mkdir -p $B/seed_topics
cat > $B/seed_topics/01_topic-a.md << 'EOF'
---
id: "01"
slug: 01_topic-a
title: Topic A
---
# Topic A
## 关键维度
- test
## 已知前提
- test
## Open Questions
- test
EOF

echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'","event":"seed_topics_completion"}' >> $B/rb_trace.jsonl

echo "=== Status ===" && cat $B/rb_status.json
echo "=== seed_topics/ ===" && ls -la $B/seed_topics/
```

## Step 4: Seed-topics-ready gate → pass

```bash
GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-seed-topics-ready.mjs --bundle $B --current-node phases/phase-seed-topics.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
NEXT=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.next)
echo "seed-topics-ready: passed=$PASSED next=$NEXT"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_logs/_trace.jsonl',{gate:'seed-topics-ready',passed:$PASSED,detail:'setup→seed-topics transition, next=wave0'})})"
```

预期：`passed: true`，`next: phases/phase-wave0.md`。

## Step 5: 裁决

```bash
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B/_logs/_trace.jsonl')})"
```

## Step 6: 结果解读

> 验证 setup→seed-topics 过渡机制（status 推进 + slug 三重一致 + gate.next 闭环）：
>   setup-ready gate pass → next = phases/phase-seed-topics.md。
>   Agent 自主推进 status（gate 只读不写）：`setup_ready` → `seed_topics_ready`（next_gate 推到 `wave0_complete`）。
>   seed-topics-ready gate 校验 slug 三重一致（registry slug == 文件名 stem == frontmatter slug）→ pass。
>   gate.next = phases/phase-wave0.md，闭环指向 wave0。

## Step 7: Cleanup

```bash
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B')})"
```
