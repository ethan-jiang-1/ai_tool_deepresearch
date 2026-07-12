---
schema: command-experiment/v1
experiment: wfn-wave2
case: case-232-heavy-finding-triage
weight: heavy
case_goal: "Verify real Wave2 Phase Agent finding triage distinguishes existing-evidence synthesis from delegated targeted evidence demand."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-232_w2_real_finding_triage
trace: dpt_disp_case-232_w2_real_finding_triage/rb_trace.jsonl
verdict: trace-jsonl
req: RWE-001, RWE-004, WTS-003, WTS-005
---

## Execution Contract

This is a real-Agent canary. The finding classification is semantic work and must be done by the Wave2 Phase Agent reading the bundle, not by a fixture script. Deterministic checkpoints may create the bundle, inspect artifacts, claim/submit any delegated targeted evidence selected by the Agent, run the Wave2 gate, and record trace checks.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Runtime context | Real disposable Wave2 bundle |
| Framework path | Real queue, optional `operate-work-unit claim/submit`, and Wave2 gate CLI |
| Fixture input | Setup may seed post-Wave1 artifacts; triage artifacts are Agent output |
| Agent actor | Required; no fixture PASS is allowed |
| External calls | Only needed if the Agent chooses targeted evidence search |
| Verdict source | Artifact inspection, submitted work-unit rows when search is used, gate JSON, trace checks |
| Does not prove | Nothing without a real Agent run; optional automation reports `NOT_RUN` |

# case-232-heavy-finding-triage

## Expected Runtime Path

1. Create a Wave2-ready bundle with at least two post-Wave1 topics.
2. Phase Agent reads Wave1 evidence summaries and question lists.
3. Phase Agent writes findings that separate `use_existing_evidence`, `record_only`, and `explore_search` or `exploit_search`.
4. If targeted evidence is selected, enqueue a `wave2_targeted_evidence` queue item and submit the result by `work_id`.
5. Phase Agent writes synthesis/backfill artifacts and `wave2_completion`.
6. Deterministic checks verify no orphan search finding exists and no targeted evidence output bypasses work-unit submit.
7. Wave2 gate passes.

## Step 1: [MAIN/SHELL] Create Runtime Context

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs w2_real_finding_triage --case case-232 --force)
node --input-type=module - "$B" <<'JS'
import { writeWave2Scaffold } from './experiments_env/shared/work-unit-playbook-utils.mjs';

writeWave2Scaffold(process.argv[2], {
  planBasename: 'w2_real_finding_triage',
  staleWave2Backfill: true,
  topics: [
    { id: 't1', slug: 'claude-code', title: 'Claude Code' },
    { id: 't2', slug: 'agentic-tools', title: 'Agentic Tools' }
  ]
});
JS
node DPT_FRAMEWORK/cli/validate-bundle.mjs "$B"
echo "BUNDLE=$B"
```

## Step 2: [MAIN] Real Phase Agent Triage

The Phase Agent must read:

- `artifacts/wave1/*/evidence-summary.md`
- `artifacts/wave1/*/question-list.md`
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave2.md`

The Agent writes:

- `artifacts/wave2/cross-topic-ledger.md`
- `artifacts/wave2/finding-index.yaml`
- `artifacts/wave2/synthesis.md`
- `seed_topics/*.md` backfill

Required Agent-visible distinctions:

- Findings resolved from existing Wave1 evidence use `decision: use_existing_evidence` and require no work-unit row.
- Low-value observations use `decision: record_only` and require no work-unit row.
- New targeted evidence demand uses `decision: explore_search` or `decision: exploit_search`, then must produce a submitted `wave2_targeted_evidence` row before any `reference/00-cross-*.md` output is gate-authoritative.

## Step 3: [MAIN/SHELL] Submit Any Agent-Requested Targeted Evidence

Only run this step if the Agent has written a finding that requires targeted evidence.

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim "$B" --phase wave2 --count 1 --actor-outcome available --actor-source native_probe --actor-role-key dpt-topic-scout --actor-reason probe_succeeded --execution-actor delegated_subagent > "$B/case-232-targeted-claim.json"
printf '%s\n' "Read the claimed task.md, run the real dpt-topic-scout actor, and provide its result JSON to submit."
```

After the real sub-agent returns:

```bash
RESULT_JSON=/absolute/path/to/real-wave2-targeted-result.json
WORK_ID=$(node -e 'const fs=require("fs"); const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); console.log(j.claimed_work_ids[0])' "$B/case-232-targeted-claim.json")
node DPT_FRAMEWORK/cli/operate-work-unit.mjs submit "$B" --work-id "$WORK_ID" --result "$RESULT_JSON"
```

## Step 4: [MAIN/SHELL] Deterministic Triage Checks

```bash
node --input-type=module - "$B" <<'JS'
import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import { recordPlaybookCheck } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
const idx = parseYaml(readFileSync(`${bundle}/artifacts/wave2/finding-index.yaml`, 'utf8'));
const findings = idx.findings || [];
const hasExisting = findings.some((f) => f.decision === 'use_existing_evidence' && f.search_required === false);
const hasRecordOnly = findings.some((f) => f.decision === 'record_only' && f.search_required === false);
const searchFindings = findings.filter((f) => f.decision === 'explore_search' || f.decision === 'exploit_search' || f.search_required === true);
const orphanSearch = searchFindings.filter((f) => !(f.subagent_receipt_refs || []).length && f.appears_in_synthesis !== false && f.hitl2_handoff !== true);
recordPlaybookCheck(bundle, { gate: 'wave2-existing-evidence-finding', passed: hasExisting, detail: `findings=${findings.length}` });
recordPlaybookCheck(bundle, { gate: 'wave2-record-only-finding', passed: hasRecordOnly, detail: `findings=${findings.length}` });
recordPlaybookCheck(bundle, { gate: 'wave2-no-orphan-search-finding', passed: orphanSearch.length === 0, detail: JSON.stringify(orphanSearch.map((f) => f.id)) });
JS
```

## Step 5: [MAIN/SHELL] Gate And Verdict

```bash
node --input-type=module - "$B" <<'JS'
import { appendTrace } from './experiments_env/shared/work-unit-playbook-utils.mjs';
appendTrace(process.argv[2], { event: 'wave2_completion', source: 'case-232-real-agent' });
JS
node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle "$B" --current-node phases/phase-wave2.md > "$B/case-232-gate.json"
node --input-type=module - "$B" <<'JS'
import { readFileSync } from 'node:fs';
import { recordPlaybookCheck, writeTraceVerdict } from './experiments_env/shared/work-unit-playbook-utils.mjs';
const bundle = process.argv[2];
const gate = JSON.parse(readFileSync(`${bundle}/case-232-gate.json`, 'utf8'));
recordPlaybookCheck(bundle, { gate: 'wave2-gate-pass', passed: gate.check?.passed === true, detail: JSON.stringify(gate.inspect || []) });
const verdict = writeTraceVerdict(bundle, 'case-232');
console.log(JSON.stringify(verdict, null, 2));
process.exit(verdict.ok ? 0 : 1);
JS
```

## Optional Automation Smoke

```bash
node experiments_env/shared/run-fixture-backed-case.mjs --case case-232 --target-dir tests/.test-bundles
```

Expected without a real Agent artifact set: exit `2`, verdict `NOT_RUN`.

## Cleanup

PASS only:

```bash
node -e 'const fs=require("fs"); const v=JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.exit(v.ok ? 0 : 1)' "$B/case-232-verdict.json"
rm -rf "$B"
```
