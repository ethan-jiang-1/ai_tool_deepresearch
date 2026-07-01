#!/usr/bin/env node
// @impl LOC-009: Agent log CLI — bash interface for Agent to write _logs/run.log
// @impl CPT-002: --event mode writes phase-completion trace events to rb_trace.jsonl
// @impl FIO-003: --explain-file mode writes file explanation diagnostic events
//
// Usage (log mode — write to _logs/run.log):
//   node DPT_FRAMEWORK/cli/log-event.mjs --bundle <path> --level <LEVEL> --msg "<message>" [--detail '<json>']
//
// Usage (trace mode — write to rb_trace.jsonl):
//   node DPT_FRAMEWORK/cli/log-event.mjs --bundle <path> --event <event_name> [--detail '<json>']
//
// Usage (explain-file mode — write file explanation diagnostic):
//   node DPT_FRAMEWORK/cli/log-event.mjs --bundle <path> --explain-file <path> --status <authority_status> --reason "<text>" [--phase <phase_key>] [--work-id <id>] [--topic-slug <slug>] [--rerun-action <action>]
//
// Always exits 0 — diagnostics must not block agent flow.
// On failure (missing args, unwritable file), silently exits 0.

import { parseArgs } from 'node:util';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { logToRun } from '../engine/logger.mjs';

const { values } = parseArgs({
  options: {
    bundle: { type: 'string' },
    level:  { type: 'string' },
    msg:    { type: 'string' },
    detail: { type: 'string' },
    event:  { type: 'string' },
    'explain-file': { type: 'string' },
    status: { type: 'string' },
    reason: { type: 'string' },
    phase:  { type: 'string' },
    'work-id': { type: 'string' },
    'topic-slug': { type: 'string' },
    'rerun-action': { type: 'string' },
  },
});

// ── Explain-file mode: --explain-file is present → write file_explanation diagnostic ──
if (values['explain-file']) {
  if (!values.bundle) {
    process.exit(0);
  }

  // Validate required args
  if (!values.status || !values.reason) {
    process.exit(0);
  }

  // Validate authority_status
  const ALLOWED_STATUSES = ['explained_non_authoritative', 'ignored_with_reason'];
  if (!ALLOWED_STATUSES.includes(values.status)) {
    process.exit(0);
  }

  const bundle = values.bundle.split('/').pop();
  const ts = new Date().toISOString();

  // Write trace event
  const tracePath = join(values.bundle, 'rb_trace.jsonl');
  const logsDir = join(values.bundle, '_logs');
  if (!existsSync(logsDir)) {
    try { mkdirSync(logsDir, { recursive: true }); } catch { process.exit(0); }
  }

  const traceEntry = {
    ts,
    event: 'diagnostic',
    kind: 'file_explanation',
    bundle,
    path: values['explain-file'],
    phase: values.phase || null,
    reason: values.reason,
    authority_status: values.status,
    work_id: values['work-id'] || null,
    topic_slug: values['topic-slug'] || null,
    related_rerun_action: values['rerun-action'] || null,
  };

  try {
    writeFileSync(tracePath, JSON.stringify(traceEntry) + '\n', { flag: 'a' });
  } catch {
    // Silently exit — trace write failure must not block agent
  }

  // Write human-readable log line
  try {
    logToRun(values.bundle, 'info', 'file_explanation', {
      path: values['explain-file'],
      status: values.status,
      reason: values.reason,
      kind: 'file_explanation',
    });
  } catch {
    // Silently exit
  }

  process.exit(0);
}

// ── Trace mode: --event is present → write to rb_trace.jsonl ──
if (values.event) {
  if (!values.bundle) {
    process.exit(0);
  }

  const tracePath = join(values.bundle, 'rb_trace.jsonl');

  // Ensure _logs/ directory exists
  const logsDir = join(values.bundle, '_logs');
  if (!existsSync(logsDir)) {
    try { mkdirSync(logsDir, { recursive: true }); } catch { process.exit(0); }
  }

  let detail = undefined;
  if (values.detail) {
    try {
      detail = JSON.parse(values.detail);
    } catch {
      detail = { _raw: values.detail };
    }
  }

  const traceEntry = {
    ts: new Date().toISOString(),
    event: values.event,
    bundle: values.bundle.split('/').pop(),
    ...(detail ? { detail } : {}),
  };

  try {
    writeFileSync(tracePath, JSON.stringify(traceEntry) + '\n', { flag: 'a' });
  } catch {
    // Silently exit — trace write failure must not block agent
  }
  process.exit(0);
}

// ── Log mode (existing behavior) ──

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
