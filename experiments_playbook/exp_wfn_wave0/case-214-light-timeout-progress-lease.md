---
schema: command-experiment/v2
experiment: wfn-wave0
case: case-214-light-timeout-progress-lease
case_goal: "验证 timeout-preflight/progress-aware lease 防止 delegated work-unit 被 wall-clock timeout 误杀，并保留 no-progress REDO、candidate routing 与 forced-timeout audit。"
verdict_mode: all
required_checks: [no-progress-preflight-timeout-eligible, no-progress-timeout-requeues-retry, progress-preflight-refuses-timeout, progress-default-timeout-no-side-effect, submit-ready-candidate-routes-submit, repairable-external-candidate-routes-repair, external-candidate-mtime-does-not-extend-lease, wrong-identity-candidate-routes-inspect, force-timeout-records-audit, late-submit-after-timeout-remains-rejected]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: heavy
durable_evidence_roles: []
proof_subject: deterministic_contract
subject_execution: none
fixture: fixture_backed
runtime: real_disposable_bundle
external_calls: none
verdict_judge: deterministic
req: RWE-011
---

<!-- @impl EXA-005, EXA-006, EXA-007, PLR-003 -->

# Case 214 - Timeout Progress Lease

## Execution Contract

This fixture-backed Engine case uses production queue/work-unit claim, timeout-preflight, timeout, submit, index, ledger, and trace boundaries over one fresh contained bundle. Controlled candidate result, receipt, output, and cache files are staged only after claim. It proves timeout policy mechanics, not real Sub-agent search, repair judgment, or semantic quality.

## Visible checkpoint matrix

1. Expired no-progress claim routes to timeout and requeues a distinct retry.
2. Progress receipt extends the idle lease; preflight and default timeout refuse mutation.
3. A dry-submit-ready candidate routes to submit.
4. A repairable external candidate routes to same-work repair, and its mtime cannot extend authority.
5. Wrong identity routes to inspect/block.
6. Forced timeout records progress diagnostics; ordinary submit after terminal timeout remains rejected.

## Step 1 - Execute the deterministic checkpoint chain

```bash
STATE=$(printf '%s' {{PLAYBOOK_STATE_DIR_SH}})
node experiments_env/shared/run-fixture-backed-case.mjs \
  --case case-214 \
  --target-dir {{CASE_RUN_ROOT_SH}} \
  --context {{RUN_CONTEXT_SH}} --bundle-role verdict > "$STATE/case214-run.json"
```

## Step 2 - Project exact helper facts into strict playbook checks

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { appendFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const [bundle] = process.argv.slice(2);
const verdict = JSON.parse(readFileSync(join(bundle, 'case-214-verdict.json')));
const required = [
  'no-progress-preflight-timeout-eligible', 'no-progress-timeout-requeues-retry',
  'progress-preflight-refuses-timeout', 'progress-default-timeout-no-side-effect',
  'submit-ready-candidate-routes-submit', 'repairable-external-candidate-routes-repair',
  'external-candidate-mtime-does-not-extend-lease', 'wrong-identity-candidate-routes-inspect',
  'force-timeout-records-audit', 'late-submit-after-timeout-remains-rejected',
];
const byLabel = new Map(verdict.checks.map((row) => [row.label, row]));
for (const gate of required) appendFileSync(join(bundle, 'rb_trace.jsonl'), `${JSON.stringify({
  ts: new Date().toISOString(), event: 'check', source: 'playbook', gate,
  passed: byLabel.get(gate)?.passed === true, expected: true,
})}\n`);
if (required.some((gate) => byLabel.get(gate)?.passed !== true)) process.exit(1);
JS
```

## Step 3 - Native completion

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

Stop after native completion. The Autorun Supervisor owns Heavy health, durable audit, preservation, and optional clean-PASS cleanup of the complete case run root.
