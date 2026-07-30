// @impl DEW-023
import path from 'node:path';
import { z } from 'zod';

import { WORK_UNIT_ID_PATTERN } from './work-unit.mjs';

export const WORK_UNIT_TRANSACTION_LOCK_SCHEMA_VERSION = 'work-unit.transaction-lock.v1';
export const WORK_UNIT_TRANSACTION_V1_SCHEMA_VERSION = 'work-unit.transaction.v1';
export const WORK_UNIT_TRANSACTION_V2_SCHEMA_VERSION = 'work-unit.transaction.v2';

export const WorkUnitTransactionOperationSchema = z.enum([
  'create_work_unit',
  'open_work_unit_batch',
  'claim_work_units',
  'reject_work_unit_submit',
  'work_unit_replace',
  'work_unit_failed',
  'work_unit_timed_out',
  'work_unit_abandoned',
  'submit_work_unit',
  'late_submit_work_unit',
  'recover_work_unit_declaration',
  'supersede_work_unit',
  'recover_work_unit_transaction',
]);

export const WorkUnitTransactionV2DispositionSchema = z.enum([
  'started',
  'committed',
  'rolled_back',
  'suspect',
]);

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/, 'digest must be a lowercase SHA-256 hex string');

function isCanonicalBundleRelativePath(value) {
  if (typeof value !== 'string' || value.length === 0 || value === '.' || path.posix.isAbsolute(value)) return false;
  if (value.includes('\\') || value.includes('//')) return false;
  if (/[?*{}\[\]]/.test(value)) return false;
  const segments = value.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) return false;
  return path.posix.normalize(value) === value;
}

function isRollbackOwnedPath(value) {
  if (!isCanonicalBundleRelativePath(value)) return false;
  return value !== '_work_units/.lock'
    && value !== 'rb_trace.jsonl'
    && value !== '_logs/run.log';
}

const ExistingMutationTargetSchema = z.object({
  path: z.string().refine(isRollbackOwnedPath, 'target must be a canonical rollback-owned bundle-relative file path'),
  before_exists: z.literal(true),
  before_sha256: Sha256Schema,
}).strict();

const AbsentMutationTargetSchema = z.object({
  path: z.string().refine(isRollbackOwnedPath, 'target must be a canonical rollback-owned bundle-relative file path'),
  before_exists: z.literal(false),
}).strict();

export const WorkUnitTransactionMutationTargetSchema = z.discriminatedUnion('before_exists', [
  ExistingMutationTargetSchema,
  AbsentMutationTargetSchema,
]);

export const WorkUnitTransactionMutationManifestSchema = z.object({
  targets: z.array(WorkUnitTransactionMutationTargetSchema).min(1),
}).strict().superRefine((data, ctx) => {
  const seen = new Set();
  data.targets.forEach((target, index) => {
    if (seen.has(target.path)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['targets', index, 'path'],
        message: `duplicate mutation target ${target.path}`,
      });
    }
    seen.add(target.path);
  });
});

function uniqueCoordinateArray(schema) {
  return z.array(schema).superRefine((values, ctx) => {
    const seen = new Set();
    values.forEach((value, index) => {
      if (seen.has(value)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [index], message: `duplicate target coordinate ${value}` });
      }
      seen.add(value);
    });
  });
}

const TargetWorkIdsSchema = uniqueCoordinateArray(z.string().regex(WORK_UNIT_ID_PATTERN));
const TargetQueueItemIdsSchema = uniqueCoordinateArray(z.string().trim().min(1));

function expectedJournalRef(txId) {
  return `_work_units/_transactions/${txId}.json`;
}

export const WorkUnitTransactionLockOwnerSchema = z.object({
  schema_version: z.literal(WORK_UNIT_TRANSACTION_LOCK_SCHEMA_VERSION),
  tx_id: z.string().trim().min(1),
  operation: WorkUnitTransactionOperationSchema,
  journal_ref: z.string().refine(isCanonicalBundleRelativePath, 'journal_ref must be canonical bundle-relative'),
  target_work_ids: TargetWorkIdsSchema,
  target_queue_item_ids: TargetQueueItemIdsSchema,
  acquired_at: z.string().datetime(),
}).strict().superRefine((data, ctx) => {
  if (data.journal_ref !== expectedJournalRef(data.tx_id)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['journal_ref'],
      message: 'journal_ref must identify the owner transaction journal',
    });
  }
});

export const WorkUnitTransactionV1JournalSchema = z.object({
  schema_version: z.literal(WORK_UNIT_TRANSACTION_V1_SCHEMA_VERSION),
  tx_id: z.string().trim().min(1),
  operation: z.string().trim().min(1),
  status: z.enum(['started', 'committed', 'failed']),
  started_at: z.string().datetime(),
  committed_at: z.string().datetime().nullable(),
  error: z.string().min(1).optional(),
}).strict().superRefine((data, ctx) => {
  if (data.status === 'committed' && data.committed_at === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['committed_at'], message: 'committed v1 journal requires committed_at' });
  }
  if (data.status !== 'committed' && data.committed_at !== null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['committed_at'], message: `${data.status} v1 journal cannot have committed_at` });
  }
  if (data.status === 'failed' && !data.error) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['error'], message: 'failed v1 journal requires error' });
  }
  if (data.status !== 'failed' && data.error) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['error'], message: `${data.status} v1 journal cannot have error` });
  }
});

