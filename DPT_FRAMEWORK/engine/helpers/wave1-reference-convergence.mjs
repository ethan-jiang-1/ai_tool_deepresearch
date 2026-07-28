// @impl REF-001, REF-008, RWG-012
// Pure Wave1 reference identity helpers. Bundle authority is evaluated by callers.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

import { readNormalizedSubmittedWorkUnitDeclarations } from './gate-helpers-readers.mjs';
import { inspectCacheLeaf } from './cache-leaf-contract.mjs';
import { resolveStructuredTopicBinding, resolveTopicLayout } from './topic-layout.mjs';
import { queueItemSnapshotHash } from '../queue-manager-core.mjs';
import { readAndValidateManifest } from '../work-unit-validation.mjs';

function safeTopicSlug(value) {
  return typeof value === 'string' && /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/.test(value);
}

function safeUrlToken(value) {
  const token = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return token || 'source';
}

export function normalizeWave1ReferenceUrl(value) {
  try {
    const parsed = new URL(String(value || '').trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return null;
  }
}

export function canonicalWave1ReferencePath({ topicSlug, sourceUrl } = {}) {
  if (!safeTopicSlug(topicSlug)) {
    return { ok: false, reason_code: 'topic_slug_invalid', reason: 'Current Topic slug is required for a canonical Wave1 reference path.' };
  }
  const normalizedUrl = normalizeWave1ReferenceUrl(sourceUrl);
  if (!normalizedUrl) {
    return { ok: false, reason_code: 'source_url_invalid', reason: 'A parseable http(s) submitted backing URL is required for a canonical Wave1 reference path.' };
  }
  const parsed = new URL(normalizedUrl);
  const token = safeUrlToken(`${parsed.hostname}${parsed.pathname}`);
  const digest = createHash('sha256').update(normalizedUrl).digest('hex').slice(0, 12);
  return {
    ok: true,
    normalized_url: normalizedUrl,
    qualifier: `${token}-${digest}`,
    path: `reference/${topicSlug}-${token}-${digest}.md`,
  };
}

export function classifyWave1ReferencePath({ relPath, topicSlug, sourceUrl, metadataBindsCurrentTopic = false } = {}) {
  const canonical = canonicalWave1ReferencePath({ topicSlug, sourceUrl });
  if (!canonical.ok) return { ...canonical, path_class: null };
  if (relPath === canonical.path) return { ...canonical, path_class: 'canonical_current' };
  if (/^reference\/\d+-wave1-[^/]+\.md$/.test(String(relPath || ''))) {
    return { ...canonical, path_class: 'legacy' };
  }
  return {
    ...canonical,
    path_class: metadataBindsCurrentTopic ? 'misnamed_current' : 'other',
  };
}

function acceptedSourceClaim(claim) {
  return new Set(['accepted', 'countable', 'accepted_countable'])
    .has(String(claim?.acceptance_status || '').trim().toLowerCase());
}

function safeRelPath(value) {
  return typeof value === 'string'
    && value.length > 0
    && !value.startsWith('/')
    && !value.split(/[\\/]+/).includes('..');
}

function inspectSubmittedCacheLeaf(bundlePath, trail, normalizedUrl, degradedCapture) {
  if (!safeRelPath(trail)) return { ok: false, reason: 'cache trail path is unsafe' };
  const dir = join(bundlePath, trail);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return { ok: false, reason: 'cache trail directory is missing' };
  const availableFiles = readdirSync(dir).filter((file) => statSync(join(dir, file)).isFile());
  let meta = null;
  try {
    meta = existsSync(join(dir, 'meta.json')) ? JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8')) : null;
  } catch {
    return { ok: false, reason: 'cache trail metadata is invalid' };
  }
  const pageText = existsSync(join(dir, 'page.md')) ? readFileSync(join(dir, 'page.md'), 'utf8') : '';
  const inspected = inspectCacheLeaf({ availableFiles, pageText, meta });
  if (!inspected.ok) return { ok: false, reason: inspected.issue };
  if (degradedCapture && !inspected.degraded) return { ok: false, reason: 'degraded capture does not record a degraded cache leaf' };
  if (inspected.urls.length > 0 && !inspected.urls.includes(normalizedUrl)) {
    return { ok: false, reason: 'cache trail URL does not match source claim URL' };
  }
  return { ok: true };
}

function validateSubmittedClaimBacking(bundlePath, row, claim, normalizedUrl) {
  if (!safeRelPath(claim.source_ref)
    || !row.output_files?.some((output) => output.path === claim.source_ref)
    || !existsSync(join(bundlePath, claim.source_ref))) {
    return { ok: false, reason: 'accepted source claim lacks a submitted source output' };
  }
  const cacheRefs = Array.isArray(claim.cache_trail_refs) ? claim.cache_trail_refs.filter(Boolean) : [];
  const allTrails = [...cacheRefs, ...(claim.degraded_capture_ref ? [claim.degraded_capture_ref] : [])];
  if (allTrails.length === 0) return { ok: false, reason: 'accepted source claim lacks cache or degraded coordinates' };
  for (const trail of allTrails) {
    if (!row.cache_trails?.includes(trail)) return { ok: false, reason: 'cache trail is absent from submitted work-unit output' };
    const checked = inspectSubmittedCacheLeaf(bundlePath, trail, normalizedUrl, trail === claim.degraded_capture_ref);
    if (!checked.ok) return checked;
  }
  return { ok: true };
}

function reviewedRefMap(facts) {
  const map = new Map();
  for (const fact of facts) {
    for (const ref of [fact.ledger_row.work_id, fact.ledger_row.work_unit_ref, fact.ledger_row.result_ref]) {
      if (typeof ref === 'string' && ref) map.set(ref.replace(/\/+$/g, ''), fact);
    }
  }
  return map;
}

function backingRoot(code, detail) {
  return { ok: false, candidates: [], root: { code, detail } };
}

export function resolveReviewedWave1SubmittedBacking(bundlePath, { topic, topicRegistryFact } = {}) {
  const layouts = topicRegistryFact?.layouts;
  const topicBinding = resolveTopicLayout(layouts, { topic_slug: topic }, { currentOnly: true });
  if (!topicBinding.ok) return backingRoot('wave1_reference_topic_invalid', `Current Topic binding is invalid: ${topicBinding.reason_code}`);

  const reviewPath = join(bundlePath, 'artifacts', 'wave1', topicBinding.current_slug, 'depth-review.yaml');
  if (!existsSync(reviewPath)) return backingRoot('reviewed_work_unit_refs_missing', `Missing ${join('artifacts', 'wave1', topicBinding.current_slug, 'depth-review.yaml')}.`);
  let review;
  try {
    review = parseYaml(readFileSync(reviewPath, 'utf8'));
  } catch (error) {
    return backingRoot('reviewed_work_unit_refs_invalid', `Cannot parse depth review: ${error.message}`);
  }
  if (!review || !Array.isArray(review.reviewed_work_unit_refs) || review.reviewed_work_unit_refs.length === 0) {
    return backingRoot('reviewed_work_unit_refs_invalid', 'depth-review.yaml must contain non-empty reviewed_work_unit_refs[].');
  }

  let normalized;
  try {
    normalized = readNormalizedSubmittedWorkUnitDeclarations(bundlePath);
  } catch (error) {
    return backingRoot('submitted_backing_ledger_invalid', error.message);
  }
  const factsByRef = reviewedRefMap(normalized.facts);
  const candidatesByUrl = new Map();

  for (const ref of review.reviewed_work_unit_refs) {
    if (typeof ref !== 'string' || !ref || ref.startsWith('/') || ref.split(/[\\/]+/).includes('..')) {
      return backingRoot('reviewed_work_unit_ref_unsafe', `Reviewed work-unit ref is unsafe: ${String(ref)}`);
    }
    const fact = factsByRef.get(ref.replace(/\/+$/g, ''));
    if (!fact) return backingRoot('reviewed_work_unit_ref_unsubmitted', `Reviewed work-unit ref is not a hash-valid submitted row: ${ref}`);
    const { ledger_row: row, index_record: record } = fact;
    if (record.wave !== 1 || record.kind !== 'wave1_topic_deepening' || record.status !== 'submitted') {
      return backingRoot('reviewed_work_unit_kind_invalid', `Reviewed row ${record.work_id} is not a submitted wave1_topic_deepening work unit.`);
    }

    let manifest;
    try {
      manifest = readAndValidateManifest(bundlePath, { kind_registry: normalized.kind_registry }, record);
      if (queueItemSnapshotHash(manifest.queue_item) !== record.queue_item_snapshot_hash) {
        return backingRoot('manifest_snapshot_invalid', `Manifest queue snapshot is stale for ${record.work_id}.`);
      }
    } catch (error) {
      return backingRoot('manifest_snapshot_invalid', `Manifest authority is invalid for ${record.work_id}: ${error.message}`);
    }
    const manifestBinding = resolveStructuredTopicBinding(layouts, manifest, { currentOnly: true });
    if (!manifestBinding.ok || manifestBinding.topic_uid !== topicBinding.topic_uid || manifestBinding.current_slug !== topicBinding.current_slug) {
      return backingRoot('manifest_topic_binding_invalid', `Manifest snapshot for ${record.work_id} does not bind current Topic ${topicBinding.current_slug}.`);
    }

    for (const claim of row.source_claims || []) {
      if (!acceptedSourceClaim(claim)) continue;
      const normalizedUrl = normalizeWave1ReferenceUrl(claim.url);
      if (!normalizedUrl) return backingRoot('submitted_backing_url_invalid', `Accepted source claim URL is not parseable for ${record.work_id}.`);
      const acceptedUrls = new Set((row.accepted_source_urls || []).map(normalizeWave1ReferenceUrl).filter(Boolean));
      if (!acceptedUrls.has(normalizedUrl)) {
        return backingRoot('submitted_backing_url_unaccepted', `Accepted source claim URL is absent from accepted_source_urls for ${record.work_id}.`);
      }
      const checkedBacking = validateSubmittedClaimBacking(bundlePath, row, claim, normalizedUrl);
      if (!checkedBacking.ok) {
        return backingRoot('submitted_backing_cache_mapping_invalid', `Accepted source claim backing is invalid for ${record.work_id}: ${checkedBacking.reason}.`);
      }
      const sourceRefs = [
        row.work_id,
        row.work_unit_ref,
        row.result_ref,
        claim.source_ref,
        ...(claim.cache_trail_refs || []),
        claim.degraded_capture_ref,
      ].filter((value) => typeof value === 'string' && value);
      const prior = candidatesByUrl.get(normalizedUrl) || {
        normalized_url: normalizedUrl,
        source_url: claim.url,
        work_ids: [],
        backing_refs: [],
      };
      prior.work_ids.push(record.work_id);
      prior.backing_refs.push(...sourceRefs);
      candidatesByUrl.set(normalizedUrl, prior);
    }
  }

  const candidates = [...candidatesByUrl.values()]
    .map((candidate) => ({
      ...candidate,
      work_ids: [...new Set(candidate.work_ids)].sort(),
      backing_refs: [...new Set(candidate.backing_refs)].sort(),
    }))
    .sort((left, right) => left.normalized_url.localeCompare(right.normalized_url)
      || left.work_ids[0].localeCompare(right.work_ids[0]));
  return { ok: true, topic: { topic_uid: topicBinding.topic_uid, topic_slug: topicBinding.current_slug }, candidates };
}

export function evaluateWave1ReferenceConvergence({ topic, requiredFloor, submittedBacking, projections = [], index = { valid: true, stale: false }, liveSupplementaryDemand = null } = {}) {
  if (!topic?.topic_uid || !topic?.topic_slug) return { outcome: 'parent_root', root: { code: 'wave1_reference_topic_invalid', detail: 'Current canonical Topic fact is unavailable.' } };
  if (!Number.isInteger(requiredFloor) || requiredFloor < 1) return { outcome: 'parent_root', root: { code: 'missing_profile_parameter', detail: 'Wave1 reference floor must be a positive integer.' } };
  if (!submittedBacking?.ok) return { outcome: 'parent_root', root: submittedBacking?.root || { code: 'submitted_backing_invalid', detail: 'Submitted backing authority is unavailable.' } };

  const byCandidate = new Map(projections.map((projection) => [projection.normalized_url, projection]));
  const incomplete = submittedBacking.candidates.filter((candidate) => {
    const projection = byCandidate.get(candidate.normalized_url);
    return !projection
      || projection.path_class !== 'canonical_current'
      || projection.candidate_binding !== true
      || projection.format_valid !== true
      || projection.url_valid !== true
      || projection.countable !== true;
  });
  if (incomplete.length > 0) return { outcome: 'materialize_projection', candidates: incomplete };
  if (!index.valid || index.stale) return { outcome: 'sync_reference_index', index };

  const observed = submittedBacking.candidates.length;
  if (observed < requiredFloor) {
    const deficit = requiredFloor - observed;
    return liveSupplementaryDemand
      ? { outcome: 'existing_supplementary', demand: liveSupplementaryDemand, observed, required: requiredFloor, deficit }
      : { outcome: 'reference_floor_deficit', observed, required: requiredFloor, deficit };
  }
  return { outcome: 'satisfied', observed, required: requiredFloor };
}
