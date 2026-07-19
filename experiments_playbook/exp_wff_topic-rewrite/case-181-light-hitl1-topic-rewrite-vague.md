---
schema: command-experiment/v2
experiment: wff-topic-rewrite
case: case-181-light-hitl1-topic-rewrite-vague
case_goal: "Verify that phase-hitl1.md §3a topic rewrite instructions are actionable: a vague one-line input triggers the full rewrite path (background, scope, dimensions, seed topics) and produces artifacts that pass the hitl1-recorded gate. Agent writes to ## Goal section per updated phase-hitl1.md instructions."
verdict_mode: all
required_checks: [original-topic-preserved, seed-topics-derived, vague-rewrite-structured, hitl1-recorded]
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

由 coding agent 在真实 disposable experiment bundle 中执行。

**⚠️ 模拟声明：** 本 playbook 中 original topic 和 seed topics 的内容由 bash 脚本写入（模拟 Agent 读取 `phase-hitl1.md` §3a 后的输出）。它验证的是：Agent 按 MD 指令产出的格式能被 gate CLI 正确处理。它**不验证** Agent 的语义判断质量——那需要真实 Agent 执行（见 `exp_workflow-foundation/case-901-heavy-topic-rewrite-agent.md`，及其 AI 扮演真人对偶 `case-951`）。

# case-181-light-hitl1-topic-rewrite-vague

## Expected Runtime Path

1. 创建 bundle
2. 读 `phase-hitl1.md` §3a — 判断输入类型 → 一句话 → 执行 rewrite
3. 按 MD 的 rewrite 步骤执行，写入 `rb_plan.md` 的 `## Goal` section（含 `### Purpose` / `### Research Questions` / `### Scope`）
4. 将 seed topics 写入 frontmatter `topic_registry` 和 body `## Topic Registry` table
5. 读 `phase-hitl1.md` §3b — 写入 HITL1 profile
5. 运行 `hitl1-recorded` gate — structural 校验
6. Native completion；随后停止

---

## Case Goal

`phase-hitl1.md` §3a 说：

> "一句话（如 '帮我研究 AI 安全'）→ 执行 topic rewrite"
> "写入 `rb_plan.md` 的 `## Goal` section"
> "至少填写 `### Purpose`（一段话概述研究目标）"
> "`### Research Questions` 和 `### Scope` 按 HITL1 用户提供的信息填写"
> "推导初始 seed topics（3-5 个）→ 写入 frontmatter `topic_registry`"

本 playbook 按新 5-section plan 结构执行 rewrite，验证产出物能被 gate 通过。

---

## Step 1: 创建 bundle

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs wff_rw --case case-181 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
echo "Bundle: $B"
```

## Step 2: Agent 读 `phase-hitl1.md` §3a — 判断输入

> **MD 指令**（`phase-hitl1.md` §3a）：
> - "读用户原始输入（来自 conversation context）"
> - "一句话（如 '帮我研究 AI 安全'）→ 执行 topic rewrite"

**用户输入**（一句话）："帮我研究一下 AI 安全"

→ **Agent 判断**：输入是一句话，没有范围、维度、约束。执行 topic rewrite。

## Step 3: 执行 topic rewrite → 写入 `## Goal` section

> **MD 指令**（`phase-hitl1.md` §3a — updated）：
> 1. 展开为 structured topic（背景→Purpose、范围→Scope、维度→Research Questions）
> 2. 写入 `rb_plan.md` 的 `## Goal` section
> 3. 推导 seed topics（3-5 个）→ 写入 frontmatter `topic_registry` + body `## Topic Registry` table
> 4. 展示给用户

