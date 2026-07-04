// subagent-relay-helpers.mjs — shared fixtures for subagent-relay regression tests
// @impl FRE-004

import { existsSync, readFileSync, writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';

export function tempDir() {
  return mkdtempSync(path.join(tmpdir(), 'gs_test_'));
}

export function baseState(overrides = {}) {
  return {
    current_gate: 'wave0_complete',
    ref_count: 5,
    ref_floor: 5,
    topicReadiness: 'ready',
    ...overrides,
  };
}

export function doneResult(slot, evidenceCount = 2, outputFiles = []) {
  return {
    slotKey: slot.key,
    roleAgentKey: slot.roleAgentKey,
    status: 'done',
    summary: `Completed ${slot.roleAgentKey}`,
    evidenceCount,
    references: [{
      title: 'Example source',
      url: 'https://example.com/source',
      quote: 'short relevant fact',
      relevance: 'supports the slot task',
    }],
    confidence: 0.8,
    notes: [],
    output_files: outputFiles,
    cache_trails: [],
  };
}

/** Write a minimal countable reference file to disk. */
export function writeCountableRef(bundleDir, relPath, sourceUrl) {
  const absPath = path.join(bundleDir, relPath);
  mkdirSync(path.dirname(absPath), { recursive: true });
  writeFileSync(absPath, [
    `- source_url: ${sourceUrl}`,
    '- acceptance_status: accepted',
    '- source_type: primary',
    '- tier: Tier 2',
    '- trust_level: expert',
    '- related_topic: topic-a',
    '- evidence_role: deepening_reference',
    '- why_it_matters: Test reference.',
    '- accessed_at: 2026-06-15',
    '',
    '## Key Facts',
    '- Fact 1: Important finding.',
    '- Fact 2: Second insight.',
    '- Fact 3: Third data point.',
    '- Fact 4: Fourth observation.',
    '- Fact 5: Fifth fact.',
    '',
    '## Core Content Capture',
    'This is substantive content that is more than one hundred characters. It provides meaningful analysis of the source material and extends well beyond a brief summary to ensure quality thresholds are met.',
    '',
    '## Relevance To This Research',
    'Relevant context.',
    '',
    '## Quotable Terms / Concepts',
    '- Term',
    '',
    '## Risks And Limitations',
    'Limited.',
  ].join('\n'));
}

export function writeRuntimeReceipt(baseDir, slot, overrides = {}) {
  const receiptFile = path.join(baseDir, slot.receiptPath);
  mkdirSync(path.dirname(receiptFile), { recursive: true });
  const common = {
    slotKey: slot.key,
    roleAgentKey: slot.roleAgentKey,
    receiptNonce: slot.receiptNonce,
    platform: overrides.platform || 'codex',
    runtimeMode: overrides.runtimeMode || 'project-agent',
    agentType: overrides.agentType,
  };
  writeFileSync(receiptFile, [
    JSON.stringify({ event: 'agent_runtime_started', ...common }),
    JSON.stringify({ event: 'agent_result_ready', ...common }),
  ].join('\n') + '\n');
}

export function setupRelayBundle(name) {
  const dir = mkdtempSync(path.join(tmpdir(), `gs_log_${name}_`));
  writeFileSync(path.join(dir, 'rb_status.json'), JSON.stringify({ bundle: `dpt_rb_${name}` }));
  return dir;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Read rb_trace.jsonl events (array of parsed objects) for a bundle. */
export function readTraceEvents(bundleDir) {
  const tracePath = path.join(bundleDir, 'rb_trace.jsonl');
  if (!existsSync(tracePath)) return [];
  return readFileSync(tracePath, 'utf-8').trim().split('\n').filter(Boolean)
    .map((line) => JSON.parse(line));
}

export function freshSlot(index = 0, key = 'test') {
  return {
    key,
    roleAgentKey: 'dpt-source-intake',
    waveIndex: 1,
    slotIndex: index,
    taskPath: `_subagents/wave_01/slot_${String(index).padStart(2, '0')}/task.md`,
    schemaPath: `_subagents/wave_01/slot_${String(index).padStart(2, '0')}/result.schema.json`,
    resultPath: `_subagents/wave_01/slot_${String(index).padStart(2, '0')}/result.json`,
    summaryPath: `_subagents/wave_01/slot_${String(index).padStart(2, '0')}/result.md`,
    statusPath: `_subagents/wave_01/slot_${String(index).padStart(2, '0')}/_status.json`,
    agentPath: `_subagents/wave_01/slot_${String(index).padStart(2, '0')}/_agent.json`,
    receiptPath: `_subagents/wave_01/slot_${String(index).padStart(2, '0')}/runtime-receipt.jsonl`,
    receiptNonce: `nonce-${index}`,
    status: 'pending',
  };
}
