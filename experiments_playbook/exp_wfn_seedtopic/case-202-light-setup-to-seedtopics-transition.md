---
schema: command-experiment/v2
experiment: wfn-seedtopic
case: case-202-light-setup-to-seedtopics-transition
case_goal: "验证 setup-ready gate → seed-topics phase → seed-topics-ready gate 过渡机制：status 推进、slug 三重一致、gate.next 指向 wave0。"
verdict_mode: last
required_checks: [setup-ready, witnessed-seed-topics-entry, seed-topics-ready]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: light
durable_evidence_roles: []
proof_subject: deterministic_contract
subject_execution: none
fixture: fixture_backed
runtime: real_disposable_bundle
external_calls: none
verdict_judge: deterministic
---

<!-- @impl EXA-005, EXA-006, EXA-007, PLR-003 -->

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。不依赖具体 topic 内容——只验证过渡机制。


## Reality Distance Ledger

| 维度 | 声明 |
|------|------|
| **Runtime context** | disposable bundle，`new-disposable-bundle.mjs` 创建 |
| **Framework path** | `operate-queue.mjs` CLI, gate CLI, `wff-playbook-utils.mjs` |
| **Fixture input** | task card JSON, registry, status 在 playbook 内写入 — Engine-layer fixture |
| **Agent actor** | 无（fixture-backed）— 不证明 Agent 搜索/写作/修复 |
| **External calls** | 无 |
| **Verdict source** | `rb_trace.jsonl` `check` events |
| **不证明** | Agent queue 决策、semantic work — 仅证明 queue loop + gate 机械结构 |

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
B=$(node experiments_env/shared/new-disposable-bundle.mjs s2s --case case-202 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
echo "Bundle: $B"

node DEEP_RESEARCH_HARNESS/cli/validate-bundle.mjs $B

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
# Synthetic deterministic fixture only; not proof of real Agent research capability.
research_access:
  status: available
  probed_at: "2026-07-10T00:00:00.000Z"
  result_url: "https://fixture.news-research.com/case-202-fixture"
  fetch_outcome: success
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
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
REPO_ROOT=$(pwd)
GATE_OUTPUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle $B --gate setup-ready -- node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-setup-ready.mjs --bundle $B --current-node phases/phase-setup.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
NEXT=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.next)
echo "setup-ready: passed=$PASSED next=$NEXT"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>m.recordCheck('$B/rb_trace.jsonl',{gate:'setup-ready',passed:$PASSED,expected:true,detail:'real setup-ready Gate'}))"
node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle "$B" --node "$NEXT" > "$B/case-202-enter-seed-topics.md"
node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle "$B" --to setup_ready > "$B/case-202-advance-setup.json"
node --input-type=module - "$B" <<'JS'
import { appendFileSync, readFileSync } from 'node:fs'; import { join } from 'node:path';
const [bundle]=process.argv.slice(2); const status=JSON.parse(readFileSync(join(bundle,'rb_status.json'))); const passed=status.current_node==='phases/phase-seed-topics.md'&&status.current_gate==='setup_ready'&&status.next_gate==='seed_topics_ready';
appendFileSync(join(bundle,'rb_trace.jsonl'),`${JSON.stringify({ts:new Date().toISOString(),event:'check',source:'playbook',gate:'witnessed-seed-topics-entry',passed,expected:true})}\n`);
JS
```

预期：`passed: true`，`next: phases/phase-seed-topics.md`。

## Step 3: 物化 seed topic（不推进 status — gate 需要 current_gate 保持来源 gate）

按 registry 创建 seed_topics/<slug>.md。status 保持 `setup_ready → seed_topics_ready`，seed-topics-ready gate 检查时需要 current_gate == setup_ready（handoff 来源 gate）。

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
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

echo "=== Status（保持 setup_ready） ===" && cat $B/rb_status.json
echo "=== seed_topics/ ===" && ls -la $B/seed_topics/
```

## Step 4: Seed-topics-ready gate → pass，然后推进 status

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
REPO_ROOT=$(pwd)
GATE_OUTPUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle $B --gate seed-topics-ready -- node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-seed-topics-ready.mjs --bundle $B --current-node phases/phase-seed-topics.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
NEXT=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.next)
echo "seed-topics-ready: passed=$PASSED next=$NEXT"

node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'seed-topics-ready',passed:$PASSED,expected:true,detail:'setup→seed-topics transition, next=wave0'})})"
node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle "$B" --node "$NEXT" > "$B/case-202-enter-wave0.md"
node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle "$B" --to seed_topics_ready > "$B/case-202-advance-seed-topics.json"
```

预期：`passed: true`，`next: phases/phase-wave0.md`。

## Step 5: 裁决

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

## Step 6: 结果解读

> 验证 setup→seed-topics 过渡机制（status 推进 + slug 三重一致 + gate.next 闭环）：
>   setup-ready gate pass → next = phases/phase-seed-topics.md。
>   Agent 自主推进 status（gate 只读不写）：`setup_ready` → `seed_topics_ready`（next_gate 推到 `wave0_complete`）。
>   seed-topics-ready gate 校验 slug 三重一致（registry slug == 文件名 stem == frontmatter slug）→ pass。
>   gate.next = phases/phase-wave0.md，闭环指向 wave0。


Stop after native completion. The Autorun Supervisor owns Light health, audit, preservation, and optional clean-PASS cleanup.
