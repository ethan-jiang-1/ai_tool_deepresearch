// @impl DEW-002, DEW-004, DEW-014, FRE-005, SDC-001, SDC-002, SDC-003
import { z } from 'zod';

export const WORK_UNIT_INDEX_SCHEMA_VERSION = 'work-unit.index.v1';
export const WORK_UNIT_MANIFEST_SCHEMA_VERSION = 'work-unit.manifest.v1';
export const WORK_UNIT_BEACON_SCHEMA_VERSION = 'work-unit.beacon.v1';
export const WORK_UNIT_STATUS_SCHEMA_VERSION = 'work-unit.status.v1';
export const WORK_UNIT_AGENT_SCHEMA_VERSION = 'work-unit.agent.v1';
export const WORK_UNIT_RECEIPT_EVENT_SCHEMA_VERSION = 'work-unit.receipt-event.v1';

export const WORK_UNIT_ID_PATTERN = /^wu-w(?<wave>[0-9]+)-b(?<batch>[0-9]{3})-(?<kind_code>[a-z][a-z0-9]{1,7})-i(?<claim>[0-9]{4})$/;

export const WorkUnitStatus = z.enum(['claimed', 'submitted', 'failed', 'timed_out', 'abandoned']);
export const WorkUnitTerminalStatus = z.enum(['submitted', 'failed', 'timed_out', 'abandoned']);

const JsonObject = z.record(z.string(), z.unknown());

export const RuntimeRefsSchema = z.object({
  platform: z.string().min(1).optional(),
  runtime_agent_id: z.string().min(1).optional(),
  spawn_request_id: z.string().min(1).optional(),
  thread_id: z.string().min(1).optional(),
  session_id: z.string().min(1).optional(),
  cancel_ref: z.string().min(1).optional(),
  opaque: z.record(z.string(), z.unknown()).default({}),
}).default({});

export const KindRegistrySchema = z.object({
  kinds: z.record(z.string().min(1), z.string().regex(/^[a-z][a-z0-9]{1,7}$/)),
  codes: z.record(z.string().regex(/^[a-z][a-z0-9]{1,7}$/), z.string().min(1)),
}).superRefine((data, ctx) => {
  for (const [kind, code] of Object.entries(data.kinds)) {
    if (data.codes[code] !== kind) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['codes', code],
        message: `kind registry reverse mapping for ${code} must be ${kind}`,
      });
    }
  }
  for (const [code, kind] of Object.entries(data.codes)) {
    if (data.kinds[kind] !== code) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['kinds', kind],
        message: `kind registry forward mapping for ${kind} must be ${code}`,
      });
    }
  }
});

export const WorkUnitPathRefsSchema = z.object({
  work_unit_dir: z.string().min(1),
  manifest_ref: z.string().min(1),
  task_ref: z.string().min(1),
  result_schema_ref: z.string().min(1),
  beacon_ref: z.string().min(1),
  runtime_receipt_ref: z.string().min(1),
  status_ref: z.string().min(1),
  result_ref: z.string().min(1),
  agent_ref: z.string().min(1),
});

export const WorkUnitManifestSchema = z.object({
  schema_version: z.literal(WORK_UNIT_MANIFEST_SCHEMA_VERSION).default(WORK_UNIT_MANIFEST_SCHEMA_VERSION),
  work_id: z.string().regex(WORK_UNIT_ID_PATTERN),
  queue_item_id: z.string().min(1),
  wave: z.number().int().nonnegative(),
  batch_id: z.string().regex(/^b[0-9]{3}$/),
  batch_index: z.number().int().nonnegative(),
  claim_index: z.number().int().nonnegative(),
  attempt_index: z.number().int().positive(),
  kind: z.string().min(1),
  kind_code: z.string().regex(/^[a-z][a-z0-9]{1,7}$/),
  task_brief: z.string().min(1),
  producer_rule: z.string().min(1),
  creation_reason: z.string().min(1),
  queue_item_snapshot_hash: z.string().min(1),
  receipt_nonce: z.string().min(16),
  claimed_at: z.string().datetime(),
  timeout_ms: z.number().int().positive(),
  deadline_at: z.string().datetime(),
  output_contract: JsonObject,
  cache_policy: JsonObject,
  runtime_refs: RuntimeRefsSchema,
  paths: WorkUnitPathRefsSchema,
  queue_item: z.record(z.string(), z.unknown()),
}).strict();

