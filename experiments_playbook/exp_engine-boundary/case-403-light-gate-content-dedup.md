---
schema: command-experiment/v1
experiment: engine-boundary
case: case-403-light-gate-content-dedup
weight: light
case_goal: "验证 content_dedup gate 只从 Engine-generated declaration ledger 读取输入：URL dup/Jaccard clone/homepage/self-ref fail；clean pass；missing ledger/orphan fail closed。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-403_eb_dedup
trace: dpt_disp_case-403_eb_dedup/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

fixture-backed、无 Agent actor、无外部调用。每个非 missing-ledger 场景都走同一条生产 downstream 路径：

fixture SlotResult → `commitSlotResult()` → `operate-queue complete` → Engine append `rb_output_declarations.jsonl` → real wave0 gate。

## Reality Distance Ledger

| 维度 | 声明 |
|------|------|
| **Agent actor** | 无（fixture-backed） |
| **外部调用** | 无 |
| **ledger 生成** | Engine delegated `complete()` |
| **gate 输入面** | `rb_output_declarations.jsonl` only |
| **orphan 处理** | 未声明 reference 不能帮助 gate pass |
| **verdict 来源** | `rb_trace.jsonl` check events + gate JSON |

# case-403-light-gate-content-dedup

7 个场景覆盖 content_dedup 的输入面和检测维度。

---

## Step 1: 创建 Bundle

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs eb_dedup --case case-403 --force)
echo "Bundle: $B"
```

---

## Step 2: 运行场景 driver

```bash
cat > "$B/run-scenarios.mjs" << 'JS'
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const B = path.resolve(process.argv[2]);
const REPO = process.cwd();
const relay = await import(pathToFileURL(path.join(REPO, 'DPT_FRAMEWORK/engine/subagent-relay.mjs')));
let slotIndex = 0;

function p(...parts) {
  return path.join(B, ...parts);
}

function record(gate, passed, detail) {
  appendFileSync(p('rb_trace.jsonl'), JSON.stringify({
    ts: new Date().toISOString(),
    event: 'check',
    source: 'case-403',
    gate,
    passed,
    expected: true,
    detail,
  }) + '\n');
}

function runNode(args, opts = {}) {
  return execFileSync(process.execPath, args, { cwd: REPO, encoding: 'utf-8', stdio: opts.stdio || 'pipe' });
}

function resetBase() {
  rmSync(p('reference'), { recursive: true, force: true });
  rmSync(p('artifacts'), { recursive: true, force: true });
  rmSync(p('rb_queue.json'), { force: true });
  rmSync(p('rb_output_declarations.jsonl'), { force: true });
  mkdirSync(p('reference'), { recursive: true });
  mkdirSync(p('artifacts/wave0/topic-a'), { recursive: true });
  mkdirSync(p('artifacts/wave0/topic-b'), { recursive: true });

  writeFileSync(p('rb_status.json'), JSON.stringify({
    current_gate: 'wave0_complete',
    next_gate: 'wave1_complete',
    current_mode: 'execution',
    state: 'in_progress',
  }) + '\n');
  writeFileSync(p('rb_profile.yaml'), 'research_style_params:\n  wave0_shared_ref_total: 1\n  wave0_per_topic_source_floor: 1\n');
  writeFileSync(p('rb_plan.md'), `---
{
  "plan_basename": "eb_dedup",
  "derived_topic_count": 2,
  "topic_registry": [
    { "id": "t1", "slug": "topic-a", "title": "Topic A" },
    { "id": "t2", "slug": "topic-b", "title": "Topic B" }
  ]
}
---
# Plan
`);
  writeFileSync(p('reference/README.md'), '# Reference Evidence\n');
  writeFileSync(p('reference/_INDEX.md'), `| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 00-shared-a.md | secondary | practitioner | Tier 2 | all | wave0_foundation | accepted | 2026-06-15 |
| 00-shared-b.md | secondary | practitioner | Tier 2 | all | wave0_foundation | accepted | 2026-06-15 |
`);
  for (const topic of ['topic-a', 'topic-b']) {
    writeFileSync(p(`artifacts/wave0/${topic}/source.yaml`), `- url: "https://research-source.test/${topic}"
  title: "${topic} source"
  retrieved_date: "2026-06-15"
  topic_tag: "${topic}"
`);
  }
  if (!existsSync(p('rb_trace.jsonl'))) {
    writeFileSync(p('rb_trace.jsonl'), JSON.stringify({ ts: new Date().toISOString(), event: 'run_start', source: 'trace', label: 'case-403' }) + '\n');
  }
}

function writeReference(relPath, sourceUrl, keyFacts) {
  writeFileSync(p(relPath), `---
source_url: ${sourceUrl}
acceptance_status: accepted
source_type: secondary
tier: Tier 2
trust_level: practitioner
why_it_matters: Boundary fixture
accessed_at: 2026-06-15
related_topic: all
---
## Key Facts
${keyFacts}
## Core Content Capture
Fixture page capture.
## Relevance To This Research
Boundary proof.
## Quotable Terms / Concepts
- fixture
## Risks And Limitations
- Fixture-backed Engine proof.
`);
}

