---
schema: command-experiment/v1
experiment: evidence-extraction
case: case-161-light-complete-cache-trails
weight: light
case_goal: "验证 cache_trails 的三条 Engine 路径：valid trail → ledger append；incomplete leaf → warning + 不写入 ledger；unsafe/non-leaf trail → hard-fail delegated complete。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-161_cachetrail
trace: dpt_disp_case-161_cachetrail/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

fixture-backed、无 Agent actor、无外部调用。所有场景使用真实 Engine CLI 路径（`operate-queue.mjs` enqueue/claim/complete）。verdict 来自 `rb_trace.jsonl` check events。

## Reality Distance Ledger

| 维度 | 声明 |
|------|------|
| **Agent actor** | 无（fixture-backed） |
| **外部调用** | 无（无 WebSearch/WebFetch） |
| **ledger 生成** | Engine delegated `complete()` → `appendOutputDeclarationLedger()` |
| **cache trail 验证** | Engine `validateDelegatedCompletion()` 内联验证 |
| **verdict 来源** | trace check events + ledger 内容 + queue complete 返回值 |
| **不证明** | Agent 搜索/判断/写作能力；真实 cache 写入质量；gate cache_coverage 规则 |

# case-161-light-complete-cache-trails

三条 Engine 路径：
- **Scenario A** — valid trail → delegated complete 成功 → ledger `cache_trails` 含路径
- **Scenario B** — incomplete leaf（缺 `page.md`）→ warning + trail 不写入 ledger，但 complete 仍成功
- **Scenario C** — unsafe trail（bundle escape / 非 `_cache/` / parent dir）→ hard-fail complete

---

## Step 1: 创建 Run Bundle

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs cachetrail --case case-161 --force)
echo "Bundle: $B"
```

---

## Step 2: 搭建 fixtures — 共享基础设施

创建 task、slot result、output files、三种 cache trail（valid / incomplete / unsafe）。

```bash
cat > "$B/setup.mjs" << 'JS'
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const B = process.argv[2];
const slotDir = '_subagents/wave_01/slot_00';
const nonce = randomUUID();
mkdirSync(path.join(B, slotDir), { recursive: true });

// Runtime receipt
writeFileSync(path.join(B, `${slotDir}/runtime-receipt.jsonl`), [
  JSON.stringify({ event: 'agent_runtime_started', slotKey: 'source_intake', roleAgentKey: 'dpt-source-intake', receiptNonce: nonce }),
  JSON.stringify({ event: 'agent_result_ready', slotKey: 'source_intake', roleAgentKey: 'dpt-source-intake', receiptNonce: nonce }),
].join('\n') + '\n');

// Slot status
writeFileSync(path.join(B, `${slotDir}/_status.json`), JSON.stringify({ status: 'running', updated: new Date().toISOString() }));

// Output files
mkdirSync(path.join(B, 'reference'), { recursive: true });
writeFileSync(path.join(B, 'reference/00-shared-ai-safety.md'), [
  '---',
  'source_url: https://fixture-source.test/ai-safety',
  'acceptance_status: accepted',
  'source_type: primary',
  'tier: Tier 2',
  'trust_level: analyst',
  'related_topic: all',
  '---',
  '',
  '## Key Facts',
  '- Fact 1: AI safety research covers alignment and robustness.',
  '- Fact 2: Major labs have dedicated safety teams.',
  '- Fact 3: Adversarial attacks remain a key concern.',
  '- Fact 4: Regulatory frameworks are emerging globally.',
  '- Fact 5: Open-source models present unique safety challenges.',
  '',
  '## Core Content Capture',
  'AI safety is a multidisciplinary field focused on ensuring that artificial intelligence systems behave in ways that are aligned with human values and do not cause unintended harm. Researchers study robustness, interpretability, and value alignment.',
  '',
  '## Relevance To This Research',
  'Foundational context for understanding AI governance landscape.',
  '',
  '## Quotable Terms / Concepts',
  '- AI alignment',
  '- Adversarial robustness',
  '',
  '## Risks And Limitations',
  'Field is rapidly evolving; conclusions may date quickly.',
].join('\n'));

