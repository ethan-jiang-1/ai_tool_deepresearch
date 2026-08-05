---
schema: command-experiment/v2
experiment: evidence-extraction
case: case-163-heavy-rerun-add-real-cache-trail
case_goal: "Real Agent canary: prove two rerun-added Topics use the normal Wave0/Wave1 pipeline, actionable Gate hints, supplementary submitted-output lineage, and hash-identical declaration recovery."
verdict_mode: all
required_checks: [real-subagent-continuation, rerun-two-topics-added, cache-trail-preserved, same-gate-repair-recovered, wave2-complete]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: heavy
durable_evidence_roles: [subject_task, subject_result, subject_receipt, subject_output]
proof_subject: agent_behavior
subject_execution: real_subagent
fixture: setup_only
runtime: real_disposable_bundle
external_calls: real
verdict_judge: deterministic
req: AGT-009, EEX-003, EEX-004, RWP-014, WPG-001, WAI-005, CHI-001
not_run_if: "A required native Sub-agent or real search/fetch capability is unavailable."
---

<!-- @impl EXA-003, EXA-005, EXA-006, EXA-007, EXA-008, PLR-003, VER-006 -->

## Execution Contract

Heavy real-Agent continuation canary. The fixture boundary ends with two historical Topics that already completed a normal run and a recorded HITL2 decision to rerun. Those historical fixture facts are prerequisite only: they do not prove Agent research, rerun behavior, Gate repair, or recovery.

After that boundary, PASS requires the production path. The coding Agent must use the real HITL2 Gate/route witness and `operate-topic-state apply` to add exactly two Topics, then execute their real Wave0 and Wave1 work units through claim, dry-submit, formal submit, reference/depth materialization, Gate feedback, and declaration recovery. No fixture may prewrite either new Topic's result, receipt, cache leaf, evidence/reference output, `source.yaml`, depth review, ledger row, or recovery row.

If real Agent/sub-agent plus search/fetch capability is unavailable, pass a non-empty reason to the one native finalizer boundary and stop. It records `NOT_RUN`; the Autorun Supervisor preserves the bundle. `NOT_RUN` is not PASS. Never replace an unavailable actor with parent-written semantic output, hand-written receipt/result/provenance, or a fixture smoke.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Runtime context | One clean disposable bundle from shared experiment setup; the same bundle continues through Wave0, Wave1, fault, and recovery |
| Historical fixture | Two old Topics and their normal-run submitted substrate only; excluded from real-Agent proof checks. Historical fixture rows are excluded from real-Agent checks. |
| Rerun mutation | Real `hitl2-recorded` Gate handoff, `enter-phase`, status sync, and `operate-topic-state apply` for two new Topics |
| Framework path | Normal queue enqueue, role-bound work-unit claim, dry-submit, formal submit, Wave inspect/Gate, and existing-owner `recover-declaration` |
| Agent actor | Required for both new Topics in Wave0/Wave1 and one supplementary Wave1 attempt |
| External calls | Real search/fetch or an accepted actor-recorded degradation chain is required |
| Fault injection | Deletes one real submitted ledger row after recording its exact bytes/hash; does not construct replacement authority |
| Verdict source | Real CLI JSON, restored row/hash comparison, runtime artifacts, and trace `check` events |
| Does not prove | Historical fixture research quality, all Topic kinds, or production-scale source quality |

# case-163-heavy-rerun-add-real-cache-trail

## Expected Runtime Path

1. Create a clean disposable bundle and stage only the two-Topic historical normal-run prerequisite.
2. Run the real HITL2 Gate, enter rerun, and atomically add `economic-impact` plus `workforce-transition` through topic-state.
3. Pass `rerun-ready`, enter Wave0, enqueue/claim both new Topics through the normal producer path, and dispatch real actors.
4. Dry-submit and formally submit both Wave0 results; deliberately trigger one repairable Wave0 Gate failure, let the Agent repair only from `hints[]`, and rerun the same Gate.
5. Enter Wave1; execute one initial deepening attempt for each new Topic plus one supplementary attempt that cites contract-authorized prior submitted `evidence_summary`.
6. The Phase Agent materializes tolerant complete references, the accepted index table, and minimal depth reviews derived from reviewed submitted rows.
7. Pass the read-only Wave1 inspect, record `wave1_completion`, then delete one real Wave1 declaration row before the first formal Wave1 Gate attempt.
8. Observe the single declaration parent hint, restore only through `recover-declaration`, and rerun the same formal Wave1 Gate to its first PASS.
9. Invoke native completion and stop; the Autorun Supervisor owns health, preservation, and any requested clean-PASS cleanup. FAIL and NOT_RUN preserve the bundle.

