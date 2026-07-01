---
schema: command-experiment/v1
experiment: evidence-extraction
case: case-163-heavy-rerun-add-real-cache-trail
weight: heavy
case_goal: "Real Agent/Sub-agent canary: 验证新的 rerun action:add topic 在 wave0 中走全量搜索 → 写入 _cache/ 三文件 leaf → slot result 声明 cache_trails → delegated complete → ledger append → gate cache_coverage 通过。若无可用的 Agent actor surface，记录 NOT RUN 并保留 bundle。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-163_reruncache
trace: dpt_disp_case-163_reruncache/rb_trace.jsonl
verdict: trace-jsonl
agent_mode: real-agent
---

## Execution Contract

本 case 需要真实的 Agent/Sub-agent 外部调用（WebSearch + WebFetch）。由 coding agent 在真实 disposable bundle 中执行。

若当前环境没有可用的 Agent actor surface（无 LLM API 或 sub-agent 不可用），runner SHALL:
1. 在第 3 步检测到 Agent 不可用时，记录 NOT RUN 到 trace
2. 保留 bundle 不动（不删除）
3. 退出时报告 NOT RUN 及原因

**禁止从 fixture 标记 PASS。** NOT RUN 不满足 archive/release 质量证明。

## Reality Distance Ledger

| 维度 | 声明 |
|------|------|
| **Agent actor** | 真实（需要 LLM API + WebSearch/WebFetch 能力） |
| **外部调用** | 真实（WebSearch→WebFetch→_cache/ 写入） |
| **bundle 创建** | `new-disposable-bundle.mjs` 创建真实 bundle |
| **rerun 状态** | fixture 写入 `hitl2.user_decision: rerun` + `action: add` topic |
| **gate 验证** | Engine gate CLI + file observability + check-reentry |
| **verdict 来源** | trace check events + gate JSON + file 检查 |
| **不证明** | Agent 在所有条件下的 cache 写入完整性；跨 topic 的 cache 一致性 |
| **质量指标** | 见 Step 6 — cache trail 覆盖率、grounding spot-check、URL 精度、countable rate、gap rate |

# case-163-heavy-rerun-add-real-cache-trail

## 测试目标

验证 rerun `action: add` 全链路：
1. Rerun bundle 含新增 topic（`action: add`）
2. Phase Agent 为该 topic 创建 full-intake task card
3. Sub-agent 执行真实 WebSearch + WebFetch，写入 `_cache/wave0/primary/{topic}/sNN_*/` 三文件
4. Sub-agent 在 slot result 的 `cache_trails[]` 中声明 leaf 路径
5. Queue `complete()` 验证 cache trails，将验证通过的路径写入 `rb_output_declarations.jsonl`
6. Gate `cache_coverage` 规则验证 trail 存在 + reference-to-cache mapping
7. 记录质量指标

---

## Step 1: 创建 rerun bundle + 搭建 rerun 状态

创建一个含 rerun 上下文的 disposable bundle：已有 2 个 topic + HITL2 rerun 决策，新增第 3 个 topic。

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs reruncache --case case-163 --force)
echo "Bundle: $B"

cat > "$B/rb_profile.yaml" << 'EOF'
plan_basename: reruncache
research_profile: quick_factual
root_must_answer_set: ["What is the current state of AI safety research?"]
research_style_params:
  wave0_shared_ref_total: 1
  wave0_per_topic_source_floor: 1
  wave1_per_topic_ref_floor: 1
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-06-15T10:00:00Z"
    research_profile: quick_factual
    root_must_answer_set: ["What is the current state of AI safety research?"]
  hitl2:
    status: recorded
    user_decision: rerun
    rationale: "Add economic impact analysis to topic coverage."
    rerun_count: 1
    recorded_at: "2026-06-28T10:00:00Z"
EOF

cat > "$B/rb_status.json" << 'JSON'
{"bundle":"reruncache","current_mode":"execution","state":"in_progress","current_gate":"rerun_ready","next_gate":"seed_topics_ready"}
JSON

