// check-gate-rerun-ready.test.mjs — gate-rerun-ready CLI regression tests
// @impl REI-003

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, '.test-gate-rerun-ready-tmp');

function runGate(bundlePath, currentNode = 'phases/phase-rerun.md') {
  try {
    const result = execFileSync(process.execPath, [
      join(__dirname, '..', '..', '..', 'DPT_FRAMEWORK', 'cli', 'gates', 'check-gate-rerun-ready.mjs'),
      '--bundle', bundlePath,
      '--current-node', currentNode,
    ], { encoding: 'utf-8', timeout: 10000 });
    return JSON.parse(extractJsonBlock(result));
  } catch (err) {
    if (err.stdout) {
      return JSON.parse(extractJsonBlock(err.stdout));
    }
    throw err;
  }
}

/** Extract the multi-line JSON object from mixed logger+JSON output. */
function extractJsonBlock(text) {
  const lines = text.trim().split('\n');
  // Walk backwards to find the JSON object's opening brace
  let startIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();
    if (trimmed === '{') {
      startIdx = i;
      break;
    }
  }
  if (startIdx === -1) {
    throw new Error(`No JSON opening found in output: ${text.slice(0, 200)}`);
  }
  return lines.slice(startIdx).join('\n');
}

function setupBundle(name, overrides = {}) {
  const dir = join(TMP, name);
  mkdirSync(dir, { recursive: true });

  // Default: valid rerun state
  const profile = {
    plan_basename: name,
    research_profile: 'quick_factual',
    root_must_answer_set: ['test question'],
    human_decision_checkpoints: {
      hitl1: { status: 'recorded' },
      hitl2: {
        status: 'recorded',
        answerability_class: 'ready_substantive',
        user_decision: 'rerun',
        final_report_view: 'profile_default',
        rerun_count: 0,
        rationale: 'Need to add economic impact analysis',
        ...overrides.profile_hitl2,
      },
    },
  };

  // Use single quotes to avoid shell escaping issues with JSON in YAML
  const yamlContent = [
    `plan_basename: ${profile.plan_basename}`,
    `research_profile: ${profile.research_profile}`,
    'root_must_answer_set:',
    ...profile.root_must_answer_set.map(s => `  - "${s}"`),
    'human_decision_checkpoints:',
    '  hitl1:',
    `    status: ${profile.human_decision_checkpoints.hitl1.status}`,
    '  hitl2:',
    `    status: ${profile.human_decision_checkpoints.hitl2.status}`,
    `    answerability_class: ${profile.human_decision_checkpoints.hitl2.answerability_class}`,
    `    user_decision: ${profile.human_decision_checkpoints.hitl2.user_decision}`,
    `    final_report_view: ${profile.human_decision_checkpoints.hitl2.final_report_view}`,
  ];

  if (profile.human_decision_checkpoints.hitl2.rerun_count !== undefined) {
    yamlContent.push(`    rerun_count: ${profile.human_decision_checkpoints.hitl2.rerun_count}`);
  }
  if (profile.human_decision_checkpoints.hitl2.rationale !== undefined) {
    yamlContent.push(`    rationale: "${profile.human_decision_checkpoints.hitl2.rationale}"`);
  }

  writeFileSync(join(dir, 'rb_profile.yaml'), yamlContent.join('\n') + '\n');

  // rb_status.json: before rerun-ready passes, the active status window is the
  // witnessed predecessor source gate (HITL2) and the current rerun gate.
  writeFileSync(join(dir, 'rb_status.json'), JSON.stringify({
    current_mode: 'execution',
    state: 'in_progress',
    current_gate: overrides.status_current_gate || 'hitl2_recorded',
    next_gate: overrides.status_next_gate || 'rerun_ready',
  }));

  if (!overrides.skip_handoff_trace) {
    const traceEvents = [
      JSON.stringify({
        ts: '2026-01-01T00:00:00.000Z',
        event: 'gate_attempt',
        gate: 'hitl2-recorded',
        phase: 'hitl2',
        passed: true,
        currentNodeRef: 'phases/phase-hitl2.md',
        next: 'phases/phase-rerun.md',
      }),
    ];

    if (!overrides.skip_handoff_load) {
      traceEvents.push(JSON.stringify({
        ts: '2026-01-01T00:00:01.000Z',
        event: 'load_complete',
        entry: 'phases/phase-rerun.md',
        handoff_source_gate: 'hitl2-recorded',
        handoff_source_node: 'phases/phase-hitl2.md',
        handoff_target_node: 'phases/phase-rerun.md',
        handoff_source_attempt_index: 0,
      }));
    }

    writeFileSync(join(dir, 'rb_trace.jsonl'), traceEvents.join('\n') + '\n');
  }

  // Required directories
  mkdirSync(join(dir, 'seed_topics'), { recursive: true });
  mkdirSync(join(dir, 'reference'), { recursive: true });

  // Minimal seed topic
  if (!overrides.skip_seed_topics) {
    writeFileSync(join(dir, 'seed_topics', '01_test-topic.md'), [
      '---',
      'id: "topic-01"',
      'slug: "01_test-topic"',
      'title: "Test Topic"',
      '---',
      '',
      '# Test Topic',
    ].join('\n'));
  }

  return dir;
}

