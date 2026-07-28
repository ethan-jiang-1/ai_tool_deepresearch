#!/usr/bin/env node
// @impl REF-003, RWG-018

import { resolve } from 'node:path';
import { syncReferenceIndex } from '../engine/helpers/reference-index-sync.mjs';

const index = process.argv.indexOf('--bundle');
const bundlePath = index >= 0 ? process.argv[index + 1] : null;
if (!bundlePath) {
  process.stdout.write(`${JSON.stringify({ verdict: 'blocked', reason_code: 'bundle_required', reason: '--bundle is required' })}\n`);
  process.exit(2);
}
const result = syncReferenceIndex(resolve(bundlePath));
process.stdout.write(`${JSON.stringify(result)}\n`);
process.exit(result.verdict === 'blocked' ? 1 : 0);
