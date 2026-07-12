---
schema: command-experiment/v1
experiment: file-observability
case: case-310-light-orphan-reference
weight: light
case_goal: "验证 orphan reference 检测: 文件在 reference/ 下但未在 ledger 声明 → auditFileObservability 分类为 orphan_authority_blocking，check-reentry 报告 blocker。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-310_orphan
trace: dpt_disp_case-310_orphan/rb_trace.jsonl
verdict: trace-jsonl
production_distance: >
  本实验 fixture 写入 reference 内容，但 declared reference 必须经过真实 queue enqueue、operate-work-unit claim、fixture result、operate-work-unit submit 生成 submitted work-unit ledger。文件由脚本生成，不涉及 Agent 搜索。实验证明 Engine 的 file observability 能正确区分 submitted work-unit declared reference 和 orphan filesystem-only reference 并给出正确的 severity。
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` disposable experiment bundle 中执行。

# case-310-light-orphan-reference

验证 orphan reference 被检测为 blocker：`reference/topic-a-orphan.md` 在文件系统但不在 `rb_output_declarations.jsonl` 中 → `orphan_authority_blocking`。

## Expected Runtime Path

1. 创建 disposable bundle，通过 work-unit submit 生成 declared reference，再写未声明 orphan reference `[MAIN/SHELL]`
2. 跑 `auditFileObservability` + `check-reentry --at wave1_complete` `[MAIN/SHELL]`
3. 验证 orphan 分类为 `orphan_authority_blocking`，severity=blocker `[MAIN/SHELL]`
4. 从 trace 裁决 `[MAIN/SHELL]`
5. 清理 `[MAIN/SHELL]`

---

## Step 1: 创建带 orphan 的 bundle

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs orphan --case case-310 --force)

cat > "$B/rb_status.json" << 'JSON'
{"bundle":"orphan","current_mode":"execution","state":"in_progress","current_gate":"wave1_complete","next_gate":"wave2_complete"}
JSON

cat > "$B/rb_plan.md" << 'MD'
---
topic_registry:
  - id: T01
    slug: topic-a
    title: Topic A
---
# Plan
MD

cat > "$B/rb_queue.json" << 'JSON'
{
  "schema_version": "queue.v2",
  "bundle_name": null,
  "queue_health": "ready",
  "stop_authorization_state": "unauthorized_continue_required",
  "active_window": [],
  "refill_pool": [],
  "delegated_in_flight": {},
  "terminal_history": []
}
JSON

echo "research_style: quick_factual" > "$B/rb_profile.yaml"
touch "$B/rb_trace.jsonl"
mkdir -p "$B/_logs" && touch "$B/_logs/run.log"
mkdir -p "$B/seed_topics" "$B/reference"
echo "# Topic A" > "$B/seed_topics/topic-a.md"

# 通过真实 work-unit claim/submit 生成 declared reference（ledger 由 Engine 写入）
mkdir -p "$B/_tmp"
cat > "$B/_tmp/declared-task.json" << 'JSON'
{
  "queue_item_id": "wave1-deepen-topic-a",
  "title": "Wave1 topic-a declared reference fixture",
  "targets": {
    "controller": "main-agent",
    "delegates": {
      "to": "sub-agent",
      "role_key": "dpt-evidence-extractor",
      "timeout_ms": 600000
    }
  },
  "kind": "wave1_topic_deepening",
  "action": "Fixture-backed controlled work-unit task for file-observability declared reference.",
  "producer_rule": "topic_deepening",
  "lineage": { "topic_slug": "topic-a", "phase": "wave1" },
  "priority_class": "P3_current_gate_gap",
  "required_receipts": ["file:reference/topic-a-declared.md"],
  "done_condition": "Declared reference submitted through operate-work-unit",
  "verification": { "engine": ["work_unit_submit"], "agent": [] },
  "writes_to": ["reference/topic-a-declared.md"],
  "status_sync": [],
  "completion_receipt": "file:reference/topic-a-declared.md",
  "failure_route": "queue_repair",
  "status": "queued",
  "restore_priority": "normal",
  "created_at": "2026-06-01T00:00:00.000Z",
  "updated_at": "2026-06-01T00:00:00.000Z",
  "payload": { "topic_slug": "topic-a", "wave": 1 }
}
JSON

node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue "$B" --task "$B/_tmp/declared-task.json" >/dev/null
CLAIM=$(node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim "$B" --phase wave1 --count 1 --actor-outcome available --actor-source native_probe --actor-role-key dpt-evidence-extractor --actor-reason probe_succeeded --execution-actor delegated_subagent)
WORK_ID=$(node -e 'const j=JSON.parse(process.argv[1]); console.log(j.claimed_work_ids[0]);' "$CLAIM")

cat > "$B/_tmp/write-submit-result.mjs" << 'JS'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const bundle = process.argv[2];
const workId = process.argv[3];
const index = JSON.parse(readFileSync(join(bundle, '_work_units/_index.json'), 'utf-8'));
const record = index.work_units[workId];
if (!record) throw new Error(`missing work unit ${workId}`);

const outputPath = 'reference/topic-a-declared.md';
mkdirSync(join(bundle, dirname(outputPath)), { recursive: true });
writeFileSync(join(bundle, outputPath), `# Declared Ref
- source_url: https://example.com/research/declared
- acceptance_status: accepted
- source_type: primary
- tier: Tier 2
- evidence_role: deepening_reference
- trust_level: analyst
- why_it_matters: Key source for topic A
- accessed_at: 2026-06-01
- related_topic: topic-a

