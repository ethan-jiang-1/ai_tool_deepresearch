// @impl SCO-002, SCO-008, SCO-011: ProfileSchema for rb_profile.yaml
import { z } from 'zod';
import {
  ResearchProfile,
  HumanCheckpointStatus,
  AnswerabilityClass,
  HITL2UserDecision,
  FinalReportView,
  ResearchAccessSourceGroup,
  ResearchAccessSampleId,
  ResearchAccessSampleOutcome,
  ResearchAccessRetrievalSurface,
} from '../enums.mjs';

const TrimmedNonEmptyString = z.string().trim().min(1);
const IsoTimestamp = z.string().datetime({ offset: true });
const ReservedCompositionText = new Set(['unknown', 'not_started', 'rationale']);

const CompositionText = TrimmedNonEmptyString.superRefine((value, context) => {
  const normalized = value.toLowerCase();
  if (ReservedCompositionText.has(normalized) || /^(?:read|recover|infer|derive)(?:\s+the)?(?:\s+value)?\s+from\s+rationale$/i.test(value)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Composition text must contain resolved meaning rather than a sentinel or rationale fallback.',
    });
  }
});

const CanonicalLanguageTag = CompositionText.transform((value, context) => {
  try {
    const [canonical] = Intl.getCanonicalLocales(value);
    if (!canonical) throw new RangeError('missing canonical language tag');
    return canonical;
  } catch {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Delivery language must be a valid BCP 47 language tag.',
    });
    return z.NEVER;
  }
});

const CompositionPriorityListSchema = z.array(CompositionText).superRefine((values, context) => {
  const seen = new Set();
  for (const [index, value] of values.entries()) {
    if (seen.has(value)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index],
        message: 'Composition priorities must be unique after trimming.',
      });
    }
    seen.add(value);
  }
});

// @impl SCO-002, SCO-008, SCO-011: durable HITL2-to-Final composition contract
export const CompositionHandoffSchema = z.object({
  contract_version: z.literal(1),
  for_rerun_count: z.number().int().min(0),
  reader: z.object({
    description: CompositionText,
    familiarity: z.enum(['general', 'working', 'expert', 'mixed']),
  }).strict(),
  intended_use: CompositionText,
  primary_focus: CompositionText,
  content_priorities: z.object({
    foreground: CompositionPriorityListSchema,
    compress: CompositionPriorityListSchema,
  }).strict(),
  delivery: z.object({
    language: CanonicalLanguageTag,
    length: z.enum(['concise', 'standard', 'detailed']),
    evidence_exposure: z.enum(['key_evidence', 'balanced', 'audit_ready']),
    appendix: z.enum(['none', 'as_needed', 'required']),
  }).strict(),
  view_instructions: CompositionText.optional(),
}).strict();
const UnprobedResearchAccessSchema = z.object({
  status: z.literal('unprobed'),
}).strict();

const DirectSampleGroupById = Object.freeze({
  gov_cn: 'china',
  gitee: 'china',
  xinhuanet: 'china',
  cnki_catalog: 'china',
  wikipedia: 'overseas',
  github: 'overseas',
  iana: 'overseas',
  arxiv: 'overseas',
  rfc_editor: 'overseas',
});

const CoreDirectSampleIds = new Set([
  'gov_cn',
  'gitee',
  'xinhuanet',
  'wikipedia',
  'github',
  'iana',
  'arxiv',
]);

const DirectSampleObservationSchema = z.discriminatedUnion('outcome', [
  z.object({
    sample_id: ResearchAccessSampleId,
    source_group: ResearchAccessSourceGroup,
    outcome: z.literal('content'),
    retrieval_surface: ResearchAccessRetrievalSurface,
  }).strict(),
  ...ResearchAccessSampleOutcome.options
    .filter((outcome) => outcome !== 'content')
    .map((outcome) => z.object({
      sample_id: ResearchAccessSampleId,
      source_group: ResearchAccessSourceGroup,
      outcome: z.literal(outcome),
    }).strict()),
]);

const CurrentDirectObservationBase = z.object({
  probed_at: IsoTimestamp,
  sample_observations: z.array(DirectSampleObservationSchema)
    .length(ResearchAccessSampleId.options.length),
});

const CurrentDirectObservationSchema = z.union([
  CurrentDirectObservationBase.extend({
    status: z.literal('available'),
  }).strict(),
  CurrentDirectObservationBase.extend({
    status: z.literal('unavailable'),
    reason: TrimmedNonEmptyString,
  }).strict(),
]).superRefine((value, ctx) => {
  const seen = new Set();
  let hasCoreContent = false;
  let notAttemptedCount = 0;

  for (const [index, observation] of value.sample_observations.entries()) {
    if (seen.has(observation.sample_id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sample_observations', index, 'sample_id'],
        message: 'Direct-sample observation cannot contain duplicate sample IDs.',
      });
    }
    seen.add(observation.sample_id);

    if (DirectSampleGroupById[observation.sample_id] !== observation.source_group) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sample_observations', index, 'source_group'],
        message: 'Direct-sample observation source group must match its declared sample ID.',
      });
    }
    if (observation.outcome === 'content' && CoreDirectSampleIds.has(observation.sample_id)) {
      hasCoreContent = true;
    }
    if (observation.outcome === 'not_attempted') notAttemptedCount += 1;
  }

  for (const sampleId of ResearchAccessSampleId.options) {
    if (!seen.has(sampleId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sample_observations'],
        message: `Direct-sample observation must include declared sample '${sampleId}'.`,
      });
    }
  }

  if (value.status === 'available' && !hasCoreContent) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['status'],
      message: 'Available direct observation requires content from a non-diagnostic core sample.',
    });
  }
  if (value.status === 'unavailable' && hasCoreContent) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['status'],
      message: 'Unavailable direct observation cannot contain content from a non-diagnostic core sample.',
    });
  }
  if (notAttemptedCount > 0 && notAttemptedCount !== ResearchAccessSampleId.options.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['sample_observations'],
      message: 'not_attempted is reserved for a whole probe that started no direct page request.',
    });
  }
  if (notAttemptedCount === ResearchAccessSampleId.options.length && value.status !== 'unavailable') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['status'],
      message: 'A whole no-request direct observation must be unavailable.',
    });
  }
});

const ResearchAccessSchema = z.union([
  UnprobedResearchAccessSchema,
  CurrentDirectObservationSchema,
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
  delegated_concurrency_cap: z.number().int().min(1).max(20).default(12),
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
      composition_handoff: CompositionHandoffSchema.optional(),
    }),
  }),
});
