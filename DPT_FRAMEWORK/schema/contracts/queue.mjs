// @impl SCO-002: QueueSchema for rb_queue.json
import { z } from 'zod';
import { QueueHealth, StopAuthorizationState } from '../enums.mjs';

// Skeleton: slots are null. TODO: QueueWorkUnitSchema when queue engine lands.
const QueueSlot = z.null();

export const QueueSchema = z.object({
  queue_health: QueueHealth,
  stop_authorization_state: StopAuthorizationState,
  slot_1_current: QueueSlot,
  slot_2_next: QueueSlot,
  slot_3_pending: QueueSlot,
  slot_4_pending: QueueSlot,
  slot_5_tail: QueueSlot,
  refill_pool: z.array(z.unknown()), // TODO: z.array(QueueWorkUnitSchema)
});
