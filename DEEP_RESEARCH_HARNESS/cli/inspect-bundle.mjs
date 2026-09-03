#!/usr/bin/env node
// @impl CMI-003, LOC-002, LOC-005, TRW-004: inspect-bundle.mjs — Directory structure validation + observable views
// Usage:
//   node inspect-bundle.mjs <bundleDir>              → structural check (unchanged)
//   node inspect-bundle.mjs <bundleDir> --summary     → pass/fail table + log health
//   node inspect-bundle.mjs <bundleDir> --timeline    → cross-sink stitched timeline
//   node inspect-bundle.mjs <bundleDir> --log         → tail _logs/run.log
// Exit: 0 = PASS, 1 = FAIL (including current-entry rejection)

const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', C = '\x1b[36m', B = '\x1b[0m';

import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkCurrentEntryContract } from '../engine/helpers/current-entry-contract.mjs';
import { scanBundle } from '../engine/helpers/cross-bundle-reference-scan.mjs';

const REQUIRED = [
  'rb_plan.md', 'rb_profile.yaml',
  'rb_status.json', 'rb_queue.json', 'rb_trace.jsonl',
  '_logs/run.log',
  'seed_topics/', 'reference/_INDEX.md', 'reference/README.md',
  'artifacts/wave0/', 'artifacts/wave1/', 'artifacts/wave2/',
  '_cache/', 'final/', '_work_units/',
];

const SINK_LABELS = {
  'rb_trace.jsonl':                    '[trace]',
  '_logs/run.log':                     '[log]',
};

const SINK_FILES = Object.keys(SINK_LABELS);
const __dirname = dirname(fileURLToPath(import.meta.url));
const FRAMEWORK_ROOT = realpathSync(resolve(__dirname, '..'));
const DEFAULT_REPO_ROOT = resolve(FRAMEWORK_ROOT, '..');
const RUNTIME_LOOKING_ROOTS = ['_work_units', 'artifacts', '_cache', 'reference', 'final'];

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

const currentEntry = checkCurrentEntryContract(bundleDir);
if (!currentEntry.passed) {
  console.log(`unsupported_current_entry_contract: missing ${currentEntry.missing_files.join(', ')}`);
  process.exit(1);
}

function readJsonSafe(pathname) {
  try {
    return JSON.parse(readFileSync(pathname, 'utf-8'));
  } catch {
    return null;
  }
}

function readJsonlSafe(pathname) {
  if (!existsSync(pathname)) return [];
  try {
    return readFileSync(pathname, 'utf-8').split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

function collectActiveBundleRefs(activeBundleDir) {
  const refs = {
    workIds: new Set(),
    outputPaths: new Set(),
    cacheTrails: new Set(),
  };
  const index = readJsonSafe(join(activeBundleDir, '_work_units', '_index.json'));
  for (const workId of Object.keys(index?.work_units || {})) refs.workIds.add(workId);
  for (const row of readJsonlSafe(join(activeBundleDir, 'rb_output_declarations.jsonl'))) {
    if (row.work_id) refs.workIds.add(row.work_id);
    for (const output of row.output_files || []) {
      if (output?.path) refs.outputPaths.add(output.path);
    }
    for (const trail of row.cache_trails || []) refs.cacheTrails.add(trail);
  }
  return refs;
}

function repoRootForBundle(activeBundleDir) {
  let cursor = dirname(resolve(activeBundleDir));
  while (cursor && cursor !== dirname(cursor)) {
    if (existsSync(join(cursor, 'DEEP_RESEARCH_HARNESS'))) return cursor;
    cursor = dirname(cursor);
  }
  return DEFAULT_REPO_ROOT;
}

function leakContainsActiveRef(repoRoot, leakPath, rootName, refs) {
  if (rootName === '_work_units') {
    const names = [];
    const walk = (dir, depth = 0) => {
      if (depth > 3) return;
      try {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          names.push(entry.name);
          if (entry.isDirectory()) walk(join(dir, entry.name), depth + 1);
        }
      } catch { /* ignore unreadable debris */ }
    };
    walk(leakPath);
    return names.some((name) => refs.workIds.has(name));
  }
  const expected = rootName === '_cache' ? refs.cacheTrails : refs.outputPaths;
  for (const ref of expected) {
    if (ref === rootName || ref.startsWith(`${rootName}/`)) {
      const candidate = join(repoRoot, ref);
      if (existsSync(candidate)) return true;
    }
  }
  return false;
}

function repoRootRuntimeLeakDiagnostics(activeBundleDir) {
  const active = resolve(activeBundleDir);
  const repoRoot = repoRootForBundle(active);
  const refs = collectActiveBundleRefs(active);
  const diagnostics = [];
  for (const rootName of RUNTIME_LOOKING_ROOTS) {
    const leakPath = join(repoRoot, rootName);
    if (!existsSync(leakPath)) continue;
    const relToActive = relative(active, leakPath);
    if (!relToActive.startsWith('..') && relToActive !== '') continue;
    let isDir = false;
    try { isDir = statSync(leakPath).isDirectory(); } catch { continue; }
    if (!isDir) continue;
    const activeBundleBlocker = leakContainsActiveRef(repoRoot, leakPath, rootName, refs);
    diagnostics.push({
      path: relative(repoRoot, leakPath) || rootName,
      severity: activeBundleBlocker ? 'active_bundle_blocker' : 'cleanup_debris',
      message: activeBundleBlocker
        ? `Repo-root runtime leak is associated with current current run bundle authority: ${rootName}`
        : `Repo-root runtime-looking directory appears to be unassociated cleanup debris: ${rootName}`,
    });
  }
  return diagnostics;
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
  const jsonlSinks = ['rb_trace.jsonl'];
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
const leakDiagnostics = repoRootRuntimeLeakDiagnostics(bundleDir);
const activeLeakDiagnostics = leakDiagnostics.filter((diag) => diag.severity === 'active_bundle_blocker');

// Cross-bundle reference scan (BUI-003)
const bundleBasename = bundleDir.split(/[/\\]/).pop() || '';
const ownBundleName = bundleBasename.startsWith('dpt_rb_') ? bundleBasename.slice('dpt_rb_'.length) : bundleBasename;
const crossRefHits = scanBundle(bundleDir, ownBundleName);
const crossRefBlocker = crossRefHits.length > 0;

if (crossRefBlocker) {
  console.log(`${Y}Cross-bundle reference diagnostics (BUI-003):${B}`);
  for (const hit of crossRefHits) {
    for (const cited of hit.citedBundles) {
      console.log(`${Y}  Bundle isolation diagnostic [active_bundle_blocker]: ${hit.file} cites dpt_rb_${cited}${B}`);
    }
  }
}

if (missing.length > 0) {
  console.log(`${R}Inspect bundle: missing ${missing.join(', ')}${B}`);
  process.exit(1);
}
if (leakDiagnostics.length > 0) {
  for (const diag of leakDiagnostics) {
    const color = diag.severity === 'active_bundle_blocker' ? R : Y;
    console.log(`${color}Bundle isolation diagnostic [${diag.severity}]: ${diag.path} — ${diag.message}${B}`);
  }
}
if (activeLeakDiagnostics.length > 0 || crossRefBlocker) {
  if (activeLeakDiagnostics.length > 0) {
    console.log(`${R}Inspect bundle: repo-root runtime leak associated with current run bundle${B}`);
  }
  if (crossRefBlocker) {
    console.log(`${R}Inspect bundle: cross-bundle content references found — resolve before continuing${B}`);
  }
  process.exit(1);
}
console.log(`${G}Inspect bundle: directory structure complete${B}`);

}
