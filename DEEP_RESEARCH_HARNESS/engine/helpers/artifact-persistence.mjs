// @impl ARP-001, ARP-002, ARP-003

// Navigation: public API — ARTIFACT_PERSISTENCE_SCHEMA_VERSION, ARTIFACT_PERSISTENCE_ROOT, ARTIFACT_PERSISTENCE_OPERATIONS, ARTIFACT_PERSISTENCE_VERDICTS, ARTIFACT_PERSISTENCE_SUPPORTED_ROOTS, ARTIFACT_PERSISTENCE_EXCLUDED_SURFACES, isSafeArtifactTarget, ArtifactPersistenceOperationSchema, FinalReportPublishResultSchema, ArtifactPersistResultSchema, FinalReportPersistResultSchema, ArtifactSweepEntrySchema, ArtifactSweepSummarySchema, ArtifactPersistenceConfigError, …
import {
  closeSync,
  constants,
  copyFileSync,
  existsSync,
  fsyncSync,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { z } from 'zod';
import {
  evaluateFinalDeliveryBacking,
  FinalDeliveryBackingAdviceSchema,
  FinalDeliveryBackingCheckSchema,
  FinalDeliveryBackingEvaluationSchema,
  FinalDeliveryBackingInspectSchema,
  FINAL_AUXILIARY_FILE_PATTERN,
  isFinalMarkdownTarget,
} from './final-delivery-backing.mjs';
import {
  allocateFinalReportTarget,
  FinalReportFeatureSchema,
  readFinalReportSeries,
} from './final-report-series.mjs';

export const ARTIFACT_PERSISTENCE_SCHEMA_VERSION = '1.0.0';
export const ARTIFACT_PERSISTENCE_ROOT = '_diagnostics/artifact-persistence';
export const ARTIFACT_PERSISTENCE_OPERATIONS = Object.freeze(['persist', 'persist-final-report', 'publish-final-report', 'sweep']);
export const ARTIFACT_PERSISTENCE_VERDICTS = Object.freeze(['committed', 'finalized', 'cleaned', 'blocked']);
export const ARTIFACT_PERSISTENCE_SUPPORTED_ROOTS = Object.freeze(['reference', 'artifacts', 'final', '_cache']);
export const ARTIFACT_PERSISTENCE_EXCLUDED_SURFACES = Object.freeze([
  'rb_status.json',
  'rb_queue.json',
  'rb_trace.jsonl',
  'rb_output_declarations.jsonl',
  'rb_profile.yaml',
  'rb_plan.md',
  '_checkpoints',
  '_work_units',
]);

const DigestSchema = z.string().regex(/^[a-f0-9]{64}$/);
const OperationIdSchema = z.string().uuid();
const ExpectedTargetSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('absent') }).strict(),
  z.object({ kind: z.literal('sha256'), value: DigestSchema }).strict(),
]);

function normalizeBundleRelative(value) {
  return String(value || '').replaceAll('\\', '/');
}

export function isSafeArtifactTarget(value) {
  const normalized = normalizeBundleRelative(value);
  if (!normalized || normalized !== value || normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized)) return false;
  const segments = normalized.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) return false;
  return ARTIFACT_PERSISTENCE_SUPPORTED_ROOTS.includes(segments[0]) && segments.length > 1;
}

const TargetSchema = z.string().refine(isSafeArtifactTarget, 'target must be a supported safe bundle-relative content path');

const OperationBaseSchema = z.object({
  schema_version: z.literal(ARTIFACT_PERSISTENCE_SCHEMA_VERSION),
  operation_id: OperationIdSchema,
  source_path: z.string().min(1),
  target: TargetSchema,
  expected_target: ExpectedTargetSchema,
  created_at: z.string().datetime(),
});

const PreparingOperationSchema = OperationBaseSchema.extend({
  state: z.literal('preparing'),
}).strict();

const PreparedOperationSchema = OperationBaseSchema.extend({
  state: z.literal('prepared'),
  payload_size: z.number().int().nonnegative(),
  payload_sha256: DigestSchema,
}).strict();

const PrimaryPublicationBindingSchema = z.object({
  inventory_sha256: DigestSchema,
  base_classification: z.enum(['empty', 'modern', 'legacy']),
  target: TargetSchema,
  version: z.number().int().nonnegative(),
  feature: FinalReportFeatureSchema.nullable(),
  previous_target: TargetSchema.nullable(),
  staging_sha256: DigestSchema.nullable(),
  backing: FinalDeliveryBackingEvaluationSchema,
}).strict().superRefine((value, context) => {
  if (!value.backing.check.passed || value.backing.check.target !== value.target) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['backing'], message: 'primary publication requires passing backing for its allocated target' });
  }
  if (value.base_classification === 'empty') {
    if (value.target !== 'final/final.md' || value.version !== 0 || value.feature !== null || value.previous_target !== null) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['base_classification'], message: 'empty primary inventory must allocate only the modern version-zero base' });
    }
  }
  if (value.base_classification !== 'empty' && (value.version < 1 || value.previous_target === null)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['version'], message: 'existing primary inventory must append after one prior latest target' });
  }
  const expectedTarget = value.version === 0
    ? 'final/final.md'
    : value.feature === null
      ? `final/final_v${value.version}.md`
      : `final/final_${value.feature}_v${value.version}.md`;
  if (value.target !== expectedTarget) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['target'], message: 'primary publication target must exactly match the bound version and optional feature' });
  }
});

const PrimaryPreparingOperationSchema = OperationBaseSchema.extend({
  state: z.literal('preparing'),
  workspace_kind: z.literal('primary_publication'),
  expected_target: z.object({ kind: z.literal('absent') }).strict(),
  publication: PrimaryPublicationBindingSchema.refine((value) => value.staging_sha256 === null, 'preparing publication cannot bind a payload digest'),
}).strict();

const PrimaryPreparedOperationSchema = OperationBaseSchema.extend({
  state: z.literal('prepared'),
  workspace_kind: z.literal('primary_publication'),
  expected_target: z.object({ kind: z.literal('absent') }).strict(),
  payload_size: z.number().int().nonnegative(),
  payload_sha256: DigestSchema,
  publication: PrimaryPublicationBindingSchema.refine((value) => value.staging_sha256 !== null, 'prepared publication requires a payload digest'),
}).strict().superRefine((value, context) => {
  if (value.publication.target !== value.target) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['publication', 'target'], message: 'primary publication binding target must match the workspace target' });
  }
  if (value.publication.staging_sha256 !== value.payload_sha256) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['publication', 'staging_sha256'], message: 'publication staging digest must bind the prepared payload bytes' });
  }
});

export const ArtifactPersistenceOperationSchema = z.union([
  PreparingOperationSchema,
  PreparedOperationSchema,
  PrimaryPreparingOperationSchema,
  PrimaryPreparedOperationSchema,
]);

export const FinalReportPublishResultSchema = z.object({
  schema_version: z.literal(ARTIFACT_PERSISTENCE_SCHEMA_VERSION),
  operation: z.literal('publish-final-report'),
  check: FinalDeliveryBackingCheckSchema.nullable(),
  inspect: z.array(FinalDeliveryBackingInspectSchema),
  advice: z.array(FinalDeliveryBackingAdviceSchema),
  operation_id: OperationIdSchema.nullable(),
  target: TargetSchema.nullable(),
  base_classification: z.enum(['empty', 'modern', 'legacy', 'invalid']),
  version: z.number().int().nonnegative().nullable(),
  feature: FinalReportFeatureSchema.nullable(),
  previous_target: TargetSchema.nullable(),
  inventory_sha256: DigestSchema.nullable(),
  verdict: z.enum(['committed', 'blocked']),
  reason_code: z.string().min(1),
  reason: z.string().min(1),
  workspace: z.string().nullable(),
}).strict().superRefine((value, context) => {
  if (value.check === null && (value.inspect.length !== 0 || value.advice.length !== 0)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['inspect'], message: 'unattempted backing admission cannot emit backing repair facts' });
  }
  if (value.check && value.target !== value.check.target) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['check', 'target'], message: 'backing target must match the allocated publication target' });
  }
  if (value.verdict === 'committed' && (!value.check?.passed || value.operation_id === null || value.target === null || value.version === null || value.inventory_sha256 === null || value.workspace !== null || value.reason_code !== 'committed')) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['verdict'], message: 'committed primary publication requires one complete passed allocation fact' });
  }
});

const PublishFinalReportRequestSchema = z.object({
  bundlePath: z.string().min(1),
  sourcePath: z.string().min(1),
  feature: FinalReportFeatureSchema.nullable().optional(),
  polish: z.boolean().optional().default(false),
  hooks: z.unknown().nullable().optional(),
  operationId: OperationIdSchema.optional(),
}).strict();