## Step 1: [MAIN/SHELL] Stage Historical Normal-Run Prerequisite

Create the disposable bundle with the approved shared setup. Stage two historical Topics (`ai-regulation`, `ai-safety-research`) through the existing fixture-backed work-unit helpers. Fixture outputs must pass the real submit boundary, but their source is explicitly `historical-fixture-prerequisite` and they must never be counted as real new-Topic Agent evidence.

The setup must finish with:

- exactly two registered historical Topic UIDs and no `economic-impact` or `workforce-transition` registry entry;
- hash-valid submitted historical Wave0/Wave1 rows and consumer references for those two Topics;
- a fixture-backed Wave2→HITL2 entry prerequisite and recorded rerun decision;
- `rb_status.json` at `wave2_complete -> hitl2_recorded`, current node `phases/phase-hitl2.md`;
- a snapshot of historical reference paths/hashes in `case-163-historical-reference-hashes.json`; and
- no new-Topic result/receipt/cache/evidence/reference/source/depth path.

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs eex_real_agent_rerun_add --case case-163 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
node --input-type=module - "$B" <<'JS'
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  appendTrace,
  claimAndSubmitFixtureWorkUnit,
  referenceContent,
  readTrace,
  sourceYamlExtra,
  wave1EvidenceSummaryContent,
  wave1QuestionListContent,
  writeMinimalStatus,
  writeWave0Scaffold,
  writeWave1Scaffold,
} from './experiments_env/shared/work-unit-playbook-utils.mjs';

const bundle = process.argv[2];
const topics = [
  { id: '01', slug: 'ai-regulation', title: 'AI Regulation' },
  { id: '02', slug: 'ai-safety-research', title: 'AI Safety Research' },
];
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const referenceWithReturnMap = ({ sourceUrl, topicSlug, title, refPath, nextHop }) => [
  referenceContent({ source_url: sourceUrl, topic_slug: topicSlug, title }),
  '## Return Map',
  '',
  `- evidence_meaning: ${title} supplies accepted historical prerequisite evidence for ${topicSlug}.`,
  '  relationship: supports',
  '  refs:',
  `    - ${refPath}`,
  '  status: supported',
  `  next_hop: ${nextHop}`,
  '',
].join('\n');
const artifactWithReturnMap = ({ content, meaning, refs, nextHop }) => [
  content,
  '## Return Map',
  '',
  `- evidence_meaning: ${meaning}`,
  '  relationship: supports',
  '  refs:',
  ...refs.map((ref) => `    - ${ref}`),
  '  status: supported',
  `  next_hop: ${nextHop}`,
  '',
].join('\n');

writeWave0Scaffold(bundle, {
  planBasename: 'eex_real_agent_rerun_add',
  topics,
  referenceRows: topics.map((topic) =>
    `| 00-shared-${topic.slug}.md | primary | practitioner | Tier 2 | ${topic.slug} | wave0_foundation | accepted | 2026-07-06 |`),
});
for (const topic of topics) {
  const sourceUrl = `https://historical-fixture.test/${topic.slug}/wave0/article`;
  const outputPath = `reference/00-shared-${topic.slug}.md`;
  claimAndSubmitFixtureWorkUnit(bundle, {
    phase: 'wave0',
    queue_item_id: `case163-history-w0-${topic.slug}`,
    topic_slug: topic.slug,
    title: `Historical fixture Wave0 for ${topic.title}`,
    output_path: outputPath,
    output_content: referenceWithReturnMap({
      sourceUrl,
      topicSlug: topic.slug,
      title: `${topic.title} Historical Wave0 Source`,
      refPath: outputPath,
      nextHop: `Read artifacts/wave0/${topic.slug}/source.yaml, then continue to Wave1.`,
    }),
    source_url: sourceUrl,
    source_slug: 's01_historical',
    extra_output_files: [sourceYamlExtra(topic.slug, sourceUrl, `${topic.title} Historical Source`)],
  });
}

