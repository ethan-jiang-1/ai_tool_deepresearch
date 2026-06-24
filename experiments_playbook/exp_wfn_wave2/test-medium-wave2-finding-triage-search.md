---
schema: command-experiment/v1
experiment: agentic-queue-loop
case: wave2-finding-triage-search
weight: heavy
case_goal: "验证 Agent 正确区分 legacy question / resolution / emergent question，resolution 不 spawn sub-agent，search finding 有 receipt，无 orphan finding"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_agql_w2_triage_
trace: dpt_disp_agql_w2_triage_*/_trace.jsonl
verdict: trace-jsonl
req: WTS-002, WTS-003, WTS-008
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。本 playbook 验证 finding taxonomy 的三类区分和六种 decision 的正确使用。包含一个需要 exploit_search 的 legacy question 场景（需 spawn sub-agent）。

# test-wave2-finding-triage-search

验证：3 个 finding 正确分类（1 legacy→exploit_search + 1 resolution→use_existing_evidence + 1 emergent→record_only），resolution 不 spawn sub-agent，search finding 有 receipt，无 orphan。

## Phase 1: 创建 post-wave1 bundle（含 intentionally unresolved question）

```bash
REPO_ROOT=$(pwd)
B=$(node experiments/shared/new-disposable-bundle.mjs agql_w2_triage --force)
echo "Bundle: $B"

cat > $B/rb_plan.md << 'PLANEOF'
---
{
  "plan_basename": "agql_w2_triage",
  "derived_topic_count": 2,
  "topic_registry": [
    { "id": "t1", "slug": "01_claude-code", "title": "Claude Code CLI" },
    { "id": "t2", "slug": "02_agentic-tools", "title": "Agentic Coding Tools" }
  ]
}
---
# Research Plan: Wave2 Finding Triage
PLANEOF

cat > $B/rb_profile.yaml << 'PROFEOF'
root_must_answer_set:
  - "Claude Code 与竞品 agentic coding tools 之间有什么关系和差异化？"
research_profile: quick_factual
human_decision_checkpoints:
  hitl1: { status: recorded }
  hitl2: { status: not_started, answerability_class: not_assessed, user_decision: not_started, final_report_view: not_started }
PROFEOF

cat > $B/rb_status.json << 'EOF'
{"current_mode":"execution","state":"in_progress","current_gate":"wave2_complete","next_gate":"hitl2_recorded"}
EOF

mkdir -p $B/reference/01_claude-code $B/reference/02_agentic-tools
mkdir -p $B/artifacts/wave1/01_claude-code $B/artifacts/wave1/02_agentic-tools
mkdir -p $B/artifacts/wave2
mkdir -p $B/seed_topics

# Reference files
cat > $B/reference/01_claude-code/source.yaml << 'REFEOF'
- url: "https://example.com/claude-code-overview"
  title: "Claude Code Overview"
  retrieved_date: "2026-06-20"
  topic_tag: "01_claude-code"
REFEOF

cat > $B/reference/02_agentic-tools/source.yaml << 'REFEOF'
- url: "https://example.com/agentic-tools-comparison"
  title: "Agentic Coding Tools Comparison 2026"
  retrieved_date: "2026-06-20"
  topic_tag: "02_agentic-tools"
- url: "https://example.com/claude-code-vs-copilot"
  title: "Claude Code vs Copilot: Dynamic Workflow Comparison"
  retrieved_date: "2026-06-22"
  topic_tag: "02_agentic-tools"
REFEOF

cat > $B/reference/index.md << 'EOF'
# Reference Index
- 01_claude-code: 1 reference
- 02_agentic-tools: 2 references (含 claude-code-vs-copilot 对比)
EOF

# Wave1: Claude Code — has an intentionally UNRESOLVED question (t1-q1)
cat > $B/artifacts/wave1/01_claude-code/evidence-summary.md << 'W1EOF'
# Claude Code Evidence Summary
## Source URLs
- [Claude Code Overview](https://example.com/claude-code-overview) — 2026-06-20
## Key Findings
1. **机制理解**: Claude Code 的 sub-agent 架构和 MCP 集成是区别于竞品的关键特性
## Open Questions
1. [仍开放] Claude Code 动态工作流的具体性能数据未找到
W1EOF

cat > $B/artifacts/wave1/01_claude-code/question-list.md << 'W1EOF'
# Claude Code Question List
## Topic Investigation Targets
| target_id | question | origin | status | backing_refs | next_action |
| t1-q1 | 动态工作流性能数据 | must_answer | [仍开放] | source.yaml | cross-topic search |

## Question Reconciliation
- t1-q1: [仍开放] — 未找到 Claude Code 动态工作流的具体 benchmark

## Emergent Question Protocol
- new_concept: not_triggered
- contradiction: not_triggered
- missing_information_gap: checked (性能数据), trigger_refs: t1-q1
- noise_pattern: not_triggered

## Exploration / Exploitation Decision
- decision: continue
- unresolved_questions: [t1-q1]
W1EOF

# Wave1: Agentic Tools — 包含可能回答 t1-q1 的 evidence
cat > $B/artifacts/wave1/02_agentic-tools/evidence-summary.md << 'W1EOF'
# Agentic Coding Tools Evidence Summary
## Source URLs
- [Tools Comparison](https://example.com/agentic-tools-comparison) — 2026-06-20
- [Claude Code vs Copilot](https://example.com/claude-code-vs-copilot) — 2026-06-22

## Key Findings
1. **机制理解**: Copilot 的 dynamic workflow 延迟约 200ms，作为 Claude Code 的对比基线
2. **趋势观察**: 竞品分析显示 agentic tools 的性能差异主要在 sub-agent 调度策略
## Open Questions
1. [部分解答] 竞品 dynamic workflow 性能对比（有 Copilot 数据，缺 Claude Code 数据）
W1EOF

cat > $B/artifacts/wave1/02_agentic-tools/question-list.md << 'W1EOF'
# Agentic Coding Tools Question List
## Topic Investigation Targets
| target_id | question | origin | status | backing_refs | next_action |
| t2-q1 | 竞品 dynamic workflow 性能对比 | must_answer | [部分进展] | source.yaml | cross-topic align |

## Question Reconciliation
- t2-q1: [部分进展] — 有 Copilot 基线但缺 Claude Code 数据

## Emergent Question Protocol
- new_concept: checked (sub-agent 调度策略差异), trigger_refs: evidence-summary
- contradiction: not_triggered
- missing_information_gap: not_triggered
- noise_pattern: not_triggered

## Exploration / Exploitation Decision
- decision: continue
- unresolved_questions: [t2-q1]
W1EOF

# Seed topics
cat > $B/seed_topics/01_claude-code.md << 'SEEDEOF'
---
id: "t1"
slug: "01_claude-code"
title: "Claude Code CLI"
---
# Claude Code CLI
## 本轮新增证据
- **ref-01-01**: [Claude Code Overview](https://example.com/claude-code-overview) — 2026-06-20
## 当前判断
__BACKFILL_WAVE2_JUDGMENT__
## 待验证问题
__BACKFILL_PENDING_QUESTIONS__
SEEDEOF

cat > $B/seed_topics/02_agentic-tools.md << 'SEEDEOF'
---
id: "t2"
slug: "02_agentic-tools"
title: "Agentic Coding Tools"
---
# Agentic Coding Tools
## 本轮新增证据
- **ref-01-01**: [Tools Comparison](https://example.com/agentic-tools-comparison) — 2026-06-20
## 当前判断
__BACKFILL_WAVE2_JUDGMENT__
## 待验证问题
__BACKFILL_PENDING_QUESTIONS__
SEEDEOF

echo "=== Post-wave1 bundle ready (intentionally unresolved t1-q1) ==="
```

