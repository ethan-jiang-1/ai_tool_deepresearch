// @impl ARP-001, ARP-002, ARP-003

import {
  closeSync,
  constants,
  copyFileSync,
  existsSync,
  fsyncSync,
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
  FinalDeliveryBackingInspectSchema,
  isFinalMarkdownTarget,
} from './final-delivery-backing.mjs';

export const ARTIFACT_PERSISTENCE_SCHEMA_VERSION = '1.0.0';
export const ARTIFACT_PERSISTENCE_ROOT = '_diagnostics/artifact-persistence';
export const ARTIFACT_PERSISTENCE_OPERATIONS = Object.freeze(['persist', 'persist-final-report', 'sweep']);
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

export const ArtifactPersistenceOperationSchema = z.discriminatedUnion('state', [
  PreparingOperationSchema,
  PreparedOperationSchema,
]);

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

function finalReportPersistResult({ admission, target, persistence = null }) {
  const durability = persistence || {
    operation_id: null,
    target,
    verdict: 'blocked',
    reason_code: admission.inspect[0]?.code || 'final_backing_rejected',
    reason: admission.inspect[0]?.detail || 'Final Markdown backing admission failed.',
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
export function persistFinalReport({ bundlePath, sourcePath, target, expectedTarget } = {}) {
  const request = inspectArtifactPersistenceRequest({ bundlePath, sourcePath, target, expectedTarget });
  if (!isFinalMarkdownTarget(target)) {
    throw new ArtifactPersistenceConfigError('persist-final-report requires a safe Markdown target under final/', 'final_markdown_target_required');
  }
  const markdown = readFileSync(request.source_path, 'utf8');
  const admission = evaluateFinalDeliveryBacking({
    bundlePath,
    target,
    markdown,
  });
  if (!admission.check.passed) return finalReportPersistResult({ admission, target });

  const persisted = persistBundleFile({
    bundlePath: request.bundle_real,
    sourcePath: request.source_path,
    target,
    expectedTarget: request.expected_target,
  });
  return finalReportPersistResult({ admission, target, persistence: persisted });
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
    return blockedSweepEntry({
      bundleReal,
      workspacePath,
      operationId: operation.operation_id,
      target: operation.target,
      sourcePath: operation.source_path,
      reasonCode: 'operation_not_prepared',
      reason: 'Operation was accepted but payload preparation did not complete.',
      recommendedAction: `Inspect and remove ${relativeWorkspace(bundleReal, workspacePath)}, retry persist from ${operation.source_path} to ${operation.target}, then rerun sweep.`,
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
      reasonCode: 'target_conflict',
      reason: 'Current target violates the prepared compare-and-swap precondition.',
      recommendedAction: `Resolve which content should win for ${operation.target}, then remove or retry the blocked workspace and rerun sweep.`,
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

  try {
    renameSync(payloadPath, targetResolved.targetPath);
    fsyncPath(targetResolved.parentPath);
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
