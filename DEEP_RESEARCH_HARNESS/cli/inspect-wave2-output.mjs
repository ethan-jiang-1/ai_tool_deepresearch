#!/usr/bin/env node
// inspect-wave2-output.mjs — side-effect-free Wave2 contract inspect
// @impl IOC-003, IOC-005, REF-008, WPG-012, RWG-017, RWG-018

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { tryLoadGateDefinition } from '../engine/helpers/gate-helpers.mjs';
import {
  buildContractEvaluation,
  emitInspectResult,
  makeContractFinding,
  projectInspectContract,
} from '../engine/helpers/wave-contract-findings.mjs';
import { evaluateWave2Contract } from '../engine/helpers/wave-contract-evaluators.mjs';
import { loadWave2FindingIndexFact } from '../engine/helpers/wave-depth-contracts.mjs';
import { buildCanonicalTopicRegistryFact } from '../engine/helpers/topic-registry-fact.mjs';
import { evaluateSeedTopicProjectionReadiness } from '../engine/helpers/return-map.mjs';
import { parseOperationInvocation, validateBundleDirectory } from '../engine/helpers/cli-operation-contract.mjs';

const commandFor = (bundle) => `node DEEP_RESEARCH_HARNESS/cli/inspect-wave2-output.mjs --bundle ${bundle || '<bundle-path>'}`;
const usage = `Usage:\n  ${commandFor('<bundle-path>')}`;
const invocation = parseOperationInvocation(process.argv.slice(2), {
  usage,
  forms: [{ id: 'inspect-wave2', positionals: [], options: { bundle: { required: true } } }],
});
function failInvocation(reason) {
  const finding = makeContractFinding({
    id: 'wave2_inspect_invocation_invalid',
    ruleId: 'wave2_inspect_invocation_invalid',
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: 'invocation_contract',
    surface: 'Wave2 inspect invocation --bundle',
    expected: 'Exactly one --bundle <bundle-path> pair and no positional arguments.',
    observed: 'invalid static invocation',
    missingFact: `Wave2 inspect invocation is invalid: ${reason}`,
    repairKind: 'engine_operation',
    writeTo: 'Wave2 inspect CLI invocation grammar',
    repair: 'Provide --bundle <bundle-path> and rerun Wave2 inspect.',
    detail: `[wave2_inspect_invocation_invalid] ${reason}`,
  });
  emitInspectResult(projectInspectContract({
    wave: 'wave2',
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

const seedMap = evaluateSeedTopicProjectionReadiness(resolvedBundlePath, { wave: 'wave2', topicRegistryFact, findingIndexFact });
additionalChecksRun += 1;
additionalFindings.push(...(seedMap.findings || []));
const returnMapClassification = seedMap.classification;

const output = projectInspectContract({ wave: 'wave2', evaluation, additionalFindings, additionalChecksRun, returnMapClassification, checkpointCommand });
emitInspectResult(output, output.check.passed ? 0 : 1);