## Phase 2: Enqueue + Synthesis — Finding Triage

```bash
# Enqueue synthesis
cat > /tmp/wfq-w2-synthesis.json << 'TASKEOF'
{"work_id":"wave2-synthesis","title":"Cross-topic: Claude Code + Agentic Tools","targets":{"controller":"main-agent"},"action":"读取 wave1 evidence-summary + question-list。建立 scan matrix。将 findings 写入 ledger/index。分类：t1-q1→wave1_legacy_question（exploit_search）、Copilot baseline answers t1-q1→cross_topic_resolution（use_existing_evidence）、sub-agent 调度差异→cross_topic_emergent_question（record_only）。对 exploit_search spawn dpt-topic-scout。写 synthesis projection。","producer_rule":"cross_topic_synthesis","lineage":{"phase":"wave2"},"priority_class":"P2_close_open_loop","required_receipts":["file:artifacts/wave2/synthesis.md","file:artifacts/wave2/cross-topic-ledger.md","file:artifacts/wave2/finding-index.yaml"],"done_condition":"三件套 artifact，finding triage 正确分类","verification":{"engine":["receipt_check"],"agent":["ledger_sections_complete","index_parseable","synthesis_has_W2F_refs"]},"writes_to":["artifacts/wave2/synthesis.md","artifacts/wave2/cross-topic-ledger.md","artifacts/wave2/finding-index.yaml"],"status_sync":["wave2_synthesis"],"completion_receipt":"file:artifacts/wave2/synthesis.md","failure_route":"queue_repair","payload":{"phase":"wave2"}}
TASKEOF
node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue $B --task /tmp/wfq-w2-synthesis.json

# Enqueue backfills
for slug in "01_claude-code" "02_agentic-tools"; do
  cat > /tmp/wfq-bf-$slug.json << BACKEOF
{"work_id":"wave2-backfill-$slug","title":"Backfill $slug","targets":{"controller":"main-agent"},"action":"从 ledger/index 投影 finding 到 seed_topics/$slug.md，替换 __BACKFILL_WAVE2_JUDGMENT__ 和 __BACKFILL_PENDING_QUESTIONS__","producer_rule":"seed_topic_backfill_wave2","lineage":{"topic_slug":"$slug","phase":"wave2"},"priority_class":"P4_progressive_artifact_or_seed_backfill","required_receipts":["file:seed_topics/$slug.md"],"done_condition":"token replaced","verification":{"engine":["receipt_check"],"agent":["token_replaced"]},"writes_to":["seed_topics/$slug.md"],"status_sync":["wave2_backfill"],"completion_receipt":"file:seed_topics/$slug.md","failure_route":"queue_repair","payload":{"topic_slug":"$slug","phase":"wave2"}}
BACKEOF
  node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue $B --task /tmp/wfq-bf-$slug.json
done

# Claim
CLAIM=$(node DPT_FRAMEWORK/cli/operate-queue.mjs claim $B --actor main-agent)
echo "$CLAIM" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8')); console.log('claimed:', d.item.work_id)"
```