writeWave1Scaffold(bundle, { planBasename: 'eex_real_agent_rerun_add', topics });
for (const topic of topics) {
  const sourceUrl = `https://historical-fixture.test/${topic.slug}/wave1/article`;
  const outputPath = `reference/01-${topic.slug}-deepening.md`;
  const evidencePath = `artifacts/wave1/${topic.slug}/evidence-summary.md`;
  const questionPath = `artifacts/wave1/${topic.slug}/question-list.md`;
  claimAndSubmitFixtureWorkUnit(bundle, {
    phase: 'wave1',
    queue_item_id: `case163-history-w1-${topic.slug}`,
    topic_slug: topic.slug,
    title: `Historical fixture Wave1 for ${topic.title}`,
    output_path: outputPath,
    output_content: referenceWithReturnMap({
      sourceUrl,
      topicSlug: topic.slug,
      title: `${topic.title} Historical Wave1 Source`,
      refPath: outputPath,
      nextHop: `Read artifacts/wave1/${topic.slug}/evidence-summary.md, then continue to Wave2.`,
    }),
    source_url: sourceUrl,
    source_slug: 's01_historical',
    extra_output_files: [
      {
        path: evidencePath,
        role: 'evidence_summary',
        content: artifactWithReturnMap({
          content: wave1EvidenceSummaryContent({ topic_slug: topic.slug, title: topic.title, source_url: sourceUrl }),
          meaning: `${topic.title} historical evidence summary records the normal-run prerequisite judgment.`,
          refs: [outputPath, evidencePath],
          nextHop: `Review ${questionPath}, then continue to Wave2.`,
        }),
      },
      {
        path: questionPath,
        role: 'question_list',
        content: artifactWithReturnMap({
          content: wave1QuestionListContent({ topic_slug: topic.slug, source_url: sourceUrl }),
          meaning: `${topic.title} historical question list records the remaining normal-run handoff.`,
          refs: [outputPath, evidencePath, questionPath],
          nextHop: 'Continue to the recorded HITL2 decision.',
        }),
      },
    ],
  });
}

for (const topic of topics) {
  const seedPath = path.join(bundle, 'seed_topics', `${topic.slug}.md`);
  writeFileSync(seedPath, [
    readFileSync(seedPath, 'utf8').trimEnd(),
    '',
    '## Return Map',
    '',
    `- evidence_meaning: Historical normal-run evidence establishes the prerequisite baseline for ${topic.slug}.`,
    '  relationship: supports',
    '  refs:',
    `    - reference/01-${topic.slug}-deepening.md`,
    `    - artifacts/wave1/${topic.slug}/evidence-summary.md`,
    '  status: supported',
    '  next_hop: Continue to the recorded HITL2 decision.',
    '',
  ].join('\n'));
}

writeFileSync(path.join(bundle, 'reference/_INDEX.md'), [
  '| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |',
  '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ...topics.flatMap((topic) => [
    `| 00-shared-${topic.slug}.md | primary | practitioner | Tier 2 | ${topic.slug} | wave1_topic | accepted | 2026-07-06 |`,
    `| 01-${topic.slug}-deepening.md | secondary | practitioner | Tier 2 | ${topic.slug} | wave1_topic | accepted | 2026-07-06 |`,
  ]),
  '',
].join('\n'));

