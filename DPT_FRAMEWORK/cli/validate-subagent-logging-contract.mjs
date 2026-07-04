#!/usr/bin/env node
// validate-subagent-logging-contract.mjs — SNC-001/002/003 + SRL-001/002/003 enforcer
// @impl SNC-001, SNC-002, SNC-003, SRL-001, SRL-002, SRL-003
// Usage: node DPT_FRAMEWORK/cli/validate-subagent-logging-contract.mjs
// Exit: 0 = PASS, 1 = FAIL
//
// Verifies the sub-agent logging contract is present in the shipped framework:
//   - Each sub-agent role spec (subagent-dpt-*.md) carries the always-loaded
//     lifecycle-logging mandate (read _beacon.json, emit the event set via
//     log-event.mjs, carry the beacon nonce).
//   - shared-subagent-protocol.md + the delegated-search phase nodes
//     (phase-wave0/1/2.md) direct the Phase Agent to drive the relay via
//     drive-relay-slot (SNC-003 demand-side wiring).
//   - Optionally, a generated slot task.md (from a bundle path via --bundle)
//     carries the lifecycle-logging directive (SNC-002).

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const NODES_DIR = join(__dirname, '..', 'workflows', 'nodes');
const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', B = '\x1b[0m';

// SNC-001 / SRL-001..003: markers every sub-agent role spec MUST carry.
const ROLE_MARKERS = [
  '_beacon.json',
  'receipt_nonce',
  'log-event.mjs',
  'search_start',
  'search_done',
  'fetch_done',
  'file_written',
  '`error`',
  'work_done',
];

// SNC-003 anti-pattern lock: Agent-facing control-plane MD must never instruct
// direct engine-function orchestration (the call-form is the instruction shape;
// bare mentions in prohibition/descriptive prose are allowed).
const DIRECT_CALL_ANTIPATTERNS = [
  'stageSubagentSlots(',
  'commitSlotResult(',
  'collectAndMergeSubagentResults(',
  'ingestAgentReceipt(',
];

const ROLE_PATTERN = /^subagent-dpt-.*\.md$/;
const DRIVER_MARKER = 'drive-relay-slot';
const PROTOCOL_FILE = join(NODES_DIR, 'shared', 'shared-subagent-protocol.md');
const PHASE_FILES = [
  join(NODES_DIR, 'phases', 'phase-wave0.md'),
  join(NODES_DIR, 'phases', 'phase-wave1.md'),
  join(NODES_DIR, 'phases', 'phase-wave2.md'),
];

let passed = 0;
let failed = 0;

function checkFile(label, file, markers) {
  if (!existsSync(file)) {
    console.log(`  ${R}✗${B} ${label}: file not found (${file})`);
    failed++;
    return;
  }
  const content = readFileSync(file, 'utf-8');
  const missing = markers.filter((m) => !content.includes(m));
  if (missing.length > 0) {
    console.log(`  ${R}✗${B} ${label}: missing markers ${missing.map((m) => `\`${m}\``).join(', ')}`);
    failed++;
  } else {
    console.log(`  ${G}✓${B} ${label}`);
    passed++;
  }
}

console.log('Sub-agent role specs — lifecycle logging mandate (SNC-001/SRL-001..003):');
const phaseDir = join(NODES_DIR, 'phases');
const roleFiles = readdirSync(phaseDir).filter((f) => ROLE_PATTERN.test(f));
if (roleFiles.length === 0) {
  console.log(`  ${R}✗${B} no subagent-dpt-*.md role specs found under ${phaseDir}`);
  failed++;
}
for (const f of roleFiles) {
  checkFile(`phases/${f}`, join(phaseDir, f), ROLE_MARKERS);
}

console.log('\nDemand-side wiring — drive-relay-slot (SNC-003):');
checkFile('shared/shared-subagent-protocol.md', PROTOCOL_FILE, [DRIVER_MARKER]);
for (const pf of PHASE_FILES) {
  checkFile(`phases/${pf.split('/').pop()}`, pf, [DRIVER_MARKER]);
}

function checkNoDirectCalls(label, file) {
  if (!existsSync(file)) {
    console.log(`  ${R}✗${B} ${label}: file not found (${file})`);
    failed++;
    return;
  }
  const content = readFileSync(file, 'utf-8');
  const hits = DIRECT_CALL_ANTIPATTERNS.filter((p) => content.includes(p));
  if (hits.length > 0) {
    console.log(`  ${R}✗${B} ${label}: direct engine-call wording ${hits.map((h) => `\`${h})\``).join(', ')} — must route through drive-relay-slot (SNC-003)`);
    failed++;
  } else {
    console.log(`  ${G}✓${B} ${label}`);
    passed++;
  }
}

console.log('\nAnti-pattern lock — no direct engine-call instructions (SNC-003):');
checkNoDirectCalls('shared/shared-subagent-protocol.md', PROTOCOL_FILE);
for (const pf of PHASE_FILES) {
  checkNoDirectCalls(`phases/${pf.split('/').pop()}`, pf);
}
for (const f of roleFiles) {
  checkNoDirectCalls(`phases/${f}`, join(phaseDir, f));
}

// SNC-002: optionally check a generated slot task.md carries the directive.
const bundleArg = process.argv.slice(2).find((a) => a.startsWith('--bundle='));
if (bundleArg) {
  const bundle = bundleArg.split('=')[1];
  console.log('\nGenerated task.md — lifecycle logging directive (SNC-002):');
  const slotsDir = join(bundle, '_subagents');
  if (existsSync(slotsDir)) {
    let anyTask = false;
    for (const wave of readdirSync(slotsDir, { withFileTypes: true })) {
      if (!wave.isDirectory() || !wave.name.startsWith('wave_')) continue;
      const wavePath = join(slotsDir, wave.name);
      for (const slot of readdirSync(wavePath, { withFileTypes: true })) {
        if (!slot.isDirectory() || !slot.name.startsWith('slot_')) continue;
        const taskMd = join(wavePath, slot.name, 'task.md');
        if (existsSync(taskMd)) {
          anyTask = true;
          checkFile(`${wave.name}/${slot.name}/task.md`, taskMd, ['_beacon.json', 'receipt_nonce', 'Lifecycle Logging']);
        }
      }
    }
    if (!anyTask) console.log(`  ${Y}?${B} no slot task.md found in bundle (stage a slot first)`);
  } else {
    console.log(`  ${Y}?${B} no _subagents/ in bundle — skipping task.md check`);
  }
}

console.log(`\nSub-agent logging contract: ${G}${passed} ok${B}, ${failed > 0 ? R : ''}${failed} failed${B}`);
process.exit(failed > 0 ? 1 : 0);