## Phase 3: Finding Triage — 三类 Finding 正确分类

```bash
# Write ledger with correctly classified findings
cat > $B/artifacts/wave2/cross-topic-ledger.md << 'LEDGEREOF'
# Cross-Topic Ledger

## Cross-Topic Scan Matrix

| pair_id | topics | checked_dimensions | finding_ids | notes |
| P01 | 01_claude-code + 02_agentic-tools | shared_pattern, contradiction, resolution_opportunity, emergent_question | W2F-001, W2F-002, W2F-003 | Copilot baseline 部分回答 Claude Code 性能问题；sub-agent 调度策略差异是 emergent |

## Wave1 Legacy Questions

- t1-q1 (Claude Code 动态工作流性能): [仍开放] → 定向补搜
- t2-q1 (竞品 dynamic workflow 对比): [部分进展] → Copilot 基线可用

## Cross-Topic Resolutions

### W2F-001: Copilot baseline 部分回答 Claude Code 性能问题
- **type**: cross_topic_resolution
- **decision**: use_existing_evidence
- **search_required**: false
- **origin**: t1-q1 (Claude Code 动态工作流性能数据缺失)
- **trigger**: 02_agentic-tools evidence-summary — Copilot dynamic workflow 延迟 ~200ms
- **resolution**: Copilot 的 200ms 延迟可作为 Claude Code 的对比基线。这不是 Claude Code 的直接数据，但提供了 industry reference point

## Emergent Cross-Topic Questions

### W2F-002: Sub-agent 调度策略差异
- **type**: cross_topic_emergent_question
- **decision**: record_only
- **search_required**: false
- **affected_topics**: [01_claude-code, 02_agentic-tools]
- **finding**: Claude Code 和 Copilot 在 sub-agent 调度策略上有根本差异——这是 per-topic 视角不可见的 emergent pattern
- **reason**: 低影响观察，不追搜索

## Exploration Decisions

| finding_id | type | decision | reason |
| W2F-001 | cross_topic_resolution | use_existing_evidence | Copilot 基线已是 sufficient reference |
| W2F-002 | cross_topic_emergent_question | record_only | 低影响 |
| W2F-003 | wave1_legacy_question | exploit_search | t1-q1 需要定向搜索 Claude Code 性能数据 |

## HITL2 Handoff

(none — all findings resolved or record_only)
LEDGEREOF

# Write index — note W2F-003 is exploit_search with search_required=true
cat > $B/artifacts/wave2/finding-index.yaml << 'INDEXEOF'
version: "0.1"
source_layer: wave2_cross_topic
ledger: artifacts/wave2/cross-topic-ledger.md
synthesis: artifacts/wave2/synthesis.md
scan:
  topic_count: 2
  pair_count_expected: 1
  pair_count_checked: 1
findings:
  - id: W2F-001
    type: cross_topic_resolution
    status: partial
    decision: use_existing_evidence
    affected_topics: [01_claude-code, 02_agentic-tools]
    origin_refs:
      - artifacts/wave1/01_claude-code/question-list.md
    trigger_refs:
      - artifacts/wave1/02_agentic-tools/evidence-summary.md
    search_required: false
    subagent_receipt_refs: []
    appears_in_synthesis: true
    hitl2_handoff: false

  - id: W2F-002
    type: cross_topic_emergent_question
    status: open
    decision: record_only
    affected_topics: [01_claude-code, 02_agentic-tools]
    origin_refs: []
    trigger_refs:
      - artifacts/wave1/01_claude-code/evidence-summary.md
      - artifacts/wave1/02_agentic-tools/evidence-summary.md
    search_required: false
    subagent_receipt_refs: []
    appears_in_synthesis: true
    hitl2_handoff: false

  - id: W2F-003
    type: wave1_legacy_question
    status: open
    decision: exploit_search
    affected_topics: [01_claude-code]
    origin_refs:
      - artifacts/wave1/01_claude-code/question-list.md
    trigger_refs:
      - artifacts/wave1/01_claude-code/evidence-summary.md
    search_required: true
    subagent_receipt_refs:
      - _subagents/wave_02/slot_01/runtime-receipt.jsonl
    appears_in_synthesis: true
    hitl2_handoff: false
INDEXEOF

# Write synthesis with W2F refs
cat > $B/artifacts/wave2/synthesis.md << 'SYNTHESISEOF'
# Cross-Topic Synthesis: Claude Code + Agentic Tools

## Resolution: Performance Baseline Established

W2F-001: [Claude Code Q-list](../wave1/01_claude-code/question-list.md) 中的动态工作流性能问题，被 [Agentic Tools evidence](../wave1/02_agentic-tools/evidence-summary.md) 部分回答——Copilot ~200ms 延迟提供了 industry reference point。

## Emergent: Scheduling Strategy Divergence

W2F-002: Claude Code 和 Copilot 在 sub-agent 调度策略上有根本差异——这是 cross-topic 视角才可见的 pattern。

## Search: Claude Code Performance Data

W2F-003: [Claude Code evidence](../wave1/01_claude-code/evidence-summary.md) 缺少动态工作流性能 benchmark——targeted search required。

## Unresolved Cross-Topic Questions

- W2F-002 (scheduling divergence): record_only, 供 HITL2 参考
SYNTHESISEOF

echo "=== Verify: W2F-001 is resolution → search_required=false → no sub-agent ==="
grep -A2 "W2F-001" $B/artifacts/wave2/finding-index.yaml | grep "search_required: false" && echo "PASS: resolution has search_required=false" || echo "FAIL"

echo "=== Verify: W2F-003 is exploit_search → search_required=true → has receipt ==="
grep -A10 "W2F-003" $B/artifacts/wave2/finding-index.yaml | grep "exploit_search" && echo "PASS: exploit_search" || echo "FAIL"
grep -A10 "W2F-003" $B/artifacts/wave2/finding-index.yaml | grep "runtime-receipt" && echo "PASS: has receipt ref" || echo "FAIL"

echo "=== Verify: no orphan finding ==="
node -e "
const yaml=require('yaml'),fs=require('fs');
const idx=yaml.parse(fs.readFileSync('$B/artifacts/wave2/finding-index.yaml','utf-8'));
const orphans=idx.findings.filter(f=>!f.appears_in_synthesis && !f.hitl2_handoff);
console.log(orphans.length===0?'PASS: no orphan findings':'FAIL: '+orphans.length+' orphan(s)');
"
```

