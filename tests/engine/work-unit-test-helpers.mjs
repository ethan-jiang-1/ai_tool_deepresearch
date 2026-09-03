import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

import {
  createQueue,
  enqueue,
  loadQueue,
  makeItem,
  saveQueue,
} from '../../DEEP_RESEARCH_HARNESS/engine/queue-manager.mjs';
import {
  claimWorkUnits,
  loadWorkUnitIndex,
  submitWorkUnit,
} from '../../DEEP_RESEARCH_HARNESS/engine/work-unit-core.mjs';
export function tempWorkUnitBundle(prefix = 'wu-helper-') {
  return mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function cleanupWorkUnitBundle(dir) {
  rmSync(dir, { recursive: true, force: true });
}

export function recursiveAuthoritySnapshot(targetPath, { excluded = new Set(['rb_trace.jsonl', '_logs']) } = {}) {
  if (!existsSync(targetPath)) return { type: 'missing' };
  const stats = statSync(targetPath);
  if (!stats.isDirectory()) return { type: 'file', content: readFileSync(targetPath, 'base64') };
  return {
    type: 'dir',
    entries: Object.fromEntries(readdirSync(targetPath).sort()
      .filter((name) => !excluded.has(name))
      .map((name) => [name, recursiveAuthoritySnapshot(path.join(targetPath, name), { excluded })])),
  };
}

export function referenceContent(overrides = {}) {
  const opts = {
    source_url: 'https://fixture.news-research.com/research/article',
    acceptance_status: 'accepted',
    source_type: 'primary',
    tier: 'Tier 2',
    trust_level: 'expert',
    related_topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000',
    evidence_role: 'deepening_reference',
    why_it_matters: 'Relevant source for this research.',
    accessed_at: '2026-07-06',
    coreContent: 'This source contains substantial context and details for the research question. The capture is intentionally longer than one hundred characters so Engine reference counting can treat it as a countable reference.',
    keyFacts: [
      'Fact one is concrete and relevant.',
      'Fact two adds supporting detail.',
      'Fact three describes another observed point.',
      'Fact four gives a useful comparison.',
      'Fact five closes the minimum countable set.',
    ],
    ...overrides,
  };
  const topicBinding = Object.hasOwn(overrides, 'related_topic_uids')
    ? [
      '- related_topic_uids:',
      ...(opts.related_topic_uids || []).map((topicUid) => `  - ${topicUid}`),
    ]
    : [`- related_topic_uid: ${opts.related_topic_uid}`];
  if (Object.hasOwn(overrides, 'related_topic') && opts.related_topic !== undefined) {
    topicBinding.push(`- related_topic: ${opts.related_topic}`);
  }
  return [
    `- source_url: ${opts.source_url}`,
    `- acceptance_status: ${opts.acceptance_status}`,
    `- source_type: ${opts.source_type}`,
    `- tier: ${opts.tier}`,
    `- trust_level: ${opts.trust_level}`,
    ...topicBinding,
    `- evidence_role: ${opts.evidence_role}`,
    `- why_it_matters: ${opts.why_it_matters}`,
    `- accessed_at: ${opts.accessed_at}`,
    '',
    '## Key Facts',
    ...opts.keyFacts.map((fact) => `- ${fact}`),
    '',
    '## Core Content Capture',
    opts.coreContent,
    '',
    '## Relevance To This Research',
    'Relevant context.',
    '',
    '## Quotable Terms / Concepts',
    '- Term',
    '',
    '## Risks And Limitations',
    'Some limitations.',
  ].join('\n');
}

function kindForPhase(phase) {
  if (phase === 'wave0') return 'wave0_source_intake';
  if (phase === 'wave1') return 'wave1_topic_deepening';
  if (phase === 'wave2') return 'wave2_targeted_evidence';
  return 'wave0_source_intake';
}

function producerRuleForKind(kind) {
  if (kind === 'wave0_source_intake') return 'source_intake_fan_in';
  if (kind === 'wave1_topic_deepening') return 'topic_deepening';
  if (kind === 'wave2_targeted_evidence') return 'targeted_evidence_search';
  return 'delegated_work';
}

export function delegatedRoleForKind(kind) {
  if (kind === 'wave0_source_intake') return 'dpt-source-intake';
  if (kind === 'wave1_topic_deepening') return 'dpt-evidence-extractor';
  if (kind === 'wave2_targeted_evidence') return 'dpt-topic-scout';
  return 'dpt-source-intake';
}

export function availableActorDecision(kind = 'wave0_source_intake') {
  return {
    actorObservation: {
      outcome: 'available',
      source: 'native_probe',
      role_key: delegatedRoleForKind(kind),
      reason_code: 'probe_succeeded',
    },
    executionActorClass: 'delegated_subagent',
  };
}

export function currentDelegatedActorExecution(roleKey) {
  if (typeof roleKey !== 'string' || roleKey.length === 0) {
    throw new Error('current delegated actor execution requires an explicit role key');
  }
  return {
    execution_actor_class: 'delegated_subagent',
    delegated_role_key: roleKey,
    observation: {
      outcome: 'available',
      source: 'native_probe',
      role_key: roleKey,
      reason_code: 'probe_succeeded',
      recorded_at: '2026-08-15T00:00:00.000Z',
    },
    policy_decision: 'normal_allowed',
    fallback_from: null,
  };
}

export function delegatedQueueItem(id = 'queue-a', overrides = {}) {
  const phase = overrides.phase || 'wave0';
  const kind = overrides.kind || kindForPhase(phase);
  const producer_rule = overrides.producer_rule || producerRuleForKind(kind);
  const topicSlug = overrides.payload?.topic_slug || 'topic-a';
  const topicUid = overrides.payload?.topic_uid || 'tp_123e4567-e89b-12d3-a456-426614174000';
  const payload = kind === 'wave2_targeted_evidence'
    ? { finding_id: 'W2F-001', wave: 2, ...overrides.payload }
    : {
        topic_uid: topicUid,
        topic_slug: topicSlug,
        wave: phase === 'wave1' ? 1 : 0,
        ...(kind === 'wave1_topic_deepening' ? { assignment_mode: 'primary' } : {}),
        ...overrides.payload,
      };
  const assignmentDefaults = kind === 'wave0_source_intake'
    ? {
        required_receipts: [`file:artifacts/wave0/${topicSlug}/source.yaml`],
        writes_to: [`artifacts/wave0/${topicSlug}/source.yaml`],
      }
    : kind === 'wave1_topic_deepening'
      ? payload.assignment_mode === 'supplementary'
        ? { required_receipts: [], writes_to: [] }
        : {
            required_receipts: [
              `file:artifacts/wave1/${topicSlug}/evidence-summary.md`,
              `file:artifacts/wave1/${topicSlug}/question-list.md`,
            ],
            writes_to: [
              `artifacts/wave1/${topicSlug}/evidence-summary.md`,
              `artifacts/wave1/${topicSlug}/question-list.md`,
            ],
          }
      : { required_receipts: [], writes_to: [] };
  return makeItem({
    queue_item_id: id,
    title: `Delegated ${id}`,
    targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: delegatedRoleForKind(kind), timeout_ms: 600000 } },
    kind,
    producer_rule,
    payload,
    ...assignmentDefaults,
    ...overrides,
    payload,
    kind,
    producer_rule,
  });
}

