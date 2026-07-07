// gate-helpers-provenance.mjs - Work-unit provenance gate checks and bypass diagnostics
// @impl WPG-001, WPG-002, WPG-003, WPG-004, WPG-006, WPG-007, WPG-008
// Canonical location: DPT_FRAMEWORK/engine/helpers/gate-helpers-provenance.mjs

import { existsSync, readFileSync, readdirSync, statSync, appendFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  readOutputDeclarations,
  readSubmittedWorkUnitDeclarations,
  readBundlePlan,
  listMatchingBundleFiles,
} from './gate-helpers-readers.mjs';
import { readBundleName, logToRun } from '../logger.mjs';
import { inspectWorkUnits } from '../work-unit-core.mjs';

function waveNumber(value) {
  if (Number.isInteger(value)) return value;
  const match = String(value || '').match(/wave([0-9]+)/);
  return match ? Number(match[1]) : null;
}

function expectedOutputPaths(bundlePath, selectors = {}) {
  const expectedPaths = new Set();

  if (selectors.expected_from_topic_registry) {
    const plan = readBundlePlan(bundlePath);
    if (plan && Array.isArray(plan.topic_registry)) {
      for (const topic of plan.topic_registry) {
        for (const template of selectors.expected_from_topic_registry) {
          expectedPaths.add(template.replace(/\{topic\}/g, topic.slug));
        }
      }
    }
  }

  if (selectors.glob) {
    for (const pattern of (Array.isArray(selectors.glob) ? selectors.glob : [selectors.glob])) {
      const matches = listMatchingBundleFiles(bundlePath, pattern);
      for (const match of matches) {
        if (match.relPath) expectedPaths.add(match.relPath);
      }
    }
  }

  return expectedPaths;
}

function readScopedSubmittedWorkUnitRows(bundlePath, rule) {
  const rows = readSubmittedWorkUnitDeclarations(bundlePath);
  const wave = waveNumber(rule.wave);
  return rows.filter((row) => {
    if (wave !== null && row.wave !== wave) return false;
    if (rule.kind && row.kind !== rule.kind) return false;
    if (rule.producer_rule && row.producer_rule !== rule.producer_rule) return false;
    if (rule.role && !(row.output_files || []).some((entry) => entry.role === rule.role)) return false;
    if (rule.work_id_pattern) {
      const re = new RegExp(rule.work_id_pattern);
      if (!re.test(row.work_id || '')) return false;
    }
    return true;
  });
}

function bindingFailureInspect(lines) {
  return (lines || []).map((line) => `work-unit binding cross-check failed: ${line}`);
}

function bindingFailureAdvice() {
  return [
    'Repair delegated coverage through a valid work-unit retry, replacement submit, or explicit terminal/retry operation; do not hand-edit rb_output_declarations.jsonl or rb_status.json.',
  ];
}

function outputEntryAllowedBySelectors(entry, selectors = {}) {
  if (!selectors.roles || selectors.roles.length === 0) return true;
  return selectors.roles.includes(entry.role);
}

function outputDeclarationTouchesWave(row, phase) {
  const wave = waveNumber(phase);
  if (wave === null) return false;
  if (row.wave === wave) return true;
  if (typeof row.work_id === 'string' && (row.work_id.startsWith(`wu-w${wave}-`) || row.work_id.startsWith(`wave${wave}-`))) return true;
  for (const entry of row.output_files || []) {
    const filePath = entry?.path || '';
    if (wave === 0 && filePath.startsWith('artifacts/wave0/')) return true;
    if (wave === 1 && filePath.startsWith('artifacts/wave1/')) return true;
    if (wave === 2 && filePath.startsWith('reference/00-cross-')) return true;
  }
  return false;
}

function nonSubmittedDeclarationRows(rawDeclarations, submittedDeclarations, phase) {
  const submittedKeys = new Set(submittedDeclarations.map((row) => `${row.work_id}:${row.ledger_record_hash}`));
  return rawDeclarations
    .filter((row) => outputDeclarationTouchesWave(row, phase))
    .filter((row) => !submittedKeys.has(`${row.work_id || '<no-work-id>'}:${row.ledger_record_hash || '<no-ledger-hash>'}`));
}

