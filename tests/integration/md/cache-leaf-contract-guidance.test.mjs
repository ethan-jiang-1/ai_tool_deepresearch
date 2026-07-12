import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CACHE_BASE_LEAF_FILES,
  CACHE_SOURCE_MAPPING_FIELDS,
} from '../../../DPT_FRAMEWORK/engine/helpers/cache-leaf-contract.mjs';

const REPO_ROOT = join(import.meta.dirname, '../../..');
const PROJECTIONS = [
  'DPT_FRAMEWORK/workflows/nodes/shared/shared-subagent-protocol.md',
  'DPT_FRAMEWORK/workflows/nodes/shared/shared-anti-cheating-rules.md',
  'DPT_FRAMEWORK/rb_templates/_cache/README.md.tmpl',
];

describe('cache leaf Agent-facing projections', () => {
  it('retains the Engine-owned required files and mapping vocabulary', () => {
    for (const relativePath of PROJECTIONS) {
      const text = readFileSync(join(REPO_ROOT, relativePath), 'utf8');
      for (const file of CACHE_BASE_LEAF_FILES) assert.match(text, new RegExp(file.replace('.', '\\.')));
      for (const field of CACHE_SOURCE_MAPPING_FIELDS) assert.match(text, new RegExp(`\\b${field}\\b`));
    }
  });
});
