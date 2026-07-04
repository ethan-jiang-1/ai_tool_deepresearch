#!/usr/bin/env node
// drive-relay-slot.mjs — Runtime relay slot-lifecycle driver (SRD-001/002/003/004)
// @impl SRD-001, SRD-002, SRD-003, SRD-004
// Canonical location: DPT_FRAMEWORK/cli/drive-relay-slot.mjs
//
// Closes the gap that the relay engine functions (stageSubagentSlots /
// recordAgentSpawnRequested / ingestAgentReceipt / commitSlotResult /
// collectAndMergeSubagentResults) had no runtime caller, so buildSpawnPrompt
// is no longer dead code and the sub-agent logging/buffer/nonce signals come
// alive at runtime.
//
// Boundary (SRD-002/003): the driver ONLY orchestrates deterministic slot
// lifecycle (stage / ingest / commit / merge) and emits spawn prompts. It does
// NOT search, judge evidence, repair queues, pass/fail gates, or decide
// transitions. A sub-agent's returned result MUST pass through commitSlotResult
// validation — the driver never hand-writes result.json / _status.json /
// _agent.json and never mutes a schema failure.
//
// Usage:
//   node DPT_FRAMEWORK/cli/drive-relay-slot.mjs stage   <bundle> [--wave <N>] [--platform <p>]
//       # Replacement re-stage (SUD-003) into a freed slotIndex:
//       [--slot-index <M> --role <roleKey> --key <slotKey> --task "<desc>" [--cache-dir <dir>]]
//   node DPT_FRAMEWORK/cli/drive-relay-slot.mjs commit  <bundle> --wave <N> --slot <slotKey>
//       --result '<json>' [--runtime-agent-id <id>] [--platform <p>] [--runtime-mode <m>]
//   node DPT_FRAMEWORK/cli/drive-relay-slot.mjs merge   <bundle> --wave <N>

import { parseArgs } from 'node:util';
import path from 'node:path';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import {
  stageSubagentSlots,
  stageReplacementSlot,
  recordAgentSpawnRequested,
  loadSlotByManifestEntry,
  ingestAgentReceipt,
  commitSlotResult,
  collectAndMergeSubagentResults,
} from '../engine/subagent-relay.mjs';

function usage() {
  console.error(`Relay slot-lifecycle driver. Orchestrates engine functions at runtime.

Usage:
  drive-relay-slot stage <bundle> [--wave <N>] [--platform <p>]
      Stage the built-in pass-branch dispatch map (4 DPT roles) for wave <N>
      and print each slot's spawn prompt. <wave> defaults to the next wave.

  drive-relay-slot stage <bundle> --wave <N> \\
      --slot-index <M> --role <roleKey> --key <slotKey> --task "<desc>" [--cache-dir <dir>]
      Replacement re-stage (SUD-003): stage a single SlotConfig into the freed
      <slot-index> of an existing wave, updating dispatch.json without
      clobbering other in-flight slots.

  drive-relay-slot commit <bundle> --wave <N> --slot <slotKey> --result '<json>'
      [--runtime-agent-id <id>] [--platform <p>] [--runtime-mode <m>]
      Ingest the sub-agent's runtime receipt, validate its returned result via
      commitSlotResult, and write result.json / _status.json / _agent.json.

  drive-relay-slot merge <bundle> --wave <N>
      Collect and merge all committed slots for the wave into workflow state,
      returning the fork/repair decision.

The driver does NOT spawn a sub-agent itself — \`stage\` prints the spawn prompt
for the Phase Agent to spawn via its native Agent tool.`);
}

function emit(value) {
  console.log(JSON.stringify(value, null, 2));
}

function fail(message) {
  emit({ ok: false, error: message });
  process.exit(1);
}

const [command, bundle] = process.argv.slice(2);
if (!command || !bundle) {
  usage();
  process.exit(1);
}

const bundleDir = path.resolve(bundle);

