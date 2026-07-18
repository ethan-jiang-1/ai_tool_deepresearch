#!/usr/bin/env node
// Experiment auto-runner — headless Claude Code playbook executor.
// Runner is the orchestrator: discover playbooks, spawn headless Agent to
// execute, then read trace + run health check to determine verdict.
// Agent executes; Runner judges.

import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, rmSync, mkdirSync, existsSync, symlinkSync, appendFileSync, writeFileSync } from 'node:fs';
import { resolve, join, dirname, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { buildChildEnv, parseEnvFile } from './lib/env-deepseek.mjs';

const R = '\x1b[31m', G = '\x1b[32m', Y = '\x1b[33m', C = '\x1b[36m', B = '\x1b[0m';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const ENV_FILE = resolve(REPO_ROOT, '.env');
const PLAYBOOK_DIR = join(REPO_ROOT, 'experiments_playbook');
const EXP_BUNDLES = join(REPO_ROOT, '.exp-bundles');
const VERDICTS_LOG = join(REPO_ROOT, '_temp', 'exp_verdicts.jsonl');
const RUN_LOG = join(EXP_BUNDLES, '_run_log.jsonl');
const VERIFY_HEALTH = join(REPO_ROOT, 'experiments_env', 'shared', 'verify-bundle-health.mjs');

// ── CLI ───────────────────────────────────────────────────────────
function parseCli() {
  const { values } = parseArgs({
    options: {
      case:     { type: 'string' },
      group:    { type: 'string' },
      tier:     { type: 'string' },
      'cleanup-pass': { type: 'boolean', default: false },
      timeout:  { type: 'string', default: '600000' },
      json:     { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
    },
    strict: false,
  });
  return values;
}

// ── playbook discovery ────────────────────────────────────────────
function parseMdFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fm = Object.create(null);
  for (const line of match[1].split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    fm[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  }
  return fm;
}

function discoverPlaybooks(filter) {
  const results = [];
  const dirs = readdirSync(PLAYBOOK_DIR, { withFileTypes: true });
  for (const entry of dirs) {
    if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
    const groupDir = join(PLAYBOOK_DIR, entry.name);
    let files;
    try { files = readdirSync(groupDir); } catch { continue; }
    for (const f of files) {
      if (!f.startsWith('case-') || !f.endsWith('.md')) continue;
      const raw = readFileSync(join(groupDir, f), 'utf-8');
      const fm = parseMdFrontmatter(raw);
      if (!fm || !fm.weight || !fm.case) continue;
      results.push({
        caseId: fm.case,
        experiment: fm.experiment || entry.name.replace(/^exp_/, ''),
        weight: fm.weight,
        playbook: relative(REPO_ROOT, join(groupDir, f)),
        group: entry.name,
      });
    }
  }
  let filtered = results;
  if (filter.case) filtered = filtered.filter(r => r.caseId === filter.case);
  if (filter.group) filtered = filtered.filter(r => r.experiment === filter.group || r.group === `exp_${filter.group}`);
  if (filter.tier) filtered = filtered.filter(r => r.weight === filter.tier);
  if (!filter.case && !filter.group && !filter.tier) filtered = filtered.filter(r => r.weight === 'light');
  filtered.sort((a, b) => {
    const na = parseInt(a.caseId.replace('case-', ''));
    const nb = parseInt(b.caseId.replace('case-', ''));
    return na - nb;
  });
  return filtered;
}

function isHumanCase(caseId) {
  const m = caseId.match(/case-(\d+)/);
  if (!m) return false;
  const n = parseInt(m[1]);
  return n >= 901 && n <= 949;
}

// ── .exp-bundles/ init ────────────────────────────────────────────
function initExpBundles() {
  mkdirSync(EXP_BUNDLES, { recursive: true });
  const symlinkPath = join(EXP_BUNDLES, 'DPT_FRAMEWORK');
  if (!existsSync(symlinkPath)) {
    symlinkSync(join('..', 'DPT_FRAMEWORK'), symlinkPath);
  }
}

// ── prompt ────────────────────────────────────────────────────────
// Reads RUN_CLI_EXPS.md as the authoritative CLI-mode instruction,
// then appends the specific playbook to run. The Agent follows the
// CLI instruction faithfully; the Runner handles verdict and cleanup.
const CLI_INSTRUCTION_PATH = join(REPO_ROOT, 'experiments_playbook', 'RUN_CLI_EXPS.md');
let CLI_INSTRUCTION = null;

function loadCliInstruction() {
  if (CLI_INSTRUCTION) return CLI_INSTRUCTION;
  try { CLI_INSTRUCTION = readFileSync(CLI_INSTRUCTION_PATH, 'utf-8'); }
  catch { CLI_INSTRUCTION = ''; }
  return CLI_INSTRUCTION;
}

function buildPrompt(playbook) {
  const instruction = loadCliInstruction();
  return `${instruction}

---

Runner 指定你跑这一个实验: ${playbook.playbook}`;
}

// ── diagnostic log ────────────────────────────────────────────────
function writeDiagLog(bundlePath, stdout, stderr, elapsed) {
  const logPath = join(bundlePath || EXP_BUNDLES, `_diag_${Date.now()}.log`);
  try {
    const content = [
      `=== Agent stdout (${elapsed}ms) ===`,
      stdout || '(empty)',
      `=== Agent stderr ===`,
      stderr || '(empty)',
    ].join('\n');
    writeFileSync(logPath, content);
    return logPath;
  } catch {
    return null;
  }
}

// ── run log ──────────────────────────────────────────────────────
function logRunEvent(event, data) {
  const entry = JSON.stringify({ ts: new Date().toISOString(), event, ...data });
  try { mkdirSync(EXP_BUNDLES, { recursive: true }); appendFileSync(RUN_LOG, entry + '\n'); } catch {}
}

function saveRunReport(report) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = join(REPO_ROOT, '_temp', `exp_run_${ts}.json`);
  try {
    mkdirSync(join(REPO_ROOT, '_temp'), { recursive: true });
    writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  } catch {}
  return reportPath;
}

// ── trace reading ─────────────────────────────────────────────────
function extractVerdict(bundlePath) {
  const tracePath = join(bundlePath, 'rb_trace.jsonl');
  if (!existsSync(tracePath)) return { verdict: 'FAIL', error: 'rb_trace.jsonl not found', checks: [] };

  let lines;
  try { lines = readFileSync(tracePath, 'utf-8').trim().split('\n').filter(Boolean); }
  catch { return { verdict: 'FAIL', error: 'cannot read rb_trace.jsonl', checks: [] }; }

  if (lines.length === 0) return { verdict: 'FAIL', error: 'empty trace', checks: [] };

  const checks = [];
  for (const line of lines) {
    try {
      const e = JSON.parse(line);
      if (e.event === 'check') checks.push({ step: e.step || e.gate || '', passed: e.passed, expected: e.expected !== undefined ? e.expected : true });
    } catch { /* skip malformed lines */ }
  }

  if (checks.length === 0) return { verdict: 'FAIL', error: 'no check events in trace', checks: [] };

  const failed = checks.filter(c => c.passed !== c.expected);
  return {
    verdict: failed.length === 0 ? 'PASS' : 'FAIL',
    checksTotal: checks.length,
    checksPassed: checks.length - failed.length,
    checks,
    error: failed.length > 0 ? `${failed.length} check(s) failed` : null,
  };
}

// ── bundle finding ────────────────────────────────────────────────
function findBundle(caseId, afterTime) {
  // The playbook Step 1 uses --case <short-id> which produces
  // dpt_disp_<short-id>_<name>_<hex>. Extract short ID from full case ID
  // e.g. case-41-light-minimal-path → case-41
  const shortId = caseId.match(/^(case-\d+)/)?.[1] || caseId;

  for (const dir of [EXP_BUNDLES, REPO_ROOT]) {
    let entries;
    try { entries = readdirSync(dir); } catch { continue; }
    for (const e of entries) {
      if (!e.startsWith(`dpt_disp_${shortId}_`)) continue;
      const full = join(dir, e);
      let st;
      try { st = statSync(full); } catch { continue; }
      if (!st.isDirectory()) continue;
      if (st.mtimeMs > afterTime) return full;
    }
  }
  return null;
}

// ── health check ──────────────────────────────────────────────────
function runHealthCheck(bundlePath, weight) {
  const profile = weight === 'light' ? 'light' : weight === 'standard' ? 'standard' : 'heavy';
  try {
    const r = spawnSync('node', [VERIFY_HEALTH, '--bundle', bundlePath, '--profile', profile, '--json'], {
      encoding: 'utf-8', timeout: 30000, maxBuffer: 10 * 1024 * 1024,
    });
    if (r.status === 0 || r.status === 1) {
      try { return JSON.parse(r.stdout); } catch { return null; }
    }
  } catch { /* optional */ }
  return null;
}

// ── verdict log ───────────────────────────────────────────────────
function appendVerdictLog(caseId, bundleName, verdict, checks) {
  const entry = JSON.stringify({
    ts: new Date().toISOString(),
    case: caseId,
    bundle: bundleName,
    verdict,
    checks: checks.map(c => ({ gate: c.step || '', passed: c.passed, expected: c.expected })),
  });
  mkdirSync(join(REPO_ROOT, '_temp'), { recursive: true });
  appendFileSync(VERDICTS_LOG, entry + '\n');
}

// ── report ────────────────────────────────────────────────────────
function printConsoleReport(report) {
  console.log(C + '\n══════ Experiment Run Report ══════' + B);
  console.log(`Run at: ${report.timestamp}`);
  console.log(`Filter: ${report.filter}`);
  console.log('');
  const s = report.summary;
  console.log(`  ${G}${s.pass} PASS${B}  ${s.fail > 0 ? R + s.fail + ' FAIL' : '0 FAIL'}${B}  ${(s.human + s.error) > 0 ? Y + (s.human + s.error) + ' SKIP/ERR' : '0 SKIP/ERR'}${B}  (${s.total} total)`);
  console.log('');
  for (const r of report.results) {
    let tag;
    if (r.verdict === 'PASS') tag = G + 'PASS' + B;
    else if (r.verdict === 'FAIL') tag = R + 'FAIL' + B;
    else if (r.verdict === 'HUMAN') tag = Y + 'HUMAN' + B;
    else tag = Y + r.verdict + B;
    console.log(`  ${tag}  ${r.caseId.padEnd(14)} ${(r.experiment || '').padEnd(22)} ${r.health ? r.health : ''}`);
  }
  const failures = report.results.filter(r => r.verdict === 'FAIL' || r.verdict === 'ERROR');
  if (failures.length > 0) {
    console.log(C + '\n── Failures ──' + B);
    for (const f of failures) console.log(`  ${R}●${B} ${f.caseId}: ${f.error || ''}`);
  }
  const preserved = report.results.filter(r => r.bundlePreserved);
  if (preserved.length > 0) {
    console.log(Y + '\n── Preserved Bundles ──' + B);
    for (const p of preserved) console.log(`  ${p.bundle} (${p.verdict})`);
  }
  console.log(C + '══════════════════════════════════' + B);
}

// ── main ──────────────────────────────────────────────────────────
function main() {
  const opts = parseCli();
  const timeout = parseInt(opts.timeout) || 600000;

  const playbooks = discoverPlaybooks({ case: opts.case, group: opts.group, tier: opts.tier });
  if (playbooks.length === 0) {
    console.error('No playbooks found matching filter.');
    process.exit(2);
  }

  const filterDesc = opts.case ? `case=${opts.case}`
    : opts.group ? `group=${opts.group}`
    : opts.tier ? `tier=${opts.tier}`
    : 'tier=light (default)';

  if (opts['dry-run']) {
    console.log(`Would run ${playbooks.length} case(s) [${filterDesc}]:`);
    for (const p of playbooks) console.log(`  ${p.caseId} [${p.weight}] ${p.playbook}`);
    return;
  }

  if (!opts.json) console.log(`${playbooks.length} case(s) [${filterDesc}]`);

  // init
  initExpBundles();

  // load env
  const envParsed = parseEnvFile(ENV_FILE);
  if (envParsed.error) { console.error(`Env error: ${envParsed.error}`); process.exit(2); }
  const envVars = envParsed.vars;
  if (!envVars.DEEPSEEK_API_KEY || !envVars.DEEPSEEK_BASE_URL && !envVars.DEEPSEEK_ANTHROPIC_BASE_URL || !envVars.DEEPSEEK_MODEL) {
    console.error('Missing required DEEPSEEK_* env vars.');
    process.exit(2);
  }
  const childEnv = buildChildEnv(envVars);

  // run
  const results = [];
  let nPass = 0, nFail = 0, nHuman = 0, nError = 0;

  for (const pb of playbooks) {
    // human case
    if (isHumanCase(pb.caseId)) {
      results.push({ caseId: pb.caseId, experiment: pb.experiment, weight: pb.weight, playbook: pb.playbook, verdict: 'HUMAN', health: null, bundle: null, bundlePreserved: false, error: 'requires human judgment (901-949)' });
      nHuman++;
      appendVerdictLog(pb.caseId, null, 'HUMAN', []);
      if (!opts.json) console.log(`  ${Y}SKIP${B} ${pb.caseId} (human)`);
      continue;
    }

    if (!opts.json) process.stdout.write(`  ${pb.caseId} [${pb.weight}] ... `);

    logRunEvent('case_start', { case: pb.caseId, playbook: pb.playbook, weight: pb.weight, group: pb.group });

    const prompt = buildPrompt(pb);
    const startTime = Date.now();

    const cr = spawnSync('claude', ['--setting-sources', 'project,local', '--allow-dangerously-skip-permissions', '-p', prompt], {
      env: childEnv,
      encoding: 'utf-8',
      timeout,
      maxBuffer: 10 * 1024 * 1024,
    });

    const elapsed = Date.now() - startTime;

    // find the bundle Agent created — filesystem scan first, then stdout parse
    let bundlePath = findBundle(pb.caseId, startTime);
    if (!bundlePath) {
      const m = cr.stdout.match(/BUNDLE=(.+)/);
      if (m) {
        const p = m[1].trim();
        bundlePath = resolve(p) === p ? p : join(REPO_ROOT, p);
      }
    }

    // write diagnostic log — always, for debuggability
    writeDiagLog(bundlePath, cr.stdout, cr.stderr, elapsed);

    if (bundlePath) {
      // Runner extracts verdict from trace
      const v = extractVerdict(bundlePath);

      // health check
      let healthResult = null;
      try { healthResult = runHealthCheck(bundlePath, pb.weight); } catch {}
      const healthClean = healthResult && healthResult.status === 'clean';
      const healthIssues = healthResult && healthResult.status !== 'clean';

      // write result to bundle
      try {
        writeFileSync(join(bundlePath, 'exp_result.json'), JSON.stringify({
          case: pb.caseId,
          verdict: v.verdict,
          health: healthClean ? 'CLEAN' : (healthResult ? 'ISSUES' : null),
          checks_total: v.checksTotal || 0,
          checks_passed: v.checksPassed || 0,
          bundle: relative(REPO_ROOT, bundlePath),
          bundle_preserved: false,
          error: v.error,
        }, null, 2) + '\n');
      } catch {}

      // cleanup
      let bundlePreserved = true;
      if (v.verdict === 'PASS' && opts['cleanup-pass']) {
        try { rmSync(bundlePath, { recursive: true, force: true }); bundlePreserved = false; } catch {}
      }

      if (v.verdict === 'PASS') nPass++; else nFail++;

      results.push({
        caseId: pb.caseId, experiment: pb.experiment, weight: pb.weight, playbook: pb.playbook,
        verdict: v.verdict,
        health: healthClean ? 'CLEAN' : (healthResult ? 'ISSUES' : null),
        checksTotal: v.checksTotal || 0, checksPassed: v.checksPassed || 0,
        bundle: relative(REPO_ROOT, bundlePath), bundlePreserved,
        error: v.error, durationMs: elapsed,
      });

      appendVerdictLog(pb.caseId, basename(bundlePath), v.verdict, v.checks);
      logRunEvent('case_done', { case: pb.caseId, verdict: v.verdict, checks_total: v.checksTotal, checks_passed: v.checksPassed, checks_failed: (v.checksTotal||0) - (v.checksPassed||0), health: healthClean ? 'CLEAN' : (healthResult ? 'ISSUES' : null), duration_ms: elapsed, bundle: relative(REPO_ROOT, bundlePath), bundle_preserved: bundlePreserved, error: v.error });

      if (!opts.json) {
        const tag = v.verdict === 'PASS' ? G + 'PASS' + B : R + 'FAIL' + B;
        const hi = !bundlePreserved ? '' : (v.verdict === 'FAIL' ? ` (${Y}preserved${B})` : '');
        console.log(`${tag} ${(elapsed / 1000).toFixed(1)}s ${(v.checksTotal||0)} checks${hi}`);
      }
    } else {
      // No bundle found — Agent might have failed silently
      nError++;
      results.push({
        caseId: pb.caseId, experiment: pb.experiment, weight: pb.weight, playbook: pb.playbook,
        verdict: 'ERROR', health: null, bundle: null, bundlePreserved: false,
        error: cr.status !== 0
          ? `claude exit ${cr.status}: ${(cr.stderr || '').slice(0, 200)}`
          : 'no bundle found — agent may have failed',
        durationMs: elapsed,
      });
      appendVerdictLog(pb.caseId, null, 'ERROR', []);
      logRunEvent('case_done', { case: pb.caseId, verdict: 'ERROR', checks_total: 0, checks_passed: 0, checks_failed: 0, health: null, duration_ms: elapsed, bundle: null, bundle_preserved: false, error: 'no bundle found — agent may have failed' });
      if (!opts.json) console.log(`${R}ERROR${B} ${(elapsed / 1000).toFixed(1)}s — no bundle found`);
    }
  }

  // report
  const report = {
    timestamp: new Date().toISOString(),
    runner: 'run-experiment.mjs',
    filter: filterDesc,
    summary: { total: results.length, pass: nPass, fail: nFail, human: nHuman, error: nError },
    results,
  };

  // Save run report to persistent file
  const reportPath = saveRunReport(report);

  if (opts.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printConsoleReport(report);
    console.log(`\n${C}Report saved: ${reportPath}${B}`);
    console.log(`Run log: ${RUN_LOG}`);
  }

  if (nError > 0) process.exit(2);
  if (nFail > 0) process.exit(1);
  process.exit(0);
}

main();
