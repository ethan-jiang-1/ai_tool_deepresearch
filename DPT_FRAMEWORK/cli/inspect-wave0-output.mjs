#!/usr/bin/env node
// @impl IOC-001
// inspect-wave0-output.mjs — side-effect-free Wave0 contract inspect
// @impl IOC-001, IOC-005, RWG-018

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve as resolvePath } from 'node:path';

import {
  checkReferenceFormatFiles,
  tryLoadGateDefinition,
} from '../engine/helpers/gate-helpers.mjs';
import {
  buildContractEvaluation,
  emitInspectResult,
  makeContractFinding,
  projectInspectContract,
} from '../engine/helpers/wave-contract-findings.mjs';
import { evaluateWave0Contract } from '../engine/helpers/wave-contract-evaluators.mjs';
import { evaluateSeedTopicProjectionReadiness } from '../engine/helpers/return-map.mjs';
import { buildCanonicalTopicRegistryFact } from '../engine/helpers/topic-registry-fact.mjs';
import { validateIndexMD } from '../schema/contracts/reference.mjs';

const bundleFlag = process.argv.indexOf('--bundle');
const bundlePath = bundleFlag >= 0 ? process.argv[bundleFlag + 1] : process.argv[2];
const commandFor = (bundle) => `node DPT_FRAMEWORK/cli/inspect-wave0-output.mjs --bundle ${bundle || '<bundle-path>'}`;
if (!bundlePath) {
  const finding = makeContractFinding({
    id: 'wave0_inspect_bundle_required',
    ruleId: 'wave0_inspect_bundle_required',
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: 'invocation_contract',
    surface: 'Wave0 inspect invocation --bundle',
    expected: 'A selected active bundle path supplied through --bundle.',
    observed: 'argument absent',
    missingFact: 'Required Wave0 inspect invocation argument --bundle is missing.',
    repairKind: 'engine_operation',
    writeTo: 'Wave0 inspect invocation argument --bundle',
    repair: 'Provide --bundle <bundle-path> and rerun Wave0 inspect.',
    detail: '[wave0_inspect_bundle_required] Missing required argument: --bundle <bundle-path>',
  });
  emitInspectResult(projectInspectContract({
    wave: 'wave0',
    evaluation: buildContractEvaluation({ findings: [finding] }),
    checkpointCommand: commandFor(null),
  }), 2);
}

const resolvedBundlePath = resolvePath(bundlePath);
const checkpointCommand = commandFor(resolvedBundlePath);

const { definition, error } = tryLoadGateDefinition('wave0-complete', null);
if (error) {
  emitInspectResult(projectInspectContract({
    wave: 'wave0',
    evaluation: buildContractEvaluation({ findings: error.findings || [] }),
    checkpointCommand,
  }), 2);
}

let topicRegistryFact = null;
try { topicRegistryFact = buildCanonicalTopicRegistryFact(resolvedBundlePath); } catch { /* evaluator owns plan prerequisite */ }
const evaluation = evaluateWave0Contract(resolvedBundlePath, definition, { topicRegistryFact });
const additionalFindings = [];
let additionalChecksRun = 0;
const referencePath = join(resolvedBundlePath, 'reference');
const markdownFiles = existsSync(referencePath) ? readdirSync(referencePath, { withFileTypes: true }) : [];

additionalChecksRun += 1;
for (const entry of markdownFiles.filter((candidate) => candidate.isDirectory() && !candidate.name.startsWith('.'))) {
  additionalFindings.push(makeContractFinding({
    id: `reference_flat_directory:${entry.name}`,
    ruleId: 'reference_flat_directory',
    classification: 'advisory',
    surface: `reference/${entry.name}/`,
    detail: `reference/: contains subdirectory '${entry.name}/' — directory must be flat`,
    repair: `Move ${entry.name}/ contents to flat reference/*.md files, then remove the subdirectory.`,
  }));
}

const referenceFiles = markdownFiles.filter((entry) => entry.isFile() && entry.name.endsWith('.md')).map((entry) => entry.name);
const sharedFiles = referenceFiles.filter((file) => file.startsWith('00-shared-'));
additionalChecksRun += 1;
for (const file of referenceFiles.filter((name) => !['_INDEX.md', 'README.md'].includes(name) && !name.startsWith('00-shared-'))) {
  additionalFindings.push(makeContractFinding({
    id: `reference_filename:${file}`,
    ruleId: 'reference_filename',
    classification: 'advisory',
    surface: `reference/${file}`,
    detail: `reference/${file}: filename does not match expected pattern '00-shared-<slug>.md'`,
    repair: `Rename reference/${file} to 00-shared-<slug>.md or move it out of reference/.`,
  }));
}

const sharedReferenceFiles = sharedFiles.map((file) => ({
  relPath: `reference/${file}`,
  absPath: join(referencePath, file),
}));
const referencePresentation = checkReferenceFormatFiles(sharedReferenceFiles, { bundlePath: resolvedBundlePath });
additionalChecksRun += 1;
additionalFindings.push(...referencePresentation.findings.map((finding) => makeContractFinding({
  ...finding,
  classification: 'advisory',
})));

additionalChecksRun += 1;
const indexPath = join(referencePath, '_INDEX.md');
if (existsSync(indexPath)) {
  const validation = validateIndexMD(readFileSync(indexPath, 'utf8'));
  for (const [index, detail] of validation.errors.entries()) {
    additionalFindings.push(makeContractFinding({
      id: `reference_index_presentation:${index}`,
      ruleId: 'reference_index_presentation',
      classification: 'advisory',
      surface: 'reference/_INDEX.md',
      detail,
      repair: 'Repair the accepted eight-column reference index table.',
    }));
  }
}
const readmePath = join(referencePath, 'README.md');
if (existsSync(readmePath) && readFileSync(readmePath, 'utf8').trim().length === 0) {
  additionalFindings.push(makeContractFinding({ id: 'reference_readme_non_empty', classification: 'advisory', surface: 'reference/README.md', detail: 'reference/README.md: file is empty', repair: 'Describe the flat reference directory convention.' }));
}

const seedMap = evaluateSeedTopicProjectionReadiness(resolvedBundlePath, { wave: 'wave0', topicRegistryFact });
additionalChecksRun += 1;
additionalFindings.push(...(seedMap.findings || []));
const returnMapClassification = seedMap.classification;

const output = projectInspectContract({ wave: 'wave0', evaluation, additionalFindings, additionalChecksRun, returnMapClassification, checkpointCommand });
emitInspectResult(output, output.check.passed ? 0 : 1);
