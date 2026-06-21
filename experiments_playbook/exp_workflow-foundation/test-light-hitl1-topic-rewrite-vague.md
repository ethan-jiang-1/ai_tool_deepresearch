---
schema: command-experiment/v1
experiment: workflow-foundation
case: light-hitl1-topic-rewrite
weight: light
case_goal: "Verify that phase-hitl1.md §3a topic rewrite instructions are actionable: a vague one-line input triggers the full rewrite path (background, scope, dimensions, seed topics) and produces artifacts that pass the hitl1-recorded gate."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_wff_rw_*
trace: dpt_disp_wff_rw_*/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。

**⚠️ 模拟声明：** 本 playbook 中 original topic 和 seed topics 的内容由 bash 脚本写入（模拟 Agent 读取 `phase-hitl1.md` §3a 后的输出）。它验证的是：Agent 按 MD 指令产出的格式能被 gate CLI 正确处理。它**不验证** Agent 的语义判断质量——那需要真实 Agent 执行（见 `test-human-hitl1-topic-rewrite-agent.md`）。

# test-workflow-foundation-hitl1-topic-rewrite

## Expected Runtime Path

1. 创建 bundle
2. 读 `phase-hitl1.md` §3a — 判断输入类型 → 一句话 → 执行 rewrite
3. 按 MD 的 4 个 rewrite 步骤执行，写入 `rb_plan.md`
4. 读 `phase-hitl1.md` §3b — 写入 HITL1 profile
5. 运行 `hitl1-recorded` gate — structural 校验
6. Trace verdict + cleanup

---

## Case Goal

`phase-hitl1.md` §3a 说：

> "一句话（如 '帮我研究 AI 安全'）→ 执行 topic rewrite"
> "覆盖：背景、研究范围、关键维度、已知前提、不确定项"
> "写入 rb_plan.md 正文（Markdown body，非 frontmatter）"
> "推导初始 seed topics（3-5 个）→ 写入 topic_registry"

本 playbook 按这些指令逐条执行，验证产出物能被 gate 通过。

---

## Step 1: 创建 bundle

```bash
REPO_ROOT=$(pwd)
B=$(node experiments/shared/new-disposable-bundle.mjs wff_rw --force)
echo "Bundle: $B"
```

## Step 2: Agent 读 `phase-hitl1.md` §3a — 判断输入

> **MD 指令**（`phase-hitl1.md` §3a）：
> - "读用户原始输入（来自 conversation context）"
> - "一句话（如 '帮我研究 AI 安全'）→ 执行 topic rewrite"

**用户输入**（一句话）："帮我研究一下 AI 安全"

→ **Agent 判断**：输入是一句话，没有范围、维度、约束。执行 topic rewrite。

## Step 3: 执行 topic rewrite（按 MD 步骤 1-4）

> **MD 指令**（`phase-hitl1.md` §3a 步骤 1-4）：
> 1. 展开为 structured original topic（背景、范围、维度、前提、不确定项）
> 2. 写入 `rb_plan.md` 正文
> 3. 推导 seed topics（3-5 个）→ 写入 `topic_registry`
> 4. 展示给用户

