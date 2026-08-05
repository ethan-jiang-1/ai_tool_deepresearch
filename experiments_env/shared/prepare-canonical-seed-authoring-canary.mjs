#!/usr/bin/env node
// @impl CTS-003, STM-001
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { writeGateAttempt } from '../../DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers.mjs';

const targetIndex = process.argv.indexOf('--target-dir');
if (targetIndex < 0 || !process.argv[targetIndex + 1]) throw new Error('Usage: node prepare-canonical-seed-authoring-canary.mjs --target-dir <dir>');
const target = resolve(process.argv[targetIndex + 1]);
const bundle = join(target, `dpt_disp_case-204_${randomUUID().slice(0, 8)}`);
const topic = { topic_uid: 'tp_20420420-4204-4204-8204-204204204204', id: '01', slug: '01_canonical-seed', title: 'Canonical Seed Authoring', must_answer: ['How does structured seed authoring preserve canonical intent?'], scope_role: 'primary', depends_on_topic_uids: [] };
mkdirSync(join(bundle, 'seed_topics'), { recursive: true });
writeFileSync(join(bundle, 'rb_plan.md'), `---\nplan_basename: case-204\nderived_topic_count: 1\ntopic_registry_version: "2"\ntopic_registry:\n  - topic_uid: ${topic.topic_uid}\n    id: "01"\n    slug: ${topic.slug}\n    title: ${topic.title}\n    must_answer: ["${topic.must_answer[0]}"]\n    scope_role: primary\n    depends_on_topic_uids: []\n---\n# Case 204 setup-only plan\n`);
writeFileSync(join(bundle, 'seed_topics', `${topic.slug}.md`), `---\ntopic_uid: ${topic.topic_uid}\nid: "01"\nslug: ${topic.slug}\ntitle: ${topic.title}\nmust_answer: ["${topic.must_answer[0]}"]\nscope_role: primary\ndepends_on_topic_uids: []\n---\n\n# Canonical Seed Authoring\n\n## 主题定位\nSubject-owned body starts here.\n`);
writeFileSync(join(bundle, 'rb_status.json'), JSON.stringify({ current_mode: 'execution', state: 'in_progress', current_gate: 'setup_ready', next_gate: 'seed_topics_ready', current_node: 'phases/phase-setup.md' }));
writeFileSync(join(bundle, 'rb_trace.jsonl'), '');
writeFileSync(join(bundle, 'rb_queue.json'), JSON.stringify({ active_window: [{ queue_item_id: 'case-204-seed', title: 'Enrich canonical seed', targets: { controller: 'main-agent' }, action: 'Write body and apply retained enrich_seed input.', producer_rule: 'seed_topic_materialize', lineage: { topic_slug: topic.slug }, priority_class: 'P3_current_gate_gap', required_receipts: [`file:seed_topics/${topic.slug}.md`], done_condition: 'Structured enrichment committed.', verification: { engine: ['receipt_check'], agent: [] }, writes_to: [`seed_topics/${topic.slug}.md`], status_sync: [], completion_receipt: `file:seed_topics/${topic.slug}.md`, failure_route: 'repair', status: 'queued', restore_priority: 'normal', payload: { topic_slug: topic.slug } }], refill_pool: [], delegated_in_flight: {}, terminal_history: [], queue_health: 'thin', stop_authorization_state: 'unauthorized_continue_required' }));
writeGateAttempt(bundle, { check: { passed: true, gate: 'setup-ready', currentNodeRef: 'phases/phase-setup.md', next: 'phases/phase-seed-topics.md', failed_rule_ids: [] }, routing: { kind: 'next', next: 'phases/phase-seed-topics.md' }, inspect: [], advice: [] }, { setupReadyStaged: true });
const enter = spawnSync('node', ['DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs', '--bundle', bundle, '--node', 'phases/phase-seed-topics.md'], { encoding: 'utf8' });
if (enter.status !== 0) throw new Error(enter.stderr);
writeFileSync(join(bundle, 'case-204-setup.json'), `${JSON.stringify({ fixture: 'setup_only', subject_execution: 'real_agent', runtime: 'real_disposable_bundle', external_calls: 'none', topic }, null, 2)}\n`);
process.stdout.write(`${bundle}\n`);
