#!/usr/bin/env node
// inspect-wave2-output.mjs — side-effect-free Wave2 contract inspect
// @impl IOC-003, IOC-005, REF-008, WPG-012, RWG-017, RWG-018

import { existsSync, readdirSync } from 'node:fs';
import { join, resolve as resolvePath } from 'node:path';

import { checkReferenceFormatFiles, tryLoadGateDefinition } from '../engine/helpers/gate-helpers.mjs';
import {
  buildContractEvaluation,
  emitInspectResult,
  makeContractFinding,
  projectInspectContract,
} from '../engine/helpers/wave-contract-findings.mjs';
import { evaluateWave2Contract } from '../engine/helpers/wave-contract-evaluators.mjs';
import { loadWave2FindingIndexFact } from '../engine/helpers/wave-depth-contracts.mjs';
import { buildCanonicalTopicRegistryFact } from '../engine/helpers/topic-registry-fact.mjs';
import {
  inspectReferenceReturnMaps,
  inspectSeedTopicReturnMaps,
  inspectWaveArtifactReturnMaps,
} from '../engine/helpers/return-map.mjs';

const bundleFlag = process.argv.indexOf('--bundle');
const bundlePath = bundleFlag >= 0 ? process.argv[bundleFlag + 1] : process.argv[2];
const commandFor = (bundle) => `node DPT_FRAMEWORK/cli/inspect-wave2-output.mjs --bundle ${bundle || '<bundle-path>'}`;
if (!bundlePath) {
  const finding = makeContractFinding({
    id: 'wave2_inspect_bundle_required',
    ruleId: 'wave2_inspect_bundle_required',
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: 'invocation_contract',
    surface: 'Wave2 inspect invocation --bundle',
    expected: 'A selected active bundle path supplied through --bundle.',
    observed: 'argument absent',
    missingFact: 'Required Wave2 inspect invocation argument --bundle is missing.',
    repairKind: 'engine_operation',
    writeTo: 'Wave2 inspect invocation argument --bundle',
    repair: 'Provide --bundle <bundle-path> and rerun Wave2 inspect.',
    detail: '[wave2_inspect_bundle_required] Missing required argument: --bundle <bundle-path>',
  });
  emitInspectResult(projectInspectContract({
    wave: 'wave2',
    evaluation: buildContractEvaluation({ findings: [finding] }),
    checkpointCommand: commandFor(null),
  }), 2);
}

const resolvedBundlePath = resolvePath(bundlePath);
const checkpointCommand = commandFor(resolvedBundlePath);

const { definition, error } = tryLoadGateDefinition('wave2-complete', null);
if (error) {
  emitInspectResult(projectInspectContract({
    wave: 'wave2',
    evaluation: buildContractEvaluation({ findings: error.findings || [] }),
    checkpointCommand,
  }), 2);
}

let topicRegistryFact = null;
try { topicRegistryFact = buildCanonicalTopicRegistryFact(resolvedBundlePath); } catch { /* evaluator owns plan prerequisite */ }
const findingIndexFact = loadWave2FindingIndexFact(resolvedBundlePath);
const evaluation = evaluateWave2Contract(resolvedBundlePath, definition, { topicRegistryFact, findingIndexFact });
const additionalFindings = [];
let additionalChecksRun = 1;
const referencePath = join(resolvedBundlePath, 'reference');
if (existsSync(join(referencePath, '00_shared'))) {
  additionalFindings.push(makeContractFinding({
    id: 'legacy_00_shared_directory',
    classification: 'advisory',
    surface: 'reference/00_shared/',
    detail: 'reference/00_shared/: legacy subdirectory should be replaced by flat reference/00-cross-*.md files',
    repair: 'Move relevant projections to flat 00-cross-<slug>.md files and remove the legacy directory.',
  }));
}

const crossFiles = existsSync(referencePath) ? readdirSync(referencePath).filter((file) => file.startsWith('00-cross-') && file.endsWith('.md')) : [];
const crossReferenceFiles = crossFiles.map((file) => ({
  relPath: `reference/${file}`,
  absPath: join(referencePath, file),
}));
const crossPresentation = checkReferenceFormatFiles(crossReferenceFiles, { bundlePath: resolvedBundlePath });
additionalChecksRun += 1;
additionalFindings.push(...crossPresentation.findings.map((finding) => makeContractFinding({
  ...finding,
  classification: 'advisory',
})));

const seedMap = inspectSeedTopicReturnMaps(resolvedBundlePath, { wave: 'wave2', topicRegistryFact, findingIndexFact });
const artifactMap = inspectWaveArtifactReturnMaps(resolvedBundlePath, 'wave2');
const referenceMap = inspectReferenceReturnMaps(resolvedBundlePath, '00-cross-');
additionalChecksRun += 1;
additionalFindings.push(...(seedMap.findings || []));
additionalFindings.push(...(artifactMap.findings || []));
additionalFindings.push(...(referenceMap.findings || []));
const returnMapClassification = seedMap.passed && artifactMap.passed && referenceMap.passed ? 'diagnostic-only' : 'blocking';

const output = projectInspectContract({ wave: 'wave2', evaluation, additionalFindings, additionalChecksRun, returnMapClassification, checkpointCommand });
emitInspectResult(output, output.check.passed ? 0 : 1);
