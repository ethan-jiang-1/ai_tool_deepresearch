// @impl AGT-005, AGT-006, AGT-007, EXA-004, PLR-001, VER-006
import { z } from 'zod';

export const PLAYBOOK_CASE_RE = /^case-\d+-(light|standard|heavy)-[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const PLAYBOOK_CHECK_ID_RE = /^[a-z][a-z0-9]*(?:(?:[-_:])[a-z0-9]+)*$/;
export const PLAYBOOK_BUNDLE_ROLE_RE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
export const PLAYBOOK_EVIDENCE_ROLE_RE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;

const nonEmpty = z.string().trim().min(1);
const uniqueArray = (schema, min = 1) => z.array(schema).min(min).superRefine((values, ctx) => {
  const seen = new Set();
  for (let index = 0; index < values.length; index += 1) {
    if (seen.has(values[index])) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [index], message: 'duplicate value' });
    }
    seen.add(values[index]);
  }
});

const policyShape = {
  verdict_mode: z.enum(['all', 'last']),
  required_checks: uniqueArray(z.string().regex(PLAYBOOK_CHECK_ID_RE)),
  bundle_roles: uniqueArray(z.string().regex(PLAYBOOK_BUNDLE_ROLE_RE)),
  verdict_role: z.string().regex(PLAYBOOK_BUNDLE_ROLE_RE),
  health_roles: uniqueArray(z.string().regex(PLAYBOOK_BUNDLE_ROLE_RE)),
  health_profile: z.enum(['light', 'standard', 'heavy']),
  durable_evidence_roles: uniqueArray(z.string().regex(PLAYBOOK_EVIDENCE_ROLE_RE), 0),
  proof_subject: z.enum(['deterministic_contract', 'agent_behavior']),
  subject_execution: z.enum(['none', 'real_agent', 'real_subagent']),
  fixture: z.enum(['none', 'setup_only', 'fixture_backed']),
  runtime: z.literal('real_disposable_bundle'),
  external_calls: z.enum(['none', 'real']),
  verdict_judge: z.enum(['deterministic', 'real_human', 'ai_judge']),
  regression_recommendation: z.literal('recommended').optional(),
  regression_retry_safety: z.literal('reviewed').optional(),
};

function refinePolicy(value, ctx) {
  if (!value.bundle_roles.includes(value.verdict_role)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['verdict_role'], message: 'must be present in bundle_roles' });
  }
  if (!value.health_roles.includes(value.verdict_role)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['health_roles'], message: 'must contain verdict_role' });
  }
  for (const [index, role] of value.health_roles.entries()) {
    if (!value.bundle_roles.includes(role)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['health_roles', index], message: 'must be present in bundle_roles' });
    }
  }

  if (value.proof_subject === 'deterministic_contract') {
    if (value.subject_execution !== 'none') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['subject_execution'], message: 'deterministic_contract requires none' });
    }
    if (value.external_calls !== 'none') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['external_calls'], message: 'deterministic_contract requires none' });
    }
    if (value.verdict_judge !== 'deterministic') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['verdict_judge'], message: 'deterministic_contract requires deterministic judge' });
    }
    if (value.fixture === 'setup_only') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fixture'], message: 'deterministic_contract uses none or fixture_backed' });
    }
    if (value.durable_evidence_roles.length !== 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['durable_evidence_roles'], message: 'deterministic_contract requires no Subject evidence roles' });
    }
  } else {
    if (!['real_agent', 'real_subagent'].includes(value.subject_execution)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['subject_execution'], message: 'agent_behavior requires real_agent or real_subagent' });
    }
    if (!['none', 'setup_only'].includes(value.fixture)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fixture'], message: 'agent_behavior uses none or setup_only' });
    }
    if (value.durable_evidence_roles.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['durable_evidence_roles'], message: 'agent_behavior requires Subject evidence roles' });
    }
  }

  if (value.regression_retry_safety !== undefined && value.verdict_mode !== 'all') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['regression_retry_safety'], message: 'is valid only for verdict_mode all' });
  }
}

export const PlaybookPolicySchema = z.object(policyShape).strict().superRefine(refinePolicy);

export const PlaybookFrontmatterSchema = z.object({
  schema: z.literal('command-experiment/v2'),
  experiment: nonEmpty,
  case: z.string().regex(PLAYBOOK_CASE_RE),
  case_goal: nonEmpty,
  ...policyShape,
  req: nonEmpty.optional(),
  not_run_if: nonEmpty.optional(),
}).strict().superRefine(refinePolicy);
