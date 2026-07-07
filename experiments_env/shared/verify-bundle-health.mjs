#!/usr/bin/env node
// verify-bundle-health.mjs — Post-run bundle health verifier
// @impl EXO-001, EXO-002, EXO-004, EXO-005
// Canonical experiment helper: experiments_env/shared/verify-bundle-health.mjs
//
// Usage:
//   node verify-bundle-health.mjs --bundle <path> --profile <light|standard|heavy> [--json]
//
// Role:
//   Read-only health verifier. Reads bundle state files (trace, gate artifacts,
//   work-unit index/ledger/cache) and existing CLIs (validate-bundle, inspect-bundle).
//   Never executes gate commands. Produces a stable JSON health report and a
//   concise human-readable terminal summary.

import { parseArgs } from 'node:util';
import { existsSync, readFileSync, readdirSync, statSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  SECTION_STATUS,
  PROFILE_TABLE,
  requiredSectionsFor,
  isRequiredSection,
  sectionIssues,
  buildHealthReport,
} from './health-report-schema.mjs';
import { fileURLToPath } from 'node:url';
import {
  inspectWorkUnits,
  readWorkUnitLedgerRows,
} from '../../DPT_FRAMEWORK/engine/work-unit-core.mjs';
import {
  readSubmittedWorkUnitDeclarations,
} from '../../DPT_FRAMEWORK/engine/helpers/gate-helpers-readers.mjs';

const __dirname = new URL('.', import.meta.url).pathname;

// ═══════════════════════════════════════════════════════════════════════════
// CLI Argument Parsing
// ═══════════════════════════════════════════════════════════════════════════

function parseArgs_() {
  const { values } = parseArgs({
    options: {
      bundle: { type: 'string' },
      profile: { type: 'string' },
      json: { type: 'boolean', default: false },
    },
  });

  if (!values.bundle) {
    console.error('Missing required argument: --bundle <path>');
    process.exit(2);
  }
  if (!values.profile || !['light', 'standard', 'heavy'].includes(values.profile)) {
    console.error('Missing or invalid --profile. Must be one of: light, standard, heavy');
    process.exit(2);
  }

  return values;
}

// ═══════════════════════════════════════════════════════════════════════════
// Section Inspectors
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Read and parse rb_trace.jsonl.
 * Returns trace section data.
 */
function inspectTrace(bundlePath, profile) {
  const tracePath = join(bundlePath, 'rb_trace.jsonl');
  const required = isRequiredSection(profile, 'trace');

  if (!existsSync(tracePath)) {
    return {
      status: required ? SECTION_STATUS.ISSUES : SECTION_STATUS.NOT_APPLICABLE,
      required,
      present: false,
      sectionIssues: required ? [{ detail: 'rb_trace.jsonl not found' }] : [],
    };
  }

  try {
    const raw = readFileSync(tracePath, 'utf-8').trim();
    if (!raw) {
      return {
        status: required ? SECTION_STATUS.ISSUES : SECTION_STATUS.CLEAN,
        required,
        present: true,
        event_count: 0,
        by_event: {},
        parse_errors: 0,
        sectionIssues: required ? [{ detail: 'rb_trace.jsonl is empty' }] : [],
      };
    }

    const lines = raw.split('\n');
    const byEvent = {};
    let parseErrors = 0;
    const events = [];

    for (let i = 0; i < lines.length; i++) {
      try {
        const e = JSON.parse(lines[i]);
        events.push(e);
        byEvent[e.event] = (byEvent[e.event] || 0) + 1;
      } catch {
        parseErrors++;
      }
    }

    const hasIssues = parseErrors > 0;
    return {
      status: hasIssues ? SECTION_STATUS.ISSUES : SECTION_STATUS.CLEAN,
      required,
      present: true,
      event_count: events.length,
      by_event: byEvent,
      parse_errors: parseErrors,
      sectionIssues: hasIssues ? [{ detail: `${parseErrors} trace line(s) failed to parse` }] : [],
    };
  } catch (err) {
    return {
      status: required ? SECTION_STATUS.ISSUES : SECTION_STATUS.OBSERVED_OPTIONAL,
      required,
      present: true,
      sectionIssues: [{ detail: `Error reading trace: ${err.message}` }],
    };
  }
}

