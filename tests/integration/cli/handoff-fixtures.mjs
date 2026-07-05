import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

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
  writeFileSync(join(bundlePath, 'rb_trace.jsonl'), events.map(e => JSON.stringify(e)).join('\n') + '\n');
}
