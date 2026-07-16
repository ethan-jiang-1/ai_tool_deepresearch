// @impl IOC-005, CHI-001, GSK-002, GSK-004, GSK-008, RWG-018

import { closeSync, openSync, writeFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import {
  GateBlockingBasisSchema,
  GateRepairKindSchema,
} from '../../schema/contracts/gate-definition.mjs';

const CLASSIFICATIONS = new Set(['blocking', 'advisory', 'diagnostic-only']);
const FINDING_SOURCES = new Set(['definition', 'checker']);
const UNRESOLVED_COORDINATE_PATTERN = /\{[A-Za-z][A-Za-z0-9_-]*\}|<[A-Za-z][A-Za-z0-9_-]*>|\$checked_target/;

function compactString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function compactFact(value) {
  if (typeof value === 'string') return compactString(value);
  return value === undefined ? null : value;
}

function printableFact(value) {
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value); } catch { return String(value); }
}

function replaceCoordinateToken(value, token, replacement) {
  if (!replacement || typeof value !== 'string') return value;
  return value.split(token).join(replacement);
}

function resolveDefinitionCoordinate(value, {
  bundlePath = null,
  topic = null,
  slug = null,
  checkedTarget = null,
} = {}) {
  let coordinate = compactString(value);
  if (!coordinate) return null;
  if (coordinate === '$checked_target') coordinate = compactString(checkedTarget);
  if (!coordinate) return null;

  const absoluteBundle = compactString(bundlePath) ? resolvePath(bundlePath) : null;
  coordinate = replaceCoordinateToken(coordinate, '{bundle}', absoluteBundle);
  coordinate = replaceCoordinateToken(coordinate, '{topic}', compactString(topic));
  coordinate = replaceCoordinateToken(coordinate, '<slug>', compactString(slug));
  return compactString(coordinate);
}

function normalizeCheckpointContext(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error('checkpoint context must be an object');
  return { ...value };
}

function configurationIntegrityFinding({
  findingId,
  ruleId,
  surface,
  detail,
  missingFields,
  checkpointContext,
  maskedRuleIds,
}) {
  const configRuleId = `configuration_integrity:${ruleId}`;
  const domainDetail = compactString(detail) || `[${findingId}] ${compactString(surface) || 'contract check failed'}`;
  return {
    id: configRuleId,
    rule_id: configRuleId,
    finding_source: 'checker',
    classification: 'blocking',
    blocking_basis: 'configuration_integrity',
    surface: compactString(surface),
    expected: 'Every blocking finding must declare a closed blocking basis, repair kind, and exact next-action coordinate.',
    observed: { missing_or_invalid_fields: missingFields },
    missing_fact: `Gate finding contract for rule '${ruleId}' is missing or invalid: ${missingFields.join(', ')}`,
    repair_kind: 'missing_contract',
    write_to: `Gate finding contract boundary for rule '${ruleId}'`,
    repair: null,
    detail: `[${configRuleId}] ${missingFields.join(', ')}; masked domain symptom: ${domainDetail}`,
    masked_rule_ids: unique([ruleId, ...(maskedRuleIds || [])]),
    masked_by_rule_id: null,
    checkpoint_context: checkpointContext,
  };
}