export function checkWorkUnitLedgerExists(bundlePath, rule) {
  let scoped = [];
  try {
    scoped = readScopedSubmittedWorkUnitRows(bundlePath, rule);
  } catch (error) {
    return {
      passed: false,
      inspect: [`Submitted work-unit ledger invalid: ${error.message}`],
      advice: bindingFailureAdvice(),
      records: [],
    };
  }

  if (scoped.length === 0) {
    const scope = [];
    if (rule.wave) scope.push(`wave=${rule.wave}`);
    if (rule.kind) scope.push(`kind=${rule.kind}`);
    if (rule.producer_rule) scope.push(`producer_rule=${rule.producer_rule}`);
    if (rule.role) scope.push(`role=${rule.role}`);
    return {
      passed: false,
      inspect: [`No submitted work-unit ledger rows found (${scope.length ? scope.join(', ') : 'any scope'}).`],
      advice: ['Submit delegated work through operate-work-unit so rb_output_declarations.jsonl contains Engine-written work-unit rows.'],
      records: [],
    };
  }

  return {
    passed: true,
    inspect: [`Found ${scoped.length} submitted work-unit ledger row(s).`],
    advice: [],
    records: scoped,
  };
}

export function checkWorkUnitOutputCoverage(bundlePath, rule) {
  const selectors = rule.output_selectors || {};
  const expectedPaths = expectedOutputPaths(bundlePath, selectors);

  if (expectedPaths.size === 0) {
    return {
      passed: true,
      inspect: ['No delegated output files matched this work-unit coverage rule.'],
      advice: [],
      orphans: [],
      records: [],
    };
  }

  let scoped = [];
  try {
    scoped = readScopedSubmittedWorkUnitRows(bundlePath, rule);
  } catch (error) {
    return {
      passed: false,
      inspect: [`Submitted work-unit ledger invalid: ${error.message}`],
      advice: bindingFailureAdvice(),
      orphans: [...expectedPaths],
      records: [],
    };
  }

  const declaredPaths = new Set();
  for (const row of scoped) {
    for (const entry of row.output_files || []) {
      if (outputEntryAllowedBySelectors(entry, selectors)) declaredPaths.add(entry.path);
    }
  }

  const orphans = [];
  for (const expected of expectedPaths) {
    if (!declaredPaths.has(expected)) orphans.push(expected);
  }

  if (orphans.length > 0) {
    return {
      passed: false,
      inspect: orphans.map((path) => `Delegated output lacks submitted work-unit coverage: ${path}`),
      advice: ['Submit delegated outputs through operate-work-unit; filesystem presence and hand-written declarations are diagnostic only.'],
      orphans,
      records: scoped,
    };
  }

  return {
    passed: true,
    inspect: [`All ${expectedPaths.size} delegated output(s) covered by submitted work-unit ledger rows.`],
    advice: [],
    orphans: [],
    records: scoped,
  };
}

export function checkWorkUnitSubmissionPresence(bundlePath, rule) {
  const selectors = rule.output_selectors || {};
  const expectedPaths = expectedOutputPaths(bundlePath, selectors);
  if (expectedPaths.size === 0 && selectors.glob) {
    return {
      passed: true,
      inspect: ['No delegated output files matched this work-unit submission-presence rule.'],
      advice: [],
      records: [],
    };
  }

  const ledgerResult = checkWorkUnitLedgerExists(bundlePath, rule);
  if (!ledgerResult.passed) return ledgerResult;

  const inspectResult = inspectWorkUnits(bundlePath);
  if (!inspectResult.passed) {
    return {
      passed: false,
      inspect: bindingFailureInspect(inspectResult.inspect || []),
      advice: bindingFailureAdvice(),
      records: ledgerResult.records || [],
    };
  }

  return {
    passed: true,
    inspect: [`Submitted work-unit presence cross-check passed for ${(ledgerResult.records || []).length} row(s).`],
    advice: [],
    records: ledgerResult.records || [],
  };
}

