// @impl STM-001, STM-002, STM-003
// Pure deterministic checks over already-read declared seed bytes.

import { parseMdFrontmatter } from './gate-helpers-readers.mjs';

const BINDING_FIELDS = Object.freeze([
  'topic_uid',
  'id',
  'slug',
  'title',
  'must_answer',
  'scope_role',
  'depends_on_topic_uids',
]);

// @impl STM-001, STM-002
// This is the executable structure shared by new-seed rendering and the
// current-format Gate check. Legacy documents have no markers and remain
// readable without being migrated.
export const SEED_TOPIC_INITIALIZATION = Object.freeze({
  startMarker: '<!-- seed-initialization:start -->',
  endMarker: '<!-- seed-initialization:end -->',
  appendixHeading: '═══ 研究轮次追加区 ═══',
  sections: Object.freeze([
    Object.freeze({
      heading: '主题定位',
      content: 'pending — seed-topics Agent must enrich this section.',
    }),
    Object.freeze({
      heading: '初始假设、缺口或张力',
      content: [
        '**已知**：pending — derive only from recorded Topic/profile facts.',
        '**缺口**：pending — identify what Wave0 evidence intake must establish.',
        '**张力**：pending — identify claims, conflicts, or narrative bias requiring independent verification.',
      ].join('\n'),
    }),
    Object.freeze({
      heading: 'why now',
      content: '- pending — identify the current trigger, time window, or milestone.',
    }),
    Object.freeze({
      heading: '为什么对最终交付物重要',
      content: 'pending — state the concrete contribution this Topic should make to the final deliverable.',
    }),
    Object.freeze({
      heading: '下游位置（可选）',
      content: '- pending — identify downstream report sections or leave explicitly unassigned.',
    }),
  ]),
});

function seedBody(raw) {
  const source = String(raw || '');
  const frontmatter = source.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return frontmatter ? source.slice(frontmatter[0].length) : source;
}

function offsetsOf(source, needle) {
  const offsets = [];
  let offset = source.indexOf(needle);
  while (offset !== -1) {
    offsets.push(offset);
    offset = source.indexOf(needle, offset + needle.length);
  }
  return offsets;
}

function headingOffsets(source, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const expression = new RegExp(`^##[\\t ]+${escaped}[\\t ]*$`, 'gmu');
  return [...source.matchAll(expression)].map((match) => match.index);
}

function initializationFailure({ relativePath, missingFact, expected, observed }) {
  return failure({
    relativePath,
    reasonCode: 'seed_initialization_structure',
    coordinate: 'seed-initialization',
    missingFact,
    expected,
    observed,
  });
}

export function renderSeedInitializationRegion() {
  const sections = SEED_TOPIC_INITIALIZATION.sections
    .map((section) => `## ${section.heading}\n\n${section.content}`)
    .join('\n\n');
  return [
    SEED_TOPIC_INITIALIZATION.startMarker,
    '',
    sections,
    '',
    SEED_TOPIC_INITIALIZATION.endMarker,
  ].join('\n');
}

/**
 * Validate only the current marked initialization layout. This does not judge
 * research prose or infer any authority from an unmarked legacy body.
 */
export function evaluateSeedInitializationStructure({ raw, relativePath }) {
  const body = seedBody(raw);
  const startOffsets = offsetsOf(body, SEED_TOPIC_INITIALIZATION.startMarker);
  const endOffsets = offsetsOf(body, SEED_TOPIC_INITIALIZATION.endMarker);
  const hasCurrentMarkers = startOffsets.length > 0 || endOffsets.length > 0;
  if (!hasCurrentMarkers) return { passed: true, mode: 'legacy', relative_path: relativePath };

  const appendix = `## ${SEED_TOPIC_INITIALIZATION.appendixHeading}`;
  const appendixOffsets = headingOffsets(body, SEED_TOPIC_INITIALIZATION.appendixHeading);
  if (startOffsets.length !== 1 || endOffsets.length !== 1 || appendixOffsets.length !== 1) {
    return initializationFailure({
      relativePath,
      missingFact: 'A current Seed Topic must contain exactly one seed-initialization start marker, one end marker, and one Engine-owned appendix boundary.',
      expected: { start_markers: 1, end_markers: 1, appendix_boundaries: 1 },
      observed: { start_markers: startOffsets.length, end_markers: endOffsets.length, appendix_boundaries: appendixOffsets.length, appendix },
    });
  }

  const [start] = startOffsets;
  const [end] = endOffsets;
  const [appendixStart] = appendixOffsets;
  if (!(start < end && end < appendixStart)) {
    return initializationFailure({
      relativePath,
      missingFact: 'The seed-initialization region must occur once before the Engine-owned research appendix.',
      expected: 'seed-initialization:start < seed-initialization:end < 研究轮次追加区',
      observed: { start, end, appendix_start: appendixStart },
    });
  }

  const belowInitialization = body.slice(end + SEED_TOPIC_INITIALIZATION.endMarker.length);
  for (const section of SEED_TOPIC_INITIALIZATION.sections) {
    if (headingOffsets(belowInitialization, section.heading).length === 0) continue;
    return initializationFailure({
      relativePath,
      missingFact: `Renderer-owned initialization heading '## ${section.heading}' appears below the initialization boundary.`,
      expected: `## ${section.heading} only inside the seed-initialization region`,
      observed: `## ${section.heading} below ${SEED_TOPIC_INITIALIZATION.endMarker}`,
    });
  }
  if (/(?:^|\n)[^\n]*\bpending\s*[—-]/iu.test(belowInitialization)) {
    return initializationFailure({
      relativePath,
      missingFact: 'A template pending marker remains below the initialization boundary in the Engine-owned appendix.',
      expected: 'no template pending marker below seed-initialization:end',
      observed: 'pending marker below initialization boundary',
    });
  }

  const initialization = body.slice(start + SEED_TOPIC_INITIALIZATION.startMarker.length, end);
  let previousOffset = -1;
  for (const section of SEED_TOPIC_INITIALIZATION.sections) {
    const offsets = headingOffsets(initialization, section.heading);
    if (offsets.length !== 1 || offsets[0] <= previousOffset) {
      return initializationFailure({
        relativePath,
        missingFact: `The initialization region must retain one ordered '## ${section.heading}' heading.`,
        expected: `one ordered ## ${section.heading} heading inside seed-initialization`,
        observed: { heading: section.heading, count: offsets.length, offsets },
      });
    }
    previousOffset = offsets[0];
  }

  return { passed: true, mode: 'current', relative_path: relativePath };
}

