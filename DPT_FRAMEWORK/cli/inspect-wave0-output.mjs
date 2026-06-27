#!/usr/bin/env node
// inspect-wave0-output.mjs — wave 0 structural lint
// @impl IOC-001
// Usage: node inspect-wave0-output.mjs --bundle <path>

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { readBundlePlan } from '../engine/helpers/gate-helpers.mjs';

const BUNDLE = process.argv[3] || process.argv[2]; // handle --bundle <path> or just <path>
const bundlePath = BUNDLE;

if (!bundlePath) {
  console.error('Usage: node inspect-wave0-output.mjs --bundle <path>');
  process.exit(2);
}

const inspect = [];
const advice = [];
let checksRun = 0;
let checksFailed = 0;

// ---- helpers ----
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

// ---- 1. Flat directory ----
inc();
const refPath = join(bundlePath, 'reference');
if (existsSync(refPath)) {
  const entries = readdirSync(refPath, { withFileTypes: true });
  const subdirs = entries.filter(e => e.isDirectory() && !e.name.startsWith('.'));
  if (subdirs.length > 0) {
    for (const d of subdirs) {
      addIssue(`reference/: contains subdirectory '${d.name}/' — directory must be flat`,
        `Move ${d.name}/ contents to flat reference/*.md files, then remove the subdirectory.`);
    }
  }
}

// ---- 2. File naming ----
inc();
const allMd = existsSync(refPath) ? readdirSync(refPath).filter(f => f.endsWith('.md')) : [];
const excludeSet = new Set(['_INDEX.md','README.md']);
const refFiles = allMd.filter(f => !excludeSet.has(f));
for (const f of refFiles) {
  if (!f.startsWith('00-shared-')) {
    addIssue(`reference/${f}: filename does not match expected pattern '00-shared-<slug>.md'`,
      `Rename to 00-shared-<slug>.md or move out of reference/.`);
  }
}

// ---- 3-4. Metadata + Sections for each 00-shared-*.md ----
const sharedFiles = refFiles.filter(f => f.startsWith('00-shared-'));
for (const f of sharedFiles) {
  const fp = join(refPath, f);
  const content = readMdFile(fp);
  if (!content) continue;

  inc(); // metadata
  const meta = parseMetadataBlock(content);
  for (const key of REQUIRED_META) {
    if (!(key in meta)) {
      addIssue(`reference/${f}: metadata block missing required key '${key}'`,
        `Add '- ${key}: <value>' to the metadata block (before the first ## header).`);
    }
  }

  // Check for placeholder source_url
  inc();
  const srcUrl = (meta.source_url || '').toLowerCase().trim();
  const placeholderDomains = ['example.com', 'placeholder.com', 'fake-url.com', 'test.com'];
  if (placeholderDomains.some(d => srcUrl.includes(d))) {
    addIssue(`reference/${f}: placeholder source_url detected ("${meta.source_url || '(empty)'}") — file does not reference a real web source`,
      `Delete reference/${f} and either find a real source with WebSearch+WebFetch, or write artifacts/wave0/suppl-failure-r{N}.md documenting why no new sources could be found.`);
  }

  inc(); // sections
  for (const sec of REQUIRED_SECTIONS) {
    if (!content.includes(sec)) {
      addIssue(`reference/${f}: missing section '${sec}'`,
        `Add '${sec}' section header and content.`);
    }
  }
}

// ---- 5. _INDEX.md ----
inc();
const indexContent = readMdFile(join(bundlePath, 'reference', '_INDEX.md'));
if (!indexContent) {
  addIssue('reference/_INDEX.md: file not found', 'Create _INDEX.md with the 8-column Markdown table.');
} else {
  const headerLine = indexContent.split('\n').find(l => l.includes('ref_file'));
  if (headerLine) {
    const REQ_COLS = ['ref_file','source_type','trust_level','tier','related_topic','source_layer','acceptance_status','date_landed'];
    for (const col of REQ_COLS) {
      if (!headerLine.includes(col)) {
        addIssue(`_INDEX.md: table header missing required column '${col}'`,
          `Add '${col}' column to the _INDEX.md Markdown table.`);
      }
    }
  }
  const dataRows = indexContent.split('\n').filter(l => l.match(/^\|.+\|$/) && !l.match(/^\|[\s\-:|]+\|$/));
  if (dataRows.length < 1) addIssue('_INDEX.md: table has fewer than 1 data row', 'Add at least one reference row to the table.');
}

// ---- 6. README.md ----
inc();
const readmeContent = readMdFile(join(bundlePath, 'reference', 'README.md'));
if (!readmeContent || readmeContent.trim().length === 0) {
  addIssue('reference/README.md: file is missing or empty', 'Create README.md describing the flat reference directory convention.');
}

// ---- 7. Thin YAML per topic ----
inc();
try {
  const plan = readBundlePlan(bundlePath);
  const registry = plan?.topic_registry || [];
  if (registry.length === 0) {
    addIssue('topic_registry: empty or missing — cannot verify per-topic thin YAML.',
      'Ensure rb_plan.md frontmatter has a non-empty topic_registry.');
  }
  for (const t of registry) {
    const yamlPath = join(bundlePath, 'artifacts', 'wave0', t.slug, 'source.yaml');
    if (!existsSync(yamlPath)) {
      addIssue(`artifacts/wave0/${t.slug}/source.yaml: file not found`,
        `Create thin YAML source list for topic '${t.slug}'.`);
    }
    // schema_valid check — try parse and basic validation
    try {
      const raw = readFileSync(yamlPath, 'utf-8');
      const arr = parseYaml(raw);
      if (!Array.isArray(arr)) {
        addIssue(`artifacts/wave0/${t.slug}/source.yaml: not a YAML array`);
      } else {
        for (let i = 0; i < arr.length; i++) {
          const e = arr[i];
          if (!e?.url || !e?.title || !e?.retrieved_date || !e?.topic_tag) {
            addIssue(`artifacts/wave0/${t.slug}/source.yaml[${i}]: missing required field(s)`,
              'Each entry must have url, title, retrieved_date (YYYY-MM-DD), and topic_tag.');
            break; // one error per file is enough
          }
        }
      }
    } catch (e) {
      addIssue(`artifacts/wave0/${t.slug}/source.yaml: YAML parse error: ${e.message}`);
    }
  }
} catch (e) {
  addIssue(`rb_plan.md: cannot read topic_registry: ${e.message}`,
    'Ensure rb_plan.md has valid YAML frontmatter with topic_registry array.');
}

// ---- Output ----
console.log(JSON.stringify({
  check: { passed: checksFailed === 0, wave: 'wave0', checks_run: checksRun, checks_failed: checksFailed },
  inspect,
  advice,
}, null, 2));

process.exit(checksFailed === 0 ? 0 : 1);
