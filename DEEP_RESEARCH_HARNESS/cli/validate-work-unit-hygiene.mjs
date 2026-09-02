#!/usr/bin/env node
// @impl RET-006, DEW-001, DEW-008, AGQ-019, FRE-005, RWG-018
// Static hygiene gate for the current work-unit delegated path.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { parseArgs } from 'node:util';

import {
  QueueDemandItemSchema,
} from '../schema/contracts/queue.mjs';
import {
  QueueResultSchema,
} from '../engine/queue-manager-core.mjs';
import { readGateDefinitionSnapshot } from '../schema/contracts/gate-definition.mjs';

const { values } = parseArgs({
  options: {
    root: { type: 'string', default: process.cwd() },
    json: { type: 'boolean', default: false },
  },
});

const repoRoot = values.root;

const SCAN_ROOTS = [
  'openspec/specs',
  'openspec/changes',
  'openspec/governance',
  'DEEP_RESEARCH_HARNESS',
  'tests',
  'guidelines',
  'experiments_env/shared',
  'experiments_playbook',
  '_backlog/bugs',
  '_backlog/plans',
  '_backlog/todos',
  'README.md',
  'AGENTS.md',
];

const TEXT_EXTENSIONS = new Set([
  '.js', '.mjs', '.json', '.jsonl', '.md', '.yaml', '.yml', '.tmpl', '.toml',
]);

const ACTIVE_CLEANUP_PREFIX = 'openspec/changes/clean-delegated-work-surfaces/';

