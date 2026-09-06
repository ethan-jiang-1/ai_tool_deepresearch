#!/usr/bin/env node
// reconcile-plan-progress.mjs — rebuild rb_plan.md## Progress from trace witnesses
// @impl PHS-006, PHS-010
// Usage: node DEEP_RESEARCH_HARNESS/cli/reconcile-plan-progress.mjs --bundle <path>
// Exit codes: 0 = rebuilt or unchanged, 1 = rebuild failure, 2 = invocation error
//
// Engine-owned presentation repair (NOT a lifecycle authority):
//   - derives every checked line and every cycle block from rb_trace.jsonl
//     route-bound gate_attempt witnesses (the same rule the phase-status audit
//     applies) plus the existing Progress baseline checklist (fallback: the
//     manifest lifecycle list);
//   - rebuilds the `## Progress` section in place (atomic temp+rename);
//   - never runs a gate, never writes trace/checkpoint/status;
//   - reports committed | unchanged | failed plus a post-rebuild tamper check.
//
// For a bundle mid-lifecycle with rerun cycles but no cycle blocks, run this
// BEFORE its next gate pass so subsequent flips land in the correct block.

import { existsSync, readFileSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import { join, basename } from 'node:path';
import { parseGuardedArgs } from '../engine/helpers/cli-args.mjs';
import {
  loadHandoffTopology,
  readTraceEventsWithIndex,
} from '../engine/helpers/handoff-helpers.mjs';
import {
  candidateLegalWindows,
  evaluatePlanProgressTamper,
} from '../engine/helpers/phase-status-audit.mjs';
import { canonicalSectionContent } from '../engine/helpers/plan-hostfile-sections.mjs';
import { CYCLE_PROGRESS_GATES } from '../engine/helpers/gate-helpers-plan-progress.mjs';

const MANIFEST_BASELINE_GATES = [
  'instantiation-complete',
  'hitl1-recorded',
  'setup-ready',
  'seed-topics-ready',
  'wave0-complete',
  'wave1-complete',
  'wave2-complete',
  'hitl2-recorded',
  'readiness-passed',
  'rerun-ready',
];

const CHECKBOX_PATTERN = /^\s*-\s*\[[ x]\]\s*([A-Za-z0-9_-]+)(?:\s*\(.*\))?\s*$/;

function readConsumedWitnesses(bundlePath) {
  const trace = readTraceEventsWithIndex(bundlePath);
  if (!trace.ok) return { ok: false, reason: trace.reason, witnesses: [] };
  const topology = loadHandoffTopology();
  const witnesses = [];
  for (const window of candidateLegalWindows(trace.events, topology)) {
    const item = trace.events[window.attemptIndex];
    const ts = item && item.event && typeof item.event.ts === 'string' ? item.event.ts : null;
    if (ts == null) continue; // no timestamp → cannot place in a cycle window
    witnesses.push({ gate: window.sourceGate, ts });
  }
  return { ok: true, reason: null, witnesses };
}

function rebuildProgressSection(sectionContent, witnesses) {
  const rerunReady = witnesses
    .filter((w) => w.gate === 'rerun-ready')
    .sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));
  const firstCycleSpawn = rerunReady.length > 0 ? rerunReady[0].ts : null;

  const latestWitnessTs = (gate, fromTs, toTs) => {
    let latest = null;
    for (const w of witnesses) {
      if (w.gate !== gate) continue;
      if (w.ts < fromTs) continue;
      if (toTs != null && w.ts >= toTs) continue;
      if (latest == null || w.ts > latest) latest = w.ts;
    }
    return latest;
  };

  const checkedLine = (gate, ts) => (ts == null ? `- [ ] ${gate}` : `- [x] ${gate} (${ts})`);

  // ── baseline block ──
  const rawLines = sectionContent.trim().split('\n');
  const baselineLines = [];
  const seenBaselineGates = new Set();
  for (const rawLine of rawLines) {
    if (rawLine.startsWith('### Rerun cycle')) break; // first cycle block
    if (rawLine.trim() === '') continue; // separator blanks are rebuilt deterministically
    const match = rawLine.match(CHECKBOX_PATTERN);
    if (match && MANIFEST_BASELINE_GATES.includes(match[1])) {
      seenBaselineGates.add(match[1]);
      continue; // replaced below with derived state
    }
    baselineLines.push(rawLine);
  }
  const baselineGates = seenBaselineGates.size > 0
    ? MANIFEST_BASELINE_GATES.filter((g) => seenBaselineGates.has(g))
    : MANIFEST_BASELINE_GATES;
  for (const gate of baselineGates) {
    let ts;
    if (gate === 'rerun-ready') {
      // The first rerun-ready witness spawned cycle 1 FROM the baseline, so it
      // is the baseline's own rerun-ready witness (same rule as cycle blocks).
      ts = rerunReady.length > 0 ? rerunReady[0].ts : null;
    } else {
      ts = latestWitnessTs(gate, '0000-00-00T00:00:00.000Z', firstCycleSpawn);
    }
    baselineLines.push(checkedLine(gate, ts));
  }

  // ── cycle blocks ──
  const cycleBlocks = [];
  for (let k = 0; k < rerunReady.length; k++) {
    const spawnTs = rerunReady[k].ts;
    const nextSpawnTs = k + 1 < rerunReady.length ? rerunReady[k + 1].ts : null;
    const lines = [];
    for (const gate of CYCLE_PROGRESS_GATES) {
      let ts;
      if (gate === 'rerun-ready') {
        // The witness that spawned the NEXT block checked this block's line.
        ts = k + 1 < rerunReady.length ? rerunReady[k + 1].ts : null;
      } else {
        ts = latestWitnessTs(gate, spawnTs, nextSpawnTs);
      }
      lines.push(checkedLine(gate, ts));
    }
    cycleBlocks.push({ ordinal: k + 1, spawnTs, lines });
  }

  // ── assemble ──
  const parts = [];
  for (const line of baselineLines) parts.push(line);
  for (const block of cycleBlocks) {
    parts.push('');
    parts.push(`### Rerun cycle ${block.ordinal} (spawned ${block.spawnTs})`);
    parts.push(...block.lines);
  }
  return {
    content: parts.join('\n'),
    baselineCount: baselineGates.length,
    cycleCount: cycleBlocks.length,
  };
}

