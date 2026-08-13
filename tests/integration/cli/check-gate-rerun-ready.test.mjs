// check-gate-rerun-ready.test.mjs — gate-rerun-ready CLI regression tests
// @impl REI-003

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, '.test-gate-rerun-ready-tmp');
const STYLE_CLI = join(__dirname, '..', '..', '..', 'DEEP_RESEARCH_HARNESS', 'cli', 'apply-research-style.mjs');
const DEFINITION = JSON.parse(readFileSync(join(__dirname, '..', '..', '..', 'DEEP_RESEARCH_HARNESS', 'schema', 'gate_definitions', 'gate-rerun-ready.definition.json'), 'utf8'));
const COUNT_RULE = DEFINITION.rules.find((rule) => rule.id === 'rerun_count_valid' && rule.check === 'rerun_count_limit');
assert.equal(COUNT_RULE?.operator, 'less_than');
assert.ok(Number.isInteger(COUNT_RULE?.value) && COUNT_RULE.value > 0);
const EXCLUSIVE_LIMIT = COUNT_RULE.value;

function runGate(bundlePath, currentNode = 'phases/phase-rerun.md') {
  try {
    const result = execFileSync(process.execPath, [
      join(__dirname, '..', '..', '..', 'DEEP_RESEARCH_HARNESS', 'cli', 'gates', 'check-gate-rerun-ready.mjs'),
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

function assertCompleteHint(hint) {
  assert.ok(hint?.rule_id);
  assert.ok(hint?.repair_kind);
  assert.ok(hint?.missing_fact);
  assert.ok(hint?.write_to);
  assert.ok(hint?.rerun);
}

function applyStyle(bundlePath, style = 'quick_factual') {
  return JSON.parse(execFileSync(process.execPath, [STYLE_CLI, '--bundle', bundlePath, '--style', style], {
    encoding: 'utf-8',
    timeout: 10000,
  }));
}

function updateProfile(bundlePath, mutate) {
  const profilePath = join(bundlePath, 'rb_profile.yaml');
  const profile = parseYaml(readFileSync(profilePath, 'utf8'));
  mutate(profile);
  writeFileSync(profilePath, stringifyYaml(profile));
}

function currentAvailableResearchAccess() {
  const samples = [
    ['gov_cn', 'china'], ['gitee', 'china'], ['xinhuanet', 'china'], ['cnki_catalog', 'china'],
    ['wikipedia', 'overseas'], ['github', 'overseas'], ['iana', 'overseas'], ['arxiv', 'overseas'],
    ['rfc_editor', 'overseas'],
  ];
  return {
    status: 'available',
    probed_at: '2026-08-11T00:00:00.000Z',
    sample_observations: samples.map(([sample_id, source_group], index) => (
      index === 0
        ? { sample_id, source_group, outcome: 'content', retrieval_surface: 'native' }
        : { sample_id, source_group, outcome: 'failed' }
    )),
  };
}

/** Extract the complete multi-line JSON object from optional leading output. */
function extractJsonBlock(text) {
  const lines = text.trim().split('\n');
  const startIdx = lines.findIndex((line) => line.trim() === '{');
  if (startIdx === -1) {
    throw new Error(`No JSON opening found in output: ${text.slice(0, 200)}`);
  }
  return lines.slice(startIdx).join('\n');
}

function setupBundle(name, overrides = {}) {
  const dir = join(TMP, name);
  mkdirSync(dir, { recursive: true });
  const topic = {
    topic_uid: 'tp_123e4567-e89b-42d3-a456-426614174000', id: '01', slug: '01_test-topic', title: 'Test Topic',
    must_answer: ['test question'], scope_role: 'primary', depends_on_topic_uids: [],
  };

  // Default: valid rerun state
  const profile = {
    plan_basename: name,
    research_profile: 'quick_factual',
    root_must_answer_set: ['test question'],
    research_access: currentAvailableResearchAccess(),
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

  writeFileSync(join(dir, 'rb_profile.yaml'), `${stringifyYaml(profile).trimEnd()}\n`);

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
  writeFileSync(join(dir, 'rb_plan.md'), `---\n${JSON.stringify({ plan_basename: name, derived_topic_count: 1, topic_registry_version: '2', topic_registry: [topic] }, null, 2)}\n---\n# Plan\n`);

  // Minimal seed topic
  if (!overrides.skip_seed_topics) {
    writeFileSync(join(dir, 'seed_topics', '01_test-topic.md'), [
      '---',
      `topic_uid: ${topic.topic_uid}`,
      'id: "01"',
      'slug: "01_test-topic"',
      'title: "Test Topic"',
      'must_answer: ["test question"]',
      'scope_role: primary',
      'depends_on_topic_uids: []',
      '---',
      '',
      '# Test Topic',
    ].join('\n'));
  }

  if (!overrides.skip_style_apply) {
    assert.equal(applyStyle(dir, profile.research_profile).topic_count, 1);
  }

  return dir;
}

function writeDirection(bundle, { count = 0, action = 'supplement', missing = null, duplicate = false } = {}) {
  const seedPath = join(bundle, 'seed_topics', '01_test-topic.md');
  const fields = [
    `- rerun_count: ${count}`,
    `- action: ${action}`,
    '- new_search_dimensions: cost and failure modes',
    '- adjusted_depth: compare operating models',
    '- search_guardrails: retain primary sources',
    '- rationale_excerpt: user requested comparison',
  ].filter((line) => !missing || !line.includes(`${missing}:`));
  if (duplicate) fields.push('- action: add');
  writeFileSync(seedPath, `${readFileSync(seedPath, 'utf8')}\n## 本轮重跑方向\n${fields.join('\n')}\n`);
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
    assert.strictEqual(result.check.passed, true, JSON.stringify(result));
    assert.strictEqual(result.check.gate, 'rerun-ready');
    assert.strictEqual(result.routing.kind, 'next');
    assert.strictEqual(result.routing.next, 'phases/phase-seed-topics.md');
    assert.deepStrictEqual(result.hints, []);
  });

  it('passes immediately below the active exclusive limit', () => {
    const bundle = setupBundle('happy-rerun-count-below-limit', {
      profile_hitl2: { rerun_count: EXCLUSIVE_LIMIT - 1, rationale: 'Last supported current count' },
    });
    const result = runGate(bundle);
    assert.strictEqual(result.check.passed, true);
  });
});

describe('gate-rerun-ready — style projection freshness', () => {
  it('repairs a stale complete projection through the existing CLI and the same Gate', () => {
    const bundle = setupBundle('stale-style');
    updateProfile(bundle, (profile) => { profile.research_style_params.wave0_shared_ref_total += 1; });

    const failed = runGate(bundle);
    const hint = failed.hints.find((candidate) => candidate.rule_id === 'style_projection_freshness');
    assert.equal(failed.check.passed, false);
    assertCompleteHint(hint);
    assert.equal(hint.repair_kind, 'engine_operation');
    assert.match(hint.write_to, /apply-research-style\.mjs/);
    assert.match(hint.rerun, /check-gate-rerun-ready/);

    assert.equal(applyStyle(bundle).topic_count, 1);
    assert.equal(runGate(bundle).check.passed, true);
  });

  it('returns one direct root for absent or partial params', () => {
    for (const [label, mutate] of [
      ['absent', (profile) => { delete profile.research_style_params; }],
      ['partial', (profile) => { profile.research_style_params = { wave0_shared_ref_total: 1 }; }],
    ]) {
      const bundle = setupBundle(`style-${label}`);
      updateProfile(bundle, mutate);
      const result = runGate(bundle);
      const hint = result.hints.find((candidate) => candidate.rule_id === 'style_projection_freshness');

      assert.equal(result.check.passed, false, label);
      assertCompleteHint(hint);
      assert.equal(hint.repair_kind, 'engine_operation');
      assert.equal(result.hints.some((candidate) => candidate.rule_id === 'rerun_profile_prerequisite'), false, label);
    }
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
    const hint = result.hints.find((candidate) => candidate.rule_id === 'rerun_rationale_present');
    assert.ok(hint, JSON.stringify(result));
    assertCompleteHint(hint);
    assert.strictEqual(hint.repair_kind, 'user_decision');
    assert.strictEqual(hint.write_to, 'phases/phase-hitl2.md');
    assert.equal(result.hints.some((candidate) => candidate.rule_id === 'style_projection_freshness'), false);
    assert.ok(result.check.masked_rule_ids.includes('style_projection_freshness'));
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
  it('fails when rerun_count equals the active exclusive limit', () => {
    const bundle = setupBundle('fail-count-at-limit', {
      profile_hitl2: { rerun_count: EXCLUSIVE_LIMIT, rationale: 'Exclusive limit should be blocked' },
    });
    const result = runGate(bundle);
    assert.strictEqual(result.check.passed, false);
    assert.ok(result.inspect.some(m => m.includes('rerun_count')));
    const hint = result.hints.find((candidate) => candidate.rule_id === 'rerun_count_valid');
    assertCompleteHint(hint);
    assert.strictEqual(hint.repair_kind, 'user_decision');
    assert.match(hint.write_to, /Rerun limit decision boundary/);
    assert.match(result.advice.join('\n'), /existing HITL2\/new-run decision owner/);
    assert.match(result.advice.join('\n'), /same Gate/);
    assert.doesNotMatch(result.advice.join('\n'), /ask|return to HITL|surface/i);
  });

  it('fails when rerun_count exceeds the active exclusive limit', () => {
    const bundle = setupBundle('fail-count-over-limit', {
      profile_hitl2: { rerun_count: EXCLUSIVE_LIMIT + 2, rationale: 'Above active limit' },
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
    const hint = result.hints.find((candidate) => candidate.rule_id === 'bundle_structure_valid');
    assertCompleteHint(hint);
    assert.strictEqual(hint.repair_kind, 'missing_contract');
    assert.match(hint.write_to, /Bundle-integrity recovery boundary/);
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
    const hint = result.hints.find((candidate) => candidate.rule_id === 'handoff_status_window_mismatch');
    assertCompleteHint(hint);
    assert.strictEqual(hint.repair_kind, 'engine_operation');
    assert.match(hint.write_to, /advance-status\.mjs/);
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

  it('fails a missing profile once and masks rationale/count symptoms', () => {
    const bundle = setupBundle('fail-profile-missing');
    rmSync(join(bundle, 'rb_profile.yaml'));

    const result = runGate(bundle);
    const hint = result.hints.find((candidate) => candidate.rule_id === 'rerun_profile_prerequisite');

    assert.strictEqual(result.check.passed, false);
    assertCompleteHint(hint);
    assert.strictEqual(hint.repair_kind, 'missing_contract');
    assert.deepStrictEqual(result.hints.map((candidate) => candidate.rule_id), ['rerun_profile_prerequisite']);
    assert.ok(result.check.masked_rule_ids.includes('rerun_rationale_present'));
    assert.ok(result.check.masked_rule_ids.includes('rerun_count_valid'));
  });

  it('rejects a retired access envelope through its ProfileSchema boundary', () => {
    const bundle = setupBundle('legacy-access');
    updateProfile(bundle, (profile) => {
      profile.research_access = {
        status: 'available',
        probed_at: '2026-07-10T00:00:00.000Z',
        result_url: 'https://example.com/old-envelope',
        fetch_outcome: 'success',
      };
    });

    const result = runGate(bundle);
    const hint = result.hints.find((candidate) => candidate.rule_id === 'rerun_profile_prerequisite');

    assert.strictEqual(result.check.passed, false);
    assertCompleteHint(hint);
    assert.strictEqual(hint.repair_kind, 'missing_contract');
  });
});

describe('gate-rerun-ready — plan-bound rerun direction structure', () => {
  it('blocks malformed matching direction at its exact seed field with one Agent repair', () => {
    const bundle = setupBundle('direction-missing-field');
    writeDirection(bundle, { missing: 'adjusted_depth' });
    const result = runGate(bundle);
    const hint = result.hints.find((candidate) => candidate.rule_id === 'rerun_direction_structure');
    assert.strictEqual(result.check.passed, false);
    assert.ok(hint, JSON.stringify(result));
    assertCompleteHint(hint);
    assert.strictEqual(hint.repair_kind, 'agent_action');
    assert.match(hint.write_to, /adjusted_depth/);
  });

  it('keeps complete future direction failed at the existing profile-count owner', () => {
    const bundle = setupBundle('direction-future-count');
    writeDirection(bundle, { count: 1 });
    const result = runGate(bundle);
    const hint = result.hints.find((candidate) => candidate.rule_id === 'rerun_direction_structure');
    assert.strictEqual(result.check.passed, false);
    assertCompleteHint(hint);
    assert.strictEqual(hint.repair_kind, 'agent_action');
    assert.match(hint.write_to, /phase-rerun/);
  });

  it('ignores stale direction and orphan files but masks symptoms behind canonical binding failure', () => {
    const bundle = setupBundle('direction-stale-orphan');
    writeDirection(bundle, { count: 0 });
    writeFileSync(join(bundle, 'seed_topics', 'orphan.md'), '## 本轮重跑方向\n- rerun_count: nope\n');
    const stale = runGate(bundle);
    assert.strictEqual(stale.check.passed, true);

    const bindingBundle = setupBundle('direction-binding-mismatch');
    writeDirection(bindingBundle, { count: 0 });
    const seedPath = join(bindingBundle, 'seed_topics', '01_test-topic.md');
    writeFileSync(seedPath, readFileSync(seedPath, 'utf8').replace('title: "Test Topic"', 'title: drifted'));
    const blocked = runGate(bindingBundle);
    assert.strictEqual(blocked.check.passed, false);
    const hint = blocked.hints.find((candidate) => candidate.rule_id === 'rerun_direction_structure');
    assert.ok(hint, JSON.stringify(blocked));
    assertCompleteHint(hint);
    assert.match(hint.write_to, /operate-topic-state/);
  });
});
