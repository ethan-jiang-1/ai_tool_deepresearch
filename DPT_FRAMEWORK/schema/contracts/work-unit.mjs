// @impl DEW-002, DEW-004, DEW-014, DEW-024, FRE-005, SDC-001, SDC-002, SDC-003
import { z } from 'zod';
import path from 'node:path';

export const WORK_UNIT_INDEX_SCHEMA_VERSION = 'work-unit.index.v1';
export const WORK_UNIT_MANIFEST_SCHEMA_VERSION = 'work-unit.manifest.v1';
export const WORK_UNIT_BEACON_SCHEMA_VERSION = 'work-unit.beacon.v1';
export const WORK_UNIT_STATUS_SCHEMA_VERSION = 'work-unit.status.v1';
export const WORK_UNIT_AGENT_SCHEMA_VERSION = 'work-unit.agent.v1';
export const WORK_UNIT_RECEIPT_EVENT_SCHEMA_VERSION = 'work-unit.receipt-event.v1';
export const WORK_UNIT_ACTOR_CONTRACT_VERSION = 'work-unit.actor.v1';
// v2 is the contract emitted for new claims. v1 remains parseable because a
// submitted work unit must retain the output interpretation it was assigned.
export const LEGACY_WORK_UNIT_ASSIGNMENT_CONTRACT_VERSION = 'work-unit.assignment.v1';
export const WORK_UNIT_ASSIGNMENT_CONTRACT_VERSION = 'work-unit.assignment.v2';
export const WORK_UNIT_ASSIGNMENT_CONTRACT_VERSIONS = Object.freeze([
  LEGACY_WORK_UNIT_ASSIGNMENT_CONTRACT_VERSION,
  WORK_UNIT_ASSIGNMENT_CONTRACT_VERSION,
]);
export const WorkUnitAssignmentContractVersionSchema = z.enum(WORK_UNIT_ASSIGNMENT_CONTRACT_VERSIONS);
export const WORK_UNIT_SUBMISSION_CONTRACT_VERSION = 'work-unit.submission.v1';
export const WORK_UNIT_SUPERSESSION_SCHEMA_VERSION = 'work-unit.supersession.v1';

export const WORK_UNIT_ID_PATTERN = /^wu-w(?<wave>[0-9]+)-b(?<batch>[0-9]{3})-(?<kind_code>[a-z][a-z0-9]{1,7})-i(?<claim>[0-9]{4})$/;

export const WorkUnitStatus = z.enum(['claimed', 'submitted', 'failed', 'timed_out', 'abandoned']);
export const WorkUnitTerminalStatus = z.enum(['submitted', 'failed', 'timed_out', 'abandoned']);

const JsonObject = z.record(z.string(), z.unknown());
const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/, 'hash must be a lowercase SHA-256 hex string');

export const WorkUnitSupersessionRootSchema = z.enum([
  'submitted_declaration_missing',
  'submitted_declaration_drift',
  'submitted_result_drift',
  'submitted_runtime_receipt_drift',
  'submitted_output_drift',
  'submitted_cache_drift',
]);

export const WorkUnitSupersessionRelationSchema = z.object({
  schema_version: z.literal(WORK_UNIT_SUPERSESSION_SCHEMA_VERSION),
  predecessor_work_id: z.string().regex(WORK_UNIT_ID_PATTERN),
  predecessor_queue_item_id: z.string().trim().min(1),
  accepted_ledger_record_hash: Sha256Schema,
  root_code: WorkUnitSupersessionRootSchema,
  reason: z.string().trim().min(1),
  recorded_at: z.string().datetime(),
  tx_id: z.string().trim().min(1),
  successor_queue_item_id: z.string().trim().min(1),
}).strict();

export const DirectOutputContractIdSchema = z.enum([
  'wave0.source-metadata-array.v1',
  'wave1.evidence-summary.v1',
  'wave1.question-list.v1',
]);
export const RequiredOutputRoleSchema = z.enum(['source_yaml', 'evidence_summary', 'question_list']);

function isCanonicalBundleRelativePath(value) {
  if (typeof value !== 'string' || value.length === 0 || value === '.' || path.posix.isAbsolute(value)) return false;
  if (value.includes('\\') || value.includes('//') || value.includes('{') || value.includes('}') || value.includes('*')) return false;
  if (value.split('/').includes('..') || value.split('/').includes('.')) return false;
  return path.posix.normalize(value) === value;
}

const DIRECT_ROLE_BY_CONTRACT = Object.freeze({
  'wave0.source-metadata-array.v1': 'source_yaml',
  'wave1.evidence-summary.v1': 'evidence_summary',
  'wave1.question-list.v1': 'question_list',
});

