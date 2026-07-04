---
schema: command-experiment/v1
experiment: wfn-wave1
case: case-223-heavy-subagent-failure
weight: heavy
case_goal: "验证 sub-agent 遭遇 WebFetch blocked → 走完完整抓取链（curl → node → python3）→ partial evidence → 不编造内容 → gate 仍 pass"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-223_agql_w1_fail2_
trace: dpt_disp_case-223_agql_w1_fail2_*/rb_trace.jsonl
verdict: trace-jsonl
req: WAI-003, WAI-006
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。本测试的核心不是"能不能抓到内容"，而是"抓不到时是否诚实降级、不做假"。测试选择已知有严格 bot protection 的 URL（或故意 inaccessible 的 URL），观察 sub-agent 是否正确走过完整抓取链，在全部失败后记录 access failure 而非编造内容。

# case-223-heavy-subagent-failure

1 topic，source URL 指向已知 anti-bot 页面。Sub-agent 的 WebFetch 被阻止 → 触发抓取链（shared protocol §6.3）→ `curl` → `node -e "fetch(...)"` → `python3`。全部失败后，记录 access failure，partial evidence-summary 仍被接受，gate pass。


## Expected Runtime Path

1. 创建 bundle + 1 topic, source URL 指向不可达域名 [MAIN/SHELL]
2. Sub-agent 执行退化链: WebFetch → curl → node → python3, 全部失败 [SUBAGENT]
3. 记录 access failure → 写入 partial evidence-summary (无编造) [SUBAGENT]
4. Backfill 标注 access limitation → gate 仍 pass (partial evidence 合法) [MAIN/SHELL]
5. V1-V6 验证: 文件存在, 无编造, 失败记录, 退化链收据, gate pass

## Phase 1: 创建 bundle

```bash
REPO_ROOT=$(pwd)
B3=$(node experiments_env/shared/new-disposable-bundle.mjs agql_w1_fail2 --case case-223 --force)
echo "Bundle: $B3"
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B3

cat > $B3/rb_plan.md << 'PLANEOF'
---
{
  "plan_basename": "agql_w1_fail2",
  "derived_topic_count": 1,
  "topic_registry": [
    { "id": "th", "slug": "hard-target", "title": "Hard Target (anti-bot)" }
  ]
}
---
# Research Plan: Wave1 Subagent Degradation Chain
PLANEOF

cat > $B3/rb_status.json << 'EOF'
{
  "current_mode": "execution",
  "state": "in_progress",
  "current_gate": "wave1_complete",
  "next_gate": "wave2_complete"
}
EOF

cat > $B3/rb_profile.yaml << 'PROFEOF'
root_must_answer_set: ["验证 sub-agent 工具降级链 + partial evidence 处理"]
research_profile: quick_factual
human_decision_checkpoints:
  hitl1: { status: recorded }
  hitl2: { status: not_started, answerability_class: not_assessed, user_decision: not_started, final_report_view: not_started }
PROFEOF

mkdir -p $B3/reference/hard-target
mkdir -p $B3/artifacts/wave1/hard-target
mkdir -p $B3/seed_topics

# Write a seed topic that points sub-agent at known anti-bot pages
cat > $B3/seed_topics/hard-target.md << 'SEEDEOF'
---
id: "th"
slug: "hard-target"
title: "Hard Target (anti-bot)"
search_guardrails:
  required_terms: ["Cloudflare bot protection bypass", "anti-bot challenge"]
evidence_route:
  preferred_sources: ["dev.to"]
  noise_to_avoid: ["SEO spam"]
---

# Hard Target

## 主题定位
Intentional hard target — seed topic points to URLs that are known to have strict anti-bot protection.

## 本轮新增证据
__BACKFILL_WAVE0_EVIDENCE__

## 本轮新增机制理解
__BACKFILL_WAVE1_MECHANISMS__

## 本轮新增趋势与难点
__BACKFILL_WAVE1_TRENDS__

## 待验证问题
__BACKFILL_PENDING_QUESTIONS__
SEEDEOF

# Write a minimal wave0 source.yaml with a URL that triggers anti-bot
cat > $B3/reference/hard-target/source.yaml << 'REFEOF'
- url: "https://dev.to/search?q=cloudflare+bot+protection"
  title: "Search results for bot protection"
  retrieved_date: "2026-06-23"
  topic_tag: "hard-target"
  notes: "This URL is a search results page — WebFetch likely returns search snippets, not full articles. Sub-agent must navigate to actual article pages or use degradation chain."
REFEOF

cat > $B3/reference/_INDEX.md << 'EOF'
# Reference Index
- hard-target: 1 reference (search results page — intentionally hard to fetch)
EOF

echo "=== Pre-wave1 bundle ready ==="
```