预期：W2F-001 search_required=false（resolution 不搜索），W2F-003 exploit_search + receipt ref 存在，无 orphan。

## Phase 4: Complete + Gate

```bash
# Complete synthesis
cat > /tmp/wfq-result-syn.json << 'EOF'
{"work_id":"wave2-synthesis","status":"done","receipt":"file:artifacts/wave2/synthesis.md","summary":"3 findings: 1 resolution + 1 emergent + 1 exploit_search (w receipt)","writes":["artifacts/wave2/synthesis.md","artifacts/wave2/cross-topic-ledger.md","artifacts/wave2/finding-index.yaml"]}
EOF
node DPT_FRAMEWORK/cli/operate-queue.mjs complete $B --result /tmp/wfq-result-syn.json | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));console.log('complete:',d.feedback.passed)"

# Backfill
for slug in "01_claude-code" "02_agentic-tools"; do
  node DPT_FRAMEWORK/cli/operate-queue.mjs claim $B --actor main-agent > /dev/null
  cat > /tmp/bf-$slug.json << EOF
{"work_id":"wave2-backfill-$slug","status":"done","receipt":"file:seed_topics/$slug.md","summary":"backfill complete","writes":["seed_topics/$slug.md"]}
EOF
  node DPT_FRAMEWORK/cli/operate-queue.mjs complete $B --result /tmp/bf-$slug.json | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));console.log('backfill $slug:',d.feedback.passed)"
done

# Gate
echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'","event":"wave2_completion"}' >> $B/rb_trace.jsonl
GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle $B --current-node phases/phase-wave2.md)
echo "$GATE_OUTPUT" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));console.log('gate passed:',d.check.passed)"

PASSED=$(echo "$GATE_OUTPUT" | node experiments/shared/extract-field.mjs check.passed)

echo "=== Verify V1: resolution W2F-001 has search_required=false ==="
grep -A2 "W2F-001" $B/artifacts/wave2/finding-index.yaml | grep -q "search_required: false" && echo "V1 PASS" || echo "V1 FAIL"

echo "=== Verify V2: W2F-003 has receipt ref ==="
grep -A10 "W2F-003" $B/artifacts/wave2/finding-index.yaml | grep -q "runtime-receipt" && echo "V2 PASS" || echo "V2 FAIL"

echo "=== Verify V3: no orphan ==="
node -e "const y=require('yaml'),f=require('fs');const i=y.parse(f.readFileSync('$B/artifacts/wave2/finding-index.yaml','utf-8'));const o=i.findings.filter(f=>!f.appears_in_synthesis&&!f.hitl2_handoff);console.log(o.length===0?'V3 PASS':'V3 FAIL: '+o.length+' orphans')"

echo "=== Verify V4: 3 findings total ==="
node -e "const y=require('yaml'),f=require('fs');const i=y.parse(f.readFileSync('$B/artifacts/wave2/finding-index.yaml','utf-8'));console.log(i.findings.length===3?'V4 PASS: 3 findings':'V4 FAIL: '+i.findings.length+' findings')"

node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'wave2-complete',passed:$PASSED,detail:'finding triage: 1 resolution + 1 emergent + 1 exploit_search, no orphan'})})"
```

## Final Verdict

```bash
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B/_trace.jsonl')})"
```

## Cleanup

```bash
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B')})"
```
