// @impl AGQ-019, FRE-005
// Queue Manager projection renderer: writes the Agent-facing Markdown projection.

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  bundlePath,
  traceEntry,
  validateQueue,
} from './queue-manager-core.mjs';

export function render(queue, bundleDir = process.cwd()) {
  const q = validateQueue(queue);
  const outputPath = bundlePath(bundleDir, q.projection_path);
  mkdirSync(path.dirname(outputPath), { recursive: true });
  const lines = [
    '# Agentic Queue Projection',
    '',
    '> Generated from `rb_queue.json`. Do not edit this projection as queue authority.',
    `> **Runtime** - bundle: \`${bundleDir}\` | CLI: \`--bundle ${bundleDir}\` | projection != authority`,
    '',
    `- queue_id: \`${q.queue_id}\``,
    `- queue_health: \`${q.queue_health}\``,
    `- stop_authorization_state: \`${q.stop_authorization_state}\``,
    `- active_window_count: \`${q.active_window.length}\``,
    `- refill_pool_count: \`${q.refill_pool.length}\``,
    `- delegated_in_flight_count: \`${Object.keys(q.delegated_in_flight || {}).length}\``,
    '',
    '## Active Window',
    '',
  ];
  if (q.active_window.length === 0) {
    lines.push('- empty');
  } else {
    for (const [index, item] of q.active_window.entries()) {
      lines.push(
        `### ${index + 1}. ${item.queue_item_id}`,
        `- queue_item_id: \`${item.queue_item_id}\``,
        `- title: ${item.title}`,
        `- targets: \`controller=${item.targets?.controller || 'unknown'}${item.targets?.delegates ? `, delegates.to=${item.targets.delegates.to}, delegates.role_key=${item.targets.delegates.role_key}` : ''}\``,
        `- status: \`${item.status}\``,
        `- action: ${item.action}`,
        `- required_receipts: ${item.required_receipts.map(r => `\`${r}\``).join(', ') || '`none`'}`,
        `- completion_receipt: \`${item.completion_receipt}\``,
        `- writes_to: ${item.writes_to.map(r => `\`${r}\``).join(', ') || '`none`'}`,
        `- failure_route: ${item.failure_route}`,
        '',
      );
    }
  }
  lines.push('## Delegated In Flight', '');
  const inFlight = Object.values(q.delegated_in_flight || {});
  if (inFlight.length === 0) lines.push('- empty');
  for (const entry of inFlight) {
    lines.push(`- \`${entry.queue_item_id}\` -> \`${entry.work_id}\` (${entry.kind}, deadline=${entry.deadline_at})`);
  }
  lines.push('', '## Refill Pool', '');
  for (const item of q.refill_pool) lines.push(`- \`${item.queue_item_id}\` ${item.title} (${item.priority_class}, restore=${item.restore_priority})`);
  if (q.refill_pool.length === 0) lines.push('- empty');
  writeFileSync(outputPath, `${lines.join('\n')}\n`);
  traceEntry('projection_rendered', { source: 'agq-projection', path: q.projection_path });
  return outputPath;
}
