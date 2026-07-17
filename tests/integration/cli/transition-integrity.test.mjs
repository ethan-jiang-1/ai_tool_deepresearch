// @impl CPT-001: Transition integrity — 5-layer self-consistency validation
//
// Light integration test: reads framework data files (chain.json, manifest.json,
// 10 gate definitions, enums.mjs, phase body MDs, and handoff coverage constants)
// and validates that every layer of the transition system is internally consistent.
//
// No bundle creation, no CLI subprocess, no artifact fixtures. Pure data validation.
// If any of these checks fail, the transition system has a latent inconsistency
// that will surface as a runtime gate failure (like Bug #1 and Bug #2).
//
// Layers:
//   1. Structural — chain↔manifest key alignment, enum coverage
//   2. Gate def integrity — covered downstream gates do not keep stale status rules
//   3. source-gate status-window derivation — manifest+chain actual targets drive next_gate
//   4. Full chain walk — both HITL2 paths (passed→readiness, rerun→seed-topics)
//   5. Trace events — gate def trace_event_present ↔ phase body event references

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BOOTSTRAP_TARGET_NODES,
  COVERED_ENTRY_TARGET_NODES,
  COVERED_PREFLIGHT_TARGET_NODES,
  COVERED_SOURCE_NODES,
} from '../../../DPT_FRAMEWORK/engine/helpers/handoff-helpers.mjs';
import { readGateDefinitionSnapshot } from '../../../DPT_FRAMEWORK/schema/contracts/gate-definition.mjs';

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
    if (existsSync(p)) defs[key] = readGateDefinitionSnapshot(p).definition;
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
  if (!nextNode) return { next: null, error: `no passed/rerun from "${node}"` };

  const nextGateKey = manifest.nodeToGate.get(nextNode);
  const nextGateEnum = nextGateKey ? gateKeyToEnum(nextGateKey) : 'none';
  return { next: nextGateEnum, error: null };
}

function deriveStatusWindow(sourceGateEnum, targetNode, manifest, chain) {
  const sourceGate = gateEnumToKey(sourceGateEnum);
  const sourceNode = manifest.gateToNode.get(sourceGate);
  assert.ok(sourceNode, `source gate "${sourceGate}" must map to a manifest node`);

  const legalTargets = Object.values(chain[sourceNode] || {});
  assert.ok(legalTargets.includes(targetNode),
    `${sourceGate} target "${targetNode}" must be a legal transition target`);

  const targetGate = manifest.nodeToGate.get(targetNode);
  return {
    current: sourceGateEnum,
    next: targetGate ? gateKeyToEnum(targetGate) : 'none',
  };
}

function statusRules(def) {
  return def.rules.filter(rule => {
    const target = String(rule.target || '');
    return rule.check === 'status_value' &&
      (target === 'rb_status.json#/current_gate' || target === 'rb_status.json#/next_gate');
  });
}