mkdirSync(path.join(bundle, 'artifacts/hitl2'), { recursive: true });
writeFileSync(path.join(bundle, 'artifacts/hitl2/decision-brief.md'), [
  '# Final Review Decision Brief',
  '',
  '## Key Findings',
  'The historical normal-run prerequisite covered two Topics.',
  '',
  '## Open Questions',
  'Economic impact and workforce transition remain uncovered.',
  '',
  '## Recommended Actions',
  'Enter rerun and add the two recorded Topics.',
  '',
].join('\n'));
writeFileSync(path.join(bundle, 'rb_profile.yaml'), [
  'plan_basename: eex_real_agent_rerun_add',
  'research_profile: debug',
  'root_must_answer_set:',
  '  - What are the economic and workforce consequences of AI safety measures?',
  'research_access:',
  '  status: available',
  '  probed_at: "2026-07-14T00:00:00.000Z"',
  '  result_url: "https://historical-fixture.test/case-163-prerequisite"',
  '  fetch_outcome: success',
  'human_decision_checkpoints:',
  '  hitl1:',
  '    status: recorded',
  '    recorded_at: "2026-07-14T00:00:00.000Z"',
  '  hitl2:',
  '    status: recorded',
  '    answerability_class: ready_insufficient_judgment',
  '    user_decision: rerun',
  '    final_report_view: profile_default',
  '    rationale: Add economic-impact and workforce-transition coverage.',
  '    rerun_count: 0',
  '',
].join('\n'));
writeMinimalStatus(bundle, {
  current_gate: 'wave2_complete',
  next_gate: 'hitl2_recorded',
  current_node: 'phases/phase-hitl2.md',
});
const sourceAttemptIndex = readTrace(bundle).length;
appendTrace(bundle, {
  event: 'gate_attempt',
  gate: 'wave2-complete',
  phase: 'wave2',
  passed: true,
  currentNodeRef: 'phases/phase-wave2.md',
  next: 'phases/phase-hitl2.md',
  source: 'historical-fixture-prerequisite',
});
appendTrace(bundle, {
  event: 'load_complete',
  entry: 'phases/phase-hitl2.md',
  handoff_source_gate: 'wave2-complete',
  handoff_source_node: 'phases/phase-wave2.md',
  handoff_target_node: 'phases/phase-hitl2.md',
  handoff_source_attempt_index: sourceAttemptIndex,
  source: 'historical-fixture-prerequisite',
});
appendTrace(bundle, { event: 'hitl2_recorded', source: 'historical-fixture-prerequisite' });

const historyHashes = Object.fromEntries(
  readdirSync(path.join(bundle, 'reference'))
    .filter((name) => name.endsWith('.md') && !name.startsWith('_') && name !== 'README.md')
    .map((name) => [name, sha256(readFileSync(path.join(bundle, 'reference', name)))])
);
writeFileSync(path.join(bundle, 'case-163-historical-reference-hashes.json'), `${JSON.stringify(historyHashes, null, 2)}\n`);
JS
node DEEP_RESEARCH_HARNESS/cli/apply-research-style.mjs --bundle "$B" --style debug > "$B/case-163-history-style.json"
node DEEP_RESEARCH_HARNESS/cli/validate-bundle.mjs "$B"
node DEEP_RESEARCH_HARNESS/cli/inspect-bundle.mjs "$B"
node DEEP_RESEARCH_HARNESS/cli/inspect-wave0-output.mjs --bundle "$B" > "$B/case-163-history-wave0-inspect.json"
node DEEP_RESEARCH_HARNESS/cli/inspect-wave1-output.mjs --bundle "$B" > "$B/case-163-history-wave1-inspect.json"
echo "BUNDLE=$B"
```

Expected: validation/inspection succeeds, both production Wave inspectors pass the historical prerequisite under the unchanged `debug` profile, and a recursive check finds no path containing either new Topic slug outside the case's approved semantic input file.

## Step 2: [MAIN/SHELL] Enter Real Rerun And Add Two Topics

Run the formal HITL2 Gate and consume its real handoff. Do not hand-write the `hitl2-recorded` Gate attempt or rerun `load_complete` witness.

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-hitl2-recorded.mjs --bundle "$B" --current-node phases/phase-hitl2.md > "$B/case-163-hitl2-gate.json"
node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle "$B" --node phases/phase-rerun.md > "$B/case-163-enter-rerun.md"
node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle "$B" --to hitl2_recorded > "$B/case-163-hitl2-status.json"
```

Create `case-163-topic-change.json` as the recorded rerun semantic input:

