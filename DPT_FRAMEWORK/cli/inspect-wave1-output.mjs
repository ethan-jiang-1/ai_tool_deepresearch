#!/usr/bin/env node
// inspect-wave1-output.mjs — side-effect-free Wave1 contract inspect
// @impl IOC-002, IOC-005, REF-001, REF-008, WPG-012, RWG-017, RWG-018

import { tryLoadGateDefinition } from '../engine/helpers/gate-helpers.mjs';
import { resolve as resolvePath } from 'node:path';
import {
  buildContractEvaluation,
  emitInspectResult,
  makeContractFinding,
  projectInspectContract,
} from '../engine/helpers/wave-contract-findings.mjs';
import { evaluateWave1Contract } from '../engine/helpers/wave-contract-evaluators.mjs';
import {
  inspectReferenceReturnMaps,
  inspectSeedTopicReturnMaps,
  inspectWaveArtifactReturnMaps,
} from '../engine/helpers/return-map.mjs';
import { buildCanonicalTopicRegistryFact } from '../engine/helpers/topic-registry-fact.mjs';

const bundleFlag = process.argv.indexOf('--bundle');
const bundlePath = bundleFlag >= 0 ? process.argv[bundleFlag + 1] : process.argv[2];
const commandFor = (bundle) => `node DPT_FRAMEWORK/cli/inspect-wave1-output.mjs --bundle ${bundle || '<bundle-path>'}`;
if (!bundlePath) {
  const finding = makeContractFinding({
    id: 'wave1_inspect_bundle_required',
    ruleId: 'wave1_inspect_bundle_required',
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: 'invocation_contract',
    surface: 'Wave1 inspect invocation --bundle',
    expected: 'A selected active bundle path supplied through --bundle.',
    observed: 'argument absent',
    missingFact: 'Required Wave1 inspect invocation argument --bundle is missing.',
    repairKind: 'engine_operation',
    writeTo: 'Wave1 inspect invocation argument --bundle',
    repair: 'Provide --bundle <bundle-path> and rerun Wave1 inspect.',
    detail: '[wave1_inspect_bundle_required] Missing required argument: --bundle <bundle-path>',
  });
  emitInspectResult(projectInspectContract({
    wave: 'wave1',
    evaluation: buildContractEvaluation({ findings: [finding] }),
    checkpointCommand: commandFor(null),
  }), 2);
}

const resolvedBundlePath = resolvePath(bundlePath);
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
const topicSlugs = topicRegistryFact?.topic_registry.map((topic) => topic.slug) || [];
const seedMap = inspectSeedTopicReturnMaps(resolvedBundlePath, { wave: 'wave1', topicRegistryFact });
const artifactMap = inspectWaveArtifactReturnMaps(resolvedBundlePath, 'wave1', topicSlugs);
const referenceMap = { passed: true, inspect: [], advice: [], findings: [], classification: 'diagnostic-only' };
for (const topic of topicSlugs) {
  const result = inspectReferenceReturnMaps(resolvedBundlePath, topic);
  referenceMap.inspect.push(...result.inspect);
  referenceMap.advice.push(...result.advice);
  referenceMap.findings.push(...(result.findings || []));
  if (!result.passed) referenceMap.passed = false;
}
referenceMap.classification = referenceMap.passed ? 'diagnostic-only' : 'blocking';

const additionalFindings = [
  ...(seedMap.findings || []),
  ...(artifactMap.findings || []),
  ...(referenceMap.findings || []),
];
const returnMapClassification = seedMap.passed && artifactMap.passed && referenceMap.passed ? 'diagnostic-only' : 'blocking';
const output = projectInspectContract({ wave: 'wave1', evaluation, additionalFindings, additionalChecksRun: 1, returnMapClassification, checkpointCommand });
emitInspectResult(output, output.check.passed ? 0 : 1);