export function detectDelegatedBypassSuspicion(bundlePath, phase, gate) {
  try {
    const artifactsFound = [];
    const provenanceMissing = [];
    let suspected = false;
    const rawDeclarations = (() => {
      try { return readOutputDeclarations(bundlePath); } catch { return []; }
    })();

    const declarations = (() => {
      try { return readSubmittedWorkUnitDeclarations(bundlePath); } catch { return []; }
    })();
    const handWrittenDeclarations = nonSubmittedDeclarationRows(rawDeclarations, declarations, phase);
    if (handWrittenDeclarations.length > 0) {
      artifactsFound.push(...handWrittenDeclarations.map((row) => `rb_output_declarations.jsonl:${row.work_id || '<no-work-id>'}`));
      provenanceMissing.push(`${handWrittenDeclarations.length} output declaration row(s) are not submitted work-unit ledger rows for ${phase}`);
      suspected = true;
    }

    if (phase === 'wave0' || phase === 'wave1') {
      const waveDir = `artifacts/${phase}`;
      const waveFull = join(bundlePath, waveDir);

      if (existsSync(waveFull) && statSync(waveFull).isDirectory()) {
        const waveFiles = [];
        const walkDir = (dir, base) => {
          try {
            for (const entry of readdirSync(dir, { withFileTypes: true })) {
              const rel = join(base, entry.name);
              if (entry.isFile()) waveFiles.push(rel);
              else if (entry.isDirectory()) walkDir(join(dir, entry.name), rel);
            }
          } catch { /* ignore */ }
        };
        walkDir(waveFull, waveDir);
        artifactsFound.push(...waveFiles);

        const covered = new Set();
        const phaseWave = waveNumber(phase);
        for (const row of declarations) {
          if (row.wave !== phaseWave) continue;
          for (const entry of row.output_files || []) covered.add(entry.path);
        }
        const uncovered = waveFiles.filter((file) => !covered.has(file));
        if (uncovered.length > 0) {
          provenanceMissing.push(`No submitted work-unit ledger coverage for ${uncovered.length} ${phase} artifact(s)`);
        }
        suspected = suspected || uncovered.length > 0;
      }
    } else if (phase === 'wave2') {
      const searchIndicators = [];

      const crossDir = join(bundlePath, 'reference');
      if (existsSync(crossDir) && statSync(crossDir).isDirectory()) {
        try {
          searchIndicators.push(...readdirSync(crossDir)
            .filter((file) => file.startsWith('00-cross-'))
            .map((file) => `reference/${file}`));
        } catch { /* ignore */ }
      }

      const findingIndexPath = join(bundlePath, 'artifacts', 'wave2', 'finding-index.yaml');
      if (existsSync(findingIndexPath)) {
        try {
          const findingIndex = parseYaml(readFileSync(findingIndexPath, 'utf-8'));
          if (findingIndex && Array.isArray(findingIndex.findings)) {
            for (const finding of findingIndex.findings) {
              if (finding.decision === 'exploit_search' || finding.decision === 'explore_search' || finding.search_required === true) {
                searchIndicators.push(`finding:${finding.id || 'unknown'}`);
              }
            }
          }
        } catch { /* ignore */ }
      }

      if (searchIndicators.length > 0) {
        artifactsFound.push(...searchIndicators);
        const covered = new Set();
        for (const row of declarations) {
          if (row.wave !== 2) continue;
          for (const entry of row.output_files || []) covered.add(entry.path);
        }
        const uncoveredRefs = searchIndicators
          .filter((item) => item.startsWith('reference/'))
          .filter((item) => !covered.has(item));
        if (uncoveredRefs.length > 0) provenanceMissing.push(`No submitted work-unit ledger coverage for ${uncoveredRefs.length} Wave2 reference artifact(s)`);
        if (!declarations.some((row) => row.wave === 2) && searchIndicators.some((item) => item.startsWith('finding:'))) {
          provenanceMissing.push('Wave2 finding-index requests delegated evidence search but no submitted Wave2 work-unit row exists');
        }
        suspected = suspected || provenanceMissing.length > 0;
      }
    }

    if (suspected) {
      try {
        const tracePath = join(bundlePath, 'rb_trace.jsonl');
        const bundle = (() => {
          try { return readBundleName(bundlePath); } catch { return basename(bundlePath); }
        })();
        const ts = new Date().toISOString();
        appendFileSync(tracePath, JSON.stringify({
          ts,
          bundle,
          event: 'delegated_bypass_suspected',
          kind: 'delegated_bypass_suspected',
          gate,
          phase,
          artifacts_found: artifactsFound,
          provenance_missing: provenanceMissing,
        }) + '\n');
      } catch { /* trace write failure silently ignored */ }

      logToRun(bundlePath, 'warn', 'delegated_bypass_suspected', {
        gate,
        phase,
        artifacts_found: artifactsFound.slice(0, 10),
        provenance_missing: provenanceMissing,
      });
    }

    return { suspected, artifactsFound, provenanceMissing };
  } catch {
    return { suspected: false };
  }
}

export function checkDelegatedBypassSuspected(bundlePath, rule) {
  const phase = rule.wave || rule.phase || null;
  const result = detectDelegatedBypassSuspicion(bundlePath, phase, rule.gate || phase || 'unknown-gate');
  if (result.suspected) {
    return {
      passed: false,
      inspect: [`delegated_bypass_suspected: ${(result.provenanceMissing || []).join('; ')}`],
      advice: ['Route delegated artifacts through work-unit claim/submit; direct files and hand-written declarations cannot satisfy gate provenance.'],
      artifactsFound: result.artifactsFound || [],
      provenanceMissing: result.provenanceMissing || [],
    };
  }
  return {
    passed: true,
    inspect: ['No delegated bypass suspicion detected for this gate scope.'],
    advice: [],
    artifactsFound: result.artifactsFound || [],
    provenanceMissing: [],
  };
}
