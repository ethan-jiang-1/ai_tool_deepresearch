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
  本实验 fixture 写入未声明的 reference 文件。文件由脚本生成，不涉及 Agent 搜索。实验证明 Engine 的 file observability 能正确区分 declared (通过 ledger) 和 orphan (只在文件系统) 并给出正确的 severity。
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` disposable experiment bundle 中执行。

# case-310-light-orphan-reference

验证 orphan reference 被检测为 blocker：`reference/topic-a-orphan.md` 在文件系统但不在 `rb_output_declarations.jsonl` 中 → `orphan_authority_blocking`。

## Expected Runtime Path

1. 创建 disposable bundle，含已声明 reference + 未声明 orphan reference `[MAIN/SHELL]`
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
{"queue_health":"ready","stop_authorization_state":"unauthorized_continue_required","slot_1_current":null,"slot_2_next":null,"slot_3_pending":null,"slot_4_pending":null,"slot_5_tail":null,"refill_pool":[]}
JSON

echo "research_style: quick_factual" > "$B/rb_profile.yaml"
touch "$B/rb_trace.jsonl"
mkdir -p "$B/_logs" && touch "$B/_logs/run.log"
mkdir -p "$B/seed_topics" "$B/reference"
echo "# Topic A" > "$B/seed_topics/topic-a.md"

# 已声明的 reference（在 ledger 中）
cat > "$B/reference/topic-a-declared.md" << 'MD'
# Declared Ref
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
MD

# 未声明的 orphan reference（不在 ledger 中）
cat > "$B/reference/topic-a-orphan.md" << 'MD'
# Orphan Ref — no ledger declaration
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

# Ledger 只声明了 declared ref
cat > "$B/rb_output_declarations.jsonl" << 'JSONL'
{"declared_at":"2026-06-01T00:00:00.000Z","work_id":"w1","producer_rule":"topic_deepening","slot_result_ref":"_subagents/wave_01/slot_01/result.json","runtime_receipt_ref":"_subagents/wave_01/slot_01/runtime-receipt.jsonl","output_files":[{"path":"reference/topic-a-declared.md","role":"reference","source_url":"https://example.com/research/declared"}],"cache_trails":[],"creation_reason":"Test"}
JSONL

mkdir -p "$B/artifacts/wave1/topic-a"
echo "# Evidence A" > "$B/artifacts/wave1/topic-a/evidence-summary.md"
echo "# Questions A" > "$B/artifacts/wave1/topic-a/question-list.md"

echo "B=$B"
```

→ 预期：`reference/topic-a-declared.md` 在 ledger，`reference/topic-a-orphan.md` 不在。

---

## Step 2: 验证 orphan 检测

```bash
B= # populated from Step 1

# 直接调用 auditFileObservability
cat > "$B/_run_fo.mjs" << 'JS'
import { auditFileObservability } from '../DPT_FRAMEWORK/engine/helpers/file-observability.mjs';
import { readOutputDeclarations } from '../DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const __dirname = process.argv[2];
const ledger = readOutputDeclarations(__dirname);
const decls = ledger.map(l => ({ ...l, declared_at: l.declared_at || '', work_id: l.work_id || '', output_files: l.output_files || [] }));

const result = auditFileObservability(__dirname, {
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
  expected: 'blocker',
  detail: `Orphan severity: ${orphan?.severity}`
});

const tracePath = join(__dirname, '_logs', '_trace.jsonl');
for (const c of checks) writeFileSync(tracePath, JSON.stringify(c) + '\n', { flag: 'a' });
console.log(JSON.stringify(checks.map(c => ({ gate: c.gate, passed: c.passed }))));

// Also verify via check-reentry (integration)
const { spawnSync } = await import('node:child_process');
const reentry = spawnSync('node', [
  'DPT_FRAMEWORK/cli/check-reentry.mjs',
  '--bundle', __dirname,
  '--at', 'wave1_complete',
], { encoding: 'utf-8', cwd: join(__dirname, '..', '..') });
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
const tracePath = join(__dirname, '_logs', '_trace.jsonl');
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
console.log('\nPASS — orphan reference detection correctly distinguishes declared from undeclared files.');
JS
node "$B/_final_verdict.mjs" "$B"
```

→ 预期：PASS。

---

## Cleanup

```bash
B= # populated from Step 1
rm -rf "$B" && echo "Cleaned up $B"
```
