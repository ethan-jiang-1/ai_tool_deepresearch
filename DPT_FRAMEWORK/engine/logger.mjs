// logger.mjs — minimal structured logger
// @impl LOG-001, LOG-002
//
// Complementary to trace.mjs (trace = audit trail, logger = diagnostic detail).
// Logger does NOT write to rb_trace.jsonl.
//
// Usage:
//   import { createLogger } from './logger.mjs';
//
//   // Default: console only, level 'info'
//   const log = createLogger();
//   log.info('task started', { taskId: 1 });
//
//   // Advanced: console + file
//   const log = createLogger({ file: 'dpt_rb_x/_logs/run.log' });
//   log.warn('disk low', { remaining: 0 });
//
//   // Silent no-op (injection pattern — caller passes null)
//   const log = null;
//   // if (log) log.info(...) — skipped silently
//
// Level hierarchy: debug < info < warn < error

import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const LEVEL_LABELS = { debug: 'DEBUG', info: 'INFO', warn: 'WARN', error: 'ERROR' };

/**
 * Create a logger instance.
 *
 * @param {object} [options]
 * @param {'debug'|'info'|'warn'|'error'} [options.level='info'] — minimum log level
 * @param {string} [options.file] — optional file path for append output (dir auto-created)
 * @returns {{ debug, info, warn, error }}
 */
export function createLogger(options = {}) {
  const level = options.level || 'info';
  const filePath = options.file || null;
  const threshold = LEVELS[level] ?? LEVELS.info;

  if (filePath) {
    const dir = path.dirname(filePath);
    mkdirSync(dir, { recursive: true });
  }

  function formatMessage(lvl, msg, detail) {
    const ts = new Date().toISOString();
    const label = LEVEL_LABELS[lvl];
    let line = `[${ts}] ${label} ${msg}`;
    if (detail !== undefined) {
      line += ` ${JSON.stringify(detail)}`;
    }
    return line;
  }

  function log(lvl, msg, detail) {
    if (LEVELS[lvl] < threshold) return;
    const line = formatMessage(lvl, msg, detail);

    // Console output — use appropriate stream
    if (lvl === 'error') {
      console.error(line);
    } else if (lvl === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }

    // File output — append
    if (filePath) {
      appendFileSync(filePath, line + '\n');
    }
  }

  return {
    debug(msg, detail) { log('debug', msg, detail); },
    info(msg, detail)  { log('info', msg, detail); },
    warn(msg, detail)  { log('warn', msg, detail); },
    error(msg, detail) { log('error', msg, detail); },
  };
}
