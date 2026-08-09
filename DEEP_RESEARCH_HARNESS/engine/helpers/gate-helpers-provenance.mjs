// gate-helpers-provenance.mjs - Work-unit provenance gate checks and bypass diagnostics
// @impl WPG-001, WPG-002, WPG-003, WPG-004, WPG-005, WPG-006, WPG-007, WPG-008, WPG-012, WPG-016, RWG-017, RWG-018
// Canonical location: DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-provenance.mjs

import { existsSync, readFileSync, readdirSync, statSync, appendFileSync } from 'node:fs';
import { join, basename, resolve as resolvePath } from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  readOutputDeclarations,
  readNormalizedSubmittedWorkUnitDeclarations,
  readSubmittedWorkUnitDeclarations,
  readBundlePlan,
  listMatchingBundleFiles,
} from './gate-helpers-readers.mjs';
import { classifyReferenceAuthority } from './gate-helpers-checks.mjs';
import { readBundleName, logToRun } from '../logger.mjs';
import {
  inspectWorkUnitDeclarationRecovery,
  inspectWorkUnits,
  loadWorkUnitIndex,
  readWorkUnitLedgerRows,
} from '../work-unit-core.mjs';
import { makeContractFinding } from './wave-contract-findings.mjs';

function provenanceFinding(rule, {
  id,
  blockingBasis,
  surface,
  expected,
  observed,
  missingFact,
  repairKind,
  writeTo,
  repair,
  detail,
}) {
  return makeContractFinding({
    id,
    ruleId: rule.id,
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis,
    surface,
    expected,
    observed,
    missingFact,
    repairKind,
    writeTo,
    repair,
    detail,
  });
}

function ruleScope(rule) {
  const scope = [];
  if (rule.wave) scope.push(`wave=${rule.wave}`);
  if (rule.kind) scope.push(`kind=${rule.kind}`);
  if (rule.producer_rule) scope.push(`producer_rule=${rule.producer_rule}`);
  if (rule.role) scope.push(`role=${rule.role}`);
  return scope.length ? scope.join(', ') : 'any scope';
}

function waveNumber(value) {
  if (Number.isInteger(value)) return value;
  const match = String(value || '').match(/wave([0-9]+)/);
  return match ? Number(match[1]) : null;
}

