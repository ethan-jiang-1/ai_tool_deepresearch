// @impl SCO-002: TraceSchema for rb_trace.jsonl
// @impl TRW-002: TraceEntrySchema validates events written by DEEP_RESEARCH_HARNESS/engine/trace.mjs
// @impl TRW-007: optional writer identity + bundle (canonical directory basename) fields,
// stamped by the unified trace writers; optional for backward-compatible parsing of
// pre-change historical events (e.g. engine wave0_completion without writer).
import { z } from 'zod';

export const TraceEntrySchema = z.object({
  ts: z.string(),
  event: z.string(),
  writer: z.string().trim().min(1).optional(),
  bundle: z.string().trim().min(1).optional(),
}).passthrough();

export const TraceSchema = z.array(TraceEntrySchema);