const USAGE = 'Usage: node DEEP_RESEARCH_HARNESS/cli/reconcile-plan-progress.mjs --bundle <path>';

function main() {
  const parsed = parseGuardedArgs({ args: process.argv.slice(2), options: { bundle: { type: 'string' } }, usage: USAGE });
  if (parsed.kind === 'help') {
    console.log(USAGE);
    process.exit(0);
  }
  if (parsed.kind === 'invalid') {
    console.error(`invocation error: ${parsed.reason}\n${USAGE}`);
    process.exit(2);
  }
  const { values } = parsed;
  if (!values.bundle) {
    console.log(JSON.stringify({ outcome: 'failed', reason: 'missing_bundle_arg' }, null, 2));
    process.exit(2);
  }
  const bundlePath = values.bundle;
  const planPath = join(bundlePath, 'rb_plan.md');
  if (!existsSync(planPath)) {
    console.log(JSON.stringify({ outcome: 'failed', reason: 'plan_missing', bundle: basename(bundlePath) }, null, 2));
    process.exit(1);
  }

  let content;
  try {
    content = readFileSync(planPath, 'utf-8');
  } catch (error) {
    console.log(JSON.stringify({ outcome: 'failed', reason: 'plan_unreadable', detail: error.message }, null, 2));
    process.exit(1);
  }

  const section = canonicalSectionContent(content, 'Progress');
  if (!section) {
    console.log(JSON.stringify({ outcome: 'failed', reason: 'canonical_progress_missing' }, null, 2));
    process.exit(1);
  }

  const { ok, reason, witnesses } = readConsumedWitnesses(bundlePath);
  if (!ok) {
    console.log(JSON.stringify({ outcome: 'failed', reason: 'trace_unreadable', detail: reason }, null, 2));
    process.exit(1);
  }

  const rebuilt = rebuildProgressSection(section.content, witnesses);
  const leadingBlank = section.content.startsWith('\n');
  const updatedSection = `${leadingBlank ? '\n' : ''}${rebuilt.content}\n`;
  const next = `${content.slice(0, section.contentStart)}${updatedSection}${content.slice(section.end)}`;

  if (next === content) {
    console.log(JSON.stringify({ outcome: 'unchanged', ...rebuilt }, null, 2));
    process.exit(0);
  }

  try {
    const tempPath = `${planPath}.reconcile-${process.pid}-${Date.now()}.tmp`;
    try {
      writeFileSync(tempPath, next, { flag: 'wx' });
      renameSync(tempPath, planPath);
    } finally {
      if (existsSync(tempPath)) rmSync(tempPath, { force: true });
    }
  } catch (error) {
    console.log(JSON.stringify({ outcome: 'failed', reason: 'write_failed', detail: error.message }, null, 2));
    process.exit(1);
  }

  // Post-rebuild presentation check: a correct rebuild must satisfy the same
  // witness rule the audit applies (no tamper evidence).
  let postRebuildTamper = [];
  try {
    const trace = readTraceEventsWithIndex(bundlePath);
    if (trace.ok) {
      const topology = loadHandoffTopology();
      postRebuildTamper = evaluatePlanProgressTamper(bundlePath, trace.events, topology).tampered
        .map((t) => ({ gate: t.gateKey, block: t.block }));
    }
  } catch { /* advisory only */ }

  console.log(JSON.stringify({ outcome: 'committed', ...rebuilt, post_rebuild_tamper: postRebuildTamper }, null, 2));
  process.exit(0);
}

main();
