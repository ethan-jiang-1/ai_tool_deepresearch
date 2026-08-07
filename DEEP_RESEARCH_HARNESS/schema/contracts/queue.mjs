// @impl AGQ-001, AGQ-005, AGQ-017, AGQ-019, AGQ-020, AGQ-026, SCO-009
import { z } from 'zod';
import { QueueHealth, StopAuthorizationState } from '../enums.mjs';
import {
  WORK_UNIT_ID_PATTERN,
  WorkUnitSupersessionRootSchema,
} from './work-unit.mjs';

export const QUEUE_ACTIVE_WINDOW_LIMIT = 20;
export const QUEUE_SCHEMA_VERSION = 'queue.v2';

const JsonObject = z.record(z.string(), z.unknown());
const REPLACEMENT_LINEAGE_FIELDS = [
  'replacement_of_work_id',
  'replacement_of_queue_item_id',
  'replacement_terminal_status',
  'replacement_terminal_reason',
  'replacement_queue_item_snapshot_hash',
];
export const WORK_UNIT_SUPERSESSION_LINEAGE_FIELDS = Object.freeze([
  'supersession_of_work_id',
  'supersession_of_queue_item_id',
  'supersession_accepted_ledger_record_hash',
  'supersession_root',
  'supersession_tx_id',
]);
const SUPERSESSION_RELATION_ONLY_FIELDS = [
  'schema_version',
  'predecessor_work_id',
  'predecessor_queue_item_id',
  'accepted_ledger_record_hash',
  'root_code',
  'reason',
  'recorded_at',
  'tx_id',
  'successor_queue_item_id',
];

export const WorkUnitSupersessionQueueLineageSchema = z.object({
  supersession_of_work_id: z.string().regex(WORK_UNIT_ID_PATTERN),
  supersession_of_queue_item_id: z.string().trim().min(1),
  supersession_accepted_ledger_record_hash: z.string().regex(/^[a-f0-9]{64}$/),
  supersession_root: WorkUnitSupersessionRootSchema,
  supersession_tx_id: z.string().trim().min(1),
}).strict();

export const TargetSpecSchema = z.object({
  controller: z.enum(['main-agent', 'engine']),
  delegates: z.object({
    to: z.literal('sub-agent'),
    role_key: z.string().min(1),
    timeout_ms: z.number().int().positive().default(600000),
  }).optional(),
});

export const ItemStatus = z.enum(['queued', 'running', 'done', 'failed', 'blocked']);
export const PriorityClass = z.enum([
  'P0_preempted_restore',
  'P1_state_or_gate_repair',
  'P2_close_open_loop',
  'P3_current_gate_gap',
  'P4_progressive_artifact_or_seed_backfill',
  'P5_new_reference_intake',
  'P6_topology_triage',
]);
export const RestorePriority = z.enum(['normal', 'next_tail_opening']);

export const QueueDemandItemSchema = z.object({
  queue_item_id: z.string().min(1),
  title: z.string().min(1),
  targets: TargetSpecSchema,
  kind: z.string().min(1).optional(),
  action: z.string().min(1),
  producer_rule: z.string().min(1),
  lineage: JsonObject,
  priority_class: PriorityClass,
  required_receipts: z.array(z.string()),
  done_condition: z.string().min(1),
  verification: z.object({
    engine: z.array(z.string()).default([]),
    agent: z.array(z.string()).default([]),
  }),
  writes_to: z.array(z.string()),
  status_sync: z.array(z.string()),
  completion_receipt: z.string().nullable(),
  failure_route: z.string().min(1),
  status: ItemStatus.default('queued'),
  restore_priority: RestorePriority.default('normal'),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  payload: JsonObject,
}).passthrough().superRefine((data, ctx) => {
  if (Object.prototype.hasOwnProperty.call(data, 'work_id')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['work_id'],
      message: 'Queue demand identity is queue_item_id; work_id is reserved for Engine-allocated delegated work-unit attempts.',
    });
  }
  if (data.completion_receipt === null && data.required_receipts.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['completion_receipt'],
      message: 'completion_receipt can only be null when required_receipts is empty. Non-empty required_receipts require a concrete completion_receipt.',
    });
  }
  const replacementFieldsPresent = REPLACEMENT_LINEAGE_FIELDS
    .filter((field) => Object.hasOwn(data.lineage || {}, field));
  if (replacementFieldsPresent.length > 0) {
    for (const field of REPLACEMENT_LINEAGE_FIELDS) {
      if (typeof data.lineage?.[field] !== 'string' || data.lineage[field].trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['lineage', field],
          message: `replacement lineage requires non-empty ${field}`,
        });
      }
    }
    if (!['failed', 'abandoned'].includes(data.lineage.replacement_terminal_status)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['lineage', 'replacement_terminal_status'],
        message: 'replacement_terminal_status must be failed or abandoned',
      });
    }
  }
  const supersessionFieldsPresent = WORK_UNIT_SUPERSESSION_LINEAGE_FIELDS
    .filter((field) => Object.hasOwn(data.lineage || {}, field));
  if (supersessionFieldsPresent.length > 0) {
    const lineage = Object.fromEntries(WORK_UNIT_SUPERSESSION_LINEAGE_FIELDS.map((field) => [field, data.lineage?.[field]]));
    const parsed = WorkUnitSupersessionQueueLineageSchema.safeParse(lineage);
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => ctx.addIssue({
        ...issue,
        path: ['lineage', ...issue.path],
      }));
    }
    for (const field of SUPERSESSION_RELATION_ONLY_FIELDS) {
      if (Object.hasOwn(data.lineage, field)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['lineage', field],
          message: `${field} belongs to the index supersession relation, not queue lineage`,
        });
      }
    }
  }
});