export function makeContractFinding(input = {}) {
  const id = input.id;
  const ruleId = input.ruleId ?? input.rule_id ?? id;
  const classification = input.classification ?? 'blocking';
  const surface = input.surface ?? null;
  const expected = input.expected ?? null;
  const observed = input.observed ?? null;
  const missingFact = input.missingFact ?? input.missing_fact ?? null;
  const repair = input.repair ?? null;
  const detail = input.detail ?? null;
  const findingSource = input.findingSource ?? input.finding_source ?? null;
  const blockingBasis = input.blockingBasis ?? input.blocking_basis ?? null;
  const repairKind = input.repairKind ?? input.repair_kind ?? null;
  const writeTo = input.writeTo ?? input.write_to ?? null;
  const maskedRuleIds = input.maskedRuleIds ?? input.masked_rule_ids ?? [];
  const maskedByRuleId = input.maskedByRuleId ?? input.masked_by_rule_id ?? null;
  const checkpointContext = normalizeCheckpointContext(input.checkpointContext ?? input.checkpoint_context ?? null);
  const findingId = compactString(id || ruleId);
  const normalizedRuleId = compactString(ruleId || id);
  if (!findingId || !normalizedRuleId) throw new Error('contract finding requires id/ruleId');
  if (!CLASSIFICATIONS.has(classification)) throw new Error(`unsupported finding classification: ${classification}`);

  const normalizedSource = compactString(findingSource);
  const normalizedBasis = compactString(blockingBasis);
  const normalizedRepairKind = compactString(repairKind);
  const normalizedWriteTo = compactString(writeTo);
  const rootContractDeclared = [findingSource, blockingBasis, repairKind, writeTo]
    .some((value) => value !== null && value !== undefined);

  if (classification === 'blocking' && rootContractDeclared) {
    const missingFields = [];
    if (!FINDING_SOURCES.has(normalizedSource)) missingFields.push('finding_source');
    if (!GateBlockingBasisSchema.safeParse(normalizedBasis).success) missingFields.push('blocking_basis');
    if (!GateRepairKindSchema.safeParse(normalizedRepairKind).success) missingFields.push('repair_kind');
    if (!normalizedWriteTo) missingFields.push('write_to');
    else if (UNRESOLVED_COORDINATE_PATTERN.test(normalizedWriteTo)) missingFields.push('write_to_resolved');
    if (!compactString(missingFact) && (observed === null || observed === undefined)) missingFields.push('observed_or_missing_fact');
    if (missingFields.length > 0) {
      return configurationIntegrityFinding({
        findingId,
        ruleId: normalizedRuleId,
        surface,
        detail,
        missingFields,
        checkpointContext,
        maskedRuleIds,
      });
    }
  }

  return {
    id: findingId,
    rule_id: normalizedRuleId,
    finding_source: normalizedSource,
    classification,
    blocking_basis: normalizedBasis,
    surface: compactString(surface),
    expected: compactFact(expected),
    observed: compactFact(observed),
    missing_fact: compactString(missingFact),
    repair_kind: normalizedRepairKind,
    write_to: normalizedWriteTo,
    repair: compactString(repair),
    detail: compactString(detail) || `[${findingId}] ${compactString(surface) || 'contract check failed'}`,
    masked_rule_ids: unique(Array.isArray(maskedRuleIds) ? maskedRuleIds : []),
    masked_by_rule_id: compactString(maskedByRuleId),
    checkpoint_context: checkpointContext,
  };
}

/**
 * Project one concrete failure of a definition-owned Gate rule into the shared
 * finding shape. The definition remains the owner of blocking basis and repair
 * responsibility; the detecting evaluator supplies only the observed fact.
 */
export function makeDefinitionRuleFinding({
  rule,
  bundlePath = null,
  topic = null,
  slug = null,
  surface = null,
  expected = null,
  observed = null,
  missingFact = null,
  detail = null,
  repair = null,
  maskedRuleIds = [],
  maskedByRuleId = null,
  checkpointContext = null,
} = {}) {
  const ruleId = compactString(rule?.id) || 'unknown_definition_rule';
  const checkedTarget = resolveDefinitionCoordinate(rule?.target, { bundlePath, topic, slug });
  const resolvedSurface = resolveDefinitionCoordinate(surface ?? checkedTarget, {
    bundlePath,
    topic,
    slug,
    checkedTarget,
  });
  const resolvedWriteTo = resolveDefinitionCoordinate(rule?.repair?.write_to, {
    bundlePath,
    topic,
    slug,
    checkedTarget,
  });
  const directMissingFact = compactString(missingFact) || [
    `Gate rule '${ruleId}' failed`,
    resolvedSurface ? `at ${resolvedSurface}` : null,
    expected !== null && expected !== undefined ? `expected ${printableFact(expected)}` : null,
    observed !== null && observed !== undefined ? `observed ${printableFact(observed)}` : null,
  ].filter(Boolean).join('; ');
  const compatibilityRepair = compactString(repair) || (
    resolvedWriteTo && rule?.repair?.kind
      ? `Use the declared ${rule.repair.kind} at ${resolvedWriteTo}, then rerun this Gate.`
      : null
  );

  return makeContractFinding({
    id: ruleId,
    ruleId,
    findingSource: rule?.finding?.source,
    classification: 'blocking',
    blockingBasis: rule?.finding?.blocking_basis,
    surface: resolvedSurface,
    expected,
    observed,
    missingFact: directMissingFact,
    repairKind: rule?.repair?.kind,
    writeTo: resolvedWriteTo,
    repair: compatibilityRepair,
    detail: compactString(detail) || `[${ruleId}] ${directMissingFact}`,
    maskedRuleIds,
    maskedByRuleId,
    checkpointContext,
  });
}

export function projectFindingCompatibility(input) {
  const finding = makeContractFinding(input);
  return {
    finding,
    findings: [finding],
    reason: finding.missing_fact || finding.detail,
    inspect: [finding.detail],
    advice: finding.repair ? [finding.repair] : [],
  };
}