export const WorkUnitBeaconSchema = z.object({
  schema_version: z.literal(WORK_UNIT_BEACON_SCHEMA_VERSION).default(WORK_UNIT_BEACON_SCHEMA_VERSION),
  work_id: z.string().regex(WORK_UNIT_ID_PATTERN),
  queue_item_id: z.string().min(1),
  kind: z.string().min(1),
  bundle: z.string().min(1),
  bundle_dir: z.string().min(1),
  receipt_nonce: z.string().min(16),
  deadline_at: z.string().datetime(),
  work_unit_dir: z.string().min(1),
  manifest_ref: z.string().min(1),
  task_ref: z.string().min(1),
  result_schema_ref: z.string().min(1),
  result_ref: z.string().min(1),
  runtime_receipt_ref: z.string().min(1),
  log_cli: z.string().min(1),
  output_contract: JsonObject,
  cache_policy: JsonObject,
  required_receipt_fields: z.array(z.enum(['work_id', 'queue_item_id', 'kind', 'receipt_nonce'])),
  runtime_refs: RuntimeRefsSchema,
  runtime_refs_authority: z.literal('diagnostic_only').default('diagnostic_only'),
}).strict();

export const WorkUnitIndexRecordSchema = z.object({
  work_id: z.string().regex(WORK_UNIT_ID_PATTERN),
  queue_item_id: z.string().min(1),
  wave: z.number().int().nonnegative(),
  batch_id: z.string().regex(/^b[0-9]{3}$/),
  batch_index: z.number().int().nonnegative(),
  claim_index: z.number().int().nonnegative(),
  attempt_index: z.number().int().positive(),
  kind: z.string().min(1),
  kind_code: z.string().regex(/^[a-z][a-z0-9]{1,7}$/),
  status: WorkUnitStatus,
  producer_rule: z.string().min(1),
  creation_reason: z.string().min(1),
  queue_item_snapshot_hash: z.string().min(1),
  receipt_nonce: z.string().min(16),
  claimed_at: z.string().datetime(),
  timeout_ms: z.number().int().positive(),
  deadline_at: z.string().datetime(),
  last_observed_at: z.string().datetime().optional(),
  runtime_refs: RuntimeRefsSchema,
  paths: WorkUnitPathRefsSchema,
  result_hash: z.string().min(1).optional(),
  ledger_record_hash: z.string().min(1).optional(),
  last_submit_rejection: z.record(z.string(), z.unknown()).optional(),
  terminal_reason: z.string().optional(),
  terminal_at: z.string().datetime().optional(),
}).strict();

export const WorkUnitWaveCountersSchema = z.object({
  current_batch_index: z.number().int().nonnegative().default(0),
  batches: z.record(z.string().regex(/^b[0-9]{3}$/), z.object({
    batch_index: z.number().int().nonnegative(),
    batch_reason: z.string().min(1),
    next_claim_index: z.number().int().positive().default(1),
    opened_at: z.string().datetime().optional(),
    lineage: JsonObject.optional(),
  })).default({}),
}).strict();

export const WorkUnitIndexSchema = z.object({
  schema_version: z.literal(WORK_UNIT_INDEX_SCHEMA_VERSION).default(WORK_UNIT_INDEX_SCHEMA_VERSION),
  kind_registry: KindRegistrySchema,
  waves: z.record(z.string().regex(/^wave[0-9]+$/), WorkUnitWaveCountersSchema).default({}),
  work_units: z.record(z.string().regex(WORK_UNIT_ID_PATTERN), WorkUnitIndexRecordSchema).default({}),
  status_counts: z.record(WorkUnitStatus, z.number().int().nonnegative()).default({
    claimed: 0,
    submitted: 0,
    failed: 0,
    timed_out: 0,
    abandoned: 0,
  }),
  inspect_projection: z.object({
    generated_at: z.string().datetime(),
    total: z.number().int().nonnegative(),
    by_wave: z.record(z.string(), z.number().int().nonnegative()).default({}),
    nonterminal: z.number().int().nonnegative(),
  }),
  updated_at: z.string().datetime(),
}).strict();

export const WorkUnitStatusFileSchema = z.object({
  schema_version: z.literal(WORK_UNIT_STATUS_SCHEMA_VERSION).default(WORK_UNIT_STATUS_SCHEMA_VERSION),
  work_id: z.string().regex(WORK_UNIT_ID_PATTERN),
  status: WorkUnitStatus,
  updated_at: z.string().datetime(),
  result_hash: z.string().min(1).optional(),
  ledger_record_hash: z.string().min(1).optional(),
  last_submit_rejection: z.record(z.string(), z.unknown()).optional(),
}).strict();

export const WorkUnitAgentFileSchema = z.object({
  schema_version: z.literal(WORK_UNIT_AGENT_SCHEMA_VERSION).default(WORK_UNIT_AGENT_SCHEMA_VERSION),
  work_id: z.string().regex(WORK_UNIT_ID_PATTERN),
  runtime_refs: RuntimeRefsSchema,
  updated_at: z.string().datetime(),
}).strict();