const RetireFinalVersionRequestSchema = z.object({
  bundlePath: z.string().min(1),
  version: z.number().int().positive(),
  feature: FinalReportFeatureSchema.nullable().optional(),
  reason: z.string().nullable().optional(),
  requestedBy: z.literal('user').optional(),
  // The user's verbatim retirement request; the mechanical carrier of the
  // human-controlled boundary. Required and non-empty.
  userConfirmation: z.string().min(1),
}).strict();

export const RetireFinalVersionResultSchema = z.object({
  schema_version: z.literal(ARTIFACT_PERSISTENCE_SCHEMA_VERSION),
  operation: z.literal('retire-final-version'),
  target: TargetSchema.nullable(),
  version: z.number().int().positive(),
  feature: FinalReportFeatureSchema.nullable(),
  latest_target: TargetSchema.nullable(),
  verdict: z.enum(['committed', 'blocked']),
  reason_code: z.string().min(1),
  reason: z.string().min(1),
  workspace: z.string().nullable(),
}).strict();

export const ArtifactPersistResultSchema = z.object({
  schema_version: z.literal(ARTIFACT_PERSISTENCE_SCHEMA_VERSION),
  operation: z.literal('persist'),
  operation_id: OperationIdSchema.nullable(),
  target: TargetSchema.nullable(),
  verdict: z.enum(['committed', 'blocked']),
  reason_code: z.string().min(1),
  reason: z.string().min(1),
  workspace: z.string().nullable(),
}).strict().superRefine((value, context) => {
  if (value.verdict === 'committed') {
    if (value.operation_id === null) context.addIssue({ code: z.ZodIssueCode.custom, path: ['operation_id'], message: 'committed requires operation_id' });
    if (value.target === null) context.addIssue({ code: z.ZodIssueCode.custom, path: ['target'], message: 'committed requires target' });
    if (value.reason_code !== 'committed') context.addIssue({ code: z.ZodIssueCode.custom, path: ['reason_code'], message: 'committed verdict requires committed reason_code' });
    if (value.workspace !== null) context.addIssue({ code: z.ZodIssueCode.custom, path: ['workspace'], message: 'committed cannot retain workspace' });
  }
});

export const FinalReportPersistResultSchema = z.object({
  schema_version: z.literal(ARTIFACT_PERSISTENCE_SCHEMA_VERSION),
  operation: z.literal('persist-final-report'),
  check: FinalDeliveryBackingCheckSchema,
  inspect: z.array(FinalDeliveryBackingInspectSchema),
  advice: z.array(FinalDeliveryBackingAdviceSchema),
  operation_id: OperationIdSchema.nullable(),
  target: TargetSchema,
  verdict: z.enum(['committed', 'blocked']),
  reason_code: z.string().min(1),
  reason: z.string().min(1),
  workspace: z.string().nullable(),
}).strict().superRefine((value, context) => {
  if (value.check.target !== value.target) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['check', 'target'], message: 'Final-backing check target must match the persistence target' });
  }
  if (!value.check.passed) {
    if (value.verdict !== 'blocked') context.addIssue({ code: z.ZodIssueCode.custom, path: ['verdict'], message: 'failed backing admission requires a blocked verdict' });
    if (value.operation_id !== null) context.addIssue({ code: z.ZodIssueCode.custom, path: ['operation_id'], message: 'failed backing admission cannot create a persistence operation' });
    if (value.workspace !== null) context.addIssue({ code: z.ZodIssueCode.custom, path: ['workspace'], message: 'failed backing admission cannot create a workspace' });
  }
  if (value.verdict === 'committed') {
    if (!value.check.passed) context.addIssue({ code: z.ZodIssueCode.custom, path: ['check', 'passed'], message: 'committed Final report requires passing backing admission' });
    if (value.reason_code !== 'committed') context.addIssue({ code: z.ZodIssueCode.custom, path: ['reason_code'], message: 'committed verdict requires committed reason_code' });
    if (value.operation_id === null) context.addIssue({ code: z.ZodIssueCode.custom, path: ['operation_id'], message: 'committed verdict requires operation_id' });
    if (value.workspace !== null) context.addIssue({ code: z.ZodIssueCode.custom, path: ['workspace'], message: 'committed verdict cannot retain a workspace' });
  }
});

export const ArtifactSweepEntrySchema = z.object({
  operation_id: OperationIdSchema.nullable(),
  target: TargetSchema.nullable(),
  source_path: z.string().nullable(),
  verdict: z.enum(['finalized', 'cleaned', 'blocked']),
  reason_code: z.string().min(1),
  reason: z.string().min(1),
  workspace: z.string().min(1),
  recommended_action: z.string().nullable(),
}).strict().superRefine((value, context) => {
  if (value.verdict === 'blocked' && value.recommended_action === null) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['recommended_action'], message: 'blocked requires one recommended action' });
  }
  if (value.verdict !== 'blocked') {
    if (value.operation_id === null) context.addIssue({ code: z.ZodIssueCode.custom, path: ['operation_id'], message: `${value.verdict} requires operation_id` });
    if (value.target === null) context.addIssue({ code: z.ZodIssueCode.custom, path: ['target'], message: `${value.verdict} requires target` });
    if (value.source_path === null) context.addIssue({ code: z.ZodIssueCode.custom, path: ['source_path'], message: `${value.verdict} requires source_path` });
    if (value.recommended_action !== null) context.addIssue({ code: z.ZodIssueCode.custom, path: ['recommended_action'], message: `${value.verdict} cannot recommend repair` });
  }
  if (value.verdict === 'finalized' && value.reason_code !== 'finalized') {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['reason_code'], message: 'finalized verdict requires finalized reason_code' });
  }
  if (value.verdict === 'cleaned' && value.reason_code !== 'already_committed') {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['reason_code'], message: 'cleaned verdict requires already_committed reason_code' });
  }
});

export const ArtifactSweepSummarySchema = z.object({
  schema_version: z.literal(ARTIFACT_PERSISTENCE_SCHEMA_VERSION),
  operation: z.literal('sweep'),
  quiescent_required: z.literal(true),
  passed: z.boolean(),
  blocked_count: z.number().int().nonnegative(),
  entries: z.array(ArtifactSweepEntrySchema),
}).strict().superRefine((value, context) => {
  const blockedCount = value.entries.filter((entry) => entry.verdict === 'blocked').length;
  if (blockedCount !== value.blocked_count) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['blocked_count'], message: 'blocked_count must match blocked entries' });
  }
  if (value.passed !== (blockedCount === 0)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['passed'], message: 'passed must be true exactly when blocked_count is zero' });
  }
});

export class ArtifactPersistenceConfigError extends Error {
  constructor(message, code = 'invalid_configuration') {
    super(message);
    this.name = 'ArtifactPersistenceConfigError';
    this.code = code;
  }
}

export class ArtifactPersistenceCrashError extends Error {
  constructor(boundary) {
    super(`simulated crash at ${boundary}`);
    this.name = 'ArtifactPersistenceCrashError';
    this.boundary = boundary;
    this.preserveArtifactPersistenceState = true;
  }
}

