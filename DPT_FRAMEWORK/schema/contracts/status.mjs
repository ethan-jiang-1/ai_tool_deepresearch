// @impl SCO-002: StatusSchema for rb_status.json
import { z } from 'zod';
import { RunState, CurrentGate } from '../enums.mjs';

export const StatusSchema = z.object({
  bundle: z.string().optional(),
  current_mode: z.literal('execution'),
  state: RunState,
  current_gate: CurrentGate,
  next_gate: CurrentGate,
  current_node: z.union([
    z.string().regex(/^(?!.*(?:^|\/)\.{1,2}(?:\/|$))[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)+\.md$/),
    z.null(),
  ]).optional(),
}).passthrough();