# Rerun plan: 2 existing topics + 1 new (action:add)
cat > "$B/rb_plan.md" << 'MD'
---
{
  "plan_basename": "reruncache",
  "derived_topic_count": 2,
  "topic_registry": [
    { "id": "t1", "slug": "ai-regulation", "title": "AI Regulation" },
    { "id": "t2", "slug": "ai-safety-research", "title": "AI Safety Research" }
  ]
}
---
# Research Plan: AI Safety & Regulation

## Root Question
What is the current state of AI safety research?

## Topic Registry (pre-rerun)
Rerun will add topic: economic-impact
MD

# Seed topics — two existing + one new (action:add)
mkdir -p "$B/seed_topics"

cat > "$B/seed_topics/ai-regulation.md" << 'EOF'
---
id: "t1"
slug: "ai-regulation"
title: "AI Regulation"
---
# AI Regulation
## 主题定位 Regulatory frameworks for AI safety.
## must_answer What regulations govern AI safety?
## 本轮重跑方向
- **action**: keep
EOF

cat > "$B/seed_topics/ai-safety-research.md" << 'EOF'
---
id: "t2"
slug: "ai-safety-research"
title: "AI Safety Research"
---
# AI Safety Research
## 主题定位 Current state of AI safety research.
## must_answer What research directions exist?
## 本轮重跑方向
- **action**: keep
EOF

cat > "$B/seed_topics/economic-impact.md" << 'EOF'
---
id: "t3"
slug: "economic-impact"
title: "Economic Impact of AI Safety"
---
# Economic Impact of AI Safety
## 主题定位 Economic dimensions of AI safety regulation and research.
## must_answer What are the economic implications of AI safety measures?
## 本轮重跑方向
- **action**: add
- **new_search_dimensions**: "economic impact of AI safety regulation, cost of compliance, market effects"
- **rationale_excerpt**: Add economic impact analysis to topic coverage.
EOF

# Prerequisite files
cat > "$B/reference/_INDEX.md" << 'EOF'
| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |
| --- | --- | --- | --- | --- | --- | --- | --- |
EOF
echo "# Reference Evidence" > "$B/reference/README.md"

echo "=== Rerun bundle ready ==="
echo "B=$B"
```

---

## Step 2: 检测 Agent 可用性

```bash
B= # populated from Step 1

# Check if agent tools are available via environment or CLI introspection
AGENT_AVAILABLE=false

# Check for common agent-availability signals
if [ -n "${ANTHROPIC_API_KEY:-}" ] || [ -n "${CLAUDE_CODE_AVAILABLE:-}" ]; then
  AGENT_AVAILABLE=true
fi

# Also check if the deep research sub-agent types are registered
if node -e "console.log('ok')" 2>/dev/null; then
  # Placeholder: actual agent availability check would test sub-agent spawn capability
  # For now, mark as available if we can eval JS
  AGENT_AVAILABLE=true
fi

echo "Agent available: $AGENT_AVAILABLE"

if [ "$AGENT_AVAILABLE" = "false" ]; then
  echo "NOT RUN: No Agent actor surface available."
  cat >> "$B/rb_trace.jsonl" << 'EOFT'
{"ts":"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)","event":"check","source":"case-163","gate":"agent-availability","passed":false,"expected":true,"detail":"NOT RUN: No Agent actor surface available. Cannot execute real-agent canary."}
EOFT
  echo "Bundle preserved for inspection: $B"
  exit 0
fi
```

→ 预期：若 Agent 不可用 → NOT RUN + bundle preserved。若可用 → 继续。

---

## Step 3: 为新增 topic 创建并排入 queue task card

```bash
B= # populated from Step 1

# Read new topic from seed_topics
NEW_TOPIC_SLUG="economic-impact"
NEW_TOPIC_TITLE="Economic Impact of AI Safety"

# Ensure cache base directory exists
mkdir -p "$B/_cache/wave0/primary/${NEW_TOPIC_SLUG}"

