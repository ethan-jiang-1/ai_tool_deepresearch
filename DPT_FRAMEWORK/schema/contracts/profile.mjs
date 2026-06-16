// @impl SCO-002: ProfileSchema for rb_profile.yaml
import { z } from 'zod';
import { ResearchProfile } from '../enums.mjs';

export const ProfileSchema = z.object({
  plan_basename: z.string(),
  research_profile: ResearchProfile,
  root_must_answer_set: z.array(z.string()),
  human_decision_checkpoints: z.object({
    hitl1: z.object({ status: z.literal('recorded') }),
    hitl2: z.object({ status: z.literal('not_started') }),
  }),
});
