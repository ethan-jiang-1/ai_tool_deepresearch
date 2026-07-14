// @impl GSK-001, GSK-011
import { readFileSync } from 'node:fs';
import { z } from 'zod';

export const GATE_BLOCKING_BASES = Object.freeze([
  'invocation_contract',
  'configuration_integrity',
  'authority_integrity',
  'binding_integrity',
  'required_structure',
  'required_floor',
  'recorded_human_decision',
]);

export const GATE_REPAIR_KINDS = Object.freeze([
  'agent_action',
  'engine_operation',
  'user_decision',
  'external_action',
  'missing_contract',
]);

export const GATE_COORDINATE_PLACEHOLDERS = Object.freeze([
  '{bundle}',
  '{topic}',
  '<slug>',
]);

export const GateBlockingBasisSchema = z.enum(GATE_BLOCKING_BASES);
export const GateRepairKindSchema = z.enum(GATE_REPAIR_KINDS);

const NonEmptyStringSchema = z.string().trim().min(1);
const NonEmptyDescriptorObjectSchema = z.record(z.string(), z.unknown()).refine(
  (value) => Object.keys(value).length > 0,
  { message: 'checked-authority descriptor object must not be empty' },
);
const DescriptorEntrySchema = z.union([NonEmptyStringSchema, NonEmptyDescriptorObjectSchema]);

const DefinitionFindingSchema = z.object({
  source: z.literal('definition'),
  blocking_basis: GateBlockingBasisSchema,
}).strict();

const CheckerFindingSchema = z.object({
  source: z.literal('checker'),
}).strict();

export const GateFindingSourceSchema = z.discriminatedUnion('source', [
  DefinitionFindingSchema,
  CheckerFindingSchema,
]);

export const GateDefinitionRepairSchema = z.object({
  kind: GateRepairKindSchema,
  write_to: NonEmptyStringSchema,
}).strict();

const GateDefinitionRuleBaseSchema = z.object({
  id: NonEmptyStringSchema,
  check: NonEmptyStringSchema,
  failure_message: NonEmptyStringSchema,
  target: NonEmptyStringSchema.optional(),
  targets: z.array(DescriptorEntrySchema).min(1).optional(),
  fields: z.array(DescriptorEntrySchema).min(1).optional(),
  sources: z.array(DescriptorEntrySchema).min(1).optional(),
  finding: GateFindingSourceSchema,
  repair: GateDefinitionRepairSchema.optional(),
}).passthrough();

const DESCRIPTOR_KEYS = ['target', 'targets', 'fields', 'sources'];
const REGISTERED_PLACEHOLDERS = new Set(GATE_COORDINATE_PLACEHOLDERS);
const PLACEHOLDER_PATTERN = /\{[A-Za-z][A-Za-z0-9_-]*\}|<[A-Za-z][A-Za-z0-9_-]*>|\$[A-Za-z][A-Za-z0-9_]*/g;
const GLOB_PATTERN = /[*?\[\]]/;

function collectDescriptorStrings(value, strings = []) {
  if (typeof value === 'string') {
    strings.push(value);
    return strings;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectDescriptorStrings(item, strings);
    return strings;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectDescriptorStrings(item, strings);
  }
  return strings;
}

function validateRegisteredPlaceholders(value, ctx, path) {
  const tokens = value.match(PLACEHOLDER_PATTERN) || [];
  for (const token of tokens) {
    if (token === '$checked_target' || REGISTERED_PLACEHOLDERS.has(token)) continue;
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path,
      message: `unregistered Gate coordinate placeholder: ${token}`,
    });
  }
}

export const GateDefinitionRuleSchema = GateDefinitionRuleBaseSchema.superRefine((rule, ctx) => {
  const descriptors = DESCRIPTOR_KEYS.filter((key) => rule[key] !== undefined);
  if (descriptors.length !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['target'],
      message: 'Gate rule must declare exactly one checked-authority descriptor: target, targets, fields, or sources',
    });
  }

  for (const key of descriptors) {
    for (const value of collectDescriptorStrings(rule[key])) {
      validateRegisteredPlaceholders(value, ctx, [key]);
    }
  }

  if (rule.finding.source === 'checker') {
    if (rule.repair !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['repair'],
        message: 'checker-owned Gate rules must not duplicate a definition-level repair contract',
      });
    }
    return;
  }

  if (!rule.repair) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['repair'],
      message: 'definition-owned Gate rules require repair.kind and repair.write_to',
    });
    return;
  }

  validateRegisteredPlaceholders(rule.repair.write_to, ctx, ['repair', 'write_to']);

  if (!rule.repair.write_to.includes('$checked_target')) return;

  if (rule.repair.write_to !== '$checked_target') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['repair', 'write_to'],
      message: '$checked_target must be the complete repair.write_to value',
    });
  }
  if (rule.repair.kind !== 'agent_action') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['repair', 'kind'],
      message: '$checked_target is valid only for repair.kind agent_action',
    });
  }
  if (descriptors.length !== 1 || descriptors[0] !== 'target' || !rule.target) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['repair', 'write_to'],
      message: '$checked_target requires one singular target descriptor',
    });
  } else if (GLOB_PATTERN.test(rule.target)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['repair', 'write_to'],
      message: '$checked_target cannot authorize a glob or pattern target',
    });
  }
});

export const GateDefinitionSchema = z.object({
  gate: NonEmptyStringSchema,
  description: NonEmptyStringSchema,
  rules: z.array(GateDefinitionRuleSchema).min(1),
}).passthrough().superRefine((definition, ctx) => {
  const seen = new Set();
  definition.rules.forEach((rule, index) => {
    if (seen.has(rule.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rules', index, 'id'],
        message: `duplicate Gate rule id: ${rule.id}`,
      });
    }
    seen.add(rule.id);
  });
});

export function parseGateDefinition(value) {
  return GateDefinitionSchema.parse(value);
}

export function safeParseGateDefinition(value) {
  return GateDefinitionSchema.safeParse(value);
}

export function parseGateDefinitionBytes(rawBytes, { sourcePath = null } = {}) {
  const text = Buffer.isBuffer(rawBytes) ? rawBytes.toString('utf8') : String(rawBytes);
  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    const prefix = sourcePath ? `${sourcePath}: ` : '';
    throw new SyntaxError(`${prefix}invalid Gate-definition JSON: ${error.message}`, { cause: error });
  }
  return parseGateDefinition(value);
}

export function readGateDefinitionSnapshot(filePath) {
  const rawBytes = readFileSync(filePath);
  const definition = parseGateDefinitionBytes(rawBytes, { sourcePath: String(filePath) });
  return { rawBytes, definition };
}