export const WorkUnitRuntimeReceiptEventSchema = z.object({
  schema_version: z.literal(WORK_UNIT_RECEIPT_EVENT_SCHEMA_VERSION).default(WORK_UNIT_RECEIPT_EVENT_SCHEMA_VERSION),
  event: z.string().min(1),
  work_id: z.string().regex(WORK_UNIT_ID_PATTERN),
  queue_item_id: z.string().min(1),
  kind: z.string().min(1),
  receipt_nonce: z.string().min(16),
  ts: z.string().datetime().optional(),
  detail: JsonObject.optional(),
}).passthrough();

export const WorkUnitSourceClaimSchema = z.object({
  url: z.string().url(),
  source_ref: z.string().min(1),
  acceptance_status: z.string().min(1),
  is_new_vs_wave0: z.boolean(),
  cache_trail_refs: z.array(z.string().min(1)).default([]),
  degraded_capture_ref: z.string().min(1).nullable().optional(),
}).strict();

export const WorkUnitResultSchema = z.object({
  schema_version: z.literal('work-unit.result.v1').default('work-unit.result.v1'),
  work_id: z.string().regex(WORK_UNIT_ID_PATTERN),
  queue_item_id: z.string().min(1),
  kind: z.string().min(1),
  receipt_nonce: z.string().min(16),
  summary: z.string().default(''),
  output_files: z.array(z.object({
    path: z.string().min(1),
    role: z.string().min(1),
    source_url: z.string().url().optional(),
    source_slug: z.string().min(1).optional(),
  })).default([]),
  source_claims: z.array(WorkUnitSourceClaimSchema).default([]),
  accepted_source_urls: z.array(z.string().url()).default([]),
  cache_trails: z.array(z.string().min(1)).default([]),
}).strict();

export const WorkUnitLedgerRecordSchema = z.object({
  declared_at: z.string().datetime(),
  work_id: z.string().regex(WORK_UNIT_ID_PATTERN),
  queue_item_id: z.string().min(1),
  wave: z.number().int().nonnegative(),
  kind: z.string().min(1),
  producer_rule: z.string().min(1),
  creation_reason: z.string().min(1),
  work_unit_ref: z.string().min(1),
  result_ref: z.string().min(1),
  runtime_receipt_ref: z.string().min(1),
  receipt_nonce: z.string().min(16),
  output_files: WorkUnitResultSchema.shape.output_files,
  source_claims: WorkUnitResultSchema.shape.source_claims,
  accepted_source_urls: WorkUnitResultSchema.shape.accepted_source_urls,
  cache_trails: WorkUnitResultSchema.shape.cache_trails,
  result_hash: z.string().min(1),
  ledger_record_hash: z.string().min(1),
}).strict();

export const WorkUnitTimeoutRecommendedAction = z.enum(['submit', 'repair', 'wait', 'timeout', 'inspect', 'block']);

export const WorkUnitTimeoutProgressSourceSchema = z.object({
  source_type: z.enum(['result_file', 'receipt_file', 'output_file', 'cache_leaf', 'engine_event']),
  observed_at: z.string().datetime().nullable().default(null),
  path_ref: z.string().min(1).nullable().optional(),
  event_ref: z.string().min(1).nullable().optional(),
  identity_verified: z.boolean(),
  extends_idle_lease: z.boolean(),
  suspicious_timestamp: z.boolean().default(false),
}).strict();

export const WorkUnitTimeoutProgressSchema = z.object({
  latest_engine_observed_progress_at: z.string().datetime().nullable().default(null),
  candidate_result_present: z.boolean().default(false),
  receipt_nonempty: z.boolean().default(false),
  output_or_cache_progress: z.boolean().default(false),
  dry_submit_expected: z.enum(['pass', 'fail', 'not_run']).default('not_run'),
  sources: z.array(WorkUnitTimeoutProgressSourceSchema).default([]),
}).strict();

export const WorkUnitTimeoutPreflightSchema = z.object({
  ok: z.boolean(),
  work_id: z.string().min(1),
  queue_item_id: z.string().min(1).nullable().default(null),
  status: z.union([WorkUnitStatus, z.literal('unknown')]),
  timeout_eligible: z.boolean(),
  check: z.boolean(),
  recommended_action: WorkUnitTimeoutRecommendedAction,
  initial_deadline_at: z.string().datetime().nullable().default(null),
  lease_anchor_at: z.string().datetime().nullable().default(null),
  idle_timeout_ms: z.number().int().positive().nullable().default(null),
  effective_timeout_at: z.string().datetime().nullable().default(null),
  progress: WorkUnitTimeoutProgressSchema,
  inspect: z.array(z.string()).default([]),
  advice: z.array(z.string()).default([]),
}).strict().superRefine((data, ctx) => {
  if (data.timeout_eligible !== data.check) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['check'],
      message: 'check must equal timeout_eligible',
    });
  }
});