function equal(value, expected) {
  if (Object.is(value, expected)) return true;
  if (typeof value !== typeof expected || value === null || expected === null) return false;
  if (Array.isArray(value) || Array.isArray(expected)) {
    if (!Array.isArray(value) || !Array.isArray(expected) || value.length !== expected.length) return false;
    return value.every((entry, index) => equal(entry, expected[index]));
  }
  if (typeof value !== 'object') return false;
  const actualKeys = Object.keys(value).sort();
  const expectedKeys = Object.keys(expected).sort();
  if (actualKeys.length !== expectedKeys.length || actualKeys.some((key, index) => key !== expectedKeys[index])) return false;
  return actualKeys.every((key) => equal(value[key], expected[key]));
}

function failure({ relativePath, reasonCode, coordinate, missingFact, expected, observed }) {
  return {
    passed: false,
    reason_code: reasonCode,
    relative_path: relativePath,
    write_to: coordinate ? `${relativePath}#/${coordinate}` : relativePath,
    missing_fact: missingFact,
    expected,
    observed,
  };
}

/**
 * Evaluate one declared seed file against its already-resolved canonical Topic.
 * This function deliberately performs no path resolution, I/O, or body checks.
 */
export function evaluateSeedTopicAuthoring({ raw, relativePath, topic }) {
  const expectedPath = `seed_topics/${topic.slug}.md`;
  if (relativePath !== expectedPath) {
    return failure({
      relativePath,
      reasonCode: 'path_mismatch',
      missingFact: `Declared seed path must be ${expectedPath} for canonical Topic '${topic.slug}'.`,
      expected: expectedPath,
      observed: relativePath,
    });
  }

  let frontmatter;
  try {
    frontmatter = parseMdFrontmatter(raw);
  } catch (error) {
    return failure({
      relativePath,
      reasonCode: 'frontmatter_invalid',
      coordinate: 'frontmatter',
      missingFact: `${relativePath} must contain parseable YAML frontmatter: ${error.message || String(error)}.`,
      expected: 'parseable YAML frontmatter',
      observed: 'parse_error',
    });
  }

  if (!frontmatter || typeof frontmatter !== 'object' || Array.isArray(frontmatter)) {
    return failure({
      relativePath,
      reasonCode: 'frontmatter_invalid',
      coordinate: 'frontmatter',
      missingFact: `${relativePath} must contain parseable YAML frontmatter.`,
      expected: 'object YAML frontmatter',
      observed: frontmatter ?? null,
    });
  }

  for (const field of BINDING_FIELDS) {
    if (equal(frontmatter[field], topic[field])) continue;
    return failure({
      relativePath,
      reasonCode: 'canonical_binding_mismatch',
      coordinate: field,
      missingFact: `${relativePath} frontmatter ${field.replaceAll('_', ' ')} must equal canonical Topic ${field.replaceAll('_', ' ')}.`,
      expected: topic[field],
      observed: frontmatter[field] ?? null,
    });
  }

  return { passed: true, relative_path: relativePath };
}

/**
 * Admit the one seed declaration a queue card is allowed to complete.
 * This remains pure: the queue adapter owns canonical-plan and file reads.
 */
export function admitSeedTopicMaterializeDeclaration({ item, topicRegistry }) {
  const ownerBoundary = 'Queue card declaration for seed_topic_materialize';
  const fail = (missingFact) => ({
    passed: false,
    repair_kind: 'missing_contract',
    missing_fact: missingFact,
    write_to: ownerBoundary,
  });
  const slug = item?.payload?.topic_slug;
  if (typeof slug !== 'string' || !slug) {
    return fail('seed_topic_materialize declaration must provide payload.topic_slug for one current canonical Topic.');
  }
  const topics = (topicRegistry || []).filter((topic) => topic.slug === slug);
  if (topics.length !== 1) {
    return fail(`seed_topic_materialize payload.topic_slug '${slug}' must resolve to exactly one current canonical Topic.`);
  }
  const expectedPath = `seed_topics/${slug}.md`;
  if (!Array.isArray(item.writes_to) || item.writes_to.length !== 1) {
    return fail('seed_topic_materialize declaration must contain exactly one writes_to path.');
  }
  if (item.writes_to[0] !== expectedPath) {
    return fail(`seed_topic_materialize writes_to must be ${expectedPath}.`);
  }
  const expectedReceipt = `file:${expectedPath}`;
  if (!Array.isArray(item.required_receipts) || item.required_receipts.length !== 1 || item.required_receipts[0] !== expectedReceipt) {
    return fail(`seed_topic_materialize required_receipts must contain exactly one matching ${expectedReceipt} entry.`);
  }
  if (item.completion_receipt !== expectedReceipt) {
    return fail(`seed_topic_materialize completion_receipt must equal ${expectedReceipt}.`);
  }
  return { passed: true, relative_path: expectedPath, topic: topics[0] };
}