```json
{
  "context": "rerun",
  "actions": [
    {
      "action": "add_topic",
      "title": "Economic Impact of AI Safety",
      "slug_stem": "economic-impact",
      "must_answer": ["What economic effects and compliance costs follow from AI safety measures?"],
      "scope_role": "primary",
      "depends_on_topic_uids": []
    },
    {
      "action": "add_topic",
      "title": "Workforce Transition Under AI Safety Measures",
      "slug_stem": "workforce-transition",
      "must_answer": ["How do AI safety measures change workforce roles, skills, and transition costs?"],
      "scope_role": "supporting",
      "depends_on_topic_uids": []
    }
  ]
}
```

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs apply --bundle "$B" --input "$B/case-163-topic-change.json" > "$B/case-163-topic-apply.json"
node DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs inspect --bundle "$B" > "$B/case-163-topic-inspect.json"
node DEEP_RESEARCH_HARNESS/cli/apply-research-style.mjs --bundle "$B" --style debug > "$B/case-163-style.json"
```

Read the canonical UIDs/current slugs from `case-163-topic-inspect.json`; `slug_stem` is only semantic input. In this fixture the expected current slugs are `03_economic-impact` and `04_workforce-transition`, and every later queue/output/cache/depth/reference coordinate must use those returned values rather than the bare stems.

The Agent then increments `rb_profile.yaml#/human_decision_checkpoints/hitl2/rerun_count` from `0` to `1` and adds one `## 本轮重跑方向` section to each new seed from the recorded semantic input. This is Agent-owned guidance, not registry/seed identity authority; do not edit canonical UID/id/slug fields.

Expected: topic-state commits one atomic plan+seed change. Each new UID-bound seed has the normal complete skeleton and five wave-specific placeholders; style params are recomputed for four Topics; queue, work-unit index, and submitted ledger bytes are unchanged by topic-state apply.

## Step 3: [MAIN/SHELL] Pass Rerun And Seed-Topics Gates, Then Claim Normal Wave0 Work

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-rerun-ready.mjs --bundle "$B" --current-node phases/phase-rerun.md > "$B/case-163-rerun-gate.json"
node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle "$B" --node phases/phase-seed-topics.md > "$B/case-163-enter-seed-topics.md"
node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle "$B" --to rerun_ready > "$B/case-163-rerun-status.json"
node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-seed-topics-ready.mjs --bundle "$B" --current-node phases/phase-seed-topics.md > "$B/case-163-seed-topics-gate.json"
node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle "$B" --node phases/phase-wave0.md > "$B/case-163-enter-wave0.md"
node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle "$B" --to seed_topics_ready > "$B/case-163-seed-topics-status.json"
node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs open-batch "$B" --phase wave0 --reason rerun_added_topics > "$B/case-163-wave0-open-batch.json"
```

The Phase Agent now follows `phase-wave0.md`: classify the two new Topics from direct facts, enqueue exactly one standard `wave0_source_intake` demand per new Topic, perform a bounded current role probe, and call `operate-work-unit claim`. Historical covered Topics are reuse; no orphan file can suppress a new demand. Save returned work IDs and immutable beacon hashes in `case-163-wave0-claims.json`.

When the experiment helper constructs these real queue cards, it must override the fixture defaults. `action` must describe real source intake for the exact canonical Topic, and `writes_to` must name that Topic's unique reference/source coordinates (for example `reference/00-shared-03_economic-impact.md` plus `artifacts/wave0/03_economic-impact/source.yaml`). A task that still says `Fixture-backed controlled work-unit task` or shares `reference/work-unit-fixture.md` is setup failure: abandon it before Agent execution and enqueue a fresh legal demand; do not submit or retrofit its provenance.

Expected: two ordinary Wave0 work units, with canonical absolute `bundle_dir`, generated Result Starter/checklist, and no rerun-specific kind, output contract, validator, or Gate branch.

## Step 4: [MAIN->AGENT] Execute Both Real Wave0 Work Units

Dispatch a real Agent/sub-agent for each generated Wave0 task. Each actor must:

- read its generated task, manifest, immutable beacon, result schema, and runtime receipt path;
- perform real source discovery/fetching for only its assigned Topic;
- write its own `source.yaml`, declared reference output(s), three-file cache leaves, runtime receipt, and result JSON under the exact current run bundle root;
- render every reference from the loaded shared reference semantic contract, including non-empty required sections and exact canonical Topic binding;
- write valid return-map entries using `relationship: supports|refutes|partial|opens|defers|context` and `status: supported|refuted|partial|open|emergent|deferred` rather than free-form prose;
- use the Result Starter contract without overwriting Engine-owned envelope files;
- verify every declared output and cache leaf before return; and
- return only the actual result path.

The main controller must not prewrite, repair after the fact, or copy these semantic/provenance surfaces. Do not hardcode `passed: true`. If either actor/result is unavailable, record the non-empty reason for native finalization, produce `NOT_RUN`, and stop; the Supervisor preserves the bundle. There is intentionally no fixture-backed automation command that can turn this heavy canary green.

After the first successful new-Topic native Sub-agent returns, write `case-163-subagent-evidence.json` as a path-only index with exact absolute `task`, `result`, `receipt`, and one Subject-written declared `output` path. These paths must come from that work unit's generated prompt refs and returned result, not from a fixture or parent-authored substitute. If a required native actor/search/fetch capability is unavailable, instead write `case-163-subject-unavailable.txt` with a non-empty reason and skip directly to native completion.

## Step 5: [MAIN/SHELL] Dry-Submit Then Submit Wave0 Results

For each returned pair `<work-id> <real-result-path>`:

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs dry-submit "$B" --work-id <work-id> --result <real-result-path>
node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs submit "$B" --work-id <work-id> --result <real-result-path>
```

