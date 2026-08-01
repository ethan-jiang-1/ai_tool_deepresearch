---
schema: command-experiment/v2
experiment: wfn-seedtopic
case: case-201-standard-seedtopics-queue-loop
case_goal: "Prove the deterministic seed-topic queue loop enqueues, claims, materializes, completes and drains three tasks before the real seed-topics-ready Gate passes."
verdict_mode: last
required_checks: [seedtopic-enqueued, seedtopic-claimed, phase-agent-materialized, seedtopic-completed, queue-drained, seed-topics-ready]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: standard
durable_evidence_roles: []
proof_subject: deterministic_contract
subject_execution: none
fixture: fixture_backed
runtime: real_disposable_bundle
external_calls: none
verdict_judge: deterministic
req: AGQ-010
---

<!-- @impl EXA-005, EXA-006, EXA-007, PLR-003 -->

# Case 201 - Seed-Topic Queue Loop

## Execution Contract

This fixture-backed case proves queue and Gate mechanics only. It uses the real queue CLI for every transition and a fixed deterministic phase-output adapter for file materialization. It does not prove Agent queue judgment or semantic writing. Task cards and cross-block state remain inside the injected playbook-state directory; no outside-run temporary path, chat memory, or filesystem discovery is authoritative.

## Step 1 - Create, register and prepare the legal Seed Topics boundary

```bash
B=$(node experiments_env/shared/new-disposable-bundle.mjs agql_seed --case case-201 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
STATE=$(printf '%s' {{PLAYBOOK_STATE_DIR_SH}})
mkdir -p "$STATE/case-201"
cat > "$B/rb_plan.md" <<'PLAN'
---
plan_basename: agql_seed
derived_topic_count: 3
topic_registry:
  - { id: t-claude-code, slug: 01_claude-code-cli-tool, title: Claude Code CLI Boundaries }
  - { id: t-agentic-queue, slug: 02_agentic-queue-architecture, title: Agentic Queue Architecture }
  - { id: t-deep-research, slug: 03_deep-research-methodology, title: Deep Research Methodology }
---
# Case 201 Plan
PLAN
cat > "$B/rb_profile.yaml" <<'YAML'
plan_basename: agql_seed
research_profile: quick_factual
root_must_answer_set: ["How does the queue materialize seed topics?"]
research_access: { status: available, probed_at: "2026-07-10T00:00:00.000Z", result_url: "https://example.com/case-201-fixture", fetch_outcome: success }
human_decision_checkpoints:
  hitl1: { status: recorded, recorded_at: "2026-07-10T00:00:00.000Z" }
  hitl2: { status: not_started, answerability_class: not_assessed, user_decision: not_started, final_report_view: not_started }
YAML
cat > "$B/rb_status.json" <<'JSON'
{"current_mode":"execution","state":"in_progress","current_gate":"setup_ready","next_gate":"seed_topics_ready"}
JSON
node --input-type=module - "$B" <<'JS'
import { writeGateAttempt } from './DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs';
const [bundle]=process.argv.slice(2);
writeGateAttempt(bundle,{check:{gate:'setup-ready',passed:true,currentNodeRef:'phases/phase-setup.md',next:'phases/phase-seed-topics.md'},routing:{kind:'next',next:'phases/phase-seed-topics.md'},inspect:[],advice:[]});
JS
node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle "$B" --node phases/phase-seed-topics.md > "$B/case-201-enter-seed-topics.md"
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "$B" --to setup_ready > "$B/case-201-advance-setup.json"
```

