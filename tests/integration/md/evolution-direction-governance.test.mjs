import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parse as parseYaml } from 'yaml';

const REPO_ROOT = join(import.meta.dirname, '../../..');
const RETIRED_PATH = 'guidelines/simple-reliable-control.md';
const CURRENT_CHANGE = 'openspec/changes/harden-recovery-observability-and-contracts';
const SELF = 'tests/integration/md/evolution-direction-governance.test.mjs';
const SCAN_ROOTS = [
  'guidelines',
  '_backlog/plans',
  '_backlog/bugs',
  'openspec/changes',
  'DPT_FRAMEWORK',
  'tests',
];
const SCANNED_EXTENSIONS = new Set(['.md', '.mjs', '.js', '.json', '.yaml', '.yml']);

function walk(relativePath, output = []) {
  if (relativePath === SELF || relativePath.startsWith(`${CURRENT_CHANGE}/`)) return output;
  if (relativePath.startsWith('openspec/changes/archive/')) return output;
  if (relativePath.startsWith('_backlog/_done/_closed_plans/')) return output;
  const absolutePath = join(REPO_ROOT, relativePath);
  if (!existsSync(absolutePath)) return output;
  const stats = statSync(absolutePath);
  if (stats.isFile()) {
    if (SCANNED_EXTENSIONS.has(extname(relativePath))) output.push(relativePath);
    return output;
  }
  if (!stats.isDirectory()) return output;
  for (const entry of readdirSync(absolutePath)) {
    if (entry === '.git' || entry === 'node_modules' || entry.startsWith('.test-')) continue;
    walk(join(relativePath, entry), output);
  }
  return output;
}

describe('Evolution Direction governance', () => {
  it('keeps only the two canonical active guidance paths', () => {
    assert.equal(existsSync(join(REPO_ROOT, RETIRED_PATH)), false);
    assert.equal(existsSync(join(REPO_ROOT, 'guidelines/evolution-simple-reliable-control.md')), true);
    assert.equal(existsSync(join(REPO_ROOT, 'guidelines/evolution-helper-oriented-agent.md')), true);

    const violations = SCAN_ROOTS.flatMap((root) => walk(root)).filter((relativePath) =>
      readFileSync(join(REPO_ROOT, relativePath), 'utf8').includes(RETIRED_PATH));
    assert.deepEqual(violations, []);
  });

  it('loads paired simplicity and helper obligations from OpenSpec config', () => {
    const raw = readFileSync(join(REPO_ROOT, 'openspec/config.yaml'), 'utf8');
    const config = parseYaml(raw);
    assert.equal(typeof config.context, 'string');
    for (const marker of [
      'guidelines/evolution-simple-reliable-control.md',
      'guidelines/evolution-helper-oriented-agent.md',
      'direct Source of Record',
      'net simplification',
      '用户负责新的语义、风险与权限决定',
      'Agent 负责已授权的机械执行',
      'Engine 负责确定性 verdict',
      'human-directed',
    ]) assert.match(config.context, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.ok(config.rules.proposal.some((rule) => String(rule).includes('net simplification')));
    assert.ok(config.rules.design.some((rule) => String(rule).includes('paired-read')));
  });
});