// Gate prerequisites
writeFileSync(path.join(B, 'reference/_INDEX.md'), '| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n| 00-shared-ai-safety.md | primary | analyst | Tier 2 | all | wave0_foundation | accepted | 2026-06-15 |\n');
writeFileSync(path.join(B, 'reference/README.md'), '# Reference Evidence\n');
mkdirSync(path.join(B, 'artifacts/wave0/topic-a'), { recursive: true });
writeFileSync(path.join(B, 'artifacts/wave0/topic-a/source.yaml'), '- url: "https://fixture-source.test/ai-safety"\n  title: "AI Safety Overview"\n  retrieved_date: "2026-06-15"\n  topic_tag: "topic-a"\n');

// Cache trails:
//   (a) valid: _cache/wave0/primary/01_intake/s01_valid/ — 含 3 文件
//   (b) incomplete: _cache/wave0/primary/01_intake/s02_incomplete/ — 缺 page.md
//   (c) unsafe-escape: attempts ../outside/
//   (d) unsafe-non-cache: artifacts/wave0/not-cache/
//   (e) unsafe-parent: _cache/wave0/primary/ — parent dir, not leaf

for (const [leaf, files] of [
  ['s01_valid', { 'websearch.json': JSON.stringify([{ title: 'R1', url: 'https://fixture-source.test/ai-safety' }]), 'page.md': '# Page 1', 'meta.json': JSON.stringify({ url: 'https://fixture-source.test/ai-safety', title: 'S1', source_domain: 'example.com', source_name: 'S1', fetched_at: new Date().toISOString(), fetch_method: 'WebFetch', fetch_chain: 'direct', content_type: 'article', reliability_tier: 'Tier 2', reliability_basis: 'practitioner', whitelist_status: 'allowed' }) }],
  ['s02_incomplete', { 'websearch.json': JSON.stringify([{ title: 'R2', url: 'https://example.com/2' }]), 'meta.json': JSON.stringify({ url: 'https://example.com/2', title: 'S2', source_domain: 'example.com', source_name: 'S2', fetched_at: new Date().toISOString(), fetch_method: 'WebFetch', fetch_chain: 'direct', content_type: 'article', reliability_tier: 'Tier 2', reliability_basis: 'practitioner', whitelist_status: 'allowed' }) }],
]) {
  const d = path.join(B, '_cache/wave0/primary/01_intake', leaf);
  mkdirSync(d, { recursive: true });
  for (const [fname, content] of Object.entries(files)) {
    writeFileSync(path.join(d, fname), content);
  }
}

// Create parent dir (not a leaf) for unsafe-parent test
mkdirSync(path.join(B, '_cache/wave0/primary/01_intake/s03_child'), { recursive: true });
writeFileSync(path.join(B, '_cache/wave0/primary/01_intake/s03_child/websearch.json'), '[]');
writeFileSync(path.join(B, '_cache/wave0/primary/01_intake/s03_child/page.md'), '# Child');
writeFileSync(path.join(B, '_cache/wave0/primary/01_intake/s03_child/meta.json'), '{}');

// Create non-cache dir for unsafe-non-cache test
mkdirSync(path.join(B, 'artifacts/wave0/not-cache'), { recursive: true });
writeFileSync(path.join(B, 'artifacts/wave0/not-cache/websearch.json'), '[]');
writeFileSync(path.join(B, 'artifacts/wave0/not-cache/page.md'), '# Not Cache');
writeFileSync(path.join(B, 'artifacts/wave0/not-cache/meta.json'), '{}');

console.log('fixtures ready');
JS
node "$B/setup.mjs" $B
: > "$B/outcomes.jsonl"
```

→ 预期：`fixtures ready`。

---

## Step 3: Scenario A — valid cache trail → delegated complete 成功 → ledger append

使用 valid trail `s01_valid`，验证 complete 成功且 ledger 含 `cache_trails`。

```bash
cat > "$B/rb_status.json" << 'JSON'
{"current_gate":"wave0_complete","next_gate":"wave1_complete","current_mode":"execution","state":"in_progress"}
JSON

cat > "$B/rb_plan.md" << 'MD'
---
{
  "plan_basename": "cachetrail",
  "derived_topic_count": 1,
  "topic_registry": [{ "id": "t1", "slug": "topic-a", "title": "Topic A" }]
}
---
# Plan
MD

cat > "$B/task_a.json" << 'JSON'
{"work_id":"wave0-source-topic-a","title":"Source intake — valid trail","targets":{"controller":"main-agent","delegates":{"to":"sub-agent","role_key":"dpt-source-intake","timeout_ms":600000}},"action":"Search and collect references.","producer_rule":"source_intake_fan_in","lineage":{"topic_slug":"topic-a"},"priority_class":"P5_new_reference_intake","required_receipts":["none"],"done_condition":"Files exist.","verification":{"engine":[],"agent":[]},"writes_to":["reference/00-shared-ai-safety.md"],"status_sync":[],"completion_receipt":"none","failure_route":"queue repair work","payload":{}}
JSON

