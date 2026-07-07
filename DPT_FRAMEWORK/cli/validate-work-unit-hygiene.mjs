#!/usr/bin/env node
// @impl DEW-008, WPG-004, FIO-004, AGQ-005, SCO-009, WDC-004
// Static hygiene gate for the work-unit delegated path.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    root: { type: 'string', default: process.cwd() },
    json: { type: 'boolean', default: false },
  },
});

const repoRoot = values.root;

const SCAN_ROOTS = [
  'DPT_FRAMEWORK/cli',
  'DPT_FRAMEWORK/engine',
  'DPT_FRAMEWORK/schema',
  'DPT_FRAMEWORK/rb_templates',
  'DPT_FRAMEWORK/workflows',
  'DPT_FRAMEWORK/command_playbook',
  'guidelines',
  'experiments_env/shared',
  'tests',
];

const EXCLUDED_PATHS = new Set([
  'DPT_FRAMEWORK/CHANGELOG.md',
  'DPT_FRAMEWORK/cli/validate-work-unit-hygiene.mjs',
  'tests/integration/cli/validate-work-unit-hygiene.test.mjs',
]);

const DIAGNOSTIC_ONLY_PATHS = new Set([
  'DPT_FRAMEWORK/engine/helpers/file-observability.mjs',
  'tests/engine/helpers/file-observability.test.mjs',
  'tests/schema/contracts/queue.test.mjs',
  'tests/engine/queue-manager-receipts-cli-render.test.mjs',
  'tests/schema/verify-bundle-health.test.mjs',
]);

const TEXT_EXTENSIONS = new Set([
  '.js', '.mjs', '.json', '.jsonl', '.md', '.yaml', '.yml', '.tmpl', '.toml',
]);

const REMOVED_AUTHORITY_PATTERNS = [
  { pattern: /\bdrive-relay-slot\b/, code: 'removed_cli_drive_relay_slot' },
  { pattern: /\bvalidate-subagent-logging-contract\b/, code: 'removed_cli_validate_subagent_logging_contract' },
  { pattern: /\bsubagent-relay\b/, code: 'removed_engine_subagent_relay' },
  { pattern: /\bqueue-slots\b/, code: 'removed_schema_queue_slots' },
  { pattern: /\bSLOT_NAMES\b|\bQUEUE_ACTIVE_WINDOW_SLOTS\b/, code: 'removed_queue_slot_exports' },
  { pattern: /\bSlotResult\b|\bSubagentWorkflowState\b/, code: 'removed_slot_result_schema' },
  { pattern: /\bstageSubagentSlots\b|\bcommitSlotResult\b|\bcollectAndMergeSubagentResults\b/, code: 'removed_relay_engine_call' },
  { pattern: /\bresolveSlotFromResultRef\b|\bvalidateRuntimeReceipt\b/, code: 'removed_slot_receipt_helper' },
  { pattern: /\bslot_result_ref\b/, code: 'removed_slot_result_ref' },
  { pattern: /\bslotKey\b/, code: 'removed_slot_key_logging_context' },
  { pattern: /\bMAX_CONCURRENT_SUBAGENTS\b/, code: 'removed_relay_concurrency_cap' },
  { pattern: /\brelay_commit_done\b|\brelay_commit_missing\b|\brelay_spawn_requested\b/, code: 'removed_relay_log_event' },
  { pattern: /\brelay_required\b|\brelay_required_for_new_evidence\b|\brelay_task_md\b|\brelay-subagent-role\b/, code: 'removed_relay_execution_contract' },
  { pattern: /_subagents\//, code: 'removed_subagents_path' },
  { pattern: /\bslot_1_current\b|\bslot_2_next\b|\bslot_[0-9]+_pending\b|\bslot_20_tail\b/, code: 'removed_queue_slot_shape' },
];

const UNSUPPORTED_PROVENANCE_CHECKS = [
  'output_declaration_ledger_exists',
  'output_declaration_coverage',
  'subagent_slot_presence',
  'relay_bypass_suspected',
];

const SEMANTIC_PATTERNS = [
  {
    pattern: /(?:use|run|route)[\s\S]{0,80}operate-queue\s+complete[\s\S]{0,80}delegated|delegated successful completion[\s\S]{0,80}operate-queue\s+complete/i,
    code: 'delegated_operate_queue_complete',
    detail: 'Delegated successful completion must use operate-work-unit submit, not operate-queue complete.',
  },
  {
    pattern: /filesystem (?:presence|scan|path)[\s\S]{0,80}(?:satisf(?:y|ies)|counts as pass|pass coverage)/i,
    code: 'filesystem_pass_coverage_wording',
    detail: 'Filesystem presence must be diagnostic/cross-check only, not pass coverage.',
  },
  {
    pattern: /index (?:presence|state|entry)[\s\S]{0,80}(?:satisf(?:y|ies)|counts as pass|pass coverage)/i,
    code: 'index_pass_coverage_wording',
    detail: 'Work-unit index presence must be cross-check only, not pass coverage.',
  },
];

function normalizeRel(absPath) {
  return relative(repoRoot, absPath).split(sep).join('/');
}

function extensionOf(file) {
  const match = file.match(/(\.[^.]+)$/);
  return match ? match[1] : '';
}

function shouldSkip(relPath) {
  if (EXCLUDED_PATHS.has(relPath)) return true;
  if (relPath.split('/').some((part) => part.startsWith('_original_'))) return true;
  if (relPath.includes('/.git/')) return true;
  return false;
}

function* walk(root) {
  if (!existsSync(root)) return;
  const st = statSync(root);
  if (st.isFile()) {
    yield root;
    return;
  }
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const abs = join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.test-')) continue;
      yield* walk(abs);
    } else if (entry.isFile()) {
      yield abs;
    }
  }
}