/**
 * Check for legacy trace files (non-rb_trace.jsonl trace files).
 */
function inspectLegacyTrace(bundlePath, profile) {
  const required = isRequiredSection(profile, 'legacy_trace');
  const legacyPatterns = ['_trace_', 'trace.jsonl'];

  let legacyPaths = [];
  try {
    const entries = readdirSync(bundlePath);
    legacyPaths = entries.filter(f =>
      f.includes('trace') && f !== 'rb_trace.jsonl' && f.endsWith('.jsonl'));
  } catch {
    return {
      status: required ? SECTION_STATUS.ISSUES : SECTION_STATUS.NOT_APPLICABLE,
      required,
      paths: [],
      sectionIssues: required ? [{ detail: 'Cannot read bundle directory' }] : [],
    };
  }

  const hasLegacy = legacyPaths.length > 0;
  return {
    status: hasLegacy ? SECTION_STATUS.ISSUES : SECTION_STATUS.CLEAN,
    required,
    paths: legacyPaths,
    sectionIssues: hasLegacy ? legacyPaths.map(p => ({ detail: `Legacy trace file found: ${p}` })) : [],
  };
}

/**
 * Run validate-bundle.mjs and inspect-bundle.mjs as child processes.
 */
function inspectBundleSchema(bundlePath, profile) {
  const required = isRequiredSection(profile, 'bundle_schema');
  const issues = [];

  // Find validate-bundle.mjs relative to the repo root (this script is in experiments_env/shared/)
  const repoRoot = join(__dirname, '..', '..');
  const frameworkCli = join(repoRoot, 'DPT_FRAMEWORK', 'cli');
  const validatePath = join(frameworkCli, 'validate-bundle.mjs');
  const inspectPath = join(frameworkCli, 'inspect-bundle.mjs');

  let validateResult = null;
  let inspectResult = null;

  // Run validate-bundle.mjs (positional arg, not --bundle)
  try {
    const r = spawnSync('node', [validatePath, bundlePath], {
      timeout: 30000,
      encoding: 'utf-8',
    });
    validateResult = {
      passed: r.status === 0,
      error: r.status !== 0 ? (r.stderr || r.stdout || 'validate-bundle.mjs exited non-zero').trim().slice(0, 500) : undefined,
    };
    if (r.error) {
      // spawn error (process couldn't start)
      validateResult = { passed: false, error: `Cannot execute validate-bundle.mjs: ${r.error.message}` };
      issues.push({ detail: `validate-bundle.mjs execution failed: ${r.error.message}` });
    } else if (r.status !== 0) {
      issues.push({ detail: 'validate-bundle.mjs reported issues' });
    }
  } catch (err) {
    validateResult = { passed: false, error: err.message };
    issues.push({ detail: `validate-bundle.mjs error: ${err.message}` });
  }

  // Run inspect-bundle.mjs (positional arg, not --bundle)
  try {
    const r = spawnSync('node', [inspectPath, bundlePath], {
      timeout: 30000,
      encoding: 'utf-8',
    });
    inspectResult = {
      passed: r.status === 0,
      error: r.status !== 0 ? (r.stderr || r.stdout || 'inspect-bundle.mjs exited non-zero').trim().slice(0, 500) : undefined,
    };
    if (r.error) {
      inspectResult = { passed: false, error: `Cannot execute inspect-bundle.mjs: ${r.error.message}` };
      issues.push({ detail: `inspect-bundle.mjs execution failed: ${r.error.message}` });
    } else if (r.status !== 0) {
      issues.push({ detail: 'inspect-bundle.mjs reported issues' });
    }
  } catch (err) {
    inspectResult = { passed: false, error: err.message };
    issues.push({ detail: `inspect-bundle.mjs error: ${err.message}` });
  }

  const status = issues.length > 0
    ? (required ? SECTION_STATUS.ISSUES : SECTION_STATUS.ISSUES)
    : SECTION_STATUS.CLEAN;

  return {
    status,
    required,
    validate_bundle: validateResult,
    inspect_bundle: inspectResult,
    sectionIssues: issues,
  };
}