# Create rb_queue.json
cat > "$B/rb_queue.json" << 'QJSON'
{"queue_health":"ready","stop_authorization_state":"unauthorized_continue_required","slot_1_current":null,"slot_2_next":null,"slot_3_pending":null,"slot_4_pending":null,"slot_5_tail":null,"refill_pool":[]}
QJSON

# Create task card for the new topic (full intake — same as first-run wave0)
cat > "$B/task_new_topic.json" <<< "{\"work_id\":\"wave0-source-${NEW_TOPIC_SLUG}\",\"title\":\"Source intake for ${NEW_TOPIC_TITLE}\",\"targets\":{\"controller\":\"main-agent\",\"delegates\":{\"to\":\"sub-agent\",\"role_key\":\"dpt-source-intake\",\"timeout_ms\":600000}},\"action\":\"搜索 [${NEW_TOPIC_TITLE}] 的 foundation reference。从 topic.title 和 seed_topics/${NEW_TOPIC_SLUG}.md 的 search_guardrails 派生搜索关键词。使用 WebSearch 找到至少 1 条可信来源，使用 WebFetch 获取每个来源的页面内容。提取并写入 artifacts/wave0/${NEW_TOPIC_SLUG}/source.yaml。将原始 WebSearch 结果、抓取页面和 source 元信息写入 _cache/wave0/primary/${NEW_TOPIC_SLUG}/：每个 source 在 sNN_<source-slug>/ 子目录下保存 websearch.json（原始搜索结果）、page.md（页面内容）、meta.json（11 字段：url, title, source_domain, source_name, fetched_at, fetch_method, fetch_chain, content_type, reliability_tier, reliability_basis, whitelist_status）。NN 从 01 开始递增。<source-slug> 与 reference/ 文件名 qualifier 一致。返回 JSON 必须包含 Agent Output Declaration：output_files[]（每个产出文件声明 path/role/source_url/source_slug，role=reference 时 source_url 必填）和 cache_trails[]（实际写入的 leaf source 目录路径）。\",\"producer_rule\":\"source_intake_fan_in\",\"lineage\":{\"topic_slug\":\"${NEW_TOPIC_SLUG}\",\"rerun_action\":\"add\",\"rerun_rationale\":\"Add economic impact analysis to topic coverage.\"},\"priority_class\":\"P5_new_reference_intake\",\"required_receipts\":[\"none\"],\"done_condition\":\"Files exist.\",\"verification\":{\"engine\":[],\"agent\":[]},\"writes_to\":[\"artifacts/wave0/${NEW_TOPIC_SLUG}/source.yaml\"],\"status_sync\":[],\"completion_receipt\":\"none\",\"failure_route\":\"queue repair work\",\"payload\":{}}"

node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue $B --task "$B/task_new_topic.json"
node DPT_FRAMEWORK/cli/operate-queue.mjs claim $B --actor main-agent

echo "Task enqueued and claimed for topic: $NEW_TOPIC_SLUG"
```

→ 预期：Task 进入 queue slot_1_current，status=running。

---

## Step 4: Sub-agent 执行真实搜索（需要 Agent actor）

> **此步骤需要真实 Agent actor。** Coding agent 在此步骤中：
> 1. 读取 `_subagents/wave_01/slot_00/task.md` 和 `result.schema.json`
> 2. 执行真实 WebSearch + WebFetch 搜索 `economic impact of AI safety regulation`
> 3. 将原始内容写入 `_cache/wave0/primary/economic-impact/s01_<source-slug>/` 三文件
> 4. 将产出文件写入 `reference/` 和 `artifacts/wave0/economic-impact/source.yaml`
> 5. 写入 `runtime-receipt.jsonl`
> 6. 返回符合 schema 的 JSON（含 `output_files[]` 和 `cache_trails[]`）

```bash
B= # populated from Step 1
NEW_TOPIC_SLUG="economic-impact"

