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

export function evaluateTopicLayouts(topicRegistry) {
  const currentByUid = new Map();
  const uidByCurrentSlug = new Map();
  const uidByAnySlug = new Map();
  const acceptedSlugsByUid = new Map();

  for (const topic of topicRegistry) {
    const previous = (topic.previous_layouts || []).map((layout) => ({ id: layout.id, slug: layout.slug }));
    const layout = {
      topic_uid: topic.topic_uid,
      current: { id: topic.id, slug: topic.slug },
      previous,
      accepted_slugs: [topic.slug, ...previous.map((item) => item.slug)],
    };
    currentByUid.set(topic.topic_uid, layout);
    uidByCurrentSlug.set(topic.slug, topic.topic_uid);
    acceptedSlugsByUid.set(topic.topic_uid, layout.accepted_slugs);
    for (const slug of layout.accepted_slugs) uidByAnySlug.set(slug, topic.topic_uid);
  }

  return { currentByUid, uidByCurrentSlug, uidByAnySlug, acceptedSlugsByUid };
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
