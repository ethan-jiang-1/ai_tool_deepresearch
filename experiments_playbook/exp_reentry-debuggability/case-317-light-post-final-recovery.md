---
schema: command-experiment/v2
experiment: reentry-debuggability
case: case-317-light-post-final-recovery
case_goal: "验证 legal Final 经 audited C5 event-last recovery、existing entry/status/C3/rerun owners 进入正常 descendant pipeline，且无 addendum 或 generic override。"
verdict_mode: all
required_checks: [prior-final-lineage, one-recovery-event, exact-exceptional-binding, canonical-topic, normal-descendant, repeat-stable, no-parallel-addendum, terminal-history-preserved]
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

# Case 317 - Audited Post-Final Recovery To Canonical Rerun

## Execution Contract

The controlled fixture begins at a byte-valid legal terminal Final lineage. The production helper then performs post-final inspect/apply/replay, phase entry and status transition, canonical topic materialization, rerun-ready gate/load/transition, and repeat recovery. It creates and immediately registers one contained disposable verdict bundle. This deterministic case does not claim human identity, live research quality, or Subject Agent behavior.

## Step 1 - Run the deterministic recovery chain

```bash
STATE=$(printf '%s' {{PLAYBOOK_STATE_DIR_SH}})
node experiments_env/shared/run-post-final-recovery-case.mjs \
  --case case-317 \
  --target-dir {{CASE_RUN_ROOT_SH}} \
  --context {{RUN_CONTEXT_SH}} \
  --role verdict > "$STATE/case317-result.json"
```

## Step 2 - Record the exact case-owned checks

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
STATE=$(printf '%s' {{PLAYBOOK_STATE_DIR_SH}})
node --input-type=module - "$B" "$STATE/case317-result.json" <<'JS'
import { appendFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const [bundle, resultPath] = process.argv.slice(2);
const result = JSON.parse(readFileSync(resultPath));
const gates = {
  'prior-final-lineage': result.checks.prior_final_lineage,
  'one-recovery-event': result.checks.one_recovery_event,
  'exact-exceptional-binding': result.checks.exact_exceptional_binding,
  'canonical-topic': result.checks.canonical_topic,
  'normal-descendant': result.checks.normal_descendant,
  'repeat-stable': result.checks.repeat_stable,
  'no-parallel-addendum': result.checks.no_parallel_addendum,
  'terminal-history-preserved': result.checks.terminal_history_preserved,
};
for (const [gate, passed] of Object.entries(gates)) appendFileSync(join(bundle, 'rb_trace.jsonl'), `${JSON.stringify({
  ts: new Date().toISOString(), event: 'check', source: 'playbook', gate, passed: passed === true, expected: true,
})}\n`);
if (Object.values(gates).some((passed) => passed !== true)) process.exit(1);
JS
```

## Step 3 - Native completion

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

Stop after native completion. The Autorun Supervisor owns Light health, durable audit, preservation, and optional clean-PASS cleanup of the complete case run root.