echo "=== Agent Execution Phase ==="
echo "Bundle: $B"
echo "Task: Search for economic impact of AI safety regulation"
echo ""
echo "Agent instructions:"
echo "  1. Read $B/_subagents/wave_01/slot_00/task.md"
echo "  2. Use WebSearch to find sources about: economic impact of AI safety regulation, cost of compliance, market effects"
echo "  3. Use WebFetch to retrieve each source page content"
echo "  4. For each source, write to _cache/wave0/primary/${NEW_TOPIC_SLUG}/s01_<slug>/:"
echo "     - websearch.json (raw search results)"
echo "     - page.md (fetched page content)"
echo "     - meta.json (11 fields: url, title, source_domain, source_name, fetched_at, fetch_method, fetch_chain, content_type, reliability_tier, reliability_basis, whitelist_status)"
echo "  5. Write artifacts/wave0/${NEW_TOPIC_SLUG}/source.yaml (YAML array)"
echo "  6. Write a reference file to reference/00-shared-economic-impact.md (rich MD with metadata block + 5 sections)"
echo "  7. Write runtime-receipt.jsonl with agent_runtime_started + agent_result_ready events"
echo "  8. Return JSON matching result.schema.json with output_files[] and cache_trails[]"
echo ""
echo "=== If you are a coding agent executing this playbook ==="
echo "Execute steps 1-8 above, then continue to Step 5."
echo "=== If no Agent actor is available, skip to Step 99 (NOT RUN) ==="
```

> **Agent 执行指示**: 本步骤需要 coding agent 扮演 Sub-agent 角色，执行真实的 WebSearch + WebFetch。产出必须包括 `_cache/` 三文件 leaf 和正确的 `cache_trails[]` 声明。

---

## Step 5: 验证 cache trail 产物 + Queue complete → ledger

Agent 执行完成后，验证文件系统产物并完成 queue。

```bash
B= # populated from Step 1
NEW_TOPIC_SLUG="economic-impact"

echo "=== Post-Agent Verification ==="

# Check cache leaves
CACHE_DIR="$B/_cache/wave0/primary/${NEW_TOPIC_SLUG}"
if [ -d "$CACHE_DIR" ]; then
  echo "Cache directory exists: $CACHE_DIR"
  for leaf in "$CACHE_DIR"/s*/; do
    [ -d "$leaf" ] || continue
    leaf_name=$(basename "$leaf")
    has_ws=$( [ -f "$leaf/websearch.json" ] && echo "✓" || echo "✗" )
    has_pm=$( [ -f "$leaf/page.md" ] && echo "✓" || echo "✗" )
    has_mj=$( [ -f "$leaf/meta.json" ] && echo "✓" || echo "✗" )
    echo "  ${leaf_name}: websearch=${has_ws} page=${has_pm} meta=${has_mj}"
  done
else
  echo "WARNING: Cache directory not found: $CACHE_DIR"
fi

# Check reference files
echo "Reference files:"
ls -la "$B/reference/" 2>/dev/null || echo "  (none)"

# Check source.yaml
if [ -f "$B/artifacts/wave0/${NEW_TOPIC_SLUG}/source.yaml" ]; then
  echo "source.yaml entries:"
  grep -c "url:" "$B/artifacts/wave0/${NEW_TOPIC_SLUG}/source.yaml" 2>/dev/null || echo "  0"
fi

# Agent must write runtime receipt and result
echo "Slot files:"
ls -la "$B/_subagents/wave_01/slot_00/" 2>/dev/null || echo "  (none)"
```

→ 预期：至少 1 个 cache leaf 含三文件，reference 文件存在，source.yaml 存在。

---

## Step 6: Queue complete → ledger → gate cache_coverage

```bash
B= # populated from Step 1
NEW_TOPIC_SLUG="economic-impact"

# Check if result.json exists (Agent wrote it)
if [ ! -f "$B/_subagents/wave_01/slot_00/result.json" ]; then
  echo "NOT RUN: Agent did not produce result.json — no Agent actor executed Step 4."
  cat >> "$B/rb_trace.jsonl" << 'EOFT'
{"ts":"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)","event":"check","source":"case-163","gate":"agent-execution","passed":false,"expected":true,"detail":"NOT RUN: Agent did not produce slot result. No real Agent actor executed Step 4."}
EOFT
  echo "Bundle preserved for inspection: $B"
  exit 0
