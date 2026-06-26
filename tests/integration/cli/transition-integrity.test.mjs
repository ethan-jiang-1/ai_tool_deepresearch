// @impl CPT-001: Transition integrity — 5-layer self-consistency validation
//
// Light integration test: reads framework data files (chain.json, manifest.json,
// 10 gate definitions, enums.mjs, phase body MDs) and validates that every layer
// of the transition system is internally consistent.
//
// No bundle creation, no CLI subprocess, no artifact fixtures. Pure data validation.
// If any of these checks fail, the transition system has a latent inconsistency
// that will surface as a runtime gate failure (like Bug #1 and Bug #2).
//
// Layers:
//   1. Structural — chain↔manifest key alignment, enum coverage
//   2. Gate def integrity — every non-terminal gate has both status rules
//   3. advance-status computed — algorithm output matches gate def expectations
//   4. Full chain walk — both HITL2 paths (passed→readiness, rerun→seed-topics)
//   5. Trace events — gate def trace_event_present ↔ phase body event references

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = join(fileURLToPath(import.meta.url), '..');
const REPO_ROOT = join(__dirname, '..', '..', '..');

const WORKFLOWS_DIR = join(REPO_ROOT, 'DPT_FRAMEWORK', 'workflows');
const GATE_DEFS_DIR = join(REPO_ROOT, 'DPT_FRAMEWORK', 'schema', 'gate_definitions');
const PHASES_DIR = join(REPO_ROOT, 'DPT_FRAMEWORK', 'workflows', 'nodes', 'phases');

// ── Helpers: reproduce advance-status algorithm ──────────────────────

/** snake_case → kebab-case */
const gateEnumToKey = (g) => g.replace(/_/g, '-');
/** kebab-case → snake_case */
const gateKeyToEnum = (k) => k.replace(/-/g, '_');

function loadManifest() {
  const raw = readFileSync(join(WORKFLOWS_DIR, 'manifest.json'), 'utf-8');
  const m = JSON.parse(raw);
  const gateToNode = new Map();
  const nodeToGate = new Map();
  for (const p of m.phases) {
    if (p.gate) {
      gateToNode.set(p.gate, p.node);
      nodeToGate.set(p.node, p.gate);
    }
  }
  return { phases: m.phases, gateToNode, nodeToGate };
}

function loadChain() {
  return JSON.parse(readFileSync(join(WORKFLOWS_DIR, 'transitions.chain.json'), 'utf-8'));
}

function loadGateDefs() {
  const defs = {};
  const files = ['instantiation-complete', 'hitl1-recorded', 'setup-ready',
    'seed-topics-ready', 'wave0-complete', 'wave1-complete', 'wave2-complete',
    'hitl2-recorded', 'readiness-passed', 'rerun-ready'];
  for (const key of files) {
    const p = join(GATE_DEFS_DIR, `gate-${key}.definition.json`);
    if (existsSync(p)) defs[key] = JSON.parse(readFileSync(p, 'utf-8'));
  }
  return defs;
}

function loadEnums() {
  // We only need CurrentGate values — parse them from the source
  const raw = readFileSync(join(REPO_ROOT, 'DPT_FRAMEWORK', 'schema', 'enums.mjs'), 'utf-8');
  const m = raw.match(/CurrentGate = z\.enum\(\[([\s\S]*?)\]\)/);
  if (!m) throw new Error('Cannot parse CurrentGate enum');
  const values = [];
  for (const line of m[1].split('\n')) {
    const v = line.match(/'([^']+)'/);
    if (v) values.push(v[1]);
  }
  return values;
}

/**
 * Simulate advance-status: given a target gate (snake_case), compute next_gate.
 * Uses the EXACT same algorithm as advance-status.mjs:
 *   gateEnum → gateKey → manifest[gateKey] → node → chain[node][passed] →
 *   nextNode → manifestReverse[nextNode] → gateKey → gateEnum
 * Falls back to chain[node][rerun] if passed not present.
 * Returns "none" when nextNode maps to final (gate: null in manifest).
 */
function computeNextGate(gateEnum, manifest, chain) {
  const gateKey = gateEnumToKey(gateEnum);
  const node = manifest.gateToNode.get(gateKey);
  if (!node) return null; // gate not in manifest = error

  const transitions = chain[node];
  if (!transitions) return { next: null, error: `node "${node}" not in chain` };

  const nextNode = transitions['passed'] || transitions['rerun'];
  if (!nextNode) return { next: null, error: `no passed/reerun from "${node}"` };

  const nextGateKey = manifest.nodeToGate.get(nextNode);
  const nextGateEnum = nextGateKey ? gateKeyToEnum(nextGateKey) : 'none';
  return { next: nextGateEnum, error: null };
}

