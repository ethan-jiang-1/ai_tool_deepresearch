// @impl LDC-001 through LDC-009
// Integration tests for claude-deepseek.mjs launcher boundary.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, cpSync, mkdirSync, rmSync, writeFileSync, readFileSync, chmodSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

import { buildChildEnv } from '../../../DPT_FRAMEWORK/host_tools/lib/env-deepseek.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..');
const LAUNCHER_SRC = join(REPO_ROOT, 'DPT_FRAMEWORK', 'host_tools', 'claude-deepseek.mjs');
const TMP_ROOT = join(REPO_ROOT, 'tests', '.test-tmp');
const FAKE_CLAUDE = join(TMP_ROOT, 'fake-claude.mjs');

const tempDirs = [];

function uniqueName() {
  return `ldc-${randomBytes(4).toString('hex')}`;
}

function setupTemp(name) {
  const dir = join(TMP_ROOT, name);
  rmSync(dir, { recursive: true, force: true });
  const hostToolsDir = join(dir, 'DPT_FRAMEWORK', 'host_tools');
  mkdirSync(hostToolsDir, { recursive: true });
  copyFileSync(LAUNCHER_SRC, join(hostToolsDir, 'claude-deepseek.mjs'));
  cpSync(join(REPO_ROOT, 'DPT_FRAMEWORK', 'host_tools', 'lib'), join(hostToolsDir, 'lib'), { recursive: true });
  const fakeBin = join(dir, 'fake_bin');
  mkdirSync(fakeBin, { recursive: true });
  copyFileSync(FAKE_CLAUDE, join(fakeBin, 'claude'));
  chmodSync(join(fakeBin, 'claude'), 0o755);
  tempDirs.push(dir);
  return dir;
}

// ── fake claude fixture ───────────────────────────────────────────
before(() => {
  mkdirSync(TMP_ROOT, { recursive: true });
  writeFileSync(FAKE_CLAUDE, `#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
const record = {
  args: process.argv.slice(2),
  env: {
    ANTHROPIC_AUTH_TOKEN: process.env.ANTHROPIC_AUTH_TOKEN || null,
    ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL || null,
    ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || null,
    ANTHROPIC_DEFAULT_OPUS_MODEL: process.env.ANTHROPIC_DEFAULT_OPUS_MODEL || null,
    ANTHROPIC_DEFAULT_SONNET_MODEL: process.env.ANTHROPIC_DEFAULT_SONNET_MODEL || null,
    ANTHROPIC_DEFAULT_HAIKU_MODEL: process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL || null,
    CLAUDE_CODE_SUBAGENT_MODEL: process.env.CLAUDE_CODE_SUBAGENT_MODEL || null,
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: process.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC || null,
    ENABLE_TOOL_SEARCH: process.env.ENABLE_TOOL_SEARCH || null,
    API_TIMEOUT_MS: process.env.API_TIMEOUT_MS || null,
  },
  cwd: process.cwd(),
};
const exitCode = parseInt(process.env.CLAUDE_FAKE_EXIT_CODE || '0', 10);
const recordFile = process.env.CLAUDE_FAKE_RECORD_FILE;
if (recordFile) writeFileSync(recordFile, JSON.stringify(record));
if (record.args.length) process.stdout.write(record.args.join(' '));
process.exit(exitCode);
`);
  chmodSync(FAKE_CLAUDE, 0o755);
});

after(() => {
  for (const d of tempDirs) {
    try { rmSync(d, { recursive: true, force: true }); } catch {}
  }
});

function runLauncher(tempDir, args = [], extraEnv = {}) {
  const hostToolsDir = join(tempDir, 'DPT_FRAMEWORK', 'host_tools');
  const launcher = join(hostToolsDir, 'claude-deepseek.mjs');
  const fakeBin = join(tempDir, 'fake_bin');
  const env = { ...process.env };
  // clean inherited routing vars so test config is isolated
  for (const k of Object.keys(env)) {
    if (k.startsWith('ANTHROPIC_') || k.startsWith('DEEPSEEK_')) delete env[k];
  }
  for (const k of ['CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC', 'CLAUDE_CODE_SUBAGENT_MODEL', 'ENABLE_TOOL_SEARCH', 'API_TIMEOUT_MS']) {
    delete env[k];
  }
  Object.assign(env, { PATH: `${fakeBin}:${env.PATH}`, ...extraEnv });
  return spawnSync(process.execPath, [launcher, ...args], {
    cwd: tempDir,
    env,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 10_000,
  });
}