fi

# Queue complete with slot result reference
cat > "$B/result_complete.json" <<< "{\"work_id\":\"wave0-source-${NEW_TOPIC_SLUG}\",\"receipt\":\"none\",\"summary\":\"Completed source intake for ${NEW_TOPIC_SLUG}\",\"writes\":[\"artifacts/wave0/${NEW_TOPIC_SLUG}/source.yaml\"],\"slot_result_ref\":\"_subagents/wave_01/slot_00/result.json\"}"

set +e
node DPT_FRAMEWORK/cli/operate-queue.mjs complete $B --result "$B/result_complete.json"
COMPLETE_EXIT=$?
set -e
echo "Queue complete exit: $COMPLETE_EXIT"

# Check ledger
if [ -f "$B/rb_output_declarations.jsonl" ]; then
  echo "=== Ledger Record ==="
  cat "$B/rb_output_declarations.jsonl" | node -e "
    const fs = require('fs');
    const lines = fs.readFileSync('/dev/stdin', 'utf-8').trim().split('\n').filter(Boolean);
    for (const line of lines) {
      const r = JSON.parse(line);
      console.log('  work_id:', r.work_id);
      console.log('  output_files:', r.output_files.length, 'files');
      console.log('  cache_trails:', (r.cache_trails || []).length, 'trails');
      for (const t of (r.cache_trails || [])) console.log('    -', t);
    }
  "
else
  echo "WARNING: No ledger produced — complete may have rejected or Agent didn't declare output_files/cache_trails."
fi
```

→ 预期：complete 成功，ledger 含 cache_trails。

---

## Step 7: Gate + file observability + check-reentry 验证

```bash
B= # populated from Step 1

# Update status for gate check
cat > "$B/rb_status.json" << 'JSON'
{"bundle":"reruncache","current_mode":"execution","state":"in_progress","current_gate":"wave0_complete","next_gate":"wave1_complete"}
JSON

# Run wave0 gate
echo "=== Gate wave0-complete ==="
set +e
node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle "$B" --current-node phases/phase-wave0.md > "$B/gate-wave0-result.json" 2>&1
GATE_EXIT=$?
set -e
node -e "
  const fs = require('fs');
  const r = JSON.parse(fs.readFileSync('$B/gate-wave0-result.json', 'utf-8'));
  console.log('Gate passed:', r.check?.passed);
  console.log('Inspect:');
  for (const line of (r.inspect || [])) console.log('  ', line);
  // Record gate result
  fs.appendFileSync('$B/rb_trace.jsonl', JSON.stringify({
    ts: new Date().toISOString(),
    event: 'check',
    source: 'case-163',
    gate: 'gate-wave0-complete',
    passed: r.check?.passed === true,
    expected: true,
    detail: r.check?.passed ? 'Gate passed with cache_coverage' : 'Gate failed: ' + (r.inspect || []).join('; '),
  }) + '\n');
"

# File observability
echo "=== File Observability ==="
node -e "
  import('$PWD/DPT_FRAMEWORK/engine/helpers/file-observability.mjs').then(async m => {
    const { readOutputDeclarations } = await import('$PWD/DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs');
    const ledger = readOutputDeclarations('$B');
    const result = m.auditFileObservability('$B', {
      topicSlugs: ['ai-regulation', 'ai-safety-research', 'economic-impact'],
      ledgerDeclarations: ledger.map(l => ({ ...l, declared_at: l.declared_at || '', work_id: l.work_id || '', output_files: l.output_files || [] })),
      targetPhase: 'wave0',
    });
    console.log('Findings:', result.findings.length, 'files classified');
    const cacheGaps = (result.inspect || []).filter(l => l.includes('[cache_gap]'));
    console.log('Cache gaps:', cacheGaps.length);
    for (const gap of cacheGaps) console.log('  ', gap);
    const fs = await import('fs');
    fs.appendFileSync('$B/rb_trace.jsonl', JSON.stringify({
      ts: new Date().toISOString(),
      event: 'check', source: 'case-163',
      gate: 'file-observability',
      passed: cacheGaps.length === 0,
      expected: true,
      detail: cacheGaps.length === 0 ? 'No cache gaps detected' : cacheGaps.length + ' cache gaps found',
    }) + '\n');
  });
