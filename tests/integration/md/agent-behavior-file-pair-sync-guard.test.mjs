// agent-behavior-file-pair-sync-guard.test.mjs
// Deterministic single-source shape guard for the AGENTS.md/CLAUDE.md pairs.
// Root pair and Harness pair must hold AGENTS.md as the sole regular file and
// CLAUDE.md as a symlink resolving to it (no second copy can drift).
// @impl ACR-002, ACR-004

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { lstatSync, realpathSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..');

describe('AGENTS.md/CLAUDE.md behavior-file single-source guard', () => {
  it('keeps each entry directory a single real file with CLAUDE.md as a symlink to AGENTS.md', () => {
    for (const dir of ['', 'DEEP_RESEARCH_HARNESS']) {
      const label = dir === '' ? 'root' : dir;
      const agentsPath = join(REPO_ROOT, dir, 'AGENTS.md');
      const claudePath = join(REPO_ROOT, dir, 'CLAUDE.md');
      const agentsStat = statSync(agentsPath);
      assert.ok(agentsStat.isFile(), `${label}: AGENTS.md must be a regular file`);
      const claudeLstat = lstatSync(claudePath);
      assert.ok(claudeLstat.isSymbolicLink(), `${label}: CLAUDE.md must be a symlink to AGENTS.md`);
      assert.equal(
        realpathSync(claudePath),
        realpathSync(agentsPath),
        `${label}: CLAUDE.md must resolve to the co-located AGENTS.md`,
      );
    }
  });
});
