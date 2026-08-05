#!/usr/bin/env node
// @impl IOC-001
// inspect-wave0-output.mjs — side-effect-free Wave0 contract inspect
// @impl IOC-001, IOC-005, RWG-018

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

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
import { parseOperationInvocation, validateBundleDirectory } from '../engine/helpers/cli-operation-contract.mjs';

const commandFor = (bundle) => `node DEEP_RESEARCH_HARNESS/cli/inspect-wave0-output.mjs --bundle ${bundle || '<bundle-path>'}`;
const usage = `Usage:\n  ${commandFor('<bundle-path>')}`;
const invocation = parseOperationInvocation(process.argv.slice(2), {
  usage,
  forms: [{ id: 'inspect-wave0', positionals: [], options: { bundle: { required: true } } }],
});
function failInvocation(reason) {
  const finding = makeContractFinding({
    id: 'wave0_inspect_invocation_invalid',
    ruleId: 'wave0_inspect_invocation_invalid',
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: 'invocation_contract',
    surface: 'Wave0 inspect invocation --bundle',
    expected: 'Exactly one --bundle <bundle-path> pair and no positional arguments.',
    observed: 'invalid static invocation',
    missingFact: `Wave0 inspect invocation is invalid: ${reason}`,
    repairKind: 'engine_operation',
    writeTo: 'Wave0 inspect CLI invocation grammar',
    repair: 'Provide --bundle <bundle-path> and rerun Wave0 inspect.',
    detail: `[wave0_inspect_invocation_invalid] ${reason}`,
  });
  emitInspectResult(projectInspectContract({
    wave: 'wave0',
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