/**
 * Read gate wrapper artifacts from _observability/gates/*.json.
 * Discovers by sorted glob — never re-executes gate commands.
 */
function inspectGateAttempts(bundlePath, profile) {
  const required = isRequiredSection(profile, 'gate_attempts');
  const gatesDir = join(bundlePath, '_observability', 'gates');

  if (!existsSync(gatesDir)) {
    return {
      status: required ? SECTION_STATUS.ISSUES : SECTION_STATUS.NOT_APPLICABLE,
      required,
      sectionIssues: required ? [{ detail: 'No _observability/gates/ directory found' }] : [],
    };
  }

  try {
    const files = readdirSync(gatesDir)
      .filter(f => f.endsWith('.json'))
      .sort(); // stable sort by filename (includes sequence prefix)

    if (files.length === 0) {
      return {
        status: required ? SECTION_STATUS.ISSUES : SECTION_STATUS.OBSERVED_OPTIONAL,
        required,
        count: 0,
        sectionIssues: required ? [{ detail: 'No gate wrapper artifacts found' }] : [],
      };
    }

    const byGate = {};
    let pass = 0;
    let fail = 0;
    const diagnostics = [];

    for (const f of files) {
      try {
        const raw = readFileSync(join(gatesDir, f), 'utf-8');
        const artifact = JSON.parse(raw);
        byGate[artifact.gate] = (byGate[artifact.gate] || 0) + 1;
        if (artifact.exit_code === 0) pass++; else fail++;
        if (artifact.inspect && Array.isArray(artifact.inspect)) {
          for (const diag of artifact.inspect) {
            diagnostics.push(`[${artifact.gate}] ${diag}`);
          }
        }
      } catch {
        // Unparseable artifact — skip (might be partial write)
      }
    }

    const count = pass + fail;
    const hasIssues = count === 0 || fail > 0;
    const diagIssues = hasIssues ? [{ detail: `${count} gate artifacts: ${pass} pass, ${fail} fail` }] : [];

    if (diagnostics.length > 0 && diagIssues.length === 0) {
      // Diagnostics present even when all gates passed
    }

    return {
      status: hasIssues ? SECTION_STATUS.ISSUES : SECTION_STATUS.CLEAN,
      required,
      count,
      pass,
      fail,
      by_gate: byGate,
      diagnostics: diagnostics.slice(0, 20), // cap to avoid huge reports
      sectionIssues: fail > 0
        ? [...diagIssues, ...diagnostics.slice(0, 10).map(d => ({ detail: d }))]
        : diagIssues,
    };
  } catch (err) {
    return {
      status: required ? SECTION_STATUS.ISSUES : SECTION_STATUS.ISSUES,
      required,
      sectionIssues: [{ detail: `Error reading gate artifacts: ${err.message}` }],
    };
  }
}

/**
 * Cross-check gate_attempt events in trace vs _logs/run.log gate_attempt entries.
 */
