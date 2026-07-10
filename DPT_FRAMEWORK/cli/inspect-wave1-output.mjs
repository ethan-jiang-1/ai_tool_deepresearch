#!/usr/bin/env node
// inspect-wave1-output.mjs — side-effect-free Wave1 contract inspect
// @impl IOC-002, IOC-005, REF-001, REF-008, WPG-012, RWG-017, RWG-018

import { tryLoadGateDefinition, readBundlePlan } from '../engine/helpers/gate-helpers.mjs';
import { findingsFromCheckResult, projectInspectContract } from '../engine/helpers/wave-contract-findings.mjs';
import { evaluateWave1Contract } from '../engine/helpers/wave-contract-evaluators.mjs';
import {
  inspectReferenceReturnMaps,
  inspectSeedTopicReturnMaps,
  inspectWaveArtifactReturnMaps,
} from '../engine/helpers/return-map.mjs';

const bundleFlag = process.argv.indexOf('--bundle');
const bundlePath = bundleFlag >= 0 ? process.argv[bundleFlag + 1] : process.argv[2];
if (!bundlePath) {
  console.error('Usage: node inspect-wave1-output.mjs --bundle <path>');
  process.exit(2);
}

const { definition, error } = tryLoadGateDefinition('wave1-complete', null);
if (error) {
  console.log(JSON.stringify({
    check: { passed: false, wave: 'wave1', checks_run: 0, checks_failed: 0, return_map_classification: 'diagnostic-only', failed_rule_ids: [], finding_classification: { blocking: [], advisory: [], diagnostic_only: [] } },
    inspect: error.inspect || ['Wave1 gate definition could not be loaded.'],
    advice: error.advice || ['Repair the Wave1 gate definition and rerun inspect.'],
  }, null, 2));
  process.exit(2);
}

const evaluation = evaluateWave1Contract(bundlePath, definition);
let topicSlugs = [];
try { topicSlugs = (readBundlePlan(bundlePath)?.topic_registry || []).map((topic) => topic.slug); } catch { /* evaluator reports plan failure */ }
const seedMap = inspectSeedTopicReturnMaps(bundlePath, { wave: 'wave1', topicSlugs });
const artifactMap = inspectWaveArtifactReturnMaps(bundlePath, 'wave1', topicSlugs);
const referenceMap = { passed: true, inspect: [], advice: [], classification: 'diagnostic-only' };
for (const topic of topicSlugs) {
  const result = inspectReferenceReturnMaps(bundlePath, topic);
  referenceMap.inspect.push(...result.inspect);
  referenceMap.advice.push(...result.advice);
  if (!result.passed) referenceMap.passed = false;
}
referenceMap.classification = referenceMap.passed ? 'diagnostic-only' : 'blocking';

const additionalFindings = [
  ...findingsFromCheckResult(seedMap, { defaultId: 'wave1_seed_return_map' }),
  ...findingsFromCheckResult(artifactMap, { defaultId: 'wave1_artifact_return_map' }),
  ...findingsFromCheckResult(referenceMap, { defaultId: 'wave1_reference_return_map' }),
];
const returnMapClassification = seedMap.passed && artifactMap.passed && referenceMap.passed ? 'diagnostic-only' : 'blocking';
const output = projectInspectContract({ wave: 'wave1', evaluation, additionalFindings, additionalChecksRun: 1, returnMapClassification });
console.log(JSON.stringify(output, null, 2));
process.exit(output.check.passed ? 0 : 1);
