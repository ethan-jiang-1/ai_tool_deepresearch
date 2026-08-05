---
schema: command-experiment/v2
experiment: autonomous-research-hardening
case: case-602-standard-status-drift-return-to-legal-phase
case_goal: "BUG-042: status drift audit detects skipped wave windows and points back to latest legal phase without mutating status."
verdict_mode: all
required_checks: [audit-did-not-mutate-status, latest-legal-target-named, manual-bypass-suspected]
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
req: CPT-006
---

<!-- @impl EXA-005, EXA-006, EXA-007, PLR-003 -->

## Execution Contract

Standard controlled phase-drift playbook. This intentionally writes an impossible status window as fixture input, then uses real audit CLI output as feedback. The runner must not "repair" by editing status to pass; it records that the audit directs a return to the latest legal phase target.

# case-602-standard-status-drift-return-to-legal-phase

## Step 1: Create Legal Wave0 Handoff Then Drift Status

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs arh_status_drift --case case-602 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
node --input-type=module - "$B" <<'JS'
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeWave1Scaffold } from './experiments_env/shared/work-unit-playbook-utils.mjs';
const bundle = process.argv[2];
writeWave1Scaffold(bundle, { planBasename: 'arh_status_drift' });
writeFileSync(join(bundle, 'rb_status.json'), JSON.stringify({
  bundle: 'case-602',
  current_mode: 'execution',
  state: 'in_progress',
  current_gate: 'wave2_complete',
  next_gate: 'hitl2_recorded'
}, null, 2) + '\n');
JS
echo "BUNDLE=$B"
```

## Step 2: Audit Drift

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
BEFORE=$(cat "$B/rb_status.json")
set +e
node DEEP_RESEARCH_HARNESS/cli/audit-phase-status.mjs --bundle "$B" > "$B/case-602-audit.json"
AUDIT_STATUS=$?
set -e
AFTER=$(cat "$B/rb_status.json")

node --input-type=module - "$B" "$AUDIT_STATUS" "$BEFORE" "$AFTER" <<'JS'
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { recordCheck } from './experiments_env/shared/wff-playbook-utils.mjs';
const [bundle, auditStatus, before, after] = process.argv.slice(2);
const audit = JSON.parse(readFileSync(join(bundle, 'case-602-audit.json'), 'utf8'));
recordCheck(join(bundle, 'rb_trace.jsonl'), {
  gate: 'manual-bypass-suspected',
  passed: Number(auditStatus) === 1 && audit.outcome === 'manual_bypass_suspected',
  detail: JSON.stringify(audit.inspect)
});
recordCheck(join(bundle, 'rb_trace.jsonl'), {
  gate: 'audit-did-not-mutate-status',
  passed: before === after,
  detail: 'rb_status.json unchanged by audit'
});
recordCheck(join(bundle, 'rb_trace.jsonl'), {
  gate: 'latest-legal-target-named',
  passed: JSON.stringify(audit.latest_legal_window || {}).includes('phases/phase-wave1.md') && JSON.stringify(audit.advice || []).includes('Latest legal target'),
  detail: JSON.stringify(audit.latest_legal_window || {})
});
JS
```

## Step 3: Verdict

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

Stop after native completion. The Autorun Supervisor owns Light health, audit, preservation, and optional clean-PASS cleanup.
