// @impl SCO-002: PlanSchema for rb_plan.md frontmatter
import { z } from 'zod';

export const PlanSchema = z.object({
  plan_basename: z.string(),
  derived_topic_count: z.number().min(0),
  topic_registry: z.array(
    z.object({
      id: z.string(),
      slug: z.string(),
      title: z.string(),
    })
  ),
});
