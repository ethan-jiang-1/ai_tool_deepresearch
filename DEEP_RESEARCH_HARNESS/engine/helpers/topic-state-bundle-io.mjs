// topic-state-bundle-io.mjs
// Bundle/seed IO primitives, workspace paths, seed render, and canonical seed
// binding evaluation (W2 carve). Bottom layer shared by all flows.
// @impl CTS-001, CTS-008

import {
  closeSync, constants, existsSync, fsyncSync, lstatSync, mkdirSync, openSync,
  readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { z } from 'zod';
import { CanonicalPlanSchema } from '../../schema/contracts/plan.mjs';
import { WorkUnitManifestSchema } from '../../schema/contracts/work-unit.mjs';
import { checkPhaseHandoffPreflight } from './handoff-helpers.mjs';
import { readSubmittedWorkUnitDeclarations } from './gate-helpers-readers.mjs';
import { acceptedTopicSlugs, buildTopicLayoutTarget, evaluateTopicLayouts, losslessTopicSlugStem, resolveStructuredTopicBinding } from './topic-layout.mjs';
import { makeContractFinding } from './wave-contract-findings.mjs';
import { evaluateRerunDirection } from './rerun-direction.mjs';
import { locateCanonicalSections } from './plan-hostfile-sections.mjs';
import { evaluateSeedTopicAuthoring, renderSeedInitializationRegion } from './seed-topic-authoring-evaluator.mjs';
import { buildResearchStyleApplyCommand, RESEARCH_STYLE_WRITER_PATH } from './research-style-projection.mjs';
import {
  collectEligibleWorkUnitProjection,
  collectSubmittedWave0ContributionProjection,
  readProjectionProfileRound,
} from '../work-unit-projection.mjs';
import { loadWave2FindingIndexFact } from './wave-depth-contracts.mjs';
import {
  PROJECTION_ENTRY_FIELDS,
  evaluateProjectionEntryNavigation,
  isAcceptedDeferredProjectionEntry,
  parseProjectionEntryArea,
  upsertProjectionEntryArea,
} from './projection-entry-contract.mjs';
import {
  TOPIC_STATE_ROOT,
} from './canonical-topic-state.mjs';
import { SEED_TOPIC_PROJECTION_ENTRY_FIELDS, SEED_TOPIC_PROJECTION_CARD_LABEL, SEED_TOPIC_PROJECTION_SLOTS, PROJECTION_SLOT_BY_ID, projectionSlotForId, projectionSlotsForWave, projectionSlotHeadingMatches, locateSeedProjectionSlots, renderSeedProjectionCard, renderSeedProjectionSlot, renderSeedProjectionAppendix, splitSeedProjectionCard } from "./topic-schema-projection.mjs";

export function hashBytes(value) { return createHash('sha256').update(value).digest('hex'); }

export function fsyncPath(filePath) { const fd = openSync(filePath, constants.O_RDONLY); try { fsyncSync(fd); } finally { closeSync(fd); } }

export function writeDurable(filePath, bytes, flag = 'wx') { writeFileSync(filePath, bytes, { flag }); fsyncPath(filePath); }

export function safeBundle(bundlePath) {
  const resolved = path.resolve(bundlePath);
  if (!existsSync(resolved) || !lstatSync(resolved).isDirectory() || lstatSync(resolved).isSymbolicLink()) throw new Error('bundle must be a real directory');
  return resolved;
}

export function splitPlan(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) throw new Error('rb_plan.md frontmatter missing');
  return { frontmatter: parseYaml(match[1]), body: raw.slice(match[0].length) };
}

export function renderPlan(frontmatter, body) { return `---\n${stringifyYaml(frontmatter).trimEnd()}\n---\n${body}`; }

export function newSeedEnrichment() {
  return {
    hypothesis: 'pending — seed-topics Agent must derive the initial hypothesis, gap, or tension',
    in_scope: 'pending — seed-topics Agent must define the research boundary',
    out_of_scope: 'pending — seed-topics Agent must define what will not be deepened',
    search_guardrails: {
      required_terms: ['pending — seed-topics Agent must identify required search terms'],
      forbidden_broadening: ['pending — seed-topics Agent must identify forbidden broadening'],
    },
    evidence_route: {
      preferred_sources: ['pending — seed-topics Agent must identify preferred source types'],
      noise_to_avoid: ['pending — seed-topics Agent must identify likely source noise'],
    },
  };
}

export function renderNewSeedBody(topic) {
  return `# ${topic.title}

${renderSeedInitializationRegion()}

## ═══ 研究轮次追加区 ═══

> 后续 Wave 必须用提交/接受的直接证据替换各自唯一占位 token；不要追加第二套回填区。

## 历史摘要

*(seed-topics: 本 topic 为新建，无历史轮次)*

${renderSeedProjectionAppendix()}
`;
}

