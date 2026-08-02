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

**⚠️ 模拟声明：** 本 playbook 中 original topic 和 approved topic intent 的内容由 fixture 提供，模拟 Agent 读取 `phase-hitl1.md` §3a 后的语义输出。fixture 只写 `## Goal` 正文和 retained topic input；既有 Engine writer 负责 canonical `topic_registry` 与 UID-bound seed skeletons。本 case 验证的是该 Agent Flow 组合能通过现有 gate CLI，不验证 Agent 的语义判断质量。

# case-181-light-hitl1-topic-rewrite-vague

## Expected Runtime Path

1. 创建 bundle
2. 读 `phase-hitl1.md` §3a，识别一句话输入并完成 rewrite
3. 将 rewrite 语义写入 `rb_plan.md` 的 `## Goal` section
4. 写入 HITL1 profile，走 instantiation -> HITL1 handoff 与 status synchronization
5. 由现有 topic-state writer 建立 canonical topics/seed skeletons，消费 returned style handoff
6. 运行一次 `hitl1-recorded` Gate，随后 native completion

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

**用户输入**（一句话）：“帮我研究一下 AI 安全”

→ **Agent 判断**：输入是一句话，没有范围、维度、约束。执行 topic rewrite。

## Step 3: 执行 topic rewrite → 写入 `## Goal` section

> **MD 指令**（`phase-hitl1.md` §3a）：先完成 structured original topic，展示 topic preview；用户确认后才由现有 Engine writer 建立 canonical identity。

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)

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
AI 安全（AI Safety）涉及技术对齐、鲁棒性、监管政策和前沿模型风险等多个子领域。全球主要 AI 实验室和 governments 都在加大投入。本研究旨在系统梳理 AI 安全的四个核心维度，为理解当前局势和未来方向提供证据基础。

### Research Questions
1. 当前主要的 alignment 技术路线（RLHF、CAI、debate 等）的相对有效性如何？有哪些独立验证证据？
2. EU AI Act、US Executive Order、China AI 法规的核心差异和执法力度如何？
3. 前沿模型（GPT-5 class）的最主要风险是什么——misuse vs autonomous vs systemic？现有 mitigation 措施是否充分？
4. 主要 AI 实验室的安全投入是否跟上了 capability 增长速度？公开的安全事故有哪些模式？

### Scope

**In scope:**
AI 安全的技术、治理、风险三个核心维度：技术对齐路线、各国监管框架、前沿模型风险评估框架和产业安全实践。

**Out of scope:**
AI 安全的纯哲学讨论、科幻场景（superintelligence takeover 等）、非技术类社会影响（如 AI 导致的失业）。

**待定：**
(待 HITL2 确认 — 是否纳入军事 AI 安全作为独立维度)

`;
writeFileSync(planPath, `${plan.slice(0, start)}${goal}${plan.slice(end + 1)}`);
JS

grep -c '### Purpose' "$B/rb_plan.md" && echo "OK: Purpose present"
grep -c '### Research Questions' "$B/rb_plan.md" && echo "OK: Research Questions present"
grep -c '### Scope' "$B/rb_plan.md" && echo "OK: Scope present"
```

**Agent 展示**：原始 topic、4 个建议 seed topics 和 `exploratory_map` research profile；用户接受该 HITL1 语义决定。

## Step 4: 记录 HITL1 profile

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)

