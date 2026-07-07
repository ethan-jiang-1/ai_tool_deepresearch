---
schema: command-experiment/v1
experiment: wfn-wave2
case: case-235-light-happy-and-fail
weight: light
case_goal: "Verify Wave2 gate semantics: pure synthesis passes without delegated rows, direct targeted evidence fails, submitted targeted evidence passes."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-235_w2_happy_and_fail
trace: dpt_disp_case-235_w2_happy_and_fail/rb_trace.jsonl
verdict: trace-jsonl
req: RWE-001, RWE-004, WTS-001, WTS-005
---

## Execution Contract

Fixture-backed Engine case. It proves Wave2 gate and work-unit provenance boundaries only. Pure synthesis artifacts are controlled fixtures; targeted evidence content is controlled fixture data, but when it is meant to pass, it must be routed through `operate-work-unit claim` and `operate-work-unit submit` by `work_id`.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Runtime context | Three real disposable Wave2 bundles |
| Framework path | Real Wave2 gate CLI, real `operate-work-unit claim/submit` for targeted evidence |
| Fixture input | Controlled Wave2 artifacts and controlled cross-reference evidence |
| Agent actor | None |
| External calls | None |
| Verdict source | Gate JSON, submitted ledger rows, trace checks |
| Does not prove | Agent synthesis, triage, or real search quality |

# case-235-light-happy-and-fail

## Expected Runtime Path

1. Bundle A: pure synthesis artifacts, no `reference/00-cross-*.md`, no Wave2 work-unit rows, gate passes.
2. Bundle B: direct `reference/00-cross-*.md` with search-required finding, no work-unit submit, gate fails.
3. Bundle C: same targeted evidence submitted through `wave2_targeted_evidence` work unit, gate passes.
4. Record the three outcomes into Bundle A trace and clean all bundles only on PASS.

## Step 1: [MAIN/SHELL] Pure Synthesis Pass