node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue $B --task "$B/task_a.json"
node DPT_FRAMEWORK/cli/operate-queue.mjs claim $B --actor main-agent

# Committed slot result with only the valid trail
cat > "$B/_subagents/wave_01/slot_00/result.json" << 'JSON'
{
  "slotKey": "source_intake", "roleAgentKey": "dpt-source-intake", "status": "done",
  "summary": "Completed source intake with cache trail",
  "evidenceCount": 1,
  "references": [
    { "title": "AI Safety Overview", "url": "https://fixture-source.test/ai-safety", "quote": "AI safety is critical.", "relevance": "foundational" }
  ],
  "confidence": 0.9, "notes": [],
  "output_files": [
    { "path": "reference/00-shared-ai-safety.md", "role": "reference", "source_url": "https://fixture-source.test/ai-safety" }
  ],
  "cache_trails": ["_cache/wave0/primary/01_intake/s01_valid/"]
}
JSON

cat > "$B/result_a.json" << 'JSON'
{"work_id":"wave0-source-topic-a","receipt":"none","summary":"Completed","writes":["reference/00-shared-ai-safety.md"],"slot_result_ref":"_subagents/wave_01/slot_00/result.json"}
JSON

set +e
node DPT_FRAMEWORK/cli/operate-queue.mjs complete $B --result "$B/result_a.json"
sts_a=$?
set -e
if [ "$sts_a" -eq 0 ]; then echo "SCENARIO A: EXPECTED PASS"; else echo "SCENARIO A: UNEXPECTED REJECT (exit=$sts_a)"; fi

# Verify ledger has cache_trails
cat > "$B/check-ledger-a.mjs" << 'JSL'
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
const B = process.argv[2];
const lp = path.join(B, 'rb_output_declarations.jsonl');
const ok = existsSync(lp);
if (!ok) { console.log('SCENARIO A LEDGER: FAIL (missing)'); process.exit(1); }
const lines = readFileSync(lp, 'utf-8').trim().split('\n').filter(Boolean);
const r = JSON.parse(lines[0]);
const trailOk = Array.isArray(r.cache_trails) && r.cache_trails.length === 1 && r.cache_trails[0] === '_cache/wave0/primary/01_intake/s01_valid/';
console.log(trailOk ? '\x1b[32mSCENARIO A LEDGER: PASS\x1b[0m' : `\x1b[31mSCENARIO A LEDGER: FAIL (trails=${JSON.stringify(r.cache_trails)})\x1b[0m`);
process.exit(trailOk ? 0 : 1);
JSL
set +e
node "$B/check-ledger-a.mjs" $B
sts_la=$?
set -e
node -e "const fs=require('fs');const[B,l,s,e]=process.argv.slice(1);fs.appendFileSync(B+'/outcomes.jsonl',JSON.stringify({label:l,status:Number(s),expected:Number(e)})+'\n');" "$B" scenario-a-complete "$sts_a" 0
node -e "const fs=require('fs');const[B,l,s,e]=process.argv.slice(1);fs.appendFileSync(B+'/outcomes.jsonl',JSON.stringify({label:l,status:Number(s),expected:Number(e)})+'\n');" "$B" scenario-a-ledger "$sts_la" 0
[ "$sts_a" -eq 0 ] && [ "$sts_la" -eq 0 ]
```

→ 预期：`SCENARIO A: EXPECTED PASS` + `SCENARIO A LEDGER: PASS`。

---

## Step 4: Scenario B — incomplete cache leaf → warning + trail 不写入 ledger

重建 queue 状态，使用 incomplete trail `s02_incomplete`（缺 `page.md`）。complete 应成功但该 trail 不写入 ledger。

```bash
# Reset queue state for scenario B
cat > "$B/rb_queue.json" << 'JSON'
{"queue_health":"ready","stop_authorization_state":"unauthorized_continue_required","slot_1_current":null,"slot_2_next":null,"slot_3_pending":null,"slot_4_pending":null,"slot_5_tail":null,"refill_pool":[]}
JSON

