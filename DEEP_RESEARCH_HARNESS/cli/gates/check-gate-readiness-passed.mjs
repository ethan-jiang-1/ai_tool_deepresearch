#!/usr/bin/env node
// check-gate-readiness-passed.mjs — evaluates gate-readiness-passed rules
// @impl GSK-001, GSK-002, GSK-004, GSK-008, CDG-004
// Usage: node check-gate-readiness-passed.mjs --bundle <path> --current-node <fileRef> [--transitions <path>]

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve as resolveFsPath } from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  parseGateCliArgs,
  tryLoadGateDefinition,
  loadManifest,
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
import {
  evaluateCompositionHandoffConsistency,
  selectCompositionHandoffWitness,
} from '../../engine/helpers/composition-handoff.mjs';

const args = parseGateCliArgs();
if (args.error) { emitGateResult(args.error, { bundlePath: args.bundle }); }

const { definition, error: defError } = tryLoadGateDefinition('readiness-passed', args.currentNode || null);
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
let checksRun = 0;

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

let traceRead = null;
function readTraceJsonl() {
  if (traceRead) return traceRead;
  const tracePath = join(bundlePath, 'rb_trace.jsonl');
  if (!existsSync(tracePath)) {
    traceRead = { exists: false, events: [], badLines: [], error: 'file absent' };
    return traceRead;
  }
  const raw = readFileSync(tracePath, 'utf-8');
  const events = [];
  const badLines = [];
  raw.split('\n').forEach((line, index) => {
    if (!line.trim()) return;
    try { events.push(JSON.parse(line)); }
    catch { badLines.push(index + 1); }
  });
  traceRead = { exists: true, events, badLines, error: null };
  return traceRead;
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
  const surface = resolveFsPath(bundlePath, rule.target);
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
    repairKind: failure.fileMissing ? 'missing_contract' : 'agent_action',
    writeTo: failure.fileMissing ? `Readiness profile owner contract boundary for ${surface}` : surface,
    repair: failure.fileMissing
      ? 'Restore the recorded profile through its owning lifecycle path before rerunning readiness.'
      : 'Repair only the YAML presentation while preserving the recorded profile semantics, then rerun readiness.',
    detail: `[${rule.id}] ${failure.detail}`,
  });
}

function traceParseFinding(rule, failure) {
  const surface = resolveFsPath(bundlePath, rule.target);
  return makeContractFinding({
    id: rule.id,
    ruleId: rule.id,
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: 'authority_integrity',
    surface,
    expected: failure.expected,
    observed: failure.observed,
    missingFact: failure.missingFact,
    repairKind: 'missing_contract',
    writeTo: `Engine trace authority recovery boundary for ${surface}`,
    repair: 'Restore trace authority through its existing Engine/checkpoint owner; do not remove or rewrite trace lines by hand.',
    detail: `[${rule.id}] ${failure.detail}`,
  });
}

