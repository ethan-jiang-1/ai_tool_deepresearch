// Pure research-style parameter projection.
// @impl RES-001, RES-002

import { ResearchStyleParamsSchema } from '../../schema/contracts/profile.mjs';

export function computeResearchStyleParams({ styleDefinition, topicCount } = {}) {
  if (styleDefinition === null || typeof styleDefinition !== 'object' || Array.isArray(styleDefinition)) {
    throw new TypeError('styleDefinition must be a parsed object');
  }
  if (!Number.isInteger(topicCount) || topicCount < 0) {
    throw new TypeError('topicCount must be a nonnegative integer');
  }
  const sharedRef = styleDefinition.wave0_shared_ref;
  if (sharedRef === null || typeof sharedRef !== 'object' || Array.isArray(sharedRef)
    || typeof sharedRef.base !== 'number' || !Number.isFinite(sharedRef.base)
    || typeof sharedRef.per_topic !== 'number' || !Number.isFinite(sharedRef.per_topic)) {
    throw new TypeError('styleDefinition wave0_shared_ref must contain finite numeric base and per_topic values');
  }

  return ResearchStyleParamsSchema.parse({
    user_visible: styleDefinition.user_visible,
    wave0_per_topic_source_floor: styleDefinition.wave0_per_topic_source_floor,
    wave0_shared_ref_total: sharedRef.base + sharedRef.per_topic * topicCount,
    wave1_per_topic_ref_floor: styleDefinition.wave1_per_topic_ref_floor,
    topic_unique_ratio: styleDefinition.topic_unique_ratio,
    counterexample_search: styleDefinition.counterexample_search,
    cross_verification: styleDefinition.cross_verification,
    p0p1_independent_backing: styleDefinition.p0p1_independent_backing,
    quality_min_tier: styleDefinition.quality_min_tier,
    quality_min_substance: styleDefinition.quality_min_substance,
    wave2_cross_topic_depth: styleDefinition.wave2_cross_topic_depth,
    wave2_emergent_search_rounds: styleDefinition.wave2_emergent_search_rounds,
  });
}