"
```

→ 预期：若 Agent 正确写入了 cache，gate cache_coverage 应 pass，file observability 应无 cache gap。

---

## Step 8: 质量指标收集

```bash
B= # populated from Step 1

echo "=== Quality Metrics ==="

# Metric 1: Cache trail coverage
node -e "
  const fs = require('fs');
  const path = require('path');
  const { readOutputDeclarations } = require('$PWD/DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs');
  const declarations = readOutputDeclarations('$B');
  let refCount = 0, mappedCount = 0, emptyTrailCount = 0, totalTrails = 0, validTrails = 0;
  for (const decl of declarations) {
    const refs = (decl.output_files || []).filter(f => f.role === 'reference');
    refCount += refs.length;
    const trails = decl.cache_trails || [];
    if (trails.length === 0 && refs.length > 0) emptyTrailCount++;
    for (const trail of trails) {
      totalTrails++;
      const d = path.join('$B', trail);
      const hasAll = fs.existsSync(path.join(d, 'websearch.json')) && fs.existsSync(path.join(d, 'page.md')) && fs.existsSync(path.join(d, 'meta.json'));
      if (hasAll) validTrails++;
      // Check mapping
      try {
        const meta = JSON.parse(fs.readFileSync(path.join(d, 'meta.json'), 'utf-8'));
        for (const ref of refs) {
          if (meta.url && ref.source_url && meta.url === ref.source_url) mappedCount++;
        }
      } catch {}
    }
  }
  console.log('cache_trail_coverage:', { refCount, emptyTrailCount, totalTrails, validTrails, mappedCount });
  fs.appendFileSync('$B/rb_trace.jsonl', JSON.stringify({
    ts: new Date().toISOString(), event: 'check', source: 'case-163', gate: 'quality-metrics',
    passed: refCount > 0 && mappedCount >= refCount,
    expected: true,
    detail: JSON.stringify({ refCount, emptyTrailCount, totalTrails, validTrails, mappedCount }),
  }) + '\n');
" 2>/dev/null || echo "  (ledger not available)"

# Metric 2: Countable rate
node -e "
  import('$PWD/DPT_FRAMEWORK/engine/helpers/ref-count.mjs').then(async m => {
    const result = m.countReferences('$B', { source: 'ledger' });
    const total = result.count + result.uncountable.length;
    const countableRate = total > 0 ? (result.count / total * 100).toFixed(1) : 'N/A';
    console.log('countable_rate:', countableRate + '%', '(' + result.count + '/' + total + ' countable)');
    for (const u of result.uncountable) console.log('  uncountable:', u.path, '—', u.reason);
  });
"

