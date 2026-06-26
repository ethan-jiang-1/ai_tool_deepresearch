// log-event.test.mjs — CLI regression tests for log-event.mjs
// @impl LOC-009

import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, '.test-log-event-tmp');
const LOG_EVENT_CLI = join(__dirname, '../../../DPT_FRAMEWORK/cli/log-event.mjs');

after(() => {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

function setupBundle(bundleName) {
  const bundleDir = join(TMP, `dpt_rb_${bundleName}`);
  mkdirSync(bundleDir, { recursive: true });
  writeFileSync(join(bundleDir, 'rb_status.json'), JSON.stringify({ bundle: bundleName }));
  return bundleDir;
}

function runLogEvent(bundleDir, level, msg, detail) {
  let cmd = `node "${LOG_EVENT_CLI}" --bundle "${bundleDir}" --level ${level} --msg "${msg}"`;
  if (detail) cmd += ` --detail '${JSON.stringify(detail)}'`;
  return execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
}

describe('log-event.mjs CLI (LOC-009)', () => {
  it('writes to _logs/run.log', () => {
    const b = setupBundle('test-cli-write');
    runLogEvent(b, 'info', 'phase:wave0 START');
    const logPath = join(b, '_logs', 'run.log');
    assert.ok(existsSync(logPath));
    const content = readFileSync(logPath, 'utf-8');
    assert.ok(content.includes('phase:wave0 START'));
  });

  it('exits 0 when --bundle directory does not exist', () => {
    assert.doesNotThrow(() => {
      execSync(`node "${LOG_EVENT_CLI}" --bundle /nonexistent/path --level info --msg "test"`, {
        encoding: 'utf-8', stdio: 'pipe',
      });
    });
  });

  it('exits 0 when required args are missing', () => {
    assert.doesNotThrow(() => {
      execSync(`node "${LOG_EVENT_CLI}" --level info --msg "test"`, {
        encoding: 'utf-8', stdio: 'pipe',
      });
    });
  });

  it('writes unified envelope with bundle=<name>', () => {
    const b = setupBundle('test-cli-envelope');
    runLogEvent(b, 'info', 'phase:test START');
    const content = readFileSync(join(b, '_logs', 'run.log'), 'utf-8');
    assert.match(content, /^\[.+\] INFO phase:test START bundle=test-cli-envelope/);
  });

  it('writes with --detail JSON', () => {
    const b = setupBundle('test-cli-detail');
    runLogEvent(b, 'warn', 'repair', { slot: '03', reason: 'schema fail' });
    const content = readFileSync(join(b, '_logs', 'run.log'), 'utf-8');
    assert.ok(content.includes('"slot":"03"'));
    assert.ok(content.includes('"reason":"schema fail"'));
  });

  it('handles invalid --detail gracefully (wraps as _raw)', () => {
    const b = setupBundle('test-cli-bad-detail');
    let cmd = `node "${LOG_EVENT_CLI}" --bundle "${b}" --level info --msg "test" --detail 'not-json'`;
    execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
    const content = readFileSync(join(b, '_logs', 'run.log'), 'utf-8');
    // Should still write the log line, detail stored as _raw
    assert.ok(content.includes('test'));
  });

  it('WRITES at each valid level', () => {
    const b = setupBundle('test-cli-levels');
    for (const level of ['debug', 'info', 'warn', 'error']) {
      runLogEvent(b, level, `msg-${level}`);
    }
    const content = readFileSync(join(b, '_logs', 'run.log'), 'utf-8');
    assert.ok(content.includes('DEBUG msg-debug'));
    assert.ok(content.includes('INFO msg-info'));
    assert.ok(content.includes('WARN msg-warn'));
    assert.ok(content.includes('ERROR msg-error'));
  });
});