cat > "$B/task_b.json" << 'JSON'
{"work_id":"wave0-source-topic-b","title":"Source intake — incomplete trail","targets":{"controller":"main-agent","delegates":{"to":"sub-agent","role_key":"dpt-source-intake","timeout_ms":600000}},"action":"Search and collect references.","producer_rule":"source_intake_fan_in","lineage":{"topic_slug":"topic-a"},"priority_class":"P5_new_reference_intake","required_receipts":["none"],"done_condition":"Files exist.","verification":{"engine":[],"agent":[]},"writes_to":["reference/00-shared-ai-safety.md"],"status_sync":[],"completion_receipt":"none","failure_route":"queue repair work","payload":{}}
JSON

node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue $B --task "$B/task_b.json"
node DPT_FRAMEWORK/cli/operate-queue.mjs claim $B --actor main-agent

# Slot result with incomplete cache trail
cat > "$B/_subagents/wave_01/slot_00/result.json" << 'JSON'
{
  "slotKey": "source_intake", "roleAgentKey": "dpt-source-intake", "status": "done",
  "summary": "Completed source intake with incomplete cache trail",
  "evidenceCount": 1,
  "references": [
    { "title": "AI Safety Overview", "url": "https://fixture-source.test/ai-safety", "quote": "AI safety is critical.", "relevance": "foundational" }
  ],
  "confidence": 0.9, "notes": [],
  "output_files": [
    { "path": "reference/00-shared-ai-safety.md", "role": "reference", "source_url": "https://fixture-source.test/ai-safety" }
  ],
  "cache_trails": ["_cache/wave0/primary/01_intake/s02_incomplete/"]
}
JSON

cat > "$B/result_b.json" << 'JSON'
{"work_id":"wave0-source-topic-b","receipt":"none","summary":"Completed","writes":["reference/00-shared-ai-safety.md"],"slot_result_ref":"_subagents/wave_01/slot_00/result.json"}
JSON

set +e
node DPT_FRAMEWORK/cli/operate-queue.mjs complete $B --result "$B/result_b.json"
sts_b=$?
set -e
echo "SCENARIO B complete exit=$sts_b"

