#!/usr/bin/env node
// @impl AGQ-002, AGQ-003, AGQ-004, AGQ-005, AGQ-006, QIV-001, QIV-002, QIV-003, QIV-004, QIV-006
// @impl FRE-001: Canonical CLI location DPT_FRAMEWORK/cli/operate-queue.mjs

import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
import { parse as parseYaml } from 'yaml';
import {
  claim, complete, enqueue, fail, inspect,
  loadQueue, pendingCount, preempt, render, saveQueue, validateQueue, QUEUE,
  recordQueueAssignmentModeRepaired,
} from '../engine/queue-manager.mjs';
import {
  WORK_UNIT_ASSIGNMENT_CONTRACT_VERSION,
} from '../schema/contracts/work-unit.mjs';
import { kindContractForQueueItem } from '../engine/work-unit-utils.mjs';
import { resolveWorkUnitAssignmentContract } from '../engine/work-unit-assignment-contract.mjs';
import { inspectCanonicalTopicState } from '../engine/helpers/canonical-topic-state.mjs';
import { evaluateTopicLayouts, resolveTopicLayout } from '../engine/helpers/topic-layout.mjs';
import { CanonicalPlanSchema } from '../schema/contracts/plan.mjs';

function usage() {
  console.error(`Usage:
  node DPT_FRAMEWORK/cli/operate-queue.mjs check <bundle>
  node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue <bundle> --task <task.json>
  node DPT_FRAMEWORK/cli/operate-queue.mjs claim <bundle> --actor <main-agent|sub-agent>
  node DPT_FRAMEWORK/cli/operate-queue.mjs complete <bundle> --result <result.json>
  node DPT_FRAMEWORK/cli/operate-queue.mjs fail <bundle> --failure <failure.json>
  node DPT_FRAMEWORK/cli/operate-queue.mjs preempt <bundle> --task <task.json> --reason <reason> [--unsafe-current]
  node DPT_FRAMEWORK/cli/operate-queue.mjs count <bundle>
  node DPT_FRAMEWORK/cli/operate-queue.mjs render <bundle>
  node DPT_FRAMEWORK/cli/operate-queue.mjs project <bundle>
  node DPT_FRAMEWORK/cli/operate-queue.mjs repair <bundle> --remove-stale
  node DPT_FRAMEWORK/cli/operate-queue.mjs repair <bundle> --queue-item-id <id> --set-assignment-mode <primary|supplementary>`);
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf-8'));
}

function emit(value) {
  console.log(JSON.stringify(value, null, 2));
}

function isHelpToken(value) {
  return value === '--help' || value === '-h';
}

function guardInvocation(args) {
  const [maybeCommand, maybeBundle] = args;
  if (isHelpToken(maybeCommand)) {
    usage();
    process.exit(0);
  }
  if (!maybeCommand || !maybeBundle) {
    usage();
    process.exit(1);
  }
  if (isHelpToken(maybeBundle)) {
    console.error(`Subcommand '${maybeCommand}' requires a bundle path before help flags.`);
    usage();
    process.exit(1);
  }
  if (String(maybeBundle).startsWith('-')) {
    console.error(`Suspicious bundle argument '${maybeBundle}': positional bundle paths must not start with '-'.`);
    usage();
    process.exit(1);
  }
}

const rawArgs = process.argv.slice(2);
guardInvocation(rawArgs);

const [command, bundle] = rawArgs;
if (!command || !bundle) {
  usage();
  process.exit(1);
}

const rest = rawArgs.slice(2);
const { values } = parseArgs({
  args: rest,
  options: {
    task: { type: 'string' },
    result: { type: 'string' },
    failure: { type: 'string' },
    actor: { type: 'string', default: 'main-agent' },
    reason: { type: 'string', default: 'urgent_preemption' },
    'unsafe-current': { type: 'boolean', default: false },
    'remove-stale': { type: 'boolean', default: false },
    'queue-item-id': { type: 'string' },
    'set-assignment-mode': { type: 'string' },
  },
  allowPositionals: false,
});

const bundleDir = path.resolve(bundle);

