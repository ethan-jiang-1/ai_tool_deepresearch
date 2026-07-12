#!/usr/bin/env node
// @impl IOC-001
// inspect-wave0-output.mjs — side-effect-free Wave0 contract inspect
// @impl IOC-001, IOC-005, RWG-018

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { tryLoadGateDefinition, readBundlePlan } from '../engine/helpers/gate-helpers.mjs';
import {
  findingsFromCheckResult,
  makeContractFinding,
  projectInspectContract,
} from '../engine/helpers/wave-contract-findings.mjs';
import { evaluateWave0Contract } from '../engine/helpers/wave-contract-evaluators.mjs';
import { inspectReferenceReturnMaps, inspectSeedTopicReturnMaps } from '../engine/helpers/return-map.mjs';

const bundleFlag = process.argv.indexOf('--bundle');
const bundlePath = bundleFlag >= 0 ? process.argv[bundleFlag + 1] : process.argv[2];
if (!bundlePath) {
  console.error('Usage: node inspect-wave0-output.mjs --bundle <path>');
  process.exit(2);
}

const { definition, error } = tryLoadGateDefinition('wave0-complete', null);
if (error) {
  console.log(JSON.stringify({
    check: { passed: false, wave: 'wave0', checks_run: 0, checks_failed: 0, return_map_classification: 'diagnostic-only', failed_rule_ids: [], finding_classification: { blocking: [], advisory: [], diagnostic_only: [] } },
    inspect: error.inspect || ['Wave0 gate definition could not be loaded.'],
    advice: error.advice || ['Repair the Wave0 gate definition and rerun inspect.'],
  }, null, 2));
  process.exit(2);
}

const evaluation = evaluateWave0Contract(bundlePath, definition);
const additionalFindings = [];
let additionalChecksRun = 0;
const referencePath = join(bundlePath, 'reference');
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

const metadataKeys = ['source_url', 'acceptance_status', 'source_type', 'tier', 'evidence_role', 'trust_level', 'why_it_matters', 'accessed_at', 'related_topic'];
const sections = ['Key Facts', 'Core Content Capture', 'Relevance To This Research', 'Quotable Terms / Concepts', 'Risks And Limitations'];
for (const file of sharedFiles) {
  const content = readFileSync(join(referencePath, file), 'utf8');
  const beforeSection = content.split(/^##\s+/m)[0] || '';
  const metadata = new Set([...beforeSection.matchAll(/^\s*-\s*([A-Za-z0-9_]+)\s*:/gm)].map((match) => match[1]));
  additionalChecksRun += 2;
  for (const key of metadataKeys.filter((candidate) => !metadata.has(candidate))) {
    additionalFindings.push(makeContractFinding({
      id: `reference_metadata:${file}:${key}`,
      ruleId: 'reference_metadata',
      classification: 'advisory',
      surface: `reference/${file}`,
      detail: `reference/${file}: metadata block missing required key '${key}'`,
      repair: `Add '- ${key}: <value>' before the first Markdown section.`,
    }));
  }
  const headings = new Set([...content.matchAll(/^#{1,6}\s+(.+?)\s*$/gm)].map((match) => match[1].trim().toLowerCase()));
  for (const section of sections.filter((candidate) => !headings.has(candidate.toLowerCase()))) {
    additionalFindings.push(makeContractFinding({
      id: `reference_section:${file}:${section}`,
      ruleId: 'reference_section',
      classification: 'advisory',
      surface: `reference/${file}`,
      detail: `reference/${file}: missing semantic section '${section}'`,
      repair: `Add a '${section}' section with the relevant content.`,
    }));
  }
}

additionalChecksRun += 2;
const indexPath = join(referencePath, '_INDEX.md');
if (existsSync(indexPath)) {
  const content = readFileSync(indexPath, 'utf8');
  const header = content.split(/\r?\n/).find((line) => line.includes('ref_file')) || '';
  for (const column of ['ref_file', 'source_type', 'trust_level', 'tier', 'related_topic', 'source_layer', 'acceptance_status', 'date_landed']) {
    if (!header.includes(column)) {
      additionalFindings.push(makeContractFinding({ id: `reference_index_column:${column}`, ruleId: 'reference_index_columns', classification: 'advisory', surface: 'reference/_INDEX.md', detail: `_INDEX.md: table header missing expected column '${column}'`, repair: `Add '${column}' to the reference index table.` }));
    }
  }
}
const readmePath = join(referencePath, 'README.md');
if (existsSync(readmePath) && readFileSync(readmePath, 'utf8').trim().length === 0) {
  additionalFindings.push(makeContractFinding({ id: 'reference_readme_non_empty', classification: 'advisory', surface: 'reference/README.md', detail: 'reference/README.md: file is empty', repair: 'Describe the flat reference directory convention.' }));
}

let topicSlugs = [];
try { topicSlugs = (readBundlePlan(bundlePath)?.topic_registry || []).map((topic) => topic.slug); } catch { /* evaluator reports plan failure */ }
const seedMap = inspectSeedTopicReturnMaps(bundlePath, { wave: 'wave0', topicSlugs });
const referenceMap = inspectReferenceReturnMaps(bundlePath, '00-shared-');
additionalChecksRun += 1;
additionalFindings.push(...findingsFromCheckResult(seedMap, { defaultId: 'wave0_seed_return_map' }));
additionalFindings.push(...findingsFromCheckResult(referenceMap, { defaultId: 'wave0_reference_return_map' }));
const returnMapClassification = seedMap.passed && referenceMap.passed ? 'diagnostic-only' : 'blocking';

const output = projectInspectContract({ wave: 'wave0', evaluation, additionalFindings, additionalChecksRun, returnMapClassification });
console.log(JSON.stringify(output, null, 2));
process.exit(output.check.passed ? 0 : 1);
