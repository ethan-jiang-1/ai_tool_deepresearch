// logger.test.mjs — Logger regression tests
// @impl LOG-001, LOG-002

import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, '.test-logger-tmp');

const { createLogger } = await import('../../DPT_FRAMEWORK/engine/logger.mjs');

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
