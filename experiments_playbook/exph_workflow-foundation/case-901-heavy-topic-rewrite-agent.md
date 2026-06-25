---
schema: command-experiment/v1
experiment: exph-workflow-foundation
case: case-901-heavy-topic-rewrite-agent
weight: heavy
case_goal: "Prove that a real Agent, reading phase-hitl1.md §3a, can take a vague one-line input and produce a structured original topic with seed topics that pass the hitl1-recorded gate — and that a human reviewer can judge the rewrite quality."
runner: coding-agent
agent_mode: real-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-901_wff_rwa_*
trace: dpt_disp_case-901_wff_rwa_*/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

**这个 playbook 需要真实 Agent 执行。** Agent 必须加载 `phase-hitl1.md`，读取 §3a 的 topic rewrite 指令，根据用户输入产出 original topic 和 seed topics。不能由 bash 脚本预设内容。

`weight: heavy` 是因为 Agent 语义判断是 mechanism under test，不能 mock。

---

# case-901-heavy-topic-rewrite-agent

## Expected Runtime Path

1. Agent 创建 disposable bundle
2. Agent 加载 `DPT_FRAMEWORK/workflows/nodes/phases/phase-hitl1.md`
3. Agent 读取用户输入（一句话）
4. Agent 按 §3a 执行 topic rewrite → 写入 `rb_plan.md`
5. Agent 按 §3b 收集 HITL1 决策 → 写入 `rb_profile.yaml`
6. Agent 运行 `hitl1-recorded` gate
7. Human reviewer 审查 Agent 的 rewrite 质量
8. 从 trace 裁决 + cleanup

---

## Case Goal

`phase-hitl1.md` §3a 是 MD 写的 Agent 指令。本 playbook 用一个真实 Agent 来验证：**Agent 能不能读懂 §3a，并产出符合 contract 的 original topic 和 seed topics？**

Gate 只做 structural 校验。Human reviewer 判断 rewrite 质量。

### Why Human-in-the-Loop

Gate 检查的是结构：slug 格式、field presence、seed topic 数量。它不判断 "这个 original topic 范围是否合适" 或 "seed topics 是否贴切"。一个结构正确但语义上 topic 跑偏的 rewrite 可以通过 gate。

**Gate pass ≠ Human pass。** 必须由人类审查 Agent 的 rewrite 质量后才算通过。

### Automation Condition for Migration to `exp_`

当以下条件满足时，本 case 可以迁回 `exp_`：
- 一个可靠的 programmatic reviewer 存在（例如：Agent-run receipt 证明 rewrite 遵循了 §3a 的所有约束步骤），或
- 一个被接受的 semantic check 可以验证 topic scope 和 seed topic relevance 对输入的忠实度。

---

## Step 1: Agent 创建 disposable bundle

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs wff_rwa --case case-901 --force)
echo "Bundle: $B"
```

## Step 2: Agent 加载 phase-hitl1.md

> **Agent，请执行：** 加载 `DPT_FRAMEWORK/workflows/nodes/phases/phase-hitl1.md`。
>
> 阅读 §3a "Topic Rewrite（用户输入展开）"。
>
> 特别注意：
> - "一句话（如 '帮我研究 AI 安全'）→ 执行 topic rewrite"
> - 步骤 1-4 的具体要求（背景、范围、维度、前提、不确定项）
> - "写入 rb_plan.md 正文（Markdown body，非 frontmatter）"
> - "推导初始 seed topics（3-5 个）→ 写入 topic_registry"

## Step 3: 用户输入

> **用户输入（一句话）：** "帮我研究一下 AI 安全"

Agent，你现在读到了用户输入。按 `phase-hitl1.md` §3a 的要求执行 topic rewrite。

## Step 4: Agent 写入 rb_plan.md

Agent，将你的 rewrite 结果写入 `$B/rb_plan.md`：
- 正文（Markdown body）包含 structured original topic
- frontmatter 的 `topic_registry` 包含推导出的 seed topics（3-5 个）
- `plan_basename` 保持为 `wff_rwa`

> **Agent 执行此步骤后，继续 Step 5。**

## Step 5: Agent 按 §3b 写入 HITL1 profile

Agent，按 `phase-hitl1.md` §3b 的要求：
- 基于你对用户输入的理解，选择一个合适的 `research_profile`
- 写出 1-3 个 `root_must_answer` 问题
- 写入 `human_decision_checkpoints.hitl1.status: recorded` 和 `recorded_at`

写入 `$B/rb_profile.yaml`。

## Step 6: Agent 运行 hitl1-recorded gate

```bash
REPO_ROOT=$(pwd)
B=$(cat /tmp/pb_bundle)

GATE=$(node DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs --bundle $B --current-node phases/phase-hitl1.md)
echo "$GATE"
PASSED=$(echo "$GATE" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'hitl1-recorded',passed:$PASSED,detail:'real Agent rewrite per phase-hitl1.md 3a'})})"
```

## Step 7: Human Review Checklist

> **停下来。** 审查 Agent 的 rewrite 质量。以下是给 human reviewer 的 checklist。

- [ ] **§3a 步骤 1 覆盖度**：Agent 的 original topic 是否覆盖了背景、范围、关键维度、已知前提、不确定项？有没有漏掉某个必需维度？
- [ ] **§3a 步骤 3 seed topics 粒度**：3-5 个 seed topics 是否可独立研究？会不会太粗或太细？
- [ ] **§3b profile 选择**：Agent 选的 `research_profile` 是否匹配输入？一句话 "帮我研究 AI 安全" 选 `exploratory_map` 合理吗？
- [ ] **Gate 是否 pass**：hitl1-recorded gate 是否 pass？如果 fail，inspect 指向什么问题？
- [ ] **整体判断**：如果你是这个用户，你会接受 Agent 的 rewrite 结果吗？如果不接受，你会让 Agent 改什么？

### 记录人工裁决（durable）

> 审查完上面的 checklist 后，**人工填写裁决**并写入 trace。这条 check 与 Step 6 的 gate check 一起进入 verdict——人工 FAIL 则整体 FAIL、跳过 cleanup（见 Step 8）。
> 与 AI 扮演真人的对偶 `case-951` 区分：这里 `source: human`，951 是 `source: ai-judge`。

```bash
REPO_ROOT=$(pwd)
B=$(cat /tmp/pb_bundle)

# 人工裁决：pass 或 fail（reviewer 填）
HUMAN_VERDICT=pass

node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'human-review',passed:'$HUMAN_VERDICT'==='pass',detail:'source: human — rewrite quality verdict by reviewer'})})"
echo "human-review recorded: $HUMAN_VERDICT"
```

## Step 8: 结果解读

> exph_ — 需人类审查。
>   Agent 读 phase-hitl1.md §3a → 执行 topic rewrite。
>   Gate 只查结构。Human reviewer 判断质量。
>   Gate pass ≠ Human pass。
>
> **PASS 才执行 Cleanup。FAIL 时跳过清理，保留 bundle 现场供排查。**

## Step 9: Verdict + Cleanup

```bash
REPO_ROOT=$(pwd)
B=$(cat /tmp/pb_bundle)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B/_trace.jsonl')})"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B')})"
```