## Key Facts
- Fact 1
- Fact 2
- Fact 3
- Fact 4
- Fact 5

## Core Content Capture
Content

## Relevance To This Research
Relevant

## Quotable Terms / Concepts
Term

## Risks And Limitations
Risk
`);

const cacheTrail = `_cache/wave1/primary/${record.queue_item_id}/declared`;
mkdirSync(join(bundle, cacheTrail), { recursive: true });
writeFileSync(join(bundle, cacheTrail, 'websearch.json'), '[]\n');
writeFileSync(join(bundle, cacheTrail, 'page.md'), '# Cached Page\n');
writeFileSync(join(bundle, cacheTrail, 'meta.json'), '{"url":"https://example.com/research/declared"}\n');

writeFileSync(join(bundle, record.paths.runtime_receipt_ref), `${JSON.stringify({
  event: 'work_done',
  work_id: record.work_id,
  queue_item_id: record.queue_item_id,
  kind: record.kind,
  receipt_nonce: record.receipt_nonce,
  ts: '2026-06-01T00:00:00.000Z'
})}\n`);

const resultPath = join(bundle, '_tmp', `${workId}.result.json`);
writeFileSync(resultPath, `${JSON.stringify({
  schema_version: 'work-unit.result.v1',
  work_id: record.work_id,
  queue_item_id: record.queue_item_id,
  kind: record.kind,
  receipt_nonce: record.receipt_nonce,
  summary: 'fixture-backed declared reference for file-observability',
  output_files: [{
    path: outputPath,
    role: 'reference',
    source_url: 'https://example.com/research/declared',
    source_slug: 'declared'
  }],
  cache_trails: [cacheTrail]
}, null, 2)}\n`);
console.log(resultPath);
JS
RESULT_PATH=$(node "$B/_tmp/write-submit-result.mjs" "$B" "$WORK_ID")
node DPT_FRAMEWORK/cli/operate-work-unit.mjs submit "$B" --work-id "$WORK_ID" --result "$RESULT_PATH" >/dev/null

# 未声明的 orphan reference（不在 submitted work-unit ledger 中）
cat > "$B/reference/topic-a-orphan.md" << 'MD'
# Orphan Ref — no submitted work-unit ledger declaration
## Key Facts
- Orphan fact 1
- Orphan fact 2
- Orphan fact 3
- Orphan fact 4
- Orphan fact 5
## Core Content Capture
Orphan content
## Relevance To This Research
None
## Quotable Terms / Concepts
None
## Risks And Limitations
None
MD

mkdir -p "$B/artifacts/wave1/topic-a"
echo "# Evidence A" > "$B/artifacts/wave1/topic-a/evidence-summary.md"
echo "# Questions A" > "$B/artifacts/wave1/topic-a/question-list.md"

echo "submitted_work_id=$WORK_ID"
echo "B=$B"
```

→ 预期：`reference/topic-a-declared.md` 由 `operate-work-unit submit` 写入 ledger，`reference/topic-a-orphan.md` 不在 ledger。

---

## Step 2: 验证 orphan 检测

