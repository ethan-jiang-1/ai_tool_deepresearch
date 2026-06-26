---
schema: command-experiment/v1
experiment: wff-topic-rewrite
case: case-951-heavy-topic-rewrite-ai-judge
weight: heavy
case_goal: "AI 扮演真人 dual of case-901：同样输入、真实 Agent 执行 §3a rewrite，但 §7 质量审查由 AI reviewer（而非真人）给出 verdict。验证 AI 扮演这个人类角色能否顶替，verdict 标 source: ai-judge。"
runner: coding-agent
agent_mode: real-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-951_wff_rwa_*
trace: dpt_disp_case-951_wff_rwa_*/_logs/_logs/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

本 playbook 是 `exph_workflow-foundation/case-901-heavy-topic-rewrite-agent.md` 的 **AI 扮演真人对偶**（9NN +50 配对：901 真人 ↔ 951 AI，见 `experiments_playbook/README.md` § 编号约定）。

- **§3a（rewrite）仍是真实 Agent 工作**——与 901 完全相同，不能 mock。这是被测机制的"生产"侧，AI 扮演的只是"审查"侧。
- **§7 由 AI reviewer 出 verdict，不是真人。** 该 check 在 trace 标 `source: ai-judge`。它**不等于**真人 verdict——价值在于和 901 的真人 verdict 对比，判断 AI 能否顶替。
- Gate 只做 structural 校验；AI reviewer verdict 是语义判断，gate 不验证。

`weight: heavy` 因为 §3a 是真实 Agent 语义判断 + §7 是 AI reviewer 判断，都不能 mock。

---

# case-951-heavy-topic-rewrite-ai-judge

## Expected Runtime Path

1. Agent 创建 disposable bundle
2. Agent 加载 `phase-hitl1.md`，读 §3a
3. Agent 读用户输入（一句话）→ 按 §3a 执行 topic rewrite → 写入 `rb_plan.md` 的 `## Goal` section
4. Agent 按 §3b 写入 HITL1 profile（AI 扮演用户的 profile 选择）
5. Agent 运行 `hitl1-recorded` gate
6. AI reviewer 按 901 Step 7 的 checklist 审查 rewrite 质量 → 给 verdict（标 `source: ai-judge`）
7. 从 trace 裁决 + cleanup

---

## Case Goal

901 用真人审查 Agent rewrite 质量；951 用 **AI reviewer** 审查**同一类** rewrite。机制相同，只换"谁来审查"。两个 verdict 对比即可判断：**AI 扮演这个人类审查角色，合格吗？**

Gate 只做 structural 校验。AI reviewer 的 verdict 是语义判断。

### Why AI-as-Judge（不是真人）

- **自动可跑**：901 在 `exph_`、runner 跳过；951 在 `exp_`、自动可跑，让人类判断机制不阻塞 pipeline。
- **诚实标注**：951 的 verdict 标 `source: ai-judge`，**不是真人判断**。gate 结构 pass ≠ AI verdict 等于真人 verdict。
- **可验证性**：901（真人）↔ 951（AI）拿同样输入对比，是验证 AI-as-reviewer 是否合格的唯一途径。

---

## Step 1: Agent 创建 disposable bundle

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs wff_rwa --case case-951 --force)
echo "Bundle: $B"
echo "$B" > /tmp/pb_bundle
```

## Step 2: Agent 加载 phase-hitl1.md

> **Agent，请执行：** 加载 `DPT_FRAMEWORK/workflows/nodes/phases/phase-hitl1.md`。
>
> 阅读 §3a "Topic Rewrite（用户输入展开）"。注意：一句话 → 执行 rewrite；写入 `rb_plan.md` 的 `## Goal` section（含 `### Purpose` / `### Research Questions` / `### Scope`）；推导 seed topics（3-5 个）→ frontmatter `topic_registry` + body `## Topic Registry` table。

## Step 3: 用户输入

> **用户输入（一句话）：** "帮我研究一下 AI 安全"（与 901 完全相同，保证 dual 可对比）

Agent，按 `phase-hitl1.md` §3a 执行 topic rewrite。

## Step 4: Agent 写入 rb_plan.md

Agent，将 rewrite 结果写入 `$B/rb_plan.md` 的 `## Goal` section：
- `### Purpose`：一段话概述研究目标
- `### Research Questions`：3-5 个核心研究问题
- `### Scope`：In scope / Out of scope / 待定
- frontmatter `topic_registry` 含 3-5 个 seed topics
- body 的 `## Topic Registry` table 与 frontmatter 保持一致
- `plan_basename` 保持 `wff_rwa`

> **Agent 执行此步骤后，继续 Step 5。**

## Step 5: Agent 按 §3b 写入 HITL1 profile（AI 扮演用户）

Agent，按 `phase-hitl1.md` §3b（AI 扮演用户做选择）：
- 选择合适的 `research_profile`
- 写 1-3 个 `root_must_answer`
- 写 `human_decision_checkpoints.hitl1.status: recorded` 和 `recorded_at`

写入 `$B/rb_profile.yaml`。

## Step 6: Agent 运行 hitl1-recorded gate

```bash
REPO_ROOT=$(pwd)
B=$(cat /tmp/pb_bundle)

GATE=$(node DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs --bundle $B --current-node phases/phase-hitl1.md)
echo "$GATE"
PASSED=$(echo "$GATE" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_logs/_logs/_trace.jsonl',{gate:'hitl1-recorded',passed:$PASSED,detail:'real Agent rewrite per phase-hitl1.md 3a'})})"
```

## Step 7: AI reviewer 审查 rewrite 质量

> **AI reviewer，请执行：** 按 901 Step 7 的 checklist 审查 Agent 的 rewrite 质量：
> - §3a 步骤 1 覆盖度（背景/范围/维度/前提/不确定项）
> - §3a 步骤 3 seed topics 粒度
> - §3b profile 选择是否匹配输入
> - Gate 是否 pass
> - 整体判断
>
> 审查后给出 verdict（pass/fail），写入 trace。**标 `source: ai-judge`，不是真人 verdict。**

```bash
REPO_ROOT=$(pwd)
B=$(cat /tmp/pb_bundle)

# AI reviewer 的裁决（pass/fail）。AI reviewer 审查 rb_plan.md 后填入。
AI_VERDICT=pass

node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_logs/_logs/_trace.jsonl',{gate:'human-review',passed:'$AI_VERDICT'==='pass',detail:'source: ai-judge — AI reviewer verdict (dual of case-901 human verdict); NOT a human verdict'})})"
echo "ai-judge review recorded: $AI_VERDICT"
```

## Step 8: 结果解读

> 951（exp_，自动可跑）= 901（exph_，真人）的 AI 扮演 dual。
>   §3a 真实 Agent rewrite（与 901 同）；§7 由 AI reviewer 出 verdict（source: ai-judge）。
>   AI verdict 不等于真人 verdict——与 901 对比才能判断 AI-as-reviewer 是否合格。
>
> **PASS 才执行 Cleanup。FAIL 时跳过清理，保留 bundle 现场供排查。**

## Step 9: Verdict + Cleanup

```bash
REPO_ROOT=$(pwd)
B=$(cat /tmp/pb_bundle)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B/_logs/_logs/_trace.jsonl')})"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B')})"
```
