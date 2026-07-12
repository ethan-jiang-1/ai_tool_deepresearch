import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function createTerminalFinalBundle(root, name, { rerunCount = 0, topicRegistry = [] } = {}) {
  const bundle = join(root, `dpt_rb_${name}`);
  mkdirSync(bundle, { recursive: true });
  writeFileSync(join(bundle, 'rb_status.json'), `${JSON.stringify({
    bundle: name,
    current_mode: 'execution',
    state: 'in_progress',
    current_gate: 'readiness_passed',
    next_gate: 'none',
    current_node: 'phases/phase-final.md',
  }, null, 2)}\n`);
  writeFileSync(join(bundle, 'rb_profile.yaml'), [
    `plan_basename: ${name}`,
    'research_profile: quick_factual',
    'root_must_answer_set: []',
    'research_access:',
    '  status: unprobed',
    'human_decision_checkpoints:',
    '  hitl1:',
    '    status: recorded',
    '  hitl2:',
    '    status: recorded',
    '    answerability_class: ready_substantive',
    '    user_decision: proceed_to_readiness',
    '    final_report_view: profile_default',
    `    rerun_count: ${rerunCount}`,
    '    rationale: Initial delivery approved',
    '',
  ].join('\n'));
  writeFileSync(join(bundle, 'rb_plan.md'), [
    '---',
    `plan_basename: ${name}`,
    `derived_topic_count: ${topicRegistry.length}`,
    'topic_registry_version: "2"',
    'topic_registry:',
    ...(topicRegistry.length === 0 ? ['  []'] : topicRegistry.flatMap((topic) => [
      `  - topic_uid: ${topic.topic_uid}`,
      `    id: "${topic.id}"`,
      `    slug: ${topic.slug}`,
      `    title: ${topic.title}`,
      '    must_answer:',
      `      - ${topic.must_answer || 'What matters?'}`,
      `    scope_role: ${topic.scope_role || 'primary'}`,
      '    depends_on_topic_uids: []',
    ])),
    '---',
    '# Plan',
    '',
  ].join('\n'));
  writeFileSync(join(bundle, 'rb_queue.json'), JSON.stringify({
    schema_version: 'queue.v2',
    queue_health: 'ready',
    stop_authorization_state: 'unauthorized_continue_required',
    active_window: [],
    refill_pool: [],
    delegated_in_flight: {},
    terminal_history: [],
  }));
  writeFileSync(join(bundle, 'rb_trace.jsonl'), [
    { ts: '2026-01-01T00:00:00.000Z', event: 'gate_attempt', gate: 'readiness-passed', phase: 'readiness', passed: true, currentNodeRef: 'phases/phase-readiness.md', next: 'phases/phase-final.md' },
    { ts: '2026-01-01T00:00:01.000Z', event: 'load_complete', entry: 'phases/phase-final.md', handoff_source_gate: 'readiness-passed', handoff_source_node: 'phases/phase-readiness.md', handoff_target_node: 'phases/phase-final.md', handoff_source_attempt_index: 0 },
  ].map(JSON.stringify).join('\n') + '\n');
  for (const directory of ['final', 'seed_topics', 'reference', 'artifacts', '_logs']) mkdirSync(join(bundle, directory), { recursive: true });
  writeFileSync(join(bundle, 'final', 'report.md'), '# Delivered Final\n');
  writeFileSync(join(bundle, '_logs', 'run.log'), '');
  writeFileSync(join(bundle, 'BUNDLE_MAP.md'), '# Bundle Map\n');
  for (const topic of topicRegistry) {
    writeFileSync(join(bundle, 'seed_topics', `${topic.slug}.md`), [
      '---',
      `topic_uid: ${topic.topic_uid}`,
      `id: "${topic.id}"`,
      `slug: ${topic.slug}`,
      `title: ${topic.title}`,
      '---',
      `# ${topic.title}`,
      '',
    ].join('\n'));
  }
  return bundle;
}

export function requestFromInspection(inspection, overrides = {}) {
  return {
    schema_version: '1.0.0',
    action: 'post_final_rerun',
    reason: 'Need additional evidence',
    requested_scope: 'Add a focused comparison',
    ...inspection.facts.request_bindings,
    ...overrides,
  };
}