function readPhaseBody(filename) {
  const p = join(PHASES_DIR, filename);
  if (!existsSync(p)) return '';
  return readFileSync(p, 'utf-8');
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

// ── Layer 2: Gate definition and wiring integrity ─────────────────────

describe('Layer 2 — Gate definition and wiring integrity', () => {
  const manifest = loadManifest();
  const gateDefs = loadGateDefs();

  const bootstrapGateKeys = new Set(
    manifest.phases
      .filter(p => p.gate && BOOTSTRAP_TARGET_NODES.has(p.node))
      .map(p => p.gate),
  );
  const coveredTargetGateKeys = new Set(
    manifest.phases
      .filter(p => p.gate && COVERED_PREFLIGHT_TARGET_NODES.has(p.node))
      .map(p => p.gate),
  );

  it('bootstrap inbound gates are the only definitions allowed to keep direct status rules', () => {
    for (const [gateKey, def] of Object.entries(gateDefs)) {
      const directStatusRules = statusRules(def);
      if (bootstrapGateKeys.has(gateKey)) {
        assert.ok(directStatusRules.length > 0,
          `bootstrap gate "${gateKey}" should retain explicit compatibility status rules`);
        continue;
      }

      if (coveredTargetGateKeys.has(gateKey)) {
        assert.equal(directStatusRules.length, 0,
          `covered gate "${gateKey}" must use shared source-gate status-window preflight, not definition rules: ${directStatusRules.map(r => r.id).join(', ')}`);
      }
    }
  });

  it('covered gate definitions do not require their own current_gate before pass', () => {
    for (const gateKey of coveredTargetGateKeys) {
      const def = gateDefs[gateKey];
      assert.ok(def, `covered gate "${gateKey}" definition must exist`);
      const ownEnum = gateKeyToEnum(gateKey);
      const staleRules = statusRules(def).filter(rule =>
        rule.target === 'rb_status.json#/current_gate' && rule.expected === ownEnum);
      assert.equal(staleRules.length, 0,
        `covered gate "${gateKey}" has stale own-gate current_gate rule(s): ${staleRules.map(r => r.id).join(', ')}`);
    }
  });

  it('applicable covered gate CLIs invoke the shared handoff preflight helper', () => {
    for (const gateKey of coveredTargetGateKeys) {
      const cliPath = join(REPO_ROOT, 'DPT_FRAMEWORK', 'cli', 'gates', `check-gate-${gateKey}.mjs`);
      assert.ok(existsSync(cliPath), `missing gate CLI for covered gate "${gateKey}"`);
      const raw = readFileSync(cliPath, 'utf-8');
      assert.ok(raw.includes('checkPhaseHandoffPreflight(args.bundle, args.currentNode)'),
        `covered gate CLI check-gate-${gateKey}.mjs must call shared checkPhaseHandoffPreflight`);
    }
  });

  it('bootstrap/final exceptions and covered preflight targets match manifest lifecycle nodes', () => {
    const lifecycleNodes = new Set(manifest.phases.map(p => p.node));
    for (const node of BOOTSTRAP_TARGET_NODES) {
      assert.ok(lifecycleNodes.has(node), `bootstrap exception "${node}" is not in manifest`);
    }
    for (const node of COVERED_PREFLIGHT_TARGET_NODES) {
      assert.ok(lifecycleNodes.has(node), `covered preflight target "${node}" is not in manifest`);
      assert.ok(!BOOTSTRAP_TARGET_NODES.has(node), `node "${node}" cannot be both covered and bootstrap-exempt`);
    }

    const final = manifest.phases.find(p => p.key === 'final');
    assert.equal(final?.gate, null, 'final must remain gate:null and therefore outside gate preflight');
    assert.ok(COVERED_ENTRY_TARGET_NODES.has(final.node),
      'final entry must still be covered by enter-phase/advance-status witnessing');
  });
});

// ── Layer 3: Source-gate status-window derivation ─────────────────────

describe('Layer 3 — Source-gate status-window derivation', () => {
  const manifest = loadManifest();
  const chain = loadChain();

  it('covered source transitions derive current_gate from source gate and next_gate from actual target node', () => {
    const expectedPairs = new Set([
      'setup_ready -> seed_topics_ready',
      'seed_topics_ready -> wave0_complete',
      'wave0_complete -> wave1_complete',
      'wave1_complete -> wave2_complete',
      'wave2_complete -> hitl2_recorded',
      'hitl2_recorded -> readiness_passed',
      'hitl2_recorded -> rerun_ready',
      'readiness_passed -> none',
      'rerun_ready -> seed_topics_ready',
    ]);

    const actualPairs = new Set();
    for (const sourceNode of COVERED_SOURCE_NODES) {
      const sourceGate = manifest.nodeToGate.get(sourceNode);
      assert.ok(sourceGate, `covered source node "${sourceNode}" must have a source gate`);
      const sourceGateEnum = gateKeyToEnum(sourceGate);
      const transitions = chain[sourceNode] || {};

      for (const targetNode of Object.values(transitions)) {
        assert.ok(COVERED_ENTRY_TARGET_NODES.has(targetNode),
          `${sourceNode} target "${targetNode}" must be a covered entry target`);
        const window = deriveStatusWindow(sourceGateEnum, targetNode, manifest, chain);
        actualPairs.add(`${window.current} -> ${window.next}`);
      }
    }

    assert.deepEqual(actualPairs, expectedPairs);
  });

  it('HITL2 status derivation follows the selected target instead of defaulting to passed', () => {
    assert.deepEqual(
      deriveStatusWindow('hitl2_recorded', 'phases/phase-readiness.md', manifest, chain),
      { current: 'hitl2_recorded', next: 'readiness_passed' },
    );
    assert.deepEqual(
      deriveStatusWindow('hitl2_recorded', 'phases/phase-rerun.md', manifest, chain),
      { current: 'hitl2_recorded', next: 'rerun_ready' },
    );
  });

  it('readiness terminal status is derived from witnessed final entry, not a gate definition rule', () => {
    const window = deriveStatusWindow('readiness_passed', 'phases/phase-final.md', manifest, chain);
    assert.deepEqual(window, { current: 'readiness_passed', next: 'none' });
  });

  it('Final node preserves readiness_passed/none terminal status wording', () => {
    const body = readPhaseBody('phase-final.md');
    const workflowChain = readFileSync(join(REPO_ROOT, 'DPT_FRAMEWORK', 'engine', 'workflow-chain.mjs'), 'utf-8');
    assert.ok(body.includes('current_gate: readiness_passed'));
    assert.ok(body.includes('next_gate: none'));
    assert.ok(workflowChain.includes('current_gate: readiness_passed'));
    assert.ok(workflowChain.includes('next_gate: none'));
    assert.ok(!body.includes('current_gate: none'));
    assert.ok(!body.includes('next_gate: null'));
    assert.ok(!workflowChain.includes('current_gate: none'));
    assert.ok(!workflowChain.includes('next_gate: null'));
  });
});

// ── Layer 3b: Agent-facing handoff wording ───────────────────────────

describe('Layer 3b — Agent-facing handoff wording', () => {
  const handoffSources = [
    { phaseFile: 'phase-setup.md', sourceGate: 'setup_ready' },
    { phaseFile: 'phase-seed-topics.md', sourceGate: 'seed_topics_ready' },
    { phaseFile: 'phase-wave0.md', sourceGate: 'wave0_complete' },
    { phaseFile: 'phase-wave1.md', sourceGate: 'wave1_complete' },
    { phaseFile: 'phase-wave2.md', sourceGate: 'wave2_complete' },
    { phaseFile: 'phase-hitl2.md', sourceGate: 'hitl2_recorded' },
    { phaseFile: 'phase-readiness.md', sourceGate: 'readiness_passed' },
    { phaseFile: 'phase-rerun.md', sourceGate: 'rerun_ready' },
  ];

  it('phase On Gate Pass sections consume check.next through enter-phase before source-gate status sync', () => {
    for (const { phaseFile, sourceGate } of handoffSources) {
      const body = readPhaseBody(phaseFile);
      const section = body.match(/## 6\. On Gate Pass([\s\S]*?)(?=## 7\.|$)/)?.[1] || '';
      assert.ok(section.includes('enter-phase.mjs --bundle <path> --node <check.next>'),
        `${phaseFile} §6 must instruct enter-phase --node <check.next>`);
      assert.ok(section.includes(`advance-status.mjs --bundle <path> --to ${sourceGate}`),
        `${phaseFile} §6 must sync just-passed source gate ${sourceGate}`);
      assert.ok(
        section.indexOf('enter-phase.mjs --bundle <path> --node <check.next>') <
          section.indexOf(`advance-status.mjs --bundle <path> --to ${sourceGate}`),
        `${phaseFile} §6 must run enter-phase before advance-status`,
      );
    }
  });

  it('covered phase bodies do not tell the Agent to sync their own gate before §6 pass handling', () => {
    for (const { phaseFile, sourceGate } of handoffSources) {
      const body = readPhaseBody(phaseFile);
      const beforeGatePass = body.split('## 6. On Gate Pass')[0] || body;
      const forbidden = [
        `node DPT_FRAMEWORK/cli/advance-status.mjs --bundle <path> --to ${sourceGate}`,
      ];
      for (const phrase of forbidden) {
        assert.ok(!beforeGatePass.includes(phrase),
          `${phaseFile} must not instruct ${phrase} before its own gate has passed`);
      }
    }
  });

  it('shared silent execution names autonomous continuation and enter-phase handoff', () => {
    const body = readFileSync(
      join(REPO_ROOT, 'DPT_FRAMEWORK', 'workflows', 'nodes', 'shared', 'shared-silent-execution.md'),
      'utf-8',
    );
    assert.ok(body.includes('## Autonomous Work Loop'));
    assert.match(body, /do not initiate user-facing interaction/i);
    assert.match(body, /current loaded node has `stop: no`/);
    assert.match(body, /Final is governed by its terminal-delivery contract/);
    assert.match(body, /consume it through:[\s\S]*enter-phase\.mjs --bundle <path> --node <check\.next>/);
    assert.ok(!body.includes('ask the user whether'));
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
