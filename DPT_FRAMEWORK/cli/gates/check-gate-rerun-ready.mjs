#!/usr/bin/env node
// check-gate-rerun-ready.mjs — evaluates gate-rerun-ready rules
// @impl GSK-002, GSK-004, GSK-008, REI-003
// Usage: node check-gate-rerun-ready.mjs --bundle <path> --current-node <fileRef> [--transitions <path>]

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve as resolveFsPath } from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  parseGateCliArgs,
  tryLoadGateDefinition,
  checkNodeGateBinding,
  resolveRouting,
  buildGateResult,
  emitGateResult,
  writeGateAttempt,
  checkPhaseHandoffPreflight,
} from '../../engine/helpers/gate-helpers.mjs';
import {
  buildContractEvaluation,
  makeContractFinding,
  makeDefinitionRuleFinding,
} from '../../engine/helpers/wave-contract-findings.mjs';

const args = parseGateCliArgs();
if (args.error) { emitGateResult(args.error, { bundlePath: args.bundle }); }

const { definition, error: defError } = tryLoadGateDefinition('rerun-ready', args.currentNode || null);
if (defError) { emitGateResult(defError, { bundlePath: args.bundle }); }

const binding = checkNodeGateBinding(args.currentNode, definition.gate);
if (!binding.ok) {
  const result = buildGateResult({
    passed: false,
    gate: definition.gate,
    currentNodeRef: args.currentNode,
    routing: { kind: 'invalid_input', next: null, detail: binding.reason },
    inspect: binding.inspect,
    advice: binding.advice,
    findings: binding.findings,
    bundlePath: args.bundle,
    attemptNumber: args.attempt ?? 0,
  });
  emitGateResult(result, { bundlePath: args.bundle });
}

const handoffPreflight = checkPhaseHandoffPreflight(args.bundle, args.currentNode);
if (!handoffPreflight.ok) {
  const routing = resolveRouting(args.transitions, args.currentNode, 'failed');
  const result = buildGateResult({
    passed: false,
    gate: definition.gate,
    currentNodeRef: args.currentNode,
    routing,
    inspect: handoffPreflight.inspect || [handoffPreflight.reason || 'Lifecycle handoff preflight failed'],
    advice: handoffPreflight.advice || ['Follow the handoff remedy and rerun this gate.'],
    findings: handoffPreflight.findings || [],
    bundlePath: args.bundle,
    extraCheck: { handoff_preflight: false },
    attemptNumber: args.attempt ?? 0,
  });
  writeGateAttempt(args.bundle, result, { strictTrace: result.check?.passed === true && result.check?.next != null });
  emitGateResult(result);
}

const bundlePath = args.bundle;
const findings = [];
const maskedRuleIds = new Set();
let checksRun = 1;

function resolveObjectPath(object, pathText) {
  return pathText.split('/').reduce((value, key) => value?.[key], object);
}

function configurationFinding(rule, detail, observed = null) {
  return makeContractFinding({
    id: rule.id,
    ruleId: rule.id,
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: 'configuration_integrity',
    surface: `Gate checker dispatch for ${definition.gate}/${rule.id}`,
    expected: `Implemented deterministic checker '${rule.check}'.`,
    observed: observed ?? rule.check,
    missingFact: detail,
    repairKind: 'missing_contract',
    writeTo: `Gate checker implementation boundary for ${definition.gate}/${rule.id}`,
    repair: 'Repair the Gate checker contract before rerunning this checkpoint.',
    detail: `[${rule.id}] ${detail}`,
  });
}

let profileRead = null;
function readProfile() {
  if (profileRead) return profileRead;
  const profilePath = join(bundlePath, 'rb_profile.yaml');
  if (!existsSync(profilePath)) {
    profileRead = { value: null, exists: false, error: 'file absent' };
    return profileRead;
  }
  try {
    profileRead = { value: parseYaml(readFileSync(profilePath, 'utf-8')), exists: true, error: null };
  } catch (error) {
    profileRead = { value: null, exists: true, error: error.message || String(error) };
  }
  return profileRead;
}