export const WorkUnitRequiredOutputSchema = z.object({
  path: z.string().min(1).refine(isCanonicalBundleRelativePath, 'required output path must be canonical bundle-relative'),
  role: RequiredOutputRoleSchema,
  direct_contract: DirectOutputContractIdSchema,
}).strict().superRefine((data, ctx) => {
  if (DIRECT_ROLE_BY_CONTRACT[data.direct_contract] !== data.role) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['role'],
      message: `role ${data.role} conflicts with direct contract ${data.direct_contract}`,
    });
  }
});

const OutputFilesContractSchema = z.object({
  required: z.boolean(),
  allowed_roles: z.array(z.string().min(1)).min(1),
  reference_requires_source_url: z.boolean().optional(),
}).strict();

const SourceClaimsContractSchema = z.object({
  allowed: z.boolean(),
  accepted_requires_cache_or_degraded: z.boolean().optional(),
  prior_submitted_output_roles: z.array(z.string().min(1)).optional(),
}).strict();

export const WorkUnitOutputContractSchema = z.object({
  required_result_fields: z.array(z.string().min(1)).min(1),
  output_files: OutputFilesContractSchema,
  source_claims: SourceClaimsContractSchema.optional(),
  required_outputs: z.array(WorkUnitRequiredOutputSchema),
}).strict().superRefine((data, ctx) => {
  const requiredFieldSet = new Set(data.required_result_fields);
  if (requiredFieldSet.size !== data.required_result_fields.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['required_result_fields'], message: 'required_result_fields must be unique' });
  }
  for (const field of ['work_id', 'queue_item_id', 'kind', 'receipt_nonce']) {
    if (!requiredFieldSet.has(field)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['required_result_fields'], message: `required_result_fields must include ${field}` });
  }
  const allowedRoles = new Set(data.output_files.allowed_roles);
  if (allowedRoles.size !== data.output_files.allowed_roles.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['output_files', 'allowed_roles'], message: 'allowed_roles must be unique' });
  }
  const seenPaths = new Map();
  data.required_outputs.forEach((required, index) => {
    if (!allowedRoles.has(required.role)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['required_outputs', index, 'role'], message: `required role ${required.role} is not allowed by output_files` });
    }
    const prior = seenPaths.get(required.path);
    if (prior) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['required_outputs', index, 'path'],
        message: prior.role === required.role && prior.direct_contract === required.direct_contract
          ? `duplicate required output path ${required.path}`
          : `conflicting required output tuple for ${required.path}`,
      });
    } else {
      seenPaths.set(required.path, required);
    }
  });
  const priorRoles = data.source_claims?.prior_submitted_output_roles;
  if (priorRoles) {
    if (data.source_claims.allowed !== true) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['source_claims'], message: 'prior submitted roles require source claims to be allowed' });
    if (new Set(priorRoles).size !== priorRoles.length) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['source_claims', 'prior_submitted_output_roles'], message: 'prior submitted roles must be unique' });
    priorRoles.forEach((role, index) => {
      if (!allowedRoles.has(role)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['source_claims', 'prior_submitted_output_roles', index], message: `prior submitted role ${role} is not an allowed output role` });
    });
  }
});

export const WorkUnitCandidateProjectionSchema = z.object({
  recommended_action: z.enum(['submit', 'repair_same_candidate', 'return_to_actor', 'fail_and_replace', 'inspect_contract']),
  primary_root_code: z.string().min(1).nullable(),
}).strict().superRefine((data, ctx) => {
  if (data.recommended_action === 'submit' && data.primary_root_code !== null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['primary_root_code'], message: 'submit requires null primary_root_code' });
  }
  if (data.recommended_action !== 'submit' && data.primary_root_code === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['primary_root_code'], message: 'rejection requires primary_root_code' });
  }
});

export const ExecutionActorClassSchema = z.enum(['delegated_subagent', 'phase_agent_fallback']);
export const ActorObservationOutcomeSchema = z.enum(['available', 'unavailable', 'unknown']);
export const ActorObservationSourceSchema = z.enum(['native_probe', 'not_observed']);
export const ActorObservationReasonSchema = z.enum([
  'probe_succeeded',
  'probe_access_denied',
  'probe_model_unavailable',
  'probe_host_policy_blocked',
  'probe_capacity_unavailable',
  'observation_required',
  'probe_inconclusive',
]);
export const ACTOR_OBSERVATION_CASES = Object.freeze([
  Object.freeze({
    outcome: 'available',
    source: 'native_probe',
    reason_codes: Object.freeze(['probe_succeeded']),
    observation_case: 'normal_available',
  }),
  Object.freeze({
    outcome: 'unavailable',
    source: 'native_probe',
    reason_codes: Object.freeze([
      'probe_access_denied',
      'probe_model_unavailable',
      'probe_host_policy_blocked',
      'probe_capacity_unavailable',
    ]),
    observation_case: 'unavailable',
  }),
  Object.freeze({
    outcome: 'unknown',
    source: 'not_observed',
    reason_codes: Object.freeze(['observation_required']),
    observation_case: 'observation_required',
  }),
  Object.freeze({
    outcome: 'unknown',
    source: 'native_probe',
    reason_codes: Object.freeze(['probe_inconclusive']),
    observation_case: 'probe_inconclusive',
  }),
]);

