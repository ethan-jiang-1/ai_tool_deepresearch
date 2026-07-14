#!/usr/bin/env node
// check-gate-wave1-complete.mjs — evaluates gate-wave1-complete rules
// @impl GSK-001, GSK-002, GSK-004, RWG-005, RWG-007, RWG-017, RWG-018, FRE-003
// Usage: node check-gate-wave1-complete.mjs --bundle <path> --current-node <fileRef> [--transitions <path>]

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
import { evaluateWave1Contract } from '../../engine/helpers/wave-contract-evaluators.mjs';
import {
  buildContractEvaluation,
  makeContractFinding,
} from '../../engine/helpers/wave-contract-findings.mjs';

const args = parseGateCliArgs();
if (args.error) emitGateResult(args.error, { bundlePath: args.bundle });
const { definition, error: definitionError } = tryLoadGateDefinition('wave1-complete', args.currentNode || null);
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
const inspect = [];
const advice = [];
const formalFindings = [];
const templateInspect = [];
const sharedEvaluation = evaluateWave1Contract(bundlePath, definition);
for (const finding of scanTemplateNotExpanded(bundlePath).findings) templateInspect.push(`[template_not_expanded] ${finding.file}: ${finding.field} contains unexpanded template variable: ${finding.value}`);
formalFindings.push(...sharedEvaluation.findings);

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
      missingFact: `Wave1 completion trace event '${rule.target}' is absent.`,
      repairKind: 'engine_operation',
      writeTo: `node DPT_FRAMEWORK/cli/log-event.mjs --bundle ${bundlePath} --event ${rule.target}`,
      repair: 'Run the accepted Wave1 completion-event operation after phase work is complete, then rerun this Gate.',
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
inspect.push(...templateInspect, ...ruleEvaluation.inspect);
advice.push(...ruleEvaluation.advice);
const failedRuleIds = new Set(ruleEvaluation.failed_rule_ids);

function baseRuleId(ruleId) {
  return String(ruleId || '').split(':')[0];
}

function engineVisibleAttemptCount() {
  const events = readTraceEvents(bundlePath);
  let startIndex = -1;
  for (let index = events.length - 1; index >= 0; index--) {
    if (events[index].event === 'load_complete' && events[index].entry === args.currentNode) {
      startIndex = index;
      break;
    }
  }
  return events.slice(startIndex + 1)
    .filter((event) => event.event === 'gate_attempt' && event.gate === definition.gate && event.currentNodeRef === args.currentNode)
    .length + 1;
}

function maybeDegradedHandoff() {
  if (failedRuleIds.size === 0 || !['phases/phase-wave0.md', 'phases/phase-wave1.md', 'phases/phase-wave2.md'].includes(args.currentNode)) return null;
  const effectiveAttemptCount = Math.max(args.attempt ?? 0, engineVisibleAttemptCount());
  if (effectiveAttemptCount < 3) return null;
  const failed = [...failedRuleIds].sort();
  const eligible = new Set(['per_topic_ref_md_count_floor']);
  const ineligible = failed.filter((ruleId) => !eligible.has(baseRuleId(ruleId)));
  if (ineligible.length > 0) {
    inspect.push(`[degraded_not_eligible] Fatigue threshold reached, but runtime-truth or structural blocker(s) remain: ${ineligible.join(', ')}`);
    return null;
  }
  const routing = resolveRouting(args.transitions, args.currentNode, 'passed');
  if (routing.kind !== 'next' || !routing.next) {
    inspect.push(`[degraded_not_eligible] Normal pass route is unavailable for ${args.currentNode}; cannot emit degraded handoff.`);
    return null;
  }
  inspect.push(`[degraded] Fatigue threshold reached; carrying forward degradation-eligible quality rule(s): ${failed.join(', ')}`);
  advice.push('[degraded] Consume check.next through enter-phase and advance-status. This is a legal handoff witness only, not a clean quality pass or target-phase completion proof.');
  return {
    routing,
    extraCheck: {
      degraded: true,
      degraded_reason: 'fatigue_threshold_reached_with_only_degradation_eligible_quality_rules',
      degraded_rules: failed,
      degradation_attempt_count: effectiveAttemptCount,
    },
  };
}

function emitAfterDurableAttempt(result) {
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
        suppressed_pass_degraded: result.check?.degraded === true,
      },
      attemptNumber: args.attempt ?? 0,
    });
    try { writeGateAttempt(bundlePath, failedResult); } catch { /* secondary diagnostic only */ }
    emitGateResult(failedResult);
  }
}

const degradedHandoff = maybeDegradedHandoff();
const passedForHandoff = failedRuleIds.size === 0 || Boolean(degradedHandoff);
const routing = degradedHandoff?.routing || resolveRouting(args.transitions, args.currentNode, passedForHandoff ? 'passed' : 'failed');
const routingFailed = ['invalid_input', 'config_error'].includes(routing.kind);
const finalEvaluation = buildContractEvaluation({
  checksRun: ruleEvaluation.checks_run,
  findings: [...ruleEvaluation.findings, ...(routing.findings || [])],
  maskedRuleIds: ruleEvaluation.masked_rule_ids,
  bypassSuspicion: ruleEvaluation.bypass_suspicion,
});
emitDelegatedBypassDiagnostic(bundlePath, definition.gate, sharedEvaluation.bypass_suspicion);

const result = buildGateResult({
  passed: passedForHandoff && !routingFailed,
  gate: definition.gate,
  currentNodeRef: args.currentNode,
  routing,
  inspect: [...inspect, ...(routing.inspect || [])],
  advice: [...advice, ...(routing.advice || [])],
  findings: finalEvaluation.findings,
  bundlePath,
  extraCheck: {
    failed_rule_ids: finalEvaluation.failed_rule_ids,
    masked_rule_ids: finalEvaluation.masked_rule_ids,
    ...(degradedHandoff?.extraCheck || {}),
  },
  attemptNumber: args.attempt ?? 0,
});

emitAfterDurableAttempt(result);
emitGateResult(result);
