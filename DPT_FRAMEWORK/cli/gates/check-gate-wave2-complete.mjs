#!/usr/bin/env node
// check-gate-wave2-complete.mjs — evaluates gate-wave2-complete rules
// @impl GSK-001, GSK-002, GSK-004, RWG-006, RWG-007, RWG-008, RWG-017, RWG-018
// Usage: node check-gate-wave2-complete.mjs --bundle <path> --current-node <fileRef> [--transitions <path>]

import {
  buildGateResult,
  checkNodeGateBinding,
  checkPhaseHandoffPreflight,
  emitDelegatedBypassDiagnostic,
  emitGateResult,
  parseGateCliArgs,
  readTraceEvents,
  resolveRouting,
  scanTemplateNotExpanded,
  tryLoadGateDefinition,
  writeGateAttempt,
} from '../../engine/helpers/gate-helpers.mjs';
import { evaluateWave2Contract } from '../../engine/helpers/wave-contract-evaluators.mjs';
import {
  buildContractEvaluation,
  makeContractFinding,
} from '../../engine/helpers/wave-contract-findings.mjs';

const args = parseGateCliArgs();
if (args.error) emitGateResult(args.error, { bundlePath: args.bundle });
const { definition, error: definitionError } = tryLoadGateDefinition('wave2-complete', args.currentNode || null);
if (definitionError) emitGateResult(definitionError, { bundlePath: args.bundle });

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
  const result = buildGateResult({
    passed: false,
    gate: definition.gate,
    currentNodeRef: args.currentNode,
    routing: resolveRouting(args.transitions, args.currentNode, 'failed'),
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
const templateInspect = scanTemplateNotExpanded(bundlePath).findings
  .map((finding) => `[template_not_expanded] ${finding.file}: ${finding.field} contains unexpanded template variable: ${finding.value}`);
const sharedEvaluation = evaluateWave2Contract(bundlePath, definition);
const formalFindings = [...sharedEvaluation.findings];

for (const rule of definition.rules.filter((candidate) => candidate.check === 'trace_event_present')) {
  if (readTraceEvents(bundlePath, rule.target).length === 0) {
    const detail = `Trace event "${rule.target}" not found in rb_trace.jsonl`;
    formalFindings.push(makeContractFinding({
      id: rule.id,
      ruleId: rule.id,
      findingSource: 'checker',
      classification: 'blocking',
      blockingBasis: 'authority_integrity',
      surface: `${bundlePath}/rb_trace.jsonl`,
      expected: `Engine-written trace event '${rule.target}'.`,
      observed: { matching_events: 0 },
      missingFact: `Wave2 completion trace event '${rule.target}' is absent.`,
      repairKind: 'engine_operation',
      writeTo: `node DPT_FRAMEWORK/cli/log-event.mjs --bundle ${bundlePath} --event ${rule.target}`,
      repair: 'Run the accepted Wave2 completion-event operation after phase work is complete, then rerun this Gate.',
      detail: `[${rule.id}] ${detail}`,
    }));
  }
}

const ruleEvaluation = buildContractEvaluation({
  checksRun: sharedEvaluation.checks_run,
  findings: formalFindings,
  maskedRuleIds: sharedEvaluation.masked_rule_ids,
  bypassSuspicion: sharedEvaluation.bypass_suspicion,
});
const routing = resolveRouting(args.transitions, args.currentNode, ruleEvaluation.passed ? 'passed' : 'failed');
const routingFailed = ['invalid_input', 'config_error'].includes(routing.kind);
const finalEvaluation = buildContractEvaluation({
  checksRun: ruleEvaluation.checks_run,
  findings: [...ruleEvaluation.findings, ...(routing.findings || [])],
  maskedRuleIds: ruleEvaluation.masked_rule_ids,
  bypassSuspicion: ruleEvaluation.bypass_suspicion,
});
emitDelegatedBypassDiagnostic(bundlePath, definition.gate, sharedEvaluation.bypass_suspicion);
const result = buildGateResult({
  passed: ruleEvaluation.passed && !routingFailed,
  gate: definition.gate,
  currentNodeRef: args.currentNode,
  routing,
  inspect: [...templateInspect, ...ruleEvaluation.inspect, ...(routing.inspect || [])],
  advice: [...ruleEvaluation.advice, ...(routing.advice || [])],
  findings: finalEvaluation.findings,
  bundlePath,
  extraCheck: {
    failed_rule_ids: finalEvaluation.failed_rule_ids,
    masked_rule_ids: finalEvaluation.masked_rule_ids,
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