function writeEnv(tempDir, vars) {
  writeFileSync(join(tempDir, '.env'), Object.entries(vars)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n'));
}

function readRecord(tempDir, file) {
  return JSON.parse(readFileSync(join(tempDir, file), 'utf-8'));
}

// ── tests ─────────────────────────────────────────────────────────
describe('claude-deepseek.mjs', () => {
  // 1
  it('--check passes with valid remote config', () => {
    const d = setupTemp(uniqueName());
    writeEnv(d, {
      DEEPSEEK_API_KEY: 'sk-test1234',
      DEEPSEEK_ANTHROPIC_BASE_URL: 'https://api.deepseek.com/anthropic',
      DEEPSEEK_MODEL: 'deepseek-v4-pro',
    });
    const r = runLauncher(d, ['--check']);
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes('[OK]'));
    assert.ok(r.stdout.includes('value redacted'));
    assert.ok(!r.stdout.includes('sk-test1234'));
  });

  // 2
  it('--check fails when root .env is missing', () => {
    const d = setupTemp(uniqueName());
    const r = runLauncher(d, ['--check']);
    assert.equal(r.status, 2);
    assert.ok(r.stderr.includes('.env') || r.stdout.includes('not found'));
  });

  // 3
  it('--check fails when DEEPSEEK_API_KEY is empty', () => {
    const d = setupTemp(uniqueName());
    writeEnv(d, {
      DEEPSEEK_API_KEY: '',
      DEEPSEEK_ANTHROPIC_BASE_URL: 'https://api.deepseek.com/anthropic',
      DEEPSEEK_MODEL: 'deepseek-v4-pro',
    });
    const r = runLauncher(d, ['--check']);
    assert.equal(r.status, 2);
  });

  // 4
  it('--check rejects malformed endpoint URL', () => {
    const d = setupTemp(uniqueName());
    writeEnv(d, {
      DEEPSEEK_API_KEY: 'sk-test1234',
      DEEPSEEK_ANTHROPIC_BASE_URL: 'not-a-url',
      DEEPSEEK_MODEL: 'deepseek-v4-pro',
    });
    const r = runLauncher(d, ['--check']);
    assert.equal(r.status, 2);
  });

  // 5
  it('--check with multiple failures reports all and exits 2', () => {
    const d = setupTemp(uniqueName());
    const r = runLauncher(d, ['--check'], { PATH: '/dev/null' });
    assert.equal(r.status, 2);
  });

  // 6
  it('--check fails when claude is not on PATH', () => {
    const d = setupTemp(uniqueName());
    writeEnv(d, {
      DEEPSEEK_API_KEY: 'sk-test1234',
      DEEPSEEK_ANTHROPIC_BASE_URL: 'https://api.deepseek.com/anthropic',
      DEEPSEEK_MODEL: 'deepseek-v4-pro',
    });
    const r = runLauncher(d, ['--check'], { PATH: '/dev/null' });
    assert.equal(r.status, 1);
  });

  // 7
  it('accepts remote endpoint and launches fake claude', () => {
    const d = setupTemp(uniqueName());
    writeEnv(d, {
      DEEPSEEK_API_KEY: 'sk-test1234',
      DEEPSEEK_ANTHROPIC_BASE_URL: 'https://api.deepseek.com/anthropic',
      DEEPSEEK_MODEL: 'deepseek-v4-pro',
    });
    const r = runLauncher(d);
    assert.equal(r.status, 0);
  });

  // 8
  it('rejects URL with embedded credentials', () => {
    const d = setupTemp(uniqueName());
    writeEnv(d, {
      DEEPSEEK_API_KEY: 'sk-test1234',
      DEEPSEEK_ANTHROPIC_BASE_URL: 'https://user:pass@api.deepseek.com/anthropic',
      DEEPSEEK_MODEL: 'deepseek-v4-pro',
    });
    const r = runLauncher(d);
    assert.equal(r.status, 2);
  });

  // 9
  it('passes arguments through to fake claude', () => {
    const d = setupTemp(uniqueName());
    const recordFile = 'record.json';
    writeEnv(d, {
      DEEPSEEK_API_KEY: 'sk-test1234',
      DEEPSEEK_ANTHROPIC_BASE_URL: 'https://api.deepseek.com/anthropic',
      DEEPSEEK_MODEL: 'deepseek-v4-pro',
    });
    const r = runLauncher(d, ['-p', 'hello', '--verbose'], { CLAUDE_FAKE_RECORD_FILE: recordFile });
    assert.equal(r.status, 0);
    const record = readRecord(d, recordFile);
    assert.deepEqual(record.args.slice(0, 2), ['--setting-sources', 'project,local']);
    assert.deepEqual(record.args.slice(2), ['-p', 'hello', '--verbose']);
  });

  // 10
  it('preserves fake claude exit code', () => {
    const d = setupTemp(uniqueName());
    writeEnv(d, {
      DEEPSEEK_API_KEY: 'sk-test1234',
      DEEPSEEK_ANTHROPIC_BASE_URL: 'https://api.deepseek.com/anthropic',
      DEEPSEEK_MODEL: 'deepseek-v4-pro',
    });
    const r = runLauncher(d, [], { CLAUDE_FAKE_EXIT_CODE: '42' });
    assert.equal(r.status, 42);
  });

  // 11
  it('removes inherited ANTHROPIC_* and maps root .env values', () => {
    const d = setupTemp(uniqueName());
    const recordFile = 'record.json';
    writeEnv(d, {
      DEEPSEEK_API_KEY: 'sk-root-key',
      DEEPSEEK_ANTHROPIC_BASE_URL: 'https://api.deepseek.com/anthropic',
      DEEPSEEK_MODEL: 'deepseek-v4-pro',
    });
    const r = runLauncher(d, [], {
      ANTHROPIC_BASE_URL: 'https://evil.com',
      ANTHROPIC_AUTH_TOKEN: 'sk-evil',
      ENABLE_TOOL_SEARCH: 'false',
      CLAUDE_FAKE_RECORD_FILE: recordFile,
    });
    assert.equal(r.status, 0);
    const record = readRecord(d, recordFile);
    assert.equal(record.env.ANTHROPIC_BASE_URL, 'https://api.deepseek.com/anthropic');
    assert.notEqual(record.env.ANTHROPIC_AUTH_TOKEN, 'sk-evil');
    assert.equal(record.env.ENABLE_TOOL_SEARCH, 'true');
  });

  it('rejects caller extras that attempt to select owned tool discovery', () => {
    assert.throws(() => buildChildEnv({
      DEEPSEEK_API_KEY: 'sk-root-key',
      DEEPSEEK_ANTHROPIC_BASE_URL: 'https://api.deepseek.com/anthropic',
      DEEPSEEK_MODEL: 'deepseek-v4-pro',
    }, {
      ENABLE_TOOL_SEARCH: 'false',
    }), /extra env cannot override provider routing: ENABLE_TOOL_SEARCH/);
  });

  // 12
  it('--check does not launch claude', () => {
    const d = setupTemp(uniqueName());
    writeEnv(d, {
      DEEPSEEK_API_KEY: 'sk-test1234',
      DEEPSEEK_ANTHROPIC_BASE_URL: 'https://api.deepseek.com/anthropic',
      DEEPSEEK_MODEL: 'deepseek-v4-pro',
    });
    const r = runLauncher(d, ['--check'], { CLAUDE_FAKE_EXIT_CODE: '99' });
    assert.equal(r.status, 0);
  });

  // 13
  it('does not shell-evaluate root .env', () => {
    const d = setupTemp(uniqueName());
    writeEnv(d, {
      DEEPSEEK_API_KEY: 'sk-test1234',
      DEEPSEEK_ANTHROPIC_BASE_URL: 'https://api.deepseek.com/anthropic',
      DEEPSEEK_MODEL: '$(echo pwned)',
    });
    const r = runLauncher(d, ['--check']);
    assert.equal(r.status, 2);
  });

  // 14
  it('does not inject --allow-dangerously-skip-permissions', () => {
    const d = setupTemp(uniqueName());
    const recordFile = 'record.json';
    writeEnv(d, {
      DEEPSEEK_API_KEY: 'sk-test1234',
      DEEPSEEK_ANTHROPIC_BASE_URL: 'https://api.deepseek.com/anthropic',
      DEEPSEEK_MODEL: 'deepseek-v4-pro',
    });
    runLauncher(d, ['-p', 'hello'], { CLAUDE_FAKE_RECORD_FILE: recordFile });
    const record = readRecord(d, recordFile);
    assert.ok(!record.args.includes('--allow-dangerously-skip-permissions'));
  });
});