```bash
REPO_ROOT=$(pwd)
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)

# Write rb_plan.md with new 5-section structure.
# Content from topic rewrite maps to:
#   背景 → ## Goal > ### Purpose
#   关键维度 → ## Goal > ### Research Questions
#   研究范围 → ## Goal > ### Scope (In/Out/待定)
#   已知前提 → ## Constraints (5-category bullets, partially filled)
cat > $B/rb_plan.md << 'PLANEOF'
---
plan_basename: wff_rw
derived_topic_count: 4
topic_registry:
  - id: "topic-01"
    slug: "ai-alignment-techniques"
    title: "AI Alignment Techniques"
  - id: "topic-02"
    slug: "ai-regulation-comparison"
    title: "AI Regulation Comparison"
  - id: "topic-03"
    slug: "frontier-model-risks"
    title: "Frontier Model Risks"
  - id: "topic-04"
    slug: "industry-safety-investment"
    title: "Industry Safety Investment"
---

# Deep Research Plan: wff_rw

## Goal

### Purpose
AI 安全（AI Safety）是当前人工智能领域最受关注的方向之一，涉及技术对齐（alignment）、鲁棒性（robustness）、监管政策（regulation）、军事应用风险等多个子领域。全球主要 AI 实验室和 governments 都在加大投入。本研究旨在系统梳理 AI 安全的四个核心维度，为理解当前局势和未来方向提供证据基础。

### Research Questions
1. 当前主要的 alignment 技术路线（RLHF、CAI、debate 等）的相对有效性如何？有哪些独立验证证据？
2. EU AI Act、US Executive Order、China AI 法规的核心差异和执法力度如何？
3. 前沿模型（GPT-5 class）的最主要风险是什么——misuse vs autonomous vs systemic？现有 mitigation 措施是否充分？
4. 主要 AI 实验室的安全投入是否跟上了 capability 增长速度？公开的安全事故有哪些模式？

### Scope

**In scope:**
AI 安全的技术、治理、风险三个核心维度。技术对齐路线对比、各国监管框架对比、前沿模型风险评估框架、产业安全实践。

**Out of scope:**
AI 安全的纯哲学讨论、科幻场景（superintelligence takeover 等）、非技术类社会影响（如 AI 导致的失业）。

**待定：**
(待 HITL2 确认 — 是否纳入军事 AI 安全作为独立维度)

## Topic Registry

| # | Slug | Title | Status |
|---|------|-------|--------|
| 1 | ai-alignment-techniques | AI Alignment Techniques | pending |
| 2 | ai-regulation-comparison | AI Regulation Comparison | pending |
| 3 | frontier-model-risks | Frontier Model Risks | pending |
| 4 | industry-safety-investment | Industry Safety Investment | pending |

## Constraints

- **语言**：(待 HITL1 填充 — 仅中文源/中英混合/不限)
- **时间预算**：(待 HITL1 填充 — 默认不设硬 deadline)
- **地域**：(待 HITL1 填充 — 中国大陆/港澳台/海外)
- **方法**：open — 不预设方法限制，Agent 按需选择 search/synthesis/fetch
- **来源偏好**：(待 HITL1 填充 — 一手源优先/学术优先/无偏好)

## Progress

- [ ] instantiation-complete
- [ ] hitl1-recorded
- [ ] setup-ready
- [ ] seed-topics-ready
- [ ] wave0-complete
- [ ] wave1-complete
- [ ] wave2-complete
- [ ] hitl2-recorded
- [ ] rerun-ready
- [ ] readiness-passed

## Decisions
(append-only — 关键决策记录，最新在上)
PLANEOF

echo "=== Verify: 5-section structure ==="
echo "--- sections ---"
grep "^## " $B/rb_plan.md
echo ""
echo "--- topic_registry (frontmatter) ---"
node -e "import('$REPO_ROOT/DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs').then(m=>{const p=m.parseMdFrontmatter(require('fs').readFileSync('$B/rb_plan.md','utf-8'));console.log(JSON.stringify(p.topic_registry,null,2))})"
echo ""
echo "--- Goal section content ---"
grep -c '### Purpose' $B/rb_plan.md && echo "OK: Purpose present"
grep -c '### Research Questions' $B/rb_plan.md && echo "OK: Research Questions present"
grep -c '### Scope' $B/rb_plan.md && echo "OK: Scope present"
grep -c '\*\*In scope:\*\*' $B/rb_plan.md && echo "OK: In scope substructure"
grep -c '\*\*待定：\*\*' $B/rb_plan.md && echo "OK: 待定 substructure"

# Step 4: Show to user — displayed inline in the Markdown below
```