export const ActorObservationLegalTupleSchema = z.object({
  outcome: ActorObservationOutcomeSchema,
  source: ActorObservationSourceSchema,
  reason_code: ActorObservationReasonSchema,
  observation_case: z.enum(['normal_available', 'unavailable', 'observation_required', 'probe_inconclusive']),
}).strict();
export const ActorObservationContractProjectionSchema = z.object({
  planned_role_key: z.string().min(1),
  legal_tuples: z.array(ActorObservationLegalTupleSchema).length(7),
}).strict();
const JsonSafeValueSchema = z.lazy(() => z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.null(),
  z.array(JsonSafeValueSchema),
  z.record(z.string(), JsonSafeValueSchema),
]));
export const ActorObservationInputIssueSchema = z.object({
  field: z.string().min(1),
  supplied_value: JsonSafeValueSchema.nullable(),
  message: z.string().min(1),
}).strict();
export const ActorObservationProvidedObservationSchema = z.object({
  outcome: JsonSafeValueSchema.nullable(),
  source: JsonSafeValueSchema.nullable(),
  role_key: JsonSafeValueSchema.nullable(),
  reason_code: JsonSafeValueSchema.nullable(),
}).strict();
export const ActorObservationFeedbackConflictSchema = z.object({
  field: z.string().min(1),
  message: z.string().min(1),
}).strict();
export const ActorObservationFeedbackSchema = z.object({
  planned_role_key: z.string().min(1),
  primary_conflict: ActorObservationFeedbackConflictSchema,
  conflicts: z.array(ActorObservationFeedbackConflictSchema).min(1).max(4),
  legal_tuples: z.array(ActorObservationLegalTupleSchema).length(7),
  rerun: z.string().min(1),
}).strict();

export function actorObservationLegalTuples() {
  return ACTOR_OBSERVATION_CASES.flatMap((entry) => entry.reason_codes.map((reason_code) => (
    ActorObservationLegalTupleSchema.parse({
      outcome: entry.outcome,
      source: entry.source,
      reason_code,
      observation_case: entry.observation_case,
    })
  )));
}

function isLegalActorObservationTuple({ outcome, source, reason_code }) {
  return ACTOR_OBSERVATION_CASES.some((entry) => (
    entry.outcome === outcome
    && entry.source === source
    && entry.reason_codes.includes(reason_code)
  ));
}

const ActorObservationInputObjectSchema = z.object({
  outcome: ActorObservationOutcomeSchema,
  source: ActorObservationSourceSchema,
  role_key: z.string().min(1),
  reason_code: ActorObservationReasonSchema,
}).strict();
export const ActorObservationInputSchema = ActorObservationInputObjectSchema.superRefine((data, ctx) => {
  if (!isLegalActorObservationTuple(data)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'invalid actor observation outcome/source/reason combination' });
  }
});
export const ActorObservationSchema = ActorObservationInputObjectSchema.extend({
  recorded_at: z.string().datetime(),
}).superRefine((data, ctx) => {
  const { recorded_at: _recordedAt, ...input } = data;
  const parsed = ActorObservationInputSchema.safeParse(input);
  if (!parsed.success) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'invalid stored actor observation combination' });
});
export const ActorExecutionSchema = z.object({
  execution_actor_class: ExecutionActorClassSchema,
  delegated_role_key: z.string().min(1),
  observation: ActorObservationSchema,
  policy_decision: z.enum(['normal_allowed', 'fallback_allowed']),
  fallback_from: z.literal('delegated_subagent').nullable(),
}).strict().superRefine((data, ctx) => {
  if (data.execution_actor_class === 'delegated_subagent' && (data.policy_decision !== 'normal_allowed' || data.fallback_from !== null)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'delegated_subagent actor binding is invalid' });
  if (data.execution_actor_class === 'phase_agent_fallback' && (data.policy_decision !== 'fallback_allowed' || data.fallback_from !== 'delegated_subagent')) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'phase_agent_fallback actor binding is invalid' });
});
export const LegacyActorExecutionSchema = z.object({
  execution_actor_class: z.literal('legacy_unrecorded'),
  delegated_role_key: z.string().min(1).nullable(),
  observation: z.object({
    outcome: z.literal('unknown'),
    source: z.literal('legacy_claim'),
    reason_code: z.literal('legacy_actor_unrecorded'),
    recorded_at: z.string().datetime().nullable(),
  }).strict(),
  policy_decision: z.literal('legacy_compatibility'),
  fallback_from: z.null(),
}).strict();
export const LedgerActorExecutionSchema = z.union([ActorExecutionSchema, LegacyActorExecutionSchema]);

