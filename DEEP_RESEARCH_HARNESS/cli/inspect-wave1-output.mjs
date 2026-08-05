#!/usr/bin/env node
// inspect-wave1-output.mjs — side-effect-free Wave1 contract inspect
// @impl IOC-002, IOC-005, REF-001, REF-008, WPG-012, RWG-017, RWG-018

import { tryLoadGateDefinition } from '../engine/helpers/gate-helpers.mjs';
import {
  buildContractEvaluation,
  emitInspectResult,
  makeContractFinding,
  projectInspectContract,
} from '../engine/helpers/wave-contract-findings.mjs';
import { evaluateWave1Contract } from '../engine/helpers/wave-contract-evaluators.mjs';
import { evaluateSeedTopicProjectionReadiness } from '../engine/helpers/return-map.mjs';
import { buildCanonicalTopicRegistryFact } from '../engine/helpers/topic-registry-fact.mjs';
import { parseOperationInvocation, validateBundleDirectory } from '../engine/helpers/cli-operation-contract.mjs';

const commandFor = (bundle) => `node DEEP_RESEARCH_HARNESS/cli/inspect-wave1-output.mjs --bundle ${bundle || '<bundle-path>'}`;
const usage = `Usage:\n  ${commandFor('<bundle-path>')}`;
const invocation = parseOperationInvocation(process.argv.slice(2), {
  usage,
  forms: [{ id: 'inspect-wave1', positionals: [], options: { bundle: { required: true } } }],
});
function failInvocation(reason) {
  const finding = makeContractFinding({
    id: 'wave1_inspect_invocation_invalid',
    ruleId: 'wave1_inspect_invocation_invalid',
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: 'invocation_contract',
    surface: 'Wave1 inspect invocation --bundle',
    expected: 'Exactly one --bundle <bundle-path> pair and no positional arguments.',
    observed: 'invalid static invocation',
    missingFact: `Wave1 inspect invocation is invalid: ${reason}`,
    repairKind: 'engine_operation',
    writeTo: 'Wave1 inspect CLI invocation grammar',
    repair: 'Provide --bundle <bundle-path> and rerun Wave1 inspect.',
    detail: `[wave1_inspect_invocation_invalid] ${reason}`,
  });
  emitInspectResult(projectInspectContract({
    wave: 'wave1',
    evaluation: buildContractEvaluation({ findings: [finding] }),
    checkpointCommand: commandFor(null),
  }), 2);
}
if (invocation.kind === 'help') {
  process.stdout.write(`${usage}\n`);
  process.exit(0);
}
if (invocation.kind === 'invalid') failInvocation(invocation.reason);
const bundle = validateBundleDirectory(invocation.values.bundle);
if (!bundle.ok) failInvocation(bundle.reason);

const resolvedBundlePath = bundle.path;
const checkpointCommand = commandFor(resolvedBundlePath);

const { definition, error } = tryLoadGateDefinition('wave1-complete', null);
if (error) {
  emitInspectResult(projectInspectContract({
    wave: 'wave1',
    evaluation: buildContractEvaluation({ findings: error.findings || [] }),
    checkpointCommand,
  }), 2);
}

let topicRegistryFact = null;
try { topicRegistryFact = buildCanonicalTopicRegistryFact(resolvedBundlePath); } catch { /* evaluator owns plan prerequisite */ }
const evaluation = evaluateWave1Contract(resolvedBundlePath, definition, { topicRegistryFact });
const seedMap = evaluateSeedTopicProjectionReadiness(resolvedBundlePath, { wave: 'wave1', topicRegistryFact });

const additionalFindings = [
  ...(seedMap.findings || []),
];
const returnMapClassification = seedMap.classification;
const output = projectInspectContract({ wave: 'wave1', evaluation, additionalFindings, additionalChecksRun: 1, returnMapClassification, checkpointCommand });
emitInspectResult(output, output.check.passed ? 0 : 1);