function inspectTimeline(bundlePath, profile, traceByEvent) {
  const required = isRequiredSection(profile, 'timeline');
  const traceGateAttempts = (traceByEvent && traceByEvent['gate_attempt']) || 0;

  // Count gate_attempt entries in run.log
  let logGateAttempts = 0;
  let mismatches = 0;
  const logPath = join(bundlePath, '_logs', 'run.log');

  if (existsSync(logPath)) {
    try {
      const raw = readFileSync(logPath, 'utf-8');
      const lines = raw.trim().split('\n');
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (entry.event === 'gate_attempt' || entry.msg === 'gate_attempt') {
            logGateAttempts++;
          }
        } catch {
          if (/\]\s+(INFO|WARN|ERROR)\s+gate_attempt\s+bundle=/.test(line)) {
            logGateAttempts++;
          }
        }
      }
    } catch { /* log read failure is non-fatal */ }
  }

  if (traceGateAttempts !== logGateAttempts) {
    mismatches = Math.abs(traceGateAttempts - logGateAttempts);
  }

  const hasIssues = mismatches > 0;
  return {
    status: hasIssues ? SECTION_STATUS.ISSUES : SECTION_STATUS.CLEAN,
    required,
    trace_gate_attempts: traceGateAttempts,
    log_gate_attempts: logGateAttempts,
    mismatches,
    sectionIssues: hasIssues ? [{ detail: `Trace/log mismatch: ${traceGateAttempts} trace vs ${logGateAttempts} log gate_attempt events` }] : [],
  };
}

/**
 * Read rb_output_declarations.jsonl — the Agent output declaration ledger.
 * Heavy provenance authority.
 */
function inspectLedger(bundlePath, profile) {
  const required = isRequiredSection(profile, 'ledger');
  const ledgerPath = join(bundlePath, 'rb_output_declarations.jsonl');

  if (!existsSync(ledgerPath)) {
    return {
      status: required ? SECTION_STATUS.ISSUES : SECTION_STATUS.NOT_APPLICABLE,
      required,
      sectionIssues: required ? [{ detail: 'rb_output_declarations.jsonl not found' }] : [],
    };
  }

  try {
    const raw = readFileSync(ledgerPath, 'utf-8').trim();
    if (!raw) {
      return {
        status: required ? SECTION_STATUS.ISSUES : SECTION_STATUS.NOT_APPLICABLE,
        required,
        declarations: 0,
        sectionIssues: required ? [{ detail: 'rb_output_declarations.jsonl is empty' }] : [],
      };
    }

    const lines = raw.split('\n');
    let rows = [];
    let schemaErrors = 0;
    try {
      rows = readWorkUnitLedgerRows(bundlePath);
    } catch {
      schemaErrors = lines.length;
    }

    const declarations = rows.length;
    const hasIssues = schemaErrors > 0 || declarations === 0;
    return {
      status: hasIssues ? SECTION_STATUS.ISSUES : SECTION_STATUS.CLEAN,
      required,
      declarations,
      schema_errors: schemaErrors,
      sectionIssues: hasIssues
        ? [{ detail: `${declarations} declarations, ${schemaErrors} schema errors` }]
        : [],
    };
  } catch (err) {
    return {
      status: required ? SECTION_STATUS.ISSUES : SECTION_STATUS.ISSUES,
      required,
      sectionIssues: [{ detail: `Error reading ledger: ${err.message}` }],
    };
  }
}

/**
 * Project work-unit lifecycle health without healing state.
 * Reads the work-unit inspect result and reports lifecycle counters separately
 * from gate verdicts.
 */
function inspectWorkUnitHealth(bundlePath, profile) {
  const required = isRequiredSection(profile, 'work_units');
  try {
    const result = inspectWorkUnits(bundlePath);
    const projection = result.projection || {};
    const diagnostics = result.inspect || [];
    const hasIssues = result.passed === false;
    return {
      status: hasIssues ? SECTION_STATUS.ISSUES : SECTION_STATUS.CLEAN,
      required,
      present: (projection.total || 0) > 0,
      total: projection.total || 0,
      claimed: projection.claimed || 0,
      submitted: projection.submitted || 0,
      failed: projection.failed || 0,
      timed_out: projection.timed_out || 0,
      abandoned: projection.abandoned || 0,
      expired: projection.expired || 0,
      retries: projection.retries || 0,
      submit_rejections: projection.submit_rejections || 0,
      late_submit_rejections: projection.late_submit_rejections || 0,
      nonterminal: projection.nonterminal || 0,
      by_wave: projection.by_wave || {},
      inspect_passed: result.passed === true,
      inspect_issues: diagnostics.length,
      diagnostics: diagnostics.slice(0, 20),
      sectionIssues: hasIssues ? diagnostics.slice(0, 20).map(detail => ({ detail })) : [],
    };
  } catch (err) {
    return {
      status: required ? SECTION_STATUS.ISSUES : SECTION_STATUS.OBSERVED_OPTIONAL,
      required,
      inspect_passed: false,
      inspect_issues: 1,
      diagnostics: [`Error inspecting work units: ${err.message}`],
      sectionIssues: [{ detail: `Error inspecting work units: ${err.message}` }],
    };
  }
}