function writeCacheLeaf(id) {
  const leaf = `_cache/wave0/primary/case403/s${String(id).padStart(2, '0')}_source`;
  mkdirSync(p(leaf), { recursive: true });
  writeFileSync(p(leaf, 'websearch.json'), JSON.stringify([{ title: `S${id}`, url: `https://research-source.test/${id}` }]));
  writeFileSync(p(leaf, 'page.md'), `# Page ${id}\n`);
  writeFileSync(p(leaf, 'meta.json'), JSON.stringify({
    url: `https://research-source.test/${id}`,
    title: `S${id}`,
    source_domain: 'research-source.test',
    source_name: `S${id}`,
    fetched_at: new Date().toISOString(),
    fetch_method: 'fixture',
    fetch_chain: 'fixture',
    content_type: 'article',
    reliability_tier: 'Tier 2',
    reliability_basis: 'fixture',
    whitelist_status: 'allowed',
  }));
  return `${leaf}/`;
}

function commitFixtureSlot(name, refs) {
  const slot = relay.createSlot({
    key: `case403-${name}`,
    slotIndex: slotIndex++,
    roleAgentKey: 'dpt-source-intake',
    taskDescription: `case403 ${name}`,
  }, 1);
  mkdirSync(p(path.dirname(slot.resultPath)), { recursive: true });
  relay.writeSlotStatus(slot, 'running', B);
  writeFileSync(p(slot.receiptPath), [
    JSON.stringify({ event: 'agent_runtime_started', slotKey: slot.key, roleAgentKey: slot.roleAgentKey, receiptNonce: slot.receiptNonce }),
    JSON.stringify({ event: 'agent_result_ready', slotKey: slot.key, roleAgentKey: slot.roleAgentKey, receiptNonce: slot.receiptNonce }),
  ].join('\n') + '\n');

  const cacheTrails = refs.map((_, i) => writeCacheLeaf(slotIndex * 10 + i));
  const result = relay.commitSlotResult(slot, B, {
    slotKey: slot.key,
    roleAgentKey: slot.roleAgentKey,
    status: 'done',
    summary: `case403 ${name}`,
    evidenceCount: refs.length,
    references: refs.map((r) => ({ title: r.path, url: r.url, quote: '', relevance: 'fixture' })),
    confidence: 0.9,
    notes: [],
    output_files: refs.map((r) => ({ path: r.path, role: 'reference', source_url: r.url })),
    cache_trails: cacheTrails,
  }, { platform: 'fixture', runtimeMode: 'unknown', runtimeAgentId: `fixture-${name}` });
  if (!result.ok) throw new Error(`commitSlotResult failed for ${name}: ${result.result.notes?.join('; ')}`);
  return slot.resultPath;
}

function completeThroughQueue(name, refs) {
  const workId = `case403-${name}`;
  const slotResultRef = commitFixtureSlot(name, refs);
  const taskPath = p(`${workId}.task.json`);
  const resultPath = p(`${workId}.result.json`);
  writeFileSync(taskPath, JSON.stringify({
    work_id: workId,
    title: `case403 ${name}`,
    targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake', timeout_ms: 600000 } },
    action: 'Fixture-backed reference declaration. Return output_files[] and cache_trails[].',
    producer_rule: 'case403_fixture',
    lineage: {},
    priority_class: 'P5_new_reference_intake',
    required_receipts: ['none'],
    done_condition: 'Fixture references exist.',
    verification: { engine: [], agent: [] },
    writes_to: refs.map((r) => r.path),
    status_sync: [],
    completion_receipt: 'none',
    failure_route: 'queue repair',
    payload: {},
  }));
  runNode(['DPT_FRAMEWORK/cli/operate-queue.mjs', 'enqueue', B, '--task', taskPath]);
  runNode(['DPT_FRAMEWORK/cli/operate-queue.mjs', 'claim', B, '--actor', 'main-agent']);
  writeFileSync(resultPath, JSON.stringify({
    work_id: workId,
    receipt: 'none',
    summary: `case403 ${name}`,
    writes: refs.map((r) => r.path),
    slot_result_ref: slotResultRef,
  }));
  runNode(['DPT_FRAMEWORK/cli/operate-queue.mjs', 'complete', B, '--result', resultPath]);
  if (!existsSync(p('rb_output_declarations.jsonl'))) throw new Error(`ledger missing after ${name}`);
  const traceEvents = readFileSync(p('rb_trace.jsonl'), 'utf-8').trim().split('\n').filter(Boolean).map(JSON.parse);
  const ledgerOk = traceEvents.some((e) => e.event === 'ledger_appended' && e.work_id === workId);
  const completeOk = traceEvents.some((e) => e.event === 'queue_completed' && e.work_id === workId);
  record(`engine-path-${name}`, ledgerOk && completeOk, `${name}: commitSlotResult plus delegated complete produced Engine ledger and queue completion`);
}