// ── Wave inference: default to next wave (max existing _subagents/wave_NN + 1) ──
function inferWaveFromBundle(baseDir) {
  const subagentsDir = path.join(baseDir, '_subagents');
  if (!existsSync(subagentsDir)) return 1;
  let maxWave = 0;
  for (const entry of readdirSync(subagentsDir)) {
    const m = entry.match(/^wave_(\d+)$/);
    if (m) maxWave = Math.max(maxWave, parseInt(m[1], 10));
  }
  return maxWave + 1;
}

// The relay engine needs an in-memory workflow state (SubagentWorkflowState is
// not persisted). Staging only happens on the 'pass' branch; the driver
// constructs a pass-branch state anchored to the target wave so nextWaveIndex()
// resolves to <waveIndex>.
function passBranchState(waveIndex) {
  return {
    current_gate: `wave${Math.max(0, waveIndex - 1)}_complete`,
    ref_count: 5,
    ref_floor: 5,
    topicReadiness: 'ready',
    subagent_wave: Math.max(0, waveIndex - 1),
    subagent_all_failed: false,
    subagent_results: [],
  };
}

try {
  if (command === 'stage') {
    handleStage();
  } else if (command === 'commit') {
    handleCommit();
  } else if (command === 'merge') {
    handleMerge();
  } else {
    usage();
    fail(`Unknown command: ${command}`);
  }
} catch (err) {
  // Surface engine errors deterministically (SRD-002: no semantic verdicts).
  const safeMsg = (err.message || String(err)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 500);
  fail(safeMsg);
}

// ── stage ─────────────────────────────────────────────────────────────────
function handleStage() {
  const isReplacement = process.argv.includes('--slot-index');
  if (isReplacement) {
    const { values } = parseArgs({
      args: process.argv.slice(4),
      options: {
        wave: { type: 'string' },
        'slot-index': { type: 'string' },
        role: { type: 'string' },
        key: { type: 'string' },
        task: { type: 'string' },
        'cache-dir': { type: 'string' },
        platform: { type: 'string', default: 'unknown' },
      },
      allowPositionals: false,
    });
    const waveIndex = values.wave ? parseInt(values.wave, 10) : inferWaveFromBundle(bundleDir);
    const slotIndex = parseInt(values['slot-index'], 10);
    if (!values.role || !values.key || !values.task || Number.isNaN(slotIndex)) {
      fail('Replacement stage requires --slot-index, --role, --key, and --task');
    }
    const slot = stageReplacementSlot(bundleDir, {
      key: values.key,
      slotIndex,
      roleAgentKey: values.role,
      taskDescription: values.task,
    }, waveIndex, values['cache-dir'] || null);
    const prompt = recordAgentSpawnRequested(slot, bundleDir, { platform: values.platform });
    emit({ ok: true, command: 'stage', mode: 'replacement', waveIndex, slot: stripSlot(slot), spawnPrompt: prompt });
    return;
  }

  const { values } = parseArgs({
    args: process.argv.slice(4),
    options: {
      wave: { type: 'string' },
      platform: { type: 'string', default: 'unknown' },
    },
    allowPositionals: false,
  });
  const waveIndex = values.wave ? parseInt(values.wave, 10) : inferWaveFromBundle(bundleDir);
  const state = passBranchState(waveIndex);
  const slots = stageSubagentSlots(state, bundleDir);
  if (slots.length === 0) {
    fail(`stageSubagentSlots returned no slots for wave ${waveIndex} (branch not 'pass')`);
  }
  const spawned = slots.map((slot) => {
    const prompt = recordAgentSpawnRequested(slot, bundleDir, { platform: values.platform });
    return { slot: stripSlot(slot), spawnPrompt: prompt };
  });
  emit({ ok: true, command: 'stage', mode: 'full', waveIndex, slots: spawned.map((s) => s.slot), spawnPrompts: spawned });
}

