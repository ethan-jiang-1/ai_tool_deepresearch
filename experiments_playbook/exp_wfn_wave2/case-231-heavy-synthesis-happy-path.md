---
schema: command-experiment/v1
experiment: wfn-wave2
case: case-231-heavy-synthesis-happy-path
weight: heavy
case_goal: "验证 Agent 从 post-wave1 bundle → wave2 queue-driven synthesis → 三件套 artifact → backfill → gate pass 的完整顺利路径"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-231_agql_w2_happy_
trace: dpt_disp_case-231_agql_w2_happy_*/_trace.jsonl
verdict: trace-jsonl
req: WTS-001, WTS-004, WTS-007
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。所有产出必须来自实际的 CLI 调用、文件写入和 gate 输出。禁止 mock 返回、跳过 queue、手写假 trace。

# case-231-heavy-synthesis-happy-path

完整顺利路径：post-wave1 bundle → wave2 enqueue（1 synthesis + N backfill）→ claim → Phase Agent 执行 finding triage（scan matrix → classify → decision → 写三件套；`main-agent` 仅是 CLI actor wire value）→ complete → backfill → gate pass → verify。


## Expected Runtime Path

1. 创建 post-wave1 bundle + 2 topics [MAIN/SHELL]
2. Enqueue synthesis + backfill task cards [MAIN/SHELL]
3. Phase Agent 执行 finding triage → 写三件套 artifact [MAIN]
4. Complete → backfill → gate pass [MAIN/SHELL]
5. V1-V8 验证: 3 artifact, 6 ledger sections, YAML parse, W2F refs

## Phase 1: 创建 post-wave1 bundle

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs agql_w2_happy --case case-231 --force)
echo "Bundle: $B"
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B

# Write plan with 2 topics
cat > $B/rb_plan.md << 'PLANEOF'
---
{
  "plan_basename": "agql_w2_happy",
  "derived_topic_count": 2,
  "topic_registry": [
    { "id": "t1", "slug": "01_ai-safety", "title": "AI Safety" },
    { "id": "t2", "slug": "02_ai-regulation", "title": "AI Regulation" }
  ]
}
---
# Research Plan: Wave2 Happy Path
PLANEOF

cat > $B/rb_profile.yaml << 'PROFEOF'
root_must_answer_set:
  - "AI safety 和 AI regulation 之间有什么关系和张力？"
research_profile: quick_factual
human_decision_checkpoints:
  hitl1: { status: recorded }
  hitl2: { status: not_started, answerability_class: not_assessed, user_decision: not_started, final_report_view: not_started }
PROFEOF

cat > $B/rb_status.json << 'EOF'
{
  "current_mode": "execution",
  "state": "in_progress",
  "current_gate": "wave2_complete",
  "next_gate": "hitl2_recorded"
}
EOF

# Create post-wave1 directory structure
mkdir -p $B/reference/01_ai-safety $B/reference/02_ai-regulation
mkdir -p $B/artifacts/wave1/01_ai-safety $B/artifacts/wave1/02_ai-regulation
mkdir -p $B/artifacts/wave2
mkdir -p $B/seed_topics

# Write post-wave0 reference files
cat > $B/reference/01_ai-safety/source.yaml << 'REFEOF'
- url: "https://example.com/ai-safety-2026"
  title: "AI Safety Research 2026"
  retrieved_date: "2026-06-20"
  topic_tag: "01_ai-safety"
REFEOF

cat > $B/reference/02_ai-regulation/source.yaml << 'REFEOF'
- url: "https://example.com/ai-regulation-2026"
  title: "AI Regulation Overview 2026"
  retrieved_date: "2026-06-20"
  topic_tag: "02_ai-regulation"
REFEOF

cat > $B/reference/index.md << 'EOF'
# Reference Index
- 01_ai-safety: 1 foundation reference
- 02_ai-regulation: 1 foundation reference
EOF

# Write post-wave1 artifacts (evidence-summary + question-list per topic)
cat > $B/artifacts/wave1/01_ai-safety/evidence-summary.md << 'W1EOF'
# AI Safety Evidence Summary