export const RuntimeRefsSchema = z.object({
  platform: z.string().min(1).optional(),
  runtime_agent_id: z.string().min(1).optional(),
  spawn_request_id: z.string().min(1).optional(),
  thread_id: z.string().min(1).optional(),
  session_id: z.string().min(1).optional(),
  cancel_ref: z.string().min(1).optional(),
  opaque: z.record(z.string(), z.unknown()).default({}),
}).default({});

export const KindRegistrySchema = z.object({
  kinds: z.record(z.string().min(1), z.string().regex(/^[a-z][a-z0-9]{1,7}$/)),
  codes: z.record(z.string().regex(/^[a-z][a-z0-9]{1,7}$/), z.string().min(1)),
}).superRefine((data, ctx) => {
  for (const [kind, code] of Object.entries(data.kinds)) {
    if (data.codes[code] !== kind) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['codes', code],
        message: `kind registry reverse mapping for ${code} must be ${kind}`,
      });
    }
  }
  for (const [code, kind] of Object.entries(data.codes)) {
    if (data.kinds[kind] !== code) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['kinds', kind],
        message: `kind registry forward mapping for ${kind} must be ${code}`,
      });
    }
  }
});

export const WorkUnitPathRefsSchema = z.object({
  work_unit_dir: z.string().min(1),
  manifest_ref: z.string().min(1),
  task_ref: z.string().min(1),
  result_schema_ref: z.string().min(1),
  beacon_ref: z.string().min(1),
  runtime_receipt_ref: z.string().min(1),
  status_ref: z.string().min(1),
  result_ref: z.string().min(1),
  agent_ref: z.string().min(1),
});

export const WorkUnitManifestSchema = z.object({
  schema_version: z.literal(WORK_UNIT_MANIFEST_SCHEMA_VERSION).default(WORK_UNIT_MANIFEST_SCHEMA_VERSION),
  work_id: z.string().regex(WORK_UNIT_ID_PATTERN),
  queue_item_id: z.string().min(1),
  wave: z.number().int().nonnegative(),
  batch_id: z.string().regex(/^b[0-9]{3}$/),
  batch_index: z.number().int().nonnegative(),
  claim_index: z.number().int().nonnegative(),
  attempt_index: z.number().int().positive(),
  kind: z.string().min(1),
  kind_code: z.string().regex(/^[a-z][a-z0-9]{1,7}$/),
  task_brief: z.string().min(1),
  producer_rule: z.string().min(1),
  creation_reason: z.string().min(1),
  queue_item_snapshot_hash: z.string().min(1),
  receipt_nonce: z.string().min(16),
  claimed_at: z.string().datetime(),
  timeout_ms: z.number().int().positive(),
  deadline_at: z.string().datetime(),
  assignment_contract_version: WorkUnitAssignmentContractVersionSchema.optional(),
  submission_contract_version: z.literal(WORK_UNIT_SUBMISSION_CONTRACT_VERSION).optional(),
  output_contract: JsonObject,
  cache_policy: JsonObject,
  runtime_refs: RuntimeRefsSchema,
  actor_contract_version: z.literal(WORK_UNIT_ACTOR_CONTRACT_VERSION).optional(),
  actor_execution: ActorExecutionSchema.optional(),
  paths: WorkUnitPathRefsSchema,
  queue_item: z.record(z.string(), z.unknown()),
}).strict().superRefine((data, ctx) => {
  if (Boolean(data.actor_contract_version) !== Boolean(data.actor_execution)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'manifest actor contract fields must appear together' });
  const hasRequiredOutputs = Object.hasOwn(data.output_contract, 'required_outputs');
  if (Boolean(data.assignment_contract_version) !== hasRequiredOutputs) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['output_contract', 'required_outputs'], message: 'manifest assignment marker and required_outputs must appear together' });
  } else if (data.assignment_contract_version) {
    const parsed = WorkUnitOutputContractSchema.safeParse(data.output_contract);
    if (!parsed.success) parsed.error.issues.forEach((issue) => ctx.addIssue({ ...issue, path: ['output_contract', ...issue.path] }));
  }
});