function expectedOutputPaths(bundlePath, selectors = {}) {
  const expectedGroups = [];

  if (selectors.expected_from_topic_registry) {
    const plan = readBundlePlan(bundlePath);
    if (plan && Array.isArray(plan.topic_registry)) {
      for (const topic of plan.topic_registry) {
        for (const template of selectors.expected_from_topic_registry) {
          expectedGroups.push([topic.slug, ...(topic.previous_layouts || []).map((layout) => layout.slug)]
            .map((slug) => template.replace(/\{topic\}/g, slug)));
        }
      }
    }
  }

  if (selectors.glob) {
    for (const pattern of (Array.isArray(selectors.glob) ? selectors.glob : [selectors.glob])) {
      const matches = listMatchingBundleFiles(bundlePath, pattern);
      for (const match of matches) {
        if (match.relPath) expectedGroups.push([match.relPath]);
      }
    }
  }

  return expectedGroups;
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

function indexRecordMatchesRule(record, rule) {
  const wave = waveNumber(rule.wave);
  if (wave !== null && record.wave !== wave) return false;
  if (rule.kind && record.kind !== rule.kind) return false;
  if (rule.producer_rule && record.producer_rule !== rule.producer_rule) return false;
  if (rule.work_id_pattern && !(new RegExp(rule.work_id_pattern)).test(record.work_id || '')) return false;
  return true;
}

export function checkSubmittedDeclarationRecovery(bundlePath, rule) {
  let index;
  let ledgerRows;
  try {
    index = loadWorkUnitIndex(bundlePath, { createIfMissing: false });
    ledgerRows = readWorkUnitLedgerRows(bundlePath);
  } catch {
    return { passed: true, gaps: [], findings: [], inspect: [], advice: [] };
  }
  const declaredWorkIds = new Set(ledgerRows.map((row) => row.work_id));
  const gaps = Object.values(index.work_units || {})
    .filter((record) => record.status === 'submitted')
    .filter((record) => !record.supersession_relation)
    .filter((record) => indexRecordMatchesRule(record, rule))
    .filter((record) => !declaredWorkIds.has(record.work_id))
    .map((record) => ({
      record,
      recovery: inspectWorkUnitDeclarationRecovery(bundlePath, { work_id: record.work_id }),
    }));
  if (gaps.length === 0) return { passed: true, gaps: [], findings: [], inspect: [], advice: [] };

  const findings = gaps.map(({ record, recovery }) => {
    const command = `node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs recover-declaration ${JSON.stringify(resolvePath(bundlePath))} --work-id ${JSON.stringify(record.work_id)}`;
    const eligible = recovery.eligible === true && recovery.declaration_present === false;
    const detail = eligible
      ? `Submitted work-unit ${record.work_id} is bound in index/status but its Engine declaration row is missing; exact recovery is eligible.`
      : `Submitted work-unit ${record.work_id} is missing its Engine declaration row and exact recovery is unavailable: ${recovery.missing_fact}`;
    return provenanceFinding(rule, {
      id: `submitted_declaration_missing:${record.work_id}`,
      blockingBasis: 'authority_integrity',
      surface: resolvePath(bundlePath, '_work_units/_index.json'),
      expected: 'Every submitted work-unit index/status binding has one hash-valid Engine declaration row.',
      observed: {
        work_id: record.work_id,
        queue_item_id: record.queue_item_id,
        status: record.status,
        declaration_present: false,
        recovery_eligible: eligible,
        ledger_record_hash: record.ledger_record_hash || null,
      },
      missingFact: eligible
        ? `Submitted declaration row is missing for ${record.work_id}; index/status retain the recorded hash and direct owners reproduce it exactly.`
        : `Submitted declaration row is missing for ${record.work_id}; ${recovery.missing_fact}`,
      repairKind: eligible ? 'engine_operation' : 'missing_contract',
      writeTo: eligible ? command : recovery.boundary,
      repair: eligible
        ? `Run ${command}, then rerun the same checkpoint.`
        : 'The recorded declaration cannot be reconstructed exactly; preserve the missing-contract boundary and do not hand-write ledger authority.',
      detail,
    });
  });
  return {
    passed: false,
    gaps,
    findings,
    inspect: findings.map((finding) => finding.detail),
    advice: findings.map((finding) => finding.repair),
  };
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

function isPhaseOwnedProjection(filePath, phase) {
  return phase === 'wave1' && /^artifacts\/wave1\/[^/]+\/depth-review\.yaml$/.test(filePath);
}

function isReferenceArtifact(filePath) {
  return typeof filePath === 'string' && /^reference\/[^/]+\.md$/.test(filePath);
}

function exactHashValidHistoricalKeys(normalized) {
  const keys = new Set();
  for (const historical of normalized?.historical || []) {
    const row = historical?.ledger_row;
    const relation = historical?.relation;
    const lineage = historical?.lineage;
    if (historical?.ledger_disposition !== 'hash_valid_historical'
      || !row?.work_id
      || !row?.ledger_record_hash
      || relation?.predecessor_work_id !== row.work_id
      || relation?.accepted_ledger_record_hash !== row.ledger_record_hash
      || lineage?.predecessor_work_id !== row.work_id
      || !Array.isArray(lineage.edges)
      || !lineage.edges.some((edge) => (
        edge?.kind === 'supersession'
        && edge.predecessor_work_id === row.work_id
        && edge.successor_queue_item_id === relation.successor_queue_item_id
        && edge.relation?.accepted_ledger_record_hash === row.ledger_record_hash
      ))) {
      continue;
    }
    keys.add(`${row.work_id}:${row.ledger_record_hash}`);
  }
  return keys;
}

function nonSubmittedDeclarationRows(rawDeclarations, normalizedDeclarations, phase) {
  const submittedKeys = new Set((normalizedDeclarations?.facts || [])
    .map(({ ledger_row: row }) => `${row.work_id}:${row.ledger_record_hash}`));
  const historicalKeys = exactHashValidHistoricalKeys(normalizedDeclarations);
  return rawDeclarations
    .filter((row) => outputDeclarationTouchesWave(row, phase))
    .filter((row) => {
      const key = `${row.work_id || '<no-work-id>'}:${row.ledger_record_hash || '<no-ledger-hash>'}`;
      return !submittedKeys.has(key) && !historicalKeys.has(key);
    });
}

export function checkWorkUnitLedgerExists(bundlePath, rule) {
  let scoped = [];
  try {
    scoped = readScopedSubmittedWorkUnitRows(bundlePath, rule);
  } catch (error) {
    const detail = `Submitted work-unit ledger invalid: ${error.message}`;
    return {
      passed: false,
      inspect: [detail],
      advice: bindingFailureAdvice(),
      records: [],
      findings: [provenanceFinding(rule, {
        id: `${rule.id}:ledger_invalid`,
        blockingBasis: 'authority_integrity',
        surface: resolvePath(bundlePath, 'rb_output_declarations.jsonl'),
        expected: 'Schema-valid and hash-valid Engine-written submitted work-unit ledger rows.',
        observed: error.message,
        missingFact: `Submitted work-unit ledger is invalid for ${ruleScope(rule)}: ${error.message}`,
        repairKind: 'missing_contract',
        writeTo: `Submitted declaration integrity boundary for ${resolvePath(bundlePath, 'rb_output_declarations.jsonl')}`,
        repair: 'Restore submitted declaration integrity through the work-unit Engine owner before rerunning this checkpoint.',
        detail,
      })],
    };
  }

  if (scoped.length === 0) {
    const scope = ruleScope(rule);
    const detail = `No submitted work-unit ledger rows found (${scope}).`;
    return {
      passed: false,
      inspect: [detail],
      advice: ['Submit delegated work through operate-work-unit so rb_output_declarations.jsonl contains Engine-written work-unit rows.'],
      records: [],
      findings: [provenanceFinding(rule, {
        id: `${rule.id}:submitted_rows_missing`,
        blockingBasis: 'authority_integrity',
        surface: resolvePath(bundlePath, 'rb_output_declarations.jsonl'),
        expected: `At least one submitted work-unit ledger row for ${scope}.`,
        observed: { submitted_rows: 0 },
        missingFact: `No Engine-written submitted work-unit ledger row exists for ${scope}.`,
        repairKind: 'engine_operation',
        writeTo: `operate-work-unit claim/submit path for ${scope}`,
        repair: `Execute the delegated demand through a legal work-unit claim and formal submit for ${scope}.`,
        detail,
      })],
    };
  }

  return {
    passed: true,
    inspect: [`Found ${scoped.length} submitted work-unit ledger row(s).`],
    advice: [],
    records: scoped,
    findings: [],
  };
}

export function checkWorkUnitOutputCoverage(bundlePath, rule) {
  const selectors = rule.output_selectors || {};
  const expectedGroups = expectedOutputPaths(bundlePath, selectors);

  if (expectedGroups.length === 0) {
    return {
      passed: true,
      inspect: ['No delegated output files matched this work-unit coverage rule.'],
      advice: [],
      orphans: [],
      records: [],
      findings: [],
    };
  }

  let scoped = [];
  try {
    scoped = readScopedSubmittedWorkUnitRows(bundlePath, rule);
  } catch (error) {
    const detail = `Submitted work-unit ledger invalid: ${error.message}`;
    return {
      passed: false,
      inspect: [detail],
      advice: bindingFailureAdvice(),
      orphans: expectedGroups.map((group) => group[0]),
      records: [],
      findings: [provenanceFinding(rule, {
        id: `${rule.id}:ledger_invalid`,
        blockingBasis: 'authority_integrity',
        surface: resolvePath(bundlePath, 'rb_output_declarations.jsonl'),
        expected: 'Schema-valid and hash-valid submitted work-unit declaration rows.',
        observed: error.message,
        missingFact: `Submitted work-unit ledger is invalid while checking output coverage: ${error.message}`,
        repairKind: 'missing_contract',
        writeTo: `Submitted declaration integrity boundary for ${resolvePath(bundlePath, 'rb_output_declarations.jsonl')}`,
        repair: 'Restore submitted declaration integrity through the work-unit Engine owner.',
        detail,
      })],
    };
  }

  const declaredPaths = new Set();
  for (const row of scoped) {
    for (const entry of row.output_files || []) {
      if (outputEntryAllowedBySelectors(entry, selectors)) declaredPaths.add(entry.path);
    }
  }

  const orphans = [];
  const orphanRoots = [];
  for (const group of expectedGroups) {
    if (group.some((expected) => declaredPaths.has(expected))) continue;
    let phaseOwned = false;
    const reasons = [];
    const classifications = [];
    for (const expected of group) {
      if (!isReferenceArtifact(expected)) continue;
      const classification = classifyReferenceAuthority(bundlePath, expected);
      if (classification.passed && classification.authority === 'phase_owned_projection') phaseOwned = true;
      else {
        reasons.push(`${expected}: ${classification.reason}`);
        classifications.push({ expected, classification });
      }
    }
    if (phaseOwned) continue;
    const orphan = reasons[0] || group[0];
    orphans.push(orphan);
    orphanRoots.push(classifications[0] || { expected: group[0], classification: null });
  }

  if (orphans.length > 0) {
    const findings = orphanRoots.map(({ expected, classification }, index) => {
      const root = classification?.root_contract || {};
      const detail = `Delegated output lacks submitted work-unit coverage or projection backing: ${orphans[index]}`;
      return provenanceFinding(rule, {
        id: `${rule.id}:output:${expected}`,
        blockingBasis: root.blocking_basis || 'binding_integrity',
        surface: resolvePath(bundlePath, expected),
        expected: 'Expected delegated output is covered by a submitted work-unit row or accepted Phase-owned submitted backing.',
        observed: classification ? { authority: classification.authority, reason_code: classification.reason_code || null } : { submitted_coverage: false },
        missingFact: root.missing_fact || `Delegated output ${expected} lacks submitted work-unit coverage.`,
        repairKind: root.repair_kind || 'engine_operation',
        writeTo: root.write_to || `operate-work-unit claim/submit path for ${expected}`,
        repair: `Repair ${expected} through its legal work-unit or Phase-owned projection path.`,
        detail,
      });
    });
    return {
      passed: false,
      inspect: orphans.map((path) => `Delegated output lacks submitted work-unit coverage or projection backing: ${path}`),
      advice: ['Submit delegated outputs through operate-work-unit or repair Phase-owned reference backing; filesystem presence and hand-written declarations are diagnostic only.'],
      orphans,
      records: scoped,
      findings,
    };
  }

  return {
    passed: true,
    inspect: [`All ${expectedGroups.length} delegated output UID group(s) covered by submitted work-unit ledger rows.`],
    advice: [],
    orphans: [],
    records: scoped,
    findings: [],
  };
}

export function checkWorkUnitSubmissionPresence(bundlePath, rule) {
  const selectors = rule.output_selectors || {};
  const expectedGroups = expectedOutputPaths(bundlePath, selectors);
  if (expectedGroups.length === 0 && selectors.glob) {
    return {
      passed: true,
      inspect: ['No delegated output files matched this work-unit submission-presence rule.'],
      advice: [],
      records: [],
      findings: [],
    };
  }

  const projectionBacked = expectedGroups.filter((group) => {
    return group.some((expected) => {
      const classification = classifyReferenceAuthority(bundlePath, expected);
      return classification.passed && classification.authority === 'phase_owned_projection';
    });
  });
  if (expectedGroups.length > 0 && projectionBacked.length === expectedGroups.length) {
    return {
      passed: true,
      inspect: [`All ${projectionBacked.length} reference projection(s) are backed by submitted prior evidence; no new targeted work-unit row is required.`],
      advice: [],
      records: [],
      findings: [],
    };
  }

  const ledgerResult = checkWorkUnitLedgerExists(bundlePath, rule);
  if (!ledgerResult.passed) return ledgerResult;

  const inspectResult = inspectWorkUnits(bundlePath);
  if (!inspectResult.passed) {
    const detail = bindingFailureInspect(inspectResult.inspect || []);
    return {
      passed: false,
      inspect: detail,
      advice: bindingFailureAdvice(),
      records: ledgerResult.records || [],
      findings: [provenanceFinding(rule, {
        id: `${rule.id}:submission_binding`,
        blockingBasis: 'binding_integrity',
        surface: resolvePath(bundlePath, '_work_units/_index.json'),
        expected: 'Submitted ledger rows bind to valid work-unit index, manifest, result, receipt, beacon, cache and terminal status authority.',
        observed: inspectResult.inspect || [],
        missingFact: `Submitted work-unit presence cross-check failed for ${ruleScope(rule)}.`,
        repairKind: 'missing_contract',
        writeTo: `Work-unit submitted-binding repair boundary for ${ruleScope(rule)}`,
        repair: bindingFailureAdvice()[0],
        detail: detail.join('; '),
      })],
    };
  }

  return {
    passed: true,
    inspect: [`Submitted work-unit presence cross-check passed for ${(ledgerResult.records || []).length} row(s).`],
    advice: [],
    records: ledgerResult.records || [],
    findings: [],
  };
}

export function scanDelegatedBypassSuspicion(bundlePath, phase) {
  try {
    const artifactsFound = [];
    const provenanceMissing = [];
    let suspected = false;
    const rawDeclarations = (() => {
      try { return readOutputDeclarations(bundlePath); } catch { return []; }
    })();

    const normalizedDeclarations = (() => {
      try { return readNormalizedSubmittedWorkUnitDeclarations(bundlePath); } catch { return { facts: [], historical: [] }; }
    })();
    const declarations = normalizedDeclarations.facts.map(({ ledger_row: row }) => row);
    const handWrittenDeclarations = nonSubmittedDeclarationRows(rawDeclarations, normalizedDeclarations, phase);
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
        const uncovered = waveFiles.filter((file) => !covered.has(file) && !isPhaseOwnedProjection(file, phase));
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
          .filter((item) => !covered.has(item))
          .filter((item) => {
            const classification = classifyReferenceAuthority(bundlePath, item);
            return !(classification.passed && classification.authority === 'phase_owned_projection');
          });
        if (uncoveredRefs.length > 0) provenanceMissing.push(`No submitted work-unit ledger coverage or prior-evidence backing for ${uncoveredRefs.length} Wave2 reference artifact(s)`);
        if (!declarations.some((row) => row.wave === 2) && searchIndicators.some((item) => item.startsWith('finding:'))) {
          provenanceMissing.push('Wave2 finding-index requests delegated evidence search but no submitted Wave2 work-unit row exists');
        }
        suspected = suspected || provenanceMissing.length > 0;
      }
    }

    return { suspected, phase, artifactsFound, provenanceMissing };
  } catch {
    return { suspected: false, phase, artifactsFound: [], provenanceMissing: [] };
  }
}

