#!/usr/bin/env node
// inspect-wave2-output.mjs — side-effect-free Wave2 contract inspect
// @impl IOC-003, IOC-005, REF-008, WPG-012, RWG-017, RWG-018

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve as resolvePath } from 'node:path';

import { tryLoadGateDefinition } from '../engine/helpers/gate-helpers.mjs';
import {
  buildContractEvaluation,
  emitInspectResult,
  makeContractFinding,
  projectInspectContract,
} from '../engine/helpers/wave-contract-findings.mjs';
import { evaluateWave2Contract } from '../engine/helpers/wave-contract-evaluators.mjs';
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

const evaluation = evaluateWave2Contract(resolvedBundlePath, definition);
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

const metadataKeys = ['source_url', 'acceptance_status', 'source_type', 'tier', 'evidence_role', 'trust_level', 'why_it_matters', 'accessed_at', 'related_topic'];
const sections = ['Key Facts', 'Core Content Capture', 'Relevance To This Research', 'Quotable Terms / Concepts', 'Risks And Limitations'];
const crossFiles = existsSync(referencePath) ? readdirSync(referencePath).filter((file) => file.startsWith('00-cross-') && file.endsWith('.md')) : [];
for (const file of crossFiles) {
  const content = readFileSync(join(referencePath, file), 'utf8');
  const beforeSection = content.split(/^#{1,6}\s+/m)[0] || '';
  const metadata = new Set([...beforeSection.matchAll(/^\s*-\s*([A-Za-z0-9_]+)\s*:/gm)].map((match) => match[1]));
  const headings = new Set([...content.matchAll(/^#{1,6}\s+(.+?)\s*$/gm)].map((match) => match[1].trim().toLowerCase()));
  additionalChecksRun += 2;
  for (const key of metadataKeys.filter((candidate) => !metadata.has(candidate))) {
    additionalFindings.push(makeContractFinding({ id: `cross_metadata:${file}:${key}`, ruleId: 'cross_reference_presentation', classification: 'advisory', surface: `reference/${file}`, detail: `reference/${file}: metadata block missing expected key '${key}'`, repair: `Add '- ${key}: <value>' when maintaining the canonical cross-reference presentation.` }));
  }
  for (const section of sections.filter((candidate) => !headings.has(candidate.toLowerCase()))) {
    additionalFindings.push(makeContractFinding({ id: `cross_section:${file}:${section}`, ruleId: 'cross_reference_presentation', classification: 'advisory', surface: `reference/${file}`, detail: `reference/${file}: missing expected semantic section '${section}'`, repair: `Add a '${section}' section when maintaining the canonical cross-reference presentation.` }));
  }
}

const seedMap = inspectSeedTopicReturnMaps(resolvedBundlePath, { wave: 'wave2' });
const artifactMap = inspectWaveArtifactReturnMaps(resolvedBundlePath, 'wave2');
const referenceMap = inspectReferenceReturnMaps(resolvedBundlePath, '00-cross-');
additionalChecksRun += 1;
additionalFindings.push(...(seedMap.findings || []));
additionalFindings.push(...(artifactMap.findings || []));
additionalFindings.push(...(referenceMap.findings || []));
const returnMapClassification = seedMap.passed && artifactMap.passed && referenceMap.passed ? 'diagnostic-only' : 'blocking';

const output = projectInspectContract({ wave: 'wave2', evaluation, additionalFindings, additionalChecksRun, returnMapClassification, checkpointCommand });
emitInspectResult(output, output.check.passed ? 0 : 1);
