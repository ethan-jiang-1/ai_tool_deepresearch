---
schema: command-experiment/v2
experiment: wff-pre-research
case: case-102-standard-instantiation-production
case_goal: "Prove the real production instantiator creates a contained production-shaped bundle structurally equivalent to a disposable experiment bundle and able to pass instantiation-complete."
verdict_mode: all
required_checks: [production-subject-created, production-disposable-structural-equivalence, instantiation-complete]
bundle_roles: [verdict, production-subject]
verdict_role: verdict
health_roles: [verdict, production-subject]
health_profile: standard
durable_evidence_roles: []
proof_subject: deterministic_contract
subject_execution: none
fixture: fixture_backed
runtime: real_disposable_bundle
external_calls: none
verdict_judge: deterministic
---

<!-- @impl EXA-005, EXA-006, EXA-007, PLR-003, VER-006 -->

# Case 102 - Production Instantiator Contract

## Execution Contract

The Playbook Agent creates one fresh `dpt_disp_*` verdict bundle and invokes the real production instantiator for one fresh contained `dpt_rb_*` production-shaped subject bundle. Required checks live only in the disposable verdict trace. Both are case-owned under the same Supervisor run root and both receive Standard health. This proves the instantiator contract, not a separately selected live production run.

## Step 1 - Create and register both bundles

```bash
V=$(node experiments_env/shared/new-disposable-bundle.mjs wff_prod_verdict --case case-102 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$V"
B=$(node DEEP_RESEARCH_HARNESS/cli/instantiate-run-bundle.mjs wff-prod --target-dir {{CASE_RUN_ROOT_SH}} 2>&1 | tail -1)
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role production-subject --path "$B"
```

## Step 2 - Validate structure and run the real gate

```bash
V=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role production-subject)
node DEEP_RESEARCH_HARNESS/cli/validate-bundle.mjs "$V"
node DEEP_RESEARCH_HARNESS/cli/validate-bundle.mjs "$B"
GATE=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate instantiation-complete -- node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-instantiation-complete.mjs --bundle "$B" --current-node phases/phase-instantiation.md)
printf '%s\n' "$GATE" > "$B/case-102-instantiation-gate.json"
```

## Step 3 - Record case-owned checks in the disposable verdict trace

```bash
V=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role production-subject)
node --input-type=module - "$V" "$B" <<'JS'
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
const [verdict, subject] = process.argv.slice(2);
const required = ['rb_plan.md', 'rb_profile.yaml', 'rb_status.json', 'rb_queue.json', 'rb_trace.jsonl', '_logs/run.log', 'seed_topics', 'reference', 'artifacts', '_cache', 'final', '_work_units'];
const gate = JSON.parse(readFileSync(join(subject, 'case-102-instantiation-gate.json')));
const checks = [
  ['production-subject-created', basename(subject).startsWith('dpt_rb_') && required.every((path) => existsSync(join(subject, path)))],
  ['production-disposable-structural-equivalence', basename(verdict).startsWith('dpt_disp_') && required.every((path) => existsSync(join(verdict, path)) === existsSync(join(subject, path)))],
  ['instantiation-complete', gate.check?.passed === true && gate.check?.next === 'phases/phase-hitl1.md'],
];
for (const [gateId, passed] of checks) appendFileSync(join(verdict, 'rb_trace.jsonl'), `${JSON.stringify({ ts: new Date().toISOString(), event: 'check', source: 'playbook', gate: gateId, passed, expected: true })}\n`);
if (checks.some(([, passed]) => !passed)) process.exit(1);
JS
```

## Step 4 - Native completion

```bash
V=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role production-subject)
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$V" --bundle "production-subject=$B"
```

Stop after native completion. The Autorun Supervisor owns Standard health for both bundles, durable audit, preservation, and optional clean-PASS cleanup of the complete case run root.