export const WorkUnitTransactionV2JournalSchema = z.object({
  schema_version: z.literal(WORK_UNIT_TRANSACTION_V2_SCHEMA_VERSION),
  tx_id: z.string().trim().min(1),
  operation: WorkUnitTransactionOperationSchema,
  journal_ref: z.string().refine(isCanonicalBundleRelativePath, 'journal_ref must be canonical bundle-relative'),
  target_work_ids: TargetWorkIdsSchema,
  target_queue_item_ids: TargetQueueItemIdsSchema,
  mutation_manifest: WorkUnitTransactionMutationManifestSchema,
  status: WorkUnitTransactionV2DispositionSchema,
  started_at: z.string().datetime(),
  settled_at: z.string().datetime().nullable(),
  error: z.string().min(1).nullable(),
}).strict().superRefine((data, ctx) => {
  if (data.journal_ref !== expectedJournalRef(data.tx_id)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['journal_ref'],
      message: 'journal_ref must identify this transaction journal',
    });
  }
  if (data.mutation_manifest.targets.some((target) => target.path === data.journal_ref)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['mutation_manifest', 'targets'],
      message: 'a transaction journal cannot be its own rollback target',
    });
  }
  if (data.status === 'started') {
    if (data.settled_at !== null) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['settled_at'], message: 'started journal cannot have settled_at' });
    if (data.error !== null) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['error'], message: 'started journal cannot have error' });
    return;
  }
  if (data.settled_at === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['settled_at'], message: `${data.status} journal requires settled_at` });
  }
  if (data.status === 'committed' && data.error !== null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['error'], message: 'committed journal cannot have error' });
  }
  if (['rolled_back', 'suspect'].includes(data.status) && data.error === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['error'], message: `${data.status} journal requires an audit reason` });
  }
});

export const WorkUnitTransactionJournalSchema = z.union([
  WorkUnitTransactionV1JournalSchema,
  WorkUnitTransactionV2JournalSchema,
]);

export const WorkUnitTransactionPairSchema = z.object({
  owner: WorkUnitTransactionLockOwnerSchema,
  journal: WorkUnitTransactionV2JournalSchema,
}).strict().superRefine((data, ctx) => {
  for (const field of ['tx_id', 'operation', 'journal_ref']) {
    if (data.owner[field] !== data.journal[field]) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['journal', field], message: `owner/journal ${field} mismatch` });
    }
  }
  for (const field of ['target_work_ids', 'target_queue_item_ids']) {
    if (JSON.stringify(data.owner[field]) !== JSON.stringify(data.journal[field])) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['journal', field], message: `owner/journal ${field} mismatch` });
    }
  }
});

const WorkUnitTransactionCallerSchema = z.object({
  operation: WorkUnitTransactionOperationSchema,
  work_id: z.string().regex(WORK_UNIT_ID_PATTERN).nullable(),
  queue_item_id: z.string().trim().min(1).nullable(),
}).strict();

const WorkUnitTransactionHolderSchema = z.object({
  tx_id: z.string().trim().min(1),
  operation: WorkUnitTransactionOperationSchema,
  journal_ref: z.string().refine(isCanonicalBundleRelativePath, 'journal_ref must be canonical bundle-relative'),
  target_work_ids: TargetWorkIdsSchema,
  target_queue_item_ids: TargetQueueItemIdsSchema,
  journal_disposition: z.enum(['started', 'committed', 'rolled_back']),
}).strict();

const SuspectTransactionHolderSchema = z.object({
  tx_id: z.string().trim().min(1).nullable(),
  operation: z.string().trim().min(1).nullable(),
  journal_ref: z.string().min(1).nullable(),
  target_work_ids: z.array(z.string()),
  target_queue_item_ids: z.array(z.string()),
  journal_disposition: z.enum(['started', 'committed', 'rolled_back', 'suspect', 'legacy_failed', 'unknown']).nullable(),
}).strict();

const NoTransactionProjectionSchema = z.object({
  disposition: z.literal('none'),
  caller: WorkUnitTransactionCallerSchema,
  holder: z.null(),
  targets_same_attempt: z.literal(false),
  repair_kind: z.null(),
  missing_fact: z.null(),
  write_to: z.null(),
  rerun: z.null(),
}).strict();

export const WorkUnitTransactionBusyProjectionSchema = z.object({
  disposition: z.literal('busy'),
  caller: WorkUnitTransactionCallerSchema,
  holder: WorkUnitTransactionHolderSchema,
  targets_same_attempt: z.boolean(),
  repair_kind: z.literal('wait'),
  missing_fact: z.null(),
  write_to: z.null(),
  rerun: z.string().trim().min(1),
}).strict();

export const WorkUnitTransactionSuspectProjectionSchema = z.object({
  disposition: z.literal('suspect_transaction'),
  caller: WorkUnitTransactionCallerSchema,
  holder: SuspectTransactionHolderSchema.nullable(),
  targets_same_attempt: z.boolean().nullable(),
  repair_kind: z.enum(['recover_transaction', 'missing_contract']),
  missing_fact: z.string().trim().min(1),
  write_to: z.string().trim().min(1).nullable(),
  rerun: z.string().trim().min(1),
}).strict().superRefine((data, ctx) => {
  if (data.repair_kind === 'recover_transaction' && data.write_to === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['write_to'], message: 'recover_transaction requires the named prior journal path' });
  }
  if (data.repair_kind === 'missing_contract' && data.write_to !== null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['write_to'], message: 'missing_contract cannot name a mutation target' });
  }
});

export const WorkUnitTransactionProjectionSchema = z.union([
  NoTransactionProjectionSchema,
  WorkUnitTransactionBusyProjectionSchema,
  WorkUnitTransactionSuspectProjectionSchema,
]);