export function seedDelegatedQueue(dir, items = [delegatedQueueItem('queue-a')]) {
  const planPath = path.join(dir, 'rb_plan.md');
  const planText = existsSync(planPath) ? readFileSync(planPath, 'utf8') : '';
  const frontmatter = planText.match(/^---\n([\s\S]*?)\n---/)?.[1];
  let plan = null;
  try {
    plan = frontmatter ? parseYaml(frontmatter) : null;
  } catch {
    plan = null;
  }
  const canonicalPlan = typeof plan?.plan_basename === 'string'
    && Number.isInteger(plan?.derived_topic_count)
    && plan?.topic_registry_version === '2'
    && Array.isArray(plan?.topic_registry)
    && plan.topic_registry.every((topic) => (
      typeof topic?.topic_uid === 'string'
      && typeof topic?.slug === 'string'
      && Array.isArray(topic?.must_answer)
      && typeof topic?.scope_role === 'string'
      && Array.isArray(topic?.depends_on_topic_uids)
    ));
  let canonicalTopics = canonicalPlan ? plan.topic_registry : [];
  if (!canonicalPlan) {
    canonicalTopics = [...new Map(items
      .filter((item) => item.payload?.topic_uid && item.payload?.topic_slug)
      .map((item) => [item.payload.topic_uid, {
        topic_uid: item.payload.topic_uid,
        id: String(item.payload.topic_slug === 'topic-a' ? '01' : '02'),
        slug: item.payload.topic_slug,
        title: item.payload.topic_slug === 'topic-a' ? 'Topic A' : item.payload.topic_slug,
        must_answer: [`What must be established for ${item.payload.topic_slug}?`],
        scope_role: 'primary',
        depends_on_topic_uids: [],
        previous_layouts: [],
      }])).values()];
    if (canonicalTopics.length > 0) {
      writeFileSync(planPath, `---\n${JSON.stringify({
        plan_basename: path.basename(dir),
        derived_topic_count: canonicalTopics.length,
        topic_registry_version: '2',
        topic_registry: canonicalTopics,
      }, null, 2)}\n---\n# Plan\n`);
    }
  }
  if (canonicalTopics.length > 0) ensureCanonicalSeedBindings(dir, canonicalTopics);
  let queue = createQueue(path.basename(dir));
  for (const item of items) queue = enqueue(queue, item);
  saveQueue(dir, queue);
}

