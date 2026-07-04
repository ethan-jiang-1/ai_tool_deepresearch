// @impl FRE-005
// Queue Manager projection renderer: writes the Agent-facing Markdown projection.

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  SLOT_NAMES,
  bundlePath,
  traceEntry,
  validateQueue,
} from './queue-manager-core.mjs';

/**
 * Render the queue as a Markdown projection file.
 *
 * @param {object} queue — current QueueState
 * @param {string} [bundleDir] — where to write the projection (defaults to cwd)
 * @returns {string} — path to the written projection file
 */
export function render(queue, bundleDir = process.cwd()) {
  const q = validateQueue(queue);
  const outputPath = bundlePath(bundleDir, q.projection_path);
  mkdirSync(path.dirname(outputPath), { recursive: true });
  const lines = ['# Agentic Queue Projection', '', '> Generated from `rb_queue.json`. Do not edit this projection as queue authority.', `> **Runtime** — bundle: \`${bundleDir}\` | CLI: \`--bundle ${bundleDir}\` | projection ≠ authority`, '', `- queue_id: \`${q.queue_id}\``, `- queue_health: \`${q.queue_health}\``, `- stop_authorization_state: \`${q.stop_authorization_state}\``, '', '## Active Window', ''];
  for (const slot of SLOT_NAMES) {
    const item = q.active_window[slot];
    lines.push(`### ${slot}`);
    if (!item) { lines.push('- empty: `true`', ''); continue; }
    lines.push(`- work_id: \`${item.work_id}\``, `- title: ${item.title}`, `- targets: \`controller=${item.targets?.controller || 'unknown'}${item.targets?.delegates ? `, delegates.to=${item.targets.delegates.to}, delegates.role_key=${item.targets.delegates.role_key}` : ''}\``, `- status: \`${item.status}\``, `- action: ${item.action}`, `- required_receipts: ${item.required_receipts.map(r => `\`${r}\``).join(', ') || '`none`'}`, `- completion_receipt: \`${item.completion_receipt}\``, `- writes_to: ${item.writes_to.map(r => `\`${r}\``).join(', ') || '`none`'}`, `- failure_route: ${item.failure_route}`, '');
  }
  lines.push('## Refill Pool', '');
  for (const item of q.refill_pool) lines.push(`- \`${item.work_id}\` ${item.title} (${item.priority_class}, restore=${item.restore_priority})`);
  if (q.refill_pool.length === 0) lines.push('- empty');
  writeFileSync(outputPath, `${lines.join('\n')}\n`);
  traceEntry('projection_rendered', { source: 'agq-projection', path: q.projection_path });
  return outputPath;
}
