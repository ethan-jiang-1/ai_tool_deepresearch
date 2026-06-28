---
schema: command-experiment/v1
experiment: wfn-wave1
case: case-221-heavy-batch-subagent
weight: heavy
case_goal: "验证 2-topic wave1 deepening 批量 sub-agent 并行执行：queue enqueue → relay parallel spawn → collect-as-return → backfill → gate pass"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-221_agql_w1_simple_
trace: dpt_disp_case-221_agql_w1_simple_*/rb_trace.jsonl
verdict: trace-jsonl
req: WAI-006
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。所有产出必须来自实际的 CLI 调用、sub-agent WebSearch+WebFetch、和 gate 输出。禁止 mock 返回、跳过 sub-agent、手写假 trace。

# case-221-heavy-batch-subagent

2-topic happy path：bundle（含 post-wave0 状态）→ wave1 enqueue → relay 并行 spawn 2 个 `dpt-evidence-extractor` sub-agent → collect-as-return → backfill → gate pass。


## Expected Runtime Path

1. 创建 post-wave0 bundle + 2 topics [MAIN/SHELL]
2. Enqueue 2 deepening task cards [MAIN/SHELL]
3. Batch parallel: claim → spawn 2 dpt-evidence-extractor sub-agents [MAIN→SUBAGENT]
4. Complete → backfill 6 tokens → gate pass [MAIN/SHELL]
5. 从 trace 裁决 + Cleanup

## Phase 1: 创建 post-wave0 bundle

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs agql_w1_simple --case case-221 --force)
echo "Bundle: $B"
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B

# Write plan with 2 topics
cat > $B/rb_plan.md << 'PLANEOF'
---
{
  "plan_basename": "agql_w1_simple",
  "derived_topic_count": 2,
  "topic_registry": [
    { "id": "t1", "slug": "01_ai-safety", "title": "AI Safety" },
    { "id": "t2", "slug": "02_ai-regulation", "title": "AI Regulation" }
  ]
}
---
# Research Plan: Wave1 Simple Batch Subagent
PLANEOF

cat > $B/rb_profile.yaml << 'PROFEOF'
root_must_answer_set:
  - "AI safety 领域当前的主要方法和技术进展是什么？"
  - "AI regulation 的关键政策和监管趋势是什么？"
research_profile: quick_factual
human_decision_checkpoints:
  hitl1: { status: recorded }
  hitl2: { status: not_started, answerability_class: not_assessed, user_decision: not_started, final_report_view: not_started }
PROFEOF

cat > $B/rb_status.json << 'EOF'
{
  "current_mode": "execution",
  "state": "in_progress",
  "current_gate": "wave1_complete",
  "next_gate": "wave2_complete"
}
EOF

mkdir -p $B/artifacts/wave0/01_ai-safety $B/artifacts/wave0/02_ai-regulation
mkdir -p $B/artifacts/wave1/01_ai-safety $B/artifacts/wave1/02_ai-regulation
mkdir -p $B/seed_topics

# Write post-wave0 reference files (simulated wave0 output)
cat > $B/artifacts/wave0/01_ai-safety/source.yaml << 'REFEOF'
- url: "https://example.com/ai-safety-overview"
  title: "AI Safety Overview"
  retrieved_date: "2026-06-20"
  topic_tag: "01_ai-safety"
REFEOF

cat > $B/artifacts/wave0/02_ai-regulation/source.yaml << 'REFEOF'
- url: "https://example.com/ai-regulation-overview"
  title: "AI Regulation Overview"
  retrieved_date: "2026-06-20"
  topic_tag: "02_ai-regulation"
REFEOF

cat > $B/reference/_INDEX.md << 'EOF'
# Reference Index
- 01_ai-safety: 1 foundation reference
- 02_ai-regulation: 1 foundation reference
EOF

# Write seed topics with __BACKFILL_WAVE1_*__ tokens
cat > $B/seed_topics/01_ai-safety.md << 'SEEDEOF'
---
id: "t1"
slug: "01_ai-safety"
title: "AI Safety"
search_guardrails:
  required_terms: ["AI safety", "alignment"]
evidence_route:
  preferred_sources: ["学术论文", "Anthropic 官方"]
---

# AI Safety

## 主题定位
AI safety 技术方法和发展现状。

