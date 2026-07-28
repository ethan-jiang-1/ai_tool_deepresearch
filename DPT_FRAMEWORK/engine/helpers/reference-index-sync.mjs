// @impl REF-003, REF-008, RWG-018
// Deterministic reference inventory renderer and its narrow CAS synchronizer.

import { mkdirSync, mkdtempSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { persistBundleFile, sha256File } from './artifact-persistence.mjs';
import { parseReferenceMetadata } from './gate-helpers-checks.mjs';
import { readBundlePlan } from './gate-helpers-readers.mjs';
import { evaluateTopicLayouts, resolveReferenceTopicBinding } from './topic-layout.mjs';
import { validateIndexMD } from '../../schema/contracts/reference.mjs';

const INDEX_TARGET = 'reference/_INDEX.md';
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const COLUMNS = ['ref_file', 'source_type', 'trust_level', 'tier', 'related_topic', 'source_layer', 'acceptance_status', 'date_landed'];

function blocked(reason_code, reason, detail = {}) {
  return { verdict: 'blocked', reason_code, reason, target: INDEX_TARGET, ...detail };
}

function referenceFiles(bundlePath) {
  const root = join(bundlePath, 'reference');
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md') && entry.name !== '_INDEX.md' && entry.name !== 'README.md')
    .map((entry) => `reference/${entry.name}`)
    .sort();
}

function safeCell(value) {
  return String(value || '').replaceAll('|', '\\|').replace(/[\r\n]+/g, ' ').trim();
}

function existingDates(bundlePath) {
  const indexPath = join(bundlePath, INDEX_TARGET);
  if (!existsSync(indexPath)) return new Map();
  const content = readFileSync(indexPath, 'utf8');
  if (!validateIndexMD(content).valid) return new Map();
  const header = content.split(/\r?\n/).find((line) => line.includes('| ref_file |'));
  if (!header) return new Map();
  const rows = new Map();
  for (const line of content.split(/\r?\n/)) {
    if (!line.trim().startsWith('|') || line.includes('| ref_file |') || /^\|[\s|:-]+\|\s*$/.test(line.trim())) continue;
    const cells = line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
    if (cells.length === COLUMNS.length && DATE.test(cells[7])) rows.set(cells[0], cells[7]);
  }
  return rows;
}

function sourceLayer(relPath, metadata, layouts) {
  if (/^reference\/00-shared-[^/]+\.md$/.test(relPath)) return { ok: true, source_layer: 'wave0_foundation' };
  if (/^reference\/00-cross-[^/]+\.md$/.test(relPath)) return { ok: true, source_layer: 'wave2_cross' };
  const binding = resolveReferenceTopicBinding(layouts, metadata);
  if (!binding.ok || binding.all || binding.topic_uids.length !== 1) {
    return {
      ok: false,
      reason_code: 'reference_index_layer_unclassifiable',
      reason: `${relPath} does not resolve to exactly one canonical or accepted historical Topic binding.`,
    };
  }
  return { ok: true, source_layer: 'wave1_topic' };
}

export function renderReferenceIndex(bundlePath, { syncDate = new Date().toISOString().slice(0, 10) } = {}) {
  if (!DATE.test(syncDate)) return blocked('sync_date_invalid', 'syncDate must be YYYY-MM-DD.');
  let layouts;
  let plan;
  try {
    plan = readBundlePlan(bundlePath);
    layouts = evaluateTopicLayouts(plan.topic_registry || []);
  } catch (error) {
    return blocked('reference_index_topic_registry_invalid', `Cannot read canonical Topic registry: ${error.message}`);
  }
  const dates = existingDates(bundlePath);
  const rows = [];
  for (const relPath of referenceFiles(bundlePath)) {
    let content;
    try {
      content = readFileSync(join(bundlePath, relPath), 'utf8');
    } catch (error) {
      return blocked('reference_index_reference_unreadable', `Cannot read ${relPath}: ${error.message}`, { ref_file: relPath });
    }
    const metadata = parseReferenceMetadata(content);
    const classification = sourceLayer(relPath, metadata, layouts);
    if (!classification.ok) return { ...blocked(classification.reason_code, classification.reason, { ref_file: relPath }), metadata: Object.fromEntries(metadata) };
    rows.push({
      ref_file: relPath,
      source_type: metadata.get('source_type') || '',
      trust_level: metadata.get('trust_level') || '',
      tier: metadata.get('tier') || '',
      related_topic: metadata.get('related_topic') || metadata.get('related_topic_uid') || '',
      source_layer: classification.source_layer,
      acceptance_status: metadata.get('acceptance_status') || '',
      date_landed: dates.get(relPath) || syncDate,
    });
  }
  const name = safeCell(plan?.plan_basename || plan?.name || 'research-bundle');
  const body = [
    `# Reference Index - ${name}`,
    '',
    '> Canonical machine-readable inventory of committed flat reference files.',
    '',
    `- **Run:** ${name}`,
    `- **Last updated:** ${syncDate}`,
    `- **Reference count:** ${rows.length}`,
    '',
    `| ${COLUMNS.join(' | ')} |`,
    `| ${COLUMNS.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${COLUMNS.map((column) => safeCell(row[column])).join(' | ')} |`),
    '',
  ].join('\n');
  return { ok: true, target: INDEX_TARGET, bytes: body, rows };
}

export function syncReferenceIndex(bundlePath, options = {}) {
  const rendered = renderReferenceIndex(bundlePath, options);
  if (!rendered.ok) return rendered;
  const targetPath = join(bundlePath, INDEX_TARGET);
  const current = existsSync(targetPath) ? readFileSync(targetPath, 'utf8') : null;
  if (current === rendered.bytes) {
    return { verdict: 'unchanged', reason_code: 'unchanged', reason: 'Rendered reference index already matches the current target.', target: INDEX_TARGET, rows: rendered.rows.length };
  }
  const stagingRoot = join(bundlePath, '_diagnostics');
  mkdirSync(stagingRoot, { recursive: true });
  const stagingPath = mkdtempSync(join(stagingRoot, 'reference-index-sync-'));
  const sourcePath = join(stagingPath, '_INDEX.md');
  try {
    writeFileSync(sourcePath, rendered.bytes, 'utf8');
    const persisted = persistBundleFile({
      bundlePath,
      sourcePath,
      target: INDEX_TARGET,
      expectedTarget: current === null ? { kind: 'absent' } : { kind: 'sha256', value: sha256File(targetPath) },
      hooks: options.persistenceHooks || null,
    });
    return persisted.verdict === 'committed'
      ? { verdict: 'committed', reason_code: 'committed', reason: persisted.reason, target: INDEX_TARGET, rows: rendered.rows.length, operation_id: persisted.operation_id }
      : { verdict: 'blocked', reason_code: persisted.reason_code, reason: persisted.reason, target: INDEX_TARGET };
  } catch (error) {
    return blocked('reference_index_sync_failed', error.message);
  } finally {
    rmSync(stagingPath, { recursive: true, force: true });
  }
}
