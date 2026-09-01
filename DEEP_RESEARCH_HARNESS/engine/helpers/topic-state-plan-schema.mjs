// topic-state-plan-schema.mjs
// Plan zod schemas, schema introspection, and validation projection (W2 carve).
// Pure computation: no fs access.
// @impl CTS-005, CTS-006

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
import { SEED_TOPIC_PROJECTION_ENTRY_FIELDS, SEED_TOPIC_PROJECTION_CARD_LABEL, SEED_TOPIC_PROJECTION_SLOTS, PROJECTION_SLOT_BY_ID, projectionSlotForId, projectionSlotsForWave, projectionSlotHeadingMatches, locateSeedProjectionSlots, renderSeedProjectionCard, renderSeedProjectionSlot, renderSeedProjectionAppendix, splitSeedProjectionCard } from "./topic-schema-projection.mjs";

export const TOPIC_STATE_SCHEMA_VERSION = '1.1.0';

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

export function projectionSourceIdentityRuleForWave(wave) {
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

export function topicSchemaType(schema) {
  return schema?._def?.typeName || null;
}

export function unwrapTopicSchemaStructure(schema) {
  let current = schema;
  while (topicSchemaType(current) === TOPIC_SCHEMA_TYPES.ZodEffects) current = current._def.schema;
  return current;
}

export function unwrapTopicSchemaOptional(schema) {
  let current = schema;
  while ([TOPIC_SCHEMA_TYPES.ZodOptional, TOPIC_SCHEMA_TYPES.ZodDefault].includes(topicSchemaType(current))) {
    current = current._def.innerType;
  }
  return current;
}

export function topicSchemaShape(schema) {
  const unwrapped = unwrapTopicSchemaStructure(schema);
  if (topicSchemaType(unwrapped) !== TOPIC_SCHEMA_TYPES.ZodObject) {
    throw new Error(`unsupported topic-state structural form: ${topicSchemaType(unwrapped) || 'unknown'}`);
  }
  return unwrapped._def.shape();
}

export function topicSchemaClosedValues(schema) {
  const unwrapped = unwrapTopicSchemaOptional(unwrapTopicSchemaStructure(schema));
  const type = topicSchemaType(unwrapped);
  if (type === TOPIC_SCHEMA_TYPES.ZodLiteral) return [unwrapped._def.value];
  if (type === TOPIC_SCHEMA_TYPES.ZodEnum) return [...unwrapped._def.values];
  return null;
}

export function topicSchemaActionForms(branch) {
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

export function topicSchemaPath(pathParts) {
  if (!pathParts.length) return 'input';
  return pathParts.reduce((result, part) => {
    if (typeof part === 'number') return `${result}[${part}]`;
    if (!result) return part;
    return `${result}.${part}`;
  }, '');
}

export function topicSchemaFieldPath(pathParts) {
  return topicSchemaPath(pathParts.map((part) => (typeof part === 'number' ? '[]' : part)))
    .replace(/\.\[\]/g, '[]');
}

export function topicSchemaStringExample(schema, state, pathParts) {
  if (pathParts.at(-1) === 'entry_id') return state.entryId;
  const regex = (schema._def.checks || []).find((check) => check.kind === 'regex')?.regex;
  const source = regex?.source || '';
  if (source.includes('wu-w')) return 'wu-w0-b001-a1-i0001';
  if (source.includes('W2F-')) return 'W2F-001';
  if (source.includes('[0-9a-f]{64}')) return '0'.repeat(64);
  if (source.includes('a-z0-9')) return 'example-slug';
  return 'example';
}

export function topicSchemaNumberExample(schema) {
  const minimum = (schema._def.checks || []).find((check) => check.kind === 'min')?.value;
  return Number.isFinite(minimum) ? Math.max(minimum, 0) : 1;
}

export function isFormActionPath(pathParts) {
  return (pathParts.length === 1 && pathParts[0] === 'action')
    || (pathParts.length === 3 && pathParts[0] === 'actions' && pathParts[1] === 0 && pathParts[2] === 'action');
}

export function topicSchemaUnionOption(schema, state, pathParts) {
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

export function topicSchemaExample(schema, state, pathParts = []) {
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

export function topicSchemaProjectionTemplateForWave(template, wave) {
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

export function parseableTopicSchemaTemplate(branch, context, action, state = {}) {
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

export function topicSchemaValueShape(schema) {
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

export function collectTopicSchemaFields(schema, state, fields, pathParts = [], required = true) {
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

export function topicSchemaForm(branch, context, action, index) {
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

export function validationPath(pathParts) {
  if (!Array.isArray(pathParts) || pathParts.length === 0) return 'input';
  return pathParts.reduce((result, part) => {
    if (typeof part === 'number') return `${result}[${part}]`;
    return result ? `${result}.${part}` : String(part);
  }, '');
}

export function expandTopicValidationIssueCandidates(issues) {
  const nestedUnionIndex = issues.findIndex((issue) => issue?.code === 'invalid_union' && Array.isArray(issue.unionErrors));
  if (nestedUnionIndex === -1) return [issues];
  const nestedUnion = issues[nestedUnionIndex];
  const siblingIssues = issues.toSpliced(nestedUnionIndex, 1);
  return nestedUnion.unionErrors.flatMap((error) => expandTopicValidationIssueCandidates([
    ...siblingIssues,
    ...(error?.issues || []),
  ]));
}

export function selectTopicValidationIssues(issues) {
  const candidates = expandTopicValidationIssueCandidates(issues);
  const score = (candidate) => candidate.reduce((total, issue) => {
    const path = validationPath(issue?.path);
    if (path === 'context' && ['invalid_literal', 'invalid_enum_value'].includes(issue?.code)) return total + 100;
    if (issue?.code === 'unrecognized_keys') return total + 10;
    return total + 1;
  }, 0);
  return candidates.sort((left, right) => score(left) - score(right))[0] || [];
}

export function validationJsonPointer(pathParts) {
  if (!Array.isArray(pathParts) || pathParts.length === 0) return '';
  return `/${pathParts.map((part) => String(part).replaceAll('~', '~0').replaceAll('/', '~1')).join('/')}`;
}

export function isProjectionSourceIdentityKindIssue(issue) {
  const path = issue?.path;
  return issue?.code === 'invalid_union_discriminator'
    && Array.isArray(issue?.options)
    && path?.at(-1) === 'kind'
    && path?.at(-2) === 'source_identity';
}

export function safeValidationMessage(issue) {
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
