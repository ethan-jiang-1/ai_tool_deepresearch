---
schema: command-experiment/v2
experiment: wfn-wave2
case: case-232-heavy-finding-triage
case_goal: "Verify an independent real Wave2 Subject Agent distinguishes existing-evidence synthesis, record-only observations, and delegated targeted evidence demand."
verdict_mode: all
required_checks: [wave2-existing-evidence-finding, wave2-gate-pass, wave2-no-orphan-search-finding, wave2-record-only-finding]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: heavy
durable_evidence_roles: [subject_prompt, subject_transcript, subject_result]
proof_subject: agent_behavior
subject_execution: real_agent
fixture: setup_only
runtime: real_disposable_bundle
external_calls: real
verdict_judge: deterministic
req: RWE-001, RWE-004, WTS-003, WTS-005
not_run_if: "The independent authenticated Subject Agent runtime or required real search capability is unavailable."
---

<!-- @impl EXA-003, EXA-005, EXA-006, EXA-007, EXA-008, PLR-003, VER-006 -->

## Execution Contract

This is a real-Agent canary. An independent authenticated Wave2 Subject Agent, not the Playbook Agent, owns semantic finding triage and artifact production. Fixture setup may seed the post-Wave1 bundle. The adapter loads the real production Wave2 surface and preserves exact Subject prompt, transcript, and result, but does not write verdict checks, native completion, health, or cleanup.

PASS requires the Subject execution evidence, at least one real WebSearch tool use, the three required triage classes, no orphan search finding, and the production Wave2 Gate. If the Subject runtime or external capability is unavailable, finalize `NOT_RUN`; Playbook-Agent-authored triage cannot substitute.

# case-232-heavy-finding-triage

## Step 1: [MAIN/SHELL] Create The Setup-Only Boundary

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs w2_real_finding_triage --case case-232 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
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
node DEEP_RESEARCH_HARNESS/cli/validate-bundle.mjs "$B"
node --input-type=module - "$B" <<'JS'
import { readFileSync } from 'node:fs';
const status = JSON.parse(readFileSync(`${process.argv[2]}/rb_status.json`, 'utf8'));
if (status.current_node !== 'phases/phase-wave2.md') throw new Error('setup did not stop at Wave2');
JS
```

## Step 2: [MAIN->SUBJECT] Run Independent Wave2 Triage

The adapter gives the independent Subject Agent the current production Wave2 surface and direct bundle path. The Subject must inspect both Wave1 topic surfaces, make bounded real external calls, write the Wave2 artifact triplet and seed backfill, and route any targeted evidence through work-unit claim/submit authority.

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
set +e
node experiments_env/shared/run-iterative-interaction-subject.mjs 232 --bundle "$B"
SUBJECT_STATUS=$?
set -e
if [ "$SUBJECT_STATUS" -ne 0 ]; then
  printf '%s\n' 'independent Subject Agent runtime or real external search unavailable' > "$B/case-232-subject-unavailable.txt"
fi
```

## Step 3: [MAIN/SHELL] Record Subject-Bound Triage Facts

Skip this step when `case-232-subject-unavailable.txt` exists.

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-wave2-complete.mjs --bundle "$B" --current-node phases/phase-wave2.md > "$B/case-232-gate.json"
node --input-type=module - "$B" <<'JS'
import { readFileSync, statSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import { recordPlaybookCheck } from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
const idx = parseYaml(readFileSync(`${bundle}/artifacts/wave2/finding-index.yaml`, 'utf8'));
const findings = idx.findings || [];
const gate = JSON.parse(readFileSync(`${bundle}/case-232-gate.json`, 'utf8'));
const prompt = JSON.parse(readFileSync(`${bundle}/case-232-subject-prompt.json`, 'utf8'));
const result = JSON.parse(readFileSync(`${bundle}/case-232-subject-result.json`, 'utf8'));
const transcriptPath = `${bundle}/case-232-subject-transcript.jsonl`;
const transcript = readFileSync(transcriptPath, 'utf8');
const subjectExecuted = prompt.subject === '232'
  && result.status === 'completed'
  && result.subject === '232'
  && result.completed_turns === 1
  && statSync(transcriptPath).size > 0
  && /WebSearch/.test(transcript);
const hasExisting = findings.some((finding) => finding.decision === 'use_existing_evidence' && finding.search_required === false);
const hasRecordOnly = findings.some((finding) => finding.decision === 'record_only' && finding.search_required === false);
const searchFindings = findings.filter((finding) => ['explore_search', 'exploit_search'].includes(finding.decision) || finding.search_required === true);
const orphanSearch = searchFindings.filter((finding) => !(finding.subagent_receipt_refs || []).length && finding.appears_in_synthesis !== false && finding.hitl2_handoff !== true);
recordPlaybookCheck(bundle, { gate: 'wave2-existing-evidence-finding', passed: subjectExecuted && hasExisting, detail: `subject=${subjectExecuted};findings=${findings.length}` });
recordPlaybookCheck(bundle, { gate: 'wave2-record-only-finding', passed: hasRecordOnly, detail: `findings=${findings.length}` });
recordPlaybookCheck(bundle, { gate: 'wave2-no-orphan-search-finding', passed: searchFindings.length > 0 && orphanSearch.length === 0, detail: JSON.stringify(orphanSearch.map((finding) => finding.id)) });
recordPlaybookCheck(bundle, { gate: 'wave2-gate-pass', passed: gate.check?.passed === true, detail: JSON.stringify(gate.inspect || []) });
JS
```

## Step 4: [MAIN/SHELL] Native Completion

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
EXTRA_ARGS=()
if [ -f "$B/case-232-subject-unavailable.txt" ]; then
  EXTRA_ARGS+=(--not-run-reason "independent Subject Agent runtime or real external search unavailable")
else
  EXTRA_ARGS+=(
    --evidence "subject_prompt=$B/case-232-subject-prompt.json"
    --evidence "subject_transcript=$B/case-232-subject-transcript.jsonl"
    --evidence "subject_result=$B/case-232-subject-result.json"
  )
fi
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B" "${EXTRA_ARGS[@]}"
```

Stop after native completion. The Autorun Supervisor owns Heavy health, durable Subject-evidence export, audit, preservation, and optional clean-PASS cleanup.
