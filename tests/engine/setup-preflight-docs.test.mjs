// Static regression coverage for human setup/pre-trigger permission UX.
// @impl ACS-002

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');

function read(relPath) {
  return readFileSync(join(REPO_ROOT, relPath), 'utf-8');
}

function listCommandPlaybooks() {
  const dir = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS', 'command_playbook');
  return readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .map((name) => `DEEP_RESEARCH_HARNESS/command_playbook/${name}`)
    .sort();
}

describe('human setup preflight docs', () => {
  it('keeps the installation baseline discoverable and loadable', async () => {
    assert.equal(read('.nvmrc').trim(), '22');

    const pkg = JSON.parse(read('package.json'));
    assert.match(pkg.dependencies.zod, /^\^\d+\.\d+\.\d+$/);
    assert.match(pkg.dependencies.yaml, /^\^\d+\.\d+\.\d+$/);
    assert.ok(existsSync(join(REPO_ROOT, 'package-lock.json')), 'package-lock.json must exist');

    const lock = JSON.parse(read('package-lock.json'));
    for (const dependency of ['zod', 'yaml']) {
      const locked = lock.packages[`node_modules/${dependency}`];
      assert.ok(locked, `package-lock.json must lock ${dependency}`);
      assert.match(locked.version, /^\d+\.\d+\.\d+$/, `${dependency} lock version must be a release`);
      const requested = pkg.dependencies[dependency].slice(1).split('.').map(Number);
      const resolved = locked.version.split('.').map(Number);
      assert.equal(resolved[0], requested[0], `${dependency} must remain within its declared major`);
      assert.ok(resolved[1] > requested[1] || (resolved[1] === requested[1] && resolved[2] >= requested[2]), `${dependency} lock must satisfy its declared caret range`);
    }

    await import('zod');
    await import('yaml');

    assert.match(read('README.md'), /npm install/);
    assert.match(read('DEEP_RESEARCH_HARNESS/command_playbook/start-research.md'), /npm install/);
    assert.match(read('DEEP_RESEARCH_HARNESS/command_playbook/instantiate-run-bundle.md'), /npm install/);
  });

  it('makes SETUP.md discoverable before the framework trigger', () => {
    const readme = read('README.md');
    const run = read('DEEP_RESEARCH_HARNESS/RUN.md');
    const setup = read('SETUP.md');

    assert.match(readme, /Before triggering `DEEP_RESEARCH_HARNESS\/RUN\.md`.*`SETUP\.md`/s);
    assert.match(run, /SETUP\.md/);
    assert.match(run, /trigger 前|pre-trigger/);
    assert.match(run, /不要把非 HITL `stop: no` phase 变成权限配置对话/);

    assert.match(setup, /before selecting the framework entry path/i);
    assert.match(setup, /DEEP_RESEARCH_HARNESS\/RUN\.md/);
    assert.match(setup, /HITL1 and HITL2 are the only interactive in-run checkpoints/);
  });

  it('documents Claude Code and Codex risk posture without copying local allowlists', () => {
    const setup = read('SETUP.md');

    for (const marker of [
      'reviewed / interactive',
      'autonomous research opt-in',
      'Claude Code',
      'Codex',
      'risk-free defaults',
      '.claude/settings.local.json',
      '.codex/config.toml',
      'approval_policy = "on-request"',
      'sandbox_mode = "danger-full-access"',
      'organization policy',
      'workspace trust',
    ]) {
      assert.ok(setup.includes(marker), `SETUP.md missing marker: ${marker}`);
    }

    assert.match(setup, /Do not copy this machine's ignored `.claude\/settings\.local\.json`/);
    assert.match(setup, /does not promise prompt-free execution/);
    assert.doesNotMatch(setup, /safe default/i);
  });

  it('keeps dry-submit and non-interactive boundaries honest', () => {
    const setup = read('SETUP.md');

    assert.match(setup, /`operate-work-unit dry-submit` is only a work-unit submit contract preflight/);
    assert.match(setup, /does not validate network access, shell access, file-write permission, web fetch permission, approval policy, or host sandbox settings/);
    assert.match(setup, /There is no gate `--non-interactive` flag/);
    assert.doesNotMatch(setup, /dry-submit.*grant/i);
  });

  it('keeps human permission setup outside Agent-facing command playbooks', () => {
    assert.equal(
      existsSync(join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS', 'command_playbook', 'setup-agent-permissions.md')),
      false,
      'human permission setup must not be a command_playbook entry',
    );

    for (const relPath of listCommandPlaybooks()) {
      const text = read(relPath);
      assert.doesNotMatch(text, /settings\.local\.json|approval_policy|autonomous research opt-in/i, `${relPath} must not become a human setup guide`);
    }
  });
});