export const WorkUnitBeaconSchema = z.object({
  schema_version: z.literal(WORK_UNIT_BEACON_SCHEMA_VERSION).default(WORK_UNIT_BEACON_SCHEMA_VERSION),
  work_id: z.string().regex(WORK_UNIT_ID_PATTERN),
  queue_item_id: z.string().min(1),
  kind: z.string().min(1),
  bundle: z.string().min(1),
  bundle_dir: z.string().min(1),
  receipt_nonce: z.string().min(16),
  deadline_at: z.string().datetime(),
  assignment_contract_version: WorkUnitAssignmentContractVersionSchema.optional(),
  submission_contract_version: z.literal(WORK_UNIT_SUBMISSION_CONTRACT_VERSION).optional(),
  work_unit_dir: z.string().min(1),
  manifest_ref: z.string().min(1),
  task_ref: z.string().min(1),
  result_schema_ref: z.string().min(1),
  result_ref: z.string().min(1),
  runtime_receipt_ref: z.string().min(1),
  log_cli: z.string().min(1),
  output_contract: JsonObject,
  cache_policy: JsonObject,
  required_receipt_fields: z.array(z.enum(['work_id', 'queue_item_id', 'kind', 'receipt_nonce'])),
  runtime_refs: RuntimeRefsSchema,
  runtime_refs_authority: z.literal('diagnostic_only').default('diagnostic_only'),
  actor_contract_version: z.literal(WORK_UNIT_ACTOR_CONTRACT_VERSION).optional(),
  actor_execution: ActorExecutionSchema.optional(),
}).strict().superRefine((data, ctx) => {
  if (Boolean(data.actor_contract_version) !== Boolean(data.actor_execution)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'beacon actor contract fields must appear together' });
  const hasRequiredOutputs = Object.hasOwn(data.output_contract, 'required_outputs');
  if (Boolean(data.assignment_contract_version) !== hasRequiredOutputs) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['output_contract', 'required_outputs'], message: 'beacon assignment marker and required_outputs must appear together' });
  } else if (data.assignment_contract_version) {
    const parsed = WorkUnitOutputContractSchema.safeParse(data.output_contract);
    if (!parsed.success) parsed.error.issues.forEach((issue) => ctx.addIssue({ ...issue, path: ['output_contract', ...issue.path] }));
  }
});

export const WorkUnitLateAcceptContextSchema = z.object({
  late_accept_reason: z.string().trim().min(1),
  terminal_status_before_accept: z.literal('timed_out'),
  superseded_retry_work_ids: z.array(z.string().regex(WORK_UNIT_ID_PATTERN)),
}).strict().superRefine((data, ctx) => {
  const seen = new Set();
  data.superseded_retry_work_ids.forEach((retryWorkId, index) => {
    if (seen.has(retryWorkId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['superseded_retry_work_ids', index],
        message: 'superseded_retry_work_ids must be unique',
      });
    }
    seen.add(retryWorkId);
  });
});

export const WorkUnitIndexRecordSchema = z.object({
  work_id: z.string().regex(WORK_UNIT_ID_PATTERN),
  queue_item_id: z.string().min(1),
  wave: z.number().int().nonnegative(),
  batch_id: z.string().regex(/^b[0-9]{3}$/),
  batch_index: z.number().int().nonnegative(),
  claim_index: z.number().int().nonnegative(),
  attempt_index: z.number().int().positive(),
  rerun_count: z.number().int().nonnegative().optional(),
  kind: z.string().min(1),
  kind_code: z.string().regex(/^[a-z][a-z0-9]{1,7}$/),
  status: WorkUnitStatus,
  producer_rule: z.string().min(1),
  creation_reason: z.string().min(1),
  queue_item_snapshot_hash: z.string().min(1),
  receipt_nonce: z.string().min(16),
  claimed_at: z.string().datetime(),
  timeout_ms: z.number().int().positive(),
  deadline_at: z.string().datetime(),
  assignment_contract_version: WorkUnitAssignmentContractVersionSchema.optional(),
  submission_contract_version: z.literal(WORK_UNIT_SUBMISSION_CONTRACT_VERSION).optional(),
  last_observed_at: z.string().datetime().optional(),
  runtime_refs: RuntimeRefsSchema,
  actor_contract_version: z.literal(WORK_UNIT_ACTOR_CONTRACT_VERSION).optional(),
  actor_execution: ActorExecutionSchema.optional(),
  paths: WorkUnitPathRefsSchema,
  result_hash: z.string().min(1).optional(),
  ledger_record_hash: z.string().min(1).optional(),
  accepted_ledger_record_hash: Sha256Schema.optional(),
  supersession_relation: WorkUnitSupersessionRelationSchema.optional(),
  late_accept_context: WorkUnitLateAcceptContextSchema.optional(),
  last_submit_rejection: z.record(z.string(), z.unknown()).optional(),
  terminal_reason: z.string().optional(),
  terminal_at: z.string().datetime().optional(),
}).strict().superRefine((data, ctx) => {
  if (Boolean(data.actor_contract_version) !== Boolean(data.actor_execution)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'index actor contract fields must appear together' });
  const marked = data.submission_contract_version === WORK_UNIT_SUBMISSION_CONTRACT_VERSION;
  if (marked) {
    for (const field of ['result_hash', 'ledger_record_hash']) {
      if (Object.hasOwn(data, field)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `marked submission cannot retain legacy current ${field}`,
        });
      }
    }
    if (data.status === 'submitted' && !data.accepted_ledger_record_hash) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['accepted_ledger_record_hash'],
        message: 'marked submitted work unit requires its immutable accepted ledger fingerprint',
      });
    }
    if (data.status !== 'submitted' && data.accepted_ledger_record_hash) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['accepted_ledger_record_hash'],
        message: 'accepted ledger fingerprint is only legal after marked submission',
      });
    }
  } else if (data.accepted_ledger_record_hash) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['accepted_ledger_record_hash'],
      message: 'markerless legacy work unit cannot carry a standalone marked acceptance fingerprint',
    });
  }
  if (data.supersession_relation) {
    const relation = data.supersession_relation;
    if (data.status !== 'submitted') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['supersession_relation'],
        message: 'supersession relation is only legal on a submitted predecessor',
      });
    }
    if (relation.predecessor_work_id !== data.work_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['supersession_relation', 'predecessor_work_id'],
        message: 'supersession predecessor_work_id must match the containing index record',
      });
    }
    if (relation.predecessor_queue_item_id !== data.queue_item_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['supersession_relation', 'predecessor_queue_item_id'],
        message: 'supersession predecessor_queue_item_id must match the containing index record',
      });
    }
    const acceptedHash = marked ? data.accepted_ledger_record_hash : data.ledger_record_hash;
    if (acceptedHash && relation.accepted_ledger_record_hash !== acceptedHash) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['supersession_relation', 'accepted_ledger_record_hash'],
        message: 'supersession accepted hash must match version-applicable index acceptance evidence',
      });
    }
  }
  if (data.late_accept_context && data.status !== 'submitted') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['late_accept_context'],
      message: 'late_accept_context is only allowed on a submitted work unit',
    });
  }
  data.late_accept_context?.superseded_retry_work_ids.forEach((retryWorkId, index) => {
    if (retryWorkId === data.work_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['late_accept_context', 'superseded_retry_work_ids', index],
        message: 'superseded_retry_work_ids must not include the accepted work_id',
      });
    }
  });
});

