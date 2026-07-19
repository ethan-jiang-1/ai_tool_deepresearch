#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

import {
  normalizeLedgerBundlePlan,
  readAndValidateManifest,
  renderRuntimeTokens,
  validateCaseCompatibilityLedger,
} from '../../../DPT_FRAMEWORK/host_tools/lib/agent-experiment-contract.mjs';

const changeRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(changeRoot, '..', '..', '..');
const ledger = parseYaml(readFileSync(resolve(changeRoot, 'case-compatibility-ledger.yaml'), 'utf8'));
const manifest = readAndValidateManifest({ repoRoot, requireExactCorpus: true });
const defaults = ledger.defaults;

function fail(message) {
  throw new Error(message);
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function assertSourceContract(entry, source) {
  const label = entry.frontmatter.case;
  const finalizers = source.match(/\bfinalize-agent-experiment\.mjs\b/g) || [];
  if (finalizers.length !== 1) fail(`${label} must contain exactly one native finalizer invocation`);
  if (!source.includes('--target-dir {{CASE_RUN_ROOT_SH}}')) fail(`${label} has no explicit case-run-root creator target`);
  if (/\/tmp\//.test(source)) fail(`${label} uses /tmp runtime state`);
  if (/Optional Automation Smoke/i.test(source)) fail(`${label} retains an optional-only execution path`);
  if (/^#{1,6}\s+.*Cleanup\s*$/im.test(source) || /\bvalidate-bundle-health\.mjs\b/.test(source)) {
    fail(`${label} retains playbook-local health or cleanup authority`);
  }
  if (/\bwriteTraceVerdict\b|\bexp_result\.json\b|_run_log\.jsonl|exp_verdicts\.jsonl/.test(source)) {
    fail(`${label} retains a legacy verdict/result fallback`);
  }
  if (/(?:^|\n)\s*(?:cp|ln)\s[^\n]*(?:DPT_FRAMEWORK|experiments_env|tests)(?:\s|$)/.test(source)) {
    fail(`${label} copies or links a repository source tree`);
  }
  renderRuntimeTokens(source, {
    RUN_CONTEXT_SH: '/tmp-compatible-placeholder/run.json',
    CASE_RUN_ROOT_SH: '/tmp-compatible-placeholder/case-root',
    PLAYBOOK_STATE_DIR_SH: '/tmp-compatible-placeholder/case-root/_playbook_state',
  });
}

validateCaseCompatibilityLedger(ledger);
const expectedPaths = ledger.cases.map((row) => relative(resolve(repoRoot, 'experiments_playbook'), resolve(repoRoot, row.path)).split('\\').join('/'));
if (!same(manifest.paths, expectedPaths)) fail('final manifest path/order does not exact-match the checked ledger target');

const byCase = new Map(manifest.entries.map((entry) => [entry.frontmatter.case, entry]));
for (const row of ledger.cases) {
  const entry = byCase.get(row.case);
  if (!entry) fail(`manifest is missing ${row.case}`);
  const fm = entry.frontmatter;
  const plan = normalizeLedgerBundlePlan(row, defaults);
  const expectedProof = row.proof;
  const expectedNotRun = row.not_run === null ? false : true;
  const comparisons = [
    ['path', `experiments_playbook/${entry.path}`, row.path],
    ['cost', entry.cost, row.cost],
    ['verdict_mode', fm.verdict_mode, row.verdict_mode],
    ['required_checks', fm.required_checks, row.required_checks],
    ['bundle_roles', fm.bundle_roles, plan.roles],
    ['verdict_role', fm.verdict_role, plan.verdictRole],
    ['health_roles', fm.health_roles, plan.healthRoles],
    ['health_profile', fm.health_profile, row.health_profile],
    ['proof_subject', fm.proof_subject, expectedProof.subject],
    ['subject_execution', fm.subject_execution, expectedProof.execution],
    ['fixture', fm.fixture, expectedProof.fixture],
    ['runtime', fm.runtime, 'real_disposable_bundle'],
    ['external_calls', fm.external_calls, expectedProof.external],
    ['verdict_judge', fm.verdict_judge, expectedProof.judge],
    ['durable_evidence_roles', fm.durable_evidence_roles, row.durable_evidence_roles],
    ['not_run_if presence', Boolean(fm.not_run_if), expectedNotRun],
  ];
  for (const [field, actual, expected] of comparisons) {
    if (!same(actual, expected)) fail(`${row.case} ${field} drifted: actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`);
  }
  assertSourceContract(entry, readFileSync(entry.fullPath, 'utf8'));
}

console.log(JSON.stringify({ ok: true, active_count: manifest.entries.length, ledger: validateCaseCompatibilityLedger(ledger) }));