const profile = readProfile();
let profileParentRuleId = null;
if (!profile.value) {
  profileParentRuleId = 'rerun_profile_prerequisite';
  findings.push(makeContractFinding({
    id: profileParentRuleId,
    ruleId: profileParentRuleId,
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: profile.exists ? 'authority_integrity' : 'required_structure',
    surface: resolveFsPath(bundlePath, 'rb_profile.yaml'),
    expected: 'The accepted HITL2 rerun decision profile exists and parses as YAML.',
    observed: { file_exists: profile.exists, parsed: false, error: profile.error },
    missingFact: `Rerun cannot read its accepted HITL2 decision profile because rb_profile.yaml is ${profile.exists ? 'unparseable' : 'absent'}${profile.error ? `: ${profile.error}` : '.'}`,
    repairKind: 'missing_contract',
    writeTo: 'Accepted HITL2 profile recovery boundary for rerun',
    repair: 'Restore the accepted HITL2 decision profile through its owning lifecycle path; do not reconstruct rationale or rerun count by hand.',
  }));
  maskedRuleIds.add('rerun_rationale_present');
  maskedRuleIds.add('rerun_count_valid');
}

function rerunCountFinding(rule, failure) {
  const limitReached = failure.kind === 'limit_reached';
  return makeContractFinding({
    id: rule.id,
    ruleId: rule.id,
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: limitReached ? 'recorded_human_decision' : 'authority_integrity',
    surface: resolveFsPath(bundlePath, 'rb_profile.yaml') + '#/human_decision_checkpoints/hitl2/rerun_count',
    expected: failure.expected,
    observed: failure.observed,
    missingFact: failure.missingFact,
    repairKind: limitReached ? 'user_decision' : 'missing_contract',
    writeTo: limitReached
      ? 'Rerun limit decision boundary: accept current results or start a new Deep Research run'
      : 'HITL2 rerun-count authority contract boundary',
    repair: limitReached
      ? 'The accepted rerun limit has been reached; ask only whether to accept current results or start a new run.'
      : 'Restore a valid recorded rerun count through the owning HITL2/profile contract.',
    detail: `[${rule.id}] ${failure.detail}`,
    maskedByRuleId: failure.maskedByRuleId || null,
  });
}

function structureFinding(rule, failure) {
  return makeContractFinding({
    id: rule.id,
    ruleId: rule.id,
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: 'required_structure',
    surface: failure.missing.map((target) => resolveFsPath(bundlePath, target)).join('; '),
    expected: { required_directories: rule.targets },
    observed: { missing_directories: failure.missing },
    missingFact: `Rerun bundle structure is missing required director${failure.missing.length === 1 ? 'y' : 'ies'}: ${failure.missing.join(', ')}.`,
    repairKind: 'missing_contract',
    writeTo: `Bundle-integrity recovery boundary for ${resolveFsPath(bundlePath)}`,
    repair: 'Restore the missing bundle structure and its owned contents through a sanctioned bundle/lifecycle path; empty directory creation alone is not accepted recovery.',
    detail: `[${rule.id}] ${failure.detail}`,
  });
}

