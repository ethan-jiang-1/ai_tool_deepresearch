// @impl CTS-001, CTS-002, CTS-003, CTS-004, CTS-009, SCO-013

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

export const TOPIC_STATE_SCHEMA_VERSION = '1.1.0';
export const TOPIC_STATE_ROOT = '_diagnostics/topic-state';
export const TOPIC_STATE_OPERATIONS = Object.freeze(['inspect', 'schema', 'apply', 'recover']);

// @impl STM-001, RRM-002, RRM-003
// The executable structural source for a Seed Topic's research-round appendix.
// Guidance mirrors this map; runtime behavior never discovers slots from Markdown.
export const SEED_TOPIC_PROJECTION_ENTRY_FIELDS = PROJECTION_ENTRY_FIELDS;
export const SEED_TOPIC_PROJECTION_CARD_LABEL = '回填卡（只读操作约束，不是 Projection Entry）';
const HEADING_SUFFIX_RE = /^(?:\s|\(|（|:|：|-|—)/;

function freezeProjectionSlot(slot) {
  return Object.freeze({
    ...slot,
    legacyHeadingBases: Object.freeze([...slot.legacyHeadingBases]),
    ownerWaves: Object.freeze([...slot.ownerWaves]),
    card: Object.freeze({
      ...slot.card,
      requiredEntryFields: Object.freeze([...slot.card.requiredEntryFields]),
      prohibitions: Object.freeze([...slot.card.prohibitions]),
    }),
  });
}

export const SEED_TOPIC_PROJECTION_SLOTS = Object.freeze([
  freezeProjectionSlot({
    slotId: 'wave0_evidence',
    canonicalHeading: 'Wave0：本主题的新增来源证据',
    legacyHeadingBases: ['本轮新增证据'],
    headingSuffixPolicy: 'bounded',
    initialToken: '__BACKFILL_WAVE0_EVIDENCE__',
    ownerWaves: ['wave0'],
    sourceIdentityKind: 'submitted_work',
    mergeMode: 'upsert_by_entry_id',
    card: {
      label: SEED_TOPIC_PROJECTION_CARD_LABEL,
      writer: 'Wave0 Phase Agent',
      authority: '当前轮已 submitted 的 Wave0 work-unit',
      timing: '当前轮 Wave0 work-unit 已 submitted 后',
      entryIdentity: '<work_id>/<N>；N 是该 submitted source contribution 在当前 validated `artifacts/wave0/<topic>/source.yaml` array 中拥有的 exact global ordinal；后续合法 append 使用自己的 contribution/work_id（不是 result_hash 的 source-byte snapshot）',
      requiredEntryFields: ['entry_id', ...SEED_TOPIC_PROJECTION_ENTRY_FIELDS],
      materializationPointer: '由 Wave0 closeout 经 operate-topic-state materialize；详见 command_playbook/operate-topic-state.md#Wave Projection Packet',
      prohibitions: ['手改本节', '只写 “Wave0 submitted”', '把 artifact/cache 当唯一 consumer ref'],
    },
  }),
  freezeProjectionSlot({
    slotId: 'wave1_mechanisms',
    canonicalHeading: 'Wave1：本主题的机制理解',
    legacyHeadingBases: ['本轮新增机制理解'],
    headingSuffixPolicy: 'bounded',
    initialToken: '__BACKFILL_WAVE1_MECHANISMS__',
    ownerWaves: ['wave1'],
    sourceIdentityKind: 'submitted_work',
    mergeMode: 'upsert_by_entry_id',
    card: {
      label: SEED_TOPIC_PROJECTION_CARD_LABEL,
      writer: 'Wave1 Phase Agent',
      authority: '当前轮已 submitted 的 Wave1 work-unit',
      timing: '当前轮 Wave1 work-unit 已 submitted 后',
      entryIdentity: '<work_id>/<positive ordinal>',
      requiredEntryFields: ['entry_id', ...SEED_TOPIC_PROJECTION_ENTRY_FIELDS],
      materializationPointer: '由 Wave1 closeout 经 operate-topic-state materialize；详见 command_playbook/operate-topic-state.md#Wave Projection Packet',
      prohibitions: ['手改本节', '只写 “Wave1 submitted”', '把 evidence-summary provenance 当唯一 consumer ref'],
    },
  }),
  freezeProjectionSlot({
    slotId: 'wave1_trends',
    canonicalHeading: 'Wave1：本主题的趋势、难点与限制',
    legacyHeadingBases: ['本轮新增趋势与难点'],
    headingSuffixPolicy: 'bounded',
    initialToken: '__BACKFILL_WAVE1_TRENDS__',
    ownerWaves: ['wave1'],
    sourceIdentityKind: 'submitted_work',
    mergeMode: 'upsert_by_entry_id',
    card: {
      label: SEED_TOPIC_PROJECTION_CARD_LABEL,
      writer: 'Wave1 Phase Agent',
      authority: '当前轮已 submitted 的 Wave1 work-unit',
      timing: '当前轮 Wave1 work-unit 已 submitted 后',
      entryIdentity: '<work_id>/<positive ordinal>',
      requiredEntryFields: ['entry_id', ...SEED_TOPIC_PROJECTION_ENTRY_FIELDS],
      materializationPointer: '由 Wave1 closeout 经 operate-topic-state materialize；详见 command_playbook/operate-topic-state.md#Wave Projection Packet',
      prohibitions: ['手改本节', '只写 “Wave1 submitted”', '用泛化 submitted prose 替代限制'],
    },
  }),
  freezeProjectionSlot({
    slotId: 'wave2_judgment',
    canonicalHeading: 'Wave2：本主题的当前跨主题判断',
    legacyHeadingBases: ['当前判断'],
    headingSuffixPolicy: 'bounded',
    initialToken: '__BACKFILL_WAVE2_JUDGMENT__',
    ownerWaves: ['wave2'],
    sourceIdentityKind: 'finding',
    mergeMode: 'upsert_by_entry_id',
    card: {
      label: SEED_TOPIC_PROJECTION_CARD_LABEL,
      writer: 'Wave2 Phase Agent',
      authority: '解析到本 topic 的当前轮 W2F finding',
      timing: '当前轮 W2F finding 已解析到本 topic 后',
      entryIdentity: 'exact current-round W2F-* finding id',
      requiredEntryFields: ['entry_id', ...SEED_TOPIC_PROJECTION_ENTRY_FIELDS],
      materializationPointer: '由 Wave2 closeout 经 operate-topic-state materialize；详见 command_playbook/operate-topic-state.md#Wave Projection Packet',
      prohibitions: ['手改本节', '只写 “Wave2 submitted”', '无 exact W2F binding 的泛化 synthesis line'],
    },
  }),
  freezeProjectionSlot({
    slotId: 'pending_questions',
    canonicalHeading: '本主题的待验证问题与后续验证路径',
    legacyHeadingBases: ['待验证问题'],
    headingSuffixPolicy: 'bounded',
    initialToken: '__BACKFILL_PENDING_QUESTIONS__',
    ownerWaves: ['wave1', 'wave2'],
    sourceIdentityKind: 'submitted_work_or_finding',
    mergeMode: 'append_or_upsert_by_entry_id',
    card: {
      label: SEED_TOPIC_PROJECTION_CARD_LABEL,
      writer: 'Wave1 Phase Agent（首写）或 Wave2 Phase Agent（仅追加其 W2F 条目）',
      authority: '当前轮 Wave1 submitted work-unit，或解析到本 topic 的当前轮 W2F finding',
      timing: 'Wave1 submitted 后首写；Wave2 仅在其当前 W2F finding 解析到本 topic 后追加',
      entryIdentity: 'Wave1: <work_id>/<positive ordinal>; Wave2: exact current-round W2F-* finding id',
      requiredEntryFields: ['entry_id', ...SEED_TOPIC_PROJECTION_ENTRY_FIELDS],
      materializationPointer: '由对应 Wave closeout 经 operate-topic-state materialize；详见 command_playbook/operate-topic-state.md#Wave Projection Packet',
      prohibitions: ['手改本节', '只写泛化 submitted prose', 'Wave2 覆盖或删除 Wave1 question entry'],
    },
  }),
]);

const PROJECTION_SLOT_BY_ID = new Map(SEED_TOPIC_PROJECTION_SLOTS.map((slot) => [slot.slotId, slot]));

export function projectionSlotForId(slotId) {
  return PROJECTION_SLOT_BY_ID.get(slotId) || null;
}

export function projectionSlotsForWave(wave) {
  return SEED_TOPIC_PROJECTION_SLOTS.filter((slot) => slot.ownerWaves.includes(wave));
}

export function projectionSlotHeadingMatches(slot, heading) {
  const value = String(heading || '').trim();
  for (const [kind, bases] of [
    ['canonical', [slot.canonicalHeading]],
    ['legacy', slot.legacyHeadingBases],
  ]) {
    for (const base of bases) {
      if (value === base || (value.startsWith(base) && HEADING_SUFFIX_RE.test(value.slice(base.length)))) {
        return { matches: true, kind, base, suffix: value.slice(base.length) };
      }
    }
  }
  return { matches: false, kind: null, base: null, suffix: null };
}

export function locateSeedProjectionSlots(content, { slotIds = null } = {}) {
  const selected = slotIds ? new Set(slotIds) : null;
  const source = String(content || '');
  const lines = source.split(/(?<=\n)/);
  const headings = [];
  let offset = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    const line = raw.replace(/\r?\n$/, '');
    const match = line.match(/^\s*##\s+(.+?)\s*$/);
    if (match) headings.push({ index, startOffset: offset, headingEndOffset: offset + raw.length, title: match[1] });
    offset += raw.length;
  }
  const occurrences = [];
  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    const endOffset = headings[index + 1]?.startOffset ?? source.length;
    for (const slot of SEED_TOPIC_PROJECTION_SLOTS) {
      if (selected && !selected.has(slot.slotId)) continue;
      const match = projectionSlotHeadingMatches(slot, heading.title);
      if (!match.matches) continue;
      occurrences.push({
        slotId: slot.slotId,
        slot,
        headingKind: match.kind,
        headingBase: match.base,
        headingSuffix: match.suffix,
        heading: heading.title,
        startLine: heading.index + 1,
        contentStartLine: heading.index + 2,
        startOffset: heading.startOffset,
        contentStartOffset: heading.headingEndOffset,
        endOffset,
        content: source.slice(heading.headingEndOffset, endOffset),
      });
    }
  }
  return occurrences;
}

export function renderSeedProjectionCard(slot) {
  return [
    `> **${slot.card.label}**`,
    `> - 写入者：${slot.card.writer}`,
    `> - 依据：${slot.card.authority}`,
    `> - 回填时机：${slot.card.timing}`,
    `> - 写法：${slot.card.entryIdentity}；必须含 ${slot.card.requiredEntryFields.join('、')}`,
    `> - 操作：${slot.card.materializationPointer}`,
    `> - 禁止：${slot.card.prohibitions.join('；')}`,
  ].join('\n');
}

export function renderSeedProjectionSlot(slot) {
  return `## ${slot.canonicalHeading}\n\n${renderSeedProjectionCard(slot)}\n\n${slot.initialToken}`;
}

export function renderSeedProjectionAppendix() {
  return SEED_TOPIC_PROJECTION_SLOTS.map(renderSeedProjectionSlot).join('\n\n');
}

const ScopeRoleSchema = z.enum(['primary', 'synthesis', 'comparison', 'supporting']);
const RerunDirectionCandidateSchema = z.object({
  rerun_count: z.number().int().nonnegative(),
  action: z.enum(['add', 'supplement']),
  new_search_dimensions: z.string().min(1),
  adjusted_depth: z.string().min(1),
  search_guardrails: z.string().min(1),
  rationale_excerpt: z.string().min(1),
}).strict();
const AddActionSchema = z.object({
  action: z.literal('add_topic'), title: z.string().min(1), slug_stem: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  must_answer: z.array(z.string().min(1)).min(1), scope_role: ScopeRoleSchema,
  depends_on_topic_uids: z.array(z.string()).default([]),
  direction: RerunDirectionCandidateSchema.optional(),
}).strict();
const UpdateActionSchema = z.object({
  action: z.literal('update_intent'), topic_uid: z.string().min(1), title: z.string().min(1),
  must_answer: z.array(z.string().min(1)).min(1), scope_role: ScopeRoleSchema,
  depends_on_topic_uids: z.array(z.string()).default([]),
  direction: RerunDirectionCandidateSchema.optional(),
}).strict();
const SetRerunDirectionActionSchema = z.object({
  action: z.literal('set_rerun_direction'), topic_uid: z.string().min(1), direction: RerunDirectionCandidateSchema,
}).strict();
const MutationPlanSchema = z.object({
  context: z.enum(['hitl1', 'rerun']),
  actions: z.array(z.discriminatedUnion('action', [AddActionSchema, UpdateActionSchema, SetRerunDirectionActionSchema])).min(1),
}).strict().superRefine((plan, issue) => {
  const existingTargets = new Set();
  for (const [index, action] of plan.actions.entries()) {
    const carriesDirection = Object.hasOwn(action, 'direction');
    if (plan.context === 'hitl1' && carriesDirection) issue.addIssue({ code: z.ZodIssueCode.custom, path: ['actions', index, 'direction'], message: 'HITL1 actions cannot carry rerun direction' });
    if (plan.context === 'rerun' && action.action !== 'set_rerun_direction' && !carriesDirection) issue.addIssue({ code: z.ZodIssueCode.custom, path: ['actions', index, 'direction'], message: 'sanctioned rerun add/update requires direction' });
    if (action.action === 'set_rerun_direction' && plan.context !== 'rerun') issue.addIssue({ code: z.ZodIssueCode.custom, path: ['actions', index], message: 'set_rerun_direction requires sanctioned rerun' });
    if (carriesDirection) {
      const expectedAction = action.action === 'add_topic' ? 'add' : 'supplement';
      if (action.direction.action !== expectedAction) issue.addIssue({ code: z.ZodIssueCode.custom, path: ['actions', index, 'direction', 'action'], message: `${action.action} requires direction action ${expectedAction}` });
    }
    if (action.action !== 'add_topic') {
      if (existingTargets.has(action.topic_uid)) issue.addIssue({ code: z.ZodIssueCode.custom, path: ['actions', index, 'topic_uid'], message: 'one existing UID may have only one ordered action' });
      existingTargets.add(action.topic_uid);
    }
  }
});
const LayoutTargetEntrySchema = z.object({
  topic_uid: z.string().min(1),
  title: z.string().min(1),
  slug_stem: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
}).strict();
const LayoutPlanSchema = z.object({
  context: z.literal('rerun'),
  action: z.literal('mutate_layout'),
  expected_plan_sha256: z.string().regex(/^[0-9a-f]{64}$/),
  topics: z.array(LayoutTargetEntrySchema),
  remove_topic_uids: z.array(z.string().min(1)).default([]),
}).strict();
const NonEmptyStringArraySchema = z.array(z.string().min(1)).min(1);
const SeedEnrichmentSchema = z.object({
  hypothesis: z.string().min(1),
  in_scope: z.string().min(1),
  out_of_scope: z.string().min(1),
  search_guardrails: z.object({
    required_terms: NonEmptyStringArraySchema,
    forbidden_broadening: NonEmptyStringArraySchema,
  }).strict(),
  evidence_route: z.object({
    preferred_sources: NonEmptyStringArraySchema,
    noise_to_avoid: NonEmptyStringArraySchema,
  }).strict(),
}).strict();
const SeedEnrichmentPlanSchema = z.object({
  context: z.literal('seed_topics'),
  action: z.literal('enrich_seed'),
  topic_uid: z.string().min(1),
  enrichment: SeedEnrichmentSchema,
}).strict();
const ProjectionTextSchema = z.string().trim().min(1).regex(/^[^\r\n]+$/);
const PROJECTION_SOURCE_IDENTITY_RULE_BY_WAVE = Object.freeze({
  wave0: Object.freeze({ allowedValues: Object.freeze(['submitted_work']), messageSubject: 'Wave0/Wave1' }),
  wave1: Object.freeze({ allowedValues: Object.freeze(['submitted_work']), messageSubject: 'Wave0/Wave1' }),
  wave2: Object.freeze({ allowedValues: Object.freeze(['finding']), messageSubject: 'Wave2' }),
});

