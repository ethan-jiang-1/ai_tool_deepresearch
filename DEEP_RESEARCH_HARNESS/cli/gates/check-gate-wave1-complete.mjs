#!/usr/bin/env node
// check-gate-wave1-complete.mjs — evaluates gate-wave1-complete rules
// @impl GSK-001, GSK-002, GSK-004, GSK-013, RWG-005, RWG-007, RWG-017, RWG-018, RWG-021, RRM-007, FRE-003
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
import { WAVE_FATIGUE_PHASE_NODES, FATIGUE_ATTEMPT_THRESHOLD } from '../../engine/helpers/gate-degradation-policy.mjs';
import { evaluateWave1Contract } from '../../engine/helpers/wave-contract-evaluators.mjs';
import { evaluateWaveDegradationEligibility } from '../../engine/helpers/wave-degradation-eligibility.mjs';
import { projectWaveGatePublicVerdict } from '../../engine/helpers/wave-gate-verdict.mjs';
import { evaluateSeedTopicProjectionReadiness } from '../../engine/helpers/return-map.mjs';
import { buildCanonicalTopicRegistryFact } from '../../engine/helpers/topic-registry-fact.mjs';
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
let topicRegistryFact = null;
try { topicRegistryFact = buildCanonicalTopicRegistryFact(bundlePath); } catch { /* both consumers report their own direct prerequisite */ }
const sharedEvaluation = evaluateWave1Contract(bundlePath, definition, { topicRegistryFact });
const projectionEvaluation = evaluateSeedTopicProjectionReadiness(bundlePath, { wave: 'wave1', topicRegistryFact });
for (const finding of scanTemplateNotExpanded(bundlePath).findings) templateInspect.push(`[template_not_expanded] ${finding.file}: ${finding.field} contains unexpanded template variable: ${finding.value}`);
formalFindings.push(...sharedEvaluation.findings);
formalFindings.push(...projectionEvaluation.findings);

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
      writeTo: `node DEEP_RESEARCH_HARNESS/cli/log-event.mjs --bundle ${bundlePath} --event ${rule.target}`,
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
  if (failedRuleIds.size === 0 || !WAVE_FATIGUE_PHASE_NODES.includes(args.currentNode)) return null;
  const effectiveAttemptCount = Math.max(args.attempt ?? 0, engineVisibleAttemptCount());
  if (effectiveAttemptCount < FATIGUE_ATTEMPT_THRESHOLD) return null;
  const eligibility = evaluateWaveDegradationEligibility({ definition, ruleEvaluation });
  if (!eligibility.eligible) {
    const ineligible = eligibility.ineligible_rule_ids;
    inspect.push(`[degraded_not_eligible] Fatigue threshold reached, but runtime-truth or structural blocker(s) remain: ${ineligible.join(', ')}`);
    return null;
  }
  const routing = resolveRouting(args.transitions, args.currentNode, 'passed');
  if (routing.kind !== 'next' || !routing.next) {
    inspect.push(`[degraded_not_eligible] Normal pass route is unavailable for ${args.currentNode}; cannot emit degraded handoff.`);
    return null;
  }
  inspect.push(`[degraded] Fatigue threshold reached; carrying forward degradation-eligible quality rule(s): ${eligibility.eligible_rule_ids.join(', ')}`);
  advice.push('[degraded] Consume check.next through enter-phase and advance-status. This is a legal handoff witness only, not a clean quality pass or target-phase completion proof.');
  return {
    routing,
    extraCheck: {
      degraded: true,
      degraded_reason: 'fatigue_threshold_reached_with_only_degradation_eligible_quality_rules',
      degraded_rules: eligibility.eligible_rule_ids,
      degradation_attempt_count: effectiveAttemptCount,
    },
  };
}

function emitAfterDurableAttempt(result, carriedTargetReceipt) {
  try {
    writeGateAttempt(bundlePath, result, {
      strictTrace: result.check?.passed === true && result.check?.next != null,
      ...(result.check?.passed === true && result.check?.next != null ? { carriedTargetReceipt } : {}),
    });
    return true;
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
    return false;
  }
}

const degradedHandoff = maybeDegradedHandoff();
const passedForHandoff = failedRuleIds.size === 0 || Boolean(degradedHandoff);
const routing = degradedHandoff?.routing || resolveRouting(args.transitions, args.currentNode, passedForHandoff ? 'passed' : 'failed');
const finalEvaluation = buildContractEvaluation({
  checksRun: ruleEvaluation.checks_run,
  findings: [...ruleEvaluation.findings, ...(routing.findings || [])],
  maskedRuleIds: ruleEvaluation.masked_rule_ids,
  bypassSuspicion: ruleEvaluation.bypass_suspicion,
});
const verdict = projectWaveGatePublicVerdict({
  failedRuleIds: finalEvaluation.failed_rule_ids,
  degradedRuleIds: degradedHandoff?.extraCheck.degraded_rules,
  routeAvailable: routing.kind === 'next' && Boolean(routing.next),
});
emitDelegatedBypassDiagnostic(bundlePath, definition.gate, sharedEvaluation.bypass_suspicion);

const result = buildGateResult({
  passed: verdict.passed,
  gate: definition.gate,
  currentNodeRef: args.currentNode,
  routing,
  inspect: [...inspect, ...(routing.inspect || [])],
  advice: [...advice, ...(routing.advice || [])],
  findings: finalEvaluation.findings,
  bundlePath,
  extraCheck: {
    failed_rule_ids: verdict.failed_rule_ids,
    masked_rule_ids: finalEvaluation.masked_rule_ids,
    ...(verdict.degraded ? degradedHandoff.extraCheck : {}),
  },
  attemptNumber: args.attempt ?? 0,
});

if (emitAfterDurableAttempt(result, sharedEvaluation.carried_target_receipt)) emitGateResult(result);
