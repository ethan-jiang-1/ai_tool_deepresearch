// @impl SCO-002, SCO-009: QueueSchema + QueueWorkUnitSchema for rb_queue.json
import { z } from 'zod';
import { QueueHealth, StopAuthorizationState } from '../enums.mjs';
import { SLOT_NAMES } from './queue-slots.mjs';

// ─── Queue-specific enums ────────────────────────────────────────────────

const TargetSpecSchema = z.object({
  controller: z.enum(['main-agent', 'engine']),
  delegates: z.object({
    to: z.literal('sub-agent'),
    role_key: z.string().min(1),
    timeout_ms: z.number().int().positive().default(600000),
  }).optional(),
});

const ItemStatus = z.enum(['queued', 'running', 'done', 'failed', 'blocked']);
const PriorityClass = z.enum([
  'P0_preempted_restore',
  'P1_state_or_gate_repair',
  'P2_close_open_loop',
  'P3_current_gate_gap',
  'P4_progressive_artifact_or_seed_backfill',
  'P5_new_reference_intake',
  'P6_topology_triage',
]);
const RestorePriority = z.enum(['normal', 'next_tail_opening']);
const JsonObject = z.record(z.string(), z.unknown());

// ─── QueueWorkUnitSchema ─────────────────────────────────────────────────

/**
 * A single work unit in the agentic queue.
 *
 * Validated by agentic-queue prototype experiments; promoted to the
 * production schema contract.
 *
 * @impl SCO-009
 */
export const QueueWorkUnitSchema = z.object({
  work_id: z.string().min(1),
  title: z.string().min(1),
  targets: TargetSpecSchema,
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
  preempted_from_slot: z.string().default('not_applicable'),
  restore_priority: RestorePriority.default('normal'),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  payload: JsonObject,
}).superRefine((data, ctx) => {
  // AGQ-001: completion_receipt property is required (missing = reject)
  // AGQ-004: null is valid ONLY when required_receipts is empty
  if (data.completion_receipt === null && data.required_receipts.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['completion_receipt'],
      message: 'completion_receipt can only be null when required_receipts is empty. Non-empty required_receipts require a concrete completion_receipt.',
    });
  }
});

// ─── QueueSchema ─────────────────────────────────────────────────────────

const QueueSlot = QueueWorkUnitSchema.nullable();

export { TargetSpecSchema };

/** @impl SCO-002, SCO-009, QIV-002 */
export const QueueSchema = z.object({
  bundle_name: z.string().nullable().optional(),
  queue_health: QueueHealth,
  stop_authorization_state: StopAuthorizationState,
  ...Object.fromEntries(SLOT_NAMES.map((slot) => [slot, QueueSlot])),
  refill_pool: z.array(QueueWorkUnitSchema),
});