function projectionSourceIdentityRuleForWave(wave) {
  return typeof wave === 'string' ? PROJECTION_SOURCE_IDENTITY_RULE_BY_WAVE[wave] || null : null;
}

const ProjectionSourceIdentitySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('submitted_work'), work_id: z.string().regex(/^wu-w[0-9]+-b[0-9]{3}-[a-z][a-z0-9]{1,7}-i[0-9]{4}$/) }).strict(),
  z.object({ kind: z.literal('finding'), finding_id: z.string().regex(/^W2F-[0-9]{3,}$/, 'finding_id must match W2F-\\d{3} (three or more digits after W2F-)') }).strict(),
]);
const ProjectionEntrySchema = z.object({
  source_identity: ProjectionSourceIdentitySchema,
  entry_id: ProjectionTextSchema,
  evidence_meaning: ProjectionTextSchema,
  relationship: z.enum(['supports', 'refutes', 'partial', 'opens', 'defers', 'context']),
  refs: z.array(ProjectionTextSchema).min(1),
  status: z.enum(['supported', 'refuted', 'partial', 'open', 'emergent', 'deferred']),
  next_hop: ProjectionTextSchema,
}).strict();
const ProjectionUpdateSchema = z.object({
  slot_id: z.enum(SEED_TOPIC_PROJECTION_SLOTS.map((slot) => slot.slotId)),
  entries: z.array(ProjectionEntrySchema).min(1),
}).strict();
const Wave0DeferredContributionSchema = z.object({
  source_identity: z.object({
    kind: z.literal('submitted_work'),
    work_id: z.string().regex(/^wu-w[0-9]+-b[0-9]{3}-[a-z][a-z0-9]{1,7}-i[0-9]{4}$/),
  }).strict(),
  evidence_meaning: ProjectionTextSchema,
  next_hop: ProjectionTextSchema,
}).strict();
const Wave0DeferredProjectionUpdateSchema = z.object({
  slot_id: z.literal('wave0_evidence'),
  deferred_contribution: Wave0DeferredContributionSchema,
}).strict();
const ProjectionPacketUpdateSchema = z.union([
  ProjectionUpdateSchema,
  Wave0DeferredProjectionUpdateSchema,
]);
const ProjectionPacketSchema = z.object({
  context: z.literal('wave_projection'),
  action: z.literal('apply_seed_projection'),
  topic_uid: z.string().min(1),
  wave: z.enum(['wave0', 'wave1', 'wave2']),
  updates: z.array(ProjectionPacketUpdateSchema).min(1),
}).strict().superRefine((packet, issue) => {
  const sourceIdentityRule = projectionSourceIdentityRuleForWave(packet.wave);
  const seenSlots = new Set();
  for (const [updateIndex, update] of packet.updates.entries()) {
    if (seenSlots.has(update.slot_id)) {
      issue.addIssue({ code: z.ZodIssueCode.custom, path: ['updates', updateIndex, 'slot_id'], message: 'each slot_id may appear only once in a Projection Packet' });
    }
    seenSlots.add(update.slot_id);
    const slot = projectionSlotForId(update.slot_id);
    if (!slot?.ownerWaves.includes(packet.wave)) {
      issue.addIssue({ code: z.ZodIssueCode.custom, path: ['updates', updateIndex, 'slot_id'], message: `${update.slot_id} is not owned by ${packet.wave}` });
    }
    if (Object.hasOwn(update, 'deferred_contribution')) {
      if (packet.wave !== 'wave0') {
        issue.addIssue({ code: z.ZodIssueCode.custom, path: ['updates', updateIndex, 'deferred_contribution'], message: 'deferred_contribution is available only in a Wave0 Projection Packet' });
      }
      continue;
    }
    const seenEntries = new Set();
    for (const [entryIndex, entry] of update.entries.entries()) {
      if (seenEntries.has(entry.entry_id)) {
        issue.addIssue({ code: z.ZodIssueCode.custom, path: ['updates', updateIndex, 'entries', entryIndex, 'entry_id'], message: 'entry_id must be unique within one slot update' });
      }
      seenEntries.add(entry.entry_id);
      if (!sourceIdentityRule?.allowedValues.includes(entry.source_identity.kind)) {
        issue.addIssue({ code: z.ZodIssueCode.custom, path: ['updates', updateIndex, 'entries', entryIndex, 'source_identity'], message: `${sourceIdentityRule?.messageSubject || packet.wave} projection entries require a ${sourceIdentityRule?.allowedValues.join(' or ') || 'declared'} source_identity` });
      } else if (packet.wave === 'wave2') {
        if (entry.entry_id !== entry.source_identity.finding_id) {
          issue.addIssue({ code: z.ZodIssueCode.custom, path: ['updates', updateIndex, 'entries', entryIndex, 'entry_id'], message: 'Wave2 entry_id must equal its source W2F finding_id' });
        }
      } else if (!new RegExp(`^${entry.source_identity.work_id}/[1-9][0-9]*$`).test(entry.entry_id)) {
        issue.addIssue({ code: z.ZodIssueCode.custom, path: ['updates', updateIndex, 'entries', entryIndex, 'entry_id'], message: 'Wave0/Wave1 entry_id must equal <source work_id>/<positive ordinal>' });
      }
    }
  }
  const selectedSlots = new Set(packet.updates.map((update) => update.slot_id));
  const requireExactSlots = (slotIds, message) => {
    const expected = new Set(slotIds);
    if (expected.size !== selectedSlots.size || [...expected].some((slotId) => !selectedSlots.has(slotId))) {
      issue.addIssue({ code: z.ZodIssueCode.custom, path: ['updates'], message });
    }
  };
  if (packet.wave === 'wave0') {
    requireExactSlots(['wave0_evidence'], 'Wave0 Projection Packet must update only wave0_evidence');
  } else if (packet.wave === 'wave1') {
    requireExactSlots(['wave1_mechanisms', 'wave1_trends', 'pending_questions'], 'Wave1 Projection Packet must atomically update mechanisms, trends, and pending_questions');
  } else if (!selectedSlots.has('wave2_judgment')) {
    issue.addIssue({ code: z.ZodIssueCode.custom, path: ['updates'], message: 'Wave2 Projection Packet must update wave2_judgment and may additionally update pending_questions' });
  }
});
export const TopicApplyPlanSchema = z.union([MutationPlanSchema, LayoutPlanSchema, SeedEnrichmentPlanSchema, ProjectionPacketSchema]);

const TOPIC_SCHEMA_OMIT = Symbol('topic-schema-omit');
const TOPIC_SCHEMA_TYPES = z.ZodFirstPartyTypeKind;

function topicSchemaType(schema) {
  return schema?._def?.typeName || null;
}

// Effects are unwrapped only to describe the supported structural branch. The
// actual top-level schema remains the sole source of refinement validation.
function unwrapTopicSchemaStructure(schema) {
  let current = schema;
  while (topicSchemaType(current) === TOPIC_SCHEMA_TYPES.ZodEffects) current = current._def.schema;
  return current;
}

function unwrapTopicSchemaOptional(schema) {
  let current = schema;
  while ([TOPIC_SCHEMA_TYPES.ZodOptional, TOPIC_SCHEMA_TYPES.ZodDefault].includes(topicSchemaType(current))) {
    current = current._def.innerType;
  }
  return current;
}

function topicSchemaShape(schema) {
  const unwrapped = unwrapTopicSchemaStructure(schema);
  if (topicSchemaType(unwrapped) !== TOPIC_SCHEMA_TYPES.ZodObject) {
    throw new Error(`unsupported topic-state structural form: ${topicSchemaType(unwrapped) || 'unknown'}`);
  }
  return unwrapped._def.shape();
}

function topicSchemaClosedValues(schema) {
  const unwrapped = unwrapTopicSchemaOptional(unwrapTopicSchemaStructure(schema));
  const type = topicSchemaType(unwrapped);
  if (type === TOPIC_SCHEMA_TYPES.ZodLiteral) return [unwrapped._def.value];
  if (type === TOPIC_SCHEMA_TYPES.ZodEnum) return [...unwrapped._def.values];
  return null;
}

function topicSchemaActionForms(branch) {
  const shape = topicSchemaShape(branch);
  if (shape.action) {
    const values = topicSchemaClosedValues(shape.action);
    if (!values?.length) throw new Error('unsupported topic-state action form');
    return values.map((action) => ({ action }));
  }
  const actions = unwrapTopicSchemaOptional(unwrapTopicSchemaStructure(shape.actions));
  if (topicSchemaType(actions) !== TOPIC_SCHEMA_TYPES.ZodArray) throw new Error('unsupported topic-state actions form');
  const variants = unwrapTopicSchemaStructure(actions._def.type);
  if (topicSchemaType(variants) !== TOPIC_SCHEMA_TYPES.ZodDiscriminatedUnion) {
    throw new Error('unsupported topic-state action union');
  }
  const forms = [];
  for (const option of variants._def.options) {
    const values = topicSchemaClosedValues(topicSchemaShape(option).action);
    if (!values?.length) throw new Error('unsupported topic-state action discriminator');
    for (const action of values) forms.push({ action });
  }
  return forms;
}

function topicSchemaPath(pathParts) {
  if (!pathParts.length) return 'input';
  return pathParts.reduce((result, part) => {
    if (typeof part === 'number') return `${result}[${part}]`;
    if (!result) return part;
    return `${result}.${part}`;
  }, '');
}

function topicSchemaFieldPath(pathParts) {
  return topicSchemaPath(pathParts.map((part) => (typeof part === 'number' ? '[]' : part)))
    .replace(/\.\[\]/g, '[]');
}

function topicSchemaStringExample(schema, state, pathParts) {
  if (pathParts.at(-1) === 'entry_id') return state.entryId;
  const regex = (schema._def.checks || []).find((check) => check.kind === 'regex')?.regex;
  const source = regex?.source || '';
  if (source.includes('wu-w')) return 'wu-w0-b001-a1-i0001';
  if (source.includes('W2F-')) return 'W2F-001';
  if (source.includes('[0-9a-f]{64}')) return '0'.repeat(64);
  if (source.includes('a-z0-9')) return 'example-slug';
  return 'example';
}

function topicSchemaNumberExample(schema) {
  const minimum = (schema._def.checks || []).find((check) => check.kind === 'min')?.value;
  return Number.isFinite(minimum) ? Math.max(minimum, 0) : 1;
}

function isFormActionPath(pathParts) {
  return (pathParts.length === 1 && pathParts[0] === 'action')
    || (pathParts.length === 3 && pathParts[0] === 'actions' && pathParts[1] === 0 && pathParts[2] === 'action');
}

function topicSchemaUnionOption(schema, state, pathParts) {
  const options = [...(schema._def.options || [])];
  if (!options.length) throw new Error('unsupported empty topic-state union');
  if (topicSchemaType(schema) === TOPIC_SCHEMA_TYPES.ZodDiscriminatedUnion && schema._def.discriminator === 'action' && state.action) {
    const selected = options.find((option) => topicSchemaClosedValues(topicSchemaShape(option).action)?.includes(state.action));
    if (selected) return selected;
  }
  if (topicSchemaType(schema) === TOPIC_SCHEMA_TYPES.ZodDiscriminatedUnion && schema._def.discriminator === 'kind' && state.sourceIdentityKind) {
    const selected = options.find((option) => topicSchemaClosedValues(topicSchemaShape(option).kind)?.includes(state.sourceIdentityKind));
    if (selected) return selected;
  }
  return options[0];
}