export const WorkUnitWaveCountersSchema = z.object({
  current_batch_index: z.number().int().nonnegative().default(0),
  batches: z.record(z.string().regex(/^b[0-9]{3}$/), z.object({
    batch_index: z.number().int().nonnegative(),
    batch_reason: z.string().min(1),
    next_claim_index: z.number().int().positive().default(1),
    opened_at: z.string().datetime().optional(),
    lineage: JsonObject.optional(),
  })).default({}),
}).strict();

export const WorkUnitIndexSchema = z.object({
  schema_version: z.literal(WORK_UNIT_INDEX_SCHEMA_VERSION).default(WORK_UNIT_INDEX_SCHEMA_VERSION),
  kind_registry: KindRegistrySchema,
  waves: z.record(z.string().regex(/^wave[0-9]+$/), WorkUnitWaveCountersSchema).default({}),
  work_units: z.record(z.string().regex(WORK_UNIT_ID_PATTERN), WorkUnitIndexRecordSchema).default({}),
  status_counts: z.record(WorkUnitStatus, z.number().int().nonnegative()).default({
    claimed: 0,
    submitted: 0,
    failed: 0,
    timed_out: 0,
    abandoned: 0,
  }),
  inspect_projection: z.object({
    generated_at: z.string().datetime(),
    total: z.number().int().nonnegative(),
    by_wave: z.record(z.string(), z.number().int().nonnegative()).default({}),
    nonterminal: z.number().int().nonnegative(),
  }),
  updated_at: z.string().datetime(),
}).strict();

const WorkUnitStatusFileBaseShape = {
  schema_version: z.literal(WORK_UNIT_STATUS_SCHEMA_VERSION).default(WORK_UNIT_STATUS_SCHEMA_VERSION),
  work_id: z.string().regex(WORK_UNIT_ID_PATTERN),
  status: WorkUnitStatus,
  updated_at: z.string().datetime(),
  last_submit_rejection: z.record(z.string(), z.unknown()).optional(),
};

export const WorkUnitSubmissionV1StatusFileSchema = z.object(WorkUnitStatusFileBaseShape).strict();

export const WorkUnitStatusFileSchema = z.object({
  ...WorkUnitStatusFileBaseShape,
  result_hash: z.string().min(1).optional(),
  ledger_record_hash: z.string().min(1).optional(),
}).strict();

export const WorkUnitAgentFileSchema = z.object({
  schema_version: z.literal(WORK_UNIT_AGENT_SCHEMA_VERSION).default(WORK_UNIT_AGENT_SCHEMA_VERSION),
  work_id: z.string().regex(WORK_UNIT_ID_PATTERN),
  runtime_refs: RuntimeRefsSchema,
  updated_at: z.string().datetime(),
}).strict();

