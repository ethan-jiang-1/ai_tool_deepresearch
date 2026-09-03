#!/usr/bin/env node
// check-gate-wave2-complete.mjs — evaluates gate-wave2-complete rules
// @impl GSK-001, GSK-002, GSK-004, GSK-013, RWG-006, RWG-007, RWG-008, RWG-017, RWG-018, RWG-021, RRM-007
// Usage: node check-gate-wave2-complete.mjs --bundle <path> --current-node <fileRef> [--transitions <path>]

import { basename } from 'node:path';
import {
  buildGateResult,
  checkNodeGateBinding,
  checkPhaseHandoffPreflight,
  emitDelegatedBypassDiagnostic,
  emitGateResult,
  parseGateCliArgs,
  readTraceEvents,
  readCanonicalTraceEvents,
  resolveRouting,
  scanTemplateNotExpanded,
  tryLoadGateDefinition,
  writeGateAttempt,
} from '../../engine/helpers/gate-helpers.mjs';
import { evaluatePrematureFinalPresence } from '../../engine/helpers/phase-status-audit.mjs';
import { WAVE_FATIGUE_PHASE_NODES, FATIGUE_ATTEMPT_THRESHOLD } from '../../engine/helpers/gate-degradation-policy.mjs';
import { evaluateWave2Contract } from '../../engine/helpers/wave-contract-evaluators.mjs';
import { evaluateWaveDegradationEligibility } from '../../engine/helpers/wave-degradation-eligibility.mjs';
import { projectWaveGatePublicVerdict } from '../../engine/helpers/wave-gate-verdict.mjs';
import { evaluateSeedTopicProjectionReadiness } from '../../engine/helpers/return-map.mjs';
import { buildCanonicalTopicRegistryFact } from '../../engine/helpers/topic-registry-fact.mjs';
import { loadWave2FindingIndexFact } from '../../engine/helpers/wave-depth-contracts.mjs';
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
// @impl RWG-023 — fail-closed premature canonical Final presence root.
// Runs before contract evaluation; never mutates the premature file; advice
// names the single legal relocation and never suggests bypass or surfacing.
const prematurePresence = evaluatePrematureFinalPresence(args.bundle);
if (prematurePresence.hit) {
  const result = buildGateResult({
    passed: false,
    gate: definition.gate,
    currentNodeRef: args.currentNode,
    routing: resolveRouting(args.transitions, args.currentNode, 'failed'),
    inspect: [
      '[premature_final_present] final/ contains canonical primary-series file(s) without any legal Final-entry admission, prior-lineage delivery, accepted post-final stage, or legacy compatibility coverage.',
      ...prematurePresence.surfaces.map((surface) => `[premature_final_present] ${surface.kind}: ${surface.name} — ${surface.detail}`),
    ],
    advice: [
      ...prematurePresence.remediation,
      'Do not bypass the phase, hand-edit status, or surface to the user; relocate the file and rerun this gate.',
    ],
    findings: [],
    bundlePath: args.bundle,
    extraCheck: { premature_final_present: false },
    attemptNumber: args.attempt ?? 0,
  });
  writeGateAttempt(args.bundle, result, { strictTrace: false });
  emitGateResult(result);
}

const bundlePath = args.bundle;
const templateInspect = scanTemplateNotExpanded(bundlePath).findings
  .map((finding) => `[template_not_expanded] ${finding.file}: ${finding.field} contains unexpanded template variable: ${finding.value}`);
let topicRegistryFact = null;
try { topicRegistryFact = buildCanonicalTopicRegistryFact(bundlePath); } catch { /* both consumers report their own direct prerequisite */ }
const findingIndexFact = loadWave2FindingIndexFact(bundlePath);
const sharedEvaluation = evaluateWave2Contract(bundlePath, definition, { topicRegistryFact, findingIndexFact });
const projectionEvaluation = evaluateSeedTopicProjectionReadiness(bundlePath, { wave: 'wave2', topicRegistryFact, findingIndexFact });
const formalFindings = [...sharedEvaluation.findings, ...projectionEvaluation.findings];

for (const rule of definition.rules.filter((candidate) => candidate.check === 'trace_event_present')) {
  // @impl TRW-007: only events with the canonical bundle basename (and, when present,
  // an accepted writer identity) count as completion evidence; rb_status.json short-name
  // events (the forged-event shape) do not satisfy the rule.
  if (readCanonicalTraceEvents(bundlePath, rule.target).length === 0) {
    const detail = `Trace event "${rule.target}" not found in rb_trace.jsonl (no entry matching the canonical bundle '${basename(bundlePath)}')`;
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
      writeTo: `node DEEP_RESEARCH_HARNESS/cli/log-event.mjs --bundle ${bundlePath} --event ${rule.target}`,
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
const inspect = [...templateInspect, ...ruleEvaluation.inspect];
const advice = [...ruleEvaluation.advice];
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
    inspect.push(`[degraded_not_eligible] Fatigue threshold reached, but runtime-truth or structural blocker(s) remain: ${eligibility.ineligible_rule_ids.join(', ')}`);
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
emitGateResult(result);