before(() => {
  if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });
});

after(() => {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

// ─── Happy path ────────────────────────────────────────────────────────────

describe('gate-rerun-ready — happy path', () => {
  it('passes with valid rerun state (rerun_count=0, rationale present)', () => {
    const bundle = setupBundle('happy-rerun-count-0');
    const result = runGate(bundle);
    assert.strictEqual(result.check.passed, true);
    assert.strictEqual(result.check.gate, 'rerun-ready');
    assert.strictEqual(result.routing.kind, 'next');
    assert.strictEqual(result.routing.next, 'phases/phase-seed-topics.md');
  });

  it('passes with rerun_count=2 (under max of 3)', () => {
    const bundle = setupBundle('happy-rerun-count-2', {
      profile_hitl2: { rerun_count: 2, rationale: 'Third pass adjustment' },
    });
    const result = runGate(bundle);
    assert.strictEqual(result.check.passed, true);
  });
});

// ─── Rationale rule ────────────────────────────────────────────────────────

describe('gate-rerun-ready — rerun_rationale_present', () => {
  it('fails when rationale is empty string', () => {
    const bundle = setupBundle('fail-rationale-empty', {
      profile_hitl2: { rerun_count: 0, rationale: '' },
    });
    const result = runGate(bundle);
    assert.strictEqual(result.check.passed, false);
    assert.ok(result.inspect.some(m => m.includes('rationale')));
  });

  it('fails when rationale is absent', () => {
    const bundle = setupBundle('fail-rationale-absent', {
      profile_hitl2: { rerun_count: 0, rationale: undefined },
    });
    const result = runGate(bundle);
    assert.strictEqual(result.check.passed, false);
    assert.ok(result.inspect.some(m => m.includes('rationale')));
  });
});

// ─── Count limit rule ──────────────────────────────────────────────────────

describe('gate-rerun-ready — rerun_count_valid', () => {
  it('fails when rerun_count = 3 (equals max)', () => {
    const bundle = setupBundle('fail-count-3', {
      profile_hitl2: { rerun_count: 3, rationale: 'Fourth attempt — should be blocked' },
    });
    const result = runGate(bundle);
    assert.strictEqual(result.check.passed, false);
    assert.ok(result.inspect.some(m => m.includes('rerun_count')));
  });

  it('fails when rerun_count > 3', () => {
    const bundle = setupBundle('fail-count-5', {
      profile_hitl2: { rerun_count: 5, rationale: 'Way over limit' },
    });
    const result = runGate(bundle);
    assert.strictEqual(result.check.passed, false);
  });
});

// ─── Bundle structure rule ─────────────────────────────────────────────────

describe('gate-rerun-ready — bundle_structure_valid', () => {
  it('fails when seed_topics/ is missing', () => {
    const bundle = setupBundle('fail-missing-seedtopics', { skip_seed_topics: true });
    rmSync(join(bundle, 'seed_topics'), { recursive: true, force: true });
    const result = runGate(bundle);
    assert.strictEqual(result.check.passed, false);
    assert.ok(result.inspect.some(m => m.includes('seed_topics')));
  });

  it('fails when reference/ is missing', () => {
    const bundle = setupBundle('fail-missing-reference');
    rmSync(join(bundle, 'reference'), { recursive: true, force: true });
    const result = runGate(bundle);
    assert.strictEqual(result.check.passed, false);
    assert.ok(result.inspect.some(m => m.includes('reference')));
  });
});

// ─── Handoff/status-window preflight ───────────────────────────────────────

describe('gate-rerun-ready — handoff/status-window preflight', () => {
  it('fails when current_gate is not the witnessed HITL2 predecessor', () => {
    const bundle = setupBundle('fail-status-drift', {
      status_current_gate: 'wave2_complete',
      status_next_gate: 'rerun_ready',
    });
    const result = runGate(bundle);
    assert.strictEqual(result.check.passed, false);
    assert.ok(result.inspect.some(m => m.includes('current_gate')));
  });

  it('fails when the HITL2 rerun entry witness is missing', () => {
    const bundle = setupBundle('fail-missing-handoff', {
      skip_handoff_load: true,
    });
    const result = runGate(bundle);
    assert.strictEqual(result.check.passed, false);
    assert.ok(result.advice.some(m => m.includes('enter-phase')));
  });
});

// ─── Default count (missing field) ────────────────────────────────────────

describe('gate-rerun-ready — default count', () => {
  it('passes when rerun_count is absent (defaults to 0)', () => {
    const bundle = setupBundle('happy-count-default', {
      profile_hitl2: { rerun_count: undefined, rationale: 'First rerun attempt' },
    });
    const result = runGate(bundle);
    assert.strictEqual(result.check.passed, true);
  });
});
