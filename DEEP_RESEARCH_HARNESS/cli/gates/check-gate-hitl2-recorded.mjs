#!/usr/bin/env node
// check-gate-hitl2-recorded.mjs — evaluates gate-hitl2-recorded rules
// @impl GSK-001, GSK-002, GSK-004, GSK-008, CDG-003
// Usage: node check-gate-hitl2-recorded.mjs --bundle <path> --current-node <fileRef> [--transitions <path>]

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
  stripMdFrontmatter,
} from '../../engine/helpers/gate-helpers.mjs';
import {
  buildContractEvaluation,
  makeContractFinding,
  makeDefinitionRuleFinding,
} from '../../engine/helpers/wave-contract-findings.mjs';
import { evaluateCompositionProceed } from '../../engine/helpers/composition-handoff.mjs';

const args = parseGateCliArgs();
if (args.error) { emitGateResult(args.error, { bundlePath: args.bundle }); }

const { definition, error: defError } = tryLoadGateDefinition('hitl2-recorded', args.currentNode || null);
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
const prerequisiteRoots = new Map();
const maskedRuleIds = new Set();
let checksRun = 0;

function resolveObjectPath(object, pathText) {
  return pathText.split('/').reduce((value, key) => value?.[key], object);
}

function exactTarget(target) {
  if (typeof target !== 'string') return target;
  const [file, jsonPath] = target.split('#/');
  const absolute = resolveFsPath(bundlePath, file);
  return jsonPath ? `${absolute}#/${jsonPath}` : absolute;
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

function profileParseFinding(rule, failure) {
  const surface = exactTarget(rule.target);
  return makeContractFinding({
    id: rule.id,
    ruleId: rule.id,
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: failure.fileMissing ? 'required_structure' : 'authority_integrity',
    surface,
    expected: failure.expected,
    observed: failure.observed,
    missingFact: failure.missingFact,
    repairKind: 'missing_contract',
    writeTo: `HITL2 profile YAML owner contract boundary for ${surface}`,
    repair: 'Restore the recorded HITL2 profile through its owning decision path; do not reconstruct decision semantics from Gate prose.',
    detail: `[${rule.id}] ${failure.detail}`,
  });
}

for (const rule of definition.rules) {
  if (rule.check === 'placeholder') continue;
  checksRun += 1;

  let failure = null;
  let findingOverride = null;

  try {
    if (rule.check === 'file_exists') {
      const targetPath = join(bundlePath, rule.target);
      if (!existsSync(targetPath)) {
        failure = {
          surface: rule.target,
          expected: 'Required HITL2 decision brief exists.',
          observed: { exists: false },
          missingFact: `Required HITL2 decision brief '${rule.target}' is absent.`,
          detail: `Missing file: ${rule.target}`,
        };
        prerequisiteRoots.set(rule.target, rule.id);
      }
    } else if (rule.check === 'yaml_parse') {
      if (rule.target !== 'rb_profile.yaml') {
        findingOverride = configurationFinding(rule, `Unsupported yaml_parse target: ${rule.target}`, rule.target);
      } else {
        const profile = readProfile();
        if (!profile.value) {
          failure = {
            expected: 'rb_profile.yaml exists and parses as YAML.',
            observed: { file_exists: profile.exists, parsed: false, error: profile.error },
            missingFact: `rb_profile.yaml is ${profile.exists ? 'unparseable' : 'absent'}${profile.error ? `: ${profile.error}` : '.'}`,
            detail: profile.exists ? `YAML parse error in rb_profile.yaml: ${profile.error}` : 'rb_profile.yaml not found',
            fileMissing: !profile.exists,
          };
          prerequisiteRoots.set(rule.target, rule.id);
        }
      }
    } else if (rule.check === 'field_non_empty') {
      const target = rule.target;
      if (target.endsWith('.md') || target.startsWith('artifacts/')) {
        const filePath = join(bundlePath, target);
        if (!existsSync(filePath)) {
          failure = {
            surface: target,
            expected: 'Non-empty Markdown body after frontmatter.',
            observed: { file_exists: false },
            missingFact: `Cannot verify '${target}' content because the file is absent.`,
            detail: `File not found: ${target}`,
            maskedByRuleId: prerequisiteRoots.get(target) || null,
          };
        } else {
          const body = stripMdFrontmatter(readFileSync(filePath, 'utf-8'));
          if (body.length === 0) {
            failure = {
              surface: target,
              expected: 'Non-empty Markdown body after frontmatter.',
              observed: { body_length: 0 },
              missingFact: `${target} has no decision-brief content after frontmatter.`,
              detail: `${target} is empty (no content after frontmatter)`,
            };
          }
        }
      } else {
        const [file, jsonPath] = target.split('#/');
        const profile = readProfile();
        const parentRoot = prerequisiteRoots.get(file) || null;
        if (!profile.value) {
          failure = {
            surface: target,
            expected: 'Non-empty recorded HITL2 decision value.',
            observed: { parsed_profile: false, error: profile.error },
            missingFact: `Cannot verify ${target} because rb_profile.yaml is missing or unparseable.`,
            detail: `Cannot check ${target}: rb_profile.yaml not found or unparseable`,
            maskedByRuleId: parentRoot,
          };
        } else {
          const value = resolveObjectPath(profile.value, jsonPath);
          const empty = value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
          if (empty) {
            failure = {
              surface: target,
              expected: 'Non-empty recorded HITL2 decision value.',
              observed: value ?? null,
              missingFact: `${target} is empty or missing.`,
              detail: `${target} is empty or missing`,
              maskedByRuleId: parentRoot,
            };
            if (rule.id === 'user_decision_non_empty') maskedRuleIds.add('user_decision_valid_enum');
          }
        }
      }
    } else if (rule.check === 'field_value') {
      const [file, jsonPath] = rule.target.split('#/');
      const profile = readProfile();
      const parentRoot = prerequisiteRoots.get(file) || null;
      if (!profile.value) {
        failure = {
          surface: rule.target,
          expected: rule.value,
          observed: { parsed_profile: false, error: profile.error },
          missingFact: `Cannot verify ${rule.target} because rb_profile.yaml is missing or unparseable.`,
          detail: 'rb_profile.yaml not found or unparseable',
          maskedByRuleId: parentRoot,
        };
      } else {
        const value = resolveObjectPath(profile.value, jsonPath);
        if (rule.operator === 'equal' && value !== rule.value) {
          failure = {
            surface: rule.target,
            expected: rule.value,
            observed: value,
            missingFact: `${rule.target} must equal '${rule.value}', but the observed value is '${value}'.`,
            detail: `${rule.target}: expected "${rule.value}", got "${JSON.stringify(value)}"`,
          };
        } else if (rule.operator === 'not_equal' && value === rule.value) {
          failure = {
            surface: rule.target,
            expected: `Value differs from '${rule.value}'.`,
            observed: value,
            missingFact: `${rule.target} is still '${rule.value}'.`,
            detail: `${rule.target} is still "${rule.value}" (should not be)`,
          };
        } else if (rule.operator === 'in' && !rule.value.includes(value)) {
          failure = {
            surface: rule.target,
            expected: rule.value,
            observed: value,
            missingFact: `${rule.target} must be one of [${rule.value.join(', ')}], but the observed value is '${value}'.`,
            detail: `${rule.target}: value "${value}" is not in accepted set: [${rule.value.join(', ')}]`,
            maskedByRuleId: maskedRuleIds.has(rule.id) ? 'user_decision_non_empty' : parentRoot,
          };
        } else if (!['equal', 'not_equal', 'in'].includes(rule.operator)) {
          findingOverride = configurationFinding(rule, `Unsupported field_value operator: ${rule.operator}`, rule.operator);
        }
      }
    } else {
      findingOverride = configurationFinding(rule, `Unknown check type: ${rule.check} — must fail (check type not implemented)`);
    }
  } catch (error) {
    const safeMessage = (error.message || String(error)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
    failure = {
      surface: rule.target || `Gate checker dispatch for ${definition.gate}/${rule.id}`,
      expected: `Rule '${rule.id}' evaluates its direct authority without parser/runtime error.`,
      observed: safeMessage,
      missingFact: `Rule '${rule.id}' could not evaluate its direct authority: ${safeMessage}`,
      detail: `Error evaluating rule ${rule.id}: ${safeMessage}`,
      maskedByRuleId: prerequisiteRoots.get(typeof rule.target === 'string' ? rule.target.split('#/')[0] : null) || null,
    };
  }

  if (findingOverride) findings.push(findingOverride);
  else if (failure) findings.push(rule.id === 'profile_yaml_parseable'
    ? profileParseFinding(rule, failure)
    : makeDefinitionRuleFinding({
        rule,
        bundlePath,
        surface: failure.surface,
        expected: failure.expected,
        observed: failure.observed,
        missingFact: failure.missingFact,
        detail: `[${rule.id}] ${failure.detail}`,
        maskedByRuleId: failure.maskedByRuleId || null,
        maskedRuleIds: rule.id === 'decision_brief_exists' ? ['decision_brief_non_empty']
          : (rule.id === 'user_decision_non_empty' ? ['user_decision_valid_enum'] : []),
      }));
}

const ruleEvaluation = buildContractEvaluation({
  checksRun,
  findings,
  maskedRuleIds: [...maskedRuleIds],
});

let selectedDecision = null;
if (ruleEvaluation.passed) {
  selectedDecision = resolveObjectPath(readProfile().value || {}, 'human_decision_checkpoints/hitl2/user_decision');
}

let compositionProceed = null;
const compositionFindings = [];
if (ruleEvaluation.passed && selectedDecision === 'proceed_to_readiness') {
  compositionProceed = evaluateCompositionProceed(readProfile().value);
  if (!compositionProceed.ok) {
    const path = compositionProceed.path?.join('.') || 'human_decision_checkpoints.hitl2.composition_handoff';
    compositionFindings.push(makeContractFinding({
      id: 'composition_handoff_proceed_contract',
      ruleId: 'composition_handoff_proceed_contract',
      findingSource: 'checker',
      classification: 'blocking',
      blockingBasis: 'recorded_human_decision',
      surface: `rb_profile.yaml#/${path.replaceAll('.', '/')}`,
      expected: 'A complete current-round composition handoff for the selected delivery view.',
      observed: compositionProceed.reason_code,
      missingFact: `HITL2 proceed cannot be witnessed because ${compositionProceed.reason_code}.`,
      repairKind: 'user_decision',
      writeTo: 'phases/phase-hitl2.md',
      repair: 'Resolve the named delivery intent fact at HITL2, write the accepted profile owner, then rerun the same Gate.',
      detail: `[composition_handoff_proceed_contract] ${compositionProceed.reason_code}`,
    }));
  }
}

const compositionEvaluation = buildContractEvaluation({
  checksRun: checksRun + (selectedDecision === 'proceed_to_readiness' ? 1 : 0),
  findings: [...ruleEvaluation.findings, ...compositionFindings],
  maskedRuleIds: ruleEvaluation.masked_rule_ids,
});

let outcome = 'failed';
let deterministicHandoff = false;
if (compositionEvaluation.passed && selectedDecision === 'proceed_to_readiness' && compositionProceed?.ok) {
  outcome = 'passed';
  deterministicHandoff = true;
} else if (compositionEvaluation.passed && selectedDecision === 'rerun') {
  outcome = 'rerun';
  deterministicHandoff = true;
}

const routing = resolveRouting(args.transitions, args.currentNode, outcome);
const routingFailed = ['invalid_input', 'config_error'].includes(routing.kind);
const evaluation = buildContractEvaluation({
  checksRun: compositionEvaluation.checks_run,
  findings: [...compositionEvaluation.findings, ...(routing.findings || [])],
  maskedRuleIds: compositionEvaluation.masked_rule_ids,
});

const result = buildGateResult({
  passed: compositionEvaluation.passed && !routingFailed,
  gate: definition.gate,
  currentNodeRef: args.currentNode,
  routing,
  inspect: [...compositionEvaluation.inspect, ...(routing.inspect || [])],
  advice: [...compositionEvaluation.advice, ...(routing.advice || [])],
  findings: evaluation.findings,
  bundlePath,
  extraCheck: {
    failed_rule_ids: evaluation.failed_rule_ids,
    masked_rule_ids: evaluation.masked_rule_ids,
    hitl2_user_decision: selectedDecision,
    deterministic_handoff: deterministicHandoff,
    composition_handoff: compositionProceed?.ok === true,
  },
  attemptNumber: args.attempt ?? 0,
});

try {
  writeGateAttempt(bundlePath, result, {
    strictTrace: result.check?.passed === true && result.check?.next != null,
    ...(compositionProceed?.ok === true && result.check?.passed === true && result.check?.next === 'phases/phase-readiness.md'
      ? { compositionHandoffReceipt: compositionProceed.receipt }
      : {}),
  });
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
      hitl2_user_decision: selectedDecision,
      deterministic_handoff: false,
      trace_durable: false,
      gate_attempt_write_failed: true,
    },
    attemptNumber: args.attempt ?? 0,
  });
  try { writeGateAttempt(bundlePath, failedResult); } catch { /* secondary diagnostic only */ }
  emitGateResult(failedResult);
}

emitGateResult(result);
