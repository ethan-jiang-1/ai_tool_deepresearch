// @impl SCO-002, SCO-008: ProfileSchema for rb_profile.yaml
import { z } from 'zod';
import { ResearchProfile, HumanCheckpointStatus, AnswerabilityClass, HITL2UserDecision, FinalReportView } from '../enums.mjs';

const TrimmedNonEmptyString = z.string().trim().min(1);
const IsoTimestamp = z.string().datetime({ offset: true });
const HttpUrl = z.string().url().refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === 'http:' || protocol === 'https:';
}, 'Expected an HTTP(S) URL');

const ResearchAccessSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('unprobed'),
  }).strict(),
  z.object({
    status: z.literal('available'),
    probed_at: IsoTimestamp,
    result_url: HttpUrl,
    fetch_outcome: z.literal('success'),
    search_surface: TrimmedNonEmptyString.optional(),
    fetch_surface: TrimmedNonEmptyString.optional(),
  }).strict(),
  z.object({
    status: z.literal('unavailable'),
    probed_at: IsoTimestamp,
    fetch_outcome: z.enum(['failed', 'blocked', 'not_attempted']),
    reason: TrimmedNonEmptyString,
    result_url: HttpUrl.optional(),
    search_surface: TrimmedNonEmptyString.optional(),
    fetch_surface: TrimmedNonEmptyString.optional(),
  }).strict(),
]);

// @impl RES-002: Research style params schema (13 fields)
export const ResearchStyleParamsSchema = z.object({
  user_visible: z.boolean(),
  // Wave0
  wave0_per_topic_source_floor: z.number().int().positive(),
  wave0_shared_ref_total: z.number().int().nonnegative(), // computed by apply-research-style.mjs: base + per_topic × topic_count
  // Wave1
  wave1_per_topic_ref_floor: z.number().int().positive(),
  topic_unique_ratio: z.number().min(0).max(1),
  counterexample_search: z.boolean(),
  cross_verification: z.boolean(),
  // Wave2 — quality
  p0p1_independent_backing: z.number().int().positive(),
  quality_min_tier: z.enum(['tier_1', 'tier_2', 'tier_3', 'tier_4']),
  quality_min_substance: z.enum(['substantive', 'thin', 'none']),
  // Wave2 — behavior
  wave2_cross_topic_depth: z.number().int().nonnegative(),
  wave2_emergent_search_rounds: z.number().int().nonnegative(),
});

export const ProfileSchema = z.object({
  plan_basename: z.string(),
  research_profile: ResearchProfile,
  root_must_answer_set: z.array(z.string()),
  research_style_params: ResearchStyleParamsSchema.nullable().optional(),
  research_access: ResearchAccessSchema.optional(),
  human_decision_checkpoints: z.object({
    hitl1: z.object({
      status: HumanCheckpointStatus,
      recorded_at: z.string().optional(),
    }),
    hitl2: z.object({
      status: HumanCheckpointStatus,
      answerability_class: AnswerabilityClass,
      user_decision: HITL2UserDecision,
      final_report_view: FinalReportView,
      custom_slug: z.string().optional(),
      rerun_count: z.number().int().min(0).default(0).optional(),
      rationale: z.string().optional(),
    }),
  }),
});
