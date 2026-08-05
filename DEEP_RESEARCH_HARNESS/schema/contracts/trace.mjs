// @impl SCO-002: TraceSchema for rb_trace.jsonl
// @impl TRW-002: TraceEntrySchema validates events written by DEEP_RESEARCH_HARNESS/engine/trace.mjs
import { z } from 'zod';

export const TraceEntrySchema = z.object({
  ts: z.string(),
  event: z.string(),
}).passthrough();

export const TraceSchema = z.array(TraceEntrySchema);
