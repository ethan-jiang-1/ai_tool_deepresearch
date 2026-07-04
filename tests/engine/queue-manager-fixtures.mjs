// @impl FRE-005
// Shared Queue Manager regression fixtures. Tests import Queue Manager through the public barrel only.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { makeItem } from '../../DPT_FRAMEWORK/engine/queue-manager.mjs';
import { commitSlotResult, stageSubagentSlots, writeSlotStatus } from '../../DPT_FRAMEWORK/engine/subagent-relay.mjs';

export function tempBundle() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'agq-'));
  mkdirSync(path.join(dir, '_cache'), { recursive: true });
  return dir;
}

export function cleanup(dir) {
  rmSync(dir, { recursive: true, force: true });
}

export function item(n, overrides = {}) {
  return makeItem({
    work_id: `work-${n}`,
    title: `Work ${n}`,
    action: `Do work ${n}`,
    ...overrides,
  });
}

export function baseState(overrides = {}) {
  return {
    current_gate: 'wave0_complete', ref_count: 5, ref_floor: 5,
    topicReadiness: 'ready', ...overrides,
  };
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
  };
  writeFileSync(receiptFile, [
    JSON.stringify({ event: 'agent_runtime_started', ...common }),
    JSON.stringify({ event: 'agent_result_ready', ...common }),
  ].join('\n') + '\n');
}

export function setupDelegatedFixture(bundleDir) {
  // Create a slot with committed result, receipt, and cache
  const [slot] = stageSubagentSlots(baseState(), bundleDir);
  writeRuntimeReceipt(bundleDir, slot);
  // Import receipt (needed for commitSlotResult to work with running status)
  writeSlotStatus(slot, 'running', bundleDir);
  // Create output file
  const refDir = path.join(bundleDir, 'reference');
  mkdirSync(refDir, { recursive: true });
  writeFileSync(path.join(refDir, 'source.md'), '# Source\n\nKey Facts: real facts.\n');
  // Create cache leaf with 3 files
  const cacheLeaf = path.join(bundleDir, '_cache', 'wave0', 'primary', '01_test', 's01_source');
  mkdirSync(cacheLeaf, { recursive: true });
  writeFileSync(path.join(cacheLeaf, 'websearch.json'), '[]');
  writeFileSync(path.join(cacheLeaf, 'page.md'), '# Page');
  writeFileSync(path.join(cacheLeaf, 'meta.json'), '{"url":"https://example.com"}');
  // Commit slot result with declaration
  const relay = commitSlotResult(slot, bundleDir, {
    slotKey: slot.key, roleAgentKey: slot.roleAgentKey, status: 'done',
    summary: 'Done', evidenceCount: 1,
    references: [{ title: 'T', url: 'https://example.com/a', quote: 'q', relevance: 'r' }],
    confidence: 0.9, notes: [],
    output_files: [
      { path: 'reference/source.md', role: 'reference', source_url: 'https://example.com/a' },
    ],
    cache_trails: ['_cache/wave0/primary/01_test/s01_source/'],
  }, {
    platform: 'fixture',
    runtimeAgentId: 'fixture-agent-1',
  });
  return { slot, relay };
}