> **MD 指令步骤 4**：将 original topic + seed topics + 建议的 `research_profile` 一起展示给用户。

**Agent 展示**：
- `## Goal` section：Purpose + 4 Research Questions + Scope（In/Out/待定）
- Seed topics（4 个）：`ai-alignment-techniques`、`ai-regulation-comparison`、`frontier-model-risks`、`industry-safety-investment`
- 建议 `research_profile`：`exploratory_map`（因为原始输入是全景探索型）

## Step 4: Agent 读 `phase-hitl1.md` §3b — HITL1 问题收集

> **MD 指令**（`phase-hitl1.md` §3b）：
> - "基于用户回答选择 `research_profile` enum 值"
> - "将 `root_must_answer_set` 写入 `rb_profile.yaml`"
> - "将 `human_decision_checkpoints.hitl1.status` 设为 `recorded`"

```bash
REPO_ROOT=$(pwd)
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)

# Synthetic research_access below keeps this deterministic topic-rewrite case
# focused on gate mechanics; it does not prove real Agent capability.
cat > $B/rb_profile.yaml << 'EOF'
plan_basename: wff_rw
research_profile: exploratory_map
root_must_answer_set:
  - "What are the most effective AI alignment techniques based on current evidence?"
  - "How do EU, US, and China AI regulations differ in enforcement and scope?"
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
echo "HITL1 profile written per §3b"
grep -E 'research_profile|root_must_answer|status:' $B/rb_profile.yaml | head -5
```

## Step 5: 运行 `hitl1-recorded` gate

> **MD 指令**（`phase-hitl1.md` Gate Command）：
> `node experiments_env/shared/run-gate-with-monitor.mjs --bundle $B --gate hitl1-recorded -- node DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs --bundle <path> --current-node phases/phase-hitl1.md`

```bash
REPO_ROOT=$(pwd)
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)

node DPT_FRAMEWORK/cli/advance-status.mjs --bundle $B --to hitl1_recorded
GATE=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle $B --gate hitl1-recorded -- node DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs --bundle $B --current-node phases/phase-hitl1.md)
echo "$GATE" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log('passed:',j.check.passed);console.log('next:',j.check.next)})"
PASSED=$(echo "$GATE" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'hitl1-recorded',passed:$PASSED,detail:'topic rewrite: vague -> structured per phase-hitl1.md 3a'})})"
node --input-type=module - "$B" <<'JS'
import { appendFileSync, readFileSync } from 'node:fs'; import { join } from 'node:path'; import { parse as parseYaml } from 'yaml';
const [bundle]=process.argv.slice(2); const plan=readFileSync(join(bundle,'rb_plan.md'),'utf8'); const fm=parseYaml(plan.match(/^---\n([\s\S]*?)\n---/)[1]);
const checks=[['original-topic-preserved',plan.includes('AI 安全')],['seed-topics-derived',fm.derived_topic_count===4&&fm.topic_registry?.length===4],['vague-rewrite-structured',['### Purpose','### Research Questions','### Scope'].every((v)=>plan.includes(v))]];
for(const[id,passed]of checks)appendFileSync(join(bundle,'rb_trace.jsonl'),`${JSON.stringify({ts:new Date().toISOString(),event:'check',source:'playbook',gate:id,passed,expected:true})}\n`);if(checks.some(([,p])=>!p))process.exit(1);
JS
```

## Step 6: 结果解读

> 验证 phase-hitl1.md §3a topic rewrite（新 5-section plan 结构）：
>   模糊输入 → Agent 做 topic rewrite → 产出 `## Goal`（Purpose + Research Questions + Scope with In/Out/待定）+ `## Topic Registry` table + `## Constraints` 5-category。
>   依赖模拟 Agent 输出，验证 gate 对合法 rewrite 产物的接受。
> 
> Playbook 不执行 health 或 cleanup；native completion 后由 Autorun Supervisor 根据 outcome/health policy 决定保留或清理。

## Step 7: Native completion

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

Stop after native completion. The Autorun Supervisor owns Light health, audit, preservation, and optional clean-PASS cleanup.
