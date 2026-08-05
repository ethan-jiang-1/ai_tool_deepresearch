import { z } from 'zod';

export const POST_FINAL_RECOVERY_SCHEMA_VERSION = '1.0.0';
export const PostFinalDigestSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const PostFinalOperationIdSchema = z.string().uuid();
export const PostFinalBundleIdentitySchema = z.object({
  status_bundle: z.string().min(1),
  plan_basename: z.string().min(1),
  normalized_bundle_basename: z.string().min(1),
}).strict();
export const PostFinalRerunGuardSchema = z.object({
  rule_id: z.literal('rerun_count_valid'),
  definition_sha256: PostFinalDigestSchema,
  current_count: z.number().int().min(0),
  next_count: z.number().int().positive(),
  limit: z.number().int().positive(),
}).strict();
export const PostFinalExpectedLineageSchema = z.object({
  final_handoff_index: z.number().int().nonnegative(),
  final_load_index: z.number().int().nonnegative(),
  status_sha256: PostFinalDigestSchema,
  profile_sha256: PostFinalDigestSchema,
  final_inventory_sha256: PostFinalDigestSchema,
  rerun_guard: PostFinalRerunGuardSchema,
}).strict();
export const PostFinalRoutingSchema = z.object({
  source_node: z.literal('phases/phase-hitl2.md'),
  outcome: z.literal('rerun'),
  target_node: z.string().min(1),
  source_gate_enum: z.literal('hitl2_recorded'),
  target_gate_enum: z.string().min(1),
  transition_table_sha256: PostFinalDigestSchema,
}).strict();
export const PostFinalRecoveryEventSchema = z.object({
  ts: z.string().datetime(),
  bundle: z.string().min(1),
  event: z.literal('post_final_reentry'),
  schema_version: z.literal(POST_FINAL_RECOVERY_SCHEMA_VERSION),
  action: z.literal('post_final_rerun'),
  operation_id: PostFinalOperationIdSchema,
  event_id: z.string().min(1),
  request_sha256: PostFinalDigestSchema,
  reason: z.string().min(1),
  requested_scope: z.string().min(1),
  decision_checkpoint: z.literal('hitl2'),
  decision: z.literal('rerun'),
  decision_source: z.literal('explicit_post_final_request'),
  execution_actor: z.literal('phase_agent'),
  logical_bundle_identity: PostFinalBundleIdentitySchema,
  previous_final: PostFinalExpectedLineageSchema.omit({ rerun_guard: true }),
  previous_profile_semantics: z.record(z.string(), z.unknown()),
  committed_after_profile_sha256: PostFinalDigestSchema,
  committed_after_profile_semantics: z.record(z.string(), z.unknown()),
  routing: PostFinalRoutingSchema,
  rerun_guard: PostFinalRerunGuardSchema,
}).strict().superRefine((value, context) => {
  if (value.event_id !== `post_final_reentry:${value.operation_id}`) context.addIssue({ code: z.ZodIssueCode.custom, path: ['event_id'], message: 'event_id must be derived from operation_id' });
});

export function parsePostFinalRecoveryEvent(value) {
  return PostFinalRecoveryEventSchema.parse(value);
}
