---
schema: command-experiment/v2
experiment: wff-topic-rewrite
case: case-182-light-hitl1-topic-rewrite-detailed
case_goal: "Verify that phase-hitl1.md §3a correctly instructs the Agent to recognize a detailed brief and do only light organization — not heavy rewrite — preserving the user's original scope, terminology, and dimensions."
verdict_mode: all
required_checks: [original-topic-preserved, seed-topics-derived, detailed-brief-not-over-rewritten, hitl1-recorded]
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

**⚠️ 模拟声明：** 本 playbook 中 original topic 和 approved topic intent 的内容由 fixture 提供，模拟 Agent 读取 `phase-hitl1.md` §3a 后的轻量整理。fixture 只写 `## Goal` 正文和 retained topic input；既有 Engine writer 负责 canonical `topic_registry` 与 UID-bound seed skeletons。本 case 不验证 Agent 对详细 brief 的判别能力。

# case-182-light-hitl1-topic-rewrite-detailed

## Expected Runtime Path

1. 创建 bundle
2. 读 `phase-hitl1.md` §3a，判断详细 brief 并进行轻量整理
3. 将保留的语义写入 `rb_plan.md` 的 `## Goal` section
4. 写入 HITL1 profile，走 instantiation -> HITL1 handoff 与 status synchronization
5. 由现有 topic-state writer 建立 canonical topics/seed skeletons，消费 returned style handoff
6. 运行一次 `hitl1-recorded` Gate，随后 native completion

## Step 1: 创建 bundle

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs wff_rwd --case case-182 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
echo "Bundle: $B"
```

## Step 2: Agent 读 `phase-hitl1.md` §3a — 判断输入

> **MD 指令**（`phase-hitl1.md` §3a）：
> - "详细 brief（含明确范围、维度、约束）→ 可直接使用，仍建议做轻量整理"

**用户输入**（详细 brief）：

> 我想研究欧盟 AI Act 对中小企业的实际影响。重点看三个方面：(1) 合规成本——中小企业在 2025-2026 年需要投入多少资源才能满足 AI Act 的要求；(2) 豁免条款——AI Act 里有哪些针对中小企业的豁免或宽松处理；(3) 竞争影响——这些监管要求会不会让大公司反而受益。产出：3000 字 policy brief，受众非专业读者。优先 EU 官方文件和主流智库报告。

→ **Agent 判断**：输入含明确范围、3 个具体维度、产出格式、受众和信源偏好。不需要 heavy rewrite，执行轻量整理。

## Step 3: 轻量整理（遵循 "可直接使用 + 轻量整理" 路径）

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)

# Preserve template frontmatter and every Engine-owned coordinate. Only replace
# the fixture-owned semantic Goal section.
node --input-type=module - "$B/rb_plan.md" <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';

const [planPath] = process.argv.slice(2);
const plan = readFileSync(planPath, 'utf8');
const start = plan.indexOf('## Goal\n');
const end = plan.indexOf('\n## Topic Registry\n', start);
if (start < 0 || end < 0) throw new Error('template Goal/Topic Registry boundary is unavailable');
const goal = `## Goal

### Purpose
研究欧盟 AI Act 对中小企业的实际影响，产出面向非专业读者的 3000 字 policy brief，并优先使用 EU 官方文件和主流智库报告。

### Research Questions
1. 中小企业在 2025-2026 年需要投入多少资源，才能满足 AI Act 的合规要求？
2. AI Act 中有哪些针对中小企业的豁免条款、简化程序或过渡安排？
3. 合规成本和规模经济会不会让大公司在竞争影响上反而受益？

### Scope

**In scope:**
EU AI Act × SME；合规成本、豁免条款和竞争影响三个用户指定维度。

**Out of scope:**
AI Act 的 global impact、AI Act 技术实现细节，以及其他国家的 AI 监管对比。

**待定：**
无；用户 brief 已足够聚焦。

**Agent 未添加的维度（用户 brief 已足够聚焦）：**
- AI Act 的 global impact（超出 EU 范围）
- AI Act 技术实现细节（非用户关注点）
- 其他国家的 AI 监管对比（用户只要 EU）

`;
writeFileSync(planPath, `${plan.slice(0, start)}${goal}${plan.slice(end + 1)}`);
JS

grep -c '合规成本' "$B/rb_plan.md" && echo "OK: user term preserved"
grep -c '豁免条款' "$B/rb_plan.md" && echo "OK: user term preserved"
grep -c 'Agent 未添加的维度' "$B/rb_plan.md" && echo "OK: no new dimensions"
```

**Agent 展示**：保留原始 scope 和三个维度的 3 个建议 seed topics，以及 `quick_factual` research profile；用户接受该 HITL1 语义决定。

## Step 4: 记录 HITL1 profile

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)

# Synthetic research_access keeps this deterministic topic-rewrite case focused
# on gate mechanics; it does not prove real Agent capability.
cat > "$B/rb_profile.yaml" <<'YAML'
plan_basename: wff_rwd
research_profile: quick_factual
root_must_answer_set:
  - "What are the estimated compliance costs for SMEs under the EU AI Act in 2025-2026?"
  - "Which specific exemptions or simplified procedures does the AI Act provide for SMEs?"