const RETIRED_PATTERNS = [
  { pattern: /\bdrive-relay-slot\b/, code: 'removed_cli_drive_relay_slot' },
  { pattern: /\bvalidate-subagent-logging-contract\b/, code: 'removed_cli_validate_subagent_logging_contract' },
  { pattern: /\bsubagent-relay(?:\.mjs)?\b/, code: 'removed_engine_subagent_relay' },
  { pattern: /\bqueue-slots\b/, code: 'removed_schema_queue_slots' },
  { pattern: /\bSLOT_NAMES\b|\bQUEUE_ACTIVE_WINDOW_SLOTS\b/, code: 'removed_queue_slot_exports' },
  { pattern: /\bSlotResult\b|\bSubagentWorkflowState\b/, code: 'removed_slot_result_schema' },
  { pattern: /\bstageSubagentSlots\b|\bcommitSlotResult\b|\bcollectAndMergeSubagentResults\b/, code: 'removed_relay_engine_call' },
  { pattern: /\brecordAgentSpawnRequested\b|\bingestAgentReceipt\b|\brunProvenanceForensics\b/, code: 'removed_relay_engine_call' },
  { pattern: /\bresolveSlotFromResultRef\b|\bvalidateRuntimeReceipt\b|\btaskMarkdownForSlot\b/, code: 'removed_slot_receipt_helper' },
  { pattern: /\bslot_result_ref\b/, code: 'removed_slot_result_ref' },
  { pattern: /\bsubagent_slot_presence\b/, code: 'removed_subagent_slot_presence' },
  { pattern: /\bslotKey\b/, code: 'removed_slot_key_logging_context' },
  { pattern: /\broleAgentKey\b/, code: 'removed_role_agent_key_logging_context' },
  { pattern: /\bMAX_CONCURRENT_SUBAGENTS\b/, code: 'removed_relay_concurrency_cap' },
  { pattern: /\brelay_commit_done\b|\brelay_commit_missing\b|\brelay_spawn_requested\b|\brelay_commit_[a-z0-9_]*\b|\brelay_spawn_[a-z0-9_]*\b/, code: 'removed_relay_log_event' },
  { pattern: /\brelay_required\b|\brelay_required_for_new_evidence\b|\brelay_task_md\b|\brelay-subagent-role\b|\brelay-managed\b/, code: 'removed_relay_execution_contract' },
  { pattern: /_subagents\//, code: 'removed_subagents_path' },
  { pattern: /\bdispatch\.json\b/, code: 'removed_dispatch_manifest' },
  { pattern: /\bbounded slots\b|\brelay slots?\b|\brelay-slot\b|\bslot task\b|\bslot result\b|\bslot artifact\b/i, code: 'removed_slot_wording' },
  { pattern: /\bslot_1_current\b|\bslot_2_next\b|\bslot_[0-9]+_pending\b|\bslot_5_tail\b|\bslot_20_tail\b/, code: 'removed_queue_slot_shape' },
];

const SEMANTIC_PATTERNS = [
  {
    pattern: /(?:use|run|route)[\s\S]{0,80}operate-queue\s+complete[\s\S]{0,80}(?<!non-)delegated|delegated successful completion[\s\S]{0,80}operate-queue\s+complete/i,
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
  {
    pattern: /five-slot active window|fixed five-slot|5-slot active window|five named slots/i,
    code: 'old_queue_fixed_active_window',
    detail: 'Queue v2 uses ordered active_window with QUEUE_ACTIVE_WINDOW_LIMIT, not a fixed five-slot state model.',
  },
  {
    pattern: /test-simple\.md|test-medium\.md|test-complex\.md|simple, medium, and complex experiment playbooks/i,
    code: 'old_experiment_taxonomy',
    detail: 'Current command experiments use case/cost playbook naming, not old test-simple/test-medium/test-complex runner guidance.',
  },
  {
    pattern: /\|\s*`work_id`\s*\|\s*yes\s*\|/,
    code: 'queue_demand_work_id_table',
    detail: 'Queue demand task-card tables must use queue_item_id; work_id is Engine-allocated only when claimed.',
  },
];

const CONTEXT_SENSITIVE_PATTERNS = [
  { pattern: /\bruntime_receipt_ref\b/, code: 'runtime_receipt_ref_context' },
  { pattern: /\breceipt_nonce\b/, code: 'receipt_nonce_context' },
  { pattern: /\breceiptNonce\b/, code: 'receipt_nonce_camel_context' },
  { pattern: /_beacon\.json\b/, code: 'beacon_context' },
];

const UNSUPPORTED_PROVENANCE_CHECKS = [
  'output_declaration_ledger_exists',
  'output_declaration_coverage',
  'subagent_slot_presence',
  'relay_bypass_suspected',
];

function normalizeRel(absPath) {
  return relative(repoRoot, absPath).split(sep).join('/');
}

function extensionOf(file) {
  const match = file.match(/(\.[^.]+)$/);
  return match ? match[1] : '';
}

function isOriginalArchive(relPath) {
  return relPath.split('/').some((part) => part.startsWith('_original_'));
}

function shouldSkip(relPath) {
  if (relPath === '') return true;
  if (relPath.startsWith('openspec/changes/archive/')) return true;
  if (isOriginalArchive(relPath)) return true;
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

function lineAt(text, index) {
  const lines = text.split(/\r?\n/);
  return lines[lineNumber(text, index) - 1] || '';
}

function windowAround(text, index, radius = 220) {
  return text.slice(Math.max(0, index - radius), Math.min(text.length, index + radius));
}

function isCheckerSelfReference(rel) {
  return rel === 'DEEP_RESEARCH_HARNESS/cli/validate-work-unit-hygiene.mjs'
    || rel === 'tests/integration/cli/validate-work-unit-hygiene.test.mjs';
}

function isDeprecatedRegistry(rel, line) {
  return rel === 'openspec/governance/req-registry.yaml' && /\[DEPRECATED\]|no spec directory|all entries deprecated/i.test(line);
}

function isCleanupControl(rel) {
  return rel.startsWith(ACTIVE_CLEANUP_PREFIX);
}

function isReleaseHistoryMinimized(rel, line) {
  return rel === 'DEEP_RESEARCH_HARNESS/CHANGELOG.md'
    && /\b(v0\.[0-3]|prior|previously|replaced|removed|retired|old|legacy|deprecated)\b/i.test(line);
}

function isCurrentWorkUnitContext(rel, context) {
  if (!/(work-unit|work_unit|_work_units|operate-work-unit|receipt_nonce|runtime_receipt_ref|_beacon\.json)/i.test(context)) return false;
  if (/(drive-relay-slot|subagent-relay|_subagents\/|slot_result_ref|subagent_slot_presence|slotKey|roleAgentKey|relay_commit|relay_spawn|dispatch\.json|slot_1_current|slot_2_next|slot_5_tail)/i.test(context)) return false;
  return /(^openspec\/specs\/|^openspec\/changes\/clean-delegated-work-surfaces\/|^DEEP_RESEARCH_HARNESS\/|^tests\/|^experiments_playbook\/)/.test(rel);
}

function isNegativeContext(rel, context) {
  return /(reject|rejected|rejects|fail(?:s|ed)? closed|non-authoritative|diagnostic only|bypass|orphan|cannot pass|do not use|must not|shall not|not current|removed|retired|deprecated|negative|hygiene failure|not output authority|does NOT make it pass|absence)/i.test(context)
    && !/(golden path|happy path|production path|current proof|current production proof|use .* as proof)/i.test(context);
}

function hasRetiredContext(context) {
  return /(drive-relay-slot|subagent-relay|_subagents\/|slot_result_ref|subagent_slot_presence|slotKey|roleAgentKey|relay_commit|relay_spawn|dispatch\.json|stageSubagentSlots|commitSlotResult|collectAndMergeSubagentResults|recordAgentSpawnRequested|ingestAgentReceipt|runProvenanceForensics|slot_1_current|slot_2_next|slot_5_tail|slot_[0-9]+_pending)/i.test(context);
}

function isPastFailureHistory(rel, context) {
  if (!/^_backlog\/(bugs|plans|todos)\//.test(rel)) return false;
  return /(past|history|historical|removed design|retired|old|legacy|failure analysis|failed|brittle|broken|impassable|why .* grew complex|replacement|superseded|do not use|no longer current|bug-|drift|first failed|首次失败|废弃|已废弃|守卫存在但覆盖不到)/i.test(context);
}

function isHistoricalPlanFamilyEnumeration(rel, line) {
  // Historical _backlog plan docs enumerate retired capability families and
  // their DEPRECATED-ID counts as failure history; the tokens name retired
  // families, not current work-unit authority surfaces.
  if (!/^_backlog\/plans\//.test(rel)) return false;
  return /(时代遗留|遗留家族|已退役|retired famil|DEPRECATED ID|死前缀)/i.test(line);
}

function isAllowedOccurrence(rel, line, context, { contextSensitive = false } = {}) {
  if (isCheckerSelfReference(rel)) return { allowed: true, reason: 'checker-self-reference' };
  if (isCleanupControl(rel)) return { allowed: true, reason: 'cleanup-control' };
  if (isDeprecatedRegistry(rel, line)) return { allowed: true, reason: 'deprecated-registry' };
  if (isReleaseHistoryMinimized(rel, line)) return { allowed: true, reason: 'release-history-minimized' };
  if (isNegativeContext(rel, context)) return { allowed: true, reason: 'negative' };
  if (isPastFailureHistory(rel, context)) return { allowed: true, reason: 'past-failure-history' };
  if (isHistoricalPlanFamilyEnumeration(rel, line)) return { allowed: true, reason: 'historical-plan-family-enumeration' };
  if (contextSensitive && isCurrentWorkUnitContext(rel, context)) return { allowed: true, reason: 'current-work-unit-context' };
  return { allowed: false, reason: null };
}

function addIssue(issues, issue) {
  issues.push(issue);
}

function addPatternIssues(issues, rel, text, rules, category) {
  for (const rule of rules) {
    const flags = rule.pattern.flags.includes('g') ? rule.pattern.flags : `${rule.pattern.flags}g`;
    const pattern = new RegExp(rule.pattern.source, flags);
    for (const match of text.matchAll(pattern)) {
      const line = lineAt(text, match.index);
      const context = windowAround(text, match.index);
      const allowed = isAllowedOccurrence(rel, line, context);
      if (allowed.allowed) continue;
      addIssue(issues, {
        category,
        code: rule.code,
        file: rel,
        line: lineNumber(text, match.index),
        detail: rule.detail || `Retired work-unit replacement token matched: ${match[0]}`,
      });
    }
  }
}

function addContextSensitiveIssues(issues, rel, text) {
  for (const rule of CONTEXT_SENSITIVE_PATTERNS) {
    const pattern = new RegExp(rule.pattern.source, `${rule.pattern.flags.includes('i') ? 'i' : ''}g`);
    for (const match of text.matchAll(pattern)) {
      const line = lineAt(text, match.index);
      const context = windowAround(text, match.index);
      if (!hasRetiredContext(context)) continue;
      const allowed = isAllowedOccurrence(rel, line, context, { contextSensitive: true });
      if (allowed.allowed) continue;
      addIssue(issues, {
        category: 'context_sensitive',
        code: rule.code,
        file: rel,
        line: lineNumber(text, match.index),
        detail: `Context-sensitive work-unit field "${match[0]}" is not in an allowed work-unit, negative, deprecated, cleanup, release-history, or past-failure context.`,
      });
    }
  }
}

function checkGateDefinitions(issues) {
  const defsDir = join(repoRoot, 'DEEP_RESEARCH_HARNESS/schema/gate_definitions');
  if (!existsSync(defsDir)) return;
  for (const file of walk(defsDir)) {
    const rel = normalizeRel(file);
    if (!rel.endsWith('.json')) continue;
    let parsed;
    try {
      parsed = readGateDefinitionSnapshot(file).definition;
    } catch (error) {
      addIssue(issues, { category: 'gate_definition', code: 'gate_definition_unparseable', file: rel, line: 1, detail: jsonErrorDetail(error) });
      continue;
    }
    for (const [idx, rule] of (parsed.rules || []).entries()) {
      if (UNSUPPORTED_PROVENANCE_CHECKS.includes(rule.check)) {
        addIssue(issues, {
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
  const rel = 'DEEP_RESEARCH_HARNESS/rb_templates/rb_queue.json.tmpl';
  const abs = join(repoRoot, rel);
  if (!existsSync(abs)) return;
  const raw = readFileSync(abs, 'utf-8');
  for (const token of ['"work_id"', 'slot_1_current', 'slot_2_next', 'slot_20_tail']) {
    const idx = raw.indexOf(token);
    if (idx !== -1) {
      addIssue(issues, {
        category: 'queue_semantics',
        code: 'queue_template_old_identity_or_slot_shape',
        file: rel,
        line: lineNumber(raw, idx),
        detail: `Queue template contains removed token ${token}; queue demand identity is queue_item_id and queue v2 uses active_window/refill_pool/delegated_in_flight.`,
      });
    }
  }
}

function jsonErrorDetail(error) {
  if (error?.issues) {
    return error.issues.map((issue) => {
      const at = issue.path?.length ? issue.path.join('.') : '<root>';
      return `${at}: ${issue.message}`;
    }).join('; ');
  }
  return error?.message || String(error);
}

function extractJsonFences(text) {
  const blocks = [];
  const pattern = /```json\s*\n(?<body>[\s\S]*?)\n```/g;
  for (const match of text.matchAll(pattern)) {
    blocks.push({
      body: match.groups.body,
      index: match.index,
    });
  }
  return blocks;
}

function extractBoxedQueueResultExamples(text) {
  const examples = [];
  const pattern = /\{\s*"(?<identity>work_id|queue_item_id)"\s*:\s*"(?<id>[^"]*)"\s*,\s*"receipt"\s*:\s*"(?<receipt>[^"]*)"\s*,\s*"summary"\s*:\s*"(?<summary>[^"]*)"\s*,\s*"writes"\s*:\s*\[(?<writes>[^\]]*)\]\s*\}/g;
  for (const match of text.matchAll(pattern)) {
    const writes = [...match.groups.writes.matchAll(/"([^"]+)"/g)].map((item) => item[1]);
    examples.push({
      index: match.index,
      value: {
        [match.groups.identity]: match.groups.id,
        receipt: match.groups.receipt,
        summary: match.groups.summary,
        writes,
      },
    });
  }
  return examples;
}

function checkQueueDemandExample(issues, rel, line, value) {
  const parsed = QueueDemandItemSchema.safeParse(value);
  if (!parsed.success) {
    addIssue(issues, {
      category: 'queue_phase_examples',
      code: 'phase_queue_task_card_schema_mismatch',
      file: rel,
      line,
      detail: `Phase task-card JSON example must parse as QueueDemandItemSchema: ${jsonErrorDetail(parsed.error)}`,
    });
  }
}

function checkQueueResultExample(issues, rel, line, value) {
  const parsed = QueueResultSchema.safeParse(value);
  if (!parsed.success) {
    addIssue(issues, {
      category: 'queue_phase_examples',
      code: 'phase_queue_result_schema_mismatch',
      file: rel,
      line,
      detail: `Phase queue complete result example must parse as QueueResultSchema: ${jsonErrorDetail(parsed.error)}`,
    });
  }
  if (Object.hasOwn(value, 'work_id')) {
    addIssue(issues, {
      category: 'queue_phase_examples',
      code: 'phase_queue_result_uses_work_id',
      file: rel,
      line,
      detail: 'Queue complete result examples must use queue_item_id; work_id is reserved for delegated work-unit attempts.',
    });
  }
}

function checkPhaseQueueExamples(issues) {
  const phasesDir = join(repoRoot, 'DEEP_RESEARCH_HARNESS/workflows/nodes/phases');
  if (!existsSync(phasesDir)) return;
  for (const file of walk(phasesDir)) {
    const rel = normalizeRel(file);
    if (!rel.endsWith('.md')) continue;
    const text = readFileSync(file, 'utf-8');
    for (const block of extractJsonFences(text)) {
      let parsed;
      try {
        parsed = JSON.parse(block.body);
      } catch (error) {
        addIssue(issues, {
          category: 'queue_phase_examples',
          code: 'phase_json_example_unparseable',
          file: rel,
          line: lineNumber(text, block.index),
          detail: `JSON example is not parseable: ${error.message || String(error)}`,
        });
        continue;
      }
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Object.hasOwn(parsed, 'producer_rule')) {
        checkQueueDemandExample(issues, rel, lineNumber(text, block.index), parsed);
      }
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && (Object.hasOwn(parsed, 'queue_item_id') || Object.hasOwn(parsed, 'work_id')) && (Object.hasOwn(parsed, 'receipt') || Object.hasOwn(parsed, 'writes'))) {
        checkQueueResultExample(issues, rel, lineNumber(text, block.index), parsed);
      }
    }
    for (const example of extractBoxedQueueResultExamples(text)) {
      checkQueueResultExample(issues, rel, lineNumber(text, example.index), example.value);
    }
  }
}

function checkRequiredWiring(issues) {
  const gateHelperRel = 'DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-provenance.mjs';
  const gateHelperAbs = join(repoRoot, gateHelperRel);
  if (!existsSync(gateHelperAbs)) {
    addIssue(issues, { category: 'wiring', code: 'missing_work_unit_gate_helper_file', file: gateHelperRel, line: 1, detail: `${gateHelperRel} is missing.` });
    return;
  }
  const gateHelper = readFileSync(gateHelperAbs, 'utf-8');
  for (const exported of ['checkWorkUnitLedgerExists', 'checkWorkUnitOutputCoverage', 'checkWorkUnitSubmissionPresence', 'scanDelegatedBypassSuspicion', 'emitDelegatedBypassDiagnostic']) {
    if (!gateHelper.includes(`export function ${exported}`)) {
      addIssue(issues, { category: 'wiring', code: 'missing_work_unit_gate_helper', file: gateHelperRel, line: 1, detail: `${exported} is not exported from gate provenance helpers.` });
    }
  }

  const evaluatorRel = 'DEEP_RESEARCH_HARNESS/engine/helpers/wave-contract-evaluators.mjs';
  const evaluatorAbs = join(repoRoot, evaluatorRel);
  if (!existsSync(evaluatorAbs)) {
    addIssue(issues, { category: 'wiring', code: 'missing_wave_contract_evaluator_file', file: evaluatorRel, line: 1, detail: `${evaluatorRel} is missing.` });
    return;
  }
  const evaluator = readFileSync(evaluatorAbs, 'utf-8');
  for (const required of ['checkWorkUnitLedgerExists', 'checkWorkUnitOutputCoverage', 'checkWorkUnitSubmissionPresence', 'scanDelegatedBypassSuspicion']) {
    if (!evaluator.includes(required)) {
      addIssue(issues, { category: 'wiring', code: 'wave_contract_evaluator_missing_work_unit_helper', file: evaluatorRel, line: 1, detail: `${evaluatorRel} does not reference ${required}.` });
    }
  }

  for (const gate of ['wave0', 'wave1', 'wave2']) {
    const rel = `DEEP_RESEARCH_HARNESS/cli/gates/check-gate-${gate}-complete.mjs`;
    const abs = join(repoRoot, rel);
    if (!existsSync(abs)) {
      addIssue(issues, { category: 'wiring', code: 'missing_gate_cli', file: rel, line: 1, detail: `${rel} is missing.` });
      continue;
    }
    const text = readFileSync(abs, 'utf-8');
    const evaluatorName = `evaluate${gate[0].toUpperCase()}${gate.slice(1)}Contract`;
    if (!text.includes(evaluatorName)) {
      addIssue(issues, { category: 'wiring', code: 'gate_cli_missing_wave_contract_evaluator', file: rel, line: 1, detail: `${rel} does not reference ${evaluatorName}.` });
    }
    if (!text.includes('emitDelegatedBypassDiagnostic')) {
      addIssue(issues, { category: 'wiring', code: 'gate_cli_missing_formal_bypass_emitter', file: rel, line: 1, detail: `${rel} does not retain formal-only emitDelegatedBypassDiagnostic ownership.` });
    }
  }

  const operateRel = 'DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs';
  const operateAbs = join(repoRoot, operateRel);
  if (!existsSync(operateAbs)) {
    addIssue(issues, { category: 'wiring', code: 'operate_work_unit_missing_cli', file: operateRel, line: 1, detail: `${operateRel} is missing.` });
    return;
  }
  const operate = readFileSync(operateAbs, 'utf-8');
  for (const required of ['claimWorkUnits', 'submitWorkUnit', 'closeWorkUnitAttempt', 'openWorkUnitBatch', 'inspectWorkUnits']) {
    if (!operate.includes(required)) {
      addIssue(issues, { category: 'wiring', code: 'operate_work_unit_missing_helper', file: operateRel, line: 1, detail: `${operateRel} does not reference ${required}.` });
    }
  }
}

const issues = [];
for (const file of candidateFiles()) {
  const text = readFileSync(file.abs, 'utf-8');
  addPatternIssues(issues, file.rel, text, RETIRED_PATTERNS, 'removed_authority');
  addPatternIssues(issues, file.rel, text, SEMANTIC_PATTERNS, 'semantic_hygiene');
  addContextSensitiveIssues(issues, file.rel, text);
}
checkGateDefinitions(issues);
checkQueueTemplate(issues);
checkPhaseQueueExamples(issues);
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
