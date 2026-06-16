// @impl SCO-002: StatusSchema for rb_status.json
import { z } from 'zod';
import { RunState, CurrentGate } from '../enums.mjs';

export const StatusSchema = z.object({
  current_mode: z.literal('execution'),
  state: RunState,
  current_gate: CurrentGate,
  next_gate: CurrentGate,
});