function priorGatesFinding(rule, failure) {
  return makeContractFinding({
    id: rule.id,
    ruleId: rule.id,
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: failure.configuration ? 'configuration_integrity' : 'authority_integrity',
    surface: failure.surface,
    expected: failure.expected,
    observed: failure.observed,
    missingFact: failure.missingFact,
    repairKind: 'missing_contract',
    writeTo: failure.configuration
      ? `Workflow topology contract boundary for ${args.currentNode}`
      : `Prior Gate-attempt lineage boundary for ${failure.missing.join(', ')}`,
    repair: failure.configuration
      ? 'Repair the workflow topology/manifest contract before rerunning readiness.'
      : 'The missing prior Gate lineage cannot be fabricated at readiness. Restore it through the owning legal lifecycle/checkpoint path.',
    detail: `[${rule.id}] ${failure.detail}`,
    maskedByRuleId: failure.maskedByRuleId || null,
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
          expected: 'Required readiness artifact exists.',
          observed: { exists: false },
          missingFact: `Required readiness artifact '${rule.target}' is absent.`,
          detail: `Missing file: ${rule.target}`,
        };
      }
    } else if (rule.check === 'dir_non_empty') {
      const directory = join(bundlePath, rule.target);
      const exists = existsSync(directory);
      const entries = exists ? readdirSync(directory) : [];
      if (!exists || entries.length === 0) {
        failure = {
          surface: rule.target,
          expected: 'Required readiness directory exists and is non-empty.',
          observed: { exists, entry_count: entries.length },
          missingFact: `Required readiness directory '${rule.target}' is ${exists ? 'empty' : 'absent'}.`,
          detail: exists ? `Directory ${rule.target} is empty` : `Missing directory: ${rule.target}`,
        };
      }
    } else if (rule.check === 'trace_has_all_gates') {
      const manifest = loadManifest();
      const currentIndex = manifest.phases.findIndex((phase) => phase.node === args.currentNode);
      if (currentIndex === -1) {
        failure = {
          surface: 'workflow manifest phase topology',
          expected: `Manifest contains current node '${args.currentNode}'.`,
          observed: { current_node_found: false },
          missingFact: `Current node '${args.currentNode}' is absent from manifest phases, so prior Gate lineage cannot be derived.`,
          detail: `Current node "${args.currentNode}" not found in manifest phases — cannot derive prior gate set`,
          configuration: true,
          missing: [],
        };
      } else {
        const trace = readTraceJsonl();
        const priorGates = manifest.phases.slice(0, currentIndex).filter((phase) => phase.gate !== null).map((phase) => phase.gate);
        const passedGates = new Set(trace.events
          .filter((event) => event.event === rule.target
            && (!rule.match || Object.entries(rule.match).every(([key, value]) => event[key] === value)))
          .map((event) => event.gate));
        const missing = priorGates.filter((gate) => !passedGates.has(gate));
        if (missing.length > 0 || !trace.exists || trace.badLines.length > 0) {
          const found = priorGates.filter((gate) => passedGates.has(gate));
          failure = {
            surface: resolveFsPath(bundlePath, 'rb_trace.jsonl'),
            expected: { prior_gates: priorGates, all_passed: true },
            observed: { passed_prior_gates: found, missing, bad_lines: trace.badLines, trace_exists: trace.exists },
            missingFact: `Readiness lacks gate_attempt(passed=true) lineage for: ${missing.length ? missing.join(', ') : 'none independently assessable while trace is invalid'}.`,
            detail: `Missing gate_attempt(passed=true) for: ${missing.join(', ') || 'unknown while trace is invalid'}. Expected ${priorGates.length} prior gate(s): ${priorGates.join(', ')}. Found: ${found.length > 0 ? found.join(', ') : 'none'}.`,
            missing,
            maskedByRuleId: !trace.exists || trace.badLines.length > 0 ? 'trace_jsonl_parseable' : null,
          };
        }
      }
    } else if (rule.check === 'yaml_parse') {
      const yamlPath = join(bundlePath, rule.target);
      if (!existsSync(yamlPath)) {
        failure = {
          expected: `${rule.target} exists and parses as YAML.`,
          observed: { file_exists: false },
          missingFact: `${rule.target} is absent, so readiness cannot read the recorded profile.`,
          detail: `Missing file: ${rule.target}`,
          fileMissing: true,
        };
      } else {
        try { parseYaml(readFileSync(yamlPath, 'utf-8')); }
        catch (error) {
          failure = {
            expected: `${rule.target} parses as YAML.`,
            observed: error.message || String(error),
            missingFact: `${rule.target} contains invalid YAML: ${error.message || String(error)}`,
            detail: `YAML parse error in ${rule.target}: ${error.message || String(error)}`,
            fileMissing: false,
          };
        }
      }
    } else if (rule.check === 'jsonl_parse') {
      const trace = readTraceJsonl();
      if (!trace.exists || trace.badLines.length > 0) {
        failure = {
          expected: `${rule.target} exists and every non-empty line parses as JSON.`,
          observed: { file_exists: trace.exists, bad_lines: trace.badLines },
          missingFact: !trace.exists
            ? `${rule.target} is absent.`
            : `${rule.target} has unparseable JSONL line(s): ${trace.badLines.slice(0, 5).join(', ')}${trace.badLines.length > 5 ? '...' : ''}`,
          detail: !trace.exists
            ? `Missing file: ${rule.target}`
            : `${rule.target} has ${trace.badLines.length} unparseable line(s): ${trace.badLines.slice(0, 5).join(', ')}${trace.badLines.length > 5 ? '...' : ''}`,
        };
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
      configuration: rule.check === 'trace_has_all_gates',
      missing: [],
    };
  }

  if (findingOverride) findings.push(findingOverride);
  else if (failure) {
    if (rule.id === 'all_prior_gates_passed') findings.push(priorGatesFinding(rule, failure));
    else if (rule.id === 'profile_yaml_parseable') findings.push(profileParseFinding(rule, failure));
    else if (rule.id === 'trace_jsonl_parseable') findings.push(traceParseFinding(rule, failure));
    else findings.push(makeDefinitionRuleFinding({
      rule,
      bundlePath,
      surface: failure.surface,
      expected: failure.expected,
      observed: failure.observed,
      missingFact: failure.missingFact,
      detail: `[${rule.id}] ${failure.detail}`,
    }));
  }
}

