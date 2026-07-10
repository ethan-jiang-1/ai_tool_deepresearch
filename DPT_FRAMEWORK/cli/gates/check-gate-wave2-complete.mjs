#!/usr/bin/env node
// check-gate-wave2-complete.mjs — evaluates gate-wave2-complete rules
// @impl GSK-001, GSK-002, GSK-004, RWG-006, RWG-007, RWG-008, RWG-017, RWG-018
// Usage: node check-gate-wave2-complete.mjs --bundle <path> --current-node <fileRef> [--transitions <path>]

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
import { evaluateWave2Contract } from '../../engine/helpers/wave-contract-evaluators.mjs';

const args = parseGateCliArgs();
if (args.error) emitGateResult(args.error, { bundlePath: args.bundle });
const { definition, error: definitionError } = tryLoadGateDefinition('wave2-complete', args.currentNode || null);
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
  const result = buildGateResult({
    passed: false,
    gate: definition.gate,
    currentNodeRef: args.currentNode,
    routing: resolveRouting(args.transitions, args.currentNode, 'failed'),
    inspect: handoffPreflight.inspect || [handoffPreflight.reason || 'Lifecycle handoff preflight failed'],
    advice: handoffPreflight.advice || ['Follow the handoff remedy and rerun this gate.'],
    extraCheck: { handoff_preflight: false },
    attemptNumber: args.attempt ?? 0,
  });
  writeGateAttempt(args.bundle, result, { strictTrace: result.check?.passed === true && result.check?.next != null });
  emitGateResult(result);
}

const bundlePath = args.bundle;
const evaluation = evaluateWave2Contract(bundlePath, definition);
const inspect = [];
const advice = [...evaluation.advice];
const failedRuleIds = new Set(evaluation.failed_rule_ids);
const maskedRuleIds = new Set(evaluation.masked_rule_ids);
for (const finding of scanTemplateNotExpanded(bundlePath).findings) inspect.push(`[template_not_expanded] ${finding.file}: ${finding.field} contains unexpanded template variable: ${finding.value}`);
inspect.push(...evaluation.inspect);

for (const rule of definition.rules.filter((candidate) => candidate.check === 'trace_event_present')) {
  if (readTraceEvents(bundlePath, rule.target).length === 0) {
    failedRuleIds.add(rule.id);
    inspect.push(`Trace event "${rule.target}" not found in rb_trace.jsonl`);
    advice.push(rule.failure_message);
  }
}

const passed = failedRuleIds.size === 0;
const routing = resolveRouting(args.transitions, args.currentNode, passed ? 'passed' : 'failed');
emitDelegatedBypassDiagnostic(bundlePath, definition.gate, evaluation.bypass_suspicion);
const result = buildGateResult({
  passed,
  gate: definition.gate,
  currentNodeRef: args.currentNode,
  routing,
  inspect,
  advice,
  extraCheck: {
    failed_rule_ids: [...failedRuleIds],
    masked_rule_ids: [...maskedRuleIds],
  },
  attemptNumber: args.attempt ?? 0,
});
writeGateAttempt(bundlePath, result, { strictTrace: result.check?.passed === true && result.check?.next != null });
emitGateResult(result);