/**
 * Check cache trail leaves from submitted work-unit ledger declarations.
 * Leaf shape: _cache/.../<work-unit-output>/ with websearch.json, page.md, meta.json
 */
function inspectCacheTrails(bundlePath, profile) {
  const required = isRequiredSection(profile, 'cache_trails');
  const ledgerPath = join(bundlePath, 'rb_output_declarations.jsonl');

  if (!existsSync(ledgerPath)) {
    return {
      status: required ? SECTION_STATUS.ISSUES : SECTION_STATUS.NOT_APPLICABLE,
      required,
      sectionIssues: required ? [{ detail: 'No ledger available for cache trail verification' }] : [],
    };
  }

  try {
    const raw = readFileSync(ledgerPath, 'utf-8').trim();
    if (!raw) {
      return {
        status: required ? SECTION_STATUS.ISSUES : SECTION_STATUS.NOT_APPLICABLE,
        required,
        sectionIssues: required ? [{ detail: 'Ledger empty — no cache trails to verify' }] : [],
      };
    }

    let rows;
    try {
      rows = readWorkUnitLedgerRows(bundlePath);
    } catch (error) {
      return {
        status: required ? SECTION_STATUS.ISSUES : SECTION_STATUS.ISSUES,
        required,
        sectionIssues: [{ detail: `Work-unit ledger invalid for cache trail verification: ${error.message}` }],
      };
    }
    let totalLeaves = 0;
    let missingLeaves = 0;

    for (const decl of rows) {
      if (!decl.cache_trails || !Array.isArray(decl.cache_trails)) continue;

      for (const trail of decl.cache_trails) {
        totalLeaves++;
        const requiredFiles = ['websearch.json', 'page.md', 'meta.json'];
        let allPresent = true;
        for (const f of requiredFiles) {
          if (!existsSync(join(bundlePath, trail, f))) {
            allPresent = false;
            break;
          }
        }
        if (!allPresent) missingLeaves++;
      }
    }

    if (totalLeaves === 0) {
      return {
        status: required ? SECTION_STATUS.ISSUES : SECTION_STATUS.NOT_APPLICABLE,
        required,
        sectionIssues: required ? [{ detail: 'No cache trail declarations in ledger' }] : [],
      };
    }

    const hasIssues = missingLeaves > 0;
    return {
      status: hasIssues ? SECTION_STATUS.ISSUES : SECTION_STATUS.CLEAN,
      required,
      leaves: totalLeaves,
      missing: missingLeaves,
      sectionIssues: hasIssues
        ? [{ detail: `${missingLeaves}/${totalLeaves} cache trail leaves missing required files (websearch.json, page.md, meta.json)` }]
        : [],
    };
  } catch (err) {
    return {
      status: required ? SECTION_STATUS.ISSUES : SECTION_STATUS.ISSUES,
      required,
      sectionIssues: [{ detail: `Error inspecting cache trails: ${err.message}` }],
    };
  }
}

function cacheLeafComplete(bundlePath, trail) {
  return ['websearch.json', 'page.md', 'meta.json'].every((name) => existsSync(join(bundlePath, trail, name)));
}

