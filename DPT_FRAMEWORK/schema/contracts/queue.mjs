// @impl SCO-002, SCO-009: QueueSchema + QueueWorkUnitSchema for rb_queue.json
import { z } from 'zod';
import { QueueHealth, StopAuthorizationState } from '../enums.mjs';

// ─── Queue-specific enums ────────────────────────────────────────────────

const Target = z.enum(['main-agent', 'sub-agent', 'engine']);
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
  target: Target,
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
  completion_receipt: z.string(),
  failure_route: z.string().min(1),
  status: ItemStatus.default('queued'),
  preempted_from_slot: z.string().default('not_applicable'),
  restore_priority: RestorePriority.default('normal'),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  payload: JsonObject,
});

// ─── QueueSchema ─────────────────────────────────────────────────────────

const QueueSlot = QueueWorkUnitSchema.nullable();

/** @impl SCO-002, SCO-009 */
export const QueueSchema = z.object({
  queue_health: QueueHealth,
  stop_authorization_state: StopAuthorizationState,
  slot_1_current: QueueSlot,
  slot_2_next: QueueSlot,
  slot_3_pending: QueueSlot,
  slot_4_pending: QueueSlot,
  slot_5_tail: QueueSlot,
  refill_pool: z.array(QueueWorkUnitSchema),
});
