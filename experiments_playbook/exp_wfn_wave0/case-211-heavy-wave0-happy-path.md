---
schema: command-experiment/v1
experiment: wfn-wave0
case: case-211-heavy-wave0-happy-path
weight: heavy
case_goal: "验证 Agent 从 seed_topics → wave0 queue-loop → sub-agent 真实搜索 → backfill → gate pass 的完整顺利路径"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-211_agql_w0_happy_
trace: dpt_disp_case-211_agql_w0_happy_*/rb_trace.jsonl
verdict: trace-jsonl
req: AGQ-008
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。所有产出必须来自实际的 CLI 调用、文件写入和 gate 输出。禁止 mock 返回、跳过 queue、手写假 trace。

# case-211-heavy-wave0-happy-path

完整顺利路径：bundle → seed_topics 物化 → wave0 enqueue → claim → sub-agent 真实 WebSearch+WebFetch → complete → backfill → gate pass → verify。


## Expected Runtime Path

1. 创建 disposable bundle + 物化 seed_topics [MAIN/SHELL]
2. Enqueue wave0 source_intake task cards [MAIN/SHELL]
3. Claim → spawn dpt-source-intake sub-agent 真实搜索 [MAIN→SUBAGENT]
4. Complete → backfill __BACKFILL_WAVE0_EVIDENCE__ → gate pass [MAIN/SHELL]
5. 从 trace 裁决 + Cleanup

## Phase 1: 创建 bundle + 物化 seed_topics

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs agql_w0_happy --case case-211 --force)
echo "Bundle: $B"
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B

# Write rb_plan.md with topic_registry
cat > $B/rb_plan.md << 'PLANEOF'
---
{
  "plan_basename": "agql_w0_happy",
  "derived_topic_count": 1,
  "topic_registry": [
    {
      "id": "t-claude-code",
      "slug": "claude-code-cli-tool",
      "title": "Claude Code CLI 工具"
    }
  ]
}
---
# Research Plan: Wave0 Happy Path
PLANEOF

cat > $B/rb_profile.yaml << 'PROFEOF'
root_must_answer_set:
  - "Claude Code CLI 的工具能力和使用场景是什么？"
research_profile:
  depth: foundation
  scope: "验证 wave0 queue-loop happy path"
PROFEOF

cat > $B/rb_status.json << 'EOF'
{
  "current_mode": "execution",
  "state": "in_progress",
  "current_gate": "wave0_complete",
  "next_gate": "wave1_complete"
}
EOF

mkdir -p $B/reference/claude-code-cli-tool $B/seed_topics
```

### Materialize seed topic

按 `phase-seed-topics.md` §3.1 文件结构创建 `seed_topics/claude-code-cli-tool.md`（含 search_guardrails 驱动后续搜索）：

```bash
cat > $B/seed_topics/claude-code-cli-tool.md << 'SEEDEOF'
---
id: "t-claude-code"
slug: "claude-code-cli-tool"
title: "Claude Code CLI 工具"
must_answer:
  - "Claude Code CLI 的核心工具能力和使用场景是什么？"
hypothesis: "Claude Code 是 Anthropic 面向开发者的终端原生 agentic coding 工具"
in_scope: "工具能力、使用场景、版本演进、竞品差异"
out_of_scope: "API 定价、模型训练细节、非 CLI 产品"
search_guardrails:
  required_terms:
    - "Claude Code CLI"
    - "Anthropic"
  forbidden_broadening:
    - "通用 AI 编程工具"
evidence_route:
  preferred_sources:
    - "Anthropic 官方文档"
    - "权威技术媒体 (DevOps.com, VentureBeat, SitePoint)"
  noise_to_avoid:
    - "个人博客"
---
# Claude Code CLI 工具

## 主题定位
Agentic CLI coding tool by Anthropic。Wave0 foundation reference collection 入口。

## must_answer
1. Claude Code CLI 的核心工具能力和使用场景是什么？