const ruleEvaluation = buildContractEvaluation({ checksRun, findings });
let compositionConsistency = null;
const compositionFindings = [];
if (ruleEvaluation.passed) {
  const witness = selectCompositionHandoffWitness({
    predecessor: handoffPreflight.handoff,
    trace_events: handoffPreflight.traceEvents,
  });
  compositionConsistency = witness.ok
    ? evaluateCompositionHandoffConsistency(readProfile().value, witness.receipt)
    : witness;
  if (!compositionConsistency.ok) {
    const restoreCommand = `node DEEP_RESEARCH_HARNESS/cli/operate-composition-handoff.mjs restore --bundle ${bundlePath} --current-node phases/phase-readiness.md`;
    const projectionDrift = compositionConsistency.kind === 'composition_projection_drift';
    const contextDrift = compositionConsistency.kind === 'profile_context_drift';
    const invalidWitness = compositionConsistency.kind === 'invalid_witness';
    compositionFindings.push(makeContractFinding({
      id: 'composition_handoff_readiness_consistency',
      ruleId: 'composition_handoff_readiness_consistency',
      findingSource: 'checker',
      classification: 'blocking',
      blockingBasis: contextDrift ? 'authority_integrity' : 'recorded_human_decision',
      surface: invalidWitness
        ? 'rb_trace.jsonl#selected-hitl2-gate_attempt.composition_handoff_receipt'
        : 'rb_profile.yaml#/human_decision_checkpoints/hitl2',
      expected: 'The current composition projection and non-composition profile context equal the exact selected HITL2 witness.',
      observed: compositionConsistency.reason_code,
      missingFact: `Readiness composition consistency failed: ${compositionConsistency.reason_code}.`,
      repairKind: projectionDrift ? 'engine_operation' : (contextDrift || invalidWitness ? 'missing_contract' : 'agent_action'),
      writeTo: projectionDrift
        ? restoreCommand
        : (contextDrift ? 'Owning profile/lifecycle boundary for non-composition drift' : (invalidWitness ? 'Selected HITL2 Gate witness contract boundary' : 'rb_profile.yaml#/human_decision_checkpoints/hitl2')),
      repair: projectionDrift
        ? `Restore the exact selected projection, then rerun this same Readiness Gate: ${restoreCommand}`
        : 'Resolve the named authoritative boundary; do not use the receipt as a Final fallback or infer replacement composition semantics.',
      detail: `[composition_handoff_readiness_consistency] ${compositionConsistency.reason_code}`,
    }));
  }
}

const compositionEvaluation = buildContractEvaluation({
  checksRun: checksRun + (ruleEvaluation.passed ? 1 : 0),
  findings: [...ruleEvaluation.findings, ...compositionFindings],
  maskedRuleIds: ruleEvaluation.masked_rule_ids,
});
const outcome = compositionEvaluation.passed ? 'passed' : 'failed';
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
    composition_handoff_consistency: compositionConsistency?.kind || null,
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
