import { z } from 'zod';

export const PlaybookFrontmatterSchema = z.object({
  schema: z.literal('command-experiment/v1'),
  experiment: z.string().min(1),
  case: z.string().min(1),
  weight: z.enum(['light', 'standard', 'heavy']),
  case_goal: z.string().min(1),
  runner: z.string().min(1),
  execution: z.literal('real-bundle'),
  evidence: z.literal('filesystem-and-trace'),
  bundle: z.string().min(1),
  trace: z.string().min(1),
  verdict: z.enum(['trace-jsonl', 'filesystem']),

  // Optional fields
  req: z.string().optional(),
  agent_mode: z.string().optional(),
  agent_dependency: z.string().optional(),
}).passthrough();
