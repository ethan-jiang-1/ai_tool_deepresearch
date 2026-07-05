// @impl CPT-001, CPT-002: E2E regression — gate chain consistency from instantiation through seed-topics
//
// Uses instantiate-run-bundle (production) → gate → enter-phase → advance-status
// + log-event --event to advance through 4 gates WITHOUT hand-editing control state.
//
// Gates tested: instantiation-complete, hitl1-recorded, setup-ready, seed-topics-ready
// Each gate must pass and return the correct `next` node ref.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomInt } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();

// Unique name to avoid collisions
const BUNDLE_NAME = `test-gate-chain-${randomInt(0, 65536).toString(16)}`;

function run(cmd) {
  return execSync(cmd, { encoding: 'utf-8', stdio: 'pipe', cwd: REPO_ROOT });
}

function runGate(bundlePath, gateName, currentNode) {
  const cmd = `node DPT_FRAMEWORK/cli/gates/check-gate-${gateName}.mjs --bundle "${bundlePath}" --current-node "${currentNode}"`;
  try {
    const out = run(cmd);
    return JSON.parse(out);
  } catch (e) {
    if (e.stdout) return JSON.parse(e.stdout);
    throw e;
  }
}

describe('Gate chain consistency (instantiation→hitl1→setup→seed-topics)', () => {
  let bundlePath;

  // ── Setup: create production bundle ──
  it('creates a production bundle with correct initial status', () => {
    bundlePath = join(REPO_ROOT, `dpt_rb_${BUNDLE_NAME}`);
    // Clean up any leftover from previous failed run
    if (existsSync(bundlePath)) rmSync(bundlePath, { recursive: true, force: true });

    const out = run(`node DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs ${BUNDLE_NAME}`);
    bundlePath = out.trim().split('\n').pop(); // last line = absolute path

    assert.ok(existsSync(bundlePath), 'bundle directory must exist');
    assert.ok(existsSync(join(bundlePath, 'rb_status.json')), 'rb_status.json must exist');
    assert.ok(existsSync(join(bundlePath, 'rb_trace.jsonl')), 'rb_trace.jsonl must exist');
    assert.ok(existsSync(join(bundlePath, '_logs', 'run.log')), '_logs/run.log must exist');

    const status = JSON.parse(readFileSync(join(bundlePath, 'rb_status.json'), 'utf-8'));
    assert.equal(status.current_gate, 'setup_ready');
    assert.equal(status.next_gate, 'seed_topics_ready');
  });

  // ── Fill in the plan and profile to make gates pass ──
  it('fills plan and profile for pre-HITL1 gates', () => {
    const plan = `---
plan_basename: ${BUNDLE_NAME}
derived_topic_count: 2
topic_registry:
  - id: t1
    slug: topic-alpha
    title: Topic Alpha
  - id: t2
    slug: topic-beta
    title: Topic Beta
---

# Deep Research Plan: ${BUNDLE_NAME}

## Goal

### Purpose
Test the gate chain consistency from instantiation through seed-topics using real CLI tools.

### Research Questions
1. Does the instantiation gate pass with correct initial status?
2. Does the HITL1 gate pass with a recorded HITL1 checkpoint?
3. Does the setup-ready gate pass with a filled plan body?
4. Does the seed-topics-ready gate pass after materialization?

### Scope

**In scope:**
Gate chain verification from instantiation through seed-topics-ready.

**Out of scope:**
Wave 0/1/2 execution. Real subagent spawning.

**待定：**
(待 HITL2 确认 — whether to expand scope)

## Topic Registry

| # | Slug | Title | Status |
|---|------|-------|--------|
| 1 | topic-alpha | Topic Alpha | pending |
| 2 | topic-beta | Topic Beta | pending |

## Constraints

- **语言**：中英混合
- **时间预算**：不设硬 deadline
- **地域**：不限
- **方法**：open
- **来源偏好**：学术优先

## Progress

- [ ] instantiation-complete
- [ ] hitl1-recorded
- [ ] setup-ready
- [ ] seed-topics-ready
- [ ] wave0-complete
- [ ] wave1-complete
- [ ] wave2-complete
- [ ] hitl2-recorded

## Decisions
(append-only — 关键决策记录，最新在上)
`;
    writeFileSync(join(bundlePath, 'rb_plan.md'), plan);

    const profile = `plan_basename: ${BUNDLE_NAME}
research_profile: quick_factual
root_must_answer_set:
  - "Does the instantiation gate pass with correct initial status?"
  - "Does the seed-topics-ready gate pass after materialization?"
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-06-26T00:00:00.000Z"
  hitl2:
    status: not_started
    answerability_class: not_assessed
    user_decision: not_started
    final_report_view: not_started
`;
    writeFileSync(join(bundlePath, 'rb_profile.yaml'), profile);
  });

  // ── Gate 1: instantiation-complete ──
  it('passes instantiation-complete gate', () => {
    const result = runGate(bundlePath, 'instantiation-complete', 'phases/phase-instantiation.md');
    assert.equal(result.check.passed, true,
      `instantiation-complete should pass, got: ${JSON.stringify(result.inspect)}`);
    assert.equal(result.check.next, 'phases/phase-hitl1.md',
      `instantiation-complete next should be hitl1, got: ${result.check.next}`);
    assert.equal(result.routing.kind, 'next');
  });

  // ── Use advance-status to move to hitl1 ──
  it('advances status to hitl1_recorded via advance-status CLI', () => {
    const out = run(`node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "${bundlePath}" --to hitl1_recorded`);
    const parsed = JSON.parse(out);
    assert.equal(parsed.status, 'ok');
    assert.equal(parsed.current_gate, 'hitl1_recorded');
    assert.equal(parsed.next_gate, 'setup_ready');

    const status = JSON.parse(readFileSync(join(bundlePath, 'rb_status.json'), 'utf-8'));
    assert.equal(status.current_gate, 'hitl1_recorded');
    assert.equal(status.next_gate, 'setup_ready');
  });

  // ── Gate 2: hitl1-recorded ──
  it('passes hitl1-recorded gate', () => {
    // Log hitl1_recorded trace event (simulates Agent completing HITL1 phase)
    run(`node DPT_FRAMEWORK/cli/log-event.mjs --bundle "${bundlePath}" --event hitl1_recorded`);

    const result = runGate(bundlePath, 'hitl1-recorded', 'phases/phase-hitl1.md');
    assert.equal(result.check.passed, true,
      `hitl1-recorded should pass, got: ${JSON.stringify(result.inspect)}`);
    assert.equal(result.check.next, 'phases/phase-setup.md');
    assert.equal(result.routing.kind, 'next');
  });

  // ── Bootstrap sync into setup ──
  it('advances status to setup_ready via bootstrap-compatible advance-status CLI', () => {
    const out = run(`node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "${bundlePath}" --to setup_ready`);
    const parsed = JSON.parse(out);
    assert.equal(parsed.status, 'ok');
    assert.equal(parsed.current_gate, 'setup_ready');
    assert.equal(parsed.next_gate, 'seed_topics_ready');

    const status = JSON.parse(readFileSync(join(bundlePath, 'rb_status.json'), 'utf-8'));
    assert.equal(status.current_gate, 'setup_ready');
    assert.equal(status.next_gate, 'seed_topics_ready');
  });

  // ── Gate 3: setup-ready ──
  it('passes setup-ready gate', () => {
    const result = runGate(bundlePath, 'setup-ready', 'phases/phase-setup.md');
    assert.equal(result.check.passed, true,
      `setup-ready should pass, got: ${JSON.stringify(result.inspect)}`);
    assert.equal(result.check.next, 'phases/phase-seed-topics.md');
    assert.equal(result.routing.kind, 'next');
  });

  // ── Consume setup check.next, then sync setup source gate ──
  it('enters seed-topics then syncs setup_ready as the just-passed source gate', () => {
    const entered = run(`node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle "${bundlePath}" --node phases/phase-seed-topics.md`);
    assert.ok(entered.trim().length > 0, 'enter-phase should render the next control surface');

    const trace = readFileSync(join(bundlePath, 'rb_trace.jsonl'), 'utf-8').trim().split('\n').map(l => JSON.parse(l));
    assert.ok(trace.some(e =>
      e.event === 'load_complete' &&
      e.entry === 'phases/phase-seed-topics.md' &&
      e.handoff_source_gate === 'setup-ready'
    ), 'enter-phase should write route-bound seed-topics load_complete');

    const out = run(`node DPT_FRAMEWORK/cli/advance-status.mjs --bundle "${bundlePath}" --to setup_ready`);
    const parsed = JSON.parse(out);
    assert.equal(parsed.status, 'ok');
    assert.equal(parsed.current_gate, 'setup_ready');
    assert.equal(parsed.next_gate, 'seed_topics_ready');
  });

  // ── Materialize seed topics ──
  it('materializes seed topics from topic_registry', () => {
    mkdirSync(join(bundlePath, 'seed_topics'), { recursive: true });

    for (const slug of ['topic-alpha', 'topic-beta']) {
      const content = `---
id: ${slug === 'topic-alpha' ? 't1' : 't2'}
slug: ${slug}
title: ${slug === 'topic-alpha' ? 'Topic Alpha' : 'Topic Beta'}
---
# ${slug === 'topic-alpha' ? 'Topic Alpha' : 'Topic Beta'}

## 关键维度
- Test dimension for gate chain verification.

## 已知前提
- The gate chain from instantiation through seed-topics must be consistent.
- advance-status CLI correctly resolves next_gate from chain.json.

## Open Questions
- Will the seed-topics-ready gate detect the seed_topics_completion trace event?
`;
      writeFileSync(join(bundlePath, 'seed_topics', `${slug}.md`), content);
    }

    // Log seed_topics_completion (simulates Agent completing seed-topic materialization)
    run(`node DPT_FRAMEWORK/cli/log-event.mjs --bundle "${bundlePath}" --event seed_topics_completion --detail '{"topic_count":2}'`);
  });

  // ── Gate 4: seed-topics-ready ──
  it('passes seed-topics-ready gate', () => {
    const result = runGate(bundlePath, 'seed-topics-ready', 'phases/phase-seed-topics.md');
    assert.equal(result.check.passed, true,
      `seed-topics-ready should pass, got: ${JSON.stringify(result.inspect)}`);
    assert.equal(result.check.next, 'phases/phase-wave0.md');
    assert.equal(result.routing.kind, 'next');
  });

  // ── Verify trace has all expected events ──
  it('has complete trace trail', () => {
    const trace = readFileSync(join(bundlePath, 'rb_trace.jsonl'), 'utf-8').trim();
    const events = trace.split('\n').map(l => JSON.parse(l));
    const eventNames = events.map(e => e.event);

    assert.ok(eventNames.includes('run_start'), 'trace must have run_start');
    assert.ok(eventNames.filter(e => e === 'phase_transition').length >= 3,
      'trace must have at least 3 phase_transition events');
    assert.ok(eventNames.includes('hitl1_recorded'), 'trace must have hitl1_recorded');
    assert.ok(eventNames.includes('seed_topics_completion'), 'trace must have seed_topics_completion');
    assert.ok(eventNames.filter(e => e === 'gate_attempt').length >= 4,
      'trace must have at least 4 gate_attempt events');
  });

  // ── Cleanup ──
  it('cleans up', () => {
    if (existsSync(bundlePath)) {
      rmSync(bundlePath, { recursive: true, force: true });
    }
  });
});