function candidateFiles() {
  const files = [];
  for (const relRoot of SCAN_ROOTS) {
    const absRoot = join(repoRoot, relRoot);
    for (const file of walk(absRoot)) {
      const rel = normalizeRel(file);
      if (shouldSkip(rel)) continue;
      if (!TEXT_EXTENSIONS.has(extensionOf(rel)) && !rel.endsWith('.md.tmpl')) continue;
      files.push({ abs: file, rel });
    }
  }
  return files;
}

function lineNumber(text, index) {
  return text.slice(0, index).split('\n').length;
}

function addPatternIssues(issues, rel, text, rules, category) {
  if (DIAGNOSTIC_ONLY_PATHS.has(rel)) return;
  for (const rule of rules) {
    const match = rule.pattern.exec(text);
    rule.pattern.lastIndex = 0;
    if (!match) continue;
    issues.push({
      category,
      code: rule.code,
      file: rel,
      line: lineNumber(text, match.index),
      detail: rule.detail || `Removed work-unit replacement token matched: ${match[0]}`,
    });
  }
}

function checkGateDefinitions(issues) {
  const defsDir = join(repoRoot, 'DPT_FRAMEWORK/schema/gate_definitions');
  if (!existsSync(defsDir)) return;
  for (const file of walk(defsDir)) {
    const rel = normalizeRel(file);
    if (!rel.endsWith('.json')) continue;
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(file, 'utf-8'));
    } catch (error) {
      issues.push({ category: 'gate_definition', code: 'gate_definition_unparseable', file: rel, line: 1, detail: error.message });
      continue;
    }
    for (const [idx, rule] of (parsed.rules || []).entries()) {
      if (UNSUPPORTED_PROVENANCE_CHECKS.includes(rule.check)) {
        issues.push({
          category: 'gate_definition',
          code: 'unsupported_delegated_provenance_check',
          file: rel,
          line: 1,
          detail: `rules[${idx}].check uses removed check "${rule.check}". Use work_unit_ledger_exists, work_unit_output_coverage, work_unit_submission_presence, or delegated_bypass_suspected.`,
        });
      }
    }
  }
}