function topicSchemaExample(schema, state, pathParts = []) {
  const type = topicSchemaType(schema);
  if (type === TOPIC_SCHEMA_TYPES.ZodEffects) return topicSchemaExample(schema._def.schema, state, pathParts);
  if (type === TOPIC_SCHEMA_TYPES.ZodOptional || type === TOPIC_SCHEMA_TYPES.ZodDefault) {
    return state.includeOptional ? topicSchemaExample(schema._def.innerType, state, pathParts) : TOPIC_SCHEMA_OMIT;
  }
  if (type === TOPIC_SCHEMA_TYPES.ZodObject) {
    const value = {};
    for (const [key, child] of Object.entries(schema._def.shape())) {
      const childValue = topicSchemaExample(child, state, [...pathParts, key]);
      if (childValue !== TOPIC_SCHEMA_OMIT) value[key] = childValue;
    }
    return value;
  }
  if (type === TOPIC_SCHEMA_TYPES.ZodArray) {
    const minimum = schema._def.minLength?.value ?? 1;
    return Array.from({ length: Math.max(minimum, 1) }, () => topicSchemaExample(schema._def.type, state, [...pathParts, 0]));
  }
  if (type === TOPIC_SCHEMA_TYPES.ZodString) return topicSchemaStringExample(schema, state, pathParts);
  if (type === TOPIC_SCHEMA_TYPES.ZodNumber) return topicSchemaNumberExample(schema);
  if (type === TOPIC_SCHEMA_TYPES.ZodBoolean) return true;
  if (type === TOPIC_SCHEMA_TYPES.ZodLiteral) return schema._def.value;
  if (type === TOPIC_SCHEMA_TYPES.ZodEnum) {
    if (topicSchemaPath(pathParts) === 'context') return state.context;
    if (topicSchemaPath(pathParts) === 'wave' && state.wave) return state.wave;
    if (isFormActionPath(pathParts) && state.action) return state.action;
    return schema._def.values[Math.min(state.enumIndex, schema._def.values.length - 1)];
  }
  if (type === TOPIC_SCHEMA_TYPES.ZodDiscriminatedUnion || type === TOPIC_SCHEMA_TYPES.ZodUnion) {
    return topicSchemaExample(topicSchemaUnionOption(schema, state, pathParts), state, pathParts);
  }
  throw new Error(`unsupported topic-state schema node: ${type || 'unknown'}`);
}

function topicSchemaProjectionTemplateForWave(template, wave) {
  if (!wave || template.context !== 'wave_projection' || template.action !== 'apply_seed_projection') return template;
  const entry = template.updates?.[0]?.entries?.[0];
  if (!entry) return template;
  const slotIds = wave === 'wave2'
    ? ['wave2_judgment']
    : projectionSlotsForWave(wave).map((slot) => slot.slotId);
  if (!slotIds.length) return template;
  return {
    ...template,
    updates: slotIds.map((slotId, index) => ({
      slot_id: slotId,
      entries: [{
        ...entry,
        entry_id: entry.source_identity.kind === 'submitted_work'
          ? `${entry.source_identity.work_id}/${index + 1}`
          : entry.source_identity.finding_id,
      }],
    })),
  };
}

function parseableTopicSchemaTemplate(branch, context, action, state = {}) {
  for (const includeOptional of [false, true]) {
    for (const enumIndex of [0, 1]) {
      for (const entryId of ['example', 'wu-w0-b001-a1-i0001/1', 'W2F-001']) {
        const generated = topicSchemaExample(branch, {
          context,
          action,
          includeOptional,
          enumIndex,
          entryId,
          ...state,
        });
        const template = topicSchemaProjectionTemplateForWave(generated, state.wave);
        if (TopicApplyPlanSchema.safeParse(template).success) return template;
      }
    }
  }
  return null;
}

function topicSchemaValueShape(schema) {
  const unwrapped = unwrapTopicSchemaOptional(unwrapTopicSchemaStructure(schema));
  const type = topicSchemaType(unwrapped);
  const names = {
    [TOPIC_SCHEMA_TYPES.ZodString]: 'string',
    [TOPIC_SCHEMA_TYPES.ZodNumber]: 'number',
    [TOPIC_SCHEMA_TYPES.ZodBoolean]: 'boolean',
    [TOPIC_SCHEMA_TYPES.ZodLiteral]: 'literal',
    [TOPIC_SCHEMA_TYPES.ZodEnum]: 'enum',
    [TOPIC_SCHEMA_TYPES.ZodObject]: 'object',
    [TOPIC_SCHEMA_TYPES.ZodArray]: 'array',
    [TOPIC_SCHEMA_TYPES.ZodUnion]: 'union',
    [TOPIC_SCHEMA_TYPES.ZodDiscriminatedUnion]: 'discriminated_union',
  };
  if (!names[type]) throw new Error(`unsupported topic-state schema node: ${type || 'unknown'}`);
  return names[type];
}

function collectTopicSchemaFields(schema, state, fields, pathParts = [], required = true) {
  const type = topicSchemaType(schema);
  if (type === TOPIC_SCHEMA_TYPES.ZodEffects) {
    collectTopicSchemaFields(schema._def.schema, state, fields, pathParts, required);
    return;
  }
  if (type === TOPIC_SCHEMA_TYPES.ZodOptional || type === TOPIC_SCHEMA_TYPES.ZodDefault) {
    collectTopicSchemaFields(schema._def.innerType, state, fields, pathParts, false);
    return;
  }
  if (pathParts.length) {
    const field = { path: topicSchemaFieldPath(pathParts), shape: topicSchemaValueShape(schema), required };
    const values = topicSchemaClosedValues(schema);
    if (values) field.allowed_values = values;
    fields.push(field);
  }
  if (type === TOPIC_SCHEMA_TYPES.ZodObject) {
    for (const [key, child] of Object.entries(schema._def.shape())) {
      collectTopicSchemaFields(child, state, fields, [...pathParts, key], required);
    }
  } else if (type === TOPIC_SCHEMA_TYPES.ZodArray) {
    collectTopicSchemaFields(schema._def.type, state, fields, [...pathParts, 0], required);
  } else if (type === TOPIC_SCHEMA_TYPES.ZodDiscriminatedUnion || type === TOPIC_SCHEMA_TYPES.ZodUnion) {
    if (topicSchemaType(schema) === TOPIC_SCHEMA_TYPES.ZodDiscriminatedUnion
      && schema._def.discriminator === 'kind'
      && state.sourceIdentityKind) {
      collectTopicSchemaFields(topicSchemaUnionOption(schema, state, pathParts), state, fields, pathParts, required);
      return;
    }
    if (topicSchemaType(schema) === TOPIC_SCHEMA_TYPES.ZodDiscriminatedUnion && schema._def.discriminator && schema._def.discriminator !== 'action') {
      // Aggregate every discriminator literal so the authoring view exposes all
      // source-identity forms instead of only the first option (CTS-010).
      const discriminator = schema._def.discriminator;
      const kinds = [];
      for (const option of schema._def.options || []) {
        const discSchema = topicSchemaShape(option)[discriminator];
        const values = topicSchemaClosedValues(discSchema);
        if (values) kinds.push(...values);
      }
      collectTopicSchemaFields(schema._def.options[0], state, fields, pathParts, required);
      if (kinds.length) {
        const kindPath = `${topicSchemaFieldPath(pathParts)}.${discriminator}`;
        const field = fields.find((candidate) => candidate.path === kindPath);
        if (field) field.allowed_values = [...new Set(kinds)];
      }
      return;
    }
    collectTopicSchemaFields(topicSchemaUnionOption(schema, state, pathParts), state, fields, pathParts, required);
  }
}

function topicSchemaForm(branch, context, action, index) {
  const template = parseableTopicSchemaTemplate(branch, context, action);
  if (!template) return null;
  const fields = [];
  collectTopicSchemaFields(branch, { context, action }, fields);
  const uniqueFields = [...new Map(fields.map((field) => [field.path, field])).values()];
  const form = {
    id: `${context}:${action}:${index + 1}`,
    action,
    required_fields: uniqueFields.filter((field) => field.required).map((field) => field.path),
    optional_fields: uniqueFields.filter((field) => !field.required).map((field) => field.path),
    closed_values: Object.fromEntries(uniqueFields.filter((field) => field.allowed_values).map((field) => [field.path, field.allowed_values])),
    value_shapes: Object.fromEntries(uniqueFields.map((field) => [field.path, field.shape])),
    template,
  };
  if (action === 'apply_seed_projection') {
    form.conditional_forms = [
      ['wave0', 'submitted_work'],
      ['wave1', 'submitted_work'],
      ['wave2', 'finding'],
    ].map(([wave, sourceIdentityKind]) => {
      const state = { wave, sourceIdentityKind };
      const conditionalTemplate = parseableTopicSchemaTemplate(branch, context, action, state);
      if (!conditionalTemplate) throw new Error(`no parseable ${wave}/${sourceIdentityKind} topic-state schema form`);
      const conditionalFields = [];
      collectTopicSchemaFields(branch, { context, action, ...state }, conditionalFields);
      const uniqueConditionalFields = [...new Map(conditionalFields.map((field) => [field.path, field])).values()];
      return {
        condition: { wave, source_identity_kind: sourceIdentityKind },
        required_fields: uniqueConditionalFields.filter((field) => field.required).map((field) => field.path),
        closed_values: Object.fromEntries(uniqueConditionalFields.filter((field) => field.allowed_values).map((field) => [field.path, field.allowed_values])),
        value_shapes: Object.fromEntries(uniqueConditionalFields.map((field) => [field.path, field.shape])),
        template: conditionalTemplate,
      };
    });
    form.wave_rules = {
      wave0: { source_identity_kind: ['submitted_work'], entry_id_rule: '<source work_id>/<positive ordinal>' },
      wave1: { source_identity_kind: ['submitted_work'], entry_id_rule: '<source work_id>/<positive ordinal>' },
      wave2: { source_identity_kind: ['finding'], entry_id_rule: 'entry_id === finding_id (W2F-\\d{3})' },
    };
  }
  return form;
}

/**
 * Derive a bounded authoring view from the supported current Zod branch graph.
 * This is structural discovery only; final templates are admitted solely by the
 * actual top-level TopicApplyPlanSchema.
 */
export function describeTopicApplyPlanSchema(context) {
  try {
    if (typeof context !== 'string' || !context) {
      return { ok: false, reason_code: 'topic_apply_schema_context_unknown', reason: 'schema --context requires one declared context value' };
    }
    const root = unwrapTopicSchemaStructure(TopicApplyPlanSchema);
    if (topicSchemaType(root) !== TOPIC_SCHEMA_TYPES.ZodUnion) throw new Error('unsupported TopicApplyPlanSchema root');
    const branches = [...root._def.options];
    const declaredContexts = [...new Set(branches.flatMap((branch) => topicSchemaClosedValues(topicSchemaShape(branch).context) || []))];
    if (!declaredContexts.includes(context)) {
      return { ok: false, reason_code: 'topic_apply_schema_context_unknown', reason: `unknown topic-state schema context: ${context}`, supported_contexts: declaredContexts };
    }
    const forms = [];
    for (const [index, branch] of branches.entries()) {
      const contexts = topicSchemaClosedValues(topicSchemaShape(branch).context) || [];
      if (!contexts.includes(context)) continue;
      for (const { action } of topicSchemaActionForms(branch)) {
        const form = topicSchemaForm(branch, context, action, index);
        if (form) forms.push(form);
      }
    }
    if (!forms.length) throw new Error(`no parseable topic-state schema form for context ${context}`);
    return {
      ok: true,
      schema_version: TOPIC_STATE_SCHEMA_VERSION,
      operation: 'schema',
      context,
      supported_contexts: declaredContexts,
      forms,
    };
  } catch (error) {
    return {
      ok: false,
      reason_code: 'topic_apply_schema_configuration_invalid',
      reason: error.message || String(error),
    };
  }
}

function validationPath(pathParts) {
  if (!Array.isArray(pathParts) || pathParts.length === 0) return 'input';
  return pathParts.reduce((result, part) => {
    if (typeof part === 'number') return `${result}[${part}]`;
    return result ? `${result}.${part}` : String(part);
  }, '');
}

function expandTopicValidationIssueCandidates(issues) {
  const nestedUnionIndex = issues.findIndex((issue) => issue?.code === 'invalid_union' && Array.isArray(issue.unionErrors));
  if (nestedUnionIndex === -1) return [issues];
  const nestedUnion = issues[nestedUnionIndex];
  const siblingIssues = issues.toSpliced(nestedUnionIndex, 1);
  return nestedUnion.unionErrors.flatMap((error) => expandTopicValidationIssueCandidates([
    ...siblingIssues,
    ...(error?.issues || []),
  ]));
}

function selectTopicValidationIssues(issues) {
  const candidates = expandTopicValidationIssueCandidates(issues);
  const score = (candidate) => candidate.reduce((total, issue) => {
    const path = validationPath(issue?.path);
    if (path === 'context' && ['invalid_literal', 'invalid_enum_value'].includes(issue?.code)) return total + 100;
    if (issue?.code === 'unrecognized_keys') return total + 10;
    return total + 1;
  }, 0);
  return candidates.sort((left, right) => score(left) - score(right))[0] || [];
}

function validationJsonPointer(pathParts) {
  if (!Array.isArray(pathParts) || pathParts.length === 0) return '';
  return `/${pathParts.map((part) => String(part).replaceAll('~', '~0').replaceAll('/', '~1')).join('/')}`;
}

function isProjectionSourceIdentityKindIssue(issue) {
  const path = issue?.path;
  return issue?.code === 'invalid_union_discriminator'
    && Array.isArray(issue?.options)
    && path?.at(-1) === 'kind'
    && path?.at(-2) === 'source_identity';
}

function safeValidationMessage(issue) {
  if (issue.code === 'invalid_type') return `Expected ${issue.expected}; received ${issue.received}.`;
  if (issue.code === 'invalid_enum_value') return 'Value must be one of the allowed values.';
  if (issue.code === 'invalid_literal') return 'Value must match the required literal.';
  if (issue.code === 'too_small') return 'Value does not meet the declared minimum.';
  if (issue.code === 'too_big') return 'Value exceeds the declared maximum.';
  if (issue.code === 'unrecognized_keys') return 'Object contains unsupported fields.';
  if (issue.code === 'invalid_string') return 'String does not meet the declared format.';
  if (issue.code === 'custom') return 'Value violates a declared cross-field constraint.';
  return 'Value does not satisfy the declared topic-state input schema.';
}

