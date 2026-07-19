---
schema: command-experiment/v2
experiment: engine-boundary
case: case-403-light-work-unit-authority
case_goal: "验证 Wave0 gate 的 delegated reference authority 来自 submitted work-unit ledger、cache trail coverage、provenance/hash checks，而不是内容启发式。"
verdict_mode: all
required_checks: [missing-ledger-fails, clean-pass, root-url-passes, cache-drift-fails]
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
---

<!-- @impl EXA-005, EXA-006, EXA-007, PLR-003 -->

# Case 403 - Work-Unit Authority

## Execution Contract

This deterministic fixture case uses real queue/work-unit submit and Wave0 gate CLIs over one fresh contained bundle. Controlled reference/source/cache files isolate four authority boundaries. It does not claim Agent source selection or semantic content quality. The helper creates and immediately registers the bundle, produces runtime facts, and stops without health or cleanup.

## Step 1 - Exercise the four authority boundaries

```bash
STATE=$(printf '%s' {{PLAYBOOK_STATE_DIR_SH}})
node experiments_env/shared/run-fixture-backed-case.mjs \
  --case case-403 \
  --target-dir {{CASE_RUN_ROOT_SH}} \
  --context {{RUN_CONTEXT_SH}} \
  --bundle-role verdict > "$STATE/case403-run.json"
```

The four visible checkpoints are: missing submitted ledger fails; clean submitted coverage passes; a parseable root URL passes when provenance is valid; and post-submit cache drift fails through `cache_coverage` diagnostics.

## Step 2 - Project helper facts into strict playbook checks

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node --input-type=module - "$B" <<'JS'
import { appendFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const [bundle] = process.argv.slice(2);
const verdict = JSON.parse(readFileSync(join(bundle, 'case-403-verdict.json')));
const expected = ['missing-ledger-fails', 'clean-pass', 'root-url-passes', 'cache-drift-fails'];
const byLabel = new Map(verdict.checks.map((row) => [row.label, row]));
for (const gate of expected) {
  const row = byLabel.get(gate);
  appendFileSync(join(bundle, 'rb_trace.jsonl'), `${JSON.stringify({
    ts: new Date().toISOString(), event: 'check', source: 'playbook', gate,
    passed: row?.passed === true, expected: true,
  })}\n`);
}
if (expected.some((gate) => byLabel.get(gate)?.passed !== true)) process.exit(1);
JS
```

## Step 3 - Native completion

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

Stop after native completion. The Autorun Supervisor owns Heavy health, durable audit, preservation, and optional clean-PASS cleanup of the complete case run root.