```bash
REPO_ROOT=$(pwd)
B=$(ls -d dpt_disp_wff_rw_* | head -1)

# Step 1+2: Expand and write to rb_plan.md body + frontmatter topic_registry
cat > $B/rb_plan.md << 'PLANEOF'
---
{"plan_basename":"wff_rw","derived_topic_count":4,"topic_registry":["ai-alignment-techniques","ai-regulation-comparison","frontier-model-risks","industry-safety-investment"]}
---
# Deep Research Plan: wff_rw

## Original Topic

**背景：** AI 安全（AI Safety）是当前人工智能领域最受关注的方向之一，涉及技术对齐（alignment）、鲁棒性（robustness）、监管政策（regulation）、军事应用风险等多个子领域。全球主要 AI 实验室和 governments 都在加大投入。

**研究范围：** 聚焦 AI 安全的三个核心维度——(1) 技术安全（对齐与鲁棒性），(2) 治理与监管（各国政策对比），(3) 风险与伦理（前沿模型的风险评估框架）。不涉及 AI 安全的纯哲学讨论或科幻场景。

**关键维度：**
1. 技术对齐：当前主要的 alignment 技术路线（RLHF、CAI、debate 等）及其有效性证据
2. 监管政策：EU AI Act、US Executive Order、China AI 法规的核心差异和执法力度
3. 前沿风险：前沿模型（GPT-5 class）的 capability 评估、风险分类、mitigation 措施
4. 产业实践：主要 AI 实验室的安全投入、安全团队规模、公开的安全事故

**已知前提：** AI 安全已成全球共识；EU 已通过 AI Act；主要实验室都有安全团队；alignment 仍是开放研究问题。

**不确定项（需要 research 回答）：**
- 不同 alignment 技术的相对有效性如何？
- 各国监管的实际 enforcement 差异多大？
- 前沿模型的最主要风险是什么（misuse vs autonomous）？
- 产业界的安全投入是否跟上了 capability 增长速度？
PLANEOF

echo "=== Verify: MD requires original topic in body, seed topics in frontmatter ==="
echo "--- topic_registry (frontmatter) ---"
node -e "const m=require('fs').readFileSync('$B/rb_plan.md','utf-8').match(/^---\n([\s\S]*?)\n---/);console.log(JSON.parse(m[1]).topic_registry)"
echo "--- Original topic (body excerpt) ---"
grep -c '关键维度' $B/rb_plan.md && echo "body has structured sections"

# Step 4: Show to user — displayed inline in the Markdown below
```

> **MD 指令步骤 4**：将 original topic + seed topics + 建议的 `research_profile` 一起展示给用户。

**Agent 展示**：
- Original topic：4 个关键维度，含背景、范围、前提、不确定项
- Seed topics（4 个）：`ai-alignment-techniques`、`ai-regulation-comparison`、`frontier-model-risks`、`industry-safety-investment`
- 建议 `research_profile`：`exploratory_map`（因为原始输入是全景探索型）

## Step 4: Agent 读 `phase-hitl1.md` §3b — HITL1 问题收集

> **MD 指令**（`phase-hitl1.md` §3b）：
> - "基于用户回答选择 `research_profile` enum 值"
> - "将 `root_must_answer_set` 写入 `rb_profile.yaml`"
> - "将 `human_decision_checkpoints.hitl1.status` 设为 `recorded`"

```bash
REPO_ROOT=$(pwd)
B=$(ls -d dpt_disp_wff_rw_* | head -1)

cat > $B/rb_profile.yaml << 'EOF'
plan_basename: wff_rw
research_profile: exploratory_map
root_must_answer_set:
  - "What are the most effective AI alignment techniques based on current evidence?"
  - "How do EU, US, and China AI regulations differ in enforcement and scope?"
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
echo "HITL1 profile written per §3b"
grep -E 'research_profile|root_must_answer|status:' $B/rb_profile.yaml | head -5
```

## Step 5: 运行 `hitl1-recorded` gate

> **MD 指令**（`phase-hitl1.md` Gate Command）：
> `node DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs --bundle <path> --current-node phases/phase-hitl1.md`

```bash
REPO_ROOT=$(pwd)
B=$(ls -d dpt_disp_wff_rw_* | head -1)

GATE=$(node DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs --bundle $B --current-node phases/phase-hitl1.md)
echo "$GATE" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log('passed:',j.check.passed);console.log('next:',j.check.next)})"
PASSED=$(echo "$GATE" | node -e "process.stdin.on('data',d=>{console.log(JSON.parse(d).check.passed)})")
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'hitl1-recorded',passed:$PASSED,detail:'topic rewrite: vague -> structured per phase-hitl1.md 3a'})})"
```

## Step 6: Verdict + Cleanup

```bash
REPO_ROOT=$(pwd)
B=$(ls -d dpt_disp_wff_rw_* | head -1)
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B/_trace.jsonl')})"
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B')})"
```