# Metric 3: URL precision spot-check
echo "=== URL Precision Spot-Check ==="
for ref in "$B"/reference/*.md; do
  [ -f "$ref" ] || continue
  ref_name=$(basename "$ref")
  url=$(grep "source_url:" "$ref" 2>/dev/null | head -1 | sed 's/.*source_url: *//' | tr -d '"')
  if [ -n "$url" ] && [ "$url" != " " ]; then
    is_homepage=$(node -e "
      import('$PWD/DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs').then(m => {
        console.log(m.isHomepageUrl('$url') ? 'HOMEPAGE' : 'ARTICLE');
      });
    " 2>/dev/null || echo "UNKNOWN")
    echo "  $ref_name: $url → $is_homepage"
  fi
done

# Metric 4: Gap rate
echo "=== Gap Rate ==="
TOTAL_REF=$(ls "$B"/reference/*.md 2>/dev/null | grep -v "_INDEX\|README" | wc -l | tr -d ' ')
ORPHAN_REF=$(node -e "
  import('$PWD/DPT_FRAMEWORK/engine/helpers/file-observability.mjs').then(async m => {
    const { readOutputDeclarations } = await import('$PWD/DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs');
    const ledger = readOutputDeclarations('$B');
    const result = m.auditFileObservability('$B', {
      topicSlugs: ['ai-regulation', 'ai-safety-research', 'economic-impact'],
      ledgerDeclarations: ledger.map(l => ({ ...l, declared_at: l.declared_at || '', work_id: l.work_id || '', output_files: l.output_files || [] })),
      targetPhase: 'wave0',
    });
    console.log(result.findings.filter(f => f.classification === 'orphan_authority_blocking').length);
  });
" 2>/dev/null || echo "0")
echo "  total_ref_files: $TOTAL_REF"
echo "  orphan_ref_files: $ORPHAN_REF"
echo "  empty_trail_gaps: (see quality-metrics trace event)"
```

→ 预期：输出质量指标摘要。

---

## Step 9: 从 Trace 裁决

```bash
B= # populated from Step 1

cat > "$B/_final_verdict.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const B = process.argv[2];
const tp = join(B, 'rb_trace.jsonl');
const raw = readFileSync(tp, 'utf-8').trim();
if (!raw) { console.log('NO TRACE: verdict impossible'); process.exit(1); }
const events = raw.split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
const checks = events.filter(e => e.event === 'check');
const passed = checks.filter(c => c.passed === (c.expected !== false));
const failed = checks.filter(c => c.passed !== (c.expected !== false));

console.log('══════ Verdict ══════');
for (const c of checks) console.log(`  ${c.passed === (c.expected !== false) ? 'PASS' : 'FAIL'}  ${c.gate}: ${c.detail}`);
console.log('══════════════════════');
console.log(`PASS: ${passed.length}  FAIL: ${failed.length}`);

// Check for NOT RUN
const notRun = checks.some(c => c.detail && c.detail.includes('NOT RUN'));
if (notRun) {
  console.log('\nNOT RUN — Agent actor surface was not available. Bundle preserved for manual execution.');
  console.log('This does NOT satisfy archive/release quality proof.');
  process.exit(0);
}

if (failed.length > 0) { console.log('\nFAIL'); process.exit(1); }
console.log('\nPASS — Real Agent cache trail pipeline verified with quality metrics.');
JS
node "$B/_final_verdict.mjs" "$B"
```

→ 预期：PASS（Agent 正确执行时）或 NOT RUN（无可用的 Agent 时）。

---

## Step 10: 结果解读

> **若 PASS**: 验证了 rerun `action: add` 全链路——Agent 搜索 → _cache/ 三文件写入 → cache_trails 声明 → Engine validateDelegatedCompletion → ledger append → gate cache_coverage pass → file observability 无 cache gap → check-reentry 通过。质量指标确认 cache trail 覆盖率、URL 精度、countable rate 满足要求。
>
> **若 NOT RUN**: 当前环境无真实 Agent actor surface。bundle 保留供后续手动执行。NOT RUN 不满足 archive/release 质量证明——需环境具备 LLM API + WebSearch 能力后重新执行。

---

## Step HH: Post-Execution Health

```bash
node experiments_env/shared/verify-bundle-health.mjs --bundle $B --profile heavy
```

> 健康检查不改变 verdict。

---

## Step 11: PASS-only 清理（NOT RUN 时保留）

```bash
if node "$B/_final_verdict.mjs" "$B" && [ "$?" -eq 0 ]; then
  # Check if it was a real PASS (not NOT RUN)
  if grep -q "NOT RUN" "$B/rb_trace.jsonl" 2>/dev/null; then
    echo "NOT RUN — bundle preserved for inspection: $B"
  else
    rm -rf "$B"
    echo "✓ Cleaned up after PASS."
  fi
else
  echo "FAIL preserved for inspection: $B"
fi
```