function fsyncPath(filePath) {
  const descriptor = openSync(filePath, constants.O_RDONLY);
  try {
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

function writeJsonDurable(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
  fsyncPath(filePath);
}

function hashFile(filePath) {
  const descriptor = openSync(filePath, constants.O_RDONLY);
  const hash = createHash('sha256');
  const buffer = Buffer.allocUnsafe(64 * 1024);
  let size = 0;
  try {
    while (true) {
      const bytesRead = readSync(descriptor, buffer, 0, buffer.length, null);
      if (bytesRead === 0) break;
      hash.update(buffer.subarray(0, bytesRead));
      size += bytesRead;
    }
  } finally {
    closeSync(descriptor);
  }
  return { size, sha256: hash.digest('hex') };
}

function isInside(candidatePath, rootPath) {
  const relative = path.relative(rootPath, candidatePath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function assertRealDirectoryChain(bundleReal, directoryPath) {
  const relative = path.relative(bundleReal, directoryPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new ArtifactPersistenceConfigError('target parent escapes selected bundle', 'target_parent_escape');
  }
  let currentPath = bundleReal;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    currentPath = path.join(currentPath, segment);
    if (!existsSync(currentPath)) {
      throw new ArtifactPersistenceConfigError(`target parent does not exist: ${currentPath}`, 'target_parent_missing');
    }
    const info = lstatSync(currentPath);
    if (info.isSymbolicLink() || !info.isDirectory()) {
      throw new ArtifactPersistenceConfigError(`target parent is not a real directory: ${currentPath}`, 'target_parent_unsafe');
    }
  }
}

function resolveBundle(bundlePath) {
  const absolute = path.resolve(bundlePath);
  if (!existsSync(absolute) || !lstatSync(absolute).isDirectory() || lstatSync(absolute).isSymbolicLink()) {
    throw new ArtifactPersistenceConfigError(`bundle is not a real directory: ${bundlePath}`, 'bundle_invalid');
  }
  return realpathSync(absolute);
}

function resolveTarget(bundleReal, target) {
  if (!isSafeArtifactTarget(target)) {
    throw new ArtifactPersistenceConfigError(`unsupported or unsafe target: ${target}`, 'target_invalid');
  }
  const targetPath = path.resolve(bundleReal, ...target.split('/'));
  if (!isInside(targetPath, bundleReal)) {
    throw new ArtifactPersistenceConfigError(`target escapes selected bundle: ${target}`, 'target_escape');
  }
  const parentPath = path.dirname(targetPath);
  assertRealDirectoryChain(bundleReal, parentPath);
  if (existsSync(targetPath)) {
    const info = lstatSync(targetPath);
    if (info.isSymbolicLink() || !info.isFile()) {
      throw new ArtifactPersistenceConfigError(`target is not a regular file: ${target}`, 'target_unsafe');
    }
  }
  return { targetPath, parentPath };
}

function resolveSource(sourcePath, targetPath, persistenceRoot) {
  const absolute = path.resolve(sourcePath);
  if (!existsSync(absolute)) throw new ArtifactPersistenceConfigError(`staging source does not exist: ${sourcePath}`, 'source_missing');
  const info = lstatSync(absolute);
  if (info.isSymbolicLink() || !info.isFile()) {
    throw new ArtifactPersistenceConfigError(`staging source is not a non-symlink regular file: ${sourcePath}`, 'source_invalid');
  }
  const sourceReal = realpathSync(absolute);
  if (sourceReal === targetPath || isInside(sourceReal, persistenceRoot)) {
    throw new ArtifactPersistenceConfigError('staging source aliases target or persistence workspace', 'source_alias');
  }
  return sourceReal;
}

/** Validate a persistence request without creating a workspace or mutating a target. */
export function inspectArtifactPersistenceRequest({ bundlePath, sourcePath, target, expectedTarget } = {}) {
  const parsedExpectedTarget = ExpectedTargetSchema.parse(expectedTarget);
  const bundleReal = resolveBundle(bundlePath);
  const targetResolved = resolveTarget(bundleReal, target);
  const persistenceRoot = path.join(bundleReal, ...ARTIFACT_PERSISTENCE_ROOT.split('/'));
  const sourceReal = resolveSource(sourcePath, targetResolved.targetPath, persistenceRoot);
  return {
    bundle_real: bundleReal,
    source_path: sourceReal,
    target,
    expected_target: parsedExpectedTarget,
  };
}

function ensurePersistenceRoot(bundleReal) {
  const diagnosticsPath = path.join(bundleReal, '_diagnostics');
  if (!existsSync(diagnosticsPath)) {
    mkdirSync(diagnosticsPath);
    fsyncPath(bundleReal);
  }
  const diagnosticsInfo = lstatSync(diagnosticsPath);
  if (diagnosticsInfo.isSymbolicLink() || !diagnosticsInfo.isDirectory()) {
    throw new ArtifactPersistenceConfigError('_diagnostics is not a real directory', 'diagnostics_unsafe');
  }
  const persistenceRoot = path.join(diagnosticsPath, 'artifact-persistence');
  if (!existsSync(persistenceRoot)) {
    mkdirSync(persistenceRoot);
    fsyncPath(diagnosticsPath);
  }
  const rootInfo = lstatSync(persistenceRoot);
  if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) {
    throw new ArtifactPersistenceConfigError('artifact persistence root is not a real directory', 'persistence_root_unsafe');
  }
  return persistenceRoot;
}

function readTargetDigest(targetPath) {
  if (!existsSync(targetPath)) return { exists: false, sha256: null };
  const info = lstatSync(targetPath);
  if (info.isSymbolicLink() || !info.isFile()) {
    throw new ArtifactPersistenceConfigError(`target is not a regular file: ${targetPath}`, 'target_unsafe');
  }
  return { exists: true, sha256: hashFile(targetPath).sha256 };
}

function expectedTargetMatches(expectedTarget, targetFact) {
  return expectedTarget.kind === 'absent'
    ? !targetFact.exists
    : targetFact.exists && targetFact.sha256 === expectedTarget.value;
}

function safeRemoveWorkspace(workspacePath, persistenceRoot) {
  const resolvedWorkspace = path.resolve(workspacePath);
  if (path.dirname(resolvedWorkspace) !== persistenceRoot || !existsSync(resolvedWorkspace)) return;
  const info = lstatSync(resolvedWorkspace);
  if (info.isSymbolicLink() || !info.isDirectory()) {
    throw new ArtifactPersistenceConfigError(`workspace is unsafe: ${workspacePath}`, 'workspace_unsafe');
  }
  rmSync(resolvedWorkspace, { recursive: true });
  fsyncPath(persistenceRoot);
}

function blockedPersist({ operationId = null, target = null, reasonCode, reason, workspace = null }) {
  return ArtifactPersistResultSchema.parse({
    schema_version: ARTIFACT_PERSISTENCE_SCHEMA_VERSION,
    operation: 'persist',
    operation_id: operationId,
    target,
    verdict: 'blocked',
    reason_code: reasonCode,
    reason,
    workspace,
  });
}

function relativeWorkspace(bundleReal, workspacePath) {
  return normalizeBundleRelative(path.relative(bundleReal, workspacePath));
}

function invokeHook(hooks, name, detail) {
  if (typeof hooks?.[name] === 'function') hooks[name](detail);
}

function primaryInventorySha256(series) {
  const canonical = {
    classification: series.classification,
    primary_entries: series.primary_entries.map(({ target, version, feature }) => ({ target, version, feature })),
  };
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

export function isReservedPrimaryTarget(target) {
  return isSafeArtifactTarget(target) && /^final\/final[^/]*\.md$/i.test(target);
}

const PrimaryTargetRedirectSchema = z.object({
  schema_version: z.literal(ARTIFACT_PERSISTENCE_SCHEMA_VERSION),
  operation: z.enum(['persist', 'persist-final-report']),
  target: TargetSchema,
  verdict: z.literal('blocked'),
  reason_code: z.literal('primary_target_requires_publication'),
  reason: z.string().min(1),
  recommended_operation: z.literal('publish-final-report'),
}).strict();

export function redirectPrimaryTargetPersist({ operation, target } = {}) {
  return PrimaryTargetRedirectSchema.parse({
    schema_version: ARTIFACT_PERSISTENCE_SCHEMA_VERSION,
    operation,
    target,
    verdict: 'blocked',
    reason_code: 'primary_target_requires_publication',
    reason: 'The direct-root primary Final namespace is allocated and written only by publish-final-report.',
    recommended_operation: 'publish-final-report',
  });
}

function selectedLegacyTarget(bundleReal) {
  const series = readFinalReportSeries(bundleReal);
  return series.valid && series.classification === 'legacy' ? series.base.target : null;
}

function assertCallerTargetIsNotPrimary(bundleReal, target) {
  if (isReservedPrimaryTarget(target)) {
    throw new ArtifactPersistenceConfigError('canonical primary Final targets require publish-final-report', 'primary_target_reserved');
  }
  const legacyTarget = selectedLegacyTarget(bundleReal);
  if (legacyTarget === target) {
    throw new ArtifactPersistenceConfigError('the inventory-selected legacy primary report is immutable; use publish-final-report to append a revision', 'legacy_primary_immutable');
  }
}

function publicationResult({
  admission = null,
  allocation = null,
  inventorySha256 = null,
  operationId = null,
  verdict = 'blocked',
  reasonCode,
  reason,
  workspace = null,
} = {}) {
  return FinalReportPublishResultSchema.parse({
    schema_version: ARTIFACT_PERSISTENCE_SCHEMA_VERSION,
    operation: 'publish-final-report',
    check: admission?.check || null,
    inspect: admission?.inspect || [],
    advice: admission?.advice || [],
    operation_id: operationId,
    target: allocation?.target || null,
    base_classification: allocation?.classification || 'invalid',
    version: allocation?.version ?? null,
    feature: allocation?.feature || null,
    previous_target: allocation?.previous_target || null,
    inventory_sha256: inventorySha256,
    verdict,
    reason_code: reasonCode,
    reason,
    workspace,
  });
}

function ensureNoPendingArtifactWorkspace(bundleReal) {
  const persistenceRoot = path.join(bundleReal, ...ARTIFACT_PERSISTENCE_ROOT.split('/'));
  if (!existsSync(persistenceRoot)) return;
  const info = lstatSync(persistenceRoot);
  if (info.isSymbolicLink() || !info.isDirectory()) {
    throw new ArtifactPersistenceConfigError('artifact persistence root is not a real directory', 'persistence_root_unsafe');
  }
  const entries = readdirSync(persistenceRoot);
  if (entries.length > 0) {
    throw new ArtifactPersistenceConfigError('a pending artifact persistence workspace owns recovery; run sweep before publishing', 'artifact_persistence_owner');
  }
}

function commitPrimaryPayload(payloadPath, targetPath, parentPath) {
  try {
    linkSync(payloadPath, targetPath);
    fsyncPath(parentPath);
    return { committed: true };
  } catch (error) {
    if (error?.code === 'EEXIST') return { committed: false, code: 'target_collision_retry', reason: 'The allocated primary target appeared during publication; rerun the same publish-final-report command to allocate from the current inventory.' };
    if (['EXDEV', 'EPERM', 'EOPNOTSUPP', 'ENOTSUP'].includes(error?.code)) {
      return { committed: false, code: 'no_clobber_unsupported', reason: `The filesystem cannot provide same-device no-clobber hard-link publication: ${error.message}` };
    }
    throw error;
  }
}

export function persistBundleFile({
  bundlePath,
  sourcePath,
  target,
  expectedTarget,
  hooks = null,
  operationId = randomUUID(),
} = {}) {
  const parsedExpectedTarget = ExpectedTargetSchema.parse(expectedTarget);
  const parsedOperationId = OperationIdSchema.parse(operationId);
  const bundleReal = resolveBundle(bundlePath);
  const { targetPath, parentPath } = resolveTarget(bundleReal, target);
  if (target.startsWith('final/')) assertCallerTargetIsNotPrimary(bundleReal, target);
  const initialTargetFact = readTargetDigest(targetPath);
  if (!expectedTargetMatches(parsedExpectedTarget, initialTargetFact)) {
    return blockedPersist({
      target,
      reasonCode: 'initial_target_mismatch',
      reason: 'Current target does not satisfy the requested compare-and-swap precondition.',
    });
  }

  const persistenceRoot = ensurePersistenceRoot(bundleReal);
  const sourceReal = resolveSource(sourcePath, targetPath, persistenceRoot);
  if (statSync(persistenceRoot).dev !== statSync(parentPath).dev) {
    throw new ArtifactPersistenceConfigError('persistence workspace and target parent are on different filesystem devices', 'cross_device_target');
  }

  const workspacePath = path.join(persistenceRoot, parsedOperationId);
  mkdirSync(workspacePath, { recursive: false, mode: 0o700 });
  fsyncPath(persistenceRoot);
  const workspaceRef = relativeWorkspace(bundleReal, workspacePath);
  const operationPath = path.join(workspacePath, 'operation.json');
  const nextOperationPath = path.join(workspacePath, 'operation.json.next');
  const payloadPath = path.join(workspacePath, 'payload');
  let accepted = false;

  try {
    const baseOperation = {
      schema_version: ARTIFACT_PERSISTENCE_SCHEMA_VERSION,
      operation_id: parsedOperationId,
      source_path: sourceReal,
      target,
      expected_target: parsedExpectedTarget,
      created_at: new Date().toISOString(),
    };
    const preparing = PreparingOperationSchema.parse({ ...baseOperation, state: 'preparing' });
    invokeHook(hooks, 'beforePreparingPublished', { workspacePath, operation: preparing });
    writeJsonDurable(nextOperationPath, preparing);
    renameSync(nextOperationPath, operationPath);
    fsyncPath(workspacePath);
    accepted = true;
    invokeHook(hooks, 'afterPreparingPublished', { workspacePath, operation: preparing });

    copyFileSync(sourceReal, payloadPath, constants.COPYFILE_EXCL);
    fsyncPath(payloadPath);
    const payloadFact = hashFile(payloadPath);
    invokeHook(hooks, 'afterPayloadFsync', { workspacePath, payloadFact });

    const prepared = PreparedOperationSchema.parse({
      ...baseOperation,
      state: 'prepared',
      payload_size: payloadFact.size,
      payload_sha256: payloadFact.sha256,
    });
    writeJsonDurable(nextOperationPath, prepared);
    renameSync(nextOperationPath, operationPath);
    fsyncPath(workspacePath);
    invokeHook(hooks, 'afterPreparedPublished', { workspacePath, operation: prepared });

    const recheckedTarget = resolveTarget(bundleReal, target);
    if (statSync(persistenceRoot).dev !== statSync(recheckedTarget.parentPath).dev) {
      throw new ArtifactPersistenceConfigError('target device changed before commit', 'target_device_drift');
    }
    const commitTargetFact = readTargetDigest(recheckedTarget.targetPath);
    if (!expectedTargetMatches(parsedExpectedTarget, commitTargetFact)) {
      try {
        safeRemoveWorkspace(workspacePath, persistenceRoot);
        return blockedPersist({
          operationId: parsedOperationId,
          target,
          reasonCode: 'late_target_mismatch',
          reason: 'Target changed after preparation; the operation workspace was removed without overwriting it.',
          workspace: null,
        });
      } catch (cleanupError) {
        return blockedPersist({
          operationId: parsedOperationId,
          target,
          reasonCode: 'late_target_mismatch_cleanup_failed',
          reason: `Target changed after preparation and workspace cleanup failed: ${cleanupError.message}`,
          workspace: workspaceRef,
        });
      }
    }

    renameSync(payloadPath, recheckedTarget.targetPath);
    fsyncPath(recheckedTarget.parentPath);
    invokeHook(hooks, 'afterTargetRename', { workspacePath, targetPath: recheckedTarget.targetPath });
    invokeHook(hooks, 'beforeWorkspaceCleanup', { workspacePath, targetPath: recheckedTarget.targetPath });
    safeRemoveWorkspace(workspacePath, persistenceRoot);
    invokeHook(hooks, 'afterWorkspaceCleanup', { workspacePath, targetPath: recheckedTarget.targetPath });

    return ArtifactPersistResultSchema.parse({
      schema_version: ARTIFACT_PERSISTENCE_SCHEMA_VERSION,
      operation: 'persist',
      operation_id: parsedOperationId,
      target,
      verdict: 'committed',
      reason_code: 'committed',
      reason: 'Payload committed atomically and the operation workspace was removed.',
      workspace: null,
    });
  } catch (error) {
    if (error?.preserveArtifactPersistenceState) {
      if (!accepted) {
        try { safeRemoveWorkspace(workspacePath, persistenceRoot); } catch { /* preserve simulated crash */ }
      }
      throw error;
    }
    if (!accepted) {
      try { safeRemoveWorkspace(workspacePath, persistenceRoot); } catch { /* preserve original error */ }
      throw error;
    }
    return blockedPersist({
      operationId: parsedOperationId,
      target,
      reasonCode: error.code || 'persist_interrupted',
      reason: error.message,
      workspace: existsSync(workspacePath) ? workspaceRef : null,
    });
  }
}

export function redirectFinalMarkdownPersist({ target } = {}) {
  return blockedPersist({
    target,
    reasonCode: 'final_markdown_requires_admission',
    reason: 'Final Markdown reports must use persist-final-report so Evidence Map backing is admitted before durability commit.',
  });
}

function finalReportPersistResult({ admission, target, persistence = null, selfContained = null }) {
  const durability = persistence || {
    operation_id: null,
    target,
    verdict: 'blocked',
    reason_code: selfContained?.inspect?.[0]?.code || admission.inspect[0]?.code || 'final_backing_rejected',
    reason: selfContained?.inspect?.[0]?.detail || admission.inspect[0]?.detail || 'Final Markdown backing admission failed.',
    workspace: null,
  };
  return FinalReportPersistResultSchema.parse({
    schema_version: ARTIFACT_PERSISTENCE_SCHEMA_VERSION,
    operation: 'persist-final-report',
    check: admission.check,
    inspect: admission.inspect,
    advice: admission.advice,
    operation_id: durability.operation_id,
    target: durability.target || target,
    verdict: durability.verdict,
    reason_code: durability.reason_code,
    reason: durability.reason,
    workspace: durability.workspace,
  });
}

/**
 * Admit a Final Markdown report before it reaches the existing atomic writer.
 * The preflight intentionally performs no persistence-root or target mutation.
 */
/**
 * Self-contained evidence-details admission: when the target is an auxiliary
 * evidence-details file (inside a version-bound auxiliary directory), every
 * external URL in the file MUST trace to a submitted reference frontmatter
 * source_url in the same bundle (no fabricated links). Non-auxiliary targets
 * pass trivially (their backing admission already governs).
 */
export function evaluateSelfContainedEvidenceDetails({ bundlePath, target, markdown } = {}) {
  const auxMatch = target.match(FINAL_AUXILIARY_FILE_PATTERN);
  if (!auxMatch) {
    return { check: { passed: true }, inspect: [], advice: [] };
  }
  const urlPattern = /https?:\/\/[^\s)\]>]+/g;
  const urls = [...markdown.matchAll(urlPattern)].map((match) => match[0].replace(/[),。;]+$/, ''));
  if (urls.length === 0) {
    return { check: { passed: true }, inspect: [], advice: [] };
  }
  const bundleReal = resolveBundle(bundlePath);
  const referenceDir = path.join(bundleReal, 'reference');
  const acceptedUrls = new Set();
  if (existsSync(referenceDir)) {
    const refInfo = lstatSync(referenceDir);
    if (!refInfo.isSymbolicLink() && refInfo.isDirectory()) {
      for (const name of readdirSync(referenceDir)) {
        if (!name.endsWith('.md')) continue;
        const refPath = path.join(referenceDir, name);
        const refStat = lstatSync(refPath);
        if (refStat.isSymbolicLink() || !refStat.isFile()) continue;
        const text = readFileSync(refPath, 'utf8');
        const fm = text.match(/^---\n([\s\S]*?)\n---/);
        if (!fm) continue;
        const urlMatch = fm[1].match(/source_url:\s*["']?([^"'\n]+)/);
        if (urlMatch) acceptedUrls.add(urlMatch[1].trim().replace(/["']$/, ''));
      }
    }
  }
  const normalized = (value) => value.split('?')[0].split('#')[0].replace(/\/+$/, '');
  const missing = urls.filter((url) => ![...acceptedUrls].some((accepted) => normalized(accepted) === normalized(url)));
  if (missing.length > 0) {
    return {
      check: { passed: false, target },
      inspect: [{
        code: 'evidence_details_url_unbacked',
        detail: `Evidence-details external URLs must trace to a submitted reference frontmatter source_url; unbacked: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''}`,
        repairSurface: 'retained_staging_report',
      }],
      advice: [],
    };
  }
  return { check: { passed: true, target }, inspect: [], advice: [] };
}

export function persistFinalReport({ bundlePath, sourcePath, target, expectedTarget } = {}) {
  const request = inspectArtifactPersistenceRequest({ bundlePath, sourcePath, target, expectedTarget });
  if (!isFinalMarkdownTarget(target)) {
    throw new ArtifactPersistenceConfigError('persist-final-report requires a safe Markdown target under final/', 'final_markdown_target_required');
  }
  assertCallerTargetIsNotPrimary(request.bundle_real, target);
  const markdown = readFileSync(request.source_path, 'utf8');
  const admission = evaluateFinalDeliveryBacking({
    bundlePath,
    target,
    markdown,
  });
  if (!admission.check.passed) return finalReportPersistResult({ admission, target });

  const selfContained = evaluateSelfContainedEvidenceDetails({
    bundlePath,
    target,
    markdown,
  });
  if (!selfContained.check.passed) return finalReportPersistResult({ admission, target, selfContained });

  const persisted = persistBundleFile({
    bundlePath: request.bundle_real,
    sourcePath: request.source_path,
    target,
    expectedTarget: request.expected_target,
  });
  return finalReportPersistResult({ admission, target, selfContained, persistence: persisted });
}

/**
 * Publish one immutable primary Final report. This function owns allocation and
 * durability only; it does not establish Final lifecycle or delivery facts.
 */
export function publishFinalReport(request = {}) {
  const {
    bundlePath,
    sourcePath,
    feature = null,
    polish = false,
    hooks = null,
    operationId = randomUUID(),
  } = PublishFinalReportRequestSchema.parse(request);
  const parsedOperationId = OperationIdSchema.parse(operationId);
  const parsedFeature = feature === null ? null : FinalReportFeatureSchema.parse(feature);
  const bundleReal = resolveBundle(bundlePath);
  ensureNoPendingArtifactWorkspace(bundleReal);

  const series = readFinalReportSeries(bundleReal);

  if (polish) {
    return publishPresentationRevision({ bundlePath, sourcePath, bundleReal, series, parsedFeature, hooks, parsedOperationId });
  }

  const allocation = allocateFinalReportTarget(series, { feature: parsedFeature });
  if (!allocation.available) {
    const first = allocation.blockers[0];
    return publicationResult({
      allocation,
      reasonCode: `primary_inventory_${first.code}`,
      reason: first.detail,
    });
  }

  const inventorySha256 = primaryInventorySha256(series);
  const { targetPath, parentPath } = resolveTarget(bundleReal, allocation.target);
  if (readTargetDigest(targetPath).exists) {
    return publicationResult({
      allocation,
      inventorySha256,
      reasonCode: 'primary_target_exists',
      reason: 'The Engine-allocated primary target already exists; rerun publication to resolve the current inventory.',
    });
  }
  const persistenceRoot = ensurePersistenceRoot(bundleReal);
  const sourceReal = resolveSource(sourcePath, targetPath, persistenceRoot);
  if (statSync(persistenceRoot).dev !== statSync(parentPath).dev) {
    throw new ArtifactPersistenceConfigError('persistence workspace and target parent are on different filesystem devices', 'cross_device_target');
  }

  const admission = evaluateFinalDeliveryBacking({
    bundlePath,
    target: allocation.target,
    markdown: readFileSync(sourceReal, 'utf8'),
  });
  if (!admission.check.passed) {
    return publicationResult({
      admission,
      allocation,
      inventorySha256,
      reasonCode: admission.inspect[0]?.code || 'final_backing_rejected',
      reason: admission.inspect[0]?.detail || 'Final Markdown backing admission failed.',
    });
  }

  const workspacePath = path.join(persistenceRoot, parsedOperationId);
  mkdirSync(workspacePath, { recursive: false, mode: 0o700 });
  fsyncPath(persistenceRoot);
  const workspaceRef = relativeWorkspace(bundleReal, workspacePath);
  const operationPath = path.join(workspacePath, 'operation.json');
  const nextOperationPath = path.join(workspacePath, 'operation.json.next');
  const payloadPath = path.join(workspacePath, 'payload');
  let accepted = false;
  const baseOperation = {
    schema_version: ARTIFACT_PERSISTENCE_SCHEMA_VERSION,
    operation_id: parsedOperationId,
    source_path: sourceReal,
    target: allocation.target,
    expected_target: { kind: 'absent' },
    created_at: new Date().toISOString(),
    workspace_kind: 'primary_publication',
  };
  const basePublication = {
    inventory_sha256: inventorySha256,
    base_classification: allocation.classification,
    target: allocation.target,
    version: allocation.version,
    feature: allocation.feature,
    previous_target: allocation.previous_target,
    staging_sha256: null,
    backing: {
      schema_version: admission.schema_version,
      check: admission.check,
      inspect: admission.inspect,
      advice: admission.advice,
    },
  };

  try {
    const preparing = PrimaryPreparingOperationSchema.parse({ ...baseOperation, state: 'preparing', publication: basePublication });
    invokeHook(hooks, 'beforePreparingPublished', { workspacePath, operation: preparing });
    writeJsonDurable(nextOperationPath, preparing);
    renameSync(nextOperationPath, operationPath);
    fsyncPath(workspacePath);
    accepted = true;
    invokeHook(hooks, 'afterPreparingPublished', { workspacePath, operation: preparing });

    copyFileSync(sourceReal, payloadPath, constants.COPYFILE_EXCL);
    fsyncPath(payloadPath);
    const payloadFact = hashFile(payloadPath);
    invokeHook(hooks, 'afterPayloadFsync', { workspacePath, payloadFact });

    const prepared = PrimaryPreparedOperationSchema.parse({
      ...baseOperation,
      state: 'prepared',
      payload_size: payloadFact.size,
      payload_sha256: payloadFact.sha256,
      publication: { ...basePublication, staging_sha256: payloadFact.sha256 },
    });
    writeJsonDurable(nextOperationPath, prepared);
    renameSync(nextOperationPath, operationPath);
    fsyncPath(workspacePath);
    invokeHook(hooks, 'afterPreparedPublished', { workspacePath, operation: prepared });

    const currentSeries = readFinalReportSeries(bundleReal);
    const currentAllocation = allocateFinalReportTarget(currentSeries, { feature: parsedFeature });
    if (!currentAllocation.available || primaryInventorySha256(currentSeries) !== inventorySha256 || currentAllocation.target !== allocation.target || currentAllocation.version !== allocation.version) {
      safeRemoveWorkspace(workspacePath, persistenceRoot);
      return publicationResult({
        admission,
        allocation,
        inventorySha256,
        operationId: parsedOperationId,
        reasonCode: 'primary_inventory_drift',
        reason: 'Primary inventory changed after allocation; rerun publish-final-report to allocate from the current immutable series.',
      });
    }
    invokeHook(hooks, 'beforePrimaryTargetCommit', { workspacePath, targetPath });
    const committed = commitPrimaryPayload(payloadPath, targetPath, parentPath);
    if (!committed.committed) {
      safeRemoveWorkspace(workspacePath, persistenceRoot);
      return publicationResult({
        admission,
        allocation,
        inventorySha256,
        operationId: parsedOperationId,
        reasonCode: committed.code,
        reason: committed.reason,
      });
    }
    invokeHook(hooks, 'afterPrimaryTargetCommit', { workspacePath, targetPath });
    invokeHook(hooks, 'beforeWorkspaceCleanup', { workspacePath, targetPath });
    safeRemoveWorkspace(workspacePath, persistenceRoot);
    invokeHook(hooks, 'afterWorkspaceCleanup', { workspacePath, targetPath });
    return publicationResult({
      admission,
      allocation,
      inventorySha256,
      operationId: parsedOperationId,
      verdict: 'committed',
      reasonCode: 'committed',
      reason: 'Primary report was published with an immutable no-clobber commit.',
    });
  } catch (error) {
    if (error?.preserveArtifactPersistenceState) {
      if (!accepted) {
        try { safeRemoveWorkspace(workspacePath, persistenceRoot); } catch { /* preserve simulated crash */ }
      }
      throw error;
    }
    if (!accepted) {
      try { safeRemoveWorkspace(workspacePath, persistenceRoot); } catch { /* preserve original error */ }
      throw error;
    }
    return publicationResult({
      admission,
      allocation,
      inventorySha256,
      operationId: parsedOperationId,
      reasonCode: error.code || 'publication_interrupted',
      reason: error.message,
      workspace: existsSync(workspacePath) ? workspaceRef : null,
    });
  }
}

function blockedSweepEntry({ bundleReal, workspacePath, operationId = null, target = null, sourcePath = null, reasonCode, reason, recommendedAction }) {
  return ArtifactSweepEntrySchema.parse({
    operation_id: operationId,
    target,
    source_path: sourcePath,
    verdict: 'blocked',
    reason_code: reasonCode,
    reason,
    workspace: relativeWorkspace(bundleReal, workspacePath),
    recommended_action: recommendedAction,
  });
}

function loadOperation(workspacePath) {
  const operationPath = path.join(workspacePath, 'operation.json');
  if (!existsSync(operationPath)) return { ok: false, reason: 'operation.json is missing' };
  const info = lstatSync(operationPath);
  if (info.isSymbolicLink() || !info.isFile()) return { ok: false, reason: 'operation.json is not a regular file' };
  try {
    return { ok: true, operation: ArtifactPersistenceOperationSchema.parse(JSON.parse(readFileSync(operationPath, 'utf8'))) };
  } catch (error) {
    return { ok: false, reason: `operation.json is invalid: ${error.message}` };
  }
}

function inspectSweepWorkspace({ bundleReal, bundleReaderPath, persistenceRoot, workspacePath }) {
  const workspaceName = path.basename(workspacePath);
  const workspaceInfo = lstatSync(workspacePath);
  if (workspaceInfo.isSymbolicLink() || !workspaceInfo.isDirectory()) {
    return blockedSweepEntry({
      bundleReal,
      workspacePath,
      reasonCode: 'workspace_unsafe',
      reason: 'Persistence workspace is not a real directory.',
      recommendedAction: `Inspect and remove ${relativeWorkspace(bundleReal, workspacePath)} without following symlinks, then rerun sweep.`,
    });
  }

  const loaded = loadOperation(workspacePath);
  if (!loaded.ok) {
    return blockedSweepEntry({
      bundleReal,
      workspacePath,
      reasonCode: 'operation_invalid',
      reason: loaded.reason,
      recommendedAction: `Inspect and remove ${relativeWorkspace(bundleReal, workspacePath)}, retry persist from the retained staging source, then rerun sweep.`,
    });
  }

  const operation = loaded.operation;
  const primaryPublication = operation.workspace_kind === 'primary_publication';
  if (operation.operation_id !== workspaceName) {
    return blockedSweepEntry({
      bundleReal,
      workspacePath,
      operationId: operation.operation_id,
      target: operation.target,
      sourcePath: operation.source_path,
      reasonCode: 'operation_binding_mismatch',
      reason: 'operation_id does not match its workspace directory.',
      recommendedAction: `Inspect and remove ${relativeWorkspace(bundleReal, workspacePath)}, then retry persist from ${operation.source_path}.`,
    });
  }

  if (operation.state === 'preparing') {
    const retryAdvice = primaryPublication
      ? `Inspect and remove ${relativeWorkspace(bundleReal, workspacePath)}, then retry the recorded primary publication from retained staging (generic persist is not used for the primary report), then rerun sweep.`
      : `Inspect and remove ${relativeWorkspace(bundleReal, workspacePath)}, retry persist from ${operation.source_path} to ${operation.target}, then rerun sweep.`;
    return blockedSweepEntry({
      bundleReal,
      workspacePath,
      operationId: operation.operation_id,
      target: operation.target,
      sourcePath: operation.source_path,
      reasonCode: 'operation_not_prepared',
      reason: 'Operation was accepted but payload preparation did not complete.',
      recommendedAction: retryAdvice,
    });
  }

  let targetResolved;
  try {
    targetResolved = resolveTarget(bundleReal, operation.target);
    if (statSync(persistenceRoot).dev !== statSync(targetResolved.parentPath).dev) {
      throw new ArtifactPersistenceConfigError('target is on a different filesystem device', 'cross_device_target');
    }
  } catch (error) {
    return blockedSweepEntry({
      bundleReal,
      workspacePath,
      operationId: operation.operation_id,
      target: operation.target,
      sourcePath: operation.source_path,
      reasonCode: error.code || 'target_invalid',
      reason: error.message,
      recommendedAction: `Repair the target path contract or remove ${relativeWorkspace(bundleReal, workspacePath)} and retry persist.`,
    });
  }

  const targetFact = readTargetDigest(targetResolved.targetPath);
  if (targetFact.exists && targetFact.sha256 === operation.payload_sha256) {
    try {
      safeRemoveWorkspace(workspacePath, persistenceRoot);
      return ArtifactSweepEntrySchema.parse({
        operation_id: operation.operation_id,
        target: operation.target,
        source_path: operation.source_path,
        verdict: 'cleaned',
        reason_code: 'already_committed',
        reason: 'Target already matches the prepared payload; stale workspace was removed.',
        workspace: relativeWorkspace(bundleReal, workspacePath),
        recommended_action: null,
      });
    } catch (error) {
      return blockedSweepEntry({
        bundleReal,
        workspacePath,
        operationId: operation.operation_id,
        target: operation.target,
        sourcePath: operation.source_path,
        reasonCode: 'workspace_cleanup_failed',
        reason: error.message,
        recommendedAction: `Remove ${relativeWorkspace(bundleReal, workspacePath)} and rerun sweep.`,
      });
    }
  }

  if (!expectedTargetMatches(operation.expected_target, targetFact)) {
    return blockedSweepEntry({
      bundleReal,
      workspacePath,
      operationId: operation.operation_id,
      target: operation.target,
      sourcePath: operation.source_path,
      reasonCode: primaryPublication ? 'primary_target_collision' : 'target_conflict',
      reason: primaryPublication
        ? 'The immutable primary target now exists with different bytes; do not overwrite it. Rerun publish-final-report after resolving the current inventory.'
        : 'Current target violates the prepared compare-and-swap precondition.',
      recommendedAction: primaryPublication
        ? `Keep ${operation.target} unchanged, remove ${relativeWorkspace(bundleReal, workspacePath)}, then rerun publish-final-report from retained staging ${operation.source_path}.`
        : `Resolve which content should win for ${operation.target}, then remove or retry the blocked workspace and rerun sweep.`,
    });
  }

  const payloadPath = path.join(workspacePath, 'payload');
  if (!existsSync(payloadPath)) {
    return blockedSweepEntry({
      bundleReal,
      workspacePath,
      operationId: operation.operation_id,
      target: operation.target,
      sourcePath: operation.source_path,
      reasonCode: 'payload_missing',
      reason: 'Prepared payload is missing.',
      recommendedAction: `Inspect and remove ${relativeWorkspace(bundleReal, workspacePath)}, retry persist from ${operation.source_path}, then rerun sweep.`,
    });
  }
  const payloadInfo = lstatSync(payloadPath);
  if (payloadInfo.isSymbolicLink() || !payloadInfo.isFile()) {
    return blockedSweepEntry({
      bundleReal,
      workspacePath,
      operationId: operation.operation_id,
      target: operation.target,
      sourcePath: operation.source_path,
      reasonCode: 'payload_unsafe',
      reason: 'Prepared payload is not a regular file.',
      recommendedAction: `Inspect and remove ${relativeWorkspace(bundleReal, workspacePath)} without following symlinks, then retry persist.`,
    });
  }
  const payloadFact = hashFile(payloadPath);
  if (payloadFact.size !== operation.payload_size || payloadFact.sha256 !== operation.payload_sha256) {
    return blockedSweepEntry({
      bundleReal,
      workspacePath,
      operationId: operation.operation_id,
      target: operation.target,
      sourcePath: operation.source_path,
      reasonCode: 'payload_mismatch',
      reason: 'Prepared payload size or SHA-256 does not match operation.json.',
      recommendedAction: `Inspect and remove ${relativeWorkspace(bundleReal, workspacePath)}, retry persist from ${operation.source_path}, then rerun sweep.`,
    });
  }

  if (isFinalMarkdownTarget(operation.target)) {
    const admission = evaluateFinalDeliveryBacking({
      bundlePath: bundleReaderPath,
      target: operation.target,
      markdown: readFileSync(payloadPath, 'utf8'),
    });
    if (!admission.check.passed) {
      const issue = admission.inspect[0];
      return blockedSweepEntry({
        bundleReal,
        workspacePath,
        operationId: operation.operation_id,
        target: operation.target,
        sourcePath: operation.source_path,
        reasonCode: `final_backing_${issue.code}`,
        reason: issue.detail,
        recommendedAction: `Repair ${issue.repair_surface} for ${operation.target}, remove only ${relativeWorkspace(bundleReal, workspacePath)}, then rerun persist-final-report from retained staging ${operation.source_path}.`,
      });
    }
  }

  if (primaryPublication) {
    try {
      const currentSeries = readFinalReportSeries(bundleReal);
      const currentAllocation = allocateFinalReportTarget(currentSeries, { feature: operation.publication.feature });
      if (!currentAllocation.available
        || primaryInventorySha256(currentSeries) !== operation.publication.inventory_sha256
        || currentAllocation.target !== operation.publication.target
        || currentAllocation.version !== operation.publication.version
        || currentAllocation.classification !== operation.publication.base_classification) {
        return blockedSweepEntry({
          bundleReal,
          workspacePath,
          operationId: operation.operation_id,
          target: operation.target,
          sourcePath: operation.source_path,
          reasonCode: 'primary_inventory_drift',
          reason: 'Primary inventory no longer matches the prepared immutable publication binding.',
          recommendedAction: `Keep existing reports unchanged, remove ${relativeWorkspace(bundleReal, workspacePath)}, then rerun publish-final-report from retained staging ${operation.source_path}.`,
        });
      }
    } catch (error) {
      return blockedSweepEntry({
        bundleReal,
        workspacePath,
        operationId: operation.operation_id,
        target: operation.target,
        sourcePath: operation.source_path,
        reasonCode: error.code || 'primary_inventory_invalid',
        reason: error.message,
        recommendedAction: `Repair the Final inventory without rewriting committed reports, then inspect ${relativeWorkspace(bundleReal, workspacePath)}.`,
      });
    }
  }

  try {
    if (primaryPublication) {
      const committed = commitPrimaryPayload(payloadPath, targetResolved.targetPath, targetResolved.parentPath);
      if (!committed.committed) {
        return blockedSweepEntry({
          bundleReal,
          workspacePath,
          operationId: operation.operation_id,
          target: operation.target,
          sourcePath: operation.source_path,
          reasonCode: committed.code,
          reason: committed.reason,
          recommendedAction: `Keep ${operation.target} unchanged and rerun publish-final-report from retained staging ${operation.source_path}.`,
        });
      }
    } else {
      renameSync(payloadPath, targetResolved.targetPath);
      fsyncPath(targetResolved.parentPath);
    }
    safeRemoveWorkspace(workspacePath, persistenceRoot);
    return ArtifactSweepEntrySchema.parse({
      operation_id: operation.operation_id,
      target: operation.target,
      source_path: operation.source_path,
      verdict: 'finalized',
      reason_code: 'finalized',
      reason: 'Prepared payload was committed atomically and the workspace was removed.',
      workspace: relativeWorkspace(bundleReal, workspacePath),
      recommended_action: null,
    });
  } catch (error) {
    return blockedSweepEntry({
      bundleReal,
      workspacePath,
      operationId: operation.operation_id,
      target: operation.target,
      sourcePath: operation.source_path,
      reasonCode: 'finalize_failed',
      reason: error.message,
      recommendedAction: `Inspect ${operation.target} and ${relativeWorkspace(bundleReal, workspacePath)}, then rerun sweep.`,
    });
  }
}

/**
 * Presentation-only polish path: CAS-update the current latest primary bytes
 * at the existing canonical target without allocating a new global version.
 * The staging Evidence Map backing set must equal the current latest primary's
 * backing set (presentation-only judgment is Agent-owned; the Engine enforces
 * the mechanical CAS/backing contract). Non-latest primary bytes remain
 * immutable. One REVISIONS.md audit row is appended in the version's bound
 * auxiliary directory.
 */
function publishPresentationRevision({ bundlePath, sourcePath, bundleReal, series, parsedFeature, hooks, parsedOperationId }) {
  if (!series.valid || !series.latest) {
    return presentationRevisionBlocked({
      target: null,
      reasonCode: 'polish_requires_latest',
      reason: !series.valid
        ? 'Primary inventory is invalid; resolve inventory blockers before a presentation revision.'
        : 'No latest primary revision exists; a presentation revision requires a delivered current version.',
    });
  }

  const latest = series.latest;
  const target = latest.target;
  const { targetPath, parentPath } = resolveTarget(bundleReal, target);
  const currentDigest = readTargetDigest(targetPath);
  if (!currentDigest.exists) {
    return presentationRevisionBlocked({ target, reasonCode: 'polish_target_missing', reason: `The current latest primary target ${target} does not exist; nothing to polish.` });
  }

  const persistenceRoot = ensurePersistenceRoot(bundleReal);
  const sourceReal = resolveSource(sourcePath, targetPath, persistenceRoot);
  if (statSync(persistenceRoot).dev !== statSync(parentPath).dev) {
    throw new ArtifactPersistenceConfigError('persistence workspace and target parent are on different filesystem devices', 'cross_device_target');
  }

  const admission = evaluateFinalDeliveryBacking({
    bundlePath,
    target,
    markdown: readFileSync(sourceReal, 'utf8'),
  });
  if (!admission.check.passed) {
    return presentationRevisionBlocked({
      target,
      reasonCode: admission.inspect[0]?.code || 'final_backing_rejected',
      reason: admission.inspect[0]?.detail || 'Final Markdown backing admission failed for the presentation revision.',
    });
  }

  const freshDigest = readTargetDigest(targetPath);
  if (!freshDigest.exists || freshDigest.sha256 !== currentDigest.sha256) {
    return presentationRevisionBlocked({ target, reasonCode: 'polish_cas_drift', reason: 'The current latest primary changed after the presentation revision was staged; rerun publish-final-report --polish against the current digest.' });
  }

  invokeHook(hooks, 'beforePrimaryTargetCommit', { targetPath, sourcePath: sourceReal });
  try {
    writeFileSync(targetPath, readFileSync(sourceReal));
    fsyncPath(parentPath);
  } catch (error) {
    throw new ArtifactPersistenceConfigError(`polish commit failed: ${error.message}`, 'polish_commit_failed');
  }
  appendRevisionsRow({ bundleReal, target, priorDigest: freshDigest.sha256, newDigest: hashFile(targetPath).sha256, operationId: parsedOperationId });

  return FinalReportPublishResultSchema.parse({
    schema_version: ARTIFACT_PERSISTENCE_SCHEMA_VERSION,
    operation: 'publish-final-report',
    check: admission.check,
    inspect: admission.inspect,
    advice: admission.advice,
    operation_id: parsedOperationId,
    target,
    base_classification: series.classification,
    version: latest.version,
    feature: latest.feature,
    previous_target: null,
    inventory_sha256: primaryInventorySha256(series),
    verdict: 'committed',
    reason_code: 'committed',
    reason: 'Presentation revision committed as a CAS update of the current latest primary; no new global version was allocated (see REVISIONS.md).',
    workspace: null,
  });
}

function presentationRevisionBlocked({ target, reasonCode, reason }) {
  return FinalReportPublishResultSchema.parse({
    schema_version: ARTIFACT_PERSISTENCE_SCHEMA_VERSION,
    operation: 'publish-final-report',
    check: null,
    inspect: [],
    advice: [],
    operation_id: null,
    target: target || null,
    base_classification: 'invalid',
    version: null,
    feature: null,
    previous_target: null,
    inventory_sha256: null,
    verdict: 'blocked',
    reason_code: reasonCode,
    reason,
    workspace: null,
  });
}

function appendRevisionsRow({ bundleReal, target, priorDigest, newDigest, operationId }) {
  const auxDirName = target.replace(/^final\//, '').replace(/\.md$/, '');
  const auxDir = path.join(bundleReal, 'final', auxDirName);
  if (!existsSync(auxDir)) {
    mkdirSync(auxDir, { recursive: false });
    fsyncPath(path.join(bundleReal, 'final'));
  }
  const auxInfo = lstatSync(auxDir);
  if (auxInfo.isSymbolicLink() || !auxInfo.isDirectory()) {
    throw new ArtifactPersistenceConfigError(`auxiliary directory is unsafe: ${auxDir}`, 'auxiliary_unsafe');
  }
  const revisionsPath = path.join(auxDir, 'REVISIONS.md');
  const row = [
    '',
    `## Revision ${new Date().toISOString()}`,
    `- operation_id: ${operationId}`,
    `- prior_sha256: ${priorDigest}`,
    `- new_sha256: ${newDigest}`,
    '- scope: presentation-only polish (CAS update of the current latest primary; no new global version)',
    '',
  ].join('\n');
  writeFileSync(revisionsPath, (existsSync(revisionsPath) ? readFileSync(revisionsPath, 'utf8') : `# REVISIONS — ${auxDirName}\n\n`) + row);
  fsyncPath(auxDir);
}

/**
 * Human-controlled correction: move the selected primary revision to
 * final/attic/ with a retired marker and recompute latest from the remaining
 * non-retired revisions. Only an explicit user request may invoke this
 * operation: the caller must pass `requestedBy: 'user'` plus a non-empty
 * `userConfirmation` (the user's verbatim request); the CLI rejects a missing
 * confirmation as an invocation error before the Engine is invoked, and this
 * Engine entry validates the full request schema before any work. All
 * pre-checks (inventory, latest-only, attic safety, target and auxiliary
 * collisions) complete before the first filesystem mutation, so a `blocked`
 * verdict always implies zero mutation. Retired bytes are archived, not
 * deleted or rewritten, and the retired version number is never reused.
 */
export function retireFinalVersion({ bundlePath, version, feature = null, reason = null, requestedBy = null, userConfirmation = null } = {}) {
  const bundleReal = resolveBundle(bundlePath);
  const parsedFeature = feature === null ? null : FinalReportFeatureSchema.parse(feature);
  if (requestedBy !== 'user' || typeof userConfirmation !== 'string' || userConfirmation.trim() === '') {
    return retireResult({
      bundleReal,
      version,
      parsedFeature,
      verdict: 'blocked',
      reasonCode: 'retire_requires_user_request',
      reason: 'retire-final-version is human-controlled; an explicit user request carried by --user-confirmation is required. The Agent SHALL NOT auto-retire any version.',
    });
  }
  // Full request-shape validation at the Engine entry (defense in depth after
  // the CLI invocation guard; the CLI rejects missing confirmation first).
  RetireFinalVersionRequestSchema.parse({ bundlePath, version, feature, reason, requestedBy, userConfirmation });
  const series = readFinalReportSeries(bundleReal);
  if (!series.valid) {
    const first = series.blockers[0];
    return retireResult({ bundleReal, version, parsedFeature, verdict: 'blocked', reasonCode: `primary_inventory_${first.code}`, reason: first.detail });
  }
  const match = series.primary_entries.find((entry) => entry.kind === 'revision' && entry.version === version && (entry.feature ?? null) === parsedFeature);
  if (!match) {
    return retireResult({ bundleReal, version, parsedFeature, verdict: 'blocked', reasonCode: 'retire_version_not_found', reason: `No primary revision ${version}${parsedFeature ? ` (feature ${parsedFeature})` : ''} exists in the current series.` });
  }
  if (!series.latest || series.latest.target !== match.target) {
    return retireResult({ bundleReal, version, parsedFeature, verdict: 'blocked', reasonCode: 'retire_requires_latest', reason: `retire-final-version may retire only the current latest primary revision (${series.latest ? series.latest.target : 'none'}); retiring an intermediate version would break the contiguous primary sequence.` });
  }
  const { targetPath, parentPath } = resolveTarget(bundleReal, match.target);
  const atticDir = path.join(bundleReal, 'final', 'attic');
  const retiredName = match.target.split('/').pop();
  const retiredPath = path.join(atticDir, retiredName);
  // --- Pre-check phase: zero filesystem mutation below this line. ---
  // Every blocked verdict and config fault must be reachable before the first
  // rename so a blocked result always implies a byte-identical bundle.
  const atticExists = existsSync(atticDir);
  if (atticExists) {
    const atticInfo = lstatSync(atticDir);
    if (atticInfo.isSymbolicLink() || !atticInfo.isDirectory()) {
      throw new ArtifactPersistenceConfigError('final/attic is not a real directory', 'attic_unsafe');
    }
    if (existsSync(retiredPath)) {
      return retireResult({ bundleReal, version, parsedFeature, verdict: 'blocked', reasonCode: 'retire_target_collision', reason: `final/attic/${retiredName} already exists; resolve the collision and rerun.` });
    }
  }
  // Auxiliary-directory pre-checks: unsafe auxiliary or an attic collision
  // blocks the retirement before the primary revision is touched.
  const auxDirName = retiredName.replace(/\.md$/, '');
  const auxDirPath = path.join(bundleReal, 'final', auxDirName);
  const auxExists = existsSync(auxDirPath);
  if (auxExists) {
    const auxInfo = lstatSync(auxDirPath);
    if (auxInfo.isSymbolicLink() || !auxInfo.isDirectory()) {
      throw new ArtifactPersistenceConfigError('auxiliary directory is unsafe', 'auxiliary_unsafe');
    }
    if (atticExists && existsSync(path.join(atticDir, auxDirName))) {
      return retireResult({ bundleReal, version, parsedFeature, verdict: 'blocked', reasonCode: 'retire_aux_collision', reason: `final/attic/${auxDirName} already exists; resolve the collision and rerun.` });
    }
  }
  // --- Mutation phase: all pre-checks passed. ---
  if (!atticExists) {
    // A freshly created attic is empty, so neither collision can apply.
    mkdirSync(atticDir, { recursive: false });
    fsyncPath(path.join(bundleReal, 'final'));
  }
  // Move the version-bound auxiliary directory (if any) alongside the retired primary to avoid an orphan_auxiliary_directory blocker.
  renameSync(targetPath, retiredPath);
  fsyncPath(atticDir);
  fsyncPath(parentPath);
  if (auxExists) {
    renameSync(auxDirPath, path.join(atticDir, auxDirName));
    fsyncPath(atticDir);
    fsyncPath(path.join(bundleReal, 'final'));
  }
  const marker = {
    schema_version: ARTIFACT_PERSISTENCE_SCHEMA_VERSION,
    operation: 'retire-final-version',
    retired_at: new Date().toISOString(),
    retired_by: 'user',
    version,
    feature: parsedFeature,
    reason: reason || null,
    original_target: match.target,
    archived_target: `final/attic/${retiredName}`,
  };
  writeFileSync(path.join(atticDir, `final_v${version}${parsedFeature ? `_${parsedFeature}` : ''}.retired.json`), `${JSON.stringify(marker, null, 2)}\n`);
  fsyncPath(atticDir);
  const freshSeries = readFinalReportSeries(bundleReal);
  return retireResult({ bundleReal, version, parsedFeature, verdict: 'committed', reasonCode: 'retired', reason: `Version ${version} retired to final/attic/; latest is now ${freshSeries.latest ? freshSeries.latest.target : 'none'}.`, latestTarget: freshSeries.latest ? freshSeries.latest.target : null });
}

function retireResult({ bundleReal, version, parsedFeature, verdict, reasonCode, reason, latestTarget = null }) {
  return RetireFinalVersionResultSchema.parse({
    schema_version: ARTIFACT_PERSISTENCE_SCHEMA_VERSION,
    operation: 'retire-final-version',
    target: null,
    version,
    feature: parsedFeature,
    latest_target: latestTarget,
    verdict,
    reason_code: reasonCode,
    reason,
    workspace: null,
  });
}

export function sweepPendingArtifactWrites({ bundlePath } = {}) {
  const bundleReal = resolveBundle(bundlePath);
  const bundleReaderPath = path.resolve(bundlePath);
  const persistenceRoot = path.join(bundleReal, ...ARTIFACT_PERSISTENCE_ROOT.split('/'));
  if (!existsSync(persistenceRoot)) {
    return ArtifactSweepSummarySchema.parse({
      schema_version: ARTIFACT_PERSISTENCE_SCHEMA_VERSION,
      operation: 'sweep',
      quiescent_required: true,
      passed: true,
      blocked_count: 0,
      entries: [],
    });
  }
  const rootInfo = lstatSync(persistenceRoot);
  if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) {
    throw new ArtifactPersistenceConfigError('artifact persistence root is not a real directory', 'persistence_root_unsafe');
  }

  const entries = readdirSync(persistenceRoot, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => inspectSweepWorkspace({
      bundleReal,
      bundleReaderPath,
      persistenceRoot,
      workspacePath: path.join(persistenceRoot, entry.name),
    }));
  const blockedCount = entries.filter((entry) => entry.verdict === 'blocked').length;
  return ArtifactSweepSummarySchema.parse({
    schema_version: ARTIFACT_PERSISTENCE_SCHEMA_VERSION,
    operation: 'sweep',
    quiescent_required: true,
    passed: blockedCount === 0,
    blocked_count: blockedCount,
    entries,
  });
}

export function sha256File(filePath) {
  return hashFile(filePath).sha256;
}