export const WorkUnitRuntimeReceiptEventSchema = z.object({
  schema_version: z.literal(WORK_UNIT_RECEIPT_EVENT_SCHEMA_VERSION).default(WORK_UNIT_RECEIPT_EVENT_SCHEMA_VERSION),
  event: z.string().min(1),
  work_id: z.string().regex(WORK_UNIT_ID_PATTERN),
  queue_item_id: z.string().min(1),
  kind: z.string().min(1),
  receipt_nonce: z.string().min(16),
  actor_contract_version: z.literal(WORK_UNIT_ACTOR_CONTRACT_VERSION).optional(),
  execution_actor_class: ExecutionActorClassSchema.optional(),
  ts: z.string().datetime().optional(),
  detail: z.union([JsonObject, z.string()]).optional(),
}).passthrough();

export const WorkUnitSourceClaimSchema = z.object({
  url: z.string().url(),
  source_ref: z.string().min(1),
  acceptance_status: z.string().min(1),
  is_new_vs_wave0: z.boolean(),
  cache_trail_refs: z.array(z.string().min(1)).default([]),
  degraded_capture_ref: z.string().min(1).nullable().optional(),
}).strict();

export const WorkUnitResultSchema = z.object({
  schema_version: z.literal('work-unit.result.v1').default('work-unit.result.v1'),
  work_id: z.string().regex(WORK_UNIT_ID_PATTERN),
  queue_item_id: z.string().min(1),
  kind: z.string().min(1),
  receipt_nonce: z.string().min(16),
  actor_contract_version: z.literal(WORK_UNIT_ACTOR_CONTRACT_VERSION).optional(),
  execution_actor_class: ExecutionActorClassSchema.optional(),
  summary: z.string().default(''),
  output_files: z.array(z.object({
    path: z.string().min(1),
    role: z.string().min(1),
    source_url: z.string().url().optional(),
    source_slug: z.string().min(1).optional(),
  })).default([]),
  source_claims: z.array(WorkUnitSourceClaimSchema).default([]),
  accepted_source_urls: z.array(z.string().url()).default([]),
  cache_trails: z.array(z.string().min(1)).default([]),
}).strict();

function isCanonicalBundleRelativeTarget(value) {
  if (typeof value !== 'string' || value.length === 0 || value === '.' || value.startsWith('/') || /^[A-Za-z]:[\\/]/.test(value)) return false;
  if (value.includes('\\') || value.includes('//') || value.includes('{') || value.includes('}') || value.includes('*')) return false;
  const segments = value.split('/');
  return !segments.some((segment) => segment === '' || segment === '.' || segment === '..');
}

export const SourceContributionSchema = z.object({
  target: z.string().min(1).refine(isCanonicalBundleRelativeTarget, {
    message: 'source contribution target must be a canonical bundle-relative path',
  }),
  direct_contract: z.literal('wave0.source-metadata-array.v1'),
  validated_length: z.number().int().nonnegative(),
  semantic_digest: z.string().regex(/^[a-f0-9]{64}$/, 'source contribution digest must be a lowercase SHA-256 hex string'),
}).strict();

export const WorkUnitLedgerRecordSchema = z.object({
  declared_at: z.string().datetime(),
  work_id: z.string().regex(WORK_UNIT_ID_PATTERN),
  queue_item_id: z.string().min(1),
  wave: z.number().int().nonnegative(),
  kind: z.string().min(1),
  producer_rule: z.string().min(1),
  creation_reason: z.string().min(1),
  work_unit_ref: z.string().min(1),
  result_ref: z.string().min(1),
  runtime_receipt_ref: z.string().min(1),
  receipt_nonce: z.string().min(16),
  output_files: WorkUnitResultSchema.shape.output_files,
  source_claims: WorkUnitResultSchema.shape.source_claims,
  accepted_source_urls: WorkUnitResultSchema.shape.accepted_source_urls,
  cache_trails: WorkUnitResultSchema.shape.cache_trails,
  result_hash: z.string().min(1),
  source_contribution: SourceContributionSchema.optional(),
  actor_contract_version: z.literal(WORK_UNIT_ACTOR_CONTRACT_VERSION).optional(),
  actor_execution: LedgerActorExecutionSchema.optional(),
  late_accept: z.literal(true).optional(),
  late_accept_reason: z.string().trim().min(1).optional(),
  terminal_status_before_accept: z.literal('timed_out').optional(),
  superseded_retry_work_ids: z.array(z.string().regex(WORK_UNIT_ID_PATTERN)).optional(),
  ledger_record_hash: z.string().min(1),
}).strict().superRefine((data, ctx) => {
  if (data.source_contribution) {
    if (data.wave !== 0 || data.kind !== 'wave0_source_intake') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['source_contribution'],
        message: 'source_contribution is only legal for Wave0 wave0_source_intake ledger rows',
      });
    }
    if (!data.output_files.some((entry) => (
      entry.path === data.source_contribution.target && entry.role === 'source_yaml'
    ))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['source_contribution', 'target'],
        message: 'source_contribution target must be one declared source_yaml output',
      });
    }
  }
  if (Boolean(data.actor_contract_version) !== Boolean(data.actor_execution)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'ledger actor contract fields must appear together' });
  }
  if (data.late_accept === true) {
    if (!data.late_accept_reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['late_accept_reason'],
        message: 'late_accept_reason is required when late_accept is true',
      });
    }
    if (data.terminal_status_before_accept !== 'timed_out') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['terminal_status_before_accept'],
        message: 'terminal_status_before_accept must be timed_out when late_accept is true',
      });
    }
    if (!Array.isArray(data.superseded_retry_work_ids)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['superseded_retry_work_ids'],
        message: 'superseded_retry_work_ids is required when late_accept is true',
      });
    } else {
      const seen = new Set();
      data.superseded_retry_work_ids.forEach((retryWorkId, index) => {
        if (retryWorkId === data.work_id) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['superseded_retry_work_ids', index],
            message: 'superseded_retry_work_ids must not include the accepted work_id',
          });
        }
        if (seen.has(retryWorkId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['superseded_retry_work_ids', index],
            message: 'superseded_retry_work_ids must be unique',
          });
        }
        seen.add(retryWorkId);
      });
    }
    return;
  }

  for (const field of ['late_accept_reason', 'terminal_status_before_accept', 'superseded_retry_work_ids']) {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message: `${field} is only allowed when late_accept is true`,
      });
    }
  }
});