function ensureCanonicalSeedBindings(dir, topics) {
  const seedRoot = path.join(dir, 'seed_topics');
  mkdirSync(seedRoot, { recursive: true });
  for (const topic of topics) {
    const seedPath = path.join(seedRoot, `${topic.slug}.md`);
    if (existsSync(seedPath)) continue;
    const binding = {
      topic_uid: topic.topic_uid,
      id: topic.id,
      slug: topic.slug,
      title: topic.title,
      must_answer: topic.must_answer,
      scope_role: topic.scope_role,
      depends_on_topic_uids: topic.depends_on_topic_uids,
    };
    writeFileSync(seedPath, `---\n${JSON.stringify(binding, null, 2)}\n---\n# ${topic.title}\n`);
  }
}

export function claimAndSubmitWorkUnit(dir, {
  phase = 'wave0',
  queueItemId = 'queue-a',
  kind = kindForPhase(phase),
  producer_rule = producerRuleForKind(kind),
  queueItemOverrides = {},
  outputs = null,
  cacheTrails = null,
  resultOverrides = {},
  receiptOverrides = {},
  actorDecision = availableActorDecision(kind),
  preserveQueue = false,
  submit = true,
  submitOptions = {},
} = {}) {
  const queueItem = delegatedQueueItem(queueItemId, {
    phase,
    kind,
    producer_rule,
    ...queueItemOverrides,
  });
  const requestedOutputs = outputs ?? (kind === 'wave0_source_intake'
    ? []
    : [{
        path: 'reference/topic-a-source.md',
        role: 'reference',
        source_url: 'https://fixture.news-research.com/research/article',
        source_slug: 's01_source',
        content: referenceContent(),
      }]);
  const requestedCacheTrails = cacheTrails ?? [{
    path: `_cache/${phase}/primary/${queueItemId}/s01_source`,
    url: requestedOutputs.find((output) => output.source_url)?.source_url || 'https://fixture.news-research.com/research/article',
  }];
  const planPath = path.join(dir, 'rb_plan.md');
  const planText = existsSync(planPath) ? readFileSync(planPath, 'utf8') : '';
  const frontmatter = planText.match(/^---\n([\s\S]*?)\n---/)?.[1];
  let parsedPlan = null;
  try {
    parsedPlan = frontmatter ? parseYaml(frontmatter) : null;
  } catch {
    parsedPlan = null;
  }
  const canonicalPlan = typeof parsedPlan?.plan_basename === 'string'
    && Number.isInteger(parsedPlan?.derived_topic_count)
    && parsedPlan?.topic_registry_version === '2'
    && Array.isArray(parsedPlan?.topic_registry)
    && parsedPlan.topic_registry.every((topic) => (
      typeof topic?.topic_uid === 'string'
      && typeof topic?.slug === 'string'
      && Array.isArray(topic?.must_answer)
      && typeof topic?.scope_role === 'string'
      && Array.isArray(topic?.depends_on_topic_uids)
    ));
  let canonicalTopics = canonicalPlan ? parsedPlan.topic_registry : null;
  if (!canonicalPlan && queueItem.payload?.topic_uid && queueItem.payload?.topic_slug) {
    const topic = {
      topic_uid: queueItem.payload.topic_uid,
      id: '01',
      slug: queueItem.payload.topic_slug,
      title: 'Topic A',
      must_answer: ['What must be established for Topic A?'],
      scope_role: 'primary',
      depends_on_topic_uids: [],
      previous_layouts: [],
    };
    writeFileSync(planPath, `---\n${JSON.stringify({
      plan_basename: path.basename(dir),
      derived_topic_count: 1,
      topic_registry_version: '2',
      topic_registry: [topic],
    }, null, 2)}\n---\n# Plan\n`);
    canonicalTopics = [topic];
  }
  if (canonicalTopics) ensureCanonicalSeedBindings(dir, canonicalTopics);
  if (preserveQueue) saveQueue(dir, enqueue(loadQueue(dir), queueItem));
  else seedDelegatedQueue(dir, [queueItem]);
  const claim = claimWorkUnits(dir, { phase, count: 1, ...actorDecision });
  const workId = claim.claimed_work_ids?.[0];
  if (!workId) {
    throw new Error(`test helper failed to claim a work unit for ${phase}: ${JSON.stringify({
      admission: claim.admission,
      actor_preflight: claim.actor_preflight,
      blocked_by_queue_item_id: claim.blocked_by_queue_item_id,
    })}`);
  }
  const record = loadWorkUnitIndex(dir).work_units[workId];
  const manifest = JSON.parse(readFileSync(path.join(dir, record.paths.manifest_ref), 'utf8'));

  const requiredOutputs = manifest.output_contract.required_outputs || [];
  const effectiveOutputs = [...requestedOutputs];
  for (const required of requiredOutputs) {
    if (effectiveOutputs.some((output) => output.path === required.path)) continue;
    const content = required.direct_contract === 'wave0.source-metadata-array.v1'
      ? `- url: https://fixture.news-research.com/research/article\n  title: Example source\n  retrieved_date: 2026-07-20\n  topic_tag: ${queueItem.payload.topic_slug}\n`
      : required.direct_contract === 'wave1.evidence-summary.v1'
        ? '## Key Findings\n\n- One supported finding.\n'
        : '## Topic Investigation Targets\n\nOne target.\n\n## Question Reconciliation\n\nOne reconciliation.\n\n## Emergent Question Protocol\n\nOne protocol.\n\n## Exploration / Exploitation Decision\n\nExplore.\n';
    effectiveOutputs.push({ path: required.path, role: required.role, content });
  }

  for (const output of effectiveOutputs) {
    const outputPath = path.join(dir, output.path);
    mkdirSync(path.dirname(outputPath), { recursive: true });
    if (Object.prototype.hasOwnProperty.call(output, 'content') || !existsSync(outputPath)) {
      writeFileSync(outputPath, output.content || '');
    }
  }

  for (const trail of requestedCacheTrails) {
    mkdirSync(path.join(dir, trail.path), { recursive: true });
    writeFileSync(path.join(dir, trail.path, 'websearch.json'), '[]\n');
    writeFileSync(path.join(dir, trail.path, 'page.md'), trail.page_content || `# Captured Page\n\nFetched content capture for ${trail.url}. This body preserves the source text used by the work unit.\n`);
    writeFileSync(path.join(dir, trail.path, 'meta.json'), `${JSON.stringify({
      url: trail.url,
      ...(trail.meta || {}),
    })}\n`);
  }

  writeFileSync(path.join(dir, record.paths.runtime_receipt_ref), `${JSON.stringify({
    event: 'work_done',
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    kind: record.kind,
    receipt_nonce: record.receipt_nonce,
    actor_contract_version: record.actor_contract_version,
    execution_actor_class: record.actor_execution.execution_actor_class,
    ts: '2026-07-06T00:00:00.000Z',
    ...receiptOverrides,
  })}\n`);

  const resultPath = path.join(dir, '_tmp', `${record.work_id}.result.json`);
  mkdirSync(path.dirname(resultPath), { recursive: true });
  // @impl WAI-013: wave1 submissions carry a valid structured source claim by default
  // (the claim floor rejects zero-claim results without explicit degraded capture).
  // Callers can still override source_claims/accepted_source_urls via resultOverrides
  // or opt into the degraded outlet by providing a degraded cache trail.
  const defaultSourceClaims = kind === 'wave1_topic_deepening' && effectiveOutputs.length > 0
    ? [{
        url: requestedCacheTrails[0].url,
        source_ref: effectiveOutputs[0].path,
        acceptance_status: 'accepted',
        is_new_vs_wave0: true,
        cache_trail_refs: [requestedCacheTrails[0].path],
      }]
    : undefined;
  writeFileSync(resultPath, `${JSON.stringify({
    schema_version: 'work-unit.result.v1',
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    kind: record.kind,
    receipt_nonce: record.receipt_nonce,
    actor_contract_version: record.actor_contract_version,
    execution_actor_class: record.actor_execution.execution_actor_class,
    summary: 'done',
    output_files: effectiveOutputs.map(({ content: _content, ...entry }) => entry),
    cache_trails: requestedCacheTrails.map((trail) => trail.path),
    ...(defaultSourceClaims ? { source_claims: defaultSourceClaims, accepted_source_urls: [requestedCacheTrails[0].url] } : {}),
    ...resultOverrides,
  }, null, 2)}\n`);

  const submitted = submit
    ? submitWorkUnit(dir, { work_id: record.work_id, resultPath, ...submitOptions })
    : null;
  return { record, submitted, resultPath };
}