```bash
B_PURE=$(node experiments_env/shared/new-disposable-bundle.mjs w2_pure_gate_pass --case case-235 --force)
node --input-type=module - "$B_PURE" <<'JS'
import { writeFileSync } from 'node:fs';
import { appendTrace, writeWave2Scaffold } from './experiments_env/shared/work-unit-playbook-utils.mjs';
const bundle = process.argv[2];
writeWave2Scaffold(bundle, { planBasename: 'w2_pure_gate_pass' });
writeFileSync(`${bundle}/artifacts/wave2/synthesis.md`, '# Cross-Topic Synthesis\n\nW2F-001 links [Topic A](../wave1/topic-a/evidence-summary.md) and [Topic B](../wave1/topic-b/question-list.md) using existing evidence only.\n');
writeFileSync(`${bundle}/artifacts/wave2/cross-topic-ledger.md`, '# Cross-Topic Ledger\n\n## Cross-Topic Scan Matrix\n\n| pair_id | topics | checked_dimensions | finding_ids | notes |\n| --- | --- | --- | --- | --- |\n| P01 | topic-a + topic-b | shared_pattern | W2F-001 | existing evidence only |\n\n## Wave1 Legacy Questions\n\nNone.\n\n## Cross-Topic Resolutions\n\nW2F-001 resolved from existing evidence.\n\n## Emergent Cross-Topic Questions\n\nNone.\n\n## Exploration Decisions\n\nW2F-001: use_existing_evidence.\n\n## HITL2 Handoff\n\nNone.\n');
writeFileSync(`${bundle}/artifacts/wave2/finding-index.yaml`, 'version: "0.1"\nsource_layer: wave2_cross_topic\nledger: artifacts/wave2/cross-topic-ledger.md\nsynthesis: artifacts/wave2/synthesis.md\nscan: { topics: [topic-a, topic-b], topic_count: 2, pair_count_expected: 1, pair_count_checked: 1 }\nfindings:\n  - id: W2F-001\n    type: cross_topic_resolution\n    status: resolved\n    decision: use_existing_evidence\n    affected_topics: [topic-a, topic-b]\n    origin_refs: [artifacts/wave1/topic-a/question-list.md]\n    trigger_refs: [artifacts/wave1/topic-b/evidence-summary.md]\n    search_required: false\n    subagent_receipt_refs: []\n    appears_in_synthesis: true\n    hitl2_handoff: false\n');
for (const topic of ['topic-a', 'topic-b']) writeFileSync(`${bundle}/seed_topics/${topic}.md`, `# ${topic}\n\n## Wave2 Judgment\nPure synthesis.\n\n## Pending Questions\n- [resolved]\n`);
appendTrace(bundle, { event: 'wave2_completion', source: 'case-235-pure' });
JS
node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle "$B_PURE" --current-node phases/phase-wave2.md > "$B_PURE/case-235-gate-pure.json"
```

## Step 2: [MAIN/SHELL] Direct Targeted Evidence Must Fail

```bash
B_DIRECT=$(node experiments_env/shared/new-disposable-bundle.mjs w2_direct_cross_ref --case case-235 --force)
node --input-type=module - "$B_DIRECT" <<'JS'
import { writeFileSync } from 'node:fs';
import { appendTrace, referenceContent, writeWave2Scaffold } from './experiments_env/shared/work-unit-playbook-utils.mjs';
const bundle = process.argv[2];
writeWave2Scaffold(bundle, { planBasename: 'w2_direct_cross_ref' });
writeFileSync(`${bundle}/reference/00-cross-market-shift.md`, referenceContent({ source_url: 'https://research-source.test/wave2/market-shift', topic_slug: 'cross-topic', title: 'Direct Cross Reference' }));
writeFileSync(`${bundle}/artifacts/wave2/synthesis.md`, '# Cross-Topic Synthesis\n\nW2F-001 uses [Topic A](../wave1/topic-a/evidence-summary.md) and requests targeted evidence.\n');
writeFileSync(`${bundle}/artifacts/wave2/cross-topic-ledger.md`, '# Cross-Topic Ledger\n\n## Cross-Topic Scan Matrix\n\n| pair_id | topics | checked_dimensions | finding_ids | notes |\n| --- | --- | --- | --- | --- |\n| P01 | topic-a + topic-b | emergent_question | W2F-001 | targeted evidence required |\n\n## Wave1 Legacy Questions\n\nOne open gap.\n\n## Cross-Topic Resolutions\n\nNone.\n\n## Emergent Cross-Topic Questions\n\nW2F-001 requires search.\n\n## Exploration Decisions\n\nW2F-001: explore_search.\n\n## HITL2 Handoff\n\nNone.\n');
writeFileSync(`${bundle}/artifacts/wave2/finding-index.yaml`, 'version: "0.1"\nsource_layer: wave2_cross_topic\nledger: artifacts/wave2/cross-topic-ledger.md\nsynthesis: artifacts/wave2/synthesis.md\nscan: { topics: [topic-a, topic-b], topic_count: 2, pair_count_expected: 1, pair_count_checked: 1 }\nfindings:\n  - id: W2F-001\n    type: cross_topic_emergent_question\n    status: open\n    decision: explore_search\n    affected_topics: [topic-a, topic-b]\n    origin_refs: [artifacts/wave1/topic-a/question-list.md]\n    trigger_refs: [artifacts/wave1/topic-b/evidence-summary.md]\n    search_required: true\n    subagent_receipt_refs: []\n    appears_in_synthesis: true\n    hitl2_handoff: false\n');
for (const topic of ['topic-a', 'topic-b']) writeFileSync(`${bundle}/seed_topics/${topic}.md`, `# ${topic}\n\n## Wave2 Judgment\nDirect targeted evidence should fail.\n\n## Pending Questions\n- [open] W2F-001\n`);
appendTrace(bundle, { event: 'wave2_completion', source: 'case-235-direct' });
JS
set +e
node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle "$B_DIRECT" --current-node phases/phase-wave2.md > "$B_DIRECT/case-235-gate-direct.json"
DIRECT_STATUS=$?
set -e
test "$DIRECT_STATUS" = "1"
```

## Step 3: [MAIN/SHELL] Submitted Targeted Evidence Passes

```bash
B_SUBMITTED=$(node experiments_env/shared/new-disposable-bundle.mjs w2_submitted_cross_ref --case case-235 --force)
node --input-type=module - "$B_SUBMITTED" <<'JS'
import {
  enqueueWorkUnitTask,
  queueItemForWorkUnit,
  referenceContent,
  submitWorkUnitViaCli,
  writeFixtureResultForWorkUnit,
  writeWave2Scaffold,
  appendTrace
} from './experiments_env/shared/work-unit-playbook-utils.mjs';
import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const bundle = process.argv[2];
writeWave2Scaffold(bundle, { planBasename: 'w2_submitted_cross_ref' });
enqueueWorkUnitTask(bundle, queueItemForWorkUnit({
  phase: 'wave2',
  queue_item_id: 'wave2-targeted-W2F-001',
  finding_id: 'W2F-001',
  title: 'Submitted targeted evidence for W2F-001'
}), { fileName: 'case235-targeted.json' });
const claim = JSON.parse(spawnSync(process.execPath, ['DPT_FRAMEWORK/cli/operate-work-unit.mjs', 'claim', bundle, '--phase', 'wave2'], { encoding: 'utf8' }).stdout);
const workId = claim.claimed_work_ids[0];
const fixture = writeFixtureResultForWorkUnit(bundle, {
  work_id: workId,
  output_path: 'reference/00-cross-market-shift.md',
  source_url: 'https://research-source.test/wave2/market-shift',
  source_slug: 'market-shift',
  output_content: referenceContent({ source_url: 'https://research-source.test/wave2/market-shift', topic_slug: 'cross-topic', title: 'Submitted Cross Reference' }),
  cache_trails: ['_cache/wave2/primary/W2F-001/market-shift']
});
const submit = submitWorkUnitViaCli(bundle, { work_id: workId, resultPath: fixture.resultPath });
writeFileSync(`${bundle}/case-235-submit.json`, `${JSON.stringify({ claim, submit }, null, 2)}\n`);
writeFileSync(`${bundle}/artifacts/wave2/synthesis.md`, '# Cross-Topic Synthesis\n\nW2F-001 uses [Topic A](../wave1/topic-a/evidence-summary.md) and submitted targeted evidence.\n');
writeFileSync(`${bundle}/artifacts/wave2/cross-topic-ledger.md`, '# Cross-Topic Ledger\n\n## Cross-Topic Scan Matrix\n\n| pair_id | topics | checked_dimensions | finding_ids | notes |\n| --- | --- | --- | --- | --- |\n| P01 | topic-a + topic-b | emergent_question | W2F-001 | targeted evidence submitted |\n\n## Wave1 Legacy Questions\n\nOne open gap repaired.\n\n## Cross-Topic Resolutions\n\nW2F-001 resolved after submit.\n\n## Emergent Cross-Topic Questions\n\nW2F-001 required search.\n\n## Exploration Decisions\n\nW2F-001: explore_search submitted.\n\n## HITL2 Handoff\n\nNone.\n');
writeFileSync(`${bundle}/artifacts/wave2/finding-index.yaml`, `version: "0.1"\nsource_layer: wave2_cross_topic\nledger: artifacts/wave2/cross-topic-ledger.md\nsynthesis: artifacts/wave2/synthesis.md\nscan: { topics: [topic-a, topic-b], topic_count: 2, pair_count_expected: 1, pair_count_checked: 1 }\nfindings:\n  - id: W2F-001\n    type: cross_topic_emergent_question\n    status: resolved\n    decision: explore_search\n    affected_topics: [topic-a, topic-b]\n    origin_refs: [artifacts/wave1/topic-a/question-list.md]\n    trigger_refs: [artifacts/wave1/topic-b/evidence-summary.md]\n    search_required: true\n    subagent_receipt_refs:\n      - ${fixture.record.paths.runtime_receipt_ref}\n    appears_in_synthesis: true\n    hitl2_handoff: false\n`);
for (const topic of ['topic-a', 'topic-b']) writeFileSync(`${bundle}/seed_topics/${topic}.md`, `# ${topic}\n\n## Wave2 Judgment\nSubmitted targeted evidence supports W2F-001.\n\n## Pending Questions\n- [resolved]\n`);
appendTrace(bundle, { event: 'wave2_completion', source: 'case-235-submitted' });
JS
node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle "$B_SUBMITTED" --current-node phases/phase-wave2.md > "$B_SUBMITTED/case-235-gate-submitted.json"
```

## Step 4: [MAIN/SHELL] Record Verdict

```bash
node --input-type=module - "$B_PURE" "$B_DIRECT" "$B_SUBMITTED" <<'JS'
import { readFileSync } from 'node:fs';
import { readWorkUnitLedgerRows, recordPlaybookCheck, writeTraceVerdict } from './experiments_env/shared/work-unit-playbook-utils.mjs';
const [pure, direct, submitted] = process.argv.slice(2);
const pureGate = JSON.parse(readFileSync(`${pure}/case-235-gate-pure.json`, 'utf8'));
const directGate = JSON.parse(readFileSync(`${direct}/case-235-gate-direct.json`, 'utf8'));
const submittedGate = JSON.parse(readFileSync(`${submitted}/case-235-gate-submitted.json`, 'utf8'));
const pureRows = readWorkUnitLedgerRows(pure).filter((row) => row.wave === 2);
const submittedRows = readWorkUnitLedgerRows(submitted).filter((row) => row.wave === 2);
recordPlaybookCheck(pure, { gate: 'wave2-pure-pass-no-ledger', passed: pureGate.check?.passed === true && pureRows.length === 0, detail: `${pureRows.length} Wave2 row(s)` });
recordPlaybookCheck(pure, { gate: 'wave2-direct-cross-ref-fails', passed: directGate.check?.passed === false && /work-unit|coverage|bypass/i.test(JSON.stringify(directGate.inspect || [])), detail: JSON.stringify(directGate.inspect || []) });
recordPlaybookCheck(pure, { gate: 'wave2-submitted-cross-ref-passes', passed: submittedGate.check?.passed === true && submittedRows.length === 1, detail: JSON.stringify(submittedRows.map((row) => row.work_id)) });
const verdict = writeTraceVerdict(pure, 'case-235');
console.log(JSON.stringify(verdict, null, 2));
process.exit(verdict.ok ? 0 : 1);
JS
```

## Optional Automation Smoke

```bash
node experiments_env/shared/run-fixture-backed-case.mjs --case case-235 --target-dir tests/.test-bundles --cleanup-pass
```

## Cleanup

PASS only:

```bash
node -e 'const fs=require("fs"); const v=JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.exit(v.ok ? 0 : 1)' "$B_PURE/case-235-verdict.json"
rm -rf "$B_PURE" "$B_DIRECT" "$B_SUBMITTED"
```
