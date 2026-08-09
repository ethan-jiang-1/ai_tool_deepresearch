// @impl REF-001, REF-008, RWG-012
// Pure Wave1 reference identity helpers. Bundle authority is evaluated by callers.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

import { readNormalizedSubmittedWorkUnitDeclarations } from './gate-helpers-readers.mjs';
import { inspectCacheLeaf } from './cache-leaf-contract.mjs';
import { normalizeWave1ReferenceUrl as normalizeUrl } from './reference-url.mjs';
import {
  checkReferenceFormatFiles,
  checkReferenceIndexCoverage,
  checkReferenceSourceUrls,
  parseReferenceMetadata,
} from './gate-helpers-checks.mjs';
import { countReferences, isCountable } from './ref-count.mjs';
import { resolveStructuredTopicBinding, resolveTopicLayout } from './topic-layout.mjs';
import { queueItemSnapshotHash } from '../queue-manager-core.mjs';
import { loadQueueReadOnly } from '../queue-manager-lifecycle.mjs';
import {
  readAndValidateManifest,
  resolveAcceptedSourceRefAuthorization,
} from '../work-unit-validation.mjs';

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

export { normalizeUrl as normalizeWave1ReferenceUrl };

export function canonicalWave1ReferencePath({ topicSlug, sourceUrl } = {}) {
  if (!safeTopicSlug(topicSlug)) {
    return { ok: false, reason_code: 'topic_slug_invalid', reason: 'Current Topic slug is required for a canonical Wave1 reference path.' };
  }
  const normalizedUrl = normalizeUrl(sourceUrl);
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

function validateSubmittedClaimBacking(bundlePath, row, manifest, claim, normalizedUrl) {
  const authorization = resolveAcceptedSourceRefAuthorization(bundlePath, {
    manifest,
    currentOutputPaths: (row.output_files || []).map((output) => output.path),
    sourceRef: claim.source_ref,
  });
  if (!authorization.ok) {
    return {
      ok: false,
      code: 'submitted_backing_source_ref_invalid',
      reason: `accepted source claim source_ref is not authorized (${authorization.reason_code})`,
    };
  }
  if (!existsSync(join(bundlePath, claim.source_ref))) {
    return {
      ok: false,
      code: 'submitted_backing_source_projection_unavailable',
      reason: 'authorized source_ref is unavailable for reference projection',
    };
  }
  const cacheRefs = Array.isArray(claim.cache_trail_refs) ? claim.cache_trail_refs.filter(Boolean) : [];
  const allTrails = [...cacheRefs, ...(claim.degraded_capture_ref ? [claim.degraded_capture_ref] : [])];
  if (allTrails.length === 0) return { ok: false, code: 'submitted_backing_cache_mapping_invalid', reason: 'accepted source claim lacks cache or degraded coordinates' };
  for (const trail of allTrails) {
    if (!row.cache_trails?.includes(trail)) return { ok: false, code: 'submitted_backing_cache_mapping_invalid', reason: 'cache trail is absent from submitted work-unit output' };
    const checked = inspectSubmittedCacheLeaf(bundlePath, trail, normalizedUrl, trail === claim.degraded_capture_ref);
    if (!checked.ok) return { ...checked, code: 'submitted_backing_cache_mapping_invalid' };
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

export function resolveReviewedWave1SubmittedBacking(bundlePath, { topic, topicRegistryFact, review: suppliedReview = undefined } = {}) {
  const layouts = topicRegistryFact?.layouts;
  const topicBinding = resolveTopicLayout(layouts, { topic_slug: topic }, { currentOnly: true });
  if (!topicBinding.ok) return backingRoot('wave1_reference_topic_invalid', `Current Topic binding is invalid: ${topicBinding.reason_code}`);

  const reviewPath = join(bundlePath, 'artifacts', 'wave1', topicBinding.current_slug, 'depth-review.yaml');
  if (!existsSync(reviewPath)) return backingRoot('reviewed_work_unit_refs_missing', `Missing ${join('artifacts', 'wave1', topicBinding.current_slug, 'depth-review.yaml')}.`);
  let review = suppliedReview;
  if (review === undefined) {
    try {
      review = parseYaml(readFileSync(reviewPath, 'utf8'));
    } catch (error) {
      return backingRoot('reviewed_work_unit_refs_invalid', `Cannot parse depth review: ${error.message}`);
    }
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
      const normalizedUrl = normalizeUrl(claim.url);
      if (!normalizedUrl) return backingRoot('submitted_backing_url_invalid', `Accepted source claim URL is not parseable for ${record.work_id}.`);
      const acceptedUrls = new Set((row.accepted_source_urls || []).map(normalizeUrl).filter(Boolean));
      if (!acceptedUrls.has(normalizedUrl)) {
        return backingRoot('submitted_backing_url_unaccepted', `Accepted source claim URL is absent from accepted_source_urls for ${record.work_id}.`);
      }
      const checkedBacking = validateSubmittedClaimBacking(bundlePath, row, manifest, claim, normalizedUrl);
      if (!checkedBacking.ok) {
        return backingRoot(checkedBacking.code || 'submitted_backing_cache_mapping_invalid', `Accepted source claim backing is invalid for ${record.work_id}: ${checkedBacking.reason}.`);
      }
      const cacheTrailRefs = [
        ...(Array.isArray(claim.cache_trail_refs) ? claim.cache_trail_refs.filter(Boolean) : []),
        ...(claim.degraded_capture_ref ? [claim.degraded_capture_ref] : []),
      ];
      const sourceRefs = [
        row.work_id,
        row.work_unit_ref,
        row.result_ref,
        claim.source_ref,
        ...cacheTrailRefs,
      ].filter((value) => typeof value === 'string' && value);
      const prior = candidatesByUrl.get(normalizedUrl) || {
        normalized_url: normalizedUrl,
        source_url: claim.url,
        work_ids: [],
        work_unit_refs: [],
        source_refs: [],
        cache_trail_refs: [],
        backing_refs: [],
      };
      prior.work_ids.push(record.work_id);
      prior.work_unit_refs.push(row.work_id, row.work_unit_ref, row.result_ref);
      prior.source_refs.push(claim.source_ref);
      prior.cache_trail_refs.push(...cacheTrailRefs);
      prior.backing_refs.push(...sourceRefs);
      candidatesByUrl.set(normalizedUrl, prior);
    }
  }

  const candidates = [...candidatesByUrl.values()]
    .map((candidate) => ({
      ...candidate,
      work_ids: [...new Set(candidate.work_ids)].sort(),
      work_unit_refs: [...new Set(candidate.work_unit_refs)].sort(),
      source_refs: [...new Set(candidate.source_refs)].sort(),
      cache_trail_refs: [...new Set(candidate.cache_trail_refs)].sort(),
      backing_refs: [...new Set(candidate.backing_refs)].sort(),
    }))
    .sort((left, right) => left.normalized_url.localeCompare(right.normalized_url)
      || left.work_ids[0].localeCompare(right.work_ids[0]));
  return { ok: true, topic: { topic_uid: topicBinding.topic_uid, topic_slug: topicBinding.current_slug }, candidates };
}

function bodyCitesOne(body, refs) {
  return refs.some((ref) => typeof ref === 'string' && ref.length > 0 && body.includes(ref));
}

/**
 * Evaluate one exact canonical consumer projection against one authenticated
 * submitted-backing candidate. It deliberately does not discover files: the
 * locator is the entire path-selection policy for current Wave1 coverage.
 */
export function inspectWave1CandidateProjection(bundlePath, { topicSlug, candidate } = {}) {
  const locator = canonicalWave1ReferencePath({ topicSlug, sourceUrl: candidate?.normalized_url });
  if (!locator.ok) return { ...locator, candidate_binding: false, format_valid: false, url_valid: false, countable: false };
  const relPath = locator.path;
  const absPath = join(bundlePath, relPath);
  if (!existsSync(absPath)) {
    return {
      rel_path: relPath,
      normalized_url: candidate.normalized_url,
      path_class: 'other',
      candidate_binding: false,
      format_valid: false,
      url_valid: false,
      countable: false,
      issue: 'canonical_projection_missing',
    };
  }
  const file = { relPath, absPath };
  const body = readFileSync(absPath, 'utf8');
  const metadata = parseReferenceMetadata(body);
  const metadataUrl = normalizeUrl(metadata.get('source_url'));
  const format = checkReferenceFormatFiles([file], { bundlePath });
  const url = checkReferenceSourceUrls([file]);
  const numeric = isCountable(relPath, bundlePath);
  const sourceBound = bodyCitesOne(body, candidate.source_refs || []);
  const cacheBound = bodyCitesOne(body, candidate.cache_trail_refs || []);
  const workUnitBound = bodyCitesOne(body, candidate.work_unit_refs || []);
  return {
    rel_path: relPath,
    normalized_url: candidate.normalized_url,
    path_class: 'canonical_current',
    candidate_binding: metadataUrl === candidate.normalized_url && sourceBound && cacheBound && workUnitBound,
    format_valid: format.passed,
    url_valid: url.passed && metadataUrl === candidate.normalized_url,
    countable: numeric.countable,
    issue: metadataUrl !== candidate.normalized_url
      ? 'canonical_projection_url_unbound'
      : !(sourceBound && cacheBound && workUnitBound)
        ? 'canonical_projection_body_unbound'
        : !format.passed
          ? 'canonical_projection_format_invalid'
          : !url.passed
            ? 'canonical_projection_url_invalid'
            : !numeric.countable
              ? `canonical_projection_not_countable:${numeric.reason}`
              : null,
  };
}

/** Build one Topic's exact projection facts and count from its reviewed backing. */
export function evaluateWave1ReferenceTopic(bundlePath, {
  topic,
  topicRegistryFact,
  requiredFloor,
  index = null,
  liveSupplementaryDemand = null,
} = {}) {
  const submittedBacking = resolveReviewedWave1SubmittedBacking(bundlePath, { topic, topicRegistryFact });
  const resolvedDemand = liveSupplementaryDemand || findLiveSupplementaryDemand(bundlePath, submittedBacking.topic);
  const projections = submittedBacking.ok
    ? submittedBacking.candidates.map((candidate) => inspectWave1CandidateProjection(bundlePath, {
      topicSlug: submittedBacking.topic.topic_slug,
      candidate,
    }))
    : [];
  const selectedPaths = projections
    .filter((projection) => projection.path_class === 'canonical_current'
      && projection.candidate_binding
      && projection.format_valid
      && projection.url_valid
      && projection.countable)
    .map((projection) => projection.rel_path);
  const numeric = countReferences(bundlePath, { selectedPaths });
  const projectionFiles = projections
    .filter((projection) => projection.path_class === 'canonical_current')
    .map((projection) => ({
      relPath: projection.rel_path,
      absPath: join(bundlePath, projection.rel_path),
    }));
  const indexCheck = index || checkReferenceIndexCoverage(bundlePath, projectionFiles, { sourceLayer: 'wave1_topic' });
  const resolvedIndex = index
    ? index
    : { valid: indexCheck.passed, stale: !indexCheck.passed, check: indexCheck };
  const result = evaluateWave1ReferenceConvergence({
    topic: submittedBacking.ok ? submittedBacking.topic : null,
    requiredFloor,
    submittedBacking,
    projections,
    index: resolvedIndex,
    liveSupplementaryDemand: resolvedDemand,
    observedCount: numeric.count,
  });
  if (result.outcome === 'reference_floor_deficit' && submittedBacking.ok) {
    const unreviewed = unreviewedSubmittedSupplementaryRows(bundlePath, submittedBacking.topic, topicRegistryFact);
    if (unreviewed.ok && unreviewed.rows.length > 0) result.unreviewed_rows = unreviewed.rows;
  }
  return {
    submitted_backing: submittedBacking,
    projections,
    numeric,
    index: resolvedIndex,
    result,
  };
}

/**
 * Detect submitted Wave1 `wave1_topic_deepening` rows for a current Topic that
 * are NOT yet listed in the topic's `depth-review.yaml#reviewed_work_unit_refs`.
 * A supplementary submit that the review never picks up silently leaves the
 * reference floor at the old deficit; naming that sync is WAI-009.
 * @impl WAI-009
 */
export function unreviewedSubmittedSupplementaryRows(bundlePath, topic, topicRegistryFact) {
  const layouts = topicRegistryFact?.layouts;
  const topicBinding = resolveTopicLayout(layouts, { topic_slug: topic }, { currentOnly: true });
  if (!topicBinding.ok) return { ok: false, root: { code: 'wave1_reference_topic_invalid', detail: `Current Topic binding is invalid: ${topicBinding.reason_code}` } };

  const reviewPath = join(bundlePath, 'artifacts', 'wave1', topicBinding.current_slug, 'depth-review.yaml');
  const reviewed = new Set();
  if (existsSync(reviewPath)) {
    try {
      const review = parseYaml(readFileSync(reviewPath, 'utf8'));
      if (Array.isArray(review?.reviewed_work_unit_refs)) {
        for (const ref of review.reviewed_work_unit_refs) {
          if (typeof ref === 'string' && ref) reviewed.add(ref.replace(/\/+$/g, ''));
        }
      }
    } catch { /* an unreadable depth review is a separate root */ }
  }

  let normalized;
  try {
    normalized = readNormalizedSubmittedWorkUnitDeclarations(bundlePath);
  } catch (error) {
    return { ok: false, root: { code: 'submitted_backing_ledger_invalid', detail: error.message } };
  }
  const unreviewed = [];
  for (const fact of normalized.facts) {
    const { ledger_row: row, index_record: record } = fact;
    if (record.wave !== 1 || record.kind !== 'wave1_topic_deepening' || record.status !== 'submitted') continue;
    const ref = String(row.work_unit_ref || row.work_id || '').replace(/\/+$/g, '');
    if (reviewed.has(ref)) continue; // already reviewed via depth-review
    let manifest;
    try {
      manifest = readAndValidateManifest(bundlePath, { kind_registry: normalized.kind_registry }, record);
    } catch {
      continue; // manifest-invalid rows surface through their own owner
    }
    const binding = resolveStructuredTopicBinding(layouts, manifest, { currentOnly: true });
    if (binding.ok && binding.topic_uid === topicBinding.topic_uid && binding.current_slug === topicBinding.current_slug) {
      unreviewed.push({ work_id: row.work_id, work_unit_ref: row.work_unit_ref, ref: `_work_units/wave1/${row.work_id}` });
    }
  }
  return { ok: true, rows: unreviewed };
}

function findLiveSupplementaryDemand(bundlePath, topic) {
  if (!topic?.topic_uid || !topic?.topic_slug) return null;
  let queue;
  try {
    queue = loadQueueReadOnly(bundlePath);
  } catch (error) {
    return { root: { code: 'wave1_reference_queue_invalid', detail: `Queue authority is invalid: ${error.message}` } };
  }
  return [...queue.active_window, ...queue.refill_pool].find((item) => (
    item.kind === 'wave1_topic_deepening'
    && item.producer_rule === 'topic_deepening'
    && item.payload?.assignment_mode === 'supplementary'
    && item.payload?.topic_uid === topic.topic_uid
    && item.payload?.topic_slug === topic.topic_slug
  )) || null;
}

export function evaluateWave1ReferenceConvergence({ topic, requiredFloor, submittedBacking, projections = [], index = { valid: true, stale: false }, liveSupplementaryDemand = null, observedCount = null } = {}) {
  if (!topic?.topic_uid || !topic?.topic_slug) return { outcome: 'parent_root', root: { code: 'wave1_reference_topic_invalid', detail: 'Current canonical Topic fact is unavailable.' } };
  if (!Number.isInteger(requiredFloor) || requiredFloor < 1) return { outcome: 'parent_root', root: { code: 'missing_profile_parameter', detail: 'Wave1 reference floor must be a positive integer.' } };
  if (!submittedBacking?.ok) return { outcome: 'parent_root', root: submittedBacking?.root || { code: 'submitted_backing_invalid', detail: 'Submitted backing authority is unavailable.' } };
  if (liveSupplementaryDemand?.root) return { outcome: 'parent_root', root: liveSupplementaryDemand.root };

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

  const observed = Number.isInteger(observedCount) && observedCount >= 0
    ? observedCount
    : submittedBacking.candidates.length;
  if (observed < requiredFloor) {
    const deficit = requiredFloor - observed;
    return liveSupplementaryDemand
      ? { outcome: 'existing_supplementary', demand: liveSupplementaryDemand, observed, required: requiredFloor, deficit }
      : {
          outcome: 'reference_floor_deficit', observed, required: requiredFloor, deficit,
          enqueue_payload: {
            topic_uid: topic.topic_uid,
            topic_slug: topic.topic_slug,
            assignment_mode: 'supplementary',
            reference_floor_deficit: deficit,
          },
        };
  }
  return { outcome: 'satisfied', observed, required: requiredFloor };
}
