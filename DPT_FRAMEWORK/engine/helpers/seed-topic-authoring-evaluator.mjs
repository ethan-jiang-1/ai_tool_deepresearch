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

function equal(value, expected) {
  return JSON.stringify(value) === JSON.stringify(expected);
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