```bash
B= # populated from Step 1

# 直接调用 auditFileObservability
cat > "$B/_run_fo.mjs" << 'JS'
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const bundle = process.argv[2];
const repoRoot = process.cwd();
const { auditFileObservability } = await import(pathToFileURL(join(repoRoot, 'DPT_FRAMEWORK/engine/helpers/file-observability.mjs')).href);
const { readOutputDeclarations } = await import(pathToFileURL(join(repoRoot, 'DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs')).href);
const ledger = readOutputDeclarations(bundle);
const decls = ledger.map(l => ({ ...l, declared_at: l.declared_at || '', work_id: l.work_id || '', output_files: l.output_files || [] }));

const result = auditFileObservability(bundle, {
  topicSlugs: ['topic-a'],
  ledgerDeclarations: decls,
  targetPhase: 'wave1',
});

const declared = result.findings.find(f => f.path === 'reference/topic-a-declared.md');
const orphan = result.findings.find(f => f.path === 'reference/topic-a-orphan.md');

console.log('Declared:', declared?.classification, declared?.severity);
console.log('Orphan:', orphan?.classification, orphan?.severity);

const checks = [];

checks.push({
  ts: new Date().toISOString(), event: 'check',
  gate: 'declared-authoritative',
  passed: declared?.classification === 'declared_authoritative',
  expected: true,
  detail: `Declared ref: ${declared?.classification}`
});

checks.push({
  ts: new Date().toISOString(), event: 'check',
  gate: 'orphan-blocking',
  passed: orphan?.classification === 'orphan_authority_blocking',
  expected: true,
  detail: `Orphan ref: ${orphan?.classification}`
});

checks.push({
  ts: new Date().toISOString(), event: 'check',
  gate: 'orphan-severity-blocker',
  passed: orphan?.severity === 'blocker',
  expected: true,
  detail: `Orphan severity: ${orphan?.severity}`
});

const tracePath = join(bundle, 'rb_trace.jsonl');
for (const c of checks) writeFileSync(tracePath, JSON.stringify(c) + '\n', { flag: 'a' });
console.log(JSON.stringify(checks.map(c => ({ gate: c.gate, passed: c.passed }))));

// Also verify via check-reentry (integration)
const { spawnSync } = await import('node:child_process');
const reentry = spawnSync('node', [
  'DPT_FRAMEWORK/cli/check-reentry.mjs',
  '--bundle', bundle,
  '--at', 'wave1_complete',
], { encoding: 'utf-8', cwd: process.cwd() });
const reentryResult = JSON.parse(reentry.stdout);

const hasOrphanBlocker = (reentryResult.blockers || []).some(b =>
  b.check === 'ledger_coverage' && b.message.includes('orphan')
);
checks.push({
  ts: new Date().toISOString(), event: 'check',
  gate: 'reentry-ledger-blocker',
  passed: hasOrphanBlocker, expected: true,
  detail: `Reentry ledger coverage blocker: ${hasOrphanBlocker}`
});

for (const c of checks.slice(-1)) writeFileSync(tracePath, JSON.stringify(c) + '\n', { flag: 'a' });
JS
node "$B/_run_fo.mjs" "$B"
```

→ 预期：declared → `declared_authoritative`；orphan → `orphan_authority_blocking` + severity=blocker。

---

## Step 3: 从 trace 裁决

```bash
B= # populated from Step 1

cat > "$B/_final_verdict.mjs" << 'JS'
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const __dirname = process.argv[2];
const tracePath = join(__dirname, 'rb_trace.jsonl');
const raw = readFileSync(tracePath, 'utf-8').trim();
if (!raw) { console.log('FAIL: No trace events'); process.exit(1); }
const lines = raw.split('\n').filter(l => l.trim());
const events = lines.map(l => JSON.parse(l));
const checks = events.filter(e => e.event === 'check');
const failed = checks.filter(c => !c.passed);
const passed = checks.filter(c => c.passed);

console.log('══════ Verdict ══════');
for (const c of checks) console.log(`  ${c.passed ? 'PASS' : 'FAIL'}  ${c.gate}: ${c.detail}`);
console.log('══════════════════════');
console.log(`PASS: ${passed.length}  FAIL: ${failed.length}`);

if (failed.length > 0) { console.log('\nFAIL'); process.exit(1); }
console.log('\nPASS — orphan reference detection correctly distinguishes submitted work-unit declared files from undeclared files.');
JS
node "$B/_final_verdict.mjs" "$B"
```

→ 预期：PASS。

---

## Cleanup

PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
B= # populated from Step 1
rm -rf "$B" && echo "Cleaned up $B"
```