for (const rule of definition.rules) {
  if (rule.check === 'placeholder') continue;
  checksRun += 1;

  let failure = null;
  let findingOverride = null;

  try {
    if (rule.check === 'field_non_empty') {
      const [, jsonPath] = rule.target.split('#/');
      if (!profile.value) {
        continue;
      }
      const value = resolveObjectPath(profile.value, jsonPath);
      const empty = value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
      if (empty) {
        failure = {
          surface: rule.target,
          expected: 'Non-empty rerun rationale recorded from HITL2.',
          observed: value ?? null,
          missingFact: `${rule.target} is empty or missing, so the requested rerun semantics are not recorded.`,
          detail: `${rule.target} is empty or missing`,
          maskedByRuleId: profileParentRuleId,
        };
      }
    } else if (rule.check === 'rerun_count_limit') {
      if (!profile.value) continue;
      const [, jsonPath] = rule.target.split('#/');
      const value = resolveObjectPath(profile.value, jsonPath);
      const count = value ?? 0;
      if (typeof count === 'number' && count >= rule.value) {
        failure = {
          expected: { operator: 'less_than', value: rule.value },
          observed: count,
          missingFact: `${rule.target} is ${count}, but the accepted rerun limit requires a value below ${rule.value}.`,
          detail: `${rule.target}: rerun_count is ${count}, must be < ${rule.value}`,
          kind: 'limit_reached',
        };
      }
    } else if (rule.check === 'structural') {
      const missing = rule.targets.filter((target) => !existsSync(join(bundlePath, target)));
      if (missing.length > 0) {
        failure = {
          missing,
          detail: missing.map((target) => `Missing directory: ${target}/`).join('; '),
        };
      }
    } else {
      findingOverride = configurationFinding(rule, `Unknown check type: ${rule.check} — must fail (check type not implemented)`);
    }
  } catch (error) {
    const safeMessage = (error.message || String(error)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
    findingOverride = configurationFinding(rule, `Rule '${rule.id}' could not evaluate its direct authority: ${safeMessage}`, safeMessage);
  }

  if (findingOverride) findings.push(findingOverride);
  else if (failure) {
    if (rule.id === 'rerun_count_valid') findings.push(rerunCountFinding(rule, failure));
    else if (rule.id === 'bundle_structure_valid') findings.push(structureFinding(rule, failure));
    else findings.push(makeDefinitionRuleFinding({
      rule,
      bundlePath,
      surface: failure.surface,
      expected: failure.expected,
      observed: failure.observed,
      missingFact: failure.missingFact,
      detail: `[${rule.id}] ${failure.detail}`,
      maskedByRuleId: failure.maskedByRuleId || null,
    }));
  }
}

const ruleEvaluation = buildContractEvaluation({
  checksRun,
  findings,
  maskedRuleIds: [...maskedRuleIds],
});
const outcome = ruleEvaluation.passed ? 'passed' : 'failed';
const routing = resolveRouting(args.transitions, args.currentNode, outcome);
const routingFailed = ['invalid_input', 'config_error'].includes(routing.kind);
const evaluation = buildContractEvaluation({
  checksRun,
  findings: [...ruleEvaluation.findings, ...(routing.findings || [])],
  maskedRuleIds: ruleEvaluation.masked_rule_ids,
});

const result = buildGateResult({
  passed: ruleEvaluation.passed && !routingFailed,
  gate: definition.gate,
  currentNodeRef: args.currentNode,
  routing,
  inspect: [...ruleEvaluation.inspect, ...(routing.inspect || [])],
  advice: [...ruleEvaluation.advice, ...(routing.advice || [])],
  findings: evaluation.findings,
  bundlePath,
  extraCheck: {
    failed_rule_ids: evaluation.failed_rule_ids,
    masked_rule_ids: evaluation.masked_rule_ids,
  },
  attemptNumber: args.attempt ?? 0,
});

try {
  writeGateAttempt(bundlePath, result, { strictTrace: result.check?.passed === true && result.check?.next != null });
} catch (error) {
  const failedRouting = resolveRouting(args.transitions, args.currentNode, 'failed');
  const failureEvaluation = buildContractEvaluation({ findings: [...(error.findings || []), ...(failedRouting.findings || [])] });
  const failedResult = buildGateResult({
    passed: false,
    gate: definition.gate,
    currentNodeRef: args.currentNode,
    routing: failedRouting,
    inspect: [...(error.inspect || [error.message || String(error)]), ...(failedRouting.inspect || [])],
    advice: [...(error.advice || []), ...(failedRouting.advice || [])],
    findings: failureEvaluation.findings,
    bundlePath,
    extraCheck: {
      failed_rule_ids: failureEvaluation.failed_rule_ids,
      masked_rule_ids: failureEvaluation.masked_rule_ids,
      trace_durable: false,
      gate_attempt_write_failed: true,
    },
    attemptNumber: args.attempt ?? 0,
  });
  try { writeGateAttempt(bundlePath, failedResult); } catch { /* secondary diagnostic only */ }
  emitGateResult(failedResult);
}

emitGateResult(result);
