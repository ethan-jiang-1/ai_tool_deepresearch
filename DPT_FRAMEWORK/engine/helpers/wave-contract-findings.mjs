// @impl IOC-005, CHI-001, RWG-018

const CLASSIFICATIONS = new Set(['blocking', 'advisory', 'diagnostic-only']);

function compactString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function makeContractFinding({
  id,
  ruleId = id,
  classification = 'blocking',
  surface = null,
  expected = null,
  repair = null,
  detail = null,
} = {}) {
  const findingId = compactString(id || ruleId);
  const normalizedRuleId = compactString(ruleId || id);
  if (!findingId || !normalizedRuleId) throw new Error('contract finding requires id/ruleId');
  if (!CLASSIFICATIONS.has(classification)) throw new Error(`unsupported finding classification: ${classification}`);

  return {
    id: findingId,
    rule_id: normalizedRuleId,
    classification,
    surface: compactString(surface),
    expected: compactString(expected),
    repair: compactString(repair),
    detail: compactString(detail) || `[${findingId}] ${compactString(surface) || 'contract check failed'}`,
  };
}

function dedupeFindings(findings) {
  const seen = new Set();
  const result = [];
  for (const finding of findings) {
    const normalized = makeContractFinding(finding);
    const key = [normalized.classification, normalized.id, normalized.surface || ''].join('|');
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
  const blocking = normalizedFindings.filter((finding) => finding.classification === 'blocking');
  const failedRuleIds = unique(blocking.map((finding) => finding.id));

  return {
    passed: failedRuleIds.length === 0,
    checks_run: Number.isFinite(Number(checksRun)) ? Number(checksRun) : 0,
    checks_failed: blocking.length,
    failed_rule_ids: failedRuleIds,
    masked_rule_ids: unique(maskedRuleIds),
    findings: normalizedFindings,
    inspect: normalizedFindings.map((finding) => finding.detail),
    advice: unique(normalizedFindings.map((finding) => finding.repair)),
    bypass_suspicion: bypassSuspicion,
  };
}

export function findingsFromCheckResult(result, { defaultId, classification = null } = {}) {
  const resolvedClassification = classification || result?.classification || (result?.passed === false ? 'blocking' : 'diagnostic-only');
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

  return {
    check: {
      passed: combined.passed,
      wave,
      checks_run: combined.checks_run,
      checks_failed: combined.checks_failed,
      return_map_classification: returnMapClassification,
      failed_rule_ids: combined.failed_rule_ids,
      finding_classification: byClassification,
    },
    inspect: combined.inspect,
    advice: combined.advice,
  };
}