export function detectDelegatedBypassSuspicion(bundlePath, phase) {
  return scanDelegatedBypassSuspicion(bundlePath, phase);
}

export function emitDelegatedBypassDiagnostic(bundlePath, gate, result) {
  if (!result?.suspected) return { emitted: false };
  const phase = result.phase || null;
  let traceWritten = false;
  let logWritten = false;

  try {
    const tracePath = join(bundlePath, 'rb_trace.jsonl');
    const bundle = (() => {
      try { return readBundleName(bundlePath); } catch { return basename(bundlePath); }
    })();
    appendFileSync(tracePath, JSON.stringify({
      ts: new Date().toISOString(),
      bundle,
      event: 'delegated_bypass_suspected',
      kind: 'delegated_bypass_suspected',
      gate,
      phase,
      artifacts_found: result.artifactsFound || [],
      provenance_missing: result.provenanceMissing || [],
    }) + '\n');
    traceWritten = true;
  } catch { /* formal diagnostic remains best-effort */ }

  try {
    logToRun(bundlePath, 'warn', 'delegated_bypass_suspected', {
      gate,
      phase,
      artifacts_found: (result.artifactsFound || []).slice(0, 10),
      provenance_missing: result.provenanceMissing || [],
    });
    logWritten = true;
  } catch { /* formal diagnostic remains best-effort */ }

  return { emitted: traceWritten || logWritten, traceWritten, logWritten };
}