# Verify: complete should succeed (incomplete leaf = warning, not hard-fail in Phase 1)
# AND the incomplete trail should NOT be in the ledger
cat > "$B/check-ledger-b.mjs" << 'JSL'
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
const B = process.argv[2];
const lp = path.join(B, 'rb_output_declarations.jsonl');
if (!existsSync(lp)) { console.log('SCENARIO B LEDGER: FAIL (missing)'); process.exit(1); }
const lines = readFileSync(lp, 'utf-8').trim().split('\n').filter(Boolean);
// Find the record for work_id wave0-source-topic-b (should be last)
const rB = lines.map(JSON.parse).find(r => r.work_id === 'wave0-source-topic-b');
if (!rB) { console.log('SCENARIO B LEDGER: INFO (no record for topic-b — complete may have rejected; check Phase 1 behavior)'); process.exit(0); }
const trails = rB.cache_trails || [];
const incompleteInLedger = trails.some(t => t.includes('s02_incomplete'));
if (incompleteInLedger) {
  console.log('\x1b[31mSCENARIO B LEDGER: FAIL (incomplete trail incorrectly in ledger)\x1b[0m');
  process.exit(1);
}
console.log('\x1b[32mSCENARIO B LEDGER: PASS (incomplete trail filtered)\x1b[0m');
JSL
set +e
node "$B/check-ledger-b.mjs" $B
sts_lb=$?
set -e
node -e "const fs=require('fs');const[B,l,s,e]=process.argv.slice(1);fs.appendFileSync(B+'/outcomes.jsonl',JSON.stringify({label:l,status:Number(s),expected:Number(e)})+'\n');" "$B" scenario-b-complete "$sts_b" 0
node -e "const fs=require('fs');const[B,l,s,e]=process.argv.slice(1);fs.appendFileSync(B+'/outcomes.jsonl',JSON.stringify({label:l,status:Number(s),expected:Number(e)})+'\n');" "$B" scenario-b-ledger "$sts_lb" 0
```

→ 预期：`SCENARIO B complete exit=0` + `SCENARIO B LEDGER: PASS`（incomplete trail 不在 ledger）。

---

## Step 5: Scenario C — unsafe trail → hard-fail delegated complete

测试三种 unsafe 情况：bundle escape、非 `_cache/` 路径、parent cache directory。

```bash
for UNSAFE_KIND in escape non-cache parent; do
  echo "=== Scenario C: unsafe trail ($UNSAFE_KIND) ==="

  # Reset queue state
  cat > "$B/rb_queue.json" << 'QJSON'
{"queue_health":"ready","stop_authorization_state":"unauthorized_continue_required","slot_1_current":null,"slot_2_next":null,"slot_3_pending":null,"slot_4_pending":null,"slot_5_tail":null,"refill_pool":[]}
QJSON

  WORK_ID="wave0-source-unsafe-${UNSAFE_KIND}"
  cat > "$B/task_c.json" <<< "{\"work_id\":\"${WORK_ID}\",\"title\":\"Source intake — unsafe trail\",\"targets\":{\"controller\":\"main-agent\",\"delegates\":{\"to\":\"sub-agent\",\"role_key\":\"dpt-source-intake\",\"timeout_ms\":600000}},\"action\":\"Search and collect references.\",\"producer_rule\":\"source_intake_fan_in\",\"lineage\":{\"topic_slug\":\"topic-a\"},\"priority_class\":\"P5_new_reference_intake\",\"required_receipts\":[\"none\"],\"done_condition\":\"Files exist.\",\"verification\":{\"engine\":[],\"agent\":[]},\"writes_to\":[\"reference/00-shared-ai-safety.md\"],\"status_sync\":[],\"completion_receipt\":\"none\",\"failure_route\":\"queue repair work\",\"payload\":{}}"

  node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue $B --task "$B/task_c.json"
  node DPT_FRAMEWORK/cli/operate-queue.mjs claim $B --actor main-agent

  case "$UNSAFE_KIND" in
    escape)
      UNSAFE_PATH="../outside/evil/"
      ;;
    non-cache)
      UNSAFE_PATH="artifacts/wave0/not-cache/"
      ;;
    parent)
      UNSAFE_PATH="_cache/wave0/primary/01_intake/"
      ;;
  esac

  cat > "$B/_subagents/wave_01/slot_00/result.json" <<< "{\"slotKey\":\"source_intake\",\"roleAgentKey\":\"dpt-source-intake\",\"status\":\"done\",\"summary\":\"Completed\",\"evidenceCount\":1,\"references\":[{\"title\":\"Test\",\"url\":\"https://fixture-source.test/test\",\"quote\":\"test\",\"relevance\":\"test\"}],\"confidence\":0.9,\"notes\":[],\"output_files\":[{\"path\":\"reference/00-shared-ai-safety.md\",\"role\":\"reference\",\"source_url\":\"https://fixture-source.test/ai-safety\"}],\"cache_trails\":[\"${UNSAFE_PATH}\"]}"

  cat > "$B/result_c.json" <<< "{\"work_id\":\"${WORK_ID}\",\"receipt\":\"none\",\"summary\":\"Completed\",\"writes\":[\"reference/00-shared-ai-safety.md\"],\"slot_result_ref\":\"_subagents/wave_01/slot_00/result.json\"}"

  set +e
  node DPT_FRAMEWORK/cli/operate-queue.mjs complete $B --result "$B/result_c.json" 2>&1
  sts_c=$?
  set -e

  if [ "$sts_c" -ne 0 ]; then
    echo "SCENARIO C ($UNSAFE_KIND): EXPECTED REJECT (exit=$sts_c)"
    node -e "const fs=require('fs');const[B,l,s,e]=process.argv.slice(1);fs.appendFileSync(B+'/outcomes.jsonl',JSON.stringify({label:l,status:Number(s),expected:Number(e)})+'\n');" "$B" "scenario-c-${UNSAFE_KIND}" "$sts_c" 0
  else
    echo "SCENARIO C ($UNSAFE_KIND): UNEXPECTED PASS — unsafe trail should hard-fail"
    node -e "const fs=require('fs');const[B,l,s,e]=process.argv.slice(1);fs.appendFileSync(B+'/outcomes.jsonl',JSON.stringify({label:l,status:Number(s),expected:Number(e)})+'\n');" "$B" "scenario-c-${UNSAFE_KIND}" 1 0
  fi
