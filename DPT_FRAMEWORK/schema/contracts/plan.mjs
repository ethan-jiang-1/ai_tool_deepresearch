// @impl SCO-002, SCO-013: PlanSchema for rb_plan.md frontmatter
import { z } from 'zod';

const PlanBaseSchema = z.object({
  plan_basename: z.string(),
  derived_topic_count: z.number().min(0),
});

export const LegacyTopicEntrySchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
}).passthrough();

export const PreviousTopicLayoutSchema = z.object({
  id: z.string(),
  slug: z.string(),
}).strict();

export const CanonicalTopicEntrySchema = z.object({
  topic_uid: z.string().regex(/^tp_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i),
  id: z.string(),
  slug: z.string(),
  title: z.string().min(1),
  must_answer: z.array(z.string().min(1)).min(1).refine((items) => new Set(items).size === items.length, 'must_answer values must be unique'),
  scope_role: z.enum(['primary', 'synthesis', 'comparison', 'supporting']),
  depends_on_topic_uids: z.array(z.string()).refine((items) => new Set(items).size === items.length, 'dependency UIDs must be unique'),
  previous_layouts: z.array(PreviousTopicLayoutSchema).default([]),
}).strict();

export const LegacyPlanSchema = PlanBaseSchema.extend({
  topic_registry_version: z.string().optional().refine((value) => value !== '2', 'legacy plan cannot use canonical version marker'),
  topic_registry: z.array(LegacyTopicEntrySchema),
}).passthrough().superRefine((plan, context) => {
  if (plan.derived_topic_count !== plan.topic_registry.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['derived_topic_count'], message: 'derived_topic_count must equal topic_registry length' });
  }
});

export const CanonicalPlanSchema = PlanBaseSchema.extend({
  topic_registry_version: z.literal('2'),
  topic_registry: z.array(CanonicalTopicEntrySchema),
}).passthrough().superRefine((plan, context) => {
  if (plan.derived_topic_count !== plan.topic_registry.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['derived_topic_count'], message: 'derived_topic_count must equal topic_registry length' });
  }
  const uids = new Set(plan.topic_registry.map((topic) => topic.topic_uid));
  if (uids.size !== plan.topic_registry.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ['topic_registry'], message: 'topic_uid values must be unique' });
  const slugOwners = new Map();
  plan.topic_registry.forEach((topic, index) => {
    const layouts = [{ slug: topic.slug, path: ['topic_registry', index, 'slug'] }, ...topic.previous_layouts.map((layout, layoutIndex) => ({ slug: layout.slug, path: ['topic_registry', index, 'previous_layouts', layoutIndex, 'slug'] }))];
    for (const layout of layouts) {
      if (slugOwners.has(layout.slug)) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: layout.path, message: `topic layout slug must be globally unique: ${layout.slug}` });
      } else {
        slugOwners.set(layout.slug, topic.topic_uid);
      }
    }
    for (const dependency of topic.depends_on_topic_uids) {
      if (dependency === topic.topic_uid) context.addIssue({ code: z.ZodIssueCode.custom, path: ['topic_registry', index, 'depends_on_topic_uids'], message: 'topic cannot depend on itself' });
      else if (!uids.has(dependency)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['topic_registry', index, 'depends_on_topic_uids'], message: `unknown dependency UID: ${dependency}` });
    }
  });
});

export const PlanSchema = z.union([CanonicalPlanSchema, LegacyPlanSchema]);
