#!/usr/bin/env node
// @impl EXA-002, EXA-004, PLR-001

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readAndValidateManifest } from './lib/agent-experiment-contract.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
try {
  const result = readAndValidateManifest({ repoRoot, requireExactCorpus: true });
  console.log(JSON.stringify({ ok: true, active_count: result.entries.length, cases: result.entries.map((entry) => entry.frontmatter.case) }));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }));
  process.exit(1);
}