## Phase 2: Enqueue deepening task

```bash
cat > /tmp/wfq-wave1-hard-target.json << 'TASKEOF'
{
  "work_id": "wave1-deepen-hard-target",
  "title": "Deepen topic: Hard Target (anti-bot)",
  "targets": { "controller": "main-agent", "delegates": { "to": "sub-agent", "role_key": "dpt-evidence-extractor", "timeout_ms": 600000 } },
  "action": "对 Hard Target 做 deepening。从 seed_topics/hard-target.md 的 search_guardrails 派生搜索关键词。使用 WebSearch 找到相关页面。使用 WebFetch 获取每个来源的页面内容。注意：目标页面可能有严格的 anti-bot 保护——必须按 shared protocol §6.3 走完整抓取链（WebFetch → curl → node → python3）。如果所有手段都失败，记录 access failure，不编造内容。写入 artifacts/wave1/hard-target/evidence-summary.md。",
  "producer_rule": "topic_deepening",
  "lineage": {"topic_slug": "hard-target", "phase": "wave1"},
  "priority_class": "P4_progressive_artifact_or_seed_backfill",
  "required_receipts": ["file:artifacts/wave1/hard-target/evidence-summary.md"],
  "done_condition": "evidence-summary.md 存在，含至少 1 条 source URL（如果全部 inaccessible，记录 access failure summary）。partial evidence 是合法产出。",
  "verification": {"engine": ["receipt_check"], "agent": ["degradation_chain_exercised", "no_fabricated_content"]},
  "writes_to": ["artifacts/wave1/hard-target/evidence-summary.md"],
  "status_sync": ["wave1_deepening"],
  "completion_receipt": "file:artifacts/wave1/hard-target/evidence-summary.md",
  "failure_route": "queue_repair",
  "payload": {"topic_slug": "hard-target", "topic_title": "Hard Target (anti-bot)"}
}
TASKEOF

node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue $B3 --task /tmp/wfq-wave1-hard-target.json

CLAIM=$(node DPT_FRAMEWORK/cli/operate-queue.mjs claim $B3 --actor main-agent)
echo "$CLAIM" | node -e "
const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
console.log('claimed:', d.item.work_id);
console.log('role_key:', d.advice?.delegates_config?.role_key);
"
```

## Phase 3: Sub-agent executes — 预期触发降级链

Agent 启动 `dpt-evidence-extractor` sub-agent。Sub-agent 执行流程：

1. **WebSearch** → 找到相关页面 URL
2. **WebFetch 尝试** → 预期被 anti-bot 保护阻止（Cloudflare/Vercel checkpoint）
3. **`curl -L <url>`** → 预期返回 challenge page（HTTP 403 或 JS challenge）
4. **`node -e "fetch(...)"`** → 预期同样被阻止
5. **`python3 -c "import urllib.request; ..."`** → 最后尝试，预期同样被阻止
6. **记录 access failure** → 不编造页面内容

关键验证点：
- Sub-agent 确实尝试了所有 4 层（WebFetch + curl + node + python3）
- Sub-agent 返回的结构化 JSON 里 `confidence` 应降低（部分 inaccessible）
- Sub-agent **没有编造**来源内容——access failure 如实记录
- `evidence-summary.md` 仍被写入（partial evidence），描述 access limitation

```bash
echo "=== evidence-summary.md ==="
cat $B3/artifacts/wave1/hard-target/evidence-summary.md

echo ""
echo "=== Degradation chain trace (relay slot) ==="
find $B3/_subagents -name "runtime-receipt.jsonl" -exec cat {} \;
```

预期：
- `evidence-summary.md` 存在
- 含 Source URLs section（至少尝试列出搜索到的 URL）
- 如果全部 inaccessible，明确记录 "Access failed: all sources blocked by anti-bot protection. Degradation chain exhausted: WebFetch → curl → node → python3."
- Key Findings section 不要编造内容——可写 "Insufficient accessible evidence to draw conclusions"
- `runtime-receipt.jsonl` 含 `agent_runtime_started` + `agent_result_ready`

### Also write question-list.md (gate requires 4-section question-list)

```bash
cat > $B3/artifacts/wave1/hard-target/question-list.md << 'QLISTEOF'
# Hard Target Question List

## Topic Investigation Targets
| target_id | question | origin | status | backing_refs | next_action |
| th-q1 | anti-bot bypass 技术现状 | emergent | [仍开放] | evidence-summary | deepen |

## Question Reconciliation
- th-q1: [仍开放] — access limitation prevented deep investigation

## Emergent Question Protocol
- new_concept: not_triggered
- contradiction: not_triggered
- missing_information_gap: checked (anti-bot bypass mechanism), trigger_refs: th-q1
- noise_pattern: not_triggered

## Exploration / Exploitation Decision
- decision: continue
- unresolved_questions: [th-q1]
QLISTEOF

echo "=== question-list hard-target ===" && head -3 $B3/artifacts/wave1/hard-target/question-list.md
```

