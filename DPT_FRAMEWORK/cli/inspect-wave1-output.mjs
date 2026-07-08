#!/usr/bin/env node
// inspect-wave1-output.mjs — wave 1 structural lint
// @impl IOC-002, REF-001, REF-008, WPG-012, RWG-017
// Usage: node inspect-wave1-output.mjs --bundle <path>

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  checkReferenceIndexCoverage,
  classifyReferenceAuthority,
  readBundlePlan,
} from '../engine/helpers/gate-helpers.mjs';
import {
  inspectReferenceReturnMaps,
  inspectSeedTopicReturnMaps,
  inspectWaveArtifactReturnMaps,
} from '../engine/helpers/return-map.mjs';

const BUNDLE = process.argv[3] || process.argv[2];
const bundlePath = BUNDLE;

if (!bundlePath) {
  console.error('Usage: node inspect-wave1-output.mjs --bundle <path>');
  process.exit(2);
}

const inspect = [];
const advice = [];
let checksRun = 0;
let checksFailed = 0;

function addIssue(msg, fix) { inspect.push(msg); if (fix) advice.push(fix); checksFailed++; }
function inc() { checksRun++; }

function readMdFile(path) {
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf-8');
}

function parseMetadataBlock(content) {
  // Parses bullet-list metadata: `- key: value` lines before the first `## ` header.
  // Format per shared-reference-template.md.
  const keys = {};
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.trim().startsWith('## ')) break;
    const m = line.match(/^-\s+([^:]+):\s*(.*)$/);
    if (m) keys[m[1].trim()] = m[2];
  }
  return keys;
}

const REQUIRED_META = ['source_url','acceptance_status','source_type','tier','evidence_role','trust_level','why_it_matters','accessed_at','related_topic'];
const REQUIRED_SECTIONS = ['## Key Facts','## Core Content Capture','## Relevance To This Research','## Quotable Terms / Concepts','## Risks And Limitations'];

function referenceDiagnosticLabel(classification) {
  return classification?.authority === 'delegated_bypass' || /^delegated_bypass\b/.test(classification?.reason || '')
    ? 'delegated_bypass'
    : 'projection_backing_drift';
}

// ---- Get topic registry ----
let registry = [];
try {
  const plan = readBundlePlan(bundlePath);
  registry = plan?.topic_registry || [];
} catch (e) {
  addIssue(`rb_plan.md: cannot read topic_registry: ${e.message}`);
}

if (registry.length === 0) {
  addIssue('topic_registry: empty or missing — cannot verify per-topic wave1 artifacts.');
} else {
  const refPath = join(bundlePath, 'reference');
  const discoveredTopicRefs = [];

  for (const topic of registry) {

    // 1. Per-topic reference/{topic.slug}*.md existence
    inc();
    const allFiles = existsSync(refPath) ? readdirSync(refPath) : [];
    const topicRefs = allFiles.filter(f => f.startsWith(topic.slug) && f.endsWith('.md'));
    if (topicRefs.length === 0) {
      addIssue(`topic ${topic.slug}: no reference/${topic.slug}*.md files found`,
        `Create at least one reference/${topic.slug}-<qualifier>.md per shared-reference-template.md.`);
    }

    // 2. Metadata + sections on each {topic.slug}*.md
    for (const f of topicRefs) {
      const fp = join(refPath, f);
      const content = readMdFile(fp);
      if (!content) continue;
      discoveredTopicRefs.push({ relPath: `reference/${f}`, absPath: fp });

      inc();
      const meta = parseMetadataBlock(content);
      for (const key of REQUIRED_META) {
        if (!(key in meta)) {
          addIssue(`reference/${f}: metadata block missing required key '${key}'`);
        }
      }

      // Check for placeholder source_url
      inc();
      const srcUrl = (meta.source_url || '').toLowerCase().trim();
      const placeholderDomains = ['example.com', 'placeholder.com', 'fake-url.com', 'test.com'];
      if (placeholderDomains.some(d => srcUrl.includes(d))) {
        addIssue(`reference/${f}: placeholder source_url detected ("${meta.source_url || '(empty)'}") — file does not reference a real web source`,
          `Delete reference/${f} and either find a real source with WebSearch+WebFetch, or write artifacts/wave1/${topic.slug}/suppl-failure-r{N}.md documenting why no new sources could be found.`);
      }

      inc();
      for (const sec of REQUIRED_SECTIONS) {
        if (!content.includes(sec)) {
          addIssue(`reference/${f}: missing section '${sec}'`);
        }
      }

      inc();
      const classification = classifyReferenceAuthority(bundlePath, `reference/${f}`);
      if (!classification.passed) {
        addIssue(`[${referenceDiagnosticLabel(classification)}] reference/${f}: ${classification.reason}`,
          'Repair through submitted wave1_topic_deepening source/cache/degraded backing, or remove the unbacked reference projection.');
      }
    }

    // 3. evidence-summary per topic
    inc();
    const evPath = join(bundlePath, 'artifacts', 'wave1', topic.slug, 'evidence-summary.md');
    if (!existsSync(evPath)) {
      addIssue(`artifacts/wave1/${topic.slug}/evidence-summary.md: file not found`);
    }

    // 4. question-list per topic
    inc();
    const qlPath = join(bundlePath, 'artifacts', 'wave1', topic.slug, 'question-list.md');
    if (!existsSync(qlPath)) {
      addIssue(`artifacts/wave1/${topic.slug}/question-list.md: file not found`);
    }
  }

  // 5. _INDEX.md has matching wave1_topic rows for consumer navigation
  inc();
  const indexResult = checkReferenceIndexCoverage(bundlePath, discoveredTopicRefs, { sourceLayer: 'wave1_topic' });
  if (!indexResult.passed) {
    for (const line of indexResult.inspect) addIssue(line);
    for (const fix of indexResult.advice || []) advice.push(fix);
  }
}

// ---- 6. Diagnostic-only return map shape ----
inc();
const topicSlugs = registry.map((topic) => topic.slug);
const seedMap = inspectSeedTopicReturnMaps(bundlePath, { wave: 'wave1', topicSlugs });
const artifactMap = inspectWaveArtifactReturnMaps(bundlePath, 'wave1', topicSlugs);
let referenceInspect = { passed: true, inspect: [], advice: [] };
for (const topic of topicSlugs) {
  const result = inspectReferenceReturnMaps(bundlePath, topic);
  referenceInspect.inspect.push(...result.inspect);
  referenceInspect.advice.push(...result.advice);
  if (!result.passed) referenceInspect.passed = false;
}
for (const line of [...seedMap.inspect, ...artifactMap.inspect, ...referenceInspect.inspect]) inspect.push(line);
for (const line of [...seedMap.advice, ...artifactMap.advice, ...referenceInspect.advice]) advice.push(line);
if (!seedMap.passed || !artifactMap.passed || !referenceInspect.passed) checksFailed++;

console.log(JSON.stringify({
  check: { passed: checksFailed === 0, wave: 'wave1', checks_run: checksRun, checks_failed: checksFailed, return_map_diagnostic_only: true },
  inspect,
  advice,
}, null, 2));

process.exit(checksFailed === 0 ? 0 : 1);
