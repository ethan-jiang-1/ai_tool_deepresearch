import { isAbsolute, posix } from 'node:path';
import { z } from 'zod';

export const TEST_CLASSES = ['unit', 'integration', 'deterministic_e2e', 'agent_flow_e2e'];

const nonEmpty = z.string().trim().min(1);
const kebab = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be safe kebab-case');
const classState = z.object({
  status: z.enum(['selected', 'not_applicable']),
  rationale: nonEmpty,
}).strict();

const executionProfile = z.object({
  fixture: z.enum(['none', 'setup_only', 'fixture_backed']),
  subject_execution: z.enum(['none', 'simulated_agent_actions', 'real_agent', 'real_subagent']),
  runtime: z.enum(['none', 'temporary_bundle', 'real_disposable_bundle']),
  external_calls: z.enum(['none', 'real']),
  verdict_judge: z.enum(['deterministic', 'real_human', 'ai_judge']),
}).strict();

const claim = z.object({
  id: kebab,
  statement: nonEmpty,
  test_class: z.enum(TEST_CLASSES),
  proof_subject: z.enum(['deterministic_contract', 'agent_behavior']),
  asset: z.object({
    kind: z.enum(['node_test', 'markdown_playbook']),
    path: nonEmpty,
  }).strict(),
  execution_profile: executionProfile,
  verdict_authority: z.enum(['node_test_exit', 'trace_jsonl']),
}).strict();

function lexicalPathIssue(path) {
  if (isAbsolute(path) || path.includes('\\')) return 'must be a POSIX repository-relative path';
  const segments = path.split('/');
  if (segments.some((part) => part === '' || part === '.' || part === '..')) return 'must not contain empty, dot, or traversal segments';
  if (posix.normalize(path) !== path || path.startsWith('../')) return 'must remain inside the repository after normalization';
  return null;
}

function expectedBoundary(testClass, path) {
  if (testClass === 'unit') {
    return path.startsWith('tests/') && !path.startsWith('tests/integration/') && !path.startsWith('tests/e2e/') && path.endsWith('.test.mjs');
  }
  if (testClass === 'integration') return path.startsWith('tests/integration/') && path.endsWith('.test.mjs');
  if (testClass === 'deterministic_e2e') return path.startsWith('tests/e2e/') && path.endsWith('.test.mjs');
  return path.startsWith('experiments_playbook/') && /\/case-[^/]+\.md$/.test(path);
}

function profileIsValid(value) {
  const p = value.execution_profile;
  if (value.test_class === 'unit') {
    return value.proof_subject === 'deterministic_contract' && value.asset.kind === 'node_test' && value.verdict_authority === 'node_test_exit' &&
      ['none', 'fixture_backed'].includes(p.fixture) && p.subject_execution === 'none' && p.runtime === 'none' && p.external_calls === 'none' && p.verdict_judge === 'deterministic';
  }
  if (value.test_class === 'integration') {
    return value.proof_subject === 'deterministic_contract' && value.asset.kind === 'node_test' && value.verdict_authority === 'node_test_exit' &&
      ['none', 'fixture_backed'].includes(p.fixture) && p.subject_execution === 'none' && ['none', 'temporary_bundle'].includes(p.runtime) && p.external_calls === 'none' && p.verdict_judge === 'deterministic';
  }
  if (value.test_class === 'deterministic_e2e') {
    return value.proof_subject === 'deterministic_contract' && value.asset.kind === 'node_test' && value.verdict_authority === 'node_test_exit' &&
      ['none', 'fixture_backed'].includes(p.fixture) && ['none', 'simulated_agent_actions'].includes(p.subject_execution) && p.runtime === 'temporary_bundle' && p.external_calls === 'none' && p.verdict_judge === 'deterministic';
  }
  const common = value.asset.kind === 'markdown_playbook' && value.verdict_authority === 'trace_jsonl' && p.runtime === 'real_disposable_bundle';
  if (value.proof_subject === 'deterministic_contract') {
    return common && ['none', 'setup_only', 'fixture_backed'].includes(p.fixture) && ['none', 'real_agent', 'real_subagent'].includes(p.subject_execution) && p.verdict_judge === 'deterministic';
  }
  return common && ['none', 'setup_only'].includes(p.fixture) && ['real_agent', 'real_subagent'].includes(p.subject_execution);
}

export const VerificationRoutingPlanSchema = z.object({
  schema_version: z.literal('verification-routing/v1'),
  change: kebab,
  test_classes: z.object({
    unit: classState,
    integration: classState,
    deterministic_e2e: classState,
    agent_flow_e2e: classState,
  }).strict(),
  claims: z.array(claim),
}).strict().superRefine((plan, ctx) => {
  const ids = new Set();
  const routesByPath = new Map();
  for (const [index, item] of plan.claims.entries()) {
    if (ids.has(item.id)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['claims', index, 'id'], message: 'claim id must be unique' });
    ids.add(item.id);
    if (plan.test_classes[item.test_class].status !== 'selected') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['claims', index, 'test_class'], message: 'claim must reference a selected test class' });
    }
    const pathIssue = lexicalPathIssue(item.asset.path);
    if (pathIssue) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['claims', index, 'asset', 'path'], message: pathIssue });
    else if (!expectedBoundary(item.test_class, item.asset.path)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['claims', index, 'asset', 'path'], message: `path does not match ${item.test_class} ownership boundary` });
    }
    if (!profileIsValid(item)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['claims', index, 'execution_profile'], message: `route tuple is incompatible with ${item.test_class} and ${item.proof_subject}` });
    }
    const identity = JSON.stringify({ test_class: item.test_class, proof_subject: item.proof_subject, kind: item.asset.kind, execution_profile: item.execution_profile, verdict_authority: item.verdict_authority });
    const previous = routesByPath.get(item.asset.path);
    if (previous && previous !== identity) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['claims', index, 'asset', 'path'], message: 'shared asset path has a conflicting route identity' });
    routesByPath.set(item.asset.path, identity);
  }
  for (const testClass of TEST_CLASSES) {
    const count = plan.claims.filter((item) => item.test_class === testClass).length;
    const status = plan.test_classes[testClass].status;
    if (status === 'selected' && count === 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['test_classes', testClass, 'status'], message: 'selected test class requires at least one claim' });
    if (status === 'not_applicable' && count > 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['test_classes', testClass, 'status'], message: 'not_applicable test class must have no claims' });
  }
});

export function parseVerificationRoutingPlan(value) {
  return VerificationRoutingPlanSchema.parse(value);
}