export function renderRerunDirection(direction) {
  return `## 本轮重跑方向\n\n- rerun_count: ${direction.rerun_count}\n- action: ${direction.action}\n- new_search_dimensions: ${direction.new_search_dimensions}\n- adjusted_depth: ${direction.adjusted_depth}\n- search_guardrails: ${direction.search_guardrails}\n- rationale_excerpt: ${direction.rationale_excerpt}\n`;
}

export function replaceRerunDirection(body, direction) {
  const withoutDirections = String(body || '').replace(/##\s*本轮重跑方向[^\n]*[\s\S]*?(?=\n##\s+|$)/g, '').trimEnd();
  const rendered = `${withoutDirections}\n\n${renderRerunDirection(direction)}`;
  const checked = evaluateRerunDirection(rendered, direction.rerun_count);
  if (checked.state !== 'matching' || checked.structural_roots.length > 0 || checked.fields.action !== direction.action) {
    throw new Error('canonical rerun direction render failed round-trip validation');
  }
  return rendered;
}

export function renderSeed(topic, existingSeed = null, direction = null) {
  const canonicalFrontmatter = {
    topic_uid: topic.topic_uid, id: topic.id, slug: topic.slug, title: topic.title,
    must_answer: topic.must_answer, scope_role: topic.scope_role,
    depends_on_topic_uids: topic.depends_on_topic_uids,
  };
  const frontmatter = existingSeed?.exists
    ? { ...(existingSeed.frontmatter || {}), ...canonicalFrontmatter }
    : { ...canonicalFrontmatter, ...newSeedEnrichment() };
  const body = direction
    ? replaceRerunDirection(existingSeed?.exists ? existingSeed.body : renderNewSeedBody(topic), direction)
    : (existingSeed?.exists ? existingSeed.body : renderNewSeedBody(topic));
  return `---\n${stringifyYaml(frontmatter).trimEnd()}\n---\n${body}`;
}

export function readSeed(bundle, slug) {
  const seedPath = path.join(bundle, 'seed_topics', `${slug}.md`);
  if (!existsSync(seedPath)) return { exists: false, path: seedPath, raw: null, frontmatter: null, body: '' };
  if (lstatSync(seedPath).isSymbolicLink() || !lstatSync(seedPath).isFile()) throw new Error(`seed_topics/${slug}.md must be a non-symlink regular file`);
  const raw = readFileSync(seedPath, 'utf8');
  const split = splitPlan(raw);
  return { exists: true, path: seedPath, raw, frontmatter: split.frontmatter, body: split.body };
}

export function workspaceRoot(bundle, create = false) {
  const diagnostics = path.join(bundle, '_diagnostics');
  const root = path.join(bundle, TOPIC_STATE_ROOT);
  if (create && !existsSync(root)) { mkdirSync(root, { recursive: true }); fsyncPath(existsSync(diagnostics) ? diagnostics : bundle); }
  for (const candidate of [diagnostics, root]) {
    if (existsSync(candidate) && (lstatSync(candidate).isSymbolicLink() || !lstatSync(candidate).isDirectory())) throw new Error(`${path.relative(bundle, candidate)} must be a real directory`);
  }
  return root;
}

export function acceptedWorkspaces(bundle) {
  const root = workspaceRoot(bundle);
  if (!existsSync(root)) return [];
  return readdirSync(root).sort().flatMap((name) => {
    const manifestPath = path.join(root, name, 'prepared.json');
    if (!existsSync(manifestPath)) return [];
    try { return [{ operation_id: name, workspace: path.relative(bundle, path.join(root, name)).replaceAll('\\', '/'), manifest: JSON.parse(readFileSync(manifestPath, 'utf8')) }]; } catch { return [{ operation_id: name, workspace: path.relative(bundle, path.join(root, name)).replaceAll('\\', '/'), manifest: null }]; }
  });
}

export function evaluateCanonicalSeedBindings(bundle, plan) {
  const rows = [];
  for (const topic of plan.topic_registry) {
    const relativePath = `seed_topics/${topic.slug}.md`;
    const seedPath = path.join(bundle, relativePath);
    if (!existsSync(seedPath)) {
      rows.push({ topic_uid: topic.topic_uid, slug: topic.slug, ok: false, reason_code: 'seed_missing', fact_refs: [`rb_plan.md#/topic_registry/${topic.topic_uid}`, relativePath] });
      continue;
    }
    const evaluation = evaluateSeedTopicAuthoring({
      raw: readFileSync(seedPath, 'utf8'),
      relativePath,
      topic,
    });
    rows.push({
      topic_uid: topic.topic_uid,
      slug: topic.slug,
      ok: evaluation.passed,
      reason_code: evaluation.passed ? 'bound' : 'seed_mismatch',
      authoring_reason_code: evaluation.passed ? null : evaluation.reason_code,
      fact_refs: [`rb_plan.md#/topic_registry/${topic.topic_uid}`, relativePath],
    });
  }
  return rows;
}
