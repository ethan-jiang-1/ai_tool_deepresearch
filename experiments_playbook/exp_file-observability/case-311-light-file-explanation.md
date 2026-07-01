---
schema: command-experiment/v1
experiment: file-observability
case: case-311-light-file-explanation
weight: light
case_goal: "验证 file explanation: Agent 通过 log-event.mjs --explain-file 记录解释后，文件分类为 explained_non_authoritative 而非 orphan，但仍不参与 gate pass。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-311_explain
trace: dpt_disp_case-311_explain/rb_trace.jsonl
verdict: trace-jsonl
production_distance: >
  本实验 fixture 写入未声明文件后通过 log-event.mjs 记录 Agent 解释。文件由脚本生成，log-event.mjs 是 Engine CLI。实验证明 file explanation diagnostic 正确写入 trace/log，auditFileObservability 优先使用解释分类，且 explained 文件不获得 gate authority。
---

## Execution Contract

由 coding agent 在真实 `dpt_disp_*` disposable experiment bundle 中执行。

# case-311-light-file-explanation

验证 `log-event.mjs --explain-file` 写入 trace 后，`auditFileObservability` 将文件分类为 `explained_non_authoritative`（非 orphan），且文件仍是 non-authoritative。

## Expected Runtime Path

1. 创建 disposable bundle，含未声明的 reference 文件 `[MAIN/SHELL]`
2. 先验证未解释时分类为 orphan `[MAIN/SHELL]`
3. 通过 `log-event.mjs --explain-file` 记录解释 `[MAIN/SHELL]`
4. 验证解释后分类变为 `explained_non_authoritative` `[MAIN/SHELL]`
5. 验证 trace 含 `file_explanation` 事件 `[MAIN/SHELL]`
6. 从 trace 裁决 `[MAIN/SHELL]`
7. 清理 `[MAIN/SHELL]`

---

## Step 1: 创建 bundle

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs explain --case case-311 --force)

cat > "$B/rb_status.json" << 'JSON'
{"bundle":"explain","current_mode":"execution","state":"in_progress","current_gate":"wave1_complete","next_gate":"wave2_complete"}
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

# 未声明的文件
mkdir -p "$B/reference"
echo "# Extra file — Agent knows about it but it was not produced through Queue/Relay" > "$B/reference/topic-a-extra.md"

echo "B=$B"
```

---

## Step 2: 验证未解释 → orphan

```bash
B= # populated from Step 1

cat > "$B/_check_before.mjs" << 'JS'
import { auditFileObservability } from '../DPT_FRAMEWORK/engine/helpers/file-observability.mjs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
const __dirname = process.argv[2];

const result = auditFileObservability(__dirname, {
  topicSlugs: ['topic-a'],
  ledgerDeclarations: [],
  targetPhase: 'wave1',
});

const f = result.findings.find(x => x.path === 'reference/topic-a-extra.md');
const checks = [];
checks.push({
  ts: new Date().toISOString(), event: 'check',
  gate: 'before-explain-orphan',
  passed: f?.classification === 'orphan_authority_blocking',
  expected: true,
  detail: `Before explanation: ${f?.classification}`
});

const tracePath = join(__dirname, '_logs', '_trace.jsonl');
for (const c of checks) writeFileSync(tracePath, JSON.stringify(c) + '\n', { flag: 'a' });
console.log(JSON.stringify({ classification: f?.classification, severity: f?.severity }));
JS
node "$B/_check_before.mjs" "$B"
```

→ 预期：分类为 `orphan_authority_blocking`。

---

## Step 3: 记录解释并验证分类变化

```bash
B= # populated from Step 1

# Agent 通过 log-event.mjs 记录解释
node DPT_FRAMEWORK/cli/log-event.mjs \
  --bundle "$B" \
  --explain-file "reference/topic-a-extra.md" \
  --status "explained_non_authoritative" \
  --reason "Agent created this file during manual inspection — it was not produced through delegated Queue/Relay completion" \
  --phase "wave1" \
  --topic-slug "topic-a"

echo "Explanation recorded"

