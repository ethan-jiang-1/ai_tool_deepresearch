// logger.test.mjs — Logger regression tests
// @impl LOG-001, LOG-002, LOG-005

import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, '.test-logger-tmp');

const { createLogger, logToRun, createRunLogger, readBundleName } = await import('../../DPT_FRAMEWORK/engine/logger.mjs');

after(() => {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

describe('createLogger default (console only)', () => {
  it('returns logger with debug/info/warn/error methods', () => {
    const log = createLogger();
    assert.strictEqual(typeof log.debug, 'function');
    assert.strictEqual(typeof log.info, 'function');
    assert.strictEqual(typeof log.warn, 'function');
    assert.strictEqual(typeof log.error, 'function');
  });

  it('default level info filters debug', () => {
    // Can't easily test console output, but verify the log doesn't throw
    const log = createLogger();
    log.debug('should not appear');  // below default 'info'
    log.info('should appear');
    // No assertion on output — just verify no crash
  });
});

describe('createLogger with level', () => {
  it('respects warn level filter', () => {
    const log = createLogger({ level: 'warn' });
    log.info('filtered');
    log.warn('visible');
    // No crash
  });

  it('shows all at debug level', () => {
    const log = createLogger({ level: 'debug' });
    log.debug('debug msg');
    log.info('info msg');
    log.warn('warn msg');
    log.error('error msg');
  });
});

describe('createLogger with file', () => {
  it('writes to file and creates directory', () => {
    const filePath = join(TMP, 'sub', 'run.log');
    const log = createLogger({ file: filePath });
    log.info('test message', { key: 'val' });
    log.warn('warning', { code: 1 });

    assert.ok(existsSync(filePath));
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    assert.strictEqual(lines.length, 2);
    assert.ok(lines[0].includes('INFO test message {"key":"val"}'));
    assert.ok(lines[1].includes('WARN warning {"code":1}'));
  });

  it('console also outputs when file is set', () => {
    const filePath = join(TMP, 'dual.log');
    const log = createLogger({ file: filePath });
    // Should write to both console and file without error
    log.info('dual output');
    assert.ok(existsSync(filePath));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// LOG-005: logToRun, createRunLogger, readBundleName
// ═══════════════════════════════════════════════════════════════════════════

function setupBundle(bundleName) {
  const bundleDir = join(TMP, `dpt_rb_${bundleName}`);
  mkdirSync(bundleDir, { recursive: true });
  writeFileSync(join(bundleDir, 'rb_status.json'), JSON.stringify({ bundle: bundleName }));
  return bundleDir;
}

describe('readBundleName (LOG-005, TRW-003)', () => {
  it('reads bundle from rb_status.json', () => {
    const b = setupBundle('test-read');
    assert.strictEqual(readBundleName(b), 'test-read');
  });

  it('returns <unknown> for missing rb_status.json', () => {
    const b = join(TMP, 'dpt_rb_no_status');
    mkdirSync(b, { recursive: true });
    assert.strictEqual(readBundleName(b), '<unknown>');
  });

  it('returns <unknown> for unparseable rb_status.json', () => {
    const b = join(TMP, 'dpt_rb_bad_json');
    mkdirSync(b, { recursive: true });
    writeFileSync(join(b, 'rb_status.json'), 'not json');
    assert.strictEqual(readBundleName(b), '<unknown>');
  });

  it('returns <unknown> when bundle field is missing', () => {
    const b = join(TMP, 'dpt_rb_no_field');
    mkdirSync(b, { recursive: true });
    writeFileSync(join(b, 'rb_status.json'), JSON.stringify({ other: 'data' }));
    assert.strictEqual(readBundleName(b), '<unknown>');
  });
});

describe('logToRun (LOG-005, LOC-007)', () => {
  it('writes to _logs/run.log with unified envelope format', () => {
    const b = setupBundle('test-logtorun');
    logToRun(b, 'info', 'phase:test START');
    logToRun(b, 'warn', 'gate:test FAIL', { gate: 'test', passed: false });

    const logPath = join(b, '_logs', 'run.log');
    assert.ok(existsSync(logPath));
    const content = readFileSync(logPath, 'utf-8');
    const lines = content.trim().split('\n');
    assert.strictEqual(lines.length, 2);

    // Envelope: [ISO8601] LEVEL msg bundle=<name> {optional JSON}
    for (const line of lines) {
      assert.match(line, /^\[.+\] (INFO|WARN) .+ bundle=test-logtorun/);
    }
    assert.ok(lines[0].includes('phase:test START'));
    assert.ok(lines[1].includes('gate:test FAIL'));
    assert.ok(lines[1].includes('{"gate":"test","passed":false}'));
  });

  it('auto-creates _logs directory', () => {
    const b = setupBundle('test-logtorun-dir');
    logToRun(b, 'info', 'test');
    assert.ok(existsSync(join(b, '_logs', 'run.log')));
  });

  it('never throws when _logs is unwritable', () => {
    const b = setupBundle('test-logtorun-nowrite');
    // Make _logs a file so mkdirSync fails
    writeFileSync(join(b, '_logs'), 'block');
    // Should not throw
    logToRun(b, 'info', 'should not throw');
  });

  it('includes bundle=<unknown> when rb_status.json is missing', () => {
    const b = join(TMP, 'dpt_rb_no_status_log');
    mkdirSync(b, { recursive: true });
    logToRun(b, 'info', 'test');
    const logPath = join(b, '_logs', 'run.log');
    const content = readFileSync(logPath, 'utf-8');
    assert.ok(content.includes('bundle=<unknown>'));
  });
});

describe('createRunLogger (LOG-005, LOC-008)', () => {
  it('returns logger with info/warn/error/debug methods', () => {
    const b = setupBundle('test-runlogger');
    const log = createRunLogger(b);
    assert.strictEqual(typeof log.info, 'function');
    assert.strictEqual(typeof log.warn, 'function');
    assert.strictEqual(typeof log.error, 'function');
    assert.strictEqual(typeof log.debug, 'function');
  });

  it('writes to _logs/run.log with bundle in every line', () => {
    const b = setupBundle('test-runlogger-write');
    const log = createRunLogger(b);
    log.info('enqueue', { work_id: 'w1' });
    log.warn('fail', { work_id: 'w2', reason: 'test' });

    const logPath = join(b, '_logs', 'run.log');
    const content = readFileSync(logPath, 'utf-8');
    const lines = content.trim().split('\n');
    assert.strictEqual(lines.length, 2);
    for (const line of lines) {
      assert.ok(line.includes('bundle=test-runlogger-write'));
    }
  });

  it('no console output from logToRun (file-only)', () => {
    // logToRun is file-only — verify it doesn't crash (can't easily test console suppression)
    const b = setupBundle('test-runlogger-console');
    logToRun(b, 'info', 'silent');
    assert.ok(existsSync(join(b, '_logs', 'run.log')));
  });
});

describe('createLogger with bundle option (LOG-005)', () => {
  it('includes bundle=<name> in every line when bundle option set', () => {
    const filePath = join(TMP, 'with-bundle.log');
    const log = createLogger({ file: filePath, bundle: 'my-research' });
    log.info('gate_attempt', { gate: 'wave0', passed: true });
    log.warn('gate_attempt', { gate: 'wave0', passed: false });

    const content = readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    assert.strictEqual(lines.length, 2);
    for (const line of lines) {
      assert.ok(line.includes('bundle=my-research'));
      assert.ok(line.includes('gate_attempt'));
    }
  });
});
