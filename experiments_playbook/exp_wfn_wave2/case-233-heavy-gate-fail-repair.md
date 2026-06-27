---
schema: command-experiment/v1
experiment: wfn-wave2
case: case-233-heavy-gate-fail-repair
weight: heavy
case_goal: "验证 gate fail（ledger 缺 section + backfill token 残留）→ inspect/advice → repair → gate pass，trace 含 2 条 gate_attempt"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-233_agql_w2_repair_
trace: dpt_disp_case-233_agql_w2_repair_*/_logs/_trace.jsonl
verdict: trace-jsonl
req: RWG-003, RWG-010
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。本 playbook 验证 gate fail → inspect/advice → repair → rerun → pass 的 PDCA 修复回路。

# case-233-heavy-gate-fail-repair

验证：首次 gate fail（ledger 缺 1 个 section + backfill token 残留）→ inspect 定位问题 → 补写 section + 替换 token → rerun gate pass → trace 含 fail + pass 两条 gate_attempt。


## Expected Runtime Path

1. 创建 bundle + 1 topic, ledger 缺 section + stale backfill tokens [MAIN/SHELL]
2. 第一次 gate: fail, inspect 列出两类 defect [MAIN/SHELL]
3. Repair: append section → sed 替换 tokens [MAIN/SHELL]
4. 第二次 gate: pass, trace 含 2 条 gate_attempt [MAIN/SHELL]
5. 从 trace 裁决 + Cleanup

## Phase 1: 创建 post-wave1 bundle + 写入有缺陷的 wave2 artifact

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs agql_w2_repair --case case-233 --force)
echo "Bundle: $B"

cat > $B/rb_plan.md << 'PLANEOF'
---
{
  "plan_basename": "agql_w2_repair",
  "derived_topic_count": 1,
  "topic_registry": [
    { "id": "t1", "slug": "01_test-topic", "title": "Test Topic" }
  ]
}
---
# Research Plan: Wave2 Gate Fail Repair
PLANEOF

cat > $B/rb_profile.yaml << 'PROFEOF'
root_must_answer_set: ["Test question"]
research_profile: quick_factual
human_decision_checkpoints:
  hitl1: { status: recorded }
  hitl2: { status: not_started, answerability_class: not_assessed, user_decision: not_started, final_report_view: not_started }
PROFEOF

cat > $B/rb_status.json << 'EOF'
{"current_mode":"execution","state":"in_progress","current_gate":"wave2_complete","next_gate":"hitl2_recorded"}
EOF

mkdir -p $B/artifacts/wave0/01_test-topic
mkdir -p $B/artifacts/wave1/01_test-topic $B/artifacts/wave2
mkdir -p $B/seed_topics

# Minimal post-wave1 data
cat > $B/artifacts/wave0/01_test-topic/source.yaml << 'REFEOF'
- url: "https://example.com/test"
  title: "Test Reference"
  retrieved_date: "2026-06-20"
  topic_tag: "01_test-topic"
REFEOF

cat > $B/reference/_INDEX.md << 'EOF'
# Reference Index
- 01_test-topic: 1 reference
EOF

cat > $B/artifacts/wave1/01_test-topic/evidence-summary.md << 'W1EOF'
# Test Evidence Summary

## Source URLs
- [Test](https://example.com/test) — 2026-06-20

## Key Findings
1. **机制理解**: Test finding

## Open Questions
1. [部分解答] Test question
W1EOF

cat > $B/artifacts/wave1/01_test-topic/question-list.md << 'W1EOF'
# Test Question List

## Topic Investigation Targets
| target_id | question | origin | status | backing_refs | next_action |
| t1-q1 | test | must_answer | [部分解答] | source.yaml | done |

## Question Reconciliation
- t1-q1: [部分解答]

## Emergent Question Protocol
- new_concept: not_triggered
- contradiction: not_triggered
- missing_information_gap: not_triggered
- noise_pattern: not_triggered

## Exploration / Exploitation Decision
- decision: continue
- unresolved_questions: []
W1EOF

# Seed topic with backfill token (INTENTIONALLY LEFT UNREPLACED for first gate run)
cat > $B/seed_topics/01_test-topic.md << 'SEEDEOF'
---
id: "t1"
slug: "01_test-topic"
title: "Test Topic"
---
# Test Topic

## 当前判断
__BACKFILL_WAVE2_JUDGMENT__

## 待验证问题
__BACKFILL_PENDING_QUESTIONS__
SEEDEOF

# Write synthesis.md (valid)
cat > $B/artifacts/wave2/synthesis.md << 'SYNTHESISEOF'
# Cross-Topic Synthesis: Test

W2F-001: [Test evidence](../wave1/01_test-topic/evidence-summary.md) shows basic finding.
SYNTHESISEOF

# Write ledger INTENTIONALLY MISSING one section (no HITL2 Handoff)
cat > $B/artifacts/wave2/cross-topic-ledger.md << 'LEDGEREOF'
# Cross-Topic Ledger

## Cross-Topic Scan Matrix

| pair_id | topics | checked_dimensions | finding_ids | notes |
| P01 | 01_test-topic | shared_pattern | none | Single topic - no cross-topic pairs |

## Wave1 Legacy Questions

(no unresolved legacy questions)

## Cross-Topic Resolutions

(no cross-topic resolutions — single topic)

## Emergent Cross-Topic Questions

(no emergent questions — single topic)

## Exploration Decisions

(no exploration decisions needed)

(NOTE: HITL2 Handoff section intentionally omitted — this should cause gate to fail)
LEDGEREOF

# Write index (valid)
cat > $B/artifacts/wave2/finding-index.yaml << 'INDEXEOF'
version: "0.1"
source_layer: wave2_cross_topic
ledger: artifacts/wave2/cross-topic-ledger.md
synthesis: artifacts/wave2/synthesis.md
scan:
  topic_count: 1
  pair_count_expected: 0
  pair_count_checked: 0
findings: []
INDEXEOF


echo "=== Defective wave2 artifacts ready ==="
echo "Defects:"
echo "  1. ledger missing HITL2 Handoff section"
echo "  2. backfill token __BACKFILL_WAVE2_JUDGMENT__ still present in seed topic"
echo "  3. backfill token __BACKFILL_PENDING_QUESTIONS__ still present in seed topic"
```

## Phase 2: First Gate Run — Expected FAIL

```bash
GATE1=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle $B --current-node phases/phase-wave2.md)
echo "$GATE1" | node -e "
const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
console.log('Gate#1 passed:', d.check.passed);
console.log('inspect count:', d.inspect?.length);
if (d.inspect?.length) { d.inspect.forEach(i => console.log('  inspect:', i)); }
if (d.advice?.length) { d.advice.forEach(a => console.log('  advice:', a)); }
"

