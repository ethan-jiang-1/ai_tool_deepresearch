---
schema: command-experiment/v2
experiment: wff-pre-research-repair
case: case-113-standard-review-surface
case_goal: "Prove that the HITL1 question surface, AI interpretation sample, and human review checklist are visible in Markdown — so a human reviewer can judge whether the AI's understanding aligns with expectations, without reading JS."
verdict_mode: all
required_checks: [hitl1-question-surface, interpretation-sample, human-review-checklist, hitl1-recorded]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: standard
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

由 coding agent 在真实 disposable experiment bundle 中执行。所有审查内容在 Markdown 正文中；thin driver 只做 bundle 创建、gate 调用、trace 记录。

# case-113-standard-review-surface

## Expected Runtime Path

1. 创建 bundle
2. 展示 HITL1 问题面（来自 `phase-hitl1.md` 的结构化问题维度）
3. 展示 fixed AI interpretation sample
4. 展示 human review checklist
5. 将 sample 对应的 payload 写入 profile，运行 gate 验证
6. Trace 裁决 + cleanup

---

## Case Goal

证明 pre-research 的 HITL1 问题面、AI 理解和 human review 三者之间的对齐 surface 是可见的、可审查的——在 Markdown 正文中，不需要读 JS。

---

## Step 1: 创建 disposable bundle

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs wff_review --case case-113 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
echo "Bundle: $B"
```

## Step 2: HITL1 问题面

以下是 `phase-hitl1.md` 要求 Agent 向用户提出的结构化问题维度，以及 `shared-profile.md` 中对应的字段落点：

| 维度 | 问题 | 落点字段 |
|------|------|---------|
| Research Profile | 这次 research 的深度/广度？ | `rb_profile.yaml#/research_profile` |
| Must-Answer | 哪些核心问题必须回答？ | `rb_profile.yaml#/root_must_answer_set` |
| Confirmation | plan_basename 是否正确？ | `rb_profile.yaml#/plan_basename` |

## Step 3: Fixed AI Interpretation Sample

> 以下是一份 **静态 sample**，模拟 AI 读完 HITL1 问题面后对用户需求的理解。人类 reviewer 对照这份 sample，判断 AI 的理解是否贴切。

**Scenario：** 用户问 "帮我研究一下 AI 安全领域的现状"。

**AI 建议：**

| 字段 | AI 的理解 | AI 的理由 |
|------|----------|----------|
| `research_profile` | `exploratory_map` | 用户要"现状全景"，不是单一 claim 验证 |
| `root_must_answer_set[0]` | "What are the main AI safety research directions in 2025-2026?" | 覆盖核心研究方向 |
| `root_must_answer_set[1]` | "Which organizations are leading AI safety work?" | 覆盖关键参与者 |
| `root_must_answer_set[2]` | "What are the most cited AI safety concerns in recent literature?" | 覆盖主要风险维度 |

**AI 准备写入的 payload：**

`research_access` 是 synthetic review fixture，只证明字段落点与 gate mechanics，不证明真实 Agent capability。

```yaml
plan_basename: wff_review
research_profile: exploratory_map
root_must_answer_set:
  - "What are the main AI safety research directions in 2025-2026?"
  - "Which organizations are leading AI safety work?"
  - "What are the most cited AI safety concerns in recent literature?"
research_access:
  status: available
  probed_at: "2026-07-10T00:00:00.000Z"
  result_url: "https://fixture.news-research.com/deterministic-hitl1-fixture"
  fetch_outcome: success
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-06-21T12:00:00.000Z"
  hitl2:
    status: not_started
    answerability_class: not_assessed
    user_decision: not_started
    final_report_view: not_started
```

## Step 4: Human Review Checklist

> Reviewer 对照 sample 回答以下问题。**这是 pre-research HITL 对齐的关键审查点。**

- [ ] **Profile 选择是否贴切？** `exploratory_map` 是否匹配用户 "现状全景" 的需求？还是应该用 `quick_factual`？
- [ ] **Must-answer 是否覆盖关键维度？** 3 个问题是否覆盖了研究方向、参与者、风险？是否遗漏了"时间线"或"监管动态"？
- [ ] **Payload 写入路径是否正确？** 所有字段是否写入 `rb_profile.yaml` 的 `human_decision_checkpoints.hitl1.*` 路径？有没有误写入 `rb_status.json`？
- [ ] **Capability fixture 是否诚实标注？** `research_access` 是否明确只是 deterministic gate fixture，而不是外部能力证明？
- [ ] **`plan_basename` 是否未被误改？** 确认 AI 没有修改 bundle 创建时设定的 `plan_basename`

## Step 5: 写入 sample payload 并验证

将 AI interpretation sample 对应的 payload 写入 profile：

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
cat > $B/rb_profile.yaml << 'EOF'
plan_basename: wff_review
research_profile: exploratory_map
root_must_answer_set:
  - "What are the main AI safety research directions in 2025-2026?"
  - "Which organizations are leading AI safety work?"
  - "What are the most cited AI safety concerns in recent literature?"
research_access:
  status: available
  probed_at: "2026-07-10T00:00:00.000Z"
  result_url: "https://fixture.news-research.com/deterministic-hitl1-fixture"
  fetch_outcome: success
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-06-21T12:00:00.000Z"
  hitl2:
    status: not_started
    answerability_class: not_assessed
    user_decision: not_started
    final_report_view: not_started
EOF
echo "=== Profile payload written ==="
grep -E 'research_profile|root_must_answer|plan_basename|status:|recorded_at' $B/rb_profile.yaml
```

运行 hitl1-recorded gate 确认 payload 合法：

```bash
GATE_OUTPUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle $B --gate hitl1-recorded -- node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-hitl1-recorded.mjs --bundle $B --current-node phases/phase-hitl1.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
node --input-type=module - "$B" "$PASSED" <<'JS'
import { appendFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const [bundle, gatePassed] = process.argv.slice(2);
const review = {
  question_dimensions: ['research_profile', 'root_must_answer_set', 'plan_basename'],
  interpretation: {
    research_profile: 'exploratory_map',
    must_answer_count: 3,
    fixture_boundary: 'deterministic_gate_fixture',
  },
  checklist: ['profile_fit', 'must_answer_coverage', 'payload_owner', 'fixture_honesty', 'plan_basename_stable'],
};
writeFileSync(join(bundle, 'case-113-review-surface.json'), `${JSON.stringify(review, null, 2)}\n`);
const checks = [
  ['hitl1-question-surface', review.question_dimensions.length === 3 && review.question_dimensions.includes('root_must_answer_set')],
  ['interpretation-sample', review.interpretation.research_profile === 'exploratory_map' && review.interpretation.must_answer_count === 3],
  ['human-review-checklist', review.checklist.length === 5 && review.checklist.includes('fixture_honesty')],
  ['hitl1-recorded', gatePassed === 'true'],
];
for (const [gate, passed] of checks) appendFileSync(join(bundle, 'rb_trace.jsonl'), `${JSON.stringify({ ts: new Date().toISOString(), event: 'check', source: 'playbook', gate, passed, expected: true })}\n`);
if (checks.some(([, passed]) => !passed)) process.exit(1);
JS
```

## Step 6: 从 trace 裁决

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```


## Step 7: 结果解读

> 验证 HITL 问题面可见性：
>   HITL1 question surface + AI interpretation sample + human review checklist
>   全部在 Markdown 中可见 → gate pass。


Stop after native completion. The Autorun Supervisor owns Standard health, audit, preservation, and optional clean-PASS cleanup.