/** Project existing Zod issues without exposing retained input values or bytes. */
export function projectTopicApplyValidationErrors(issues, { limit = 5, input = null } = {}) {
  const selected = selectTopicValidationIssues(Array.isArray(issues) ? issues : []);
  const validation_errors = selected.slice(0, Math.max(1, Math.min(limit, 5))).map((issue) => {
    const item = {
      path: validationPath(issue.path),
      code: issue.code || 'invalid_input',
      message: safeValidationMessage(issue),
    };
    if (issue.code === 'invalid_type') {
      item.expected_shape = issue.expected;
      item.received_type = issue.received;
    } else if (issue.code === 'invalid_enum_value') {
      item.allowed_values = [...issue.options];
    } else if (issue.code === 'invalid_literal') {
      item.expected_value = issue.expected;
    } else if (issue.code === 'too_small' || issue.code === 'too_big') {
      item.expected_limit = issue.minimum ?? issue.maximum;
      item.limit_type = issue.type;
    }
    if (isProjectionSourceIdentityKindIssue(issue)) {
      item.json_pointer = validationJsonPointer(issue.path);
      item.schema_allowed_values = [...issue.options];
      const rule = input?.context === 'wave_projection'
        ? projectionSourceIdentityRuleForWave(input.wave)
        : null;
      if (rule) item.allowed_values = [...rule.allowedValues];
    }
    return item;
  });
  return {
    validation_errors,
    primary_validation_path: validation_errors[0]?.path || 'input',
  };
}

