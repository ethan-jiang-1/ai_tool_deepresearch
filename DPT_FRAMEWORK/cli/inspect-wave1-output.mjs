#!/usr/bin/env node
// inspect-wave1-output.mjs — wave 1 structural lint
// @impl IOC-002
// Usage: node inspect-wave1-output.mjs --bundle <path>

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { readBundlePlan } from '../engine/helpers/gate-helpers.mjs';

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

function numericId(topic) {
  // Extract numeric prefix: "topic-03" → "03", or from slug "03_china" → "03"
  if (topic.id) {
    const m = topic.id.match(/(\d+)$/);
    if (m) return m[1];
  }
  if (topic.slug) {
    const m = topic.slug.match(/^(\d+)_/);
    if (m) return m[1];
  }
  return null;
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

  for (const topic of registry) {
    const numId = numericId(topic);
    if (!numId) {
      addIssue(`topic_registry entry '${topic.slug}': cannot extract numeric id`,
        `Ensure topic.id (e.g., "topic-03") or slug (e.g., "03_slug") has a numeric prefix.`);
      continue;
    }

    // 1. Per-topic reference/0N-*.md existence
    inc();
    const allFiles = existsSync(refPath) ? readdirSync(refPath) : [];
    const topicRefs = allFiles.filter(f => f.startsWith(`${numId}-`) && f.endsWith('.md'));
    if (topicRefs.length === 0) {
      addIssue(`topic ${numId}: no reference/${numId}-*.md files found`,
        `Create at least one reference/${numId}-<slug>.md per shared-reference-template.md.`);
    }

    // 2. Metadata + sections on each 0N-*.md
    for (const f of topicRefs) {
      const fp = join(refPath, f);
      const content = readMdFile(fp);
      if (!content) continue;

      inc();
      const meta = parseMetadataBlock(content);
      for (const key of REQUIRED_META) {
        if (!(key in meta)) {
          addIssue(`reference/${f}: metadata block missing required key '${key}'`);
        }
      }

      inc();
      for (const sec of REQUIRED_SECTIONS) {
        if (!content.includes(sec)) {
          addIssue(`reference/${f}: missing section '${sec}'`);
        }
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

  // 5. _INDEX.md has wave1_topic entries
  inc();
  const indexContent = readMdFile(join(bundlePath, 'reference', '_INDEX.md'));
  if (indexContent && !indexContent.includes('wave1_topic')) {
    addIssue('_INDEX.md: no row with source_layer: wave1_topic',
      'Add entries for wave1-produced reference files with source_layer column value "wave1_topic".');
  }
}

console.log(JSON.stringify({
  check: { passed: checksFailed === 0, wave: 'wave1', checks_run: checksRun, checks_failed: checksFailed },
  inspect,
  advice,
}, null, 2));

process.exit(checksFailed === 0 ? 0 : 1);
