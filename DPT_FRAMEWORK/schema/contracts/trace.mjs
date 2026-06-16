// @impl SCO-002: TraceSchema for rb_trace.jsonl
import { z } from 'zod';
import { CurrentGate } from '../enums.mjs';

export const TraceEntrySchema = z.object({
  timestamp: z.string(),
  gate_transition: CurrentGate.nullable(),
  evidence_bundle: z.string(),
  queue_consequence: z.string(),
  status_pointer_sync: z.string(),
  continuation_action_started: z.string().optional(),
});

export const TraceSchema = z.array(TraceEntrySchema);