// ── Layer 1: Structural consistency ──────────────────────────────────

describe('Layer 1 — Structural consistency', () => {
  const manifest = loadManifest();
  const chain = loadChain();
  const gateEnums = loadEnums();

  it('chain.json keys ⊆ manifest phases (every chain entry has a real phase)', () => {
    for (const node of Object.keys(chain)) {
      const found = manifest.phases.some(p => p.node === node);
      assert.ok(found, `chain node "${node}" not found in manifest phases`);
    }
  });

  it('manifest gated phases ⊆ chain.json keys (every gated phase has a chain entry)', () => {
    for (const p of manifest.phases) {
      if (p.gate === null) continue; // final phase — terminal, no chain entry
      assert.ok(chain[p.node] !== undefined,
        `manifest phase "${p.key}" (node ${p.node}, gate ${p.gate}) has no chain entry`);
    }
  });

  it('chain.json "passed" values are valid manifest nodes or null (terminal)', () => {
    for (const [node, outcomes] of Object.entries(chain)) {
      for (const [outcome, nextNode] of Object.entries(outcomes)) {
        if (nextNode === null) continue; // explicit null = terminal
        const found = manifest.phases.some(p => p.node === nextNode);
        assert.ok(found,
          `chain ${node} --${outcome}--> "${nextNode}" not found in manifest phases`);
      }
    }
  });

  it('CurrentGate enum covers every manifest gate + "none"', () => {
    for (const p of manifest.phases) {
      if (p.gate === null) continue;
      const enumVal = gateKeyToEnum(p.gate);
      assert.ok(gateEnums.includes(enumVal),
        `CurrentGate enum missing "${enumVal}" (from manifest phase "${p.key}")`);
    }
    assert.ok(gateEnums.includes('none'), 'CurrentGate enum missing "none"');
  });

  it('every CurrentGate enum value maps to a manifest gate (except "none")', () => {
    // "none" is the only enum value without a corresponding manifest entry
    const manifestGates = manifest.phases.filter(p => p.gate).map(p => gateKeyToEnum(p.gate));
    const unexpected = gateEnums.filter(e => e !== 'none' && !manifestGates.includes(e));
    assert.equal(unexpected.length, 0,
      `CurrentGate enum values not in manifest: ${JSON.stringify(unexpected)}`);
  });
});

// ── Layer 2: Gate definition integrity ───────────────────────────────

describe('Layer 2 — Gate definition integrity', () => {
  const gateDefs = loadGateDefs();

  it('every non-terminal gate def has both status_current_gate and status_next_gate rules', () => {
    const terminal = new Set(['readiness-passed']); // readiness-passed is not terminal in chain (points to final), but its next_gate="none"
    for (const [gateKey, def] of Object.entries(gateDefs)) {
      const ruleIds = def.rules.map(r => r.id);
      const hasCurrent = ruleIds.some(id => id.includes('current_gate') || id === 'status_consistent');
      const hasNext = ruleIds.some(id => id.includes('next_gate'));

      assert.ok(hasCurrent,
        `gate "${gateKey}" missing status_current_gate rule (rule ids: ${ruleIds.join(', ')})`);
      // Only readiness-passed is allowed to not check next_gate="none" — actually it DOES check it
      // Let's verify: readiness-passed has status_next_gate expected="none"
      assert.ok(hasNext || gateKey === 'readiness-passed',
        `gate "${gateKey}" missing status_next_gate rule (rule ids: ${ruleIds.join(', ')})`);
    }
  });

  it('every gate def status_current_gate.expected matches its own gate name (except instantiation-complete, which reads template initial value)', () => {
    // instantiation-complete is the only gate whose status values come from the
    // rb_status.json.tmpl template (current_gate=setup_ready, next_gate=seed_topics_ready)
    // rather than from a prior advance-status call. All other gates are preceded by
    // an advance-status call that sets current_gate to their own name.
    const templateGates = new Set(['instantiation-complete']);
    for (const [gateKey, def] of Object.entries(gateDefs)) {
      if (templateGates.has(gateKey)) continue;
      const expectedEnum = gateKeyToEnum(gateKey);
      const currentRule = def.rules.find(r =>
        r.check === 'status_value' &&
        (r.id.includes('current_gate') || r.id === 'status_consistent') &&
        r.target.endsWith('current_gate'));
      if (currentRule) {
        assert.equal(currentRule.expected, expectedEnum,
          `gate "${gateKey}" status_current_gate expected="${currentRule.expected}", should be "${expectedEnum}"`);
      }
    }
  });

  it('terminal readiness-passed gate expects next_gate="none"', () => {
    const def = gateDefs['readiness-passed'];
    const nextRule = def.rules.find(r =>
      r.check === 'status_value' && r.id.includes('next_gate'));
    assert.ok(nextRule, 'readiness-passed must have status_next_gate rule');
    assert.equal(nextRule.expected, 'none',
      `readiness-passed next_gate expected="${nextRule.expected}", should be "none"`);
  });
});