## 初始假设、缺口或张力
**已知**：终端原生 agentic coding 工具，sub-agent/MCP/hooks。
**缺口**：版本迭代历史、动态工作流性能、竞品系统对比。
**张力**：闭源 vs 透明度；token 消耗 vs ROI。

## why now
- 2026年5月动态工作流发布
- AI 编程工具市场竞争加剧

## 研究边界与不深挖范围
**在范围内**：工具能力、使用场景、版本里程碑、竞品差异
**不深挖**：模型训练细节、企业采购、通用市场趋势

## 证据锚点与优先来源
- Anthropic 官方文档 — 最高可信度
- DevOps.com / VentureBeat / SitePoint — 技术媒体

## 为什么对最终交付物重要
提供 Claude Code CLI 能力边界的事实基座。

---

## ═══ 研究轮次追加区 ═══

## 历史摘要
*(seed-topics: 本 topic 为新建)*

## 本轮新增证据
__BACKFILL_WAVE0_EVIDENCE__

## 本轮新增机制理解
__BACKFILL_WAVE1_MECHANISMS__

## 本轮新增趋势与难点
__BACKFILL_WAVE1_TRENDS__

## 当前判断
__BACKFILL_WAVE2_JUDGMENT__

## 待验证问题
__BACKFILL_PENDING_QUESTIONS__
SEEDEOF

echo "seed_topics materialized: $(ls $B/seed_topics/)"
```

预期：`seed_topics/claude-code-cli-tool.md` 存在，frontmatter 含 id/slug/title/search_guardrails，正文含 `__BACKFILL_WAVE0_EVIDENCE__` 占位符。

## Phase 2: Wave0 Queue-Driven Source Intake

### Step 1 — Enqueue task card

```bash
cat > /tmp/wfq-task-claude-code-cli-tool.json << 'EOF'
{
  "work_id": "wave0-source-claude-code-cli-tool",
  "title": "Source intake: Claude Code CLI 工具",
  "targets": { "controller": "main-agent", "delegates": { "to": "sub-agent", "role_key": "dpt-source-intake", "timeout_ms": 600000 } },
  "action": "搜索 Claude Code CLI 的 foundation reference。从 seed_topics/claude-code-cli-tool.md 的 search_guardrails 派生搜索关键词。使用 WebSearch + WebFetch 获取真实来源。写入 reference/claude-code-cli-tool/source.yaml（YAML 数组，每条含 url/title/retrieved_date/topic_tag）。搜索过程和中间结果写入 relay slot 目录（_cache/wave0/slot_MM/），sub-agent 只写自己的 slot 目录，Phase Agent 通过 relay 收集结果。",
  "producer_rule": "source_intake_fan_in",
  "lineage": {"topic_slug": "claude-code-cli-tool", "phase": "wave0"},
  "priority_class": "P5_new_reference_intake",
  "required_receipts": ["file:reference/claude-code-cli-tool/source.yaml"],
  "done_condition": "source.yaml 存在且通过 schema 校验，至少含 1 条 reference",
  "verification": {"engine": ["receipt_check"], "agent": ["url_accessible", "title_matches_page"]},
  "writes_to": ["reference/claude-code-cli-tool/source.yaml"],
  "status_sync": ["wave0_intake"],
  "completion_receipt": "file:reference/claude-code-cli-tool/source.yaml",
  "failure_route": "queue_repair",
  "payload": {"topic_slug": "claude-code-cli-tool", "topic_title": "Claude Code CLI 工具"}
}
EOF

