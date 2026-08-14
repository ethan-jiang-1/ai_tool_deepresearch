// @impl REF-003, REF-004, REF-008, RWG-018
// Deterministic reference navigation renderers and narrow per-target CAS sync.

import { mkdirSync, mkdtempSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parse as parseYaml } from 'yaml';

import { persistBundleFile, sha256File } from './artifact-persistence.mjs';
import { parseReferenceMetadata } from './gate-helpers-checks.mjs';
import { readBundlePlan } from './gate-helpers-readers.mjs';
import { evaluateTopicLayouts, resolveReferenceTopicBinding } from './topic-layout.mjs';
import { checkWave1DepthReviewContract } from './wave-depth-contracts.mjs';
import { readProjectionProfileRound } from '../work-unit-projection.mjs';
import { validateIndexMD } from '../../schema/contracts/reference.mjs';

const INDEX_TARGET = 'reference/_INDEX.md';
const README_TARGET = 'reference/README.md';
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const COLUMNS = ['ref_file', 'source_type', 'trust_level', 'tier', 'related_topic', 'source_layer', 'acceptance_status', 'date_landed'];

function blocked(reason_code, reason, detail = {}, target = INDEX_TARGET) {
  return { verdict: 'blocked', reason_code, reason, target, ...detail };
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

function safeCode(value) {
  return String(value || '').replaceAll('`', '\\`').replace(/[\r\n]+/g, ' ').trim();
}

function markdownLink(label, href) {
  return `[${safeCell(label).replaceAll(']', '\\]')}](${href})`;
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
  const binding = resolveReferenceTopicBinding(layouts, metadata);
  if (!binding.ok) {
    const legacyUnsupported = binding.reason_code === 'reference_topic_binding_legacy_unsupported';
    return {
      ok: false,
      reason_code: binding.reason_code || 'reference_index_layer_unclassifiable',
      reason: legacyUnsupported
        ? `${relPath} contains retired related_topic metadata and cannot enter current reference navigation.`
        : `${relPath} has no resolvable current canonical Topic binding.`,
    };
  }
  if (/^reference\/00-shared-[^/]+\.md$/.test(relPath)) return { ok: true, source_layer: 'wave0_foundation', binding };
  if (/^reference\/00-cross-[^/]+\.md$/.test(relPath)) return { ok: true, source_layer: 'wave2_cross', binding };
  if (binding.all || binding.topic_uids.length !== 1) {
    return {
      ok: false,
      reason_code: 'reference_index_layer_unclassifiable',
      reason: `${relPath} does not resolve to exactly one canonical or accepted historical Topic binding.`,
    };
  }
  return { ok: true, source_layer: 'wave1_topic', binding };
}

function bindingNavigationLabel(binding, layouts) {
  if (binding.all) return 'all';
  return binding.topic_uids.map((topicUid) => layouts.currentByUid.get(topicUid)?.current.slug || topicUid).join(', ');
}

function loadReferenceFacts(bundlePath) {
  let layouts;
  let plan;
  try {
    plan = readBundlePlan(bundlePath);
    layouts = evaluateTopicLayouts(plan.topic_registry || []);
  } catch (error) {
    return blocked('reference_index_topic_registry_invalid', `Cannot read canonical Topic registry: ${error.message}`);
  }

  const references = [];
  for (const relPath of referenceFiles(bundlePath)) {
    let metadata;
    let classification;
    try {
      metadata = parseReferenceMetadata(readFileSync(join(bundlePath, relPath), 'utf8'));
      classification = sourceLayer(relPath, metadata, layouts);
    } catch (error) {
      metadata = new Map();
      classification = {
        ok: false,
        reason_code: 'reference_index_reference_unreadable',
        reason: `Cannot read ${relPath}: ${error.message}`,
      };
    }
    references.push({ relPath, metadata, classification });
  }
  return { ok: true, plan, layouts, references };
}

function renderReferenceIndexFromFacts(bundlePath, facts, { syncDate } = {}) {
  if (!DATE.test(syncDate)) return blocked('sync_date_invalid', 'syncDate must be YYYY-MM-DD.');
  const dates = existingDates(bundlePath);
  const rows = [];
  for (const reference of facts.references) {
    if (!reference.classification.ok) {
      return {
        ...blocked(reference.classification.reason_code, reference.classification.reason, { ref_file: reference.relPath }),
        metadata: Object.fromEntries(reference.metadata),
      };
    }
    rows.push({
      ref_file: reference.relPath,
      source_type: reference.metadata.get('source_type') || '',
      trust_level: reference.metadata.get('trust_level') || '',
      tier: reference.metadata.get('tier') || '',
      related_topic: bindingNavigationLabel(reference.classification.binding, facts.layouts),
      source_layer: reference.classification.source_layer,
      acceptance_status: reference.metadata.get('acceptance_status') || '',
      date_landed: dates.get(reference.relPath) || syncDate,
    });
  }
  const name = safeCell(facts.plan?.plan_basename || facts.plan?.name || 'research-bundle');
  const bytes = [
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
  return { ok: true, target: INDEX_TARGET, bytes, rows };
}

function referenceRelationship(reference, facts) {
  if (!reference.classification.ok) {
    return {
      relationship: 'unknown',
      topic: 'unknown',
      coordinate: `${markdownLink(reference.relPath, basename(reference.relPath))}; ${safeCode(reference.classification.reason_code)}`,
    };
  }
  if (reference.classification.source_layer === 'wave0_foundation') {
    return {
      relationship: 'shared',
      topic: 'not a canonical all-Topic identity',
      coordinate: `${markdownLink(reference.relPath, basename(reference.relPath))}; path classification`,
    };
  }
  if (reference.classification.source_layer === 'wave2_cross') {
    return {
      relationship: 'cross-Topic',
      topic: 'not a canonical all-Topic identity',
      coordinate: `${markdownLink(reference.relPath, basename(reference.relPath))}; path classification`,
    };
  }
  const topicUid = reference.classification.binding.topic_uids[0];
  const layout = facts.layouts.currentByUid.get(topicUid);
  if (!layout) {
    return {
      relationship: 'unknown',
      topic: 'unknown',
      coordinate: `${markdownLink(reference.relPath, basename(reference.relPath))}; topic_uid ${safeCode(topicUid)} unavailable`,
    };
  }
  return {
    relationship: 'Topic-specific',
    topic: `${safeCell(layout.current.slug)} (${safeCell(topicUid)})`,
    coordinate: `${markdownLink(reference.relPath, basename(reference.relPath))}; ${markdownLink('rb_plan.md', '../rb_plan.md')}#topic_registry`,
  };
}

function readDepthReview(bundlePath, topicSlug) {
  const relPath = `artifacts/wave1/${topicSlug}/depth-review.yaml`;
  const path = join(bundlePath, relPath);
  if (!existsSync(path)) return { ok: false, relPath, reason_code: 'depth_review_missing' };
  try {
    const value = parseYaml(readFileSync(path, 'utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, relPath, reason_code: 'depth_review_shape_invalid' };
    return { ok: true, relPath, review: value };
  } catch (error) {
    return { ok: false, relPath, reason_code: 'depth_review_parse_invalid', reason: error.message };
  }
}

function historicalFocusDeclaration(focus, layout, currentRerunCount) {
  if (!focus || typeof focus !== 'object' || Array.isArray(focus)) return false;
  const rootKeys = ['topic_uid', 'rerun_count', 'outcome', 'commitments'];
  if (Object.keys(focus).length !== rootKeys.length || rootKeys.some((key) => !Object.hasOwn(focus, key))) return false;
  if (focus.topic_uid !== layout.topic_uid || !Number.isInteger(focus.rerun_count)
    || focus.rerun_count < 0 || focus.rerun_count >= currentRerunCount
    || !['covered', 'partial', 'blocked'].includes(focus.outcome)
    || !Array.isArray(focus.commitments) || focus.commitments.length === 0) return false;

  const commitmentIds = new Set();
  let covered = 0;
  let limited = 0;
  for (const commitment of focus.commitments) {
    if (!commitment || typeof commitment !== 'object' || Array.isArray(commitment)) return false;
    const coveredCommitment = commitment.state === 'covered';
    const limitedCommitment = commitment.state === 'limited';
    if (!coveredCommitment && !limitedCommitment) return false;
    const expectedKeys = coveredCommitment
      ? ['id', 'statement', 'state', 'submitted_work_unit_refs']
      : ['id', 'statement', 'state', 'limitation', 'boundary_kind'];
    if (Object.keys(commitment).length !== expectedKeys.length || expectedKeys.some((key) => !Object.hasOwn(commitment, key))) return false;
    if (typeof commitment.id !== 'string' || !commitment.id.trim() || commitmentIds.has(commitment.id)
      || typeof commitment.statement !== 'string' || !commitment.statement.trim()) return false;
    commitmentIds.add(commitment.id);
    if (coveredCommitment) {
      if (!Array.isArray(commitment.submitted_work_unit_refs) || commitment.submitted_work_unit_refs.length === 0
        || commitment.submitted_work_unit_refs.some((ref) => typeof ref !== 'string' || !ref || ref.startsWith('/') || ref.split(/[\\/]+/).includes('..'))) return false;
      covered += 1;
    } else {
      if (typeof commitment.limitation !== 'string' || !commitment.limitation.trim()
        || !['external_action', 'user_decision', 'missing_contract'].includes(commitment.boundary_kind)) return false;
      limited += 1;
    }
  }
  return (focus.outcome === 'covered' && covered === focus.commitments.length)
    || (focus.outcome === 'partial' && covered > 0 && limited > 0)
    || (focus.outcome === 'blocked' && covered === 0 && limited > 0);
}

function currentFocusStatus(bundlePath, layout, currentRerunCount) {
  const depth = readDepthReview(bundlePath, layout.current.slug);
  const profileCoordinate = markdownLink('rb_profile.yaml', '../rb_profile.yaml');
  const depthCoordinate = markdownLink(depth.relPath, `../${depth.relPath}`);
  const unknown = (reasonCode) => ({
    status: 'unknown',
    detail: safeCode(reasonCode),
    coordinate: `${profileCoordinate}; ${depthCoordinate}`,
  });
  if (!depth.ok) return unknown(depth.reason_code);

  const focus = depth.review.focus_coverage;
  if (historicalFocusDeclaration(focus, layout, currentRerunCount)) {
    return {
      status: 'historical context',
      detail: `declared rerun_count ${focus.rerun_count}; current rerun_count ${currentRerunCount}`,
      coordinate: `${profileCoordinate}; ${depthCoordinate}`,
    };
  }

  let check;
  try {
    check = checkWave1DepthReviewContract(bundlePath, { topic: layout.current.slug });
  } catch (error) {
    return unknown(`depth_review_check_failed: ${error.message}`);
  }
  if (!check.passed) return unknown('depth_review_contract_invalid');
  if (!Object.hasOwn(depth.review, 'focus_coverage')) {
    return {
      status: 'not declared',
      detail: 'valid current depth review has no focus_coverage block',
      coordinate: `${profileCoordinate}; ${depthCoordinate}`,
    };
  }
  if (!check.focus_coverage?.passed || !['covered', 'partial', 'blocked'].includes(check.focus_coverage.outcome)) {
    return unknown('focus_coverage_invalid');
  }

  const coveredRefs = (focus.commitments || [])
    .filter((commitment) => commitment?.state === 'covered')
    .flatMap((commitment) => commitment.submitted_work_unit_refs || [])
    .filter((ref) => typeof ref === 'string' && ref && !ref.startsWith('/') && !ref.split(/[\\/]+/).includes('..'));
  const limitations = check.focus_coverage.limitations || [];
  const coveredCoordinates = coveredRefs.map((ref) => markdownLink(ref, `../${ref}`));
  const detail = check.focus_coverage.outcome === 'covered'
    ? `submitted refs: ${coveredCoordinates.join(', ') || 'unknown'}`
    : limitations.map((limitation) => `${safeCode(limitation.id)}: ${safeCode(limitation.limitation)} (${safeCode(limitation.boundary_kind)})`).join('; ');
  return {
    status: check.focus_coverage.outcome,
    detail,
    coordinate: `${profileCoordinate}; ${depthCoordinate}${coveredCoordinates.length > 0 ? `; ${coveredCoordinates.join(', ')}` : ''}`,
  };
}

function renderReferenceEvidenceMapFromFacts(bundlePath, facts, { syncDate } = {}) {
  if (!DATE.test(syncDate)) return blocked('sync_date_invalid', 'syncDate must be YYYY-MM-DD.', {}, README_TARGET);
  const retiredReference = facts.references.find((reference) => (
    reference.classification.reason_code === 'reference_topic_binding_legacy_unsupported'
  ));
  if (retiredReference) {
    return blocked(
      retiredReference.classification.reason_code,
      retiredReference.classification.reason,
      { ref_file: retiredReference.relPath },
      README_TARGET,
    );
  }
  const name = safeCell(facts.plan?.plan_basename || facts.plan?.name || 'research-bundle');
  const relationships = facts.references.map((reference) => ({ ref_file: reference.relPath, ...referenceRelationship(reference, facts) }));
  let currentRerunCount;
  let profileReason = null;
  try {
    currentRerunCount = readProjectionProfileRound(bundlePath);
  } catch (error) {
    currentRerunCount = null;
    profileReason = error.message;
  }
  const topics = facts.layouts.referenceLayouts
    .map((layout) => ({
      topic_slug: layout.current.slug,
      topic_uid: layout.topic_uid || 'unknown',
      ...(currentRerunCount === null
        ? {
          status: 'unknown',
          detail: safeCode(`profile_round_unavailable: ${profileReason}`),
          coordinate: `${markdownLink('rb_plan.md', '../rb_plan.md')}#topic_registry; ${markdownLink('rb_profile.yaml', '../rb_profile.yaml')}`,
        }
        : currentFocusStatus(bundlePath, layout, currentRerunCount)),
    }))
    .sort((left, right) => left.topic_slug.localeCompare(right.topic_slug));

  const bytes = [
    `# Reference Directory - ${name}`,
    '',
    'Evidence sources for this research run, kept in a flat, scannable layout. Every file is a single rich-Markdown source record (no subdirectories).',
    '',
    'Engine discovery rule: files in this directory are human-readable evidence records, but gate input discovery comes from bundle-root `rb_output_declarations.jsonl`. A reference file that is not declared by a successful delegated `complete()` does not count toward gate pass conditions.',
    '',
    '## Naming convention',
    '',
    '| Prefix | Meaning | Produced by |',
    '| --- | --- | --- |',
    '| `00-shared-<slug>.md` | Shared foundation source - covers >=2 topics | Wave 0 |',
    '| `{slug}-<qualifier>.md` | Topic-specific source - `slug` is the full topic slug (already includes `NN_` prefix), `qualifier` is a short source identifier | Wave 1 |',
    '| `00-cross-<slug>.md` | Cross-topic discovery source - emerged during the Wave 2 cross-topic scan | Wave 2 |',
    '',
    '## File format',
    '',
    'Each reference file follows `DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-reference-template.md`: a metadata block followed by five standard sections - `## Key Facts`, `## Core Content Capture`, `## Relevance To This Research`, `## Quotable Terms / Concepts`, and `## Risks And Limitations`.',
    '',
    '## Navigation',
    '',
    '- **Machine-readable inventory:** [`_INDEX.md`](_INDEX.md) - one row per reference file, 8 columns.',
    '- **Human overview:** this `README.md`.',
    '',
    '## Reference Evidence Map',
    '',
    '> Derived navigation only. Submitted backing, canonical Topic resolution, current profile round, and valid focus coverage remain authoritative.',
    `> Rendered from current direct facts on ${syncDate}.`,
    '',
    '### Reference relationships',
    '',
    '| Reference | Relationship | Canonical Topic | Direct coordinate |',
    '| --- | --- | --- | --- |',
    ...relationships.map((entry) => `| ${markdownLink(entry.ref_file, basename(entry.ref_file))} | ${entry.relationship} | ${entry.topic} | ${entry.coordinate} |`),
    '',
    '### Current focus increments',
    '',
    '| Current Topic | Focus status | Detail | Direct coordinate |',
    '| --- | --- | --- | --- |',
    ...topics.map((topic) => `| ${safeCell(topic.topic_slug)} (${safeCell(topic.topic_uid)}) | ${topic.status} | ${safeCell(topic.detail)} | ${topic.coordinate} |`),
    '',
    '> A Topic-level focus status does not attribute an individual reference file to that increment without a separate accepted direct binding.',
    '',
  ].join('\n');
  return { ok: true, target: README_TARGET, bytes, relationships, topics };
}

export function renderReferenceIndex(bundlePath, { syncDate = new Date().toISOString().slice(0, 10) } = {}) {
  const facts = loadReferenceFacts(bundlePath);
  if (!facts.ok) return facts;
  return renderReferenceIndexFromFacts(bundlePath, facts, { syncDate });
}

export function renderReferenceEvidenceMap(bundlePath, { syncDate = new Date().toISOString().slice(0, 10) } = {}) {
  const facts = loadReferenceFacts(bundlePath);
  if (!facts.ok) return { ...facts, target: README_TARGET };
  return renderReferenceEvidenceMapFromFacts(bundlePath, facts, { syncDate });
}

function readCurrentTarget(bundlePath, target) {
  const targetPath = join(bundlePath, target);
  try {
    return { ok: true, targetPath, current: existsSync(targetPath) ? readFileSync(targetPath, 'utf8') : null };
  } catch (error) {
    return { ok: false, target, reason_code: 'reference_navigation_target_unreadable', reason: `Cannot read ${target}: ${error.message}` };
  }
}

function persistRenderedTarget(bundlePath, rendered, stagingPath, options) {
  const observed = readCurrentTarget(bundlePath, rendered.target);
  if (!observed.ok) return { verdict: 'blocked', ...observed };
  if (observed.current === rendered.bytes) {
    return { verdict: 'unchanged', reason_code: 'unchanged', reason: `${rendered.target} already matches rendered bytes.`, target: rendered.target };
  }
  const sourcePath = join(stagingPath, basename(rendered.target));
  try {
    writeFileSync(sourcePath, rendered.bytes, 'utf8');
    const persisted = persistBundleFile({
      bundlePath,
      sourcePath,
      target: rendered.target,
      expectedTarget: observed.current === null ? { kind: 'absent' } : { kind: 'sha256', value: sha256File(observed.targetPath) },
      hooks: options.persistenceHooks || null,
    });
    return persisted.verdict === 'committed'
      ? { verdict: 'committed', reason_code: 'committed', reason: persisted.reason, target: rendered.target, operation_id: persisted.operation_id }
      : { verdict: 'blocked', reason_code: persisted.reason_code, reason: persisted.reason, target: rendered.target };
  } catch (error) {
    return { verdict: 'blocked', reason_code: 'reference_navigation_sync_failed', reason: error.message, target: rendered.target };
  }
}

function aggregateResults({ indexResult, readmeResult, indexRows = 0, forcedBlock = null }) {
  const target_results = [indexResult, readmeResult].filter(Boolean);
  const committed_targets = target_results.filter((result) => result.verdict === 'committed').map((result) => result.target);
  const blockedResults = target_results.filter((result) => result.verdict === 'blocked');
  const blockedTarget = forcedBlock?.target || blockedResults[0]?.target || null;
  const blockedReason = forcedBlock || blockedResults[0] || null;
  if (blockedReason) {
    return {
      verdict: 'blocked',
      reason_code: blockedReason.reason_code,
      reason: blockedReason.reason,
      target: blockedTarget,
      rows: indexRows,
      committed_targets,
      blocked_target: blockedTarget,
      blocked_targets: [...new Set([...(forcedBlock ? [forcedBlock.target] : []), ...blockedResults.map((result) => result.target)])],
      target_results,
    };
  }
  if (committed_targets.length === 0) {
    return {
      verdict: 'unchanged',
      reason_code: 'unchanged',
      reason: 'Rendered reference navigation already matches both current targets.',
      target: INDEX_TARGET,
      rows: indexRows,
      committed_targets,
      target_results,
    };
  }
  return {
    verdict: 'committed',
    reason_code: 'committed',
    reason: 'Rendered reference navigation targets committed through their independent CAS boundaries.',
    target: INDEX_TARGET,
    rows: indexRows,
    committed_targets,
    target_results,
  };
}

export function syncReferenceIndex(bundlePath, options = {}) {
  const syncDate = options.syncDate || new Date().toISOString().slice(0, 10);
  const facts = loadReferenceFacts(bundlePath);
  if (!facts.ok) return facts;
  const index = renderReferenceIndexFromFacts(bundlePath, facts, { syncDate });
  if (!index.ok) return index;
  const readme = renderReferenceEvidenceMapFromFacts(bundlePath, facts, { syncDate });
  if (!readme.ok) return readme;

  const stagingRoot = join(bundlePath, '_diagnostics');
  mkdirSync(stagingRoot, { recursive: true });
  const stagingPath = mkdtempSync(join(stagingRoot, 'reference-index-sync-'));
  try {
    const indexResult = persistRenderedTarget(bundlePath, index, stagingPath, options);
    if (indexResult.verdict === 'blocked') return aggregateResults({ indexResult, indexRows: index.rows.length });
    const readmeResult = persistRenderedTarget(bundlePath, readme, stagingPath, options);
    return aggregateResults({ indexResult, readmeResult, indexRows: index.rows.length });
  } finally {
    rmSync(stagingPath, { recursive: true, force: true });
  }
}