The Agent owns ordinary repair: if dry-submit returns violations, use only their `repair_kind`, `missing_fact`, `write_to`, and `rerun`, repair the same candidate/assigned surface, and rerun the same dry-submit. Do not ask the user to run commands and do not hand-edit ledger/index/status/beacon/hash authority.

Expected: both new Topics have real Engine-written submitted Wave0 rows, complete cache trails, and normal output coverage.

## Step 6: [MAIN/SHELL -> AGENT] Prove Gate Hint Repair

Inject one reversible presentation-independent artifact fault only after the valid Wave0 submits: move `reference/README.md` to `case-163-fault-reference-README.md`. Run the formal Wave0 Gate while preserving its JSON even on nonzero exit.

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
mv "$B/reference/README.md" "$B/case-163-fault-reference-README.md"
node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-wave0-complete.mjs --bundle "$B" --current-node phases/phase-wave0.md > "$B/case-163-wave0-failed.json" || true
```

The Agent reads `case-163-wave0-failed.json` and must use the primary `hints[]` only: confirm a complete `rule_id/repair_kind/missing_fact/write_to/rerun`, execute the authorized repair, and invoke the exact same checkpoint named by `rerun`. It must not inspect Engine source, infer repair kind from a path, or ask the user to restore the file.

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
# After the Agent has performed the hinted repair:
node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-wave0-complete.mjs --bundle "$B" --current-node phases/phase-wave0.md > "$B/case-163-wave0-passed.json"
node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs --bundle "$B" --node phases/phase-wave1.md > "$B/case-163-enter-wave1.md"
node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle "$B" --to wave0_complete > "$B/case-163-wave0-status.json"
```

Expected: first Gate fails on one direct parent root, second same Gate passes, and the two Gate JSON files preserve the repair proof without a second validator.

## Step 7: [MAIN->AGENT] Run Normal Wave1 And One Supplement

The Wave1 Phase Agent loads `shared/shared-reference-template`, opens the next historical batch through `operate-work-unit open-batch "$B" --phase wave1 --reason rerun_added_topics`, enqueues one normal `wave1_topic_deepening` demand for each new Topic, performs role-bound claim, and dispatches real actors. Each actor writes real `evidence_summary`, `question_list`, current source/cache claims, receipt, result, and cache leaves, then returns through dry-submit and formal submit exactly as in Steps 4-5.

After the initial `economic-impact` attempt submits, enqueue one normal supplementary `wave1_topic_deepening` demand for that same canonical Topic. Its generated `Completion Contract -> Cache And Source Facts` must list the exact prior submitted `evidence_summary`. The supplementary actor may cite that exact path in `source_claims[].source_ref` without redeclaring or overwriting it, while all new cache/degraded refs remain current-attempt declarations. Wrong Topic/wave/kind/role or filesystem-only paths remain invalid.

