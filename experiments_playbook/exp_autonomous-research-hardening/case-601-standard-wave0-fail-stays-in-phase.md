---
schema: command-experiment/v1
experiment: autonomous-research-hardening
case: case-601-standard-wave0-fail-stays-in-phase
weight: standard
case_goal: "BUG-033: after Wave0 gate failure feedback, remain in Wave0 repair loop, flag premature final/ as non-authoritative, and do not surface."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-601_arh_wave0_fail
trace: dpt_disp_case-601_arh_wave0_fail/rb_trace.jsonl
verdict: trace-jsonl
req: CPT-006
---

## Execution Contract

Standard controlled MD-controller playbook. Inline JS may create fixture gaps and record trace checks; the proof question is whether the runner reads Engine feedback and remains in the legal phase instead of treating `final/` or edited status as completion. Do not add fake gate pass entries.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Runtime context | Real disposable bundle |
| Engine path | Real Wave0 gate and `audit-phase-status.mjs` |
| Agent actor | Runner follows playbook feedback loop |
| External calls | None |
| Verdict source | `rb_trace.jsonl` check events |
| Does not prove | Web search quality or native Sub-agent behavior |

# case-601-standard-wave0-fail-stays-in-phase

## Step 1: Create Bundle With Wave0 Gap

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs arh_wave0_fail --case case-601 --force)
node --input-type=module - "$B" <<'JS'
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeWave0Scaffold } from './experiments_env/shared/work-unit-playbook-utils.mjs';
writeWave0Scaffold(process.argv[2], {
  planBasename: 'arh_wave0_fail',
  topics: [
    { id: 't1', slug: 'topic-a', title: 'Topic A' },
    { id: 't2', slug: 'topic-b', title: 'Topic B' }
  ],
  referenceRows: []
});
mkdirSync(join(process.argv[2], 'final'), { recursive: true });
writeFileSync(join(process.argv[2], 'final/report.md'), '# Premature report\n');
JS
echo "BUNDLE=$B"
```

## Step 2: Run Gate And Audit Feedback

```bash
set +e
node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle "$B" --current-node phases/phase-wave0.md > "$B/case-601-wave0-gate.json"
GATE_STATUS=$?
node DPT_FRAMEWORK/cli/audit-phase-status.mjs --bundle "$B" > "$B/case-601-phase-audit.json"
AUDIT_STATUS=$?
set -e

node --input-type=module - "$B" "$GATE_STATUS" "$AUDIT_STATUS" <<'JS'
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { recordCheck } from './experiments_env/shared/wff-playbook-utils.mjs';
const [bundle, gateStatus, auditStatus] = process.argv.slice(2);
const gate = JSON.parse(readFileSync(join(bundle, 'case-601-wave0-gate.json'), 'utf8'));
const audit = JSON.parse(readFileSync(join(bundle, 'case-601-phase-audit.json'), 'utf8'));
recordCheck(join(bundle, 'rb_trace.jsonl'), {
  gate: 'wave0-fail-did-not-authorize-final',
  passed: Number(gateStatus) === 1 && gate.check?.passed === false && gate.check?.next === null,
  detail: JSON.stringify({ gate_status: gateStatus, next: gate.check?.next })
});
recordCheck(join(bundle, 'rb_trace.jsonl'), {
  gate: 'premature-final-diagnostic-only',
  passed: Number(auditStatus) === 1 && audit.outcome === 'status_drift' && audit.diagnostic_only === true && JSON.stringify(audit.inspect).includes('premature'),
  detail: JSON.stringify({ audit_status: auditStatus, outcome: audit.outcome })
});
recordCheck(join(bundle, 'rb_trace.jsonl'), {
  gate: 'no-surfacing-intent-required-for-engine-feedback',
  passed: !JSON.stringify(gate.advice || []).match(/ask the user|surface to the user|skip phase|hand-edit rb_status/i),
  detail: 'gate advice stays repair-oriented'
});
JS
```

## Step 3: Verdict

```bash
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m => m.verdict('$B/rb_trace.jsonl'))"
```

## Cleanup

```bash
node -e "import('./experiments_env/shared/wff-playbook-utils.mjs').then(m => m.cleanup('$B', {caseId:'case-601'}))"
```