# Synthetic research_access keeps this deterministic topic-rewrite case focused
# on gate mechanics; it does not prove real Agent capability.
cat > "$B/rb_profile.yaml" <<'YAML'
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
YAML
```

## Step 5: 建立 canonical topic state 并应用 returned style handoff

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
STATE=$(printf '%s' {{PLAYBOOK_STATE_DIR_SH}})

node DPT_FRAMEWORK/cli/gates/check-gate-instantiation-complete.mjs --bundle "$B" --current-node phases/phase-instantiation.md > "$STATE/case-181-instantiation.json"
NEXT=$(node experiments_env/shared/extract-field.mjs check.next < "$STATE/case-181-instantiation.json")
if [ "$NEXT" != "phases/phase-hitl1.md" ]; then
  echo "Unexpected instantiation handoff: $NEXT"
  exit 1
fi
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle "$B" --node "$NEXT" > "$STATE/case-181-enter-hitl1.md"
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "$B" --to hitl1_recorded > "$STATE/case-181-status.json"

cat > "$STATE/case-181-topic-input.json" <<'JSON'
{"context":"hitl1","actions":[{"action":"add_topic","title":"AI Alignment Techniques","slug_stem":"ai-alignment-techniques","must_answer":["What evidence compares current AI alignment techniques?"],"scope_role":"primary","depends_on_topic_uids":[]},{"action":"add_topic","title":"AI Regulation Comparison","slug_stem":"ai-regulation-comparison","must_answer":["How do EU, US, and China AI regulations differ in enforcement and scope?"],"scope_role":"comparison","depends_on_topic_uids":[]},{"action":"add_topic","title":"Frontier Model Risks","slug_stem":"frontier-model-risks","must_answer":["Which frontier-model risks have the strongest current evidence?"],"scope_role":"primary","depends_on_topic_uids":[]},{"action":"add_topic","title":"Industry Safety Investment","slug_stem":"industry-safety-investment","must_answer":["How do major AI laboratories' safety investments compare with capability growth?"],"scope_role":"supporting","depends_on_topic_uids":[]}]}
JSON

node DPT_FRAMEWORK/cli/operate-topic-state.mjs apply --bundle "$B" --input "$STATE/case-181-topic-input.json" > "$STATE/case-181-topic-apply.json"

# The committed writer result, rather than fixture-authored parameters, decides
# whether a style projection is required and supplies the only command to run.
node --input-type=module - "$STATE/case-181-topic-apply.json" "$STATE/case-181-style-command.sh" <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';

const [applyPath, commandPath] = process.argv.slice(2);
const result = JSON.parse(readFileSync(applyPath, 'utf8'));
const handoff = result.style_projection;
if (result.verdict !== 'committed' || handoff?.status !== 'refresh_required' || typeof handoff.command !== 'string') {
  throw new Error(`missing committed style handoff: ${JSON.stringify(result)}`);
}
writeFileSync(commandPath, `${handoff.command}\n`);
JS
STYLE_OUTPUT=$(sh "$STATE/case-181-style-command.sh")
printf '%s\n' "$STYLE_OUTPUT" > "$STATE/case-181-style-apply.json"
node --input-type=module - "$STATE/case-181-topic-apply.json" "$STATE/case-181-style-apply.json" <<'JS'
import { readFileSync } from 'node:fs';

const [applyPath, stylePath] = process.argv.slice(2);
const handoff = JSON.parse(readFileSync(applyPath, 'utf8')).style_projection;
const style = JSON.parse(readFileSync(stylePath, 'utf8'));
if (style.applied !== handoff.selected_profile || style.topic_count !== handoff.committed_topic_count) {
  throw new Error(`style output disagrees with committed handoff: ${JSON.stringify({ handoff, style })}`);
}
JS
node DPT_FRAMEWORK/cli/operate-topic-state.mjs inspect --bundle "$B" > "$STATE/case-181-topic-inspect.json"
```

## Step 6: 运行 `hitl1-recorded` Gate 并记录 case checks

```bash
REPO_ROOT=$(pwd)
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)

GATE=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate hitl1-recorded -- node DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs --bundle "$B" --current-node phases/phase-hitl1.md || true)
echo "$GATE" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log('passed:',j.check.passed);console.log('next:',j.check.next)})"
PASSED=$(echo "$GATE" | node experiments_env/shared/extract-field.mjs check.passed)
node --input-type=module - "$B" "$PASSED" <<'JS'
import { readFileSync } from 'node:fs';
import { parseMdFrontmatter } from './DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs';
import { recordCheck } from './experiments_env/shared/wff-playbook-utils.mjs';

const [bundle, passed] = process.argv.slice(2);
recordCheck(`${bundle}/rb_trace.jsonl`, {
  gate: 'hitl1-recorded',
  passed: passed === 'true',
  expected: true,
  detail: 'vague topic rewrite after canonical topic-state and returned style handoff',
});
const plan = readFileSync(`${bundle}/rb_plan.md`, 'utf8');
const fm = parseMdFrontmatter(plan);
const checks = [
  ['original-topic-preserved', plan.includes('AI 安全')],
  ['seed-topics-derived', fm.derived_topic_count === 4 && fm.topic_registry?.length === 4 && fm.topic_registry.every((topic) => typeof topic.topic_uid === 'string')],
  ['vague-rewrite-structured', ['### Purpose', '### Research Questions', '### Scope'].every((value) => plan.includes(value))],
];
for (const [gate, checkPassed] of checks) {
  recordCheck(`${bundle}/rb_trace.jsonl`, { gate, passed: checkPassed, expected: true });
}
if (checks.some(([, checkPassed]) => !checkPassed)) process.exit(1);
JS
```

## Step 7: Native completion

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

Stop after native completion. The Autorun Supervisor owns Light health, audit, preservation, and optional clean-PASS cleanup.