## Step 2 - Enqueue three real queue items

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
STATE=$(printf '%s' {{PLAYBOOK_STATE_DIR_SH}})
node --input-type=module - "$B" "$STATE/case-201" <<'JS'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'; import { join } from 'node:path'; import { parse as parseYaml } from 'yaml';
const [bundle,state]=process.argv.slice(2); mkdirSync(state,{recursive:true}); const plan=parseYaml(readFileSync(join(bundle,'rb_plan.md'),'utf8').match(/^---\n([\s\S]*?)\n---/)[1]);
for(const topic of plan.topic_registry){const task={queue_item_id:`seed-topic-${topic.slug}`,title:`Seed Topic: ${topic.title}`,targets:{controller:'main-agent'},action:'Materialize deterministic seed-topic fixture.',producer_rule:'seed_topic_materialize',lineage:{parent_gate:'seed_topics_ready'},priority_class:'P3_current_gate_gap',required_receipts:[],done_condition:'file_created_and_valid',verification:{engine:[],agent:[]},writes_to:[`seed_topics/${topic.slug}.md`],status_sync:[],completion_receipt:`file:seed_topics/${topic.slug}.md`,failure_route:'seed_topic_repair',payload:{topic_slug:topic.slug,topic_title:topic.title,topic_id:topic.id}};writeFileSync(join(state,`${topic.slug}.task.json`),`${JSON.stringify(task,null,2)}\n`)}
JS
for TASK in "$STATE"/case-201/*.task.json; do node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue "$B" --task "$TASK"; done
```

## Step 3 - Claim, materialize and complete each item

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
STATE=$(printf '%s' {{PLAYBOOK_STATE_DIR_SH}})
for N in 1 2 3; do
  CLAIM="$STATE/case-201/claim-$N.json"
  RESULT="$STATE/case-201/result-$N.json"
  node DPT_FRAMEWORK/cli/operate-queue.mjs claim "$B" --actor main-agent > "$CLAIM"
  node --input-type=module - "$B" "$CLAIM" "$RESULT" <<'JS'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'; import { join } from 'node:path';
const [bundle,claimPath,resultPath]=process.argv.slice(2); const claim=JSON.parse(readFileSync(claimPath)); const item=claim.item; if(!item)throw new Error('queue claim returned no item'); const {topic_slug:slug,topic_title:title,topic_id:id}=item.payload; mkdirSync(join(bundle,'seed_topics'),{recursive:true});
writeFileSync(join(bundle,'seed_topics',`${slug}.md`),`---\nid: ${JSON.stringify(id)}\nslug: ${slug}\ntitle: ${JSON.stringify(title)}\nmust_answer: [\"What must this topic establish?\"]\nhypothesis: \"Fixture hypothesis requiring later evidence.\"\nin_scope: \"Declared topic scope.\"\nout_of_scope: \"Unrelated topics.\"\nsearch_guardrails: { required_terms: [\"${slug}\"], forbidden_broadening: [\"unrelated\"] }\nevidence_route: { preferred_sources: [\"primary\"], noise_to_avoid: [\"marketing\"] }\n---\n# ${title}\n\n## Original Context Constraints\n- Deterministic fixture only.\n\n## Open Questions\n- Evidence remains a declared gap.\n`);
writeFileSync(resultPath,`${JSON.stringify({queue_item_id:item.queue_item_id,receipt:item.completion_receipt,summary:`materialized ${slug}`},null,2)}\n`);
JS
  node DPT_FRAMEWORK/cli/operate-queue.mjs complete "$B" --result "$RESULT"
done
node DPT_FRAMEWORK/cli/operate-queue.mjs claim "$B" --actor main-agent > "$STATE/case-201/drained.json"
```

## Step 4 - Run the real Gate, record six checks and finalize

```bash
B=$(node DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
STATE=$(printf '%s' {{PLAYBOOK_STATE_DIR_SH}})
GATE=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle "$B" --gate seed-topics-ready -- node DPT_FRAMEWORK/cli/gates/check-gate-seed-topics-ready.mjs --bundle "$B" --current-node phases/phase-seed-topics.md)
printf '%s\n' "$GATE" > "$STATE/case-201/gate.json"
node --input-type=module - "$B" "$STATE/case-201" <<'JS'
import { appendFileSync, readFileSync, readdirSync } from 'node:fs'; import { join } from 'node:path';
const [bundle,state]=process.argv.slice(2); const events=readFileSync(join(bundle,'rb_trace.jsonl'),'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse); const gate=JSON.parse(readFileSync(join(state,'gate.json'))); const drained=JSON.parse(readFileSync(join(state,'drained.json'))); const files=readdirSync(join(bundle,'seed_topics')).filter((name)=>name.endsWith('.md'));
const checks=[['seedtopic-enqueued',events.filter((e)=>e.event==='queue_enqueued').length===3],['seedtopic-claimed',events.filter((e)=>e.event==='queue_claimed').length===3],['phase-agent-materialized',files.length===3],['seedtopic-completed',events.filter((e)=>e.event==='queue_completed').length===3],['queue-drained',drained.item===null],['seed-topics-ready',gate.check?.passed===true&&gate.check?.next==='phases/phase-wave0.md']];
for(const[gateId,passed]of checks)appendFileSync(join(bundle,'rb_trace.jsonl'),`${JSON.stringify({ts:new Date().toISOString(),event:'check',source:'playbook',gate:gateId,passed,expected:true})}\n`);
JS
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

Stop after native completion. The Autorun Supervisor owns Standard health, audit, preservation, and optional clean-PASS cleanup.
