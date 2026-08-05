---
schema: command-experiment/v2
experiment: reentry-debuggability
case: case-315-light-canonical-topic-state-recovery
case_goal: "验证 canonical topic add 的 plan-first crash、queue no-write blocker、单一 exact recover action 与恢复后的 UID-bound state。恢复后的 style_projection handoff 可能合理更新 status/trace/profile——不再要求零 mutation。"
verdict_mode: last
required_checks: [accepted-workspace-enqueue-blocked, topic-recovery-committed, topic-state-clean, uid-bound-topic-restored, post-recovery-enqueue-succeeded]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: light
durable_evidence_roles: []
proof_subject: deterministic_contract
subject_execution: none
fixture: fixture_backed
runtime: real_disposable_bundle
external_calls: none
verdict_judge: deterministic
---

<!-- @impl EXA-005, EXA-006, EXA-007, PLR-003 -->

## Execution Contract

The Playbook Agent uses the production canonical-topic-state helper and topic/queue CLIs over one fresh contained disposable bundle. The plan-first crash is deliberate fixture setup. All cross-block diagnostics live in the host-created playbook state directory; no `/tmp`, environment, or conversation-memory handoff is authoritative.

# Case 315 - Canonical Topic-State Recovery

## Step 1 - Create and enter HITL1

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs case-315-topic-state --case case-315 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
STATE=$(printf '%s' {{PLAYBOOK_STATE_DIR_SH}})
node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-instantiation-complete.mjs --bundle "$B" --current-node phases/phase-instantiation.md > "$STATE/case315-inst.json"
NEXT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.check.next)' "$STATE/case315-inst.json")
node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle "$B" --node "$NEXT" > "$STATE/case315-hitl1.md"
node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle "$B" --to hitl1_recorded > "$STATE/case315-status.json"
node --input-type=module - "$B" "$STATE/case315-control-before.json" <<'JS'
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const [bundle, target] = process.argv.slice(2);
const digest = (name) => createHash('sha256').update(readFileSync(join(bundle, name))).digest('hex');
writeFileSync(target, `${JSON.stringify({
  'rb_status.json': digest('rb_status.json'),
  'rb_trace.jsonl': digest('rb_trace.jsonl'),
  'rb_profile.yaml': digest('rb_profile.yaml'),
}, null, 2)}\n`);
JS
```

## Step 2 - Retain input and inject plan-first crash

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
STATE=$(printf '%s' {{PLAYBOOK_STATE_DIR_SH}})
cat > "$STATE/case315-topic-input.json" <<'JSON'
{"context":"hitl1","actions":[{"action":"add_topic","title":"Crash-safe canonical topic","slug_stem":"crash-safe-canonical-topic","must_answer":["Can canonical intent survive a plan-first crash?"],"scope_role":"primary","depends_on_topic_uids":[]}]}
JSON
node --input-type=module - "$B" "$STATE/case315-topic-input.json" <<'JS'
import { readFileSync } from 'node:fs';
import { applyCanonicalTopicState } from './DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs';
const [bundle, input] = process.argv.slice(2);
try {
  applyCanonicalTopicState({ bundlePath: bundle, input: JSON.parse(readFileSync(input)), crashAt: 'after_plan' });
} catch (error) {
  if (!/after_plan/.test(error.message)) throw error;
}
JS
```

## Step 3 - Inspect exact recovery and queue no-write blocker

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
STATE=$(printf '%s' {{PLAYBOOK_STATE_DIR_SH}})
node DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs inspect --bundle "$B" > "$STATE/case315-inspect.json" || test $? -eq 1
OP=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.blockers[0].operation_id)' "$STATE/case315-inspect.json")
cat > "$STATE/case315-task.json" <<'JSON'
{"queue_item_id":"wave0-source-01_crash-safe-canonical-topic","title":"blocked while seed pending","targets":{"controller":"main-agent"},"action":"do not enqueue before recovery","producer_rule":"source_intake","lineage":{"topic_slug":"01_crash-safe-canonical-topic"},"priority_class":"P5_new_reference_intake","required_receipts":[],"done_condition":"blocked","verification":{"engine":[],"agent":[]},"writes_to":[],"status_sync":[],"completion_receipt":null,"failure_route":"topic-state recover","status":"queued","restore_priority":"normal","payload":{"topic_slug":"01_crash-safe-canonical-topic"}}
JSON
node DEEP_RESEARCH_HARNESS/cli/operate-queue.mjs enqueue "$B" --task "$STATE/case315-task.json" > "$STATE/case315-enqueue-blocked.json" || test $? -eq 1
printf '%s\n' "$OP" > "$STATE/case315-operation-id"
```

## Step 4 - Recover, inspect, and enqueue

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
STATE=$(printf '%s' {{PLAYBOOK_STATE_DIR_SH}})
OP=$(cat "$STATE/case315-operation-id")
node DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs recover --bundle "$B" --operation-id "$OP" > "$STATE/case315-recover.json"
node DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs inspect --bundle "$B" > "$STATE/case315-clean.json"
node DEEP_RESEARCH_HARNESS/cli/operate-queue.mjs enqueue "$B" --task "$STATE/case315-task.json" > "$STATE/case315-enqueue.json"
```

## Step 5 - Record exact case checks

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
STATE=$(printf '%s' {{PLAYBOOK_STATE_DIR_SH}})
node --input-type=module - "$B" "$STATE" <<'JS'
import { createHash } from 'node:crypto';
import { appendFileSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const [bundle, state] = process.argv.slice(2);
const json = (name) => JSON.parse(readFileSync(join(state, name)));
const digest = (name) => createHash('sha256').update(readFileSync(join(bundle, name))).digest('hex');
const blocked = json('case315-enqueue-blocked.json');
const recovered = json('case315-recover.json');
const clean = json('case315-clean.json');
const queued = json('case315-enqueue.json');
const before = json('case315-control-before.json');
const uid = clean.topics?.[0]?.topic_uid;
const plan = readFileSync(join(bundle, 'rb_plan.md'), 'utf8');
const seedFiles = readdirSync(join(bundle, 'seed_topics')).filter((name) => name.endsWith('.md'));
const seed = seedFiles.length === 1 ? readFileSync(join(bundle, 'seed_topics', seedFiles[0]), 'utf8') : '';
const checks = [
  ['accepted-workspace-enqueue-blocked', blocked.ok === false && blocked.reason_code === 'accepted_workspace'],
  ['topic-recovery-committed', recovered.verdict === 'committed'],
  ['topic-state-clean', clean.passed === true && (clean.blockers ?? []).length === 0],
  ['uid-bound-topic-restored', typeof uid === 'string' && uid.length > 0 && plan.includes(uid) && seed.includes(uid)],
  ['post-recovery-enqueue-succeeded', queued.ok === true],
];
for (const [gate, passed] of checks) appendFileSync(join(bundle, 'rb_trace.jsonl'), `${JSON.stringify({
  ts: new Date().toISOString(), event: 'check', source: 'playbook', gate, passed, expected: true,
})}\n`);
if (checks.some(([, passed]) => !passed)) process.exit(1);
JS
```

## Step 6 - Native completion

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

Stop after native completion. The Autorun Supervisor owns Light health, durable audit, preservation, and optional clean-PASS cleanup of the complete case run root.