node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue $B --task /tmp/wfq-task-claude-code-cli-tool.json
```

### Step 2 — Claim + sub-agent 真实搜索

```bash
# Claim
CLAIM=$(node DPT_FRAMEWORK/cli/operate-queue.mjs claim $B --actor main-agent)
echo "$CLAIM" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf-8');const j=JSON.parse(d);console.log('claimed:', j.item.work_id, 'targets.controller:', j.item.targets.controller, 'delegates:', j.item.targets.delegates?.role_key, 'advice.delegates_required:', j.advice?.delegates_required)"
# 预期: claimed: wave0-source-claude-code-cli-tool targets.controller: main-agent delegates: dpt-source-intake advice.delegates_required: true
```

Agent 通过 `shared-subagent-protocol.md` §3 批量并行协议启动 sub-agent：
- Sub-agent 收到 relay slot 的 `task.md` + `result.schema.json`（bounded 上下文）
- 使用 WebSearch 搜索 "Claude Code CLI tool Anthropic features capabilities"
- 使用 curl/WebFetch 获取至少 1 条可信来源的完整页面
- 提取 url/title/retrieved_date/topic_tag 写入 source.yaml
- 搜索中间结果写入 relay slot 目录 `_cache/wave0/slot_MM/`
- 返回结构化 JSON 给 Phase Agent → Phase Agent 调用 `ingestAgentReceipt` + `commitSlotResult` 验证
- Phase Agent 只读 result.json，不读 sub-agent 原始搜索 trail

```bash
# Sub-agent 产出验证
echo "=== source.yaml ===" && cat $B/reference/claude-code-cli-tool/source.yaml
echo "=== relay slot dirs ===" && ls $B/_subagents/ 2>/dev/null || echo "(slots managed by relay)"
```

### Step 3 — Complete

```bash
cat > /tmp/wfq-result-wave0-source-claude-code-cli-tool.json << 'EOF'
{
  "work_id": "wave0-source-claude-code-cli-tool",
  "status": "done",
  "receipt": "file:reference/claude-code-cli-tool/source.yaml",
  "summary": "source intake complete: N real references from WebSearch + WebFetch",
  "writes": ["reference/claude-code-cli-tool/source.yaml"]
}
EOF

node DPT_FRAMEWORK/cli/operate-queue.mjs complete $B --result /tmp/wfq-result-wave0-source-claude-code-cli-tool.json

# 验证 queue 空
node DPT_FRAMEWORK/cli/operate-queue.mjs claim $B --actor main-agent | node -e "const d=require('fs').readFileSync('/dev/stdin','utf-8');const j=JSON.parse(d);console.log('item:', j.item ? 'non-null' : 'null (expected)')"
```

预期：complete feedback.passed: true，claim 返回 item: null。

## Phase 3: Backfill — 回填 seed topic

wave0 source intake 完成后，必须回填 seed topic。走 queue：enqueue backfill task → claim → execute（替换 `__BACKFILL_WAVE0_EVIDENCE__` 为实际 ref）→ complete。

```bash
# Enqueue backfill task
cat > /tmp/wfq-backfill-claude-code-cli-tool.json << 'EOF'
{
  "work_id": "backfill-wave0-claude-code-cli-tool",
  "title": "Backfill wave0 evidence to seed topic: Claude Code CLI 工具",
  "targets": { "controller": "main-agent" },
  "action": "读取 reference/claude-code-cli-tool/source.yaml，回填到 seed_topics/claude-code-cli-tool.md 的 ## 本轮新增证据，替换 __BACKFILL_WAVE0_EVIDENCE__。",
  "producer_rule": "backfill_wave0_evidence",
  "lineage": {"topic_slug": "claude-code-cli-tool", "phase": "wave0", "trigger": "wave0_complete"},
  "priority_class": "P2_close_open_loop",
  "required_receipts": ["trace:gate_attempt"],
  "done_condition": "__BACKFILL_WAVE0_EVIDENCE__ 已被替换为实际 ref 列表",
  "verification": {"engine": ["receipt_check"], "agent": ["placeholder_removed", "ref_count_matches"]},
  "writes_to": ["seed_topics/claude-code-cli-tool.md"],
  "status_sync": ["wave0_backfill"],
  "completion_receipt": "none",
  "failure_route": "queue_repair",
  "payload": {"topic_slug": "claude-code-cli-tool", "phase": "wave0"}
}
EOF

node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue $B --task /tmp/wfq-backfill-claude-code-cli-tool.json