// ── commit ────────────────────────────────────────────────────────────────
function handleCommit() {
  const { values } = parseArgs({
    args: process.argv.slice(4),
    options: {
      wave: { type: 'string' },
      slot: { type: 'string' },
      result: { type: 'string' },
      'runtime-agent-id': { type: 'string' },
      platform: { type: 'string', default: 'unknown' },
      'runtime-mode': { type: 'string' },
    },
    allowPositionals: false,
  });
  if (!values.wave || !values.slot || !values.result) {
    fail('commit requires --wave, --slot, and --result');
  }
  const waveIndex = parseInt(values.wave, 10);
  let candidate;
  try {
    candidate = JSON.parse(values.result);
  } catch (err) {
    fail(`--result is not valid JSON: ${err.message}`);
  }

  // Load the slot from dispatch.json (preserves the persisted nonce).
  const slot = loadSlotByManifestEntry(bundleDir, waveIndex, values.slot);

  // SRD-003: result passes through commitSlotResult validation unchanged. The
  // driver never writes result.json itself and never mutes a schema failure.
  const metadata = { platform: values.platform, runtimeMode: values['runtime-mode'] };
  // ingestAgentReceipt requires a runtimeAgentId; require it for a real relay
  // run. If the receipt is missing/invalid, surface the engine error.
  if (!values['runtime-agent-id']) {
    fail('commit requires --runtime-agent-id (the sub-agent runtime ID from the Agent tool response)');
  }
  metadata.runtimeAgentId = values['runtime-agent-id'];

  let ingest;
  try {
    ingest = ingestAgentReceipt(slot, bundleDir, metadata);
  } catch (err) {
    const safeMsg = (err.message || String(err)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 500);
    fail(`ingestAgentReceipt failed: ${safeMsg}`);
  }
  const relay = commitSlotResult(slot, bundleDir, candidate, metadata);
  emit({
    ok: relay.ok,
    command: 'commit',
    waveIndex,
    slotKey: slot.key,
    status: relay.result.status,
    validationOk: relay.ok,
    error: relay.ok ? undefined : (relay.result.notes || []),
    receiptRef: ingest.receiptRef,
    result: relay.result,
    agent: relay.agent,
  });
}

// ── merge ─────────────────────────────────────────────────────────────────
function handleMerge() {
  const { values } = parseArgs({
    args: process.argv.slice(4),
    options: {
      wave: { type: 'string' },
    },
    allowPositionals: false,
  });
  if (!values.wave) {
    fail('merge requires --wave');
  }
  const waveIndex = parseInt(values.wave, 10);
  // Load all slots for the wave from dispatch.json.
  const waveDir = path.join(bundleDir, '_subagents', `wave_${String(waveIndex).padStart(2, '0')}`);
  const dispatchPath = path.join(waveDir, 'dispatch.json');
  if (!existsSync(dispatchPath)) {
    fail(`dispatch.json missing for wave ${waveIndex} — stage before merging`);
  }
  const manifest = JSON.parse(readFileSync(dispatchPath, 'utf-8'));
  const slots = (manifest.slots || []).map((entry) => loadSlotByManifestEntry(bundleDir, waveIndex, entry.key));
  if (slots.length === 0) {
    fail(`no slots recorded in dispatch.json for wave ${waveIndex}`);
  }
  const state = passBranchState(waveIndex);
  const merged = collectAndMergeSubagentResults(state, slots, bundleDir);
  emit({
    ok: true,
    command: 'merge',
    waveIndex,
    finalState: merged.finalState,
    checkResult: merged.checkResult,
    forkDecision: merged.forkDecision,
    repaired: merged.repaired,
    phaseLog: merged.phaseLog,
  });
}

// Slot objects carry derived paths the driver caller doesn't need; keep the
// emit lean with the identifying fields.
function stripSlot(slot) {
  return {
    key: slot.key,
    roleAgentKey: slot.roleAgentKey,
    waveIndex: slot.waveIndex,
    slotIndex: slot.slotIndex,
    receiptNonce: slot.receiptNonce,
    status: slot.status,
    slotDir: path.dirname(slot.taskPath),
  };
}