done
```

→ 预期：三种 unsafe trail 均 `EXPECTED REJECT`。

---

## Step 6: 验证 ledger 不含 unsafe 场景的 record

```bash
cat > "$B/check-no-unsafe-ledger.mjs" << 'JSL'
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
const B = process.argv[2];
const lp = path.join(B, 'rb_output_declarations.jsonl');
if (!existsSync(lp)) { console.log('\x1b[32mNO-UNSAFE LEDGER: PASS (no ledger file — no unsafe records written)\x1b[0m'); process.exit(0); }
const lines = readFileSync(lp, 'utf-8').trim().split('\n').filter(Boolean);
const unsafe = lines.map(JSON.parse).filter(r => (r.work_id || '').includes('unsafe'));
if (unsafe.length > 0) {
  console.log(`\x1b[31mNO-UNSAFE LEDGER: FAIL (${unsafe.length} unsafe records in ledger: ${unsafe.map(r=>r.work_id).join(', ')})\x1b[0m`);
  process.exit(1);
}
console.log('\x1b[32mNO-UNSAFE LEDGER: PASS\x1b[0m');
JSL
set +e
node "$B/check-no-unsafe-ledger.mjs" $B
sts_nu=$?
set -e
node -e "const fs=require('fs');const[B,l,s,e]=process.argv.slice(1);fs.appendFileSync(B+'/outcomes.jsonl',JSON.stringify({label:l,status:Number(s),expected:Number(e)})+'\n');" "$B" no-unsafe-ledger "$sts_nu" 0
[ "$sts_nu" -eq 0 ]
```

---

## Step 7: 记录 Trace Check Events

```bash
cat > "$B/record.mjs" << 'JS'
import { appendFileSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
const B = process.argv[2];
const tp = path.join(B, 'rb_trace.jsonl');
function check(passed, detail, extra = {}) {
  appendFileSync(tp, JSON.stringify({
    ts: new Date().toISOString(), event: 'check', source: 'case-161',
    gate: 'cache-trail-validation', passed, expected: true, detail, ...extra,
  }) + '\n');
}
const op = path.join(B, 'outcomes.jsonl');
if (!existsSync(op)) { check(false, 'outcomes.jsonl missing'); process.exit(1); }
const outcomes = readFileSync(op, 'utf-8').trim().split('\n').filter(Boolean).map(JSON.parse);
for (const o of outcomes) {
  const ok = o.status === o.expected;
  check(ok, `${o.label}: ${ok ? 'PASS' : 'FAIL'} (status=${o.status}, expected=${o.expected})`);
}
// Additional trace checks
const events = readFileSync(tp, 'utf-8').trim().split('\n').map(JSON.parse);
check(existsSync(path.join(B, 'rb_output_declarations.jsonl')), 'ledger file exists');
check(events.some(e => e.event === 'queue_completed' && e.work_id === 'wave0-source-topic-a'), 'scenario A queue complete in trace');
check(events.some(e => e.event === 'ledger_appended'), 'ledger appended event in trace');
JS
node "$B/record.mjs" $B
```

---

## Step 8: 从 Trace 裁决

```bash
cat > "$B/verdict.mjs" << 'JS'
import { appendFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
const B = process.argv[2];
const tp = path.join(B, 'rb_trace.jsonl');
const events = readFileSync(tp, 'utf-8').trim().split('\n').map(JSON.parse);
const checks = events.filter(e => e.event === 'check');
const passed = checks.filter(c => c.passed === (c.expected !== false)).length;
const failed = checks.filter(c => c.passed !== (c.expected !== false)).length;
console.log(`checks: ${checks.length} passed: ${passed} failed: ${failed}`);
const ok = checks.length >= 3 && failed === 0;
console.log(ok ? '\x1b[32mCASE-161 PASS\x1b[0m' : '\x1b[31mCASE-161 FAIL\x1b[0m');
if (!ok) process.exit(1);
JS
node "$B/verdict.mjs" $B
```

→ 预期：`CASE-161 PASS`。

---

## Step 9: 结果解读

> 三条路径验证 cache_trails Engine 处理：
> - **Scenario A**: valid trail（含 3 文件）→ complete 成功 → ledger `cache_trails` 含路径 ✓
> - **Scenario B**: incomplete leaf（缺 page.md）→ complete 仍成功（Phase 1 warning）→ trail 不写入 ledger ✓
> - **Scenario C**: unsafe trail（escape / 非 _cache/ / parent dir）→ complete hard-fail → 不写 ledger ✓

---

## Step HH: Post-Execution Health

```bash
node experiments_env/shared/verify-bundle-health.mjs --bundle $B --profile light
```

> 健康检查不改变 verdict。health status 由 runner report 记录。

---

## Step 10: PASS-only 清理

```bash
if node "$B/verdict.mjs" "$B"; then
  rm -rf "$B"
  echo "✓ Cleaned up after PASS."
else
  echo "FAIL preserved for inspection: $B"
  exit 1
fi
```