## 本轮新增证据
- **ref-01-01**: [AI Safety Overview](https://example.com/ai-safety-overview) — retrieved 2026-06-20

## 本轮新增机制理解
__BACKFILL_WAVE1_MECHANISMS__

## 本轮新增趋势与难点
__BACKFILL_WAVE1_TRENDS__

## 待验证问题
__BACKFILL_PENDING_QUESTIONS__
SEEDEOF

cat > $B/seed_topics/02_ai-regulation.md << 'SEEDEOF'
---
id: "t2"
slug: "02_ai-regulation"
title: "AI Regulation"
search_guardrails:
  required_terms: ["AI regulation", "policy", "governance"]
evidence_route:
  preferred_sources: ["政策文件", "权威媒体"]
---

# AI Regulation

## 主题定位
AI regulation 政策和监管趋势。

## 本轮新增证据
- **ref-01-01**: [AI Regulation Overview](https://example.com/ai-regulation-overview) — retrieved 2026-06-20

## 本轮新增机制理解
__BACKFILL_WAVE1_MECHANISMS__

## 本轮新增趋势与难点
__BACKFILL_WAVE1_TRENDS__

## 待验证问题
__BACKFILL_PENDING_QUESTIONS__
SEEDEOF

echo "=== Post-wave0 bundle ready ==="
echo "seed_topics:" && ls $B/seed_topics/
echo "reference:" && find $B/reference -type f | sort
```

预期：2 个 seed topic 含 `__BACKFILL_WAVE1_*__` token，reference/ 下有 wave0 产出。

## Phase 2: Wave1 Enqueue — 灌料

为每个 topic 生成 deepening task card，使用 `producer_rule: topic_deepening` 和 `targets.delegates.role_key: dpt-evidence-extractor`。

```bash
# Topic 1 — AI Safety
cat > /tmp/wfq-wave1-01_ai-safety.json << 'TASKEOF'
{
  "work_id": "wave1-deepen-01_ai-safety",
  "title": "Deepen topic: AI Safety",
  "targets": { "controller": "main-agent", "delegates": { "to": "sub-agent", "role_key": "dpt-evidence-extractor", "timeout_ms": 600000 } },
  "action": "对 AI Safety 做 topic-specific 深度搜索。从 seed_topics/01_ai-safety.md 的 search_guardrails 和 open questions 派生搜索关键词。使用 WebSearch 找到至少 1 条可信的深度证据来源，使用 WebFetch 获取页面内容。提取关键发现（mechanisms）、趋势（trends）、难点，写入 artifacts/wave1/01_ai-safety/evidence-summary.md。",
  "producer_rule": "topic_deepening",
  "lineage": {"topic_slug": "01_ai-safety", "phase": "wave1"},
  "priority_class": "P4_progressive_artifact_or_seed_backfill",
  "required_receipts": ["file:artifacts/wave1/01_ai-safety/evidence-summary.md"],
  "done_condition": "evidence-summary.md 存在，含至少 1 条 source URL 和 key findings",
  "verification": {"engine": ["receipt_check"], "agent": ["url_accessible", "key_findings_non_empty"]},
  "writes_to": ["artifacts/wave1/01_ai-safety/evidence-summary.md"],
  "status_sync": ["wave1_deepening"],
  "completion_receipt": "file:artifacts/wave1/01_ai-safety/evidence-summary.md",
  "failure_route": "queue_repair",
  "payload": {"topic_slug": "01_ai-safety", "topic_title": "AI Safety"}
}
TASKEOF

# Topic 2 — AI Regulation
cat > /tmp/wfq-wave1-02_ai-regulation.json << 'TASKEOF'
{
  "work_id": "wave1-deepen-02_ai-regulation",
  "title": "Deepen topic: AI Regulation",
  "targets": { "controller": "main-agent", "delegates": { "to": "sub-agent", "role_key": "dpt-evidence-extractor", "timeout_ms": 600000 } },
  "action": "对 AI Regulation 做 topic-specific 深度搜索。从 seed_topics/02_ai-regulation.md 的 search_guardrails 和 open questions 派生搜索关键词。使用 WebSearch 找到至少 1 条可信的深度证据来源，使用 WebFetch 获取页面内容。提取关键发现、趋势、难点，写入 artifacts/wave1/02_ai-regulation/evidence-summary.md。",
  "producer_rule": "topic_deepening",
  "lineage": {"topic_slug": "02_ai-regulation", "phase": "wave1"},
  "priority_class": "P4_progressive_artifact_or_seed_backfill",
  "required_receipts": ["file:artifacts/wave1/02_ai-regulation/evidence-summary.md"],
  "done_condition": "evidence-summary.md 存在，含至少 1 条 source URL 和 key findings",
  "verification": {"engine": ["receipt_check"], "agent": ["url_accessible", "key_findings_non_empty"]},
  "writes_to": ["artifacts/wave1/02_ai-regulation/evidence-summary.md"],
  "status_sync": ["wave1_deepening"],
  "completion_receipt": "file:artifacts/wave1/02_ai-regulation/evidence-summary.md",
  "failure_route": "queue_repair",
  "payload": {"topic_slug": "02_ai-regulation", "topic_title": "AI Regulation"}
}
TASKEOF

node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue $B --task /tmp/wfq-wave1-01_ai-safety.json
node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue $B --task /tmp/wfq-wave1-02_ai-regulation.json

echo "=== Queue after enqueue ==="
node DPT_FRAMEWORK/cli/operate-queue.mjs render $B > /dev/null
cat $B/_cache/agentic-queue/current-task.md | head -30
```

预期：active_window 有 2 个 task（slot_1 + slot_2），`targets.delegates.role_key: dpt-evidence-extractor`。

## Phase 3: Batch Parallel Execution — relay spawn + collect-as-return

按 `shared-subagent-protocol.md` §3 批量并行协议执行：

```bash
# Step 1: Claim current queue task → map its delegated/batch payload to SlotConfig
# Step 2: stageSubagentSlots(state, bundleDir, dispatchMap)
# Step 3: 并行 spawn 最多 MAX_CONCURRENT_SUBAGENTS 个 sub-agent（定义见 subagent-relay.mjs）
# Step 4: collect-as-return — 任意 sub-agent 返回立刻:
#   → ingestAgentReceipt(slot) → commitSlotResult(slot, result) → verify artifact → complete current queue task when batch receipts are satisfied → backfill

# Claim 2 tasks sequentially (queue auto-promotes)
CLAIM1=$(node DPT_FRAMEWORK/cli/operate-queue.mjs claim $B --actor main-agent)
echo "$CLAIM1" | node -e "
const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
console.log('claim#1:', d.item.work_id);
console.log('delegates_required:', d.advice?.delegates_required);
console.log('role_key:', d.advice?.delegates_config?.role_key);
"
# 预期: delegates_required=true, role_key=dpt-evidence-extractor
```

Agent 为每个 claimed task 启动 `dpt-evidence-extractor` sub-agent：
- Sub-agent 收到 relay slot 的 bounded 上下文（task.md + result.schema.json）
- 使用 WebSearch 搜索 topic-specific 深度证据
- 使用 WebFetch 获取页面内容（如 blocked，走 shared protocol §6.3 抓取链）
- 写入 `artifacts/wave1/{topic}/evidence-summary.md`
- 返回结构化 JSON → Phase Agent 通过 `commitSlotResult()` 验证

```bash
# Verify sub-agent outputs
echo "=== evidence-summary: 01_ai-safety ===" && cat $B/artifacts/wave1/01_ai-safety/evidence-summary.md
echo ""
echo "=== evidence-summary: 02_ai-regulation ===" && cat $B/artifacts/wave1/02_ai-regulation/evidence-summary.md

# Verify relay slot dirs
echo "=== relay slots ===" && find $B/_subagents -type f 2>/dev/null | sort
```

预期：每个 topic 的 `evidence-summary.md` 含至少 1 条 source URL + key findings section。`_subagents/` 下有 runtime-receipt.jsonl。

### 写入 question-list.md（gate 要求每 topic 有 4-section question-list）

```bash
# 01_ai-safety question-list
cat > $B/artifacts/wave1/01_ai-safety/question-list.md << 'QLISTEOF'
# AI Safety Question List

## Topic Investigation Targets
| target_id | question | origin | status | backing_refs | next_action |
| t1-q1 | AI safety 主要方法有效性验证 | must_answer | [仍开放] | evidence-summary | deepen |
| t1-q2 | alignment 技术的最新进展 | must_answer | [仍开放] | evidence-summary | cross-topic align |

## Question Reconciliation
- t1-q1: [仍开放] — 需要更多 deployment evidence
- t1-q2: [仍开放] — 单 topic 视角有限

## Emergent Question Protocol
- new_concept: checked (safety-by-design 范式), trigger_refs: evidence-summary
- contradiction: not_triggered
- missing_information_gap: not_triggered
- noise_pattern: not_triggered

## Exploration / Exploitation Decision
- decision: continue
- unresolved_questions: [t1-q1, t1-q2]
QLISTEOF

# 02_ai-regulation question-list
cat > $B/artifacts/wave1/02_ai-regulation/question-list.md << 'QLISTEOF'
# AI Regulation Question List

## Topic Investigation Targets
| target_id | question | origin | status | backing_refs | next_action |
| t2-q1 | EU AI Act 具体执行进展 | must_answer | [仍开放] | evidence-summary | deepen |
| t2-q2 | 开源模型豁免边界 | must_answer | [仍开放] | evidence-summary | cross-topic align |

## Question Reconciliation
- t2-q1: [仍开放] — 需要 policy implementation evidence
- t2-q2: [仍开放] — 豁免条件不明确

## Emergent Question Protocol
- new_concept: checked (高风险场景转向), trigger_refs: evidence-summary
- contradiction: not_triggered
- missing_information_gap: not_triggered
- noise_pattern: not_triggered

## Exploration / Exploitation Decision
- decision: continue
- unresolved_questions: [t2-q1, t2-q2]
QLISTEOF

echo "=== question-list.md files created ==="
for t in 01_ai-safety 02_ai-regulation; do
  echo "$t:" && head -3 $B/artifacts/wave1/$t/question-list.md
done
```

## Phase 4: Complete + Backfill

```bash
# Complete task 1
cat > /tmp/wfq-result-01_ai-safety.json << 'EOF'
{
  "work_id": "wave1-deepen-01_ai-safety",
  "status": "done",
  "receipt": "file:artifacts/wave1/01_ai-safety/evidence-summary.md",
  "summary": "deepening complete: AI Safety evidence extracted + question-list written",
  "writes": ["artifacts/wave1/01_ai-safety/evidence-summary.md", "artifacts/wave1/01_ai-safety/question-list.md"]
}
EOF
node DPT_FRAMEWORK/cli/operate-queue.mjs complete $B --result /tmp/wfq-result-01_ai-safety.json | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8')); console.log('complete#1 passed:', d.feedback.passed)"

# Backfill seed topic 01_ai-safety（替换 __BACKFILL_WAVE1_MECHANISMS__ 等）
sed -i '' 's/__BACKFILL_WAVE1_MECHANISMS__/1. AI safety 关注 alignment、robustness、interpretability 三大方向（来源：evidence-summary Key Findings）。/' $B/seed_topics/01_ai-safety.md
sed -i '' 's/__BACKFILL_WAVE1_TRENDS__/- 2025-2026 年行业从 "capability first" 转向 "safety-by-design"（来源：evidence-summary 趋势观察）。/' $B/seed_topics/01_ai-safety.md
sed -i '' 's/__BACKFILL_PENDING_QUESTIONS__/[仍开放] t1-q1: safety 机制部署证据不足 | [部分解答] t1-q2: 开源 vs 闭源安全策略差异 | [仍开放] t1-q3: alignment 技术验证/' $B/seed_topics/01_ai-safety.md

echo "=== Backfill check: 01_ai-safety ==="
grep -q '__BACKFILL_WAVE1_MECHANISMS__' $B/seed_topics/01_ai-safety.md && echo "STALE: mechanisms token" || echo "OK: mechanisms"
grep -q '__BACKFILL_WAVE1_TRENDS__' $B/seed_topics/01_ai-safety.md && echo "STALE: trends token" || echo "OK: trends"
grep -q '__BACKFILL_PENDING_QUESTIONS__' $B/seed_topics/01_ai-safety.md && echo "STALE: pending questions token" || echo "OK: pending questions"

# Complete task 2
cat > /tmp/wfq-result-02_ai-regulation.json << 'EOF'
{
  "work_id": "wave1-deepen-02_ai-regulation",
  "status": "done",
  "receipt": "file:artifacts/wave1/02_ai-regulation/evidence-summary.md",
  "summary": "deepening complete: AI Regulation evidence extracted + question-list written",
  "writes": ["artifacts/wave1/02_ai-regulation/evidence-summary.md", "artifacts/wave1/02_ai-regulation/question-list.md"]
}
EOF
node DPT_FRAMEWORK/cli/operate-queue.mjs complete $B --result /tmp/wfq-result-02_ai-regulation.json | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8')); console.log('complete#2 passed:', d.feedback.passed)"

# Backfill seed topic 02_ai-regulation
sed -i '' 's/__BACKFILL_WAVE1_MECHANISMS__/1. EU AI Act 和 US Executive Order 形成两大监管框架（来源：evidence-summary Key Findings）。/' $B/seed_topics/02_ai-regulation.md
sed -i '' 's/__BACKFILL_WAVE1_TRENDS__/- 监管重心从 "模型规模" 转向 "高风险应用场景"（来源：evidence-summary 趋势观察）。/' $B/seed_topics/02_ai-regulation.md
sed -i '' 's/__BACKFILL_PENDING_QUESTIONS__/[仍开放] t2-q1: 开源模型豁免边界模糊 | [仍开放] t2-q2: EU AI Act 执行时间线和合规要求/' $B/seed_topics/02_ai-regulation.md

echo "=== Backfill check: 02_ai-regulation ==="
grep -q '__BACKFILL_WAVE1_MECHANISMS__' $B/seed_topics/02_ai-regulation.md && echo "STALE: mechanisms token" || echo "OK: mechanisms"
grep -q '__BACKFILL_WAVE1_TRENDS__' $B/seed_topics/02_ai-regulation.md && echo "STALE: trends token" || echo "OK: trends"
grep -q '__BACKFILL_PENDING_QUESTIONS__' $B/seed_topics/02_ai-regulation.md && echo "STALE: pending questions token" || echo "OK: pending questions"

# Queue should be empty
node DPT_FRAMEWORK/cli/operate-queue.mjs claim $B --actor main-agent | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8')); console.log('queue:', d.item ? 'non-empty' : 'empty (expected)')"
```

预期：2 个 complete passed，backfill token 全部替换，queue 空。

## Phase 5: Gate + Verify

```bash
# Write trace event

# Run gate
GATE_OUTPUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle $B --gate wave1-complete -- node DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs --bundle $B --current-node phases/phase-wave1.md)
echo "$GATE_OUTPUT" | node -e "
const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
console.log('check.passed:', d.check.passed);
console.log('check.next:', d.check.next);
if (d.inspect?.length) { console.log('inspect:', d.inspect); }
"

# Verify outputs
echo "=== V1: evidence-summary files exist ==="
test -s $B/artifacts/wave1/01_ai-safety/evidence-summary.md && echo "  01 evidence-summary ✓" || echo "  01 evidence-summary ✗"
test -s $B/artifacts/wave1/02_ai-regulation/evidence-summary.md && echo "  02 evidence-summary ✓" || echo "  02 evidence-summary ✗"
test -s $B/artifacts/wave1/01_ai-safety/question-list.md && echo "  01 question-list ✓" || echo "  01 question-list ✗"
test -s $B/artifacts/wave1/02_ai-regulation/question-list.md && echo "  02 question-list ✓" || echo "  02 question-list ✗"

echo "=== V2: source URLs present ==="
grep -c 'http' $B/artifacts/wave1/01_ai-safety/evidence-summary.md
grep -c 'http' $B/artifacts/wave1/02_ai-regulation/evidence-summary.md

echo "=== V3: no stale backfill tokens ==="
grep -r '__BACKFILL_WAVE1_' $B/seed_topics/ && echo "V3 FAIL" || echo "V3 PASS"

echo "=== V4: gate_attempt in trace ==="
grep -c 'gate_attempt' $B/rb_trace.jsonl

echo "=== V5: relay slot receipts ==="
find $B/_subagents -name "runtime-receipt.jsonl" -exec echo "  {}" \;
for f in $(find $B/_subagents -name "runtime-receipt.jsonl"); do
  grep -c 'agent_result_ready' "$f"
done
```

预期：gate passed，2 个 evidence-summary 含 source URL，所有 `__BACKFILL_WAVE1_*__` token 已替换。

## Final Verdict

```bash
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B/rb_trace.jsonl')})"
```

预期：PASS。


## Step 6: 结果解读

> 验证 2-topic 并行 deepening：
>   2 个 sub-agent 并行搜索 → 各写 evidence-summary.md + question-list.md
>   → backfill 替换 6 个 token → gate pass。
>   需要 2 个 evidence-summary 存在、0 stale token、gate check.passed=true。


## Step HH: Post-Execution Health

Heavy profile — gate diagnostics, timeline consistency, ledger, receipts, cache trails, dedup evidence.

```bash
node experiments_env/shared/verify-bundle-health.mjs --bundle $B --profile heavy
```

> 健康检查不改变 verdict。health status 由 runner report 记录。

## Step 7: Cleanup

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B')})"
```