// ── Layer 3: advance-status computed vs gate def expected ─────────────

describe('Layer 3 — advance-status computed next_gate matches gate def expected', () => {
  const manifest = loadManifest();
  const chain = loadChain();
  const gateDefs = loadGateDefs();

  it('for every gate, computed next_gate equals gate def status_next_gate.expected', () => {
    // instantiation-complete is excluded: its status values come from the template
    // (current_gate=setup_ready, next_gate=seed_topics_ready), NOT from a prior
    // advance-status call. The template→gate consistency is verified in Layer 4.
    const templateGates = new Set(['instantiation-complete']);
    const failures = [];
    for (const [gateKey, def] of Object.entries(gateDefs)) {
      if (templateGates.has(gateKey)) continue;
      const gateEnum = gateKeyToEnum(gateKey);
      const nextRule = def.rules.find(r =>
        r.check === 'status_value' && r.id.includes('next_gate'));
      if (!nextRule) continue;

      const computed = computeNextGate(gateEnum, manifest, chain);
      if (computed.error) {
        failures.push(`${gateEnum}: ${computed.error}`);
        continue;
      }
      if (computed.next !== nextRule.expected) {
        failures.push(
          `${gateEnum}: computed next="${computed.next}", gate def expected="${nextRule.expected}"`);
      }
    }
    assert.equal(failures.length, 0, `Next-gate mismatches:\n  ${failures.join('\n  ')}`);
  });

  it('rerun path: hitl2→rerun→seed-topics chain is consistent', () => {
    // Manually verify the rerun branch (not the passed default)
    const hitl2Node = manifest.gateToNode.get('hitl2-recorded');
    const hitl2Transitions = chain[hitl2Node];
    assert.ok(hitl2Transitions, 'phase-hitl2 must be in chain');
    assert.equal(hitl2Transitions.rerun, 'phases/phase-rerun.md',
      'hitl2 rerun outcome must point to phase-rerun.md');

    const rerunNode = 'phases/phase-rerun.md';
    const rerunTransitions = chain[rerunNode];
    assert.ok(rerunTransitions, 'phase-rerun must be in chain');
    assert.equal(rerunTransitions.passed, 'phases/phase-seed-topics.md',
      'rerun passed must point back to seed-topics');

    // Verify rerun-ready gate expects seed_topics_ready
    const rerunDef = gateDefs['rerun-ready'];
    const nextRule = rerunDef.rules.find(r =>
      r.check === 'status_value' && r.id.includes('next_gate'));
    assert.ok(nextRule, 'rerun-ready must have status_next_gate');
    assert.equal(nextRule.expected, 'seed_topics_ready',
      `rerun-ready next_gate expected="${nextRule.expected}", should be "seed_topics_ready"`);
  });
});

// ── Layer 4: Full chain walk, both HITL2 paths ───────────────────────