function checkQueueTemplate(issues) {
  const rel = 'DPT_FRAMEWORK/rb_templates/rb_queue.json.tmpl';
  const abs = join(repoRoot, rel);
  if (!existsSync(abs)) return;
  const raw = readFileSync(abs, 'utf-8');
  for (const token of ['"work_id"', 'slot_1_current', 'slot_2_next', 'slot_20_tail']) {
    const idx = raw.indexOf(token);
    if (idx !== -1) {
      issues.push({
        category: 'queue_semantics',
        code: 'queue_template_old_identity_or_slot_shape',
        file: rel,
        line: lineNumber(raw, idx),
        detail: `Queue template contains removed token ${token}; queue demand identity is queue_item_id and queue v2 uses active_window/refill_pool/delegated_in_flight.`,
      });
    }
  }
}

function checkRequiredWiring(issues) {
  const gateHelperRel = 'DPT_FRAMEWORK/engine/helpers/gate-helpers-provenance.mjs';
  const gateHelper = readFileSync(join(repoRoot, gateHelperRel), 'utf-8');
  for (const exported of ['checkWorkUnitLedgerExists', 'checkWorkUnitOutputCoverage', 'checkWorkUnitSubmissionPresence', 'checkDelegatedBypassSuspected']) {
    if (!gateHelper.includes(`export function ${exported}`)) {
      issues.push({ category: 'wiring', code: 'missing_work_unit_gate_helper', file: gateHelperRel, line: 1, detail: `${exported} is not exported from gate provenance helpers.` });
    }
  }

  for (const gate of ['wave0', 'wave1', 'wave2']) {
    const rel = `DPT_FRAMEWORK/cli/gates/check-gate-${gate}-complete.mjs`;
    const text = readFileSync(join(repoRoot, rel), 'utf-8');
    for (const required of ['checkWorkUnitLedgerExists', 'checkWorkUnitOutputCoverage', 'checkWorkUnitSubmissionPresence', 'checkDelegatedBypassSuspected']) {
      if (!text.includes(required)) {
        issues.push({ category: 'wiring', code: 'gate_cli_missing_work_unit_helper', file: rel, line: 1, detail: `${rel} does not reference ${required}.` });
      }
    }
  }

  const operateRel = 'DPT_FRAMEWORK/cli/operate-work-unit.mjs';
  const operate = readFileSync(join(repoRoot, operateRel), 'utf-8');
  for (const required of ['claimWorkUnits', 'submitWorkUnit', 'closeWorkUnitAttempt', 'openWorkUnitBatch', 'inspectWorkUnits']) {
    if (!operate.includes(required)) {
      issues.push({ category: 'wiring', code: 'operate_work_unit_missing_helper', file: operateRel, line: 1, detail: `${operateRel} does not reference ${required}.` });
    }
  }
}

const issues = [];
for (const file of candidateFiles()) {
  const text = readFileSync(file.abs, 'utf-8');
  addPatternIssues(issues, file.rel, text, REMOVED_AUTHORITY_PATTERNS, 'removed_authority');
  addPatternIssues(issues, file.rel, text, SEMANTIC_PATTERNS, 'semantic_hygiene');
}
checkGateDefinitions(issues);
checkQueueTemplate(issues);
checkRequiredWiring(issues);

const result = {
  passed: issues.length === 0,
  issue_count: issues.length,
  issues,
};

if (values.json) {
  console.log(JSON.stringify(result, null, 2));
} else if (result.passed) {
  console.log('validate-work-unit-hygiene: passed');
} else {
  console.log(`validate-work-unit-hygiene: ${issues.length} issue(s)`);
  for (const issue of issues) {
    console.log(`- ${issue.file}:${issue.line} [${issue.code}] ${issue.detail}`);
  }
}

process.exit(result.passed ? 0 : 1);
