#!/usr/bin/env node
// inspect-wave2-output.mjs — wave 2 structural lint
// @impl IOC-003
// Usage: node inspect-wave2-output.mjs --bundle <path>

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

const BUNDLE = process.argv[3] || process.argv[2];
const bundlePath = BUNDLE;

if (!bundlePath) {
  console.error('Usage: node inspect-wave2-output.mjs --bundle <path>');
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
const LEDGER_SECTIONS = ['## Cross-Topic Scan Matrix','## Wave1 Legacy Questions','## Cross-Topic Resolutions','## Emergent Cross-Topic Questions','## Exploration Decisions','## HITL2 Handoff'];
const BACKFILL_TOKENS = ['__BACKFILL_WAVE2_JUDGMENT__','__BACKFILL_PENDING_QUESTIONS__'];

// ---- 1. No 00_shared/ subdirectory ----
inc();
const refPath = join(bundlePath, 'reference');
if (existsSync(refPath)) {
  const entries = readdirSync(refPath, { withFileTypes: true });
  const sharedDir = entries.find(e => e.isDirectory() && e.name === '00_shared');
  if (sharedDir) {
    addIssue('reference/00_shared/: subdirectory must be removed — cross-topic sources use reference/00-cross-*.md flat files',
      'Convert 00_shared/ contents to individual 00-cross-<slug>.md files in flat reference/, then remove the 00_shared/ directory.');
  }
}

// ---- 2. 00-cross-*.md format ----
inc();
if (existsSync(refPath)) {
  const crossFiles = readdirSync(refPath).filter(f => f.startsWith('00-cross-') && f.endsWith('.md'));
  for (const f of crossFiles) {
    const fp = join(refPath, f);
    const content = readMdFile(fp);
    if (!content) continue;

    inc();
    const meta = parseMetadataBlock(content);
    for (const key of REQUIRED_META) {
      if (!(key in meta)) addIssue(`reference/${f}: metadata block missing required key '${key}'`);
    }

    inc();
    for (const sec of REQUIRED_SECTIONS) {
      if (!content.includes(sec)) addIssue(`reference/${f}: missing section '${sec}'`);
    }
  }

  // _INDEX.md cross entries
  inc();
  const indexContent = readMdFile(join(refPath, '_INDEX.md'));
  if (crossFiles.length > 0 && indexContent && !indexContent.includes('wave2_cross')) {
    addIssue('_INDEX.md: no row with source_layer: wave2_cross for 00-cross-*.md files',
      'Add entries for 00-cross-*.md files with source_layer column value "wave2_cross".');
  }
}

// ---- 3. Wave2 triple artifacts ----
inc();
const w2path = join(bundlePath, 'artifacts', 'wave2');
const synthesisPath = join(w2path, 'synthesis.md');
if (!existsSync(synthesisPath)) {
  addIssue('artifacts/wave2/synthesis.md: file not found');
} else {
  const syn = readFileSync(synthesisPath, 'utf-8');
  if (syn.trim().length === 0) addIssue('artifacts/wave2/synthesis.md: file is empty');
}

inc();
const ledgerPath = join(w2path, 'cross-topic-ledger.md');
if (!existsSync(ledgerPath)) {
  addIssue('artifacts/wave2/cross-topic-ledger.md: file not found');
} else {
  const ldg = readFileSync(ledgerPath, 'utf-8');
  for (const sec of LEDGER_SECTIONS) {
    if (!ldg.includes(sec)) addIssue(`cross-topic-ledger.md: missing section '${sec}'`);
  }
}

inc();
const indexYamlPath = join(w2path, 'finding-index.yaml');
if (!existsSync(indexYamlPath)) {
  addIssue('artifacts/wave2/finding-index.yaml: file not found');
} else {
  try {
    parseYaml(readFileSync(indexYamlPath, 'utf-8'));
  } catch (e) {
    addIssue(`finding-index.yaml: YAML parse error: ${e.message}`);
  }
}

// ---- 4. No backfill tokens in seed_topics ----
inc();
const seedPath = join(bundlePath, 'seed_topics');
if (existsSync(seedPath)) {
  const seedFiles = readdirSync(seedPath).filter(f => f.endsWith('.md'));
  for (const f of seedFiles) {
    const content = readMdFile(join(seedPath, f));
    if (!content) continue;
    for (const token of BACKFILL_TOKENS) {
      if (content.includes(token)) {
        addIssue(`seed_topics/${f}: unreplaced backfill token '${token}'`,
          `Replace '${token}' with content projected from wave2 ledger/index.`);
      }
    }
  }
}

console.log(JSON.stringify({
  check: { passed: checksFailed === 0, wave: 'wave2', checks_run: checksRun, checks_failed: checksFailed },
  inspect,
  advice,
}, null, 2));

process.exit(checksFailed === 0 ? 0 : 1);
