#!/usr/bin/env node
// check-gate-instantiation-complete.mjs — evaluates gate-instantiation-complete rules
// @impl GSK-001, GSK-002, GSK-004, PRG-004, PRG-007
// Usage: node check-gate-instantiation-complete.mjs --bundle <path> --current-node <fileRef> [--transitions <path>]

import { existsSync, statSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
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
import { checkCurrentEntryContract } from '../../engine/helpers/current-entry-contract.mjs';

const args = parseGateCliArgs();
if (args.error) { emitGateResult(args.error, { bundlePath: args.bundle }); }

// Load gate definition
const { definition, error: defError } = tryLoadGateDefinition('instantiation-complete', args.currentNode || null);
if (defError) { emitGateResult(defError, { bundlePath: args.bundle }); }

// Validate node/gate binding
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
let checksRun = 0;
const currentEntry = checkCurrentEntryContract(bundlePath);

function targetFile(target) {
  return typeof target === 'string' ? target.split('#/')[0] : null;
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

for (const rule of definition.rules) {
  if (rule.check === 'placeholder') continue;
  checksRun += 1;

  let failure = null;
  let findingOverride = null;

  try {
    if (rule.check === 'file_exists') {
      const targetPath = join(bundlePath, rule.target);
      const currentEntryFile = ['BUNDLE_ENTRY.md', 'BUNDLE_MAP.md'].includes(rule.target);
      const exists = currentEntryFile
        ? !currentEntry.missing_files.includes(rule.target)
        : existsSync(targetPath);
      if (!exists) {
        failure = {
          surface: rule.target,
          expected: 'Required file exists.',
          observed: { exists: false },
          missingFact: `Required bundle file '${rule.target}' is absent.`,
          detail: `Missing file: ${rule.target}`,
        };
        prerequisiteRoots.set(rule.target, rule.id);
      }
    } else if (rule.check === 'dir_exists') {
      const targetPath = join(bundlePath, rule.target);
      const exists = existsSync(targetPath);
      const isDirectory = exists && statSync(targetPath).isDirectory();
      if (!isDirectory) {
        failure = {
          surface: rule.target === '.' ? bundlePath : rule.target,
          expected: 'Required directory exists and is a directory.',
          observed: { exists, is_directory: isDirectory },
          missingFact: `Required bundle directory '${rule.target}' is absent or is not a directory.`,
          detail: `Missing directory: ${rule.target}`,
        };
        prerequisiteRoots.set(rule.target, rule.id);
      }
    } else if (rule.check === 'pattern_match') {
      const bundleName = basename(bundlePath);
      const pattern = new RegExp(rule.pattern);
      if (!pattern.test(bundleName)) {
        failure = {
          surface: bundlePath,
          expected: `Bundle basename matches ${rule.pattern}.`,
          observed: bundleName,
          missingFact: `Bundle basename '${bundleName}' does not match the accepted instantiation pattern ${rule.pattern}.`,
          detail: `Bundle name "${bundleName}" does not match pattern ${rule.pattern}`,
        };
      }
    } else if (rule.check === 'status_value') {
      // rule.target is "rb_status.json#/field/path"
      const [file, jsonPath] = rule.target.split('#/');
      const statusPath = join(bundlePath, file);
      if (!existsSync(statusPath)) {
        failure = {
          surface: rule.target,
          expected: rule.expected,
          observed: { file_exists: false },
          missingFact: `Cannot verify ${rule.target} because '${file}' is absent.`,
          detail: `Missing file for status check: ${file}`,
          maskedByRuleId: prerequisiteRoots.get(file) || null,
        };
      } else {
        const status = JSON.parse(readFileSync(statusPath, 'utf-8'));
        const value = jsonPath.split('/').reduce((obj, key) => obj?.[key], status);
        if (value !== rule.expected) {
          failure = {
            surface: rule.target,
            expected: rule.expected,
            observed: value,
            missingFact: `${rule.target} must equal '${rule.expected}', but the observed value is '${value}'.`,
            detail: `${rule.target}: expected "${rule.expected}", got "${value}"`,
          };
        }
      }
    } else {
      const detail = `Unknown check type: ${rule.check} — must fail (check type not implemented)`;
      findingOverride = configurationFinding(rule, detail);
    }
  } catch (err) {
    const safeMsg = (err.message || String(err)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
    failure = {
      surface: rule.target || `Gate checker dispatch for ${definition.gate}/${rule.id}`,
      expected: `Rule '${rule.id}' evaluates its direct authority without parser/runtime error.`,
      observed: safeMsg,
      missingFact: `Rule '${rule.id}' could not evaluate its direct authority: ${safeMsg}`,
      detail: `Error evaluating rule ${rule.id}: ${safeMsg}`,
      maskedByRuleId: prerequisiteRoots.get(targetFile(rule.target)) || null,
    };
  }

  if (findingOverride) findings.push(findingOverride);
  else if (failure) findings.push(makeDefinitionRuleFinding({
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

const ruleEvaluation = buildContractEvaluation({ checksRun, findings });
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
  const failureEvaluation = buildContractEvaluation({
    findings: [...(error.findings || []), ...(failedRouting.findings || [])],
  });
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