## Source URLs
- [AI Safety 2026](https://example.com/ai-safety-2026) — retrieved 2026-06-20

## Key Findings
1. **机制理解**: AI safety 关注 alignment、robustness、interpretability 三大方向
2. **趋势观察**: 2025-2026 年行业从 "capability first" 转向 "safety-by-design"

## Open Questions
1. [仍开放] safety 机制的实际部署证据不足
2. [部分解答] 开源 vs 闭源的安全策略差异
W1EOF

cat > $B/artifacts/wave1/01_ai-safety/question-list.md << 'W1EOF'
# AI Safety Question List

## Topic Investigation Targets
| target_id | question | origin | status | backing_refs | next_action |
| t1-q1 | safety 机制部署证据 | must_answer | [仍开放] | source.yaml | deepen |
| t1-q2 | 开源 vs 闭源安全策略 | must_answer | [部分进展] | evidence-summary | cross-topic align |

## Question Reconciliation
- t1-q1: [仍开放] — 公开部署证据有限
- t1-q2: [部分进展] — 看到差异但未完整回答

## Emergent Question Protocol
- new_concept: checked (safety-by-design 范式转移), trigger_refs: evidence-summary §Key Findings
- contradiction: not_triggered
- missing_information_gap: checked (部署证据), trigger_refs: t1-q1
- noise_pattern: not_triggered

## Exploration / Exploitation Decision
- decision: continue
- unresolved_questions: [t1-q1, t1-q2]
W1EOF

cat > $B/artifacts/wave1/02_ai-regulation/evidence-summary.md << 'W1EOF'
# AI Regulation Evidence Summary

## Source URLs
- [AI Regulation 2026](https://example.com/ai-regulation-2026) — retrieved 2026-06-20

## Key Findings
1. **机制理解**: EU AI Act 和 US Executive Order 形成两大监管框架
2. **趋势观察**: 监管重心从 "模型规模" 转向 "高风险应用场景"

## Open Questions
1. [仍开放] 监管对开源模型的豁免边界不清晰
W1EOF

cat > $B/artifacts/wave1/02_ai-regulation/question-list.md << 'W1EOF'
# AI Regulation Question List

## Topic Investigation Targets
| target_id | question | origin | status | backing_refs | next_action |
| t2-q1 | 开源模型豁免边界 | must_answer | [仍开放] | source.yaml | cross-topic align |

## Question Reconciliation
- t2-q1: [仍开放] — 豁免条件模糊

## Emergent Question Protocol
- new_concept: not_triggered
- contradiction: not_triggered
- missing_information_gap: checked (豁免边界), trigger_refs: t2-q1
- noise_pattern: not_triggered

## Exploration / Exploitation Decision
- decision: continue
- unresolved_questions: [t2-q1]
W1EOF

# Write seed topics with __BACKFILL_WAVE2_JUDGMENT__ and __BACKFILL_PENDING_QUESTIONS__ tokens
cat > $B/seed_topics/01_ai-safety.md << 'SEEDEOF'
---
id: "t1"
slug: "01_ai-safety"
title: "AI Safety"
search_guardrails:
  required_terms: ["AI safety", "alignment"]
---

# AI Safety

## 本轮新增证据
- **ref-01-01**: [AI Safety 2026](https://example.com/ai-safety-2026) — retrieved 2026-06-20

## 本轮新增机制理解
AI safety 关注 alignment、robustness、interpretability 三大方向。

## 本轮新增趋势与难点
2025-2026 年行业从 "capability first" 转向 "safety-by-design"。

## 当前判断
__BACKFILL_WAVE2_JUDGMENT__

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
---

# AI Regulation

## 本轮新增证据
- **ref-01-01**: [AI Regulation 2026](https://example.com/ai-regulation-2026) — retrieved 2026-06-20

## 本轮新增机制理解
EU AI Act 和 US Executive Order 形成两大监管框架。

## 本轮新增趋势与难点
监管重心从 "模型规模" 转向 "高风险应用场景"。

## 当前判断
__BACKFILL_WAVE2_JUDGMENT__

## 待验证问题
__BACKFILL_PENDING_QUESTIONS__
SEEDEOF

echo "=== Post-wave1 bundle ready ==="
echo "seed_topics:" && ls $B/seed_topics/
echo "reference:" && find $B/reference -type f | sort
echo "artifacts/wave1:" && find $B/artifacts/wave1 -type f | sort
```

预期：2 个 seed topic 含 `__BACKFILL_WAVE2_JUDGMENT__` + `__BACKFILL_PENDING_QUESTIONS__` token，wave1 evidence-summary + question-list 各 2 份。

## Phase 2: Wave2 Enqueue — 灌料

```bash
# Synthesis task card
cat > /tmp/wfq-wave2-synthesis.json << 'TASKEOF'
{
  "work_id": "wave2-synthesis",
  "title": "Cross-topic synthesis: AI Safety + AI Regulation",
  "targets": { "controller": "main-agent" },
  "action": "读取所有 topic 的 wave1 evidence-summary + question-list。建立 cross-topic scan matrix。将 findings 写入 cross-topic-ledger.md（三类：legacy_question/resolution/emergent_question）和 finding-index.yaml（11 required field/finding）。对每个 finding 做 decision（use_existing_evidence/exploit_search/explore_search/defer_hitl2/requires_internal_data/record_only）。跑 JS feedback check。仅对 exploit_search/explore_search spawn dpt-topic-scout sub-agent。写 synthesis.md 作为 narrative projection（引用 W2F-xxx finding id）。跑 JS feedback check。无新 finding 或达上限 → complete。",
  "producer_rule": "cross_topic_synthesis",
  "lineage": {"phase": "wave2"},
  "priority_class": "P2_close_open_loop",
  "required_receipts": ["file:artifacts/wave2/synthesis.md", "file:artifacts/wave2/cross-topic-ledger.md", "file:artifacts/wave2/finding-index.yaml"],
  "done_condition": "三件套 artifact 均存在，finding triage loop 收敛，backfill 完成",
  "verification": {"engine": ["receipt_check"], "agent": ["ledger_sections_complete", "index_parseable", "synthesis_has_W2F_refs"]},
  "writes_to": ["artifacts/wave2/synthesis.md", "artifacts/wave2/cross-topic-ledger.md", "artifacts/wave2/finding-index.yaml"],
  "status_sync": ["wave2_synthesis"],
  "completion_receipt": "file:artifacts/wave2/synthesis.md",
  "failure_route": "queue_repair",
  "payload": {"phase": "wave2"}
}
TASKEOF

node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue $B --task /tmp/wfq-wave2-synthesis.json

# Backfill task cards — one per topic
for slug in "01_ai-safety" "02_ai-regulation"; do
  cat > /tmp/wfq-backfill-$slug.json << BACKEOF
{
  "work_id": "wave2-backfill-$slug",
  "title": "Backfill wave2 to seed topic: $slug",
  "targets": { "controller": "main-agent" },
  "action": "从 Wave2 ledger/index 投影 finding（筛选 affected_topics 包含 $slug 的 finding），替换 seed_topics/$slug.md 的 __BACKFILL_WAVE2_JUDGMENT__ 和 __BACKFILL_PENDING_QUESTIONS__ token。保留 source_layer: wave2_cross_topic、finding id、decision、status。",
  "producer_rule": "seed_topic_backfill_wave2",
  "lineage": {"topic_slug": "$slug", "phase": "wave2"},
  "priority_class": "P4_progressive_artifact_or_seed_backfill",
  "required_receipts": ["file:seed_topics/$slug.md"],
  "done_condition": "__BACKFILL_WAVE2_JUDGMENT__ 和 __BACKFILL_PENDING_QUESTIONS__ 已被替换",
  "verification": {"engine": ["receipt_check"], "agent": ["token_replaced", "source_layer_preserved"]},
  "writes_to": ["seed_topics/$slug.md"],
  "status_sync": ["wave2_backfill"],
  "completion_receipt": "file:seed_topics/$slug.md",
  "failure_route": "queue_repair",
  "payload": {"topic_slug": "$slug", "phase": "wave2"}
}
BACKEOF
  node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue $B --task /tmp/wfq-backfill-$slug.json
done

echo "=== Queue after enqueue ==="
node DPT_FRAMEWORK/cli/operate-queue.mjs render $B > /dev/null
```

预期：1 synthesis + 2 backfill = 3 task cards enqueued。

## Phase 3: Synthesis Execution — Finding Triage + 三件套

```bash
# Claim synthesis task
CLAIM=$(node DPT_FRAMEWORK/cli/operate-queue.mjs claim $B --actor main-agent)
echo "$CLAIM" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8')); console.log('claimed:', d.item.work_id)"

# Agent executes synthesis: build scan matrix → classify findings → make decisions → write three artifacts

# Step 1: Write cross-topic-ledger.md with scan matrix + findings
cat > $B/artifacts/wave2/cross-topic-ledger.md << 'LEDGEREOF'
# Cross-Topic Ledger

## Cross-Topic Scan Matrix

| pair_id | topics | checked_dimensions | finding_ids | notes |
| P01 | 01_ai-safety + 02_ai-regulation | shared_pattern, contradiction, resolution_opportunity, emergent_question | W2F-001, W2F-002 | safety regulation 形成 shared tension；regulation 部分回答 safety 的开源策略问题 |

## Wave1 Legacy Questions

- t1-q1 (safety 部署证据): [仍开放] — 未找到公开部署验证
- t1-q2 (开源 vs 闭源策略): [部分进展] — regulation topic 中 EU AI Act 提供了开源豁免边界的部分信息
- t2-q1 (开源豁免边界): [仍开放] — 豁免条件仍模糊

## Cross-Topic Resolutions

### W2F-001: regulation evidence 部分回答 safety 的开源策略问题
- **type**: cross_topic_resolution
- **decision**: use_existing_evidence
- **search_required**: false
- **origin**: t1-q2 (AI Safety 的 "开源 vs 闭源安全策略")
- **trigger**: 02_ai-regulation evidence-summary — EU AI Act 开源豁免条款提供 regulatory perspective
- **resolution**: regulation 框架的豁免条款暗示：安全策略差异可能源于合规要求而非技术选择

## Emergent Cross-Topic Questions

### W2F-002: safety-by-design 与 regulation 的时间线张力
- **type**: cross_topic_emergent_question
- **decision**: record_only
- **search_required**: false
- **affected_topics**: [01_ai-safety, 02_ai-regulation]
- **finding**: safety 转向 "safety-by-design" 比 regulation 框架早 1-2 年——regulatory lag 可能造成 compliance gap
- **reason**: 低影响观察，不追搜索

## Exploration Decisions

| finding_id | type | decision | reason |
| W2F-001 | cross_topic_resolution | use_existing_evidence | 已有 evidence 足够 |
| W2F-002 | cross_topic_emergent_question | record_only | 低影响，超出 wave2 budget |

## HITL2 Handoff

- W2F-002 (safety-by-design regulatory lag): record_only — 供 HITL2 参考，是否值得后续深挖
LEDGEREOF

# Step 2: Write finding-index.yaml
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
    affected_topics: [01_ai-safety, 02_ai-regulation]
    origin_refs:
      - artifacts/wave1/01_ai-safety/question-list.md
    trigger_refs:
      - artifacts/wave1/02_ai-regulation/evidence-summary.md
    search_required: false
    subagent_receipt_refs: []
    appears_in_synthesis: true
    hitl2_handoff: false

  - id: W2F-002
    type: cross_topic_emergent_question
    status: open
    decision: record_only
    affected_topics: [01_ai-safety, 02_ai-regulation]
    origin_refs: []
    trigger_refs:
      - artifacts/wave1/01_ai-safety/evidence-summary.md
      - artifacts/wave1/02_ai-regulation/evidence-summary.md
    search_required: false
    subagent_receipt_refs: []
    appears_in_synthesis: true
    hitl2_handoff: false
INDEXEOF

# Step 3: Write synthesis.md as narrative projection (引用 W2F-xxx)
cat > $B/artifacts/wave2/synthesis.md << 'SYNTHESISEOF'
# Cross-Topic Synthesis: AI Safety + AI Regulation

## Pattern: Safety-Regulation Interplay

W2F-001: [AI Safety evidence](../wave1/01_ai-safety/evidence-summary.md) 显示 safety-by-design 转向，而 [AI Regulation evidence](../wave1/02_ai-regulation/evidence-summary.md) 显示 EU AI Act 开源豁免条款。regulation 框架部分回答了 safety 中的开源策略问题——安全策略差异可能源于合规要求而非技术选择。

## Tension: Regulatory Lag

W2F-002: safety 的 "safety-by-design" 范式转移比 regulation 框架早 1-2 年——存在 regulatory lag 和潜在的 compliance gap。

## Unresolved Cross-Topic Questions

- W2F-002 (safety-by-design regulatory lag): 低影响，记录供 HITL2 参考
SYNTHESISEOF

echo "=== Three artifacts written ==="
echo "synthesis.md:" && wc -c < $B/artifacts/wave2/synthesis.md
echo "cross-topic-ledger.md:" && wc -c < $B/artifacts/wave2/cross-topic-ledger.md
echo "finding-index.yaml:" && wc -c < $B/artifacts/wave2/finding-index.yaml
```

预期：三件套均存在且非空，synthesis 含 W2F-001/W2F-002 引用和 wave1 evidence link。

## Phase 4: Complete Synthesis + Backfill

```bash
# Complete synthesis task
cat > /tmp/wfq-result-synthesis.json << 'EOF'
{
  "work_id": "wave2-synthesis",
  "status": "done",
  "receipt": "file:artifacts/wave2/synthesis.md",
  "summary": "synthesis complete: 2 findings (1 resolution + 1 emergent), 3 artifacts produced",
  "writes": ["artifacts/wave2/synthesis.md", "artifacts/wave2/cross-topic-ledger.md", "artifacts/wave2/finding-index.yaml"]
}
EOF
node DPT_FRAMEWORK/cli/operate-queue.mjs complete $B --result /tmp/wfq-result-synthesis.json | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8')); console.log('synthesis complete passed:', d.feedback.passed)"

# Backfill seed topics from ledger/index projection
# Topic 01_ai-safety
CLAIM1=$(node DPT_FRAMEWORK/cli/operate-queue.mjs claim $B --actor main-agent)
echo "$CLAIM1" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8')); console.log('backfill claim#1:', d.item.work_id)"

# Agent: grep → replace __BACKFILL_WAVE2_JUDGMENT__ with projection from ledger/index
# Agent: grep → replace __BACKFILL_PENDING_QUESTIONS__ with updated status labels

cat > /tmp/wfq-result-backfill-01.json << 'EOF'
{
  "work_id": "wave2-backfill-01_ai-safety",
  "status": "done",
  "receipt": "file:seed_topics/01_ai-safety.md",
  "summary": "backfill complete: W2F-001 projected (resolution: regulation evidence partially answers open-source strategy question)",
  "writes": ["seed_topics/01_ai-safety.md"]
}
EOF
node DPT_FRAMEWORK/cli/operate-queue.mjs complete $B --result /tmp/wfq-result-backfill-01.json | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8')); console.log('backfill#1 passed:', d.feedback.passed)"

# Topic 02_ai-regulation
CLAIM2=$(node DPT_FRAMEWORK/cli/operate-queue.mjs claim $B --actor main-agent)
echo "$CLAIM2" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8')); console.log('backfill claim#2:', d.item.work_id)"

cat > /tmp/wfq-result-backfill-02.json << 'EOF'
{
  "work_id": "wave2-backfill-02_ai-regulation",
  "status": "done",
  "receipt": "file:seed_topics/02_ai-regulation.md",
  "summary": "backfill complete: W2F-001 projected (regulation evidence used for cross-topic resolution)",
  "writes": ["seed_topics/02_ai-regulation.md"]
}
EOF
node DPT_FRAMEWORK/cli/operate-queue.mjs complete $B --result /tmp/wfq-result-backfill-02.json | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8')); console.log('backfill#2 passed:', d.feedback.passed)"

echo "=== Backfill token check ==="
grep -q '__BACKFILL_WAVE2_JUDGMENT__' $B/seed_topics/01_ai-safety.md && echo "FAIL: judgment token in 01" || echo "PASS: judgment token replaced in 01"
grep -q '__BACKFILL_WAVE2_JUDGMENT__' $B/seed_topics/02_ai-regulation.md && echo "FAIL: judgment token in 02" || echo "PASS: judgment token replaced in 02"
grep -q '__BACKFILL_PENDING_QUESTIONS__' $B/seed_topics/01_ai-safety.md && echo "FAIL: questions token in 01" || echo "PASS: questions token replaced in 01"
grep -q '__BACKFILL_PENDING_QUESTIONS__' $B/seed_topics/02_ai-regulation.md && echo "FAIL: questions token in 02" || echo "PASS: questions token replaced in 02"
```

预期：synthesis complete passed，2 个 backfill complete passed，4 个 backfill token 全部替换。

## Phase 5: Gate + Verify

```bash
# Write trace event
echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'","event":"wave2_completion"}' >> $B/rb_trace.jsonl

# Run gate
GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle $B --current-node phases/phase-wave2.md)
echo "$GATE_OUTPUT" | node -e "
const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
console.log('check.passed:', d.check.passed);
console.log('check.next:', d.check.next);
if (d.inspect?.length) { console.log('inspect:', d.inspect); }
"

PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
echo "=== PASSED=$PASSED (expected: true) ==="
test "$PASSED" = "true" && echo "PASS: gate passed" || echo "FAIL"

node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'wave2-complete',passed:$PASSED,detail:'happy path: post-wave1→wave2 queue-driven synthesis→三件套→backfill→gate pass'})})"
```

预期：`check.passed: true`，`check.next: phases/phase-hitl2.md`。

### Verify outputs

```bash
echo "=== V1: three artifacts exist ==="
test -s $B/artifacts/wave2/synthesis.md && echo "  synthesis.md ✓" || echo "  synthesis.md ✗"
test -s $B/artifacts/wave2/cross-topic-ledger.md && echo "  cross-topic-ledger.md ✓" || echo "  cross-topic-ledger.md ✗"
test -s $B/artifacts/wave2/finding-index.yaml && echo "  finding-index.yaml ✓" || echo "  finding-index.yaml ✗"