PASSED1=$(echo "$GATE1" | node experiments_env/shared/extract-field.mjs check.passed)
echo "=== Gate#1 PASSED=$PASSED1 (expected: false) ==="
test "$PASSED1" = "false" && echo "PASS: gate correctly failed" || echo "FAIL: gate should have failed"

node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_logs/_trace.jsonl',{gate:'wave2-complete',passed:$PASSED1,detail:'gate fail: ledger missing HITL2 Handoff section + backfill tokens unreplaced'})})"
```

预期：gate fail，inspect 列出 ledger section 缺失 + backfill token 残留。

## Phase 3: Repair — Fix Defects

```bash
echo "=== Repair Step 1: Add missing HITL2 Handoff section to ledger ==="
cat >> $B/artifacts/wave2/cross-topic-ledger.md << 'REPAIR1'

## HITL2 Handoff

(no findings requiring human review — single topic synthesis)
REPAIR1

echo "=== Repair Step 2: Replace backfill tokens in seed topic ==="
sed -i '' 's/__BACKFILL_WAVE2_JUDGMENT__/Cross-topic judgment: single topic, no cross-topic findings./' $B/seed_topics/01_test-topic.md
sed -i '' 's/__BACKFILL_PENDING_QUESTIONS__/- [部分解答] t1-q1: resolved in wave1/' $B/seed_topics/01_test-topic.md

echo "=== Verify repairs ==="
echo "Ledger sections:" && grep "## " $B/artifacts/wave2/cross-topic-ledger.md
echo "Backfill token check:" && grep -q '__BACKFILL_' $B/seed_topics/01_test-topic.md && echo "  STALE TOKEN STILL PRESENT" || echo "  all tokens replaced ✓"
```

## Phase 4: Second Gate Run — Expected PASS

```bash
GATE2=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle $B --current-node phases/phase-wave2.md)
echo "$GATE2" | node -e "
const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
console.log('Gate#2 passed:', d.check.passed);
console.log('check.next:', d.check.next);
"

PASSED2=$(echo "$GATE2" | node experiments_env/shared/extract-field.mjs check.passed)
echo "=== Gate#2 PASSED=$PASSED2 (expected: true) ==="
test "$PASSED2" = "true" && echo "PASS: gate passed after repair" || echo "FAIL"

node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_logs/_trace.jsonl',{gate:'wave2-complete',passed:$PASSED2,detail:'gate pass: after repair (added HITL2 Handoff section + replaced backfill tokens)'})})"
```

预期：gate pass，`check.next: phases/phase-hitl2.md`。

## Phase 5: Verify Repair Trace

```bash
echo "=== V1: trace has 2 gate_attempt entries ==="
GATE_COUNT=$(grep -c 'gate_attempt' $B/rb_trace.jsonl)
echo "gate_attempt count: $GATE_COUNT"
test "$GATE_COUNT" -ge 2 && echo "V1 PASS: $GATE_COUNT gate_attempts" || echo "V1 FAIL: only $GATE_COUNT"

echo "=== V2: first gate_attempt is fail, second is pass ==="
FIRST_PASSED=$(grep 'gate_attempt' $B/rb_trace.jsonl | head -1 | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));console.log(d.passed)")
SECOND_PASSED=$(grep 'gate_attempt' $B/rb_trace.jsonl | tail -1 | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));console.log(d.passed)")
echo "first: $FIRST_PASSED, second: $SECOND_PASSED"
test "$FIRST_PASSED" = "false" -a "$SECOND_PASSED" = "true" && echo "V2 PASS: fail→pass repair loop" || echo "V2 FAIL"

echo "=== V3: ledger has all 6 sections after repair ==="
for sec in "Cross-Topic Scan Matrix" "Wave1 Legacy Questions" "Cross-Topic Resolutions" "Emergent Cross-Topic Questions" "Exploration Decisions" "HITL2 Handoff"; do
  grep -q "$sec" $B/artifacts/wave2/cross-topic-ledger.md && echo "  $sec ✓" || echo "  $sec ✗"
done

echo "=== V4: backfill tokens absent ==="
grep -r '__BACKFILL_' $B/seed_topics/ && echo "V4 FAIL" || echo "V4 PASS"
```

## Final Verdict

```bash
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B/_logs/_trace.jsonl')})"
```


## Step 6: 结果解读

> 验证 wave2 gate 双 defect 检测：
>   Scenario A: ledger 缺 HITL2 Handoff section + stale backfill tokens → gate fail
>   Scenario B: append section → sed 替换 tokens → gate pass
>   trace 含 2 条 gate_attempt (1 fail + 1 pass) → PASS。

## Step 7: Cleanup

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B')})"
```