# 验证 trace 含 file_explanation
cat > "$B/_check_after.mjs" << 'JS'
import { auditFileObservability } from '../DPT_FRAMEWORK/engine/helpers/file-observability.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const __dirname = process.argv[2];

const checks = [];

// Check 1: trace contains file_explanation event
const tracePath = join(__dirname, 'rb_trace.jsonl');
const trace = readFileSync(tracePath, 'utf-8').trim().split('\n').filter(Boolean);
const explanations = trace.filter(l => {
  try { return JSON.parse(l).kind === 'file_explanation'; } catch { return false; }
});
checks.push({
  ts: new Date().toISOString(), event: 'check',
  gate: 'trace-has-explanation', passed: explanations.length >= 1, expected: true,
  detail: `file_explanation events in trace: ${explanations.length}`
});

// Check 2: latest explanation has correct fields
const last = JSON.parse(explanations[explanations.length - 1]);
checks.push({
  ts: new Date().toISOString(), event: 'check',
  gate: 'explanation-status', passed: last.authority_status === 'explained_non_authoritative',
  expected: true,
  detail: `authority_status: ${last.authority_status}`
});
checks.push({
  ts: new Date().toISOString(), event: 'check',
  gate: 'explanation-phase', passed: last.phase === 'wave1',
  expected: true,
  detail: `phase: ${last.phase}`
});

// Check 3: file now classified as explained_non_authoritative
const result = auditFileObservability(__dirname, {
  topicSlugs: ['topic-a'],
  ledgerDeclarations: [],
  targetPhase: 'wave1',
});
const f = result.findings.find(x => x.path === 'reference/topic-a-extra.md');
checks.push({
  ts: new Date().toISOString(), event: 'check',
  gate: 'after-explain-explained', passed: f?.classification === 'explained_non_authoritative',
  expected: true,
  detail: `After explanation: ${f?.classification}`
});
checks.push({
  ts: new Date().toISOString(), event: 'check',
  gate: 'explained-non-authoritative', passed: f?.authority_status === 'explained_non_authoritative',
  expected: true,
  detail: `authority_status stays non-authoritative: ${f?.authority_status}`
});

const expTracePath = join(__dirname, '_logs', '_trace.jsonl');
for (const c of checks) writeFileSync(expTracePath, JSON.stringify(c) + '\n', { flag: 'a' });
console.log(JSON.stringify(checks.map(c => ({ gate: c.gate, passed: c.passed }))));
JS
node "$B/_check_after.mjs" "$B"
```

→ 预期：trace 含 `file_explanation`，分类变为 `explained_non_authoritative`，authority 保持 non-authoritative。

---

## Step 4: 验证拒绝无效 status

```bash
B= # populated from Step 1

# declared_authoritative 不允许 Agent 写入（应静默拒绝）
node DPT_FRAMEWORK/cli/log-event.mjs \
  --bundle "$B" \
  --explain-file "reference/bad.md" \
  --status "declared_authoritative" \
  --reason "Should be rejected"

cat > "$B/_check_reject.mjs" << 'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const __dirname = process.argv[2];

const tracePath = join(__dirname, 'rb_trace.jsonl');
const trace = readFileSync(tracePath, 'utf-8').trim().split('\n').filter(Boolean);
const hasBadExplanation = trace.some(l => {
  try { const e = JSON.parse(l); return e.kind === 'file_explanation' && e.authority_status === 'declared_authoritative'; }
  catch { return false; }
});

const checks = [{
  ts: new Date().toISOString(), event: 'check',
  gate: 'reject-declared-authoritative', passed: !hasBadExplanation, expected: true,
  detail: `declared_authoritative rejected: ${!hasBadExplanation}`
}];

const expTracePath = join(__dirname, '_logs', '_trace.jsonl');
for (const c of checks) writeFileSync(expTracePath, JSON.stringify(c) + '\n', { flag: 'a' });
console.log(JSON.stringify({ rejected: !hasBadExplanation }));
JS
node "$B/_check_reject.mjs" "$B"
```

→ 预期：`declared_authoritative` 被静默拒绝，trace 中无此事件。

---

## Step 5: 从 trace 裁决

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
console.log('\nPASS — file explanation recorded correctly, file stays non-authoritative.');
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