If any required real actor/search/fetch result is unavailable, record `NOT_RUN`, preserve the same bundle, and stop. No fixture writer may fill the missing result.

Expected: three new-Topic Wave1 submits (two initial plus one supplement), with one prior-output source claim accepted through the normal submit validator.

## Step 8: [MAIN/AGENT] Materialize Minimal Depth And Tolerant References

From the reviewed hash-valid submitted rows, the Phase Agent:

- writes one complete consumer reference per accepted source using the actually loaded shared template;
- updates the accepted eight-column `reference/_INDEX.md` table;
- writes each new Topic's `depth-review.yaml` with only canonical topic binding, `reviewed_work_unit_refs[]`, non-derivable depth/profile judgments, decision, and supplementary IDs; and
- does not copy submitted `source_claims`, accepted URL arrays, cache refs, Wave0 URL arrays, novelty arrays, or derived floor fields into a second blocking truth.

Harmless heading case/level/order/list differences are allowed; all required semantic sections remain non-empty. Run the read-only inspect first. Only after it passes, record the accepted completion evidence through the normal Engine operation. Do not invoke the formal Wave1 Gate yet, because the declaration fault must be injected before that Gate creates a Wave2 handoff:

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DEEP_RESEARCH_HARNESS/cli/inspect-wave1-output.mjs --bundle "$B" > "$B/case-163-wave1-inspect.json"
node DEEP_RESEARCH_HARNESS/cli/log-event.mjs --bundle "$B" --event wave1_completion > "$B/case-163-wave1-completion.json"
```

Expected: inspect passes using submitted backing, prior source lineage, minimal depth derivation, and shared reference parsing. The completion event is present, but no successful formal Wave1 Gate attempt or Wave2 handoff exists before fault injection.

## Step 9: [MAIN/SHELL] Inject Declaration Fault And Recover

Choose the real submitted supplementary Wave1 work ID. Before mutation, store its exact ledger row, `ledger_record_hash`, recorded index/status hashes, queue terminal facts, and the complete ledger bytes in `case-163-declaration-fault-before.json`. Then perform the sole allowed fault injection: rewrite the disposable ledger with only that one row removed. Do not modify result, receipt, output, cache, queue, index, status, trace, or hashes, and do not construct a replacement row.

Run the first formal Wave1 Gate attempt and preserve the expected failure JSON:

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-wave1-complete.mjs --bundle "$B" --current-node phases/phase-wave1.md > "$B/case-163-wave1-missing-declaration.json" || true
```

Expected: one `submitted_declaration_missing:<work-id>` parent root, `repair_kind: engine_operation`, exact absolute `recover-declaration` coordinate, and masking of dependent output/cache/count/depth/bypass symptoms. Reconstruction facts do not make the Gate pass. A `handoff_target_mismatch` result means the playbook invoked a successful formal Gate too early and is invalid evidence.