export function checkDelegatedBypassSuspected(bundlePath, rule) {
  const phase = rule.wave || rule.phase || null;
  const result = scanDelegatedBypassSuspicion(bundlePath, phase);
  if (result.suspected) {
    const detail = `delegated_bypass_suspected: ${(result.provenanceMissing || []).join('; ')}`;
    return {
      passed: false,
      inspect: [detail],
      advice: ['Route delegated artifacts through work-unit claim/submit; direct files and hand-written declarations cannot satisfy gate provenance.'],
      artifactsFound: result.artifactsFound || [],
      provenanceMissing: result.provenanceMissing || [],
      findings: [provenanceFinding(rule, {
        id: `${rule.id}:delegated_bypass`,
        blockingBasis: 'binding_integrity',
        surface: resolvePath(bundlePath, rule.target || `artifacts/${phase || 'unknown'}`),
        expected: 'Delegated artifacts and evidence-search outputs are bound to Engine-written submitted work-unit provenance.',
        observed: { artifacts_found: result.artifactsFound || [], provenance_missing: result.provenanceMissing || [] },
        missingFact: `Delegated-looking ${phase || 'wave'} outputs exist without accepted submitted work-unit provenance: ${(result.provenanceMissing || []).join('; ')}`,
        repairKind: 'engine_operation',
        writeTo: `operate-work-unit claim/submit path for ${phase || 'the affected wave'}`,
        repair: 'Execute or repair the affected delegated work through the legal work-unit claim/submit path.',
        detail,
      })],
    };
  }
  return {
    passed: true,
    inspect: ['No delegated bypass suspicion detected for this gate scope.'],
    advice: [],
    artifactsFound: result.artifactsFound || [],
    provenanceMissing: [],
    findings: [],
  };
}
