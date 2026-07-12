---
schema: command-experiment/v1
experiment: reentry-debuggability
case: case-313-light-canonical-recovery-incident
weight: light
case_goal: "验证 registry-external durable topic、悬空 metadata 与平行 namespace 被收敛成一个 blocking canonical recovery root，并在 terminal position 报 missing_contract。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-313_canonical_recovery
trace: dpt_disp_case-313_canonical_recovery/rb_trace.jsonl
verdict: trace-jsonl
production_distance: >
  使用 new-disposable-bundle 创建真实 disposable bundle，运行 production check-reentry/file-observability 路径。
  只证明只读 incident detection、grouping、exit verdict 与 missing-contract feedback；不证明 post-final reentry、canonical materialization 或 mutation 已实现。
---

## Execution Contract

由 coding agent 逐 step 执行。禁止 mock CLI result、手写被测 verdict、手改 trace/status 来伪造 sanctioned recovery。

# case-313-light-canonical-recovery-incident

## Step 1: 创建 incident bundle

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs canonical_recovery --case case-313 --force)
node --input-type=module - "$B" <<'JS'
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
const bundle = process.argv[2];
const files = {
  'rb_status.json': JSON.stringify({ bundle: 'canonical_recovery', current_mode: 'execution', state: 'in_progress', current_gate: 'readiness_passed', next_gate: 'none', current_node: 'phases/phase-final.md' }, null, 2),
  'rb_plan.md': '---\ntopic_registry:\n  - id: T01\n    slug: topic-a\n    title: Topic A\n---\n# Plan\n',
  'rb_queue.json': JSON.stringify({ schema_version: 'queue.v2', bundle_name: null, queue_health: 'ready', stop_authorization_state: 'unauthorized_continue_required', active_window: [], refill_pool: [], delegated_in_flight: {}, terminal_history: [] }, null, 2),
  'rb_profile.yaml': 'research_style: quick_factual\n',
  'rb_trace.jsonl': '',
  '_logs/run.log': '',
  'seed_topics/topic-a.md': '# Topic A\n',
  'artifacts/wave0/topic-a/source.yaml': '[]\n',
  'artifacts/wave1/topic-a/evidence-summary.md': '# Evidence\n',
  'artifacts/wave1/topic-a/question-list.md': '# Questions\n',
  'artifacts/wave1/topic-x/evidence-summary.md': '# Registry-external evidence\n',
  'reference/topic-x-source.md': '- related_topic: topic-x\n\n## Key Facts\n- Durable external topic.\n',
  'artifacts/addendum/topic-x/result.md': '- topic_slug: topic-x\n\n## Result\nParallel output.\n',
};
for (const [relative, content] of Object.entries(files)) {
  const absolute = join(bundle, relative);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content);
}
JS
echo "B=$B"
```

## Step 2: 运行 production recovery check 并写 trace verdict

```bash
B= # populated from Step 1
BEFORE=$(node -e 'const fs=require("fs"),c=require("crypto"),p=require("path");function w(d,o={}){for(const e of fs.readdirSync(d,{withFileTypes:true})){const a=p.join(d,e.name),r=p.relative(process.argv[1],a);if(e.isDirectory())w(a,o);else o[r]=c.createHash("sha256").update(fs.readFileSync(a)).digest("hex")}return o}process.stdout.write(JSON.stringify(w(process.argv[1])))' "$B")
set +e
RESULT=$(node DPT_FRAMEWORK/cli/check-reentry.mjs --bundle "$B" --at readiness_passed)
EXIT=$?
set -e
AFTER=$(node -e 'const fs=require("fs"),c=require("crypto"),p=require("path");function w(d,o={}){for(const e of fs.readdirSync(d,{withFileTypes:true})){const a=p.join(d,e.name),r=p.relative(process.argv[1],a);if(e.isDirectory())w(a,o);else o[r]=c.createHash("sha256").update(fs.readFileSync(a)).digest("hex")}return o}process.stdout.write(JSON.stringify(w(process.argv[1])))' "$B")
node --input-type=module - "$B" "$RESULT" "$EXIT" "$BEFORE" "$AFTER" <<'JS'
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
const [bundle, raw, rawExit, before, after] = process.argv.slice(2);
const result = JSON.parse(raw);
const blocking = result.recovery.canonical_topic_findings.filter((finding) => finding.classification === 'blocking');
const roots = result.recovery.root_findings.filter((root) => root.source_kind === 'canonical_topic');
const checks = [
  ['exit-1', Number(rawExit) === 1],
  ['one-blocking-canonical', blocking.length === 1 && blocking[0].topic_identity === 'topic-x'],
  ['one-root', roots.length === 1],
  ['missing-contract', roots[0]?.sanctioned_path_status === 'missing_contract' && roots[0]?.recommended_action === null],
  ['parallel-non-authority', result.findings.every((finding) => finding.authority_status !== 'declared_authoritative' || !finding.path.includes('addendum'))],
  ['zero-mutation', before === after],
];
for (const [gate, passed] of checks) writeFileSync(join(bundle, 'rb_trace.jsonl'), `${JSON.stringify({ ts: new Date().toISOString(), event: 'check', gate, passed })}\n`, { flag: 'a' });
if (checks.some(([, passed]) => !passed)) process.exit(1);
JS
```

## Step 3: 从 trace 裁决

```bash
B= # populated from Step 1
node --input-type=module - "$B" <<'JS'
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const events = readFileSync(join(process.argv[2], 'rb_trace.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const checks = events.filter((event) => event.event === 'check');
for (const check of checks) console.log(`${check.passed ? 'PASS' : 'FAIL'} ${check.gate}`);
if (checks.length !== 6 || checks.some((check) => !check.passed)) process.exit(1);
console.log('PASS — canonical recovery incident is detected read-only; post-final reentry remains unimplemented.');
JS
```

## Cleanup

PASS 后执行：

```bash
rm -rf "$B"
```