The Agent executes the exact existing-owner operation from the hint:

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs recover-declaration "$B" --work-id <supplementary-work-id> > "$B/case-163-recovery.json"
node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-wave1-complete.mjs --bundle "$B" --current-node phases/phase-wave1.md > "$B/case-163-wave1-restored.json"
```

Expected: the restored row is byte-semantically/hash identical to the recorded pre-fault row, index/status/queue hashes remain unchanged, recovery audit stays outside the row, and the same normal Wave1 Gate reaches its first PASS and creates the Wave2 handoff. No manual row/hash, replacement attempt, or recovery-specific Gate success branch exists.

## Step 10: [PLAYBOOK AGENT] Complete the current Wave2

Consume the successful restored Wave1 Gate's `check.next`, enter `phases/phase-wave2.md`, and synchronize `wave1_complete`. Execute the loaded production Wave2 phase over the four current Topics, including its normal queue/drain mechanics and required synthesis/ledger/finding-index surfaces. Run the real `wave2-complete` Gate only after the phase is drained and retain its JSON as `case-163-wave2-complete.json`. Historical pre-rerun Wave2 bytes or Gate attempts cannot satisfy this step.

## Step 11: [MAIN/SHELL] Record five native checks and finalize once

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
EXTRA_ARGS=()
if [ -f "$B/case-163-subject-unavailable.txt" ]; then
  EXTRA_ARGS+=(--not-run-reason "required native Sub-agent or real search/fetch capability unavailable")
else
  node --input-type=module - "$B" <<'JS'
import { existsSync, appendFileSync, readFileSync, statSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
const [bundle] = process.argv.slice(2);
const evidence = JSON.parse(readFileSync(join(bundle, 'case-163-subagent-evidence.json')));
for (const key of ['task','result','receipt','output']) if (!isAbsolute(evidence[key]) || !existsSync(evidence[key]) || statSync(evidence[key]).size === 0) throw new Error(`invalid Subject evidence path: ${key}`);
const task = JSON.parse(readFileSync(evidence.task));
const result = JSON.parse(readFileSync(evidence.result));
const receipts = readFileSync(evidence.receipt, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const rows = readFileSync(join(bundle, 'rb_output_declarations.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const planRaw = readFileSync(join(bundle, 'rb_plan.md'), 'utf8');
const plan = parseYaml(planRaw.match(/^---\n([\s\S]*?)\n---/)[1]);
const slugs = new Set((plan.topic_registry || []).map((topic) => topic.slug));
const workId = result.work_id;
const row = rows.find((entry) => entry.work_id === workId);
const receipt = receipts.find((entry) => entry.work_id === workId);
const outputBound = (result.output_files || []).some((entry) => resolve(bundle, entry.path) === resolve(evidence.output));
const cachePaths = (result.cache_trails || []).flatMap((entry) => typeof entry === 'string' ? [entry] : Object.values(entry || {}).filter((value) => typeof value === 'string'));
const wave0Failed = JSON.parse(readFileSync(join(bundle, 'case-163-wave0-failed.json')));
const wave0Passed = JSON.parse(readFileSync(join(bundle, 'case-163-wave0-passed.json')));
const wave1Failed = JSON.parse(readFileSync(join(bundle, 'case-163-wave1-missing-declaration.json')));
const wave1Passed = JSON.parse(readFileSync(join(bundle, 'case-163-wave1-restored.json')));
const wave2 = JSON.parse(readFileSync(join(bundle, 'case-163-wave2-complete.json')));
const checks = [
  ['real-subagent-continuation', task.work_id === workId && receipt?.work_id === workId && outputBound && row?.actor_execution?.execution_actor_class === 'delegated_subagent'],
  ['rerun-two-topics-added', [...slugs].some((slug) => slug.endsWith('economic-impact')) && [...slugs].some((slug) => slug.endsWith('workforce-transition'))],
  ['cache-trail-preserved', Boolean(row) && cachePaths.length > 0 && cachePaths.every((path) => existsSync(resolve(bundle, path)))],
  ['same-gate-repair-recovered', wave0Failed.check?.passed === false && wave0Passed.check?.passed === true && wave1Failed.check?.passed === false && wave1Passed.check?.passed === true],
  ['wave2-complete', wave2.check?.passed === true && wave2.check?.next === 'phases/phase-hitl2.md'],
];
for (const [gate, passed] of checks) appendFileSync(join(bundle, 'rb_trace.jsonl'), `${JSON.stringify({ ts:new Date().toISOString(), event:'check', source:'playbook', gate, passed, expected:true })}\n`);
JS
  TASK=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.task)' "$B/case-163-subagent-evidence.json")
  RESULT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.result)' "$B/case-163-subagent-evidence.json")
  RECEIPT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.receipt)' "$B/case-163-subagent-evidence.json")
  OUTPUT=$(node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1]));process.stdout.write(x.output)' "$B/case-163-subagent-evidence.json")
  EXTRA_ARGS+=(--evidence "subject_task=$TASK" --evidence "subject_result=$RESULT" --evidence "subject_receipt=$RECEIPT" --evidence "subject_output=$OUTPUT")
fi
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B" "${EXTRA_ARGS[@]}"
```

PASS requires all five current-run checks. A fixture-only or missing-actor run is `NOT_RUN`, never PASS. Stop after native completion. The Autorun Supervisor owns Heavy health, durable Subject-evidence export, audit, preservation, and optional clean-PASS cleanup.