echo "=== V2: ledger has 6 fixed sections ==="
for sec in "Cross-Topic Scan Matrix" "Wave1 Legacy Questions" "Cross-Topic Resolutions" "Emergent Cross-Topic Questions" "Exploration Decisions" "HITL2 Handoff"; do
  grep -q "$sec" $B/artifacts/wave2/cross-topic-ledger.md && echo "  $sec ✓" || echo "  $sec ✗"
done

echo "=== V3: index is parseable YAML ==="
node -e "const fs=require('fs');const yaml=require('yaml');try{yaml.parse(fs.readFileSync('$B/artifacts/wave2/finding-index.yaml','utf-8'));console.log('  parse ✓')}catch(e){console.log('  parse ✗',e.message)}"

echo "=== V4: synthesis has W2F-xxx references ==="
grep -q 'W2F-00[12]' $B/artifacts/wave2/synthesis.md && echo "  W2F refs ✓" || echo "  W2F refs ✗"

echo "=== V5: synthesis has wave1 evidence references ==="
grep -q '../wave1/.*/evidence-summary.md' $B/artifacts/wave2/synthesis.md && echo "  wave1 refs ✓" || echo "  wave1 refs ✗"

echo "=== V6: backfill tokens replaced ==="
grep -r '__BACKFILL_WAVE2_\|__BACKFILL_PENDING_QUESTIONS__' $B/seed_topics/ && echo "  V6 FAIL" || echo "  V6 PASS"

echo "=== V7: gate_attempt in rb_trace.jsonl ==="
grep -c 'gate_attempt' $B/rb_trace.jsonl

echo "=== V8: scan matrix has checked pairs ==="
grep -q 'P01' $B/artifacts/wave2/cross-topic-ledger.md && echo "  scan matrix ✓" || echo "  scan matrix ✗"
```

全部 V1-V8 应 PASS。

## Final Verdict

```bash
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B/_trace.jsonl')})"
```

预期：PASS。


## Step 6: 结果解读

> 验证 wave2 完整顺利路径：
>   synthesis v1 → 3 件套 artifact (synthesis/ledger/index)
>   → 6 ledger sections, W2F refs, wave1 evidence links
>   → backfill tokens 替换 → gate pass。

## Step 7: Cleanup

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B')})"
```