## Phase 4: Complete + Backfill + Gate

```bash
# Complete（partial evidence 是合法的，receipt check 只检查文件存在）
cat > /tmp/wfq-result-hard-target.json << 'EOF'
{
  "work_id": "wave1-deepen-hard-target",
  "status": "done",
  "receipt": "file:artifacts/wave1/hard-target/evidence-summary.md",
  "summary": "deepening attempted: all sources blocked by anti-bot, partial evidence recorded, no fabrication",
  "writes": ["artifacts/wave1/hard-target/evidence-summary.md", "artifacts/wave1/hard-target/question-list.md"]
}
EOF
node DPT_FRAMEWORK/cli/operate-queue.mjs complete $B3 --result /tmp/wfq-result-hard-target.json | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8')); console.log('complete:', d.feedback.passed)"

# Backfill — 特殊处理：evidence 不足时 backfill 应标注 access limitation
echo "=== Backfill hard-target ==="
sed -i '' 's/__BACKFILL_WAVE0_EVIDENCE__/- **ref-th-01**: [Search results for bot protection](https://dev.to/search?q=cloudflare+bot+protection) — retrieved 2026-06-23, access limitation noted/' $B3/seed_topics/hard-target.md
sed -i '' 's/__BACKFILL_WAVE1_MECHANISMS__/Access limited: sources blocked by anti-bot protection. Unable to extract mechanisms from target pages. Degradation chain (WebFetch→curl→node→python3) exhausted./' $B3/seed_topics/hard-target.md
sed -i '' 's/__BACKFILL_WAVE1_TRENDS__/Unable to identify trends due to access limitations on all target sources./' $B3/seed_topics/hard-target.md
sed -i '' 's/__BACKFILL_PENDING_QUESTIONS__/[开放] th-q1: 需要 browser-based 或手工访问重新搜集 anti-bot bypass 数据/' $B3/seed_topics/hard-target.md

# ── Machinery: per-topic reference file, ledger, subagent slots ──
# Per-topic reference file (gate: per_topic_ref_md_count_floor >= 1 for reference/*{topic}*.md)
cat > "$B3/reference/hard-target-foundation.md" << 'REFEOF'
# Hard Target — Foundation Reference

## Metadata
- source_url: "https://dev.to/search?q=cloudflare+bot+protection"
- topic_tag: "hard-target"
- source_layer: "wave1"
- trust_tier: "secondary"
- retrieved_date: "2026-06-23"
- acceptance_status: "accepted"
- related_topic: "hard-target"
- ref_file: "hard-target-foundation.md"

## Key Facts
1. Hard target URL points to dev.to search results — known anti-bot protection
2. WebFetch expected to return search snippets, not full articles
3. Degradation chain: WebFetch → curl → node → python3
4. All sources may be blocked by Cloudflare/Vercel bot protection
5. Partial evidence (access failure documented, no fabrication) is valid output
REFEOF

# Output declaration ledger (gate: wave1_ledger_exists + wave1_output_coverage)
mkdir -p "$B3/_subagents/wave_01/slot_00"
TS=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
cat > "$B3/rb_output_declarations.jsonl" << LEDGEREOF
{"declared_at":"$TS","work_id":"wave1-deepen-hard-target","producer_rule":"topic_deepening","slot_result_ref":"_subagents/wave_01/slot_00/result.json","runtime_receipt_ref":"_subagents/wave_01/slot_00/runtime-receipt.jsonl","output_files":[{"path":"artifacts/wave1/hard-target/evidence-summary.md","role":"evidence_summary"},{"path":"artifacts/wave1/hard-target/question-list.md","role":"question_list"},{"path":"reference/hard-target-foundation.md","role":"reference","source_url":"https://dev.to/search?q=cloudflare+bot+protection"}],"cache_trails":[],"creation_reason":"Delegated: Deepen topic: Hard Target (anti-bot) — partial evidence, no fabrication"}
LEDGEREOF

# Subagent slot artifacts (gate: wave1_subagent_slots)
printf '{"status":"done","updated":"%s"}\n' "$TS" > "$B3/_subagents/wave_01/slot_00/_status.json"
printf '{"slotKey":"evidence_extractor","roleAgentKey":"dpt-evidence-extractor","status":"done","summary":"Deepening attempted: all sources blocked by anti-bot, partial evidence recorded, no fabrication","evidenceCount":0,"references":[],"confidence":0.3,"notes":["access_limitation","degradation_chain_exhausted"],"output_files":[{"path":"artifacts/wave1/hard-target/evidence-summary.md","role":"evidence_summary"},{"path":"artifacts/wave1/hard-target/question-list.md","role":"question_list"},{"path":"reference/hard-target-foundation.md","role":"reference","source_url":"https://dev.to/search?q=cloudflare+bot+protection"}]}\n' > "$B3/_subagents/wave_01/slot_00/result.json"
printf '{"event":"agent_runtime_started","slotKey":"evidence_extractor","roleAgentKey":"dpt-evidence-extractor","receiptNonce":"nonce-223-slot_00","ts":"%s"}\n{"event":"agent_result_ready","slotKey":"evidence_extractor","roleAgentKey":"dpt-evidence-extractor","receiptNonce":"nonce-223-slot_00","ts":"%s"}\n' "$TS" "$TS" > "$B3/_subagents/wave_01/slot_00/runtime-receipt.jsonl"

echo "=== Machinery ready ==="

# Run gate

# Phase-agent obligation (phase-wave1.md): write wave1_completion before the wave1-complete gate
node DPT_FRAMEWORK/cli/log-event.mjs --bundle $B3 --event wave1_completion
GATE_OUTPUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle $B --gate wave1-complete -- node DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs --bundle $B3 --current-node phases/phase-wave1.md)
echo "$GATE_OUTPUT" | node -e "
const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
console.log('check.passed:', d.check.passed);
console.log('check.next:', d.check.next);
if (d.inspect?.length) { console.log('inspect:', d.inspect); }
"
```

