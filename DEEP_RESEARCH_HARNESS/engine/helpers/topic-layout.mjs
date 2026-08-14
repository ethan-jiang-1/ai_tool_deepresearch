// @impl CTS-005, CTS-007

function bindingResult(layout, recordedSlug = layout.current.slug) {
  return {
    ok: true,
    topic_uid: layout.topic_uid,
    recorded_slug: recordedSlug,
    current_slug: layout.current.slug,
    historical: recordedSlug !== layout.current.slug,
  };
}

function addLayoutCandidate(map, key, layout) {
  if (typeof key !== 'string' || !key) return;
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(layout);
}

function uniqueReferenceLayouts(layouts) {
  const seen = new Set();
  const result = [];
  for (const layout of layouts) {
    const key = layout.topic_uid || `legacy:${layout.current.id}:${layout.current.slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(layout);
  }
  return result;
}

export function evaluateTopicLayouts(topicRegistry) {
  const currentByUid = new Map();
  const uidByCurrentSlug = new Map();
  const uidByAnySlug = new Map();
  const acceptedSlugsByUid = new Map();
  const referenceByAnyId = new Map();
  const referenceByAnySlug = new Map();
  const referenceLayouts = [];

  for (const topic of topicRegistry) {
    const previous = (topic.previous_layouts || []).map((layout) => ({ id: layout.id, slug: layout.slug }));
    const layout = {
      topic_uid: topic.topic_uid || null,
      current: { id: topic.id, slug: topic.slug },
      previous,
      accepted_slugs: [topic.slug, ...previous.map((item) => item.slug)],
    };
    referenceLayouts.push(layout);
    addLayoutCandidate(referenceByAnyId, topic.id, layout);
    addLayoutCandidate(referenceByAnySlug, topic.slug, layout);
    for (const item of previous) {
      addLayoutCandidate(referenceByAnyId, item.id, layout);
      addLayoutCandidate(referenceByAnySlug, item.slug, layout);
    }
    if (topic.topic_uid) {
      currentByUid.set(topic.topic_uid, layout);
      uidByCurrentSlug.set(topic.slug, topic.topic_uid);
      acceptedSlugsByUid.set(topic.topic_uid, layout.accepted_slugs);
      for (const slug of layout.accepted_slugs) uidByAnySlug.set(slug, topic.topic_uid);
    }
  }

  return {
    currentByUid,
    uidByCurrentSlug,
    uidByAnySlug,
    acceptedSlugsByUid,
    referenceByAnyId,
    referenceByAnySlug,
    referenceLayouts,
  };
}

function referenceMetadataValue(metadata, key) {
  const value = metadata instanceof Map ? metadata.get(key) : metadata?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function referenceMetadataArray(metadata, key) {
  const value = metadata instanceof Map ? metadata.get(key) : metadata?.[key];
  return Array.isArray(value) ? value : null;
}

function referenceBindingResult(layouts) {
  const unique = uniqueReferenceLayouts(layouts);
  return {
    ok: true,
    all: false,
    topic_uids: unique.map((layout) => layout.topic_uid).filter(Boolean).sort(),
    topic_keys: unique.map((layout) => layout.topic_uid || `legacy:${layout.current.id}:${layout.current.slug}`).sort(),
  };
}

function resolveReferenceUidForm(layouts, rawValue) {
  if (!rawValue) return null;
  if (rawValue === 'all') return { ok: true, all: true, topic_uids: [], topic_keys: [] };
  if (rawValue.includes(',')) {
    return { ok: false, reason_code: 'reference_topic_uid_invalid', value: rawValue };
  }
  const resolved = resolveTopicLayout(layouts, { topic_uid: rawValue });
  if (!resolved.ok) {
    return { ok: false, reason_code: 'reference_topic_uid_unknown', value: rawValue };
  }
  return referenceBindingResult([layouts.currentByUid.get(resolved.topic_uid)]);
}

function resolveReferenceUidSubsetForm(layouts, rawValue) {
  if (rawValue === null) return null;
  if (rawValue.length === 0) return { ok: false, reason_code: 'reference_topic_uids_empty' };

  const seen = new Set();
  const resolvedLayouts = [];
  for (const value of rawValue) {
    if (typeof value !== 'string' || !value.trim()) {
      return { ok: false, reason_code: 'reference_topic_uids_invalid', value };
    }
    const topicUid = value.trim();
    if (seen.has(topicUid)) {
      return { ok: false, reason_code: 'reference_topic_uids_duplicate', value: topicUid };
    }
    seen.add(topicUid);
    const resolved = resolveTopicLayout(layouts, { topic_uid: topicUid });
    if (!resolved.ok) {
      return { ok: false, reason_code: 'reference_topic_uids_unknown', value: topicUid };
    }
    resolvedLayouts.push(layouts.currentByUid.get(resolved.topic_uid));
  }
  return referenceBindingResult(resolvedLayouts);
}

function referenceIdCandidates(layouts, token) {
  const exact = layouts.referenceByAnyId.get(token) || [];
  if (exact.length > 0 || !/^\d+$/.test(token)) return exact;
  const ordinal = Number(token);
  const candidates = [];
  for (const [id, owners] of layouts.referenceByAnyId) {
    if (/^\d+$/.test(id) && Number(id) === ordinal) candidates.push(...owners);
  }
  return candidates;
}

function resolveReferenceLegacyForm(layouts, rawValue) {
  if (!rawValue) return null;
  const tokens = rawValue.split(',').map((value) => value.trim()).filter(Boolean);
  if (tokens.length === 0) return { ok: false, reason_code: 'reference_topic_binding_missing' };
  if (tokens.includes('all')) {
    return tokens.length === 1
      ? { ok: true, all: true, topic_uids: [], topic_keys: [] }
      : { ok: false, reason_code: 'reference_topic_binding_ambiguous', value: rawValue };
  }

  const resolvedLayouts = [];
  for (const token of tokens) {
    const candidates = uniqueReferenceLayouts([
      ...(layouts.referenceByAnySlug.get(token) || []),
      ...referenceIdCandidates(layouts, token),
    ]);
    if (candidates.length === 0) {
      return { ok: false, reason_code: 'reference_topic_binding_unknown', value: token };
    }
    if (candidates.length > 1) {
      return { ok: false, reason_code: 'reference_topic_binding_ambiguous', value: token };
    }
    resolvedLayouts.push(candidates[0]);
  }
  return referenceBindingResult(resolvedLayouts);
}

/** Resolve reference Markdown's UID and legacy topic-binding compatibility fields through the shared layout facts. */
export function resolveReferenceTopicBinding(layouts, metadata) {
  const uidValue = referenceMetadataValue(metadata, 'related_topic_uid');
  const uidValues = referenceMetadataArray(metadata, 'related_topic_uids');
  const legacyValue = referenceMetadataValue(metadata, 'related_topic');
  const hasUidArray = metadata instanceof Map
    ? metadata.has('related_topic_uids')
    : Object.hasOwn(metadata || {}, 'related_topic_uids');
  if (!uidValue && !hasUidArray && !legacyValue) return { ok: false, reason_code: 'reference_topic_binding_missing' };

  const uidResult = resolveReferenceUidForm(layouts, uidValue);
  const uidSubsetResult = hasUidArray
    ? uidValues === null
      ? { ok: false, reason_code: 'reference_topic_uids_invalid' }
      : resolveReferenceUidSubsetForm(layouts, uidValues)
    : null;
  const legacyResult = resolveReferenceLegacyForm(layouts, legacyValue);
  const invalid = [uidResult, uidSubsetResult, legacyResult].find((result) => result && !result.ok);
  if (invalid) return invalid;

  if (uidResult && uidSubsetResult) {
    return {
      ok: false,
      reason_code: 'reference_topic_binding_conflict',
      related_topic_uid: uidValue,
      related_topic_uids: uidValues,
    };
  }

  const currentResult = uidResult || uidSubsetResult;
  if (currentResult && legacyResult) {
    const uidSignature = currentResult.all ? 'all' : currentResult.topic_keys.join(',');
    const legacySignature = legacyResult.all ? 'all' : legacyResult.topic_keys.join(',');
    if (uidSignature !== legacySignature) {
      return {
        ok: false,
        reason_code: 'reference_topic_binding_conflict',
        related_topic_uid: uidValue,
        related_topic_uids: uidValues,
        related_topic: legacyValue,
      };
    }
  }
  return currentResult || legacyResult;
}

export function resolveTopicLayout(layouts, { topic_uid: topicUid, topic_slug: topicSlug } = {}, { currentOnly = false } = {}) {
  if (!topicUid && !topicSlug) return { ok: false, reason_code: 'topic_binding_missing' };

  const uidFromSlug = topicSlug ? layouts.uidByAnySlug.get(topicSlug) : null;
  if (topicSlug && !uidFromSlug) return { ok: false, reason_code: 'topic_slug_unknown', topic_slug: topicSlug };
  if (topicUid && !layouts.currentByUid.has(topicUid)) return { ok: false, reason_code: 'topic_uid_unknown', topic_uid: topicUid };
  if (topicUid && uidFromSlug && topicUid !== uidFromSlug) {
    return { ok: false, reason_code: 'topic_uid_slug_mismatch', topic_uid: topicUid, topic_slug: topicSlug };
  }

  const resolvedUid = topicUid || uidFromSlug;
  const layout = layouts.currentByUid.get(resolvedUid);
  const recordedSlug = topicSlug || layout.current.slug;
  if (currentOnly && recordedSlug !== layout.current.slug) {
    return {
      ok: false,
      reason_code: 'previous_layout_not_current',
      topic_uid: resolvedUid,
      topic_slug: recordedSlug,
      current_slug: layout.current.slug,
    };
  }
  return bindingResult(layout, recordedSlug);
}

function structuredBindings(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return [];
  const candidates = [];
  const add = (source, value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    if (typeof value.topic_uid === 'string' || typeof value.topic_slug === 'string') {
      candidates.push({ source, topic_uid: value.topic_uid, topic_slug: value.topic_slug });
    }
  };
  add('record', record);
  add('payload', record.payload);
  add('lineage', record.lineage);
  add('queue_item', record.queue_item);
  add('queue_item.payload', record.queue_item?.payload);
  add('queue_item.lineage', record.queue_item?.lineage);
  return candidates;
}

export function resolveStructuredTopicBinding(layouts, record, options = {}) {
  const candidates = structuredBindings(record);
  if (candidates.length === 0) return { ok: false, reason_code: 'structured_topic_binding_missing' };

  const resolved = candidates.map((candidate) => ({ source: candidate.source, result: resolveTopicLayout(layouts, candidate, options) }));
  const invalid = resolved.find((entry) => !entry.result.ok);
  if (invalid) return { ...invalid.result, source: invalid.source };

  const topicUids = new Set(resolved.map((entry) => entry.result.topic_uid));
  if (topicUids.size !== 1) return { ok: false, reason_code: 'structured_topic_binding_ambiguous', sources: resolved.map((entry) => entry.source) };

  const explicitSlug = resolved.find((entry) => entry.result.recorded_slug)?.result.recorded_slug;
  const result = resolved[0].result;
  return bindingResult(layouts.currentByUid.get(result.topic_uid), explicitSlug || result.current_slug);
}

export function acceptedTopicSlugs(layouts, topicUid) {
  return [...(layouts.acceptedSlugsByUid.get(topicUid) || [])];
}

export function losslessTopicSlugStem(slug) {
  const match = slug.match(/^(?:[0-9]+_)?([a-z0-9][a-z0-9-]*)$/);
  return match ? match[1] : null;
}

export function buildTopicLayoutTarget(currentRegistry, { topics, remove_topic_uids: removeTopicUids }) {
  const currentByUid = new Map(currentRegistry.map((topic) => [topic.topic_uid, topic]));
  const retainedUids = topics.map((topic) => topic.topic_uid);
  const removedUids = removeTopicUids || [];
  const submittedUids = [...retainedUids, ...removedUids];
  if (new Set(submittedUids).size !== submittedUids.length) throw new Error('layout target contains duplicate topic_uid');
  if (submittedUids.length !== currentRegistry.length || submittedUids.some((uid) => !currentByUid.has(uid))) {
    throw new Error('layout target must account for every current topic_uid exactly once');
  }

  const removed = new Set(removedUids);
  for (const topic of currentRegistry) {
    if (removed.has(topic.topic_uid)) continue;
    const removedDependency = topic.depends_on_topic_uids.find((uid) => removed.has(uid));
    if (removedDependency) throw new Error(`remove_has_dependents: ${topic.topic_uid} depends on ${removedDependency}`);
  }

  const width = Math.max(2, String(topics.length).length);
  const finalRegistry = topics.map((target, index) => {
    const current = currentByUid.get(target.topic_uid);
    const id = String(index + 1).padStart(width, '0');
    const slug = `${id}_${target.slug_stem}`;
    const previous = (current.previous_layouts || []).filter((layout) => layout.slug !== slug);
    if (current.slug !== slug && !previous.some((layout) => layout.slug === current.slug)) {
      previous.push({ id: current.id, slug: current.slug });
    }
    const finalTopic = {
      ...current,
      id,
      slug,
      title: target.title,
    };
    if (previous.length > 0 || Object.hasOwn(current, 'previous_layouts')) finalTopic.previous_layouts = previous;
    return finalTopic;
  });

  const seenSlugs = new Map();
  for (const topic of finalRegistry) {
    for (const slug of [topic.slug, ...(topic.previous_layouts || []).map((layout) => layout.slug)]) {
      const owner = seenSlugs.get(slug);
      if (owner && owner !== topic.topic_uid) throw new Error(`layout_slug_collision: ${slug}`);
      seenSlugs.set(slug, topic.topic_uid);
    }
  }

  const affectedTopicUids = new Set(removedUids);
  for (const topic of finalRegistry) {
    const current = currentByUid.get(topic.topic_uid);
    if (topic.id !== current.id || topic.slug !== current.slug || topic.title !== current.title) affectedTopicUids.add(topic.topic_uid);
  }
  return { topic_registry: finalRegistry, affected_topic_uids: [...affectedTopicUids] };
}
