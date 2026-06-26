#!/usr/bin/env node
// @impl CMI-003, LOC-002, LOC-005, TRW-004: inspect-bundle.mjs — Directory structure validation + observable views
// Usage:
//   node inspect-bundle.mjs <bundleDir>              → structural check (unchanged)
//   node inspect-bundle.mjs <bundleDir> --summary     → pass/fail table + log health
//   node inspect-bundle.mjs <bundleDir> --timeline    → cross-sink stitched timeline
//   node inspect-bundle.mjs <bundleDir> --log         → tail _logs/run.log
// Exit: 0 = PASS, 1 = FAIL (structural check only; --summary/--timeline/--log always exit 0)

const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', C = '\x1b[36m', B = '\x1b[0m';

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const REQUIRED = [
  'START_FROM_HERE.md', 'rb_plan.md', 'rb_profile.yaml',
  'rb_status.json', 'rb_queue.json', 'rb_trace.jsonl',
  '_logs/run.log',
  'seed_topics/', 'reference/_INDEX.md', 'reference/README.md',
  'artifacts/wave0/', 'artifacts/wave1/', 'artifacts/wave2/',
  '_cache/', 'final/',
];

const SINK_LABELS = {
  'rb_trace.jsonl':                    '[trace]',
  '_logs/_trace_subagent.jsonl':       '[subagent]',
  '_logs/_trace_agq_cli.jsonl':        '[queue]',
  '_logs/run.log':                     '[log]',
};

const SINK_FILES = Object.keys(SINK_LABELS);

// ═══════════════════════════════════════════════════════════════════════════
// Parse args
// ═══════════════════════════════════════════════════════════════════════════

const args = process.argv.slice(2);
const flag = args.find(a => a.startsWith('--'));
const bundleDir = args.find(a => !a.startsWith('--'));

if (!bundleDir) {
  console.error('Usage: node inspect-bundle.mjs <bundleDir> [--summary|--timeline|--log]');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════
// --log: output _logs/run.log content
// ═══════════════════════════════════════════════════════════════════════════

if (flag === '--log') {
  const logPath = join(bundleDir, '_logs', 'run.log');
  if (existsSync(logPath)) {
    console.log(readFileSync(logPath, 'utf-8'));
  }
  process.exit(0);
}

// ═══════════════════════════════════════════════════════════════════════════
// --summary: pass/fail table + log health
// ═══════════════════════════════════════════════════════════════════════════

if (flag === '--summary') {
  import('../engine/trace.mjs').then(({ createTrace }) => {
    const tracePath = join(bundleDir, 'rb_trace.jsonl');
    const trace = createTrace(tracePath, { consoleEcho: false });
    const summary = trace.traceSummary();

    console.log(C + '══════ Run Summary ══════' + B);
    console.log(`  events: ${summary.events.length}`);
    console.log(`  ${G}passed: ${summary.passed}${B}`);
    console.log(`  ${R}failed: ${summary.failed}${B}`);
    console.log('');

    // Gate pass/fail table
    const gateEvents = summary.events.filter(e => e.event === 'gate_attempt');
    if (gateEvents.length > 0) {
      console.log('Gate results:');
      for (const e of gateEvents) {
        const icon = e.passed ? `${G}PASS${B}` : `${R}FAIL${B}`;
        const ts = e.ts ? e.ts.slice(11, 19) : '--:--:--';
        console.log(`  ${icon}  ${ts}  ${e.gate || '(' + (e.currentNodeRef || 'unknown') + ')'}`);
      }
      console.log('');
    }

    // Log health
    const logPath = join(bundleDir, '_logs', 'run.log');
    if (existsSync(logPath)) {
      const raw = readFileSync(logPath, 'utf-8').trim();
      const lines = raw ? raw.split('\n') : [];
      const levels = { info: 0, warn: 0, error: 0, debug: 0 };
      for (const line of lines) {
        const m = line.match(/^\[[^\]]+\] (DEBUG|INFO|WARN|ERROR) /);
        if (m) levels[m[1].toLowerCase()]++;
      }
      console.log(`log: ${lines.length} lines (${levels.info} info / ${levels.warn} warn / ${levels.error} error / ${levels.debug} debug)`);
      if (lines.length === 0) {
        console.log(`${Y}[warning] _logs/run.log is empty — logging may be silently failing${B}`);
      }
    } else {
      console.log(`log: 0 lines (file missing)`);
      console.log(`${Y}[warning] _logs/run.log not found — logging may be silently failing${B}`);
    }

    process.exit(0);
  });
} else if (flag === '--timeline') {
  const allEntries = [];
  const warnings = [];

  // ── JSONL sink reader ──
  const jsonlSinks = ['rb_trace.jsonl', '_logs/_trace_subagent.jsonl', '_logs/_trace_agq_cli.jsonl'];
  for (const file of jsonlSinks) {
    const p = join(bundleDir, file);
    if (!existsSync(p)) { warnings.push(`${file}: missing`); continue; }
    const raw = readFileSync(p, 'utf-8').trim();
    if (!raw) continue;
    const lines = raw.split('\n');
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.ts) {
          allEntries.push({ ts: entry.ts, source: SINK_LABELS[file], entry });
        }
      } catch {
        warnings.push(`${file}: unparseable JSON line skipped`);
      }
    }
  }

  // ── Free-text sink reader (_logs/run.log with D6.1 envelope) ──
  const logPath = join(bundleDir, '_logs', 'run.log');
  if (existsSync(logPath)) {
    const raw = readFileSync(logPath, 'utf-8').trim();
    if (raw) {
      const lines = raw.split('\n');
      // D6.1 envelope: [ISO8601] LEVEL msg bundle=<name> {optional JSON}
      const envelopeRe = /^\[([^\]]+)\] (\w+) (.+?) bundle=(\S+)(?: (\{.*\}))?$/;
      for (const line of lines) {
        const m = line.match(envelopeRe);
        if (m) {
          const [, ts, level, msg, bundle, detailJson] = m;
          let detail = {};
          if (detailJson) {
            try { detail = JSON.parse(detailJson); } catch { detail = { _raw: detailJson }; }
          }
          allEntries.push({
            ts,
            source: SINK_LABELS['_logs/run.log'],
            entry: { ts, event: 'log', level, msg, bundle, ...detail },
          });
        } else if (line.trim()) {
          // Unparseable but non-empty — include with [unparsed] label
          warnings.push(`_logs/run.log: unparsed line appended (no valid envelope)`);
        }
      }
    }
  } else {
    warnings.push('_logs/run.log: missing');
  }

  // ── Sort by ts ──
  allEntries.sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));

  // ── Output ──
  console.log(C + '══════ Timeline ══════' + B);
  for (const { ts, source, entry } of allEntries) {
    const timeStr = ts.slice(11, 19); // HH:MM:SS
    const event = entry.event || entry.msg || '?';
    const detail = entry.event === 'log'
      ? `${entry.level} ${entry.msg}`
      : `${entry.event}${entry.gate ? ' ' + entry.gate : ''}${entry.passed !== undefined ? (entry.passed ? ' PASS' : ' FAIL') : ''}`;
    console.log(`  ${C}${timeStr}${B}  ${source}  ${detail}`);
  }

  if (warnings.length > 0) {
    console.log('');
    console.log(`${Y}Warnings:${B}`);
    for (const w of warnings) console.log(`  ${Y}⚠${B} ${w}`);
  }
  process.exit(0);

} else {

// ═══════════════════════════════════════════════════════════════════════════
// Default: structural check (unchanged behavior)
// ═══════════════════════════════════════════════════════════════════════════

const missing = REQUIRED.filter(f => !existsSync(join(bundleDir, f)));
if (missing.length > 0) {
  console.log(`${R}Inspect bundle: missing ${missing.join(', ')}${B}`);
  process.exit(1);
}
console.log(`${G}Inspect bundle: directory structure complete${B}`);

}
