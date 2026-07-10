#!/usr/bin/env node
// check-gate-wave0-complete.mjs — evaluates gate-wave0-complete rules
// @impl GSK-001, GSK-002, GSK-004, RWG-004, RWG-007, RWG-018, FRE-003
// Usage: node check-gate-wave0-complete.mjs --bundle <path> --current-node <fileRef> [--transitions <path>]

import {
  buildGateResult,
  checkPhaseHandoffPreflight,
  emitDelegatedBypassDiagnostic,
  emitGateResult,
  parseGateCliArgs,
  readTraceEvents,
  resolveRouting,
  scanTemplateNotExpanded,
  tryLoadGateDefinition,
  validateNodeGateBinding,
  writeGateAttempt,
} from '../../engine/helpers/gate-helpers.mjs';
import { evaluateWave0Contract } from '../../engine/helpers/wave-contract-evaluators.mjs';

const args = parseGateCliArgs();
if (args.error) emitGateResult(args.error, { bundlePath: args.bundle });

const { definition, error: definitionError } = tryLoadGateDefinition('wave0-complete', args.currentNode || null);
if (definitionError) emitGateResult(definitionError, { bundlePath: args.bundle });

const bindingError = validateNodeGateBinding(args.currentNode, definition.gate);
if (bindingError) {
  emitGateResult({
    check: { passed: false, gate: definition.gate, currentNodeRef: args.currentNode, next: null },
    routing: { kind: 'invalid_input', next: null, detail: bindingError },
    inspect: [bindingError],
    advice: ['Verify --current-node matches the phase for this gate.'],
  }, { bundlePath: args.bundle });
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
    extraCheck: { handoff_preflight: false },
    attemptNumber: args.attempt ?? 0,
  });
  writeGateAttempt(args.bundle, result, { strictTrace: result.check?.passed === true && result.check?.next != null });
  emitGateResult(result);
}

const bundlePath = args.bundle;
const evaluation = evaluateWave0Contract(bundlePath, definition);
const inspect = [];
const advice = [...evaluation.advice];
const failedRuleIds = new Set(evaluation.failed_rule_ids);
const maskedRuleIds = new Set(evaluation.masked_rule_ids);

for (const finding of scanTemplateNotExpanded(bundlePath).findings) {
  inspect.push(`[template_not_expanded] ${finding.file}: ${finding.field} contains unexpanded template variable: ${finding.value}`);
}
inspect.push(...evaluation.inspect);

for (const rule of definition.rules.filter((candidate) => candidate.check === 'trace_event_present')) {
  const events = readTraceEvents(bundlePath, rule.target);
  if (!events || events.length === 0) {
    failedRuleIds.add(rule.id);
    inspect.push(`Trace event "${rule.target}" not found in rb_trace.jsonl`);
    advice.push(rule.failure_message);
  }
}

const DEGRADATION_FATIGUE_THRESHOLD = 3;
const DEGRADATION_ELIGIBLE_RULE_IDS = new Set(['shared_ref_count_floor', 'per_topic_count_floor']);

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
  if (effectiveAttemptCount < DEGRADATION_FATIGUE_THRESHOLD) return null;

  const failed = [...failedRuleIds].sort();
  const ineligible = failed.filter((ruleId) => !DEGRADATION_ELIGIBLE_RULE_IDS.has(baseRuleId(ruleId)));
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
    const message = (error.message || String(error)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
    const failedResult = buildGateResult({
      passed: false,
      gate: definition.gate,
      currentNodeRef: args.currentNode,
      routing: resolveRouting(args.transitions, args.currentNode, 'failed'),
      inspect: [`[trace_durable] FAIL: could not durably append gate_attempt trace event: ${message}`],
      advice: ['Fix rb_trace.jsonl trace durability and rerun the gate through the Engine path; do not hand-edit status to simulate handoff.'],
      extraCheck: { trace_durable: false, gate_attempt_write_failed: true, suppressed_pass_degraded: result.check?.degraded === true },
      attemptNumber: args.attempt ?? 0,
    });
    try { writeGateAttempt(bundlePath, failedResult); } catch { /* secondary diagnostic only */ }
    emitGateResult(failedResult);
  }
}

const degradedHandoff = maybeDegradedHandoff();
const passedForHandoff = failedRuleIds.size === 0 || Boolean(degradedHandoff);
const routing = degradedHandoff?.routing || resolveRouting(args.transitions, args.currentNode, passedForHandoff ? 'passed' : 'failed');
emitDelegatedBypassDiagnostic(bundlePath, definition.gate, evaluation.bypass_suspicion);

const result = buildGateResult({
  passed: passedForHandoff,
  gate: definition.gate,
  currentNodeRef: args.currentNode,
  routing,
  inspect,
  advice,
  extraCheck: {
    failed_rule_ids: [...failedRuleIds],
    masked_rule_ids: [...maskedRuleIds],
    ...(degradedHandoff?.extraCheck || {}),
  },
  attemptNumber: args.attempt ?? 0,
});

emitAfterDurableAttempt(result);
emitGateResult(result);