research_access:
  status: available
  probed_at: "2026-07-10T00:00:00.000Z"
  result_url: "https://fixture.news-research.com/deterministic-hitl1-fixture"
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
YAML
```

## Step 5: 建立 canonical topic state 并应用 returned style handoff

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
STATE=$(printf '%s' {{PLAYBOOK_STATE_DIR_SH}})

node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-instantiation-complete.mjs --bundle "$B" --current-node phases/phase-instantiation.md > "$STATE/case-182-instantiation.json"
NEXT=$(node experiments_env/shared/extract-field.mjs check.next < "$STATE/case-182-instantiation.json")
if [ "$NEXT" != "phases/phase-hitl1.md" ]; then
  echo "Unexpected instantiation handoff: $NEXT"
  exit 1
fi
node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle "$B" --node "$NEXT" > "$STATE/case-182-enter-hitl1.md"
node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle "$B" --to hitl1_recorded > "$STATE/case-182-status.json"

cat > "$STATE/case-182-topic-input.json" <<'JSON'
{"context":"hitl1","actions":[{"action":"add_topic","title":"EU AI Act SME Compliance Cost","slug_stem":"eu-ai-act-sme-compliance-cost","must_answer":["What resources do SMEs need for AI Act compliance in 2025-2026?"],"scope_role":"primary","depends_on_topic_uids":[]},{"action":"add_topic","title":"EU AI Act SME Exemptions","slug_stem":"eu-ai-act-sme-exemptions","must_answer":["Which SME exemptions and simplified procedures apply under the AI Act?"],"scope_role":"supporting","depends_on_topic_uids":[]},{"action":"add_topic","title":"EU AI Act SME Competitive Impact","slug_stem":"eu-ai-act-sme-competitive-impact","must_answer":["Do AI Act requirements create a competitive advantage for larger companies?"],"scope_role":"comparison","depends_on_topic_uids":[]}]}
JSON

node DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs apply --bundle "$B" --input "$STATE/case-182-topic-input.json" > "$STATE/case-182-topic-apply.json"

# The committed writer result, rather than fixture-authored parameters, decides
# whether a style projection is required and supplies the only command to run.
node --input-type=module - "$STATE/case-182-topic-apply.json" "$STATE/case-182-style-command.sh" <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';

const [applyPath, commandPath] = process.argv.slice(2);
const result = JSON.parse(readFileSync(applyPath, 'utf8'));
const handoff = result.style_projection;
if (result.verdict !== 'committed' || handoff?.status !== 'refresh_required' || typeof handoff.command !== 'string') {
  throw new Error(`missing committed style handoff: ${JSON.stringify(result)}`);
}
writeFileSync(commandPath, `${handoff.command}\n`);
JS
STYLE_OUTPUT=$(sh "$STATE/case-182-style-command.sh")
printf '%s\n' "$STYLE_OUTPUT" > "$STATE/case-182-style-apply.json"
node --input-type=module - "$STATE/case-182-topic-apply.json" "$STATE/case-182-style-apply.json" <<'JS'
import { readFileSync } from 'node:fs';

const [applyPath, stylePath] = process.argv.slice(2);
const handoff = JSON.parse(readFileSync(applyPath, 'utf8')).style_projection;
const style = JSON.parse(readFileSync(stylePath, 'utf8'));
if (style.applied !== handoff.selected_profile || style.topic_count !== handoff.committed_topic_count) {
  throw new Error(`style output disagrees with committed handoff: ${JSON.stringify({ handoff, style })}`);
}
JS
node DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs inspect --bundle "$B" > "$STATE/case-182-topic-inspect.json"
```

## Step 6: 运行 `hitl1-recorded` Gate 并记录 case checks

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)

GATE=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate hitl1-recorded -- node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-hitl1-recorded.mjs --bundle "$B" --current-node phases/phase-hitl1.md || true)
echo "$GATE" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log('passed:',j.check.passed);console.log('next:',j.check.next)})"
PASSED=$(echo "$GATE" | node experiments_env/shared/extract-field.mjs check.passed)
node --input-type=module - "$B" "$PASSED" <<'JS'
import { readFileSync } from 'node:fs';
import { parseMdFrontmatter } from './DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers.mjs';
import { recordCheck } from './experiments_env/shared/wff-playbook-utils.mjs';

const [bundle, passed] = process.argv.slice(2);
recordCheck(`${bundle}/rb_trace.jsonl`, {
  gate: 'hitl1-recorded',
  passed: passed === 'true',
  expected: true,
  detail: 'detailed brief light organization after canonical topic-state and returned style handoff',
});
const plan = readFileSync(`${bundle}/rb_plan.md`, 'utf8');
const fm = parseMdFrontmatter(plan);
const terms = ['合规成本', '豁免条款', '竞争影响'];
const checks = [
  ['original-topic-preserved', terms.every((term) => plan.includes(term))],
  ['seed-topics-derived', fm.derived_topic_count === 3 && fm.topic_registry?.length === 3 && fm.topic_registry.every((topic) => typeof topic.topic_uid === 'string')],
  ['detailed-brief-not-over-rewritten', plan.includes('Agent 未添加的维度') && terms.every((term) => plan.includes(term))],
];
for (const [gate, checkPassed] of checks) {
  recordCheck(`${bundle}/rb_trace.jsonl`, { gate, passed: checkPassed, expected: true });
}
if (checks.some(([, checkPassed]) => !checkPassed)) process.exit(1);
JS
```

## Step 7: Native completion

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

Stop after native completion. The Autorun Supervisor owns Light health, audit, preservation, and optional clean-PASS cleanup.