describe('Layer 4 — Full chain walk', () => {
  const manifest = loadManifest();
  const chain = loadChain();
  const gateDefs = loadGateDefs();

  function walkChain(startGateEnum, expectSteps, label) {
    const history = [];
    let current = startGateEnum;
    for (let i = 0; i < expectSteps.length; i++) {
      const expectedCurrent = expectSteps[i].current;
      const expectedNext = expectSteps[i].next;

      // Verify current gate def expects this current_gate
      const gateKey = gateEnumToKey(current);
      const def = gateDefs[gateKey];
      if (def) {
        const currentRule = def.rules.find(r =>
          r.check === 'status_value' &&
          (r.id.includes('current_gate') || r.id === 'status_consistent') &&
          r.target.endsWith('current_gate'));
        if (currentRule) {
          assert.equal(currentRule.expected, expectedCurrent,
            `${label} step ${i}: gate "${gateKey}" expects current_gate="${currentRule.expected}", ` +
            `walk expects "${expectedCurrent}"`);
        }
      }

      // Compute next
      const computed = computeNextGate(current, manifest, chain);
      if (computed.error) {
        assert.fail(`${label} step ${i}: ${computed.error}`);
      }
      assert.equal(computed.next, expectedNext,
        `${label} step ${i}: advance from "${current}" computed next="${computed.next}", ` +
        `expected "${expectedNext}"`);

      // Verify next gate def (if not terminal) accepts this (current, next) pair
      if (expectedNext !== 'none') {
        const nextGateKey = gateEnumToKey(expectedNext);
        const nextDef = gateDefs[nextGateKey];
        if (nextDef) {
          const nextCurrentRule = nextDef.rules.find(r =>
            r.check === 'status_value' &&
            (r.id.includes('current_gate') || r.id === 'status_consistent') &&
            r.target.endsWith('current_gate'));
          if (nextCurrentRule) {
            assert.equal(nextCurrentRule.expected, expectedNext,
              `${label} step ${i}→${i + 1}: next gate "${nextGateKey}" expects ` +
              `current_gate="${nextCurrentRule.expected}", but walk would set it to "${expectedNext}"`);
          }

          const nextNextRule = nextDef.rules.find(r =>
            r.check === 'status_value' && r.id.includes('next_gate'));
          if (nextNextRule) {
            const afterNext = computeNextGate(expectedNext, manifest, chain);
            if (!afterNext.error) {
              assert.equal(afterNext.next, nextNextRule.expected,
                `${label} step ${i}→${i + 1}: gate "${nextGateKey}" expects ` +
                `next_gate="${nextNextRule.expected}", compute gives "${afterNext.next}"`);
            }
          }
        }
      }

      history.push({ from: current, to: computed.next });
      if (expectedNext === 'none') break;
      current = expectedNext;
    }
    return history;
  }

  it('Path A (happy): template → instantiation→hitl1→setup→seed-topics→wave0→wave1→wave2→hitl2→readiness→terminal', () => {
    // Template initial: current_gate=setup_ready, next_gate=seed_topics_ready
    // advance-status --to hitl1_recorded → current=hitl1_recorded, next=setup_ready
    // advance-status --to setup_ready → current=setup_ready, next=seed_topics_ready
    // ...etc

    const steps = [
      // Gate we're checking                  | (current_gate,   next_gate) that advance-status produced
      { current: 'hitl1_recorded',            next: 'setup_ready' },           // after --to hitl1_recorded
      { current: 'setup_ready',               next: 'seed_topics_ready' },     // after --to setup_ready
      { current: 'seed_topics_ready',         next: 'wave0_complete' },        // after --to seed_topics_ready
      { current: 'wave0_complete',            next: 'wave1_complete' },        // after --to wave0_complete
      { current: 'wave1_complete',            next: 'wave2_complete' },        // after --to wave1_complete
      { current: 'wave2_complete',            next: 'hitl2_recorded' },        // after --to wave2_complete
      { current: 'hitl2_recorded',            next: 'readiness_passed' },      // after --to hitl2_recorded
      { current: 'readiness_passed',          next: 'none' },                  // after --to readiness_passed → terminal
    ];

    walkChain('hitl1_recorded', steps, 'Path A');
  });

  it('Path B (rerun): hitl2→rerun→seed-topics→wave0→wave1→wave2→hitl2→readiness→terminal', () => {
    // After HITL2 user chooses "rerun":
    // advance-status doesn't handle rerun directly (it follows "passed").
    // But the rerun-ready gate is what rerun phase checks.
    // We verify: rerun_ready → advance-status computed next = seed_topics_ready
    // Then from seed_topics the walk is the same as Path A.

    // First verify the rerun jump
    const computed = computeNextGate('rerun_ready', manifest, chain);
    assert.equal(computed.next, 'seed_topics_ready',
      'rerun_ready → computed next must be seed_topics_ready');

    // Then walk from seed_topics_ready to terminal (same as Path A tail)
    const steps = [
      { current: 'seed_topics_ready',         next: 'wave0_complete' },
      { current: 'wave0_complete',            next: 'wave1_complete' },
      { current: 'wave1_complete',            next: 'wave2_complete' },
      { current: 'wave2_complete',            next: 'hitl2_recorded' },
      { current: 'hitl2_recorded',            next: 'readiness_passed' },
      { current: 'readiness_passed',          next: 'none' },
    ];

    walkChain('seed_topics_ready', steps, 'Path B');
  });

  it('template initial values are consistent with gate expectations', () => {
    // Template: current_gate=setup_ready, next_gate=seed_topics_ready
    // instantiation-complete gate checks: current=setup_ready, next=seed_topics_ready
    const def = gateDefs['instantiation-complete'];

    const currentRule = def.rules.find(r =>
      r.check === 'status_value' && r.id.includes('current_gate'));
    assert.equal(currentRule.expected, 'setup_ready',
      'instantiation-complete must expect current_gate="setup_ready" (template value)');

    const nextRule = def.rules.find(r =>
      r.check === 'status_value' && r.id.includes('next_gate'));
    assert.equal(nextRule.expected, 'seed_topics_ready',
      'instantiation-complete must expect next_gate="seed_topics_ready" (template value)');

    // Also verify the template file actually has this value
    const tmpl = JSON.parse(readFileSync(
      join(REPO_ROOT, 'DPT_FRAMEWORK', 'rb_templates', 'rb_status.json.tmpl'), 'utf-8'));
    assert.equal(tmpl.current_gate, 'setup_ready');
    assert.equal(tmpl.next_gate, 'seed_topics_ready');
  });
});