function dedupeFindings(findings) {
  const seen = new Set();
  const result = [];
  for (const finding of findings) {
    const normalized = makeContractFinding(finding);
    const key = [
      normalized.classification,
      normalized.rule_id,
      normalized.id,
      normalized.surface || '',
      normalized.write_to || '',
      normalized.masked_by_rule_id || '',
    ].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result;
}

export function buildContractEvaluation({
  checksRun = 0,
  findings = [],
  maskedRuleIds = [],
  bypassSuspicion = null,
} = {}) {
  const normalizedFindings = dedupeFindings(findings);
  const blocking = normalizedFindings.filter((finding) => (
    finding.classification === 'blocking' && !finding.masked_by_rule_id
  ));
  const failedRuleIds = unique(blocking.map((finding) => finding.rule_id));
  const normalizedMaskedRuleIds = unique([
    ...maskedRuleIds,
    ...normalizedFindings.flatMap((finding) => finding.masked_rule_ids || []),
    ...normalizedFindings
      .filter((finding) => finding.masked_by_rule_id)
      .map((finding) => finding.rule_id),
  ]);

  return {
    passed: failedRuleIds.length === 0,
    checks_run: Number.isFinite(Number(checksRun)) ? Number(checksRun) : 0,
    checks_failed: blocking.length,
    failed_rule_ids: failedRuleIds,
    masked_rule_ids: normalizedMaskedRuleIds,
    findings: normalizedFindings,
    inspect: normalizedFindings.map((finding) => finding.detail),
    advice: unique(normalizedFindings.map((finding) => finding.repair)),
    bypass_suspicion: bypassSuspicion,
  };
}

export function findingsFromCheckResult(result, { defaultId, classification = null } = {}) {
  const resolvedClassification = classification || result?.classification || 'diagnostic-only';
  if (!['advisory', 'diagnostic-only'].includes(resolvedClassification)) {
    throw new Error('findingsFromCheckResult only adapts advisory or diagnostic-only prose; blocking results require structured findings from the detecting checker');
  }
  return (result?.inspect || []).map((detail, index) => {
    const messageId = String(detail).match(/^\[([^\]]+)\]/)?.[1];
    return makeContractFinding({
      id: messageId || `${defaultId}:${index + 1}`,
      ruleId: defaultId,
      classification: resolvedClassification,
      detail,
      repair: result?.advice?.[index] || result?.advice?.[0] || null,
    });
  });
}

export function projectInspectContract({
  wave,
  evaluation,
  additionalFindings = [],
  additionalChecksRun = 0,
  returnMapClassification = 'diagnostic-only',
  checkpointCommand = null,
} = {}) {
  const combined = buildContractEvaluation({
    checksRun: Number(evaluation?.checks_run || 0) + Number(additionalChecksRun || 0),
      findings: [...(evaluation?.findings || []), ...additionalFindings],
    maskedRuleIds: evaluation?.masked_rule_ids || [],
    bypassSuspicion: evaluation?.bypass_suspicion || null,
  });
  const byClassification = {
    blocking: unique(combined.findings.filter((finding) => finding.classification === 'blocking').map((finding) => finding.id)),
    advisory: unique(combined.findings.filter((finding) => finding.classification === 'advisory').map((finding) => finding.id)),
    diagnostic_only: unique(combined.findings.filter((finding) => finding.classification === 'diagnostic-only').map((finding) => finding.id)),
  };
  const hints = [];
  const seenHints = new Set();
  if (!combined.passed) {
    for (const finding of combined.findings) {
      if (finding.classification !== 'blocking' || finding.masked_by_rule_id) continue;
      const missingFact = compactString(finding.missing_fact) || (
        finding.observed !== null && finding.observed !== undefined
          ? `${compactString(finding.surface) || finding.rule_id}: expected ${printableFact(finding.expected)}, observed ${printableFact(finding.observed)}`
          : compactString(finding.detail)
      );
      if (!finding.repair_kind || !finding.write_to || !missingFact || !compactString(checkpointCommand)) continue;
      const hint = {
        rule_id: finding.rule_id,
        repair_kind: finding.repair_kind,
        missing_fact: missingFact,
        write_to: finding.write_to,
        rerun: compactString(checkpointCommand),
      };
      const key = JSON.stringify(hint);
      if (seenHints.has(key)) continue;
      seenHints.add(key);
      hints.push(hint);
    }
  }

  return {
    check: {
      passed: combined.passed,
      wave,
      checks_run: combined.checks_run,
      checks_failed: combined.checks_failed,
      return_map_classification: returnMapClassification,
      failed_rule_ids: combined.failed_rule_ids,
      masked_rule_ids: combined.masked_rule_ids,
      finding_classification: byClassification,
    },
    inspect: combined.inspect,
    advice: combined.advice,
    hints,
  };
}

export function emitInspectResult(result, exitCode) {
  const payload = `${JSON.stringify(result, null, 2)}\n`;
  let outputFd = null;
  try {
    outputFd = openSync('/dev/stdout', 'w');
    writeFileSync(outputFd, payload);
  } catch {
    process.stdout.write(payload);
  } finally {
    if (outputFd !== null) closeSync(outputFd);
  }
  process.exit(exitCode);
}