export const DelegatedInFlightSchema = z.object({
  queue_item_id: z.string().min(1),
  work_id: z.string().min(1),
  wave: z.number().int().nonnegative(),
  kind: z.string().min(1),
  batch_id: z.string().min(1).default('b000'),
  attempt_index: z.number().int().nonnegative().default(1),
  queue_item_snapshot_hash: z.string().min(1),
  claimed_at: z.string().datetime(),
  timeout_ms: z.number().int().positive(),
  deadline_at: z.string().datetime(),
  last_observed_at: z.string().datetime().optional(),
});

export const QueueTerminalHistoryRecordSchema = z.object({
  queue_item_id: z.string().min(1),
  terminal_status: z.enum(['done', 'failed', 'blocked', 'cancelled']).default('done'),
  completed_at: z.string().datetime().optional(),
  work_id: z.string().min(1).optional(),
  reason: z.string().optional(),
  item: QueueDemandItemSchema.optional(),
  failure_disposition: z.enum(['terminal_no_successor']).optional(),
}).passthrough().superRefine((record, ctx) => {
  if (record.failure_disposition === undefined) return;
  if (record.terminal_status !== 'failed') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['terminal_status'],
      message: 'failure_disposition is valid only for failed terminal-history rows',
    });
  }
  if (!record.item) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['item'],
      message: 'failure_disposition requires the stored original Queue item',
    });
  } else if (record.item.targets?.delegates?.to === 'sub-agent') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['item', 'targets', 'delegates'],
      message: 'failure_disposition is not valid for delegated Queue demand',
    });
  } else if (record.item.status !== 'failed') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['item', 'status'],
      message: 'failure_disposition requires the stored Queue item to be failed',
    });
  }
  if (typeof record.reason !== 'string' || record.reason.trim() === '') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['reason'],
      message: 'failure_disposition requires a non-empty terminal reason',
    });
  }
});

function collectQueueLocations(data) {
  const locations = [];
  for (const item of data.active_window || []) locations.push(['active_window', item.queue_item_id]);
  for (const item of data.refill_pool || []) locations.push(['refill_pool', item.queue_item_id]);
  for (const [key, value] of Object.entries(data.delegated_in_flight || {})) {
    locations.push(['delegated_in_flight', key]);
    if (value?.queue_item_id && value.queue_item_id !== key) {
      locations.push(['delegated_in_flight_value', value.queue_item_id]);
    }
  }
  for (const record of data.terminal_history || []) {
    if (record?.queue_item_id) locations.push(['terminal_history', record.queue_item_id]);
  }
  return locations;
}

export const QueueSchema = z.object({
  schema_version: z.literal(QUEUE_SCHEMA_VERSION).default(QUEUE_SCHEMA_VERSION),
  bundle_name: z.string().nullable().optional(),
  queue_health: QueueHealth,
  stop_authorization_state: StopAuthorizationState,
  active_window: z.array(QueueDemandItemSchema).default([]),
  refill_pool: z.array(QueueDemandItemSchema).default([]),
  delegated_in_flight: z.record(z.string(), DelegatedInFlightSchema).default({}),
  terminal_history: z.array(QueueTerminalHistoryRecordSchema).default([]),
}).strict().superRefine((data, ctx) => {
  for (const [key, value] of Object.entries(data.delegated_in_flight || {})) {
    if (value.queue_item_id !== key) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['delegated_in_flight', key, 'queue_item_id'],
        message: `delegated_in_flight key ${key} must match queue_item_id ${value.queue_item_id}`,
      });
    }
  }

  const seen = new Map();
  for (const [location, queueItemId] of collectQueueLocations(data)) {
    if (seen.has(queueItemId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [location],
        message: `queue_item_id ${queueItemId} appears in both ${seen.get(queueItemId)} and ${location}`,
      });
    } else {
      seen.set(queueItemId, location);
    }
  }
});