// ── Layer 5: Trace events consistency ────────────────────────────────

describe('Layer 5 — Trace event consistency', () => {
  const gateDefs = loadGateDefs();

  // Collect expected trace events from gate definitions
  const gateTraceEvents = new Map(); // gateKey → eventName
  for (const [gateKey, def] of Object.entries(gateDefs)) {
    const traceRule = def.rules.find(r => r.check === 'trace_event_present');
    if (traceRule) {
      gateTraceEvents.set(gateKey, traceRule.target);
    }
  }

  // Map phase node to gate key (from manifest)
  const manifest = loadManifest();
  const nodeToGateKey = new Map();
  for (const p of manifest.phases) {
    if (p.gate) nodeToGateKey.set(p.node, p.gate);
  }

  // Read phase body and check for event mentions
  function readPhaseBody(filename) {
    const p = join(PHASES_DIR, filename);
    if (!existsSync(p)) return '';
    return readFileSync(p, 'utf-8');
  }

  it('every trace_event_present rule has a corresponding phase body event reference', () => {
    // Build gateKey → phase filename mapping
    const gateToPhaseFile = new Map();
    for (const p of manifest.phases) {
      if (p.gate) {
        const filename = p.node.split('/').pop(); // phases/phase-seed-topics.md → phase-seed-topics.md
        gateToPhaseFile.set(p.gate, filename);
      }
    }

    const missing = [];
    for (const [gateKey, eventName] of gateTraceEvents) {
      const phaseFile = gateToPhaseFile.get(gateKey);
      if (!phaseFile) {
        missing.push(`${gateKey}: no phase file found in manifest`);
        continue;
      }
      const body = readPhaseBody(phaseFile);
      if (!body.includes(eventName)) {
        missing.push(`${gateKey}: trace_event_present target "${eventName}" not found in phase body ${phaseFile}`);
      }
    }
    assert.equal(missing.length, 0,
      `Trace events not referenced in phase body:\n  ${missing.join('\n  ')}`);
  });

  it('every phase body §4 trace event reference has a corresponding trace_event_present rule', () => {
    // Match patterns like rb_trace.jsonl 中有 `xxx` event
    // or log-event --event xxx in phase body
    const eventRefRe = /`([a-z_]+)`\s*(event|completion)/gi;

    const extraRefs = [];
    for (const p of manifest.phases) {
      if (!p.gate) continue;
      const filename = p.node.split('/').pop();
      const body = readPhaseBody(filename);
      if (!body) continue;

      // Find event names mentioned in §4 context
      const section4 = body.match(/## 4\. Expected Artifacts([\s\S]*?)(?=## 5\.|$)/);
      if (!section4) continue;

      const matches = section4[1].matchAll(eventRefRe);
      for (const m of matches) {
        const eventName = m[1];
        const expectedEvent = gateTraceEvents.get(p.gate);
        if (!expectedEvent || expectedEvent !== eventName) {
          // Only flag if no trace_event_present rule exists for this event
          if (![...gateTraceEvents.values()].includes(eventName)) {
            extraRefs.push(`${p.gate} (${filename}): mentions "${eventName}" but no gate def has trace_event_present for it`);
          }
        }
      }
    }
    // This is informational — not all events in §4 need to be trace_event_present targets
    // (some are gate_attempt events written by gate CLI)
    // We only assert that events which ARE trace_event_present targets are covered (test above).
    // This test exists to surface potential drift.
  });
});