// ═══════════════════════════════════════════════════════════════════════════
// QIV-002: Bundle name validation
// ═══════════════════════════════════════════════════════════════════════════

function readBundleNameFromStatus(bundleDir) {
  const statusPath = path.join(bundleDir, 'rb_status.json');
  if (!existsSync(statusPath)) return null;
  try {
    const status = JSON.parse(readFileSync(statusPath, 'utf-8'));
    return status.bundle || null;
  } catch { return null; }
}

function validateBundleName(queue, bundleDir, { persist = true, normalize = true } = {}) {
  const statusBundle = readBundleNameFromStatus(bundleDir);
  if (!statusBundle) return; // No status file to validate against — skip

  // Legacy queue: inject bundle_name on first operation
  if (!queue.bundle_name) {
    if (!normalize) return;
    queue.bundle_name = statusBundle;
    if (persist) saveQueue(bundleDir, queue);
    return;
  }

  // QIV-002: bundle_name mismatch → reject
  if (queue.bundle_name !== statusBundle) {
    throw new Error(
      `bundle_name mismatch: queue belongs to '${queue.bundle_name}', but bundle is '${statusBundle}'`
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// QIV-001: Topic slug resolution and validation
// ═══════════════════════════════════════════════════════════════════════════

// Known topic-scoped queue_item_id templates for fallback slug extraction.
const TOPIC_SCOPED_QUEUE_ITEM_ID_PATTERNS = [
  /^wave0-source-(?<slug>.+)$/,
  /^wave0-suppl-(?<slug>.+)-r\d+$/,
  /^wave1-deepen-(?<slug>.+)$/,
  /^wave1-suppl-(?<slug>.+)-r\d+$/,
  /^seed-topic-(?<slug>.+)$/,
  /^wave2-backfill-(?<slug>.+)$/,
  /^wave2-suppl-cross-(?<slug>.+)-r\d+$/,
  /^wave2-suppl-emergent-(?<slug>.+)-r\d+$/,
];

function resolveTopicSlug(taskCard) {
  // Priority 1: explicit payload.topic_slug
  if (taskCard.payload?.topic_slug) {
    return { slug: taskCard.payload.topic_slug, source: 'payload' };
  }

  // Priority 2: lineage.topic_slug
  if (taskCard.lineage?.topic_slug) {
    return { slug: taskCard.lineage.topic_slug, source: 'lineage' };
  }

  // Priority 3: fallback queue_item_id parsing for known topic-scoped templates.
  if (taskCard.queue_item_id) {
    for (const pattern of TOPIC_SCOPED_QUEUE_ITEM_ID_PATTERNS) {
      const match = taskCard.queue_item_id.match(pattern);
      if (match && match.groups.slug) {
        return { slug: match.groups.slug, source: 'queue_item_id' };
      }
    }
  }

  return null;
}

function isTopicScoped(taskCard) {
  // Has explicit topic slug
  if (taskCard.payload?.topic_slug || taskCard.lineage?.topic_slug) return true;

  // Matches a known topic-scoped queue_item_id template.
  if (taskCard.queue_item_id) {
    for (const pattern of TOPIC_SCOPED_QUEUE_ITEM_ID_PATTERNS) {
      if (pattern.test(taskCard.queue_item_id)) return true;
    }
  }

  // producer_rule can indicate topic scope when the card is not explicitly finding-scoped.
  if (taskCard.producer_rule === 'topic_deepening' && !isFindingScoped(taskCard)) return true;

  return false;
}

function isFindingScoped(taskCard) {
  return !!(taskCard.payload?.finding_id || taskCard.lineage?.finding_id);
}

function readCanonicalTopicRegistry(bundleDir) {
  const planPath = path.join(bundleDir, 'rb_plan.md');
  if (!existsSync(planPath)) return null;
  try {
    const raw = readFileSync(planPath, 'utf-8');
    const m = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!m) return null;
    const parsed = CanonicalPlanSchema.safeParse(parseYaml(m[1]));
    return parsed.success ? parsed.data.topic_registry : null;
  } catch { return null; }
}

function readFindingIndex(bundleDir) {
  const indexPath = path.join(bundleDir, 'artifacts', 'wave2', 'finding-index.yaml');
  if (!existsSync(indexPath)) return null;
  try {
    const raw = readFileSync(indexPath, 'utf-8');
    return parseYaml(raw);
  } catch { return null; }
}

function validateTopicSlug(taskCard, bundleDir) {
  const topicScoped = isTopicScoped(taskCard);
  const findingScoped = isFindingScoped(taskCard);

  // Check for conflicting explicit slug sources before any fallback parsing.
  if (taskCard.payload?.topic_slug && taskCard.lineage?.topic_slug &&
      taskCard.payload.topic_slug !== taskCard.lineage.topic_slug) {
    return {
      valid: false,
      error: `topic_slug conflict: payload='${taskCard.payload.topic_slug}' vs lineage='${taskCard.lineage.topic_slug}'`,
    };
  }
  if (taskCard.payload?.topic_uid && taskCard.lineage?.topic_uid &&
      taskCard.payload.topic_uid !== taskCard.lineage.topic_uid) {
    return {
      valid: false,
      error: `topic_uid conflict: payload='${taskCard.payload.topic_uid}' vs lineage='${taskCard.lineage.topic_uid}'`,
      reason_code: 'topic_uid_conflict',
    };
  }

  // Finding-scoped tasks with no topic identity skip topic_registry validation
  // and validate finding_id if an index exists.
  if (findingScoped && !topicScoped) {
    const findingIndex = readFindingIndex(bundleDir);
    if (findingIndex && taskCard.payload?.finding_id) {
      const findingIds = (findingIndex.findings || []).map(f => f.id);
      if (!findingIds.includes(taskCard.payload.finding_id)) {
        return {
          valid: false,
          error: `finding_id '${taskCard.payload.finding_id}' not found in bundle finding-index. Valid ids: ${findingIds.join(', ') || 'none'}`,
        };
      }
    }
    return { valid: true };
  }

  // Not topic-scoped: skip validation
  if (!topicScoped) return { valid: true };

  const topicState = inspectCanonicalTopicState({ bundlePath: bundleDir });
  if (topicState.mode === 'blocked') {
    const blocker = topicState.blockers?.[0];
    return {
      valid: false,
      error: blocker?.recommended_action || 'accepted topic-state workspace must be recovered before enqueue',
      reason_code: blocker?.reason_code || 'accepted_workspace',
    };
  }
  if (topicState.mode !== 'canonical') {
    return {
      valid: false,
      error: `topic-scoped work cannot enqueue while topic state is ${topicState.mode}; enter sanctioned rerun for migration first.`,
      reason_code: 'canonical_topic_state_required',
    };
  }

  // Topic-scoped: resolve slug and validate against topic_registry
  const resolved = resolveTopicSlug(taskCard);

  if (!resolved) {
    return {
      valid: false,
      error: `topic-scoped task '${taskCard.queue_item_id || '<missing queue_item_id>'}' has no resolvable topic_slug. Add payload.topic_slug or lineage.topic_slug.`,
    };
  }

  // Validate against topic_registry
  const registry = readCanonicalTopicRegistry(bundleDir);
  if (!registry) {
    return {
      valid: false,
      error: 'canonical topic registry is invalid or unreadable',
      reason_code: 'canonical_topic_state_required',
    };
  }
  const layouts = evaluateTopicLayouts(registry);
  const requestedUid = taskCard.payload?.topic_uid || taskCard.lineage?.topic_uid;
  const binding = resolveTopicLayout(layouts, { topic_uid: requestedUid, topic_slug: resolved.slug }, { currentOnly: true });
  if (!binding.ok) {
    const currentSuggestion = binding.current_slug ? ` Use current slug '${binding.current_slug}'.` : '';
    return {
      valid: false,
      error: `topic_slug '${resolved.slug}' (from ${resolved.source}) is not an accepted current UID binding.${currentSuggestion}`,
      reason_code: binding.reason_code,
      current_slug: binding.current_slug || null,
    };
  }
  const topic = topicState.topics.find((item) => item.topic_uid === binding.topic_uid);
  const blocker = topicState.blockers?.find((item) => item.slug === binding.current_slug || item.topic_uid === binding.topic_uid);
  if (!topic || blocker) {
    return {
      valid: false,
      error: blocker?.recommended_action || `topic_slug '${resolved.slug}' lacks a committed UID-bound seed projection.`,
      reason_code: blocker?.reason_code || topic?.reason_code || 'topic_binding_required',
    };
  }

  return {
    valid: true,
    slug: binding.current_slug,
    topic_uid: binding.topic_uid,
    taskCard: {
      ...taskCard,
      payload: { ...(taskCard.payload || {}), topic_uid: binding.topic_uid, topic_slug: binding.current_slug },
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// QIV-003: Projection staleness detection
// ═══════════════════════════════════════════════════════════════════════════

function computeQueueHash(bundleDir) {
  const queuePath = path.join(bundleDir, QUEUE.FILE);
  if (!existsSync(queuePath)) return null;
  const content = readFileSync(queuePath);
  return createHash('sha256').update(content).digest('hex');
}

function writeProjection(queue, bundleDir) {
  const q = queue;
  const projectionDir = path.join(bundleDir, '_cache', 'agentic-queue');
  mkdirSync(projectionDir, { recursive: true });
  const generatedAt = new Date().toISOString();
  const sourceHash = computeQueueHash(bundleDir);

  const lines = [
    `<!-- generated_at: ${generatedAt} -->`,
    `<!-- source_queue_sha256: ${sourceHash || 'N/A'} -->`,
    '# Agentic Queue Projection',
    '',
    `> **Runtime** — bundle: \`${bundleDir}\` | CLI: \`--bundle ${bundleDir}\` | projection ≠ authority`,
    '',
    `- queue_id: \`${q.queue_id}\``,
    `- queue_health: \`${q.queue_health}\``,
    `- stop_authorization_state: \`${q.stop_authorization_state}\``,
    `- bundle_name: \`${q.bundle_name || 'N/A'}\``,
    `- active_window_count: \`${q.active_window.length}\``,
    `- refill_pool_count: \`${q.refill_pool.length}\``,
    `- delegated_in_flight_count: \`${Object.keys(q.delegated_in_flight || {}).length}\``,
    '',
    '## Active Window',
    '',
  ];

  if (q.active_window.length === 0) {
    lines.push('- empty', '');
  } else {
    for (const [index, item] of q.active_window.entries()) {
      lines.push(
        `### ${index + 1}. ${item.queue_item_id}`,
        `- queue_item_id: \`${item.queue_item_id}\``,
        `- title: ${item.title}`,
        `- targets: \`controller=${item.targets?.controller || 'unknown'}${item.targets?.delegates ? `, delegates.to=${item.targets.delegates.to}, delegates.role_key=${item.targets.delegates.role_key}` : ''}\``,
        `- status: \`${item.status}\``,
        `- action: ${item.action}`,
        `- required_receipts: ${item.required_receipts.map(r => `\`${r}\``).join(', ') || '`none`'}`,
        `- completion_receipt: \`${item.completion_receipt ?? 'null'}\``,
        `- writes_to: ${item.writes_to.map(r => `\`${r}\``).join(', ') || '`none`'}`,
        `- failure_route: ${item.failure_route}`,
        '',
      );
    }
  }

  lines.push('## Delegated In Flight', '');
  const inFlight = Object.values(q.delegated_in_flight || {});
  if (inFlight.length === 0) {
    lines.push('- empty');
  } else {
    for (const entry of inFlight) {
      lines.push(`- \`${entry.queue_item_id}\` -> \`${entry.work_id}\` (${entry.kind}, deadline=${entry.deadline_at})`);
    }
  }

  lines.push('## Refill Pool', '');
  for (const item of q.refill_pool) {
    lines.push(`- \`${item.queue_item_id}\` ${item.title} (${item.priority_class}, restore=${item.restore_priority})`);
  }
  if (q.refill_pool.length === 0) lines.push('- empty');

  const outputPath = path.join(projectionDir, 'current-task.md');
  writeFileSync(outputPath, `${lines.join('\n')}\n`);
  return { outputPath, generatedAt, sourceHash };
}

function checkProjectionStaleness(bundleDir) {
  const projectionPath = path.join(bundleDir, '_cache', 'agentic-queue', 'current-task.md');
  if (!existsSync(projectionPath)) return { stale: false };

  try {
    const content = readFileSync(projectionPath, 'utf-8');
    const hashMatch = content.match(/<!-- source_queue_sha256: (\S+) -->/);
    if (!hashMatch) return { stale: false, reason: 'no hash in projection' };

    const storedHash = hashMatch[1];
    const currentHash = computeQueueHash(bundleDir);
    if (!currentHash) return { stale: false };

    if (storedHash !== currentHash) {
      return { stale: true, reason: 'projection hash does not match current queue hash — rerun operate-queue project' };
    }
    return { stale: false };
  } catch {
    return { stale: false };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// QIV-004: Repair — remove stale task cards
// ═══════════════════════════════════════════════════════════════════════════

function repairRemoveStale(queue, bundleDir) {
  const registry = (readCanonicalTopicRegistry(bundleDir) || []).map((topic) => topic.slug);
  const findingIndex = readFindingIndex(bundleDir);
  const removed = [];

  function staleReason(item) {
    const isFinding = isFindingScoped(item);
    const isTopic = isTopicScoped(item);

    if (isFinding) {
      if (findingIndex && item.payload?.finding_id) {
        const findingIds = (findingIndex.findings || []).map(f => f.id);
        if (!findingIds.includes(item.payload.finding_id)) {
          return `finding_id '${item.payload.finding_id}' not in current bundle finding-index`;
        }
      }
      return null;
    }

    if (isTopic) {
      const resolved = resolveTopicSlug(item);
      if (resolved && !registry.includes(resolved.slug)) {
        return `topic_slug '${resolved.slug}' not in current bundle topic_registry`;
      }
      if (!resolved) {
        return 'topic-scoped task with unparsable topic_slug';
      }
    }

    return null;
  }

  for (const entry of Object.values(queue.delegated_in_flight || {})) {
    const synthetic = {
      queue_item_id: entry.queue_item_id,
      producer_rule: entry.producer_rule || '',
      lineage: entry.lineage || {},
      payload: entry.payload || {},
    };
    const reason = staleReason(synthetic);
    if (reason) {
      throw new Error(`delegated in-flight queue_item_id '${entry.queue_item_id}' is stale (${reason}); resolve the work-unit attempt before queue repair`);
    }
  }

  queue.active_window = queue.active_window.filter((item, index) => {
    const reason = staleReason(item);
    if (reason) {
      removed.push({ location: 'active_window', index, queue_item_id: item.queue_item_id, reason });
      return false;
    }
    return true;
  });

  queue.refill_pool = queue.refill_pool.filter((item, index) => {
    const reason = staleReason(item);
    if (reason) {
      removed.push({ location: 'refill_pool', index, queue_item_id: item.queue_item_id, reason });
      return false;
    }
    return true;
  });

  return { queue, removed };
}

function validateCurrentAssignmentCard(taskCard) {
  if (taskCard.kind !== 'wave1_topic_deepening') return null;
  if (taskCard.producer_rule !== 'topic_deepening') {
    throw new Error('wave1_topic_deepening assignment requires producer_rule topic_deepening');
  }
  return resolveWorkUnitAssignmentContract({
    assignmentContractVersion: WORK_UNIT_ASSIGNMENT_CONTRACT_VERSION,
    kind: taskCard.kind,
    queueItem: taskCard,
    topicBinding: {
      topic_uid: taskCard.payload?.topic_uid,
      topic_slug: taskCard.payload?.topic_slug,
    },
    baseOutputContract: kindContractForQueueItem(taskCard, taskCard.kind).output_contract,
  });
}

function findQueueItemLocations(queue, queueItemId) {
  const locations = [];
  for (const [index, item] of queue.active_window.entries()) {
    if (item.queue_item_id === queueItemId) locations.push({ location: 'active_window', index, item });
  }
  for (const [index, item] of queue.refill_pool.entries()) {
    if (item.queue_item_id === queueItemId) locations.push({ location: 'refill_pool', index, item });
  }
  if (queue.delegated_in_flight?.[queueItemId]) {
    locations.push({ location: 'delegated_in_flight', item: queue.delegated_in_flight[queueItemId] });
  }
  for (const [index, record] of queue.terminal_history.entries()) {
    if (record.queue_item_id === queueItemId) locations.push({ location: 'terminal_history', index, item: record.item || record });
  }
  return locations;
}

function repairAssignmentMode(queue, bundleDir, { queueItemId, mode }) {
  if (!queueItemId) throw new Error('--queue-item-id is required with --set-assignment-mode');
  if (mode !== 'primary' && mode !== 'supplementary') {
    throw new Error('--set-assignment-mode must be primary or supplementary');
  }

  const nextQueue = JSON.parse(JSON.stringify(queue));
  const locations = findQueueItemLocations(nextQueue, queueItemId);
  if (locations.length !== 1) throw new Error(`queue_item_id ${queueItemId} must identify exactly one durable queue location`);
  const target = locations[0];
  if (target.location !== 'active_window' && target.location !== 'refill_pool') {
    throw new Error(`queue_item_id ${queueItemId} is not an unclaimed queued card`);
  }
  const item = target.item;
  if (item.status !== 'queued') throw new Error(`queue_item_id ${queueItemId} is not queued`);
  if (item.kind !== 'wave1_topic_deepening' || item.producer_rule !== 'topic_deepening') {
    throw new Error(`queue_item_id ${queueItemId} is not a topic_deepening Wave1 work-unit demand`);
  }
  if (Object.hasOwn(item.payload || {}, 'assignment_mode')) {
    throw new Error(`queue_item_id ${queueItemId} already has assignment_mode and cannot be reclassified`);
  }
  if (!item.payload?.topic_uid || !item.payload?.topic_slug) {
    throw new Error(`queue_item_id ${queueItemId} lacks explicit canonical Topic coordinates`);
  }

  const topicValidation = validateTopicSlug(item, bundleDir);
  if (!topicValidation.valid) throw new Error(topicValidation.error);
  const canonical = topicValidation.taskCard || item;
  const evidencePath = `artifacts/wave1/${canonical.payload.topic_slug}/evidence-summary.md`;
  const questionPath = `artifacts/wave1/${canonical.payload.topic_slug}/question-list.md`;
  const priorReceipts = [...item.required_receipts];
  const derivedReceipts = mode === 'primary'
    ? [`file:${evidencePath}`, `file:${questionPath}`]
    : [];
  const repaired = {
    ...item,
    payload: { ...item.payload, assignment_mode: mode },
    required_receipts: derivedReceipts,
    completion_receipt: 'work_unit:submitted-ledger',
    writes_to: mode === 'primary'
      ? [...new Set([...item.writes_to, evidencePath, questionPath])]
      : [...item.writes_to],
    updated_at: new Date().toISOString(),
  };
  target.location === 'active_window'
    ? nextQueue.active_window.splice(target.index, 1, repaired)
    : nextQueue.refill_pool.splice(target.index, 1, repaired);

  validateCurrentAssignmentCard(repaired);
  validateQueue(nextQueue);
  return {
    queue: nextQueue,
    item: repaired,
    location: target.location,
    priorReceipts,
    derivedReceipts,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Main command dispatch
// ═══════════════════════════════════════════════════════════════════════════

let queue = loadQueue(bundleDir);

try {
  if (command === 'check') {
    // Validate bundle_name first (QIV-002)
    validateBundleName(queue, bundleDir);

    // Check projection staleness (QIV-003)
    const staleness = checkProjectionStaleness(bundleDir);
    if (staleness.stale) {
      console.error(`WARNING: ${staleness.reason}`);
    }

    const feedback = inspect(queue, bundleDir);
    emit(feedback);
    process.exit(feedback.passed ? 0 : 1);
  }

  if (command === 'count') {
    validateBundleName(queue, bundleDir);
    emit({
      pending: pendingCount(queue),
      active_window: queue.active_window.length,
      refill_pool: queue.refill_pool.length,
      delegated_in_flight: Object.keys(queue.delegated_in_flight || {}).length,
    });
    process.exit(0);
  }

  if (command === 'project') {
    validateBundleName(queue, bundleDir);
    const { outputPath, generatedAt, sourceHash } = writeProjection(queue, bundleDir);
    emit({ ok: true, projection: outputPath, generated_at: generatedAt, source_queue_sha256: sourceHash });
  } else if (command === 'enqueue') {
    validateBundleName(queue, bundleDir, { persist: false });
    if (!values.task) throw new Error('--task is required');
    const taskCard = readJson(values.task);

    // QIV-001: Validate topic_slug against topic_registry
    const validation = validateTopicSlug(taskCard, bundleDir);
    if (!validation.valid) {
      const error = { ok: false, error: validation.error, code: 'topic_validation_failed', reason_code: validation.reason_code || null };
      emit(error);
      process.exit(1);
    }

    const admittedTask = validation.taskCard || taskCard;
    validateCurrentAssignmentCard(admittedTask);
    queue = enqueue(queue, admittedTask);
    saveQueue(bundleDir, queue);
    emit({ ok: true, queue });
  } else if (command === 'claim') {
    validateBundleName(queue, bundleDir);
    const result = claim(queue, { actor: values.actor, bundleDir });
    if (result.reason_code !== 'delegated_requires_work_unit_claim') saveQueue(bundleDir, result.queue);
    emit(result);
    process.exit(result.item ? 0 : 1);
  } else if (command === 'complete') {
    validateBundleName(queue, bundleDir, { persist: false, normalize: false });
    if (!values.result) throw new Error('--result is required');
    const result = complete(queue, readJson(values.result), bundleDir);
    if (result.persist_queue !== false) {
      validateBundleName(result.queue, bundleDir, { persist: false });
      saveQueue(bundleDir, result.queue);
    }
    emit(result);
    process.exit(result.feedback.passed ? 0 : 1);
  } else if (command === 'fail') {
    validateBundleName(queue, bundleDir);
    if (!values.failure) throw new Error('--failure is required');
    queue = fail(queue, readJson(values.failure), bundleDir);
    saveQueue(bundleDir, queue);
    emit({ ok: true, queue });
  } else if (command === 'preempt') {
    validateBundleName(queue, bundleDir);
    if (!values.task) throw new Error('--task is required');
    queue = preempt(queue, readJson(values.task), {
      reason: values.reason,
      unsafeCurrent: values['unsafe-current'],
      replaceCurrent: values['unsafe-current'],
    });
    saveQueue(bundleDir, queue);
    emit({ ok: true, queue });
  } else if (command === 'render') {
    validateBundleName(queue, bundleDir);
    const projection = render(queue, bundleDir);
    saveQueue(bundleDir, queue);
    emit({ ok: true, projection });
  } else if (command === 'repair') {
    validateBundleName(queue, bundleDir, { persist: false });
    if (values['remove-stale']) {
      const result = repairRemoveStale(queue, bundleDir);
      saveQueue(bundleDir, result.queue);
      emit({
        ok: true,
        action: 'remove-stale',
        removed_count: result.removed.length,
        removed: result.removed,
      });
    } else if (values['set-assignment-mode']) {
      const result = repairAssignmentMode(queue, bundleDir, {
        queueItemId: values['queue-item-id'],
        mode: values['set-assignment-mode'],
      });
      const savedQueue = saveQueue(bundleDir, result.queue);
      recordQueueAssignmentModeRepaired({
        queue_item_id: result.item.queue_item_id,
        topic_uid: result.item.payload.topic_uid,
        topic_slug: result.item.payload.topic_slug,
        queue_location: result.location,
        prior_required_receipts: result.priorReceipts,
        assignment_mode: result.item.payload.assignment_mode,
        derived_required_receipts: result.derivedReceipts,
      });
      emit({ ok: true, action: 'set-assignment-mode', queue_item_id: result.item.queue_item_id, queue: savedQueue });
    } else {
      throw new Error('repair requires --remove-stale or --queue-item-id plus --set-assignment-mode');
    }
  } else {
    usage();
    process.exit(1);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
