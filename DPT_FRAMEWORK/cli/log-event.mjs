#!/usr/bin/env node
// @impl LOC-009: Agent log CLI — bash interface for Agent to write _logs/run.log
//
// Usage:
//   node DPT_FRAMEWORK/cli/log-event.mjs --bundle <path> --level <LEVEL> --msg "<message>" [--detail '<json>']
//
// Always exits 0 — diagnostics must not block agent flow.
// On failure (missing args, unwritable file), silently exits 0.

import { parseArgs } from 'node:util';
import { logToRun } from '../engine/logger.mjs';

const { values } = parseArgs({
  options: {
    bundle: { type: 'string' },
    level:  { type: 'string' },
    msg:    { type: 'string' },
    detail: { type: 'string' },
  },
});

// Validate required args — fail silently per design (exit 0)
if (!values.bundle || !values.level || !values.msg) {
  process.exit(0);
}

// Validate level
const validLevels = ['debug', 'info', 'warn', 'error'];
if (!validLevels.includes(values.level)) {
  process.exit(0);
}

// Parse optional detail JSON
let detail = undefined;
if (values.detail) {
  try {
    detail = JSON.parse(values.detail);
  } catch {
    // Invalid JSON — log it as a plain string detail instead of dropping
    detail = { _raw: values.detail };
  }
}

// Write to _logs/run.log. logToRun never throws.
logToRun(values.bundle, values.level, values.msg, detail);

process.exit(0);
