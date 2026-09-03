import { readFileSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';

export function setStatusWindow(bundlePath, currentGate, nextGate) {
  const statusPath = join(bundlePath, 'rb_status.json');
  const status = JSON.parse(readFileSync(statusPath, 'utf-8'));
  status.current_gate = currentGate;
  status.next_gate = nextGate;
  writeFileSync(statusPath, JSON.stringify(status));
}

export function witnessedHandoffEvents({
  sourceGate,
  sourceNode,
  targetNode,
  phase,
  sourceTs = '2026-01-01T00:00:00.000Z',
  loadTs = '2026-01-01T00:00:01.000Z',
  sourceAttemptIndex = 0,
}) {
  return [
    {
      ts: sourceTs,
      event: 'gate_attempt',
      gate: sourceGate,
      phase,
      passed: true,
      currentNodeRef: sourceNode,
      next: targetNode,
    },
    {
      ts: loadTs,
      event: 'load_complete',
      entry: targetNode,
      handoff_source_gate: sourceGate,
      handoff_source_node: sourceNode,
      handoff_target_node: targetNode,
      handoff_source_attempt_index: sourceAttemptIndex,
    },
  ];
}

export function writeTraceEvents(bundlePath, events) {
  // @impl TRW-007: mirror the post-change engine writers — every event carries the
  // canonical bundle identity (directory basename) and a writer stamp. Events that
  // already carry an explicit `bundle`/`writer` keep them, so tests can deliberately
  // write forged shapes (e.g. rb_status.json short-name bundles).
  const canonicalBundle = basename(bundlePath);
  writeFileSync(join(bundlePath, 'rb_trace.jsonl'), events.map((e) => JSON.stringify({
    writer: 'engine',
    bundle: canonicalBundle,
    ...e,
  })).join('\n') + '\n');
}