function hashBytes(value) { return createHash('sha256').update(value).digest('hex'); }
function fsyncPath(filePath) { const fd = openSync(filePath, constants.O_RDONLY); try { fsyncSync(fd); } finally { closeSync(fd); } }
function writeDurable(filePath, bytes, flag = 'wx') { writeFileSync(filePath, bytes, { flag }); fsyncPath(filePath); }
function safeBundle(bundlePath) {
  const resolved = path.resolve(bundlePath);
  if (!existsSync(resolved) || !lstatSync(resolved).isDirectory() || lstatSync(resolved).isSymbolicLink()) throw new Error('bundle must be a real directory');
  return resolved;
}
function splitPlan(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) throw new Error('rb_plan.md frontmatter missing');
  return { frontmatter: parseYaml(match[1]), body: raw.slice(match[0].length) };
}
function renderPlan(frontmatter, body) { return `---\n${stringifyYaml(frontmatter).trimEnd()}\n---\n${body}`; }
function refreshTopicRegistryTable(body, oldRegistry, finalRegistry) {
  const candidates = locateCanonicalSections(body, 'Topic Registry')
    .map((section) => ({ ...section, content: body.slice(section.contentStart, section.end) }));
  if (candidates.length === 0) return { body, advisory: 'topic_registry_table_missing' };
  const section = candidates.find((candidate) => {
    const [header, separator] = candidate.content.trim().split('\n');
    return header === '| # | Slug | Title | Status |' && /^\|[-: ]+\|[-: ]+\|[-: ]+\|[-: ]+\|$/.test(separator || '');
  });
  if (!section) return { body, advisory: 'topic_registry_table_nonstandard' };
  const lines = section.content.trimEnd().split('\n');
  const statusByUid = new Map();
  const uidByOldSlug = new Map(oldRegistry.map((topic) => [topic.slug, topic.topic_uid]));
  for (const line of lines.slice(2)) {
    if (!line.startsWith('|')) continue;
    const cells = line.slice(1, -1).split('|').map((cell) => cell.trim());
    if (cells.length !== 4) continue;
    const topicUid = uidByOldSlug.get(cells[1]);
    if (topicUid) statusByUid.set(topicUid, cells[3]);
  }
  const escapeCell = (value) => String(value).replaceAll('|', '\\|');
  const rows = finalRegistry.map((topic) => `| ${escapeCell(topic.id)} | ${escapeCell(topic.slug)} | ${escapeCell(topic.title)} | ${escapeCell(statusByUid.get(topic.topic_uid) || 'pending')} |`);
  const replacement = `| # | Slug | Title | Status |\n|---|------|-------|--------|\n${rows.join('\n')}`;
  const normalized = replacement.replace(/^\n+|\n+$/g, '');
  const rendered = `${body.slice(section.start, section.headerEnd)}\n\n${normalized}\n`;
  return { body: `${body.slice(0, section.start)}${rendered}${body.slice(section.end)}`, advisory: null };
}
function newSeedEnrichment() {
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

function renderNewSeedBody(topic) {
  return `# ${topic.title}

${renderSeedInitializationRegion()}

## ═══ 研究轮次追加区 ═══

> 后续 Wave 必须用提交/接受的直接证据替换各自唯一占位 token；不要追加第二套回填区。

## 历史摘要

*(seed-topics: 本 topic 为新建，无历史轮次)*

${renderSeedProjectionAppendix()}
`;
}

function renderRerunDirection(direction) {
  return `## 本轮重跑方向\n\n- rerun_count: ${direction.rerun_count}\n- action: ${direction.action}\n- new_search_dimensions: ${direction.new_search_dimensions}\n- adjusted_depth: ${direction.adjusted_depth}\n- search_guardrails: ${direction.search_guardrails}\n- rationale_excerpt: ${direction.rationale_excerpt}\n`;
}

function replaceRerunDirection(body, direction) {
  const withoutDirections = String(body || '').replace(/##\s*本轮重跑方向[^\n]*[\s\S]*?(?=\n##\s+|$)/g, '').trimEnd();
  const rendered = `${withoutDirections}\n\n${renderRerunDirection(direction)}`;
  const checked = evaluateRerunDirection(rendered, direction.rerun_count);
  if (checked.state !== 'matching' || checked.structural_roots.length > 0 || checked.fields.action !== direction.action) {
    throw new Error('canonical rerun direction render failed round-trip validation');
  }
  return rendered;
}

function renderSeed(topic, existingSeed = null, direction = null) {
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

function currentProfileRerunCount(bundle) {
  const profilePath = path.join(bundle, 'rb_profile.yaml');
  const profile = parseYaml(readFileSync(profilePath, 'utf8'));
  const count = profile?.human_decision_checkpoints?.hitl2?.rerun_count ?? 0;
  if (!Number.isInteger(count) || count < 0) throw new Error('rb_profile.yaml human_decision_checkpoints.hitl2.rerun_count must be a non-negative integer');
  return count;
}

function readSelectedResearchProfile(bundle) {
  const profilePath = path.join(bundle, 'rb_profile.yaml');
  if (!existsSync(profilePath) || lstatSync(profilePath).isSymbolicLink() || !lstatSync(profilePath).isFile()) {
    return null;
  }
  try {
    const profile = parseYaml(readFileSync(profilePath, 'utf8'));
    return typeof profile?.research_profile === 'string' ? profile.research_profile : null;
  } catch {
    return null;
  }
}

function styleProjectionCheckpoint(context) {
  return context === 'rerun'
    ? { gate: 'rerun-ready', current_node: 'phases/phase-rerun.md' }
    : { gate: 'hitl1-recorded', current_node: 'phases/phase-hitl1.md' };
}

function buildStyleProjectionHandoff(bundle, { committedTopicCount, context }) {
  const selectedProfile = readSelectedResearchProfile(bundle);
  const checkpoint = styleProjectionCheckpoint(context);
  const base = {
    owner: RESEARCH_STYLE_WRITER_PATH,
    selected_profile: selectedProfile,
    committed_topic_count: committedTopicCount,
    checkpoint,
  };
  if (!selectedProfile || selectedProfile === 'not_selected') {
    return {
      status: 'profile_unavailable',
      command: null,
      reason_code: 'selected_profile_unavailable',
      ...base,
    };
  }
  try {
    return {
      status: 'refresh_required',
      command: buildResearchStyleApplyCommand({ bundlePath: bundle, selectedProfile }),
      ...base,
    };
  } catch {
    return {
      status: 'profile_unavailable',
      command: null,
      reason_code: 'selected_profile_unavailable',
      ...base,
    };
  }
}

function validateRerunDirectionCounts(input, profileRerunCount) {
  if (input.context !== 'rerun' || !Array.isArray(input.actions)) return;
  for (const action of input.actions) {
    if (action.direction && action.direction.rerun_count !== profileRerunCount + 1) {
      throw new Error(`rerun direction count must equal accepted profile count + 1 (${profileRerunCount + 1})`);
    }
  }
}
function readSeed(bundle, slug) {
  const seedPath = path.join(bundle, 'seed_topics', `${slug}.md`);
  if (!existsSync(seedPath)) return { exists: false, path: seedPath, raw: null, frontmatter: null, body: '' };
  if (lstatSync(seedPath).isSymbolicLink() || !lstatSync(seedPath).isFile()) throw new Error(`seed_topics/${slug}.md must be a non-symlink regular file`);
  const raw = readFileSync(seedPath, 'utf8');
  const split = splitPlan(raw);
  return { exists: true, path: seedPath, raw, frontmatter: split.frontmatter, body: split.body };
}

function projectionError(reasonCode, message, extras = {}) {
  return Object.assign(new Error(message), { reason_code: reasonCode, ...extras });
}

function readProjectionReferenceFact(bundle) {
  const root = path.join(bundle, 'reference');
  if (!existsSync(root) || lstatSync(root).isSymbolicLink() || !lstatSync(root).isDirectory()) return { referencePaths: [], requireExisting: true };
  const referencePaths = readdirSync(root).sort().flatMap((name) => {
    const target = path.join(root, name);
    if (!name.endsWith('.md') || lstatSync(target).isSymbolicLink() || !lstatSync(target).isFile()) return [];
    return [`reference/${name}`];
  });
  return { referencePaths, requireExisting: true };
}

function validateProjectionEntryNavigation(entry, referenceFact) {
  const navigation = evaluateProjectionEntryNavigation(entry, referenceFact);
  if (navigation.passed) return navigation;
  throw projectionError(navigation.reason_code, navigation.message, {
    near_matches: navigation.near_matches,
    missing_refs: navigation.missing_refs,
    invalid_refs: navigation.invalid_refs,
  });
}

export function splitSeedProjectionCard(content, slot) {
  const leading = String(content || '').match(/^(?:[ \t]*\r?\n)*/)?.[0] || '';
  const expected = renderSeedProjectionCard(slot);
  if (!String(content || '').slice(leading.length).startsWith(expected)) return null;
  return {
    prefix: String(content || '').slice(0, leading.length + expected.length),
    entryArea: String(content || '').slice(leading.length + expected.length),
  };
}

function assertProjectionPostcondition(body, input, referenceFact) {
  const postOccurrences = locateSeedProjectionSlots(body, { slotIds: input.updates.map((update) => update.slot_id) });
  for (const update of input.updates) {
    const slot = projectionSlotForId(update.slot_id);
    const targets = postOccurrences.filter((occurrence) => (
      occurrence.slotId === slot.slotId
      && occurrence.headingKind === 'canonical'
      && splitSeedProjectionCard(occurrence.content, slot)
    ));
    if (targets.length !== 1) {
      throw projectionError('writer_postcondition_failed', `Projection writer failed post-write parser/readiness assertion for ${slot.slotId}.`);
    }
    const card = splitSeedProjectionCard(targets[0].content, slot);
    if (card.entryArea.includes(slot.initialToken)) {
      throw projectionError('writer_postcondition_failed', `Projection writer failed to consume ${slot.initialToken} for ${slot.slotId}.`);
    }
    const parsed = parseProjectionEntryArea(card.entryArea, { requiredFields: SEED_TOPIC_PROJECTION_ENTRY_FIELDS });
    if (!parsed.passed) {
      throw projectionError('writer_postcondition_failed', `Projection writer failed post-write parser/readiness assertion for ${slot.slotId}.`);
    }
    for (const entry of update.entries) {
      const matching = parsed.entries.filter((candidate) => candidate.metadata.entry_id === entry.entry_id);
      if (matching.length !== 1) {
        throw projectionError('writer_postcondition_failed', `Projection writer failed post-write parser/readiness assertion for ${slot.slotId}.`);
      }
    }
    for (const entry of parsed.entries) {
      const navigation = evaluateProjectionEntryNavigation(entry, referenceFact);
      if (!navigation.passed) {
        throw projectionError('writer_postcondition_failed', `Projection writer failed post-write navigation assertion for ${slot.slotId}.`);
      }
    }
  }
}

function upgradedProjectionHeading(body, occurrence, slot) {
  const headingLine = body.slice(occurrence.startOffset, occurrence.contentStartOffset);
  return occurrence.headingKind === 'legacy'
    ? headingLine.replace(occurrence.headingBase, slot.canonicalHeading)
    : headingLine;
}

function materializeProjectionSlot(body, occurrence, slot, entries) {
  const card = occurrence.headingKind === 'canonical' ? splitSeedProjectionCard(occurrence.content, slot) : null;
  if (occurrence.headingKind === 'canonical' && !card) {
    throw projectionError('seed_projection_layout_missing', `${slot.slotId} has a canonical heading without its required ${SEED_TOPIC_PROJECTION_CARD_LABEL}.`);
  }
  const updatedEntries = upsertProjectionEntryArea(card ? card.entryArea : occurrence.content, {
    initialToken: slot.initialToken,
    entries,
  });
  const heading = upgradedProjectionHeading(body, occurrence, slot);
  const replacement = card
    ? `${heading}${card.prefix}\n\n${updatedEntries}\n`
    : `${heading}\n${renderSeedProjectionCard(slot)}\n\n${updatedEntries}\n`;
  return { startOffset: occurrence.startOffset, endOffset: occurrence.endOffset, replacement };
}

function resolveWave2AffectedTopics(layouts, affectedTopics) {
  const resolved = new Set();
  for (const token of affectedTopics || []) {
    const candidates = new Map();
    const add = (layout) => {
      if (layout) candidates.set(layout.topic_uid || `legacy:${layout.current.id}:${layout.current.slug}`, layout);
    };
    add(layouts.currentByUid.get(token));
    for (const layout of layouts.referenceByAnySlug.get(token) || []) add(layout);
    for (const layout of layouts.referenceByAnyId.get(token) || []) add(layout);
    if (candidates.size !== 1) {
      throw projectionError('wave2_finding_topic_invalid', candidates.size === 0
        ? `Wave2 finding affected_topics contains unknown token ${JSON.stringify(token)}.`
        : `Wave2 finding affected_topics contains ambiguous token ${JSON.stringify(token)}.`);
    }
    resolved.add([...candidates.values()][0].topic_uid);
  }
  return resolved;
}

function validateWave2ProjectionAuthority(bundle, topicRegistryFact, topicUid, entries) {
  const findingIndexFact = loadWave2FindingIndexFact(bundle);
  if (!findingIndexFact.ok || !Array.isArray(findingIndexFact.data?.findings)) {
    throw projectionError('wave2_finding_index_unavailable', findingIndexFact.inspect?.[0] || 'Wave2 finding-index authority is unavailable.');
  }
  let round;
  try { round = readProjectionProfileRound(bundle); } catch (error) {
    throw projectionError('wave2_profile_round_invalid', error.message);
  }
  const findingById = new Map(findingIndexFact.data.findings.map((finding) => [finding?.id, finding]));
  for (const entry of entries) {
    const findingId = entry.source_identity.finding_id;
    const finding = findingById.get(findingId);
    if (!finding) {
      const formatInvalid = !/^W2F-[0-9]{3,}$/.test(findingId);
      throw projectionError('wave2_finding_not_found', formatInvalid
        ? `Wave2 finding ${findingId} is absent from the current finding index and its id does not match the required W2F-\\d{3} format (three or more digits after W2F-).`
        : `Wave2 finding ${findingId} is absent from the current finding index.`);
    }
    if (!Array.isArray(finding.affected_topics) || finding.affected_topics.length === 0) {
      throw projectionError('wave2_finding_affected_topics_invalid', `Wave2 finding ${findingId} has no usable affected_topics authority.`);
    }
    if (!Object.hasOwn(finding, 'created_in_rerun_count')) {
      throw projectionError('wave2_finding_not_current', `Wave2 finding ${findingId} is missing created_in_rerun_count; a current finding must carry created_in_rerun_count equal to the current rerun_count ${round}.`);
    }
    if (finding.created_in_rerun_count !== round) {
      throw projectionError('wave2_finding_not_current', `Wave2 finding ${findingId} created_in_rerun_count is ${finding.created_in_rerun_count}, not the current round ${round}; update created_in_rerun_count or the finding id.`);
    }
    const affected = resolveWave2AffectedTopics(topicRegistryFact.layouts, finding.affected_topics);
    if (!affected.has(topicUid)) {
      throw projectionError('wave2_finding_topic_mismatch', `Wave2 finding ${findingId} does not resolve to packet topic ${topicUid}.`);
    }
  }
  return findingIndexFact;
}

function validateProjectionAuthority(bundle, canonical, input, topic) {
  const topicRegistryFact = {
    topic_registry: canonical.topic_registry,
    layouts: evaluateTopicLayouts(canonical.topic_registry),
  };
  const entries = input.updates.flatMap((update) => update.entries || []);
  if (input.wave === 'wave2') {
    validateWave2ProjectionAuthority(bundle, topicRegistryFact, topic.topic_uid, entries);
    return { topicRegistryFact };
  }
  if (input.wave === 'wave0') {
    const candidateProjection = collectSubmittedWave0ContributionProjection(bundle, { topicRegistryFact });
    if (!candidateProjection.passed) {
      const root = candidateProjection.root_findings?.[0];
      throw projectionError(root?.rule_id || 'submitted_source_contribution', root?.missing_fact || 'Submitted Wave0 source-contribution lineage authority is unavailable.');
    }
    const eligibleCandidateIds = new Set(candidateProjection.candidates
      .filter((candidate) => candidate.topic_uid === topic.topic_uid)
      .map((candidate) => candidate.entry_id));
    for (const entry of entries) {
      if (!eligibleCandidateIds.has(entry.entry_id)) {
        throw projectionError('projection_source_identity_not_current', `${entry.entry_id} is not a retained contribution-owned Wave0 source identity for ${topic.topic_uid}.`);
      }
    }
    return { topicRegistryFact, candidateProjection };
  }
  const eligible = collectEligibleWorkUnitProjection(bundle, { phase: input.wave, topicRegistryFact });
  if (!eligible.passed) {
    const root = eligible.root_findings?.[0];
    throw projectionError(root?.rule_id || 'submitted_projection_authority', root?.missing_fact || 'Current submitted work-unit authority is unavailable.');
  }
  const eligibleIds = new Set(eligible.rows.filter((row) => row.topic_uid === topic.topic_uid).map((row) => row.work_id));
  for (const entry of entries) {
    if (!eligibleIds.has(entry.source_identity.work_id)) {
      throw projectionError('projection_source_identity_not_current', `${entry.source_identity.work_id} is not a current eligible ${input.wave} submitted work identity for ${topic.topic_uid}.`);
    }
  }
  return { topicRegistryFact, eligible };
}

function projectionSlotTarget(seed, slot) {
  const candidates = locateSeedProjectionSlots(seed.body, { slotIds: [slot.slotId] }).filter((occurrence) => (
    occurrence.slotId === slot.slotId
    && (occurrence.headingKind === 'legacy' || splitSeedProjectionCard(occurrence.content, slot))
  ));
  if (candidates.length === 0) {
    throw projectionError('seed_projection_layout_missing', `${slot.slotId} has no unique recognized canonical/card or declared legacy write target.`);
  }
  if (candidates.length > 1) {
    throw projectionError('seed_projection_layout_ambiguous', `${slot.slotId} has multiple recognized write targets.`);
  }
  return candidates[0];
}

function projectionTargetEntryArea(target, slot) {
  const card = target.headingKind === 'canonical' ? splitSeedProjectionCard(target.content, slot) : null;
  return card ? card.entryArea : target.content;
}

function deferredContributionEntry(workId, candidate, deferred) {
  return {
    source_identity: { kind: 'submitted_work', work_id: workId },
    entry_id: candidate.entry_id,
    evidence_meaning: deferred.evidence_meaning,
    relationship: 'defers',
    refs: ['none'],
    status: 'deferred',
    next_hop: deferred.next_hop,
  };
}

function entryField(entry, field) {
  return String(entry?.fields?.[field] || '').trim();
}

function isEquivalentDeferredContributionEntry(existing, expected) {
  return existing?.metadata?.entry_id === expected.entry_id
    && isAcceptedDeferredProjectionEntry(existing)
    && entryField(existing, 'evidence_meaning') === expected.evidence_meaning
    && entryField(existing, 'relationship').toLowerCase() === 'defers'
    && entryField(existing, 'refs').toLowerCase() === 'none'
    && entryField(existing, 'status').toLowerCase() === 'deferred'
    && entryField(existing, 'next_hop') === expected.next_hop;
}

function expandWave0DeferredContribution(bundle, canonical, input, topic, seed) {
  const update = input.updates[0];
  if (!Object.hasOwn(update, 'deferred_contribution')) {
    return { input, deferred_contribution: null };
  }

  const deferred = update.deferred_contribution;
  const topicRegistryFact = {
    topic_registry: canonical.topic_registry,
    layouts: evaluateTopicLayouts(canonical.topic_registry),
  };
  const candidateProjection = collectSubmittedWave0ContributionProjection(bundle, { topicRegistryFact });
  if (!candidateProjection.passed) {
    const root = candidateProjection.root_findings?.[0];
    throw projectionError(root?.rule_id || 'submitted_source_contribution', root?.missing_fact || 'Submitted Wave0 source-contribution lineage authority is unavailable.');
  }

  const selectedWorkId = deferred.source_identity.work_id;
  const selectedCandidates = candidateProjection.candidates
    .filter((candidate) => candidate.work_id === selectedWorkId && candidate.topic_uid === topic.topic_uid)
    .sort((left, right) => left.source_ordinal - right.source_ordinal);
  if (selectedCandidates.length === 0) {
    const boundElsewhere = candidateProjection.candidates.some((candidate) => candidate.work_id === selectedWorkId);
    throw projectionError(
      boundElsewhere ? 'projection_deferred_contribution_cross_topic' : 'projection_deferred_contribution_not_current',
      boundElsewhere
        ? `${selectedWorkId} is not a retained submitted Wave0 contribution for ${topic.topic_uid}.`
        : `${selectedWorkId} is not a retained submitted Wave0 contribution with exact source identities for ${topic.topic_uid}.`,
    );
  }

  const generated = selectedCandidates.map((candidate) => deferredContributionEntry(selectedWorkId, candidate, deferred));
  if (!isAcceptedDeferredProjectionEntry({ fields: {
    relationship: 'defers',
    refs: 'none',
    status: 'deferred',
    next_hop: deferred.next_hop,
  } })) {
    throw projectionError('projection_deferred_contribution_limitation_invalid', 'deferred_contribution.next_hop must satisfy the accepted deferred-limitation rule.');
  }

  const slot = projectionSlotForId('wave0_evidence');
  const target = projectionSlotTarget(seed, slot);
  const parsed = parseProjectionEntryArea(projectionTargetEntryArea(target, slot));
  const existingById = new Map();
  for (const entry of parsed.entries) {
    const entryId = entry?.metadata?.entry_id;
    if (!entryId) continue;
    const matches = existingById.get(entryId) || [];
    matches.push(entry);
    existingById.set(entryId, matches);
  }

  const entries = [];
  for (const expected of generated) {
    const existing = existingById.get(expected.entry_id) || [];
    if (existing.length > 1 || (existing.length === 1 && !isEquivalentDeferredContributionEntry(existing[0], expected))) {
      throw projectionError(
        'projection_deferred_contribution_collision',
        `${expected.entry_id} already has a different persisted Wave0 projection disposition; contribution-scoped deferred input cannot overwrite it.`,
        { coordinate: `seed_topics/${topic.slug}.md#${expected.entry_id}` },
      );
    }
    if (existing.length === 0) entries.push(expected);
  }

  return {
    input: {
      ...input,
      updates: [{ slot_id: 'wave0_evidence', entries }],
    },
    deferred_contribution: {
      work_id: selectedWorkId,
      entry_ids: generated.map((entry) => entry.entry_id),
      newly_materialized_entry_ids: entries.map((entry) => entry.entry_id),
    },
  };
}

function buildWaveProjectionMutation(bundle, current, input) {
  const canonical = CanonicalPlanSchema.parse(current);
  const topic = canonical.topic_registry.find((candidate) => candidate.topic_uid === input.topic_uid);
  if (!topic) throw projectionError('projection_topic_not_current', `Projection packet topic_uid is not current: ${input.topic_uid}`);
  const binding = evaluateCanonicalSeedBindings(bundle, canonical).find((candidate) => candidate.topic_uid === topic.topic_uid);
  if (!binding?.ok) throw projectionError('projection_seed_binding_invalid', `Current seed binding is unavailable for ${topic.topic_uid}: ${binding?.reason_code || 'missing'}.`);
  const seed = readSeed(bundle, topic.slug);
  if (!seed.exists) throw projectionError('projection_seed_missing', `Current seed is missing for ${topic.slug}.`);
  const expanded = input.wave === 'wave0'
    ? expandWave0DeferredContribution(bundle, canonical, input, topic, seed)
    : { input, deferred_contribution: null };
  const projectionInput = expanded.input;
  validateProjectionAuthority(bundle, canonical, projectionInput, topic);
  const referenceFact = readProjectionReferenceFact(bundle);
  for (const update of projectionInput.updates) for (const entry of update.entries) validateProjectionEntryNavigation(entry, referenceFact);

  const replacements = [];
  for (const update of projectionInput.updates) {
    const slot = projectionSlotForId(update.slot_id);
    if (!slot?.ownerWaves.includes(projectionInput.wave)) {
      throw projectionError('projection_slot_not_owned', `${update.slot_id} is not owned by ${projectionInput.wave}.`);
    }
    replacements.push(materializeProjectionSlot(seed.body, projectionSlotTarget(seed, slot), slot, update.entries));
  }
  let body = seed.body;
  for (const replacement of replacements.sort((left, right) => right.startOffset - left.startOffset)) {
    body = `${body.slice(0, replacement.startOffset)}${replacement.replacement}${body.slice(replacement.endOffset)}`;
  }
  assertProjectionPostcondition(body, projectionInput, referenceFact);
  const header = seed.raw.slice(0, seed.raw.length - seed.body.length);
  return {
    plan: current,
    touched: new Map([[topic.slug, `${header}${body}`]]),
    cleanup_files: [],
    affected_topic_uids: [topic.topic_uid],
    selected_topic: topic,
    projection: {
      wave: projectionInput.wave,
      topic_uid: topic.topic_uid,
      slots: projectionInput.updates.map((update) => update.slot_id),
      ...(expanded.deferred_contribution ? { deferred_contribution: expanded.deferred_contribution } : {}),
    },
  };
}

function workspaceRoot(bundle, create = false) {
  const diagnostics = path.join(bundle, '_diagnostics');
  const root = path.join(bundle, TOPIC_STATE_ROOT);
  if (create && !existsSync(root)) { mkdirSync(root, { recursive: true }); fsyncPath(existsSync(diagnostics) ? diagnostics : bundle); }
  for (const candidate of [diagnostics, root]) {
    if (existsSync(candidate) && (lstatSync(candidate).isSymbolicLink() || !lstatSync(candidate).isDirectory())) throw new Error(`${path.relative(bundle, candidate)} must be a real directory`);
  }
  return root;
}
function acceptedWorkspaces(bundle) {
  const root = workspaceRoot(bundle);
  if (!existsSync(root)) return [];
  return readdirSync(root).sort().flatMap((name) => {
    const manifestPath = path.join(root, name, 'prepared.json');
    if (!existsSync(manifestPath)) return [];
    try { return [{ operation_id: name, workspace: path.relative(bundle, path.join(root, name)).replaceAll('\\', '/'), manifest: JSON.parse(readFileSync(manifestPath, 'utf8')) }]; } catch { return [{ operation_id: name, workspace: path.relative(bundle, path.join(root, name)).replaceAll('\\', '/'), manifest: null }]; }
  });
}
function lifecycleAuthorization(bundle, context, projectionWave = null) {
  const status = JSON.parse(readFileSync(path.join(bundle, 'rb_status.json'), 'utf8'));
  if (context === 'hitl1') {
    const ok = status.current_node === 'phases/phase-hitl1.md' && status.current_gate === 'hitl1_recorded' && status.next_gate === 'setup_ready';
    return ok ? { ok: true, context, current_node: status.current_node, current_gate: status.current_gate, next_gate: status.next_gate }
      : { ok: false, reason_code: 'hitl1_not_authorized', reason: 'HITL1 apply requires current_node phase-hitl1 and hitl1_recorded→setup_ready window' };
  }
  if (context === 'seed_topics') {
    const handoff = checkPhaseHandoffPreflight(bundle, 'phases/phase-seed-topics.md');
    const incoming = ['setup_ready', 'rerun_ready'].includes(status.current_gate) && status.next_gate === 'seed_topics_ready';
    const ok = handoff.ok && status.current_node === 'phases/phase-seed-topics.md' && incoming;
    return ok ? {
      ok: true,
      context,
      current_node: status.current_node,
      current_gate: status.current_gate,
      next_gate: status.next_gate,
      source_attempt_index: handoff.handoff?.index ?? null,
      load_witness_index: handoff.handoff?.loadComplete?.index ?? null,
    } : {
      ok: false,
      reason_code: 'seed_topics_not_authorized',
      reason: handoff.inspect?.[0] || 'seed enrichment requires a route-bound Seed Topics handoff and setup_ready|rerun_ready→seed_topics_ready window',
    };
  }
  if (context === 'wave_projection') {
    const window = {
      wave0: { node: 'phases/phase-wave0.md', currentGate: 'seed_topics_ready', nextGate: 'wave0_complete' },
      wave1: { node: 'phases/phase-wave1.md', currentGate: 'wave0_complete', nextGate: 'wave1_complete' },
      wave2: { node: 'phases/phase-wave2.md', currentGate: 'wave1_complete', nextGate: 'wave2_complete' },
    }[projectionWave];
    if (!window) return { ok: false, reason_code: 'wave_projection_not_authorized', reason: 'Projection apply requires wave0, wave1, or wave2.' };
    const handoff = checkPhaseHandoffPreflight(bundle, window.node);
    const ok = handoff.ok
      && status.current_node === window.node
      && status.current_gate === window.currentGate
      && status.next_gate === window.nextGate;
    return ok ? {
      ok: true,
      context,
      wave: projectionWave,
      current_node: status.current_node,
      current_gate: status.current_gate,
      next_gate: status.next_gate,
      source_attempt_index: handoff.handoff?.index ?? null,
      load_witness_index: handoff.handoff?.loadComplete?.index ?? null,
    } : {
      ok: false,
      reason_code: 'wave_projection_not_authorized',
      reason: handoff.inspect?.[0] || `Projection apply requires ${window.node} and ${window.currentGate}->${window.nextGate}.`,
    };
  }
  if (context !== 'rerun') return { ok: false, reason_code: 'context_not_authorized', reason: `Unsupported topic-state context: ${context}` };
  const handoff = checkPhaseHandoffPreflight(bundle, 'phases/phase-rerun.md');
  const ok = handoff.ok && status.current_node === 'phases/phase-rerun.md' && status.current_gate === 'hitl2_recorded' && status.next_gate === 'rerun_ready';
  return ok ? {
    ok: true,
    context,
    current_node: status.current_node,
    current_gate: status.current_gate,
    next_gate: status.next_gate,
    source_attempt_index: handoff.handoff.kind === 'post_final_reentry' ? null : handoff.handoff.index,
    load_witness_index: handoff.handoff.loadComplete?.index ?? null,
    ...(handoff.handoff.kind === 'post_final_reentry' ? {
      source_handoff_kind: 'post_final_reentry',
      source_handoff_event_id: handoff.handoff.eventId,
      source_handoff_event_index: handoff.handoff.index,
      source_handoff_event_sha256: handoff.handoff.eventLineSha256,
      source_handoff_operation_id: handoff.handoff.operationId,
      source_handoff_after_profile_sha256: handoff.handoff.committedAfterProfileSha256,
      source_handoff_transition_index: handoff.handoff.transition?.index ?? null,
      source_handoff_transition_binding: handoff.handoff.transition?.event ?? null,
      status_snapshot: {
        current_node: status.current_node,
        current_gate: status.current_gate,
        next_gate: status.next_gate,
      },
    } : {}),
  }
    : { ok: false, reason_code: 'rerun_not_authorized', reason: handoff.inspect?.[0] || 'rerun apply requires route-bound HITL2 witness and hitl2_recorded→rerun_ready window' };
}

export function inspectSeedTopicsAuthoringAuthorization({ bundlePath }) {
  return lifecycleAuthorization(safeBundle(bundlePath), 'seed_topics');
}
function activeTopicWork(bundle, plan, affectedTopicUids) {
  const affected = new Set(affectedTopicUids);
  if (affected.size === 0) return [];
  const layouts = evaluateTopicLayouts(plan.topic_registry);
  const matches = [];
  const queuePath = path.join(bundle, 'rb_queue.json');
  if (existsSync(queuePath)) {
    const queue = JSON.parse(readFileSync(queuePath, 'utf8'));
    for (const location of ['active_window', 'refill_pool']) for (const item of queue[location] || []) {
      const resolved = resolveStructuredTopicBinding(layouts, item);
      if (resolved.ok && affected.has(resolved.topic_uid) && ['queued', 'running', 'blocked'].includes(item.status)) matches.push(`rb_queue.json#/${location}/${item.queue_item_id}`);
    }
  }
  const indexPath = path.join(bundle, '_work_units', '_index.json');
  if (existsSync(indexPath)) {
    const index = JSON.parse(readFileSync(indexPath, 'utf8'));
    for (const item of Object.values(index.work_units || {})) {
      if (item.status !== 'claimed') continue;
      try {
        const manifest = JSON.parse(readFileSync(path.join(bundle, item.paths.manifest_ref), 'utf8'));
        const resolved = resolveStructuredTopicBinding(layouts, manifest);
        if (resolved.ok && affected.has(resolved.topic_uid)) matches.push(`_work_units/_index.json#/work_units/${item.work_id}`);
      } catch {
        matches.push(`_work_units/_index.json#/work_units/${item.work_id}`);
      }
    }
  }
  return matches;
}

function safeRemoveBlocker(bundle, plan, removedTopicUids) {
  const removed = new Set(removedTopicUids);
  if (removed.size === 0) return null;
  const layouts = evaluateTopicLayouts(plan.topic_registry);
  const queuePath = path.join(bundle, 'rb_queue.json');
  if (existsSync(queuePath)) {
    const queue = JSON.parse(readFileSync(queuePath, 'utf8'));
    const records = [
      ...(queue.active_window || []).map((item) => ({ ref: `rb_queue.json#/active_window/${item.queue_item_id}`, item })),
      ...(queue.refill_pool || []).map((item) => ({ ref: `rb_queue.json#/refill_pool/${item.queue_item_id}`, item })),
      ...(queue.terminal_history || []).map((record) => ({ ref: `rb_queue.json#/terminal_history/${record.queue_item_id}`, item: record.item })),
    ];
    for (const record of records) {
      const resolved = resolveStructuredTopicBinding(layouts, record.item);
      if (resolved.ok && removed.has(resolved.topic_uid)) return { reason_code: 'remove_has_history', fact_refs: [record.ref] };
      if (!resolved.ok && record.item && (record.item.payload?.topic_slug || record.item.lineage?.topic_slug)) return { reason_code: 'remove_history_unresolved', fact_refs: [record.ref] };
    }
  }

  const indexPath = path.join(bundle, '_work_units', '_index.json');
  if (existsSync(indexPath)) {
    const index = JSON.parse(readFileSync(indexPath, 'utf8'));
    for (const record of Object.values(index.work_units || {})) {
      const ref = `_work_units/_index.json#/work_units/${record.work_id}`;
      try {
        const manifest = JSON.parse(readFileSync(path.join(bundle, record.paths.manifest_ref), 'utf8'));
        const resolved = resolveStructuredTopicBinding(layouts, manifest);
        if (resolved.ok && removed.has(resolved.topic_uid)) return { reason_code: 'remove_has_history', fact_refs: [ref] };
        if (!resolved.ok) return { reason_code: 'remove_history_unresolved', fact_refs: [ref] };
      } catch {
        return { reason_code: 'remove_history_unresolved', fact_refs: [ref] };
      }
    }
  }

  for (const topicUid of removed) {
    for (const slug of acceptedTopicSlugs(layouts, topicUid)) {
      for (const relative of [`artifacts/wave0/${slug}`, `artifacts/wave1/${slug}`, `reference/${slug}`]) {
        if (existsSync(path.join(bundle, relative))) return { reason_code: 'remove_has_history', fact_refs: [relative] };
      }
      const referenceRoot = path.join(bundle, 'reference');
      if (existsSync(referenceRoot)) {
        const matched = readdirSync(referenceRoot).find((name) => name === `${slug}.md` || name.startsWith(`${slug}-`) || name.startsWith(`${slug}_`));
        if (matched) return { reason_code: 'remove_has_history', fact_refs: [`reference/${matched}`] };
      }
    }
  }
  return null;
}
// @impl CTS-001, RRM-007
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
function readSubmittedTopicFacts(bundle, layouts) {
  let ledgerRows;
  try {
    ledgerRows = readSubmittedWorkUnitDeclarations(bundle);
  } catch (error) {
    return { byUid: new Map(), blocker: { reason_code: 'submitted_topic_binding_unresolved', reason: error.message, recommended_action: 'Repair submitted work-unit authority through the existing work-unit owner, then rerun inspect.' } };
  }

  const byUid = new Map();
  for (const row of ledgerRows) {
    const workUnitDir = path.resolve(bundle, row.work_unit_ref);
    if (workUnitDir !== bundle && !workUnitDir.startsWith(`${bundle}${path.sep}`)) {
      return { byUid: new Map(), blocker: { reason_code: 'submitted_topic_binding_unresolved', work_id: row.work_id, reason: 'work_unit_ref escapes bundle', recommended_action: 'Repair submitted work-unit authority through the existing work-unit owner, then rerun inspect.' } };
    }
    const manifestPath = path.join(workUnitDir, 'manifest.json');
    let manifest;
    try {
      manifest = WorkUnitManifestSchema.parse(JSON.parse(readFileSync(manifestPath, 'utf8')));
    } catch (error) {
      return { byUid: new Map(), blocker: { reason_code: 'submitted_topic_binding_unresolved', work_id: row.work_id, reason: `manifest snapshot unreadable: ${error.message}`, fact_refs: [row.work_unit_ref], recommended_action: 'Repair submitted work-unit authority through the existing work-unit owner, then rerun inspect.' } };
    }
    if (manifest.work_id !== row.work_id || manifest.queue_item_id !== row.queue_item_id) {
      return { byUid: new Map(), blocker: { reason_code: 'submitted_topic_binding_unresolved', work_id: row.work_id, reason: 'ledger and manifest identity mismatch', fact_refs: [row.work_unit_ref], recommended_action: 'Repair submitted work-unit authority through the existing work-unit owner, then rerun inspect.' } };
    }
    const resolved = resolveStructuredTopicBinding(layouts, manifest);
    if (!resolved.ok) {
      return { byUid: new Map(), blocker: { reason_code: 'submitted_topic_binding_unresolved', work_id: row.work_id, binding_reason_code: resolved.reason_code, fact_refs: [row.work_unit_ref], recommended_action: 'Repair the immutable queue-item topic binding through the existing work-unit owner, then rerun inspect.' } };
    }
    const rows = byUid.get(resolved.topic_uid) || [];
    rows.push({ row, binding: resolved });
    byUid.set(resolved.topic_uid, rows);
  }
  return { byUid, blocker: null };
}

function progressRows(bundle, plan, bindings) {
  let queue = {};
  try { queue = JSON.parse(readFileSync(path.join(bundle, 'rb_queue.json'), 'utf8')); } catch {}
  const layouts = evaluateTopicLayouts(plan.topic_registry);
  const submitted = readSubmittedTopicFacts(bundle, layouts);
  const topics = plan.topic_registry.map((topic) => {
    const binding = bindings.find((item) => item.topic_uid === topic.topic_uid);
    if (!binding?.ok) return { topic_uid: topic.topic_uid, slug: topic.slug, state: 'blocked', reason_code: binding?.reason_code || 'binding_missing', fact_refs: binding?.fact_refs || [], recommended_action: 'Repair canonical registry/seed binding, then rerun inspect.' };
    const active = [...(queue.active_window || []), ...(queue.refill_pool || [])].filter((item) => resolveStructuredTopicBinding(layouts, item).topic_uid === topic.topic_uid && ['queued', 'running', 'blocked'].includes(item.status));
    const artifactRoots = acceptedTopicSlugs(layouts, topic.topic_uid).flatMap((slug) => ['wave0', 'wave1'].filter((wave) => existsSync(path.join(bundle, 'artifacts', wave, slug))).map((wave) => `artifacts/${wave}/${slug}`));
    const submittedRows = submitted.byUid.get(topic.topic_uid) || [];
    if (artifactRoots.length > 0 && submittedRows.length > 0) return { topic_uid: topic.topic_uid, slug: topic.slug, state: 'complete', reason_code: 'submitted_artifact_facts', fact_refs: [...artifactRoots, ...submittedRows.map(({ row }) => `rb_output_declarations.jsonl#${row.work_id}`)], recommended_action: null };
    if (artifactRoots.length > 0) return { topic_uid: topic.topic_uid, slug: topic.slug, state: 'blocked', reason_code: 'artifact_without_submitted_fact', fact_refs: artifactRoots, recommended_action: 'Repair or submit through the existing work-unit owner, then rerun inspect.' };
    if (active.length > 0) return { topic_uid: topic.topic_uid, slug: topic.slug, state: 'in_progress', reason_code: 'active_queue_work', fact_refs: active.map((item) => `rb_queue.json#/${item.queue_item_id}`), recommended_action: 'Continue through the existing queue/work-unit owner.' };
    return { topic_uid: topic.topic_uid, slug: topic.slug, state: 'not_started', reason_code: 'no_work_facts', fact_refs: binding.fact_refs, recommended_action: null };
  });
  return { topics, blocker: submitted.blocker };
}

function topicStateBlockerFinding(bundlePath, blocker) {
  const reasonCode = blocker.reason_code || 'topic_state_prerequisite_invalid';
  const recommended = blocker.recommended_action || null;
  const engineCommand = typeof recommended === 'string' && recommended.startsWith('node ');
  const basis = reasonCode.includes('binding') || reasonCode.includes('mismatch')
    ? 'binding_integrity'
    : (reasonCode.includes('submitted') || reasonCode === 'artifact_without_submitted_fact' ? 'authority_integrity' : 'required_structure');
  const repairKind = engineCommand ? 'engine_operation' : 'missing_contract';
  const writeTo = engineCommand
    ? recommended
    : `Canonical topic-state prerequisite boundary '${reasonCode}'`;
  const observed = {
    reason_code: reasonCode,
    reason: blocker.reason || null,
    fact_refs: blocker.fact_refs || [],
  };
  return makeContractFinding({
    id: `canonical_topic_state:${reasonCode}`,
    ruleId: 'canonical_topic_state_prerequisite',
    findingSource: 'checker',
    blockingBasis: basis,
    surface: blocker.workspace || blocker.path || 'rb_plan.md + UID-bound seed/topic authority',
    expected: 'Canonical topic registry, seed bindings, submitted-topic authority, and accepted workspace state are internally consistent.',
    observed,
    missingFact: `Canonical topic-state prerequisite failed: ${reasonCode}${blocker.reason ? ` — ${blocker.reason}` : ''}`,
    repairKind,
    writeTo,
    detail: `Canonical topic-state prerequisite failed: ${reasonCode}`,
    repair: recommended || 'Use the owning topic-state/work-unit boundary; no direct authority edit is currently authorized.',
  });
}

function withTopicStateFindings(result, bundlePath) {
  return {
    ...result,
    blockers: (result.blockers || []).map((blocker) => ({
      ...blocker,
      finding: topicStateBlockerFinding(bundlePath, blocker),
    })),
  };
}

export function inspectCanonicalTopicState({ bundlePath }) {
  const bundle = safeBundle(bundlePath);
  const workspaces = acceptedWorkspaces(bundle);
  if (workspaces.length > 0) return withTopicStateFindings({ schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'inspect', passed: false, mode: 'blocked', blockers: [{ reason_code: 'accepted_workspace', operation_id: workspaces[0].operation_id, workspace: workspaces[0].workspace, recommended_action: `node DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs recover --bundle ${bundlePath} --operation-id ${workspaces[0].operation_id}` }], topics: [] }, bundlePath);
  const planPath = path.join(bundle, 'rb_plan.md');
  if (!existsSync(planPath) || lstatSync(planPath).isSymbolicLink() || !lstatSync(planPath).isFile()) {
    return withTopicStateFindings({ schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'inspect', passed: false, mode: 'invalid', blockers: [{ reason_code: 'plan_missing', recommended_action: 'Restore a regular rb_plan.md through the owning lifecycle path, then rerun inspect.' }], topics: [] }, bundlePath);
  }
  let plan;
  try {
    plan = splitPlan(readFileSync(planPath, 'utf8')).frontmatter;
  } catch (error) {
    return withTopicStateFindings({ schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'inspect', passed: false, mode: 'invalid', blockers: [{ reason_code: 'plan_invalid', reason: error.message }], topics: [] }, bundlePath);
  }
  const canonical = CanonicalPlanSchema.safeParse(plan);
  if (!canonical.success) {
    return withTopicStateFindings({ schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'inspect', passed: false, mode: 'invalid', blockers: [{ reason_code: 'plan_invalid', reason: canonical.error.message }], topics: [] }, bundlePath);
  }
  const bindings = evaluateCanonicalSeedBindings(bundle, canonical.data);
  const progress = progressRows(bundle, canonical.data, bindings);
  const blockers = [...bindings.filter((item) => !item.ok), ...(progress.blocker ? [progress.blocker] : [])];
  const layoutBaseline = canonical.data.topic_registry.map((topic) => {
    const slugStem = losslessTopicSlugStem(topic.slug);
    return {
      topic_uid: topic.topic_uid,
      title: topic.title,
      ...(slugStem ? { slug_stem: slugStem } : { slug_stem_required: true }),
    };
  });
  return withTopicStateFindings({
    schema_version: TOPIC_STATE_SCHEMA_VERSION,
    operation: 'inspect',
    passed: blockers.length === 0,
    mode: 'canonical',
    plan_sha256: hashBytes(readFileSync(planPath)),
    layout_baseline: { context: 'rerun', action: 'mutate_layout', expected_plan_sha256: hashBytes(readFileSync(planPath)), topics: layoutBaseline, remove_topic_uids: [] },
    blockers,
    topics: progress.topics,
  }, bundlePath);
}

function buildMutation(bundle, parsedPlan, input, { profileRerunCount = null } = {}) {
  const current = structuredClone(parsedPlan);
  const touched = new Map();
  if (input.action === 'apply_seed_projection') {
    return buildWaveProjectionMutation(bundle, current, input);
  }
  if (input.action === 'enrich_seed') {
    const canonical = CanonicalPlanSchema.parse(current);
    const topic = canonical.topic_registry.find((entry) => entry.topic_uid === input.topic_uid);
    if (!topic) throw Object.assign(new Error(`unknown topic_uid: ${input.topic_uid}`), { reason_code: 'unknown_topic_uid' });
    let seed;
    try { seed = readSeed(bundle, topic.slug); } catch (error) {
      throw Object.assign(new Error(error.message), { reason_code: /frontmatter/.test(error.message) ? 'frontmatter_invalid' : 'seed_target_unsafe' });
    }
    if (!seed.exists) throw Object.assign(new Error(`current seed missing for ${topic.slug}`), { reason_code: 'seed_missing' });
    const before = evaluateSeedTopicAuthoring({ raw: seed.raw, relativePath: `seed_topics/${topic.slug}.md`, topic });
    if (!before.passed && before.reason_code === 'frontmatter_invalid') {
      throw Object.assign(new Error(before.missing_fact), { reason_code: 'frontmatter_invalid', coordinate: before.write_to });
    }
    const frontmatter = { ...seed.frontmatter, ...input.enrichment };
    touched.set(topic.slug, renderSeed(topic, { ...seed, frontmatter }));
    return {
      plan: current,
      touched,
      cleanup_files: [],
      affected_topic_uids: [topic.topic_uid],
      selected_topic: topic,
      binding_repair: before.passed ? null : {
        field: before.write_to?.split('#/')[1] || null,
        expected: before.expected,
        observed: before.observed,
        coordinate: before.write_to || null,
      },
    };
  }
  if (input.action === 'mutate_layout') {
    CanonicalPlanSchema.parse(current);
    const target = buildTopicLayoutTarget(current.topic_registry, input);
    const oldByUid = new Map(current.topic_registry.map((topic) => [topic.topic_uid, topic]));
    const finalByUid = new Map(target.topic_registry.map((topic) => [topic.topic_uid, topic]));
    const cleanupFiles = [];
    for (const topicUid of target.affected_topic_uids) {
      const oldTopic = oldByUid.get(topicUid);
      const finalTopic = finalByUid.get(topicUid);
      const oldSeed = readSeed(bundle, oldTopic.slug);
      if (!oldSeed.exists) throw new Error(`current seed missing for ${oldTopic.slug}`);
      if (finalTopic) touched.set(finalTopic.slug, renderSeed(finalTopic, oldSeed));
      if (!finalTopic || finalTopic.slug !== oldTopic.slug) {
        cleanupFiles.push({ relative: `seed_topics/${oldTopic.slug}.md`, expected_sha256: hashBytes(oldSeed.raw) });
      }
    }
    current.topic_registry = target.topic_registry;
    current.derived_topic_count = current.topic_registry.length;
    CanonicalPlanSchema.parse(current);
    return { plan: current, touched, cleanup_files: cleanupFiles, affected_topic_uids: target.affected_topic_uids };
  }
  const canonical = CanonicalPlanSchema.parse(current);
  const byUid = new Map(canonical.topic_registry.map((topic) => [topic.topic_uid, topic]));
  const targetUids = input.actions.filter((action) => action.action !== 'add_topic').map((action) => action.topic_uid);
  if (new Set(targetUids).size !== targetUids.length) throw new Error('duplicate update target');
  let nextOrdinal = canonical.topic_registry.reduce((max, topic) => Math.max(max, Number(topic.id) || 0), 0);
  for (const action of input.actions) {
    if (action.action === 'add_topic') {
      nextOrdinal += 1;
      const id = String(nextOrdinal).padStart(2, '0');
      const slug = `${id}_${action.slug_stem}`;
      if (canonical.topic_registry.some((topic) => topic.slug === slug)) throw new Error(`duplicate slug: ${slug}`);
      const topic = { topic_uid: `tp_${randomUUID()}`, id, slug, title: action.title, must_answer: action.must_answer, scope_role: action.scope_role, depends_on_topic_uids: action.depends_on_topic_uids };
      canonical.topic_registry.push(topic); byUid.set(topic.topic_uid, topic); touched.set(slug, renderSeed(topic, null, action.direction || null));
    } else if (action.action === 'update_intent') {
      const topic = byUid.get(action.topic_uid); if (!topic) throw new Error(`unknown topic_uid: ${action.topic_uid}`);
      Object.assign(topic, { title: action.title, must_answer: action.must_answer, scope_role: action.scope_role, depends_on_topic_uids: action.depends_on_topic_uids });
      const seed = readSeed(bundle, topic.slug); touched.set(topic.slug, renderSeed(topic, seed, action.direction || null));
    } else {
      const topic = byUid.get(action.topic_uid); if (!topic) throw new Error(`unknown topic_uid: ${action.topic_uid}`);
      const seed = readSeed(bundle, topic.slug); if (!seed.exists) throw new Error(`current seed missing for ${topic.slug}`);
      touched.set(topic.slug, renderSeed(topic, seed, action.direction));
    }
  }
  current.topic_registry = canonical.topic_registry;
  current.derived_topic_count = current.topic_registry.length;
  CanonicalPlanSchema.parse(current);
  return { plan: current, touched, cleanup_files: [], affected_topic_uids: [...touched.keys()].map((slug) => current.topic_registry.find((topic) => topic.slug === slug)?.topic_uid).filter(Boolean) };
}

export function applyCanonicalTopicState({ bundlePath, input, crashAt = null, forceDeviceMismatch = false }) {
  const bundle = safeBundle(bundlePath);
  const requestedActions = Array.isArray(input?.actions) ? input.actions.map((item) => item?.action) : [input?.action];
  const imperativeLayoutAction = requestedActions.find((action) => ['remove', 'remove_topic', 'rename', 'renumber'].includes(action));
  if (imperativeLayoutAction) return {
    schema_version: TOPIC_STATE_SCHEMA_VERSION,
    operation: 'apply',
    verdict: 'blocked',
    reason_code: 'layout_mutation_not_supported',
    reason: `${imperativeLayoutAction} is not an accepted imperative action; use one complete mutate_layout target during sanctioned rerun.`,
    recommended_action: 'Run inspect to obtain the complete mutate_layout baseline, then submit that target through the sanctioned rerun path; do not direct-edit multiple surfaces.',
  };
  const unsupported = requestedActions.find((action) => ['retire', 'delete', 'move', 'path_move', 'set_progress', 'set_status', 'override'].includes(action));
  if (unsupported) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'apply', verdict: 'blocked', reason_code: 'layout_mutation_not_supported', reason: `${unsupported} is not supported by canonical topic-state apply`, recommended_action: 'Use the existing owner or propose the missing C5 capability; do not direct-edit multiple surfaces.' };
  const parsed = TopicApplyPlanSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const validation = projectTopicApplyValidationErrors(parsed.error.issues, { input });
    return {
      schema_version: TOPIC_STATE_SCHEMA_VERSION,
      operation: 'apply',
      verdict: 'blocked',
      reason_code: 'input_invalid',
      repair_kind: 'agent_action',
      repair_surface: 'retained_input',
      coordinate: validation.primary_validation_path || issue?.path?.join('.') || null,
      reason: issue?.message || 'invalid topic-state input',
      ...validation,
      rerun: 'node DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs apply --bundle <bundle-path> --input <input-path>',
      recommended_action: 'Correct the retained complete input and rerun this same apply checkpoint.',
    };
  }
  const parsedInput = parsed.data;
  const planPath = path.join(bundle, 'rb_plan.md');
  if (!existsSync(planPath) || lstatSync(planPath).isSymbolicLink() || !lstatSync(planPath).isFile()) {
    return {
      schema_version: TOPIC_STATE_SCHEMA_VERSION,
      operation: 'apply',
      verdict: 'blocked',
      reason_code: 'plan_invalid',
      repair_kind: 'missing_contract',
      reason: 'rb_plan.md must be a non-symlink regular file',
      recommended_action: 'Restore a current canonical rb_plan.md through its owning lifecycle path, then rerun this same apply checkpoint.',
    };
  }
  const oldRaw = readFileSync(planPath, 'utf8');
  let split;
  try {
    split = splitPlan(oldRaw);
  } catch (error) {
    return {
      schema_version: TOPIC_STATE_SCHEMA_VERSION,
      operation: 'apply',
      verdict: 'blocked',
      reason_code: 'plan_invalid',
      repair_kind: 'missing_contract',
      reason: error.message,
      recommended_action: 'Restore a current canonical rb_plan.md through its owning lifecycle path, then rerun this same apply checkpoint.',
    };
  }
  const oldCanonical = CanonicalPlanSchema.safeParse(split.frontmatter);
  if (!oldCanonical.success) {
    return {
      schema_version: TOPIC_STATE_SCHEMA_VERSION,
      operation: 'apply',
      verdict: 'blocked',
      reason_code: 'plan_invalid',
      repair_kind: 'missing_contract',
      reason: oldCanonical.error.message,
      recommended_action: 'Restore a current canonical rb_plan.md through its owning lifecycle path, then rerun this same apply checkpoint.',
    };
  }
  const accepted = acceptedWorkspaces(bundle);
  if (accepted.length) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'apply', verdict: 'blocked', reason_code: 'accepted_workspace', recommended_action: `recover --operation-id ${accepted[0].operation_id}` };
  const authorization = lifecycleAuthorization(bundle, parsedInput.context, parsedInput.wave || null);
  if (!authorization.ok) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'apply', verdict: 'blocked', ...authorization };
  const profileRerunCount = parsedInput.context === 'rerun' && Array.isArray(parsedInput.actions)
    ? currentProfileRerunCount(bundle)
    : null;
  validateRerunDirectionCounts(parsedInput, profileRerunCount);
  const seedRoot = path.join(bundle, 'seed_topics');
  if (!existsSync(seedRoot) || lstatSync(seedRoot).isSymbolicLink() || !lstatSync(seedRoot).isDirectory()) throw new Error('seed_topics must be a real directory');
  if (parsedInput.action === 'mutate_layout' && hashBytes(oldRaw) !== parsedInput.expected_plan_sha256) {
    return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'apply', verdict: 'blocked', reason_code: 'plan_hash_mismatch', recommended_action: 'Rerun inspect and resubmit the complete layout baseline.' };
  }
  let mutation;
  try {
    mutation = buildMutation(bundle, split.frontmatter, parsedInput, { profileRerunCount });
  } catch (error) {
    const reason = error.message || String(error);
    if (reason.startsWith('remove_has_dependents')) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'apply', verdict: 'blocked', reason_code: 'remove_has_dependents', reason };
    if (reason.startsWith('layout_slug_collision')) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'apply', verdict: 'blocked', reason_code: 'layout_slug_collision', reason };
    if (error.reason_code) return {
      schema_version: TOPIC_STATE_SCHEMA_VERSION,
      operation: 'apply',
      verdict: 'blocked',
      reason_code: error.reason_code,
      repair_kind: error.reason_code === 'seed_target_unsafe' ? 'missing_contract' : 'agent_action',
      coordinate: error.coordinate || null,
      reason,
      ...(Array.isArray(error.near_matches) && error.near_matches.length > 0 ? { near_matches: error.near_matches } : {}),
      ...(Array.isArray(error.missing_refs) && error.missing_refs.length > 0 ? { missing_refs: error.missing_refs } : {}),
      recommended_action: error.reason_code === 'frontmatter_invalid'
        ? 'Repair only the reported frontmatter syntax coordinate, then rerun this same apply checkpoint.'
        : error.reason_code.startsWith('projection_entry_ref')
          ? 'Materialize or select an existing safe reference/*.md target through the existing reference owner, then rerun this same apply checkpoint.'
        : 'Correct the direct root through its owning boundary, then rerun this same apply checkpoint.',
    };
    throw error;
  }
  if (parsedInput.action === 'mutate_layout') {
    const removeBlocker = safeRemoveBlocker(bundle, oldCanonical.data, parsedInput.remove_topic_uids);
    if (removeBlocker) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'apply', verdict: 'blocked', ...removeBlocker, recommended_action: 'Preserve the topic and its history; only an unstarted dependency-free topic can be removed.' };
  }
  const active = ['enrich_seed', 'apply_seed_projection'].includes(parsedInput.action)
    ? []
    : (oldCanonical.success ? activeTopicWork(bundle, oldCanonical.data, mutation.affected_topic_uids) : []);
  if (active.length) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'apply', verdict: 'blocked', reason_code: 'active_topic_work', fact_refs: active, recommended_action: 'Resolve through existing queue/work-unit owner, then rerun apply.' };
  if (parsedInput.action === 'mutate_layout') {
    const finalBySlug = new Map(mutation.plan.topic_registry.map((topic) => [topic.slug, topic]));
    const oldByUid = new Map(oldCanonical.data.topic_registry.map((topic) => [topic.topic_uid, topic]));
    for (const slug of mutation.touched.keys()) {
      const target = path.join(seedRoot, `${slug}.md`);
      const finalTopic = finalBySlug.get(slug);
      const oldTopic = oldByUid.get(finalTopic.topic_uid);
      if (existsSync(target) && slug !== oldTopic?.slug) {
        return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'apply', verdict: 'blocked', reason_code: 'seed_target_exists', path: `seed_topics/${slug}.md`, recommended_action: 'Remove or repair the unexplained target through its existing owner, then rerun apply.' };
      }
      if (existsSync(target) && (lstatSync(target).isSymbolicLink() || !lstatSync(target).isFile())) {
        return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'apply', verdict: 'blocked', reason_code: 'seed_target_unsafe', path: `seed_topics/${slug}.md` };
      }
    }
  }
  const presentation = ['enrich_seed', 'apply_seed_projection'].includes(parsedInput.action)
    ? { body: split.body, advisory: null }
    : refreshTopicRegistryTable(split.body, split.frontmatter.topic_registry || [], mutation.plan.topic_registry);
  const newPlanRaw = ['enrich_seed', 'apply_seed_projection'].includes(parsedInput.action)
    ? oldRaw
    : renderPlan(mutation.plan, presentation.body);
  if (parsedInput.action === 'enrich_seed') {
    const staged = mutation.touched.get(mutation.selected_topic.slug);
    const post = evaluateSeedTopicAuthoring({
      raw: staged,
      relativePath: `seed_topics/${mutation.selected_topic.slug}.md`,
      topic: mutation.selected_topic,
    });
    if (!post.passed) return {
      schema_version: TOPIC_STATE_SCHEMA_VERSION,
      operation: 'apply',
      verdict: 'blocked',
      reason_code: 'writer_postcondition_failed',
      repair_kind: 'missing_contract',
      coordinate: post.write_to,
      reason: post.missing_fact,
      recommended_action: 'Repair the canonical topic-state writer contract, then rerun this same apply checkpoint.',
    };
  }
  const replacementsUnchanged = hashBytes(newPlanRaw) === hashBytes(oldRaw)
    && [...mutation.touched.entries()].every(([slug, bytes]) => existsSync(path.join(seedRoot, `${slug}.md`)) && hashBytes(readFileSync(path.join(seedRoot, `${slug}.md`))) === hashBytes(bytes));
  if (replacementsUnchanged && mutation.cleanup_files.length === 0) {
    return {
      schema_version: TOPIC_STATE_SCHEMA_VERSION,
      operation: 'apply',
      verdict: 'unchanged',
      affected_topic_uids: mutation.affected_topic_uids,
      advisory: presentation.advisory,
      ...(parsedInput.action === 'enrich_seed' ? {
        action: 'enrich_seed', topic_uid: mutation.selected_topic.topic_uid,
        slug: mutation.selected_topic.slug, path: `seed_topics/${mutation.selected_topic.slug}.md`, binding_repair: null,
      } : parsedInput.action === 'apply_seed_projection' ? {
        action: 'apply_seed_projection', wave: mutation.projection.wave,
        topic_uid: mutation.projection.topic_uid, slots: mutation.projection.slots,
        path: `seed_topics/${mutation.selected_topic.slug}.md`,
        ...(mutation.projection.deferred_contribution ? { deferred_contribution: mutation.projection.deferred_contribution } : {}),
      } : {}),
    };
  }
  const operationId = randomUUID();
  const root = workspaceRoot(bundle, true);
  const workspace = path.join(root, operationId); mkdirSync(workspace); fsyncPath(root);
  try {
    if (forceDeviceMismatch || statSync(workspace).dev !== statSync(planPath).dev || statSync(workspace).dev !== statSync(seedRoot).dev) throw new Error('topic-state workspace and owned targets must be on the same device');
    const stagedDir = path.join(workspace, 'staged'); mkdirSync(stagedDir); fsyncPath(workspace);
    const files = [];
    const stage = (relative, bytes) => {
      const target = path.join(bundle, relative); const stagedName = hashBytes(relative); const staged = path.join(stagedDir, stagedName);
      writeDurable(staged, bytes);
      files.push({ relative, expected_sha256: existsSync(target) ? hashBytes(readFileSync(target)) : null, staged_sha256: hashBytes(bytes), staged_name: stagedName });
    };
    for (const [slug, bytes] of mutation.touched) stage(`seed_topics/${slug}.md`, bytes);
    if (parsedInput.action !== 'apply_seed_projection') stage('rb_plan.md', newPlanRaw);
    if (crashAt === 'before_prepared') throw Object.assign(new Error('simulated crash before_prepared'), { preserveWorkspace: false });
    const manifest = { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation_id: operationId, state: 'prepared', authorization, input_sha256: hashBytes(JSON.stringify(parsedInput)), registry_length_changed: split.frontmatter.topic_registry.length !== mutation.plan.topic_registry.length, committed_topic_count: mutation.plan.topic_registry.length, affected_topic_uids: mutation.affected_topic_uids, presentation_advisory: presentation.advisory, files, cleanup_files: mutation.cleanup_files, ...(parsedInput.action === 'enrich_seed' ? { action: 'enrich_seed', topic_uid: mutation.selected_topic.topic_uid, slug: mutation.selected_topic.slug, path: `seed_topics/${mutation.selected_topic.slug}.md`, binding_repair: mutation.binding_repair } : parsedInput.action === 'apply_seed_projection' ? { action: 'apply_seed_projection', wave: mutation.projection.wave, topic_uid: mutation.projection.topic_uid, slots: mutation.projection.slots, path: `seed_topics/${mutation.selected_topic.slug}.md` } : {}) };
    writeDurable(path.join(workspace, 'prepared.json'), `${JSON.stringify(manifest, null, 2)}\n`); fsyncPath(workspace);
    if (crashAt === 'after_prepared') throw Object.assign(new Error('simulated crash after_prepared'), { preserveWorkspace: true });
    const result = recoverCanonicalTopicState({ bundlePath, operationId, crashAt });
    return parsedInput.action === 'enrich_seed' ? {
      ...result,
      action: 'enrich_seed',
      topic_uid: mutation.selected_topic.topic_uid,
      slug: mutation.selected_topic.slug,
      path: `seed_topics/${mutation.selected_topic.slug}.md`,
      binding_repair: mutation.binding_repair,
    } : parsedInput.action === 'apply_seed_projection' ? {
      ...result,
      action: 'apply_seed_projection',
      wave: mutation.projection.wave,
      topic_uid: mutation.projection.topic_uid,
      slots: mutation.projection.slots,
      path: `seed_topics/${mutation.selected_topic.slug}.md`,
      ...(mutation.projection.deferred_contribution ? { deferred_contribution: mutation.projection.deferred_contribution } : {}),
    } : result;
  } catch (error) {
    if (!error.preserveWorkspace) { rmSync(workspace, { recursive: true, force: true }); fsyncPath(root); }
    throw error;
  }
}