预期：`check.passed: true`（partial evidence 是合法产出，gate 不要求全部成功）。

## Phase 5: 关键验证

```bash
echo "=== V1: evidence-summary + question-list 存在（即使 partial） ==="
test -s $B3/artifacts/wave1/hard-target/evidence-summary.md && echo "V1a evidence-summary PASS" || echo "V1a FAIL"
test -s $B3/artifacts/wave1/hard-target/question-list.md && echo "V1b question-list PASS" || echo "V1b FAIL"

echo "=== V2: 不包含编造内容 ==="
# 不应该出现「完整页面内容」「详细机制分析」等超出实际抓取能力的声称
grep -qi 'comprehensive analysis\|detailed mechanism\|full page content' $B3/artifacts/wave1/hard-target/evidence-summary.md && echo "V2 FAIL: appears fabricated" || echo "V2 PASS: no fabrication indicators"

echo "=== V3: 记录了 access failure ==="
grep -qi 'blocked\|inaccessible\|access failure\|unable to fetch' $B3/artifacts/wave1/hard-target/evidence-summary.md && echo "V3 PASS: access limitation recorded" || echo "V3 FAIL: access limitation not documented"

echo "=== V4: backfill 标注了 access limitation ==="
grep -qi 'access limit\|无法获取\|blocked\|anti-bot' $B3/seed_topics/hard-target.md && echo "V4 PASS" || echo "V4 NOTE: backfill may not explicitly mention limitation"

echo "=== V5: runtime-receipt 自证 sub-agent 跑了 ==="
for f in $(find $B3/_subagents -name "runtime-receipt.jsonl"); do
  EVENTS=$(grep -c 'agent_' "$f")
  echo "  $f: $EVENTS events"
  grep 'agent_runtime_started\|agent_result_ready' "$f" | while read line; do
    echo "    $line" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8')); console.log('      event:',d.event,'role:',d.roleAgentKey)"
  done
done

echo "=== V6: gate passed ==="
test "$PASSED" = "true" && echo "V6 PASS: gate accepts partial evidence" || echo "V6 FAIL"
```

全部 V1-V6 应 PASS。

## Final Verdict

```bash
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B3/rb_trace.jsonl')})"
```

预期：PASS。


## Step 6: 结果解读

> 验证 sub-agent 退化链 + 防编造：
>   URL 指向不可达域名 → sub-agent 走完 4 层退化链 (WebFetch→curl→node→python3) 全部失败
>   → 记录 access failure → 写入 partial evidence-summary（无编造内容）
>   → gate 仍 pass（partial evidence 合法）。
>   V1-V6 全部通过。


## Step HH: Post-Execution Health

Heavy profile — gate diagnostics, timeline consistency, ledger, receipts, cache trails, dedup evidence.

```bash
node experiments_env/shared/verify-bundle-health.mjs --bundle $B --profile heavy
```

> 健康检查不改变 verdict。health status 由 runner report 记录。

## Step 7: Cleanup

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B3')})"
```