function runGate() {
  try {
    const raw = runNode(['DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs', '--bundle', B, '--current-node', 'phases/phase-wave0.md']);
    return JSON.parse(raw);
  } catch (err) {
    return JSON.parse(err.stdout.toString());
  }
}

function inspectHas(gateResult, fragment) {
  return gateResult.inspect?.some((line) => line.includes(fragment));
}

function scenario(name, refs, expected) {
  resetBase();
  for (const ref of refs) writeReference(ref.path, ref.url, ref.keyFacts);
  completeThroughQueue(name, refs);
  const gateResult = runGate();
  let ok;
  if (expected.pass) {
    ok = gateResult.check.passed === true;
  } else {
    ok = gateResult.check.passed === false && inspectHas(gateResult, expected.inspect);
  }
  record(`content-dedup-${name}`, ok, `${name}: ${ok ? 'observed expected behavior' : JSON.stringify(gateResult.inspect)}`);
  if (!ok) throw new Error(`${name} failed expectation: ${JSON.stringify(gateResult.inspect)}`);
}

resetBase();
let missing = runGate();
let ok = missing.check.passed === false && inspectHas(missing, 'missing or empty');
record('content-dedup-missing-ledger', ok, 'missing ledger fails closed');
if (!ok) throw new Error(`missing-ledger expectation failed: ${JSON.stringify(missing.inspect)}`);

scenario('clean', [
  { path: 'reference/00-shared-a.md', url: 'https://auto-source.test/ev-2024', keyFacts: '中国新能源汽车销量突破 1000 万辆，比亚迪市场份额领先，宁德时代电池技术全球领先。' },
  { path: 'reference/00-shared-b.md', url: 'https://electronics-source.test/japan-2024', keyFacts: '日本电子产业出口额增长 15%，半导体设备需求旺盛，东京电子扩大产能。' },
], { pass: true });

scenario('url-duplicate', [
  { path: 'reference/00-shared-a.md', url: 'https://duplicate-source.test/article', keyFacts: 'Source A reports market growth and investment expansion.' },
  { path: 'reference/00-shared-b.md', url: 'https://duplicate-source.test/article/', keyFacts: 'Source B reports different facts from a duplicate URL fixture.' },
], { pass: false, inspect: 'URL duplicate' });

scenario('jaccard-clone', [
  { path: 'reference/00-shared-a.md', url: 'https://clone-a.test/article-1', keyFacts: '年轻人消费平替趋势明显，国潮品牌市场份额增长，新能源汽车销量突破千万。' },
  { path: 'reference/00-shared-b.md', url: 'https://clone-b.test/article-2', keyFacts: '年轻人消费平替趋势明显，国潮品牌市场份额增长，新能源汽车销量突破千万。' },
], { pass: false, inspect: 'Jaccard clone' });

scenario('homepage', [
  { path: 'reference/00-shared-a.md', url: 'https://www.chinanews.com.cn/', keyFacts: 'News data describes macro consumer behavior and policy signals.' },
], { pass: false, inspect: 'Homepage URL' });

scenario('self-ref', [
  { path: 'reference/00-shared-a.md', url: 'https://self-ref-source.test/article', keyFacts: 'This reference supplements the wave1 deepening evidence for topic consumer trends.' },
], { pass: false, inspect: 'Self-referential' });

resetBase();
writeReference('reference/00-shared-orphan.md', 'https://orphan-source.test/article', 'Orphan source has clean factual content but is not declared.');
const orphanGate = runGate();
ok = orphanGate.check.passed === false && inspectHas(orphanGate, 'missing or empty');
record('content-dedup-orphan-cannot-help', ok, 'orphan reference exists but missing ledger still fails closed');
if (!ok) throw new Error(`orphan expectation failed: ${JSON.stringify(orphanGate.inspect)}`);

console.log('case-403 scenarios completed');
JS

node "$B/run-scenarios.mjs" "$B"
```

→ 预期：`case-403 scenarios completed`。

---

## Step 3: 从 Trace 裁决

```bash
cat > "$B/verdict.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import path from 'node:path';
const B = process.argv[2];
const tp = path.join(B, 'rb_trace.jsonl');
const events = readFileSync(tp, 'utf-8').trim().split('\n').filter(Boolean).map(JSON.parse);
const checks = events.filter(e => e.event === 'check' && e.source === 'case-403');
const failed = checks.filter(c => c.passed !== true);
console.log(`checks: ${checks.length}, failed: ${failed.length}`);
for (const f of failed) console.log(`FAIL ${f.gate}: ${f.detail}`);
const ok = checks.length >= 7 && failed.length === 0;
console.log(ok ? '\x1b[32mCASE-403 PASS\x1b[0m' : '\x1b[31mCASE-403 FAIL\x1b[0m');
if (!ok) process.exit(1);
JS
node "$B/verdict.mjs" "$B"
```

→ 预期：`CASE-403 PASS`。

---

## Step 4: PASS-only 清理

```bash
if node "$B/verdict.mjs" "$B"; then
  rm -rf "$B"
  echo "✓ Cleaned up after PASS."
else
  echo "FAIL preserved for inspection: $B"
  exit 1
fi
```