# Claim
node DPT_FRAMEWORK/cli/operate-queue.mjs claim $B --actor main-agent | node -e "const d=require('fs').readFileSync('/dev/stdin','utf-8');const j=JSON.parse(d);console.log('claimed:', j.item.work_id)"

# Execute: 替换占位符为真实 evidence
# Agent 读取 source.yaml → 替换 __BACKFILL_WAVE0_EVIDENCE__

# Verify 占位符已清除
grep -q '__BACKFILL_WAVE0_EVIDENCE__' $B/seed_topics/claude-code-cli-tool.md && echo "FAIL: placeholder still present" || echo "PASS: placeholder removed"

# Complete
cat > /tmp/wfq-result-backfill-claude-code-cli-tool.json << 'EOF'
{
  "work_id": "backfill-wave0-claude-code-cli-tool",
  "status": "done",
  "receipt": "none",
  "summary": "backfill complete: __BACKFILL_WAVE0_EVIDENCE__ replaced with refs from source.yaml",
  "writes": ["seed_topics/claude-code-cli-tool.md"]
}
EOF

node DPT_FRAMEWORK/cli/operate-queue.mjs complete $B --result /tmp/wfq-result-backfill-claude-code-cli-tool.json
```

预期：complete feedback.passed: true。

## Phase 4: Gate + Verify

```bash
# Write reference/_INDEX.md
cat > $B/reference/_INDEX.md << 'EOF'
# Reference Index

## claude-code-cli-tool
- N foundation references (real WebSearch + WebFetch)
EOF


# Run gate
GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle $B --current-node phases/phase-wave0.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
echo "=== PASSED=$PASSED (expected: true) ==="
test "$PASSED" = "true" && echo "PASS: gate passed" || echo "FAIL"

node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'wave0-complete',passed:$PASSED,detail:'happy path: seed_topics→wave0 queue-loop→sub-agent real search→backfill→gate pass'})})"
```

预期：`check.passed: true`，`check.next: phases/phase-wave1.md`。

### Verify outputs

```bash
echo "=== V1: source.yaml ==="
test -s $B/reference/claude-code-cli-tool/source.yaml && echo "V1 PASS" || echo "V1 FAIL"

echo "=== V2: ref count ==="
REF_COUNT=$(grep -c 'url:' $B/reference/claude-code-cli-tool/source.yaml)
echo "refs: $REF_COUNT"
test "$REF_COUNT" -ge 1 && echo "V2 PASS" || echo "V2 FAIL"

echo "=== V3: required fields ==="
for f in url title retrieved_date topic_tag; do
  grep -q "$f" $B/reference/claude-code-cli-tool/source.yaml && echo "  $f ✓" || echo "  $f ✗"
done

echo "=== V4-V6: queue trace events ==="
grep -c 'queue_' $B/rb_trace.jsonl

echo "=== V7: gate_attempt in rb_trace.jsonl ==="
grep -c 'gate_attempt' $B/rb_trace.jsonl

echo "=== V8: backfill done ==="
grep -q '__BACKFILL_WAVE0_EVIDENCE__' $B/seed_topics/claude-code-cli-tool.md && echo "V8 FAIL" || echo "V8 PASS"

echo "=== V9: relay slot directories populated ==="
find $B/_subagents -type d 2>/dev/null | head -10
echo "=== V9b: cache dirs ==="
find $B/_cache -type d 2>/dev/null | head -10
```

全部 V1-V9 应 PASS。

## Final Verdict

```bash
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B/rb_trace.jsonl')})"
```

预期：PASS。


## Step 5: 结果解读

> 验证完整 wave0 链路：
>   sub-agent 真实搜索 → 写入 source.yaml → backfill 替换 __BACKFILL_WAVE0_EVIDENCE__ → gate pass。
>   需要 sub-agent receipt 存在、source.yaml 存在、backfill token 消失、gate check.passed=true。

## Step 6: Cleanup

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B')})"
```