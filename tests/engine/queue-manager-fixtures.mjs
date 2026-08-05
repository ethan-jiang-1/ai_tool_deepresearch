// @impl FRE-005
// Shared Queue Manager regression fixtures. Tests import Queue Manager through the public barrel only.

import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { makeItem } from '../../DEEP_RESEARCH_HARNESS/engine/queue-manager.mjs';

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
    queue_item_id: `queue-${n}`,
    title: `Work ${n}`,
    action: `Do work ${n}`,
    ...overrides,
  });
}
