---
schema: command-experiment/v1
experiment: wff-topic-rewrite
case: case-182-light-hitl1-topic-rewrite-detailed
weight: light
case_goal: "Verify that phase-hitl1.md §3a correctly instructs the Agent to recognize a detailed brief and do only light organization — not heavy rewrite — preserving the user's original scope, terminology, and dimensions."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-182_wff_rwd_*
trace: dpt_disp_case-182_wff_rwd_*/_logs/_logs/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。

**⚠️ 模拟声明：** 本 playbook 中 original topic 和 seed topics 的内容由 bash 脚本写入（模拟 Agent 读取 `phase-hitl1.md` §3a 后的输出）。它验证的是：Agent 按 MD 指令产出的格式能被 gate CLI 正确处理。它**不验证** Agent 对详细 brief 的判别能力——那需要真实 Agent 执行（见 `exph_workflow-foundation/case-901-heavy-topic-rewrite-agent.md`，及其 AI 扮演真人对偶 `case-951`）。

# case-182-light-hitl1-topic-rewrite-detailed

## Expected Runtime Path

1. 创建 bundle
2. 读 `phase-hitl1.md` §3a — 判断输入 → 详细 brief → 轻量整理
3. 按 MD 的 "可直接使用，仍建议做轻量整理" 路径执行
4. 读 `phase-hitl1.md` §3b — 写入 HITL1 profile
5. Gate + verdict + cleanup

---

## Case Goal

`phase-hitl1.md` §3a 说：

> "详细 brief（含明确范围、维度、约束）→ 可直接使用，仍建议做轻量整理"

本 playbook 验证 Agent 遵循这条指令时：
- 保留用户原始术语和维度（不替换、不膨胀）
- 不引入用户没要求的额外分析框架
- 仍产出合法的 original topic + seed topics

---

## Step 1: 创建 bundle

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs wff_rwd --case case-182 --force)
echo "Bundle: $B"
echo "$B" > /tmp/pb_bundle
```

## Step 2: Agent 读 `phase-hitl1.md` §3a — 判断输入

> **MD 指令**（`phase-hitl1.md` §3a）：
> - "读用户原始输入（来自 conversation context）"
> - "详细 brief（含明确范围、维度、约束）→ 可直接使用，仍建议做轻量整理"

**用户输入**（详细 brief）：

> 我想研究欧盟 AI Act 对中小企业的实际影响。重点看三个方面：(1) 合规成本——中小企业在 2025-2026 年需要投入多少资源才能满足 AI Act 的要求；(2) 豁免条款——AI Act 里有哪些针对中小企业的豁免或宽松处理；(3) 竞争影响——这些监管要求会不会让大公司反而受益。产出：3000 字 policy brief，受众非专业读者。优先 EU 官方文件和主流智库报告。

→ **Agent 判断**：输入含明确范围（EU AI Act × SME）、3 个具体维度、产出格式、受众、信源偏好。不需要 heavy rewrite。执行轻量整理。

## Step 3: 轻量整理（遵循 "可直接使用 + 轻量整理" 路径）

> **MD 指令**（`phase-hitl1.md` §3a "详细 brief" 路径）：
> 可直接使用，仍建议做轻量整理。

Agent 的轻量整理：
- 保留用户原始术语（"合规成本""豁免条款""竞争影响"）
- 保留用户指定的 3 个维度，不添加新维度
- 从 3 个维度各推导 1 个 seed topic
- 标注 "Agent 未添加的维度"——证明没有越界

```bash
REPO_ROOT=$(pwd)
B=$(cat /tmp/pb_bundle)

cat > $B/rb_plan.md << 'PLANEOF'
---
{"plan_basename":"wff_rwd","derived_topic_count":3,"topic_registry":["eu-ai-act-sme-compliance-cost","eu-ai-act-sme-exemptions","eu-ai-act-sme-competitive-impact"]}
---
# Deep Research Plan: wff_rwd

## Original Topic

**用户原始 brief（保留原文）：**
研究欧盟 AI Act 对中小企业的实际影响。三个维度：(1) 合规成本，(2) 豁免条款，(3) 竞争影响。产出：3000 字 policy brief，受众非专业读者。优先 EU 官方文件和主流智库报告。

**Agent 整理（轻量）：**
- **研究范围：** 限定在 EU AI Act × SME，不扩展到 AI Act 整体评估或其他 jurisdiction
- **合规成本：** SME 在 2025-2026 年满足 AI Act 要求需投入的资源（人力、技术、咨询），区分高风险 AI 系统和通用 AI 模型的差异化要求
- **豁免条款：** AI Act 中针对 SME 的豁免、简化程序、sandbox 安排、过渡期条款
- **竞争影响：** 监管是否不成比例地有利于大企业（合规规模经济），SME 在 AI 供应链中的定位变化
- **产出格式：** 3000 字 policy brief，非专业受众可读。信源优先：EU 官方文件、European Commission impact assessments、Bruegel/CEPS 等智库报告

**Agent 未添加的维度（用户 brief 已足够聚焦）：**
- AI Act 的 global impact（超出 EU 范围）
- AI Act 技术实现细节（非用户关注点）
- 其他国家的 AI 监管对比（用户只要 EU）
PLANEOF

echo "=== Verify: MD '轻量整理' — 3 seed topics, user terminology preserved ==="
node -e "const m=require('fs').readFileSync('$B/rb_plan.md','utf-8').match(/^---\n([\s\S]*?)\n---/);console.log('topic_registry:',JSON.parse(m[1]).topic_registry)"
echo "--- Check: user term '合规成本' preserved ---"
grep -c '合规成本' $B/rb_plan.md
echo "--- Check: user term '豁免条款' preserved ---"
grep -c '豁免条款' $B/rb_plan.md
echo "--- Check: Agent explicitly lists what it did NOT add ---"
grep -c 'Agent 未添加' $B/rb_plan.md
```

## Step 4: Agent 读 `phase-hitl1.md` §3b — HITL1 问题收集

```bash
REPO_ROOT=$(pwd)
B=$(cat /tmp/pb_bundle)

cat > $B/rb_profile.yaml << 'EOF'
plan_basename: wff_rwd
research_profile: quick_factual
root_must_answer_set:
  - "What are the estimated compliance costs for SMEs under the EU AI Act in 2025-2026?"
  - "Which specific exemptions or simplified procedures does the AI Act provide for SMEs?"
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
```

## Step 5: 结果解读

> 验证 phase-hitl1.md §3a 边界：
>   详细 brief 输入 → Agent 应识别不需要 deep rewrite，仅做轻量整理。
>   依赖模拟 Agent 输出，验证 gate 的边界识别。
> 
> **PASS 才执行 Cleanup。FAIL 时跳过清理，保留 bundle 现场供排查。**

## Step 6: Gate + Verdict + Cleanup

```bash
REPO_ROOT=$(pwd)
B=$(cat /tmp/pb_bundle)

GATE=$(node DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs --bundle $B --current-node phases/phase-hitl1.md)
echo "$GATE" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log('passed:',j.check.passed)})"
PASSED=$(echo "$GATE" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_logs/_logs/_trace.jsonl',{gate:'hitl1-recorded',passed:$PASSED,detail:'detailed brief: light organize per phase-hitl1.md 3a'})})"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B/_logs/_logs/_trace.jsonl')})"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B')})"
```
