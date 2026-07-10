#!/usr/bin/env node
// inspect-wave2-output.mjs — side-effect-free Wave2 contract inspect
// @impl IOC-003, IOC-005, REF-008, WPG-012, RWG-017, RWG-018

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { tryLoadGateDefinition } from '../engine/helpers/gate-helpers.mjs';
import {
  findingsFromCheckResult,
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
if (!bundlePath) {
  console.error('Usage: node inspect-wave2-output.mjs --bundle <path>');
  process.exit(2);
}

const { definition, error } = tryLoadGateDefinition('wave2-complete', null);
if (error) {
  console.log(JSON.stringify({
    check: { passed: false, wave: 'wave2', checks_run: 0, checks_failed: 0, return_map_classification: 'diagnostic-only', failed_rule_ids: [], finding_classification: { blocking: [], advisory: [], diagnostic_only: [] } },
    inspect: error.inspect || ['Wave2 gate definition could not be loaded.'],
    advice: error.advice || ['Repair the Wave2 gate definition and rerun inspect.'],
  }, null, 2));
  process.exit(2);
}

const evaluation = evaluateWave2Contract(bundlePath, definition);
const additionalFindings = [];
let additionalChecksRun = 1;
const referencePath = join(bundlePath, 'reference');
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

const seedMap = inspectSeedTopicReturnMaps(bundlePath, { wave: 'wave2' });
const artifactMap = inspectWaveArtifactReturnMaps(bundlePath, 'wave2');
const referenceMap = inspectReferenceReturnMaps(bundlePath, '00-cross-');
additionalChecksRun += 1;
additionalFindings.push(...findingsFromCheckResult(seedMap, { defaultId: 'wave2_seed_return_map' }));
additionalFindings.push(...findingsFromCheckResult(artifactMap, { defaultId: 'wave2_artifact_return_map' }));
additionalFindings.push(...findingsFromCheckResult(referenceMap, { defaultId: 'wave2_reference_return_map' }));
const returnMapClassification = seedMap.passed && artifactMap.passed && referenceMap.passed ? 'diagnostic-only' : 'blocking';

const output = projectInspectContract({ wave: 'wave2', evaluation, additionalFindings, additionalChecksRun, returnMapClassification });
console.log(JSON.stringify(output, null, 2));
process.exit(output.check.passed ? 0 : 1);