export const WorkUnitTimeoutRecommendedAction = z.enum(['submit', 'repair', 'wait', 'timeout', 'inspect', 'block']);

export const WorkUnitTimeoutProgressSourceSchema = z.object({
  source_type: z.enum(['result_file', 'receipt_file', 'output_file', 'cache_leaf', 'engine_event']),
  observed_at: z.string().datetime().nullable().default(null),
  path_ref: z.string().min(1).nullable().optional(),
  event_ref: z.string().min(1).nullable().optional(),
  identity_verified: z.boolean(),
  extends_idle_lease: z.boolean(),
  suspicious_timestamp: z.boolean().default(false),
}).strict();

export const WorkUnitTimeoutProgressSchema = z.object({
  latest_engine_observed_progress_at: z.string().datetime().nullable().default(null),
  candidate_result_present: z.boolean().default(false),
  receipt_nonempty: z.boolean().default(false),
  output_or_cache_progress: z.boolean().default(false),
  dry_submit_expected: z.enum(['pass', 'fail', 'not_run']).default('not_run'),
  sources: z.array(WorkUnitTimeoutProgressSourceSchema).default([]),
}).strict();

export const WorkUnitTimeoutRecommendationBasisSchema = z.discriminatedUnion('branch', [
  z.object({
    branch: z.literal('candidate'),
    facts: z.object({
      candidate_projection: WorkUnitCandidateProjectionSchema,
    }).strict(),
  }).strict(),
  z.object({
    branch: z.literal('progress'),
    facts: z.object({
      latest_engine_observed_progress_at: z.string().datetime(),
      effective_timeout_at: z.string().datetime(),
    }).strict(),
  }).strict(),
  z.object({
    branch: z.literal('lease'),
    facts: z.object({
      lease_anchor_at: z.string().datetime(),
      effective_timeout_at: z.string().datetime(),
    }).strict(),
  }).strict(),
  z.object({
    branch: z.literal('integrity'),
    facts: z.object({
      direct_issue: z.string().min(1),
    }).strict(),
  }).strict(),
]);

export const WorkUnitTimeoutPreflightSchema = z.object({
  ok: z.boolean(),
  work_id: z.string().min(1),
  queue_item_id: z.string().min(1).nullable().default(null),
  status: z.union([WorkUnitStatus, z.literal('unknown')]),
  timeout_eligible: z.boolean(),
  check: z.boolean(),
  recommended_action: WorkUnitTimeoutRecommendedAction,
  initial_deadline_at: z.string().datetime().nullable().default(null),
  lease_anchor_at: z.string().datetime().nullable().default(null),
  idle_timeout_ms: z.number().int().positive().nullable().default(null),
  effective_timeout_at: z.string().datetime().nullable().default(null),
  progress: WorkUnitTimeoutProgressSchema,
  candidate_projection: WorkUnitCandidateProjectionSchema.nullable().default(null),
  recommendation_basis: WorkUnitTimeoutRecommendationBasisSchema,
  inspect: z.array(z.string()).default([]),
  advice: z.array(z.string()).default([]),
}).strict().superRefine((data, ctx) => {
  if (data.timeout_eligible !== data.check) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['check'],
      message: 'check must equal timeout_eligible',
    });
  }
});