export function recoverCanonicalTopicState({ bundlePath, operationId, crashAt = null }) {
  const bundle = safeBundle(bundlePath); const root = workspaceRoot(bundle); const workspace = path.join(root, operationId);
  const manifestPath = path.join(workspace, 'prepared.json');
  if (!existsSync(manifestPath)) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'recover', verdict: 'blocked', reason_code: 'prepared_manifest_missing' };
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  let seedCommitted = 0;
  for (const file of manifest.files) {
    const target = path.join(bundle, file.relative); const staged = path.join(workspace, 'staged', file.staged_name);
    if (!existsSync(staged)) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'recover', verdict: 'blocked', reason_code: 'staged_file_missing', path: file.relative };
    if (lstatSync(staged).isSymbolicLink() || !lstatSync(staged).isFile()) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'recover', verdict: 'blocked', reason_code: 'staged_file_unsafe', path: file.relative };
    if (existsSync(target) && (lstatSync(target).isSymbolicLink() || !lstatSync(target).isFile())) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'recover', verdict: 'blocked', reason_code: 'target_unsafe', path: file.relative };
    const current = existsSync(target) ? hashBytes(readFileSync(target)) : null;
    if (current === file.staged_sha256) continue;
    if (current !== file.expected_sha256) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'recover', verdict: 'blocked', reason_code: 'late_drift', path: file.relative };
    const temp = `${target}.topic-state-${operationId}`;
    if (existsSync(temp)) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'recover', verdict: 'blocked', reason_code: 'temporary_target_exists', path: file.relative };
    writeFileSync(temp, readFileSync(staged), { flag: 'wx' }); fsyncPath(temp); renameSync(temp, target); fsyncPath(path.dirname(target));
    if (crashAt === 'after_plan' && file.relative === 'rb_plan.md') throw Object.assign(new Error('simulated crash after_plan'), { preserveWorkspace: true });
    if (file.relative.startsWith('seed_topics/')) seedCommitted += 1;
    if (crashAt === 'after_first_seed' && seedCommitted === 1) throw Object.assign(new Error('simulated crash after_first_seed'), { preserveWorkspace: true });
  }
  if (crashAt === 'before_cleanup') throw Object.assign(new Error('simulated crash before_cleanup'), { preserveWorkspace: true });
  let cleanupCommitted = 0;
  for (const cleanup of manifest.cleanup_files || []) {
    const target = path.join(bundle, cleanup.relative);
    if (!existsSync(target)) continue;
    if (lstatSync(target).isSymbolicLink() || !lstatSync(target).isFile()) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'recover', verdict: 'blocked', reason_code: 'cleanup_target_unsafe', path: cleanup.relative };
    if (hashBytes(readFileSync(target)) !== cleanup.expected_sha256) return { schema_version: TOPIC_STATE_SCHEMA_VERSION, operation: 'recover', verdict: 'blocked', reason_code: 'late_drift', path: cleanup.relative };
    rmSync(target); fsyncPath(path.dirname(target)); cleanupCommitted += 1;
    if (crashAt === 'after_first_cleanup' && cleanupCommitted === 1) throw Object.assign(new Error('simulated crash after_first_cleanup'), { preserveWorkspace: true });
  }
  rmSync(workspace, { recursive: true }); fsyncPath(root);
  return {
    schema_version: TOPIC_STATE_SCHEMA_VERSION,
    operation: 'recover',
    verdict: 'committed',
    operation_id: operationId,
    ...(manifest.registry_length_changed ? {
      style_projection: buildStyleProjectionHandoff(bundle, {
        committedTopicCount: Number.isInteger(manifest.committed_topic_count)
          ? manifest.committed_topic_count
          : null,
        context: manifest.authorization?.context,
      }),
    } : {}),
    advisory: manifest.presentation_advisory || null,
    ...(manifest.action === 'enrich_seed' ? { action: manifest.action, topic_uid: manifest.topic_uid, slug: manifest.slug, path: manifest.path, binding_repair: manifest.binding_repair ?? null } : {}),
  };
}
