// @impl RRM-007, CTS-005

import { CanonicalPlanSchema } from '../../schema/contracts/plan.mjs';
import { readBundlePlan } from './gate-helpers-readers.mjs';
import { evaluateTopicLayouts } from './topic-layout.mjs';

export function buildCanonicalTopicRegistryFact(bundlePath) {
  const plan = readBundlePlan(bundlePath);
  const parsed = CanonicalPlanSchema.safeParse(plan);
  if (!parsed.success) {
    throw new Error(`canonical topic_registry invalid: ${parsed.error.issues.map((issue) => `${issue.path.join('.') || '<root>'} ${issue.message}`).join(', ')}`);
  }
  const topicRegistry = parsed.data.topic_registry;
  return {
    topic_registry: topicRegistry,
    layouts: evaluateTopicLayouts(topicRegistry),
    wave_layouts: topicRegistry.map((topic) => ({
      topic: topic.slug,
      accepted: [topic.slug, ...(topic.previous_layouts || []).map((layout) => layout.slug)],
    })),
  };
}