function cacheTrailMeta(bundlePath, trail) {
  try {
    return JSON.parse(readFileSync(join(bundlePath, trail, 'meta.json'), 'utf-8'));
  } catch {
    return {};
  }
}

function parseableUrl(value) {
  try {
    if (!value) return false;
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function cacheTrailMapsToReference(bundlePath, trail, ref) {
  if (!cacheLeafComplete(bundlePath, trail)) return false;
  const meta = cacheTrailMeta(bundlePath, trail);
  const metaUrl = meta.url || meta.source_url || meta.final_url || meta.fetched_url || '';
  if (metaUrl && ref.source_url && metaUrl === ref.source_url) return true;
  if (ref.source_slug && trail.includes(ref.source_slug)) return true;
  const leaf = String(ref.path || '').split('/').pop()?.replace(/\.md$/, '') || '';
  return leaf.length > 0 && trail.includes(leaf);
}

/**
 * Check submitted source recoverability from current authority surfaces.
 */
function inspectSourceRecoverability(bundlePath, profile) {
  const required = isRequiredSection(profile, 'source_recoverability');
  let rows;
  try {
    rows = readSubmittedWorkUnitDeclarations(bundlePath);
  } catch (err) {
    return {
      status: required ? SECTION_STATUS.ISSUES : SECTION_STATUS.NOT_APPLICABLE,
      required,
      references: 0,
      recoverable: 0,
      issues: 1,
      sectionIssues: required ? [{ detail: `Cannot inspect submitted source recoverability: ${err.message}` }] : [],
    };
  }

  const references = rows.flatMap((row) => (row.output_files || [])
    .filter((entry) => entry.role === 'reference')
    .map((entry) => ({ ...entry, work_id: row.work_id, cache_trails: row.cache_trails || [] })));

  if (references.length === 0) {
    return {
      status: required ? SECTION_STATUS.ISSUES : SECTION_STATUS.NOT_APPLICABLE,
      required,
      references: 0,
      parseable_source_urls: 0,
      mapped_cache_trails: 0,
      recoverable: 0,
      issues: 0,
      sectionIssues: required ? [{ detail: 'No submitted reference outputs available for source recoverability checks' }] : [],
    };
  }

  let parseable = 0;
  let mapped = 0;
  let recoverable = 0;
  const details = [];

  for (const ref of references) {
    const hasUrl = parseableUrl(ref.source_url);
    const hasMappedTrail = (ref.cache_trails || []).some((trail) => cacheTrailMapsToReference(bundlePath, trail, ref));
    if (hasUrl) parseable++;
    if (hasMappedTrail) mapped++;
    if (hasUrl && hasMappedTrail) recoverable++;
    if (!hasUrl || !hasMappedTrail) {
      details.push(`${ref.path} (${ref.work_id || 'unknown work_id'}): ${!hasUrl ? 'source_url missing/invalid' : 'no complete mapped cache trail'}`);
    }
  }

  const hasIssues = details.length > 0;
  return {
    status: hasIssues ? SECTION_STATUS.ISSUES : SECTION_STATUS.CLEAN,
    required,
    references: references.length,
    parseable_source_urls: parseable,
    mapped_cache_trails: mapped,
    recoverable,
    issues: details.length,
    sectionIssues: details.map((detail) => ({ detail })),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Diagnostic Trace Event — EXO-004
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Append a non-verdict diagnostic trace event to rb_trace.jsonl.
 * Uses the canonical trace format: { ts, event: "diagnostic", source: "experiment-observability", ... }
 * Never writes `check` events — does not affect verdict.
 *
 * @param {string} bundlePath
 * @param {object} healthReport — the full health report
 */
function appendDiagnosticTrace(bundlePath, healthReport) {
  const tracePath = join(bundlePath, 'rb_trace.jsonl');
  try {
    const entry = JSON.stringify({
      ts: new Date().toISOString(),
      event: 'diagnostic',
      source: 'experiment-observability',
      kind: 'health_report',
      profile: healthReport.profile,
      status: healthReport.status,
      issue_count: healthReport.issues.length,
      detail: healthReport.status === 'clean'
        ? `Health report clean for profile ${healthReport.profile}`
        : `${healthReport.issues.length} health issue(s) found`,
    });
    appendFileSync(tracePath, entry + '\n');
  } catch {
    // Diagnostic write failure must not affect health report output
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Terminal Summary
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Print a human-readable health summary to stdout.
 */
function printSummary(report) {
  const G = '\x1b[32m';
  const R = '\x1b[31m';
  const Y = '\x1b[33m';
  const C = '\x1b[36m';
  const B = '\x1b[0m';

  console.log(C + '\n══════ Bundle Health Report ══════' + B);
  console.log(`Bundle:  ${report.bundle_path}`);
  console.log(`Profile: ${report.profile}`);
  console.log(`Status:  ${report.status === 'clean' ? G + 'CLEAN' + B : R + 'ISSUES' + B}`);
  console.log('');

  const sections = ['trace', 'legacy_trace', 'bundle_schema', 'gate_attempts', 'timeline', 'work_units', 'ledger', 'cache_trails', 'source_recoverability'];

  for (const key of sections) {
    const s = report[key];
    if (!s) continue;
    const req = s.required ? 'required' : 'optional';
    let statusColor;
    switch (s.status) {
      case 'clean': statusColor = G; break;
      case 'issues': statusColor = R; break;
      case 'not_applicable': statusColor = Y; break;
      case 'observed_optional': statusColor = C; break;
      default: statusColor = B;
    }
    console.log(`  ${key.padEnd(15)} ${statusColor}${s.status.padEnd(18)}${B} [${req}]`);
  }

  if (report.issues.length > 0) {
    console.log(C + '\n── Issues ──' + B);
    for (const issue of report.issues) {
      console.log(`  ${R}●${B} [${issue.section}] ${issue.detail}`);
    }
  }

  console.log(C + '══════════════════════════════════' + B);
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════

function main() {
  const args = parseArgs_();
  const { bundle: bundlePath, profile, json } = args;

  if (!existsSync(bundlePath)) {
    console.error(`Bundle path does not exist: ${bundlePath}`);
    process.exit(1);
  }

  // Inspect all sections
  const traceResult = inspectTrace(bundlePath, profile);
  const legacyTraceResult = inspectLegacyTrace(bundlePath, profile);
  const bundleSchemaResult = inspectBundleSchema(bundlePath, profile);
  const gateAttemptsResult = inspectGateAttempts(bundlePath, profile);
  const timelineResult = inspectTimeline(bundlePath, profile, traceResult.by_event);
  const workUnitsResult = inspectWorkUnitHealth(bundlePath, profile);
  const ledgerResult = inspectLedger(bundlePath, profile);
  const cacheTrailsResult = inspectCacheTrails(bundlePath, profile);
  const sourceRecoverabilityResult = inspectSourceRecoverability(bundlePath, profile);

  // Build unified report
  const sections = {
    trace: traceResult,
    legacy_trace: legacyTraceResult,
    bundle_schema: bundleSchemaResult,
    gate_attempts: gateAttemptsResult,
    timeline: timelineResult,
    work_units: workUnitsResult,
    ledger: ledgerResult,
    cache_trails: cacheTrailsResult,
    source_recoverability: sourceRecoverabilityResult,
  };

  const report = buildHealthReport({ bundlePath, profile, sections });

  // Append diagnostic trace event (non-verdict) — EXO-004
  appendDiagnosticTrace(bundlePath, report);

  // Output
  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printSummary(report);
    console.log(JSON.stringify(report, null, 2));
  }

  // Exit code: 0 for clean, 1 for issues. Let stdout flush naturally; forcing
  // process.exit() here can truncate large JSON reports when the caller uses a
  // pipe-backed child process.
  process.exitCode = report.status === 'clean' ? 0 : 1;
}

main();
