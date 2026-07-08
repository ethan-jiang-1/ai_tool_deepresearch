// gate-helpers-readers.mjs — Bundle file readers: plan, profile, frontmatter, declarations, validators, file listing
// @impl GSK-001, FRE-003
// Canonical location: DPT_FRAMEWORK/engine/helpers/gate-helpers-readers.mjs
//
// Re-exported by gate-helpers.mjs for backward compatibility.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, basename, dirname } from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  PlanSchema,
  WorkUnitIndexSchema,
  WorkUnitLedgerRecordSchema,
} from '../../schema/index.mjs';
import { readBundleName } from '../logger.mjs';
import { z } from 'zod';

// ─── Markdown Frontmatter Parsing ──────────────────────────────────────────

/**
 * Parse YAML frontmatter from a Markdown string.
 * @impl FRE-003
 */
export function parseMdFrontmatter(rawString) {
  const m = rawString.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  return parseYaml(m[1]);
}

/**
 * Strip YAML frontmatter from a Markdown string and return the trimmed body.
 *
 * Inverse of `parseMdFrontmatter()`: extracts everything after the first `---`
 * frontmatter block. Only the first `---` pair (anchored to start of string)
 * is stripped — subsequent `---` in the body are left intact.
 * If no frontmatter block exists, returns the trimmed input unchanged.
 *
 * @param {string} mdContent — raw Markdown content
 * @returns {string} trimmed body content after frontmatter
 *
 * @impl SCO-012
 */
export function stripMdFrontmatter(mdContent) {
  return mdContent.replace(/^---[\s\S]*?---\n?/, '').trim();
}

/**
 * Read and parse the frontmatter of rb_plan.md in a bundle directory.
 *
 * @param {string} bundlePath — path to the bundle directory
 * @returns {object|null} parsed plan frontmatter object, or null if file is missing
 * @impl FRE-003
 */
export function readBundlePlan(bundlePath) {
  const planPath = join(bundlePath, 'rb_plan.md');
  if (!existsSync(planPath)) return null;
  const raw = readFileSync(planPath, 'utf-8');
  return parseMdFrontmatter(raw);
}

// ─── Profile Reading ─────────────────────────────────────────────────────────

/**
 * Read and parse rb_profile.yaml in a bundle directory.
 *
 * Stateless reader — each call reads from disk. Callers that evaluate
 * multiple count_floor rules should wrap with a lazy cache (same
 * pattern as `_planCache` / `_statusCache` in the gate CLIs).
 *
 * Cache safety: rb_profile.yaml is immutable after HITL1 — profile is
 * never rewritten by downstream phases. Rerun paths create a new CLI
 * process, so in-memory cache lifetime per process is correct.
 *
 * @param {string} bundlePath — path to the bundle directory
 * @returns {object|null} parsed profile object, or null if file is missing
 */
export function readBundleProfile(bundlePath) {
  const profilePath = join(bundlePath, 'rb_profile.yaml');
  if (!existsSync(profilePath)) return null;
  const raw = readFileSync(profilePath, 'utf-8');
  try {
    const parsed = parseYaml(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Resolve a count_floor threshold from a gate rule + bundle profile.
 *
 * If `rule.threshold_source` is set, walks the profile object at the
 * `#/` path to find the dynamic threshold. Falls back to the rule's
 * hardcoded `threshold` when:
 * - `threshold_source` is absent on the rule
 * - profile is null/undefined (missing rb_profile.yaml)
 * - path does not resolve to a value in the profile
 * - resolved value is not a finite positive number (zero, negative, NaN,
 *   or non-numeric — safety: floor=0 would make any count pass vacuously)
 *
 * YAML type coercion: `parseYaml` may parse integer-like values as
 * number or string depending on YAML quoting (e.g. `12` → number 12,
 * `"12"` → string "12"). This function coerces via `Number()` so both
 * forms compare correctly against `rule.threshold` (always a number in
 * gate definition JSON).
 *
 * @param {object} rule — gate definition rule with optional `threshold_source` and required `threshold`
 * @param {object|null} profile — parsed rb_profile.yaml, or null if missing
 * @returns {number} the resolved threshold value (always a positive integer)
 */
export function resolveThreshold(rule, profile) {
  // No threshold_source → use hardcoded threshold (backward compat)
  if (!rule.threshold_source) {
    return rule.threshold;
  }

  // No profile → fallback to hardcoded threshold
  if (!profile || typeof profile !== 'object') {
    return rule.threshold;
  }

  try {
    // Parse path: "rb_profile.yaml#/research_style_params/wave0_shared_ref_floor"
    const hashIdx = rule.threshold_source.indexOf('#/');
    if (hashIdx === -1) return rule.threshold;

    const jsonPath = rule.threshold_source.slice(hashIdx + 2); // after "#/"
    if (!jsonPath) return rule.threshold;

    const value = jsonPath.split('/').reduce((obj, key) => obj?.[key], profile);

    // Coerce: YAML may parse numbers as string or number
    const num = Number(value);
    // Safety: never use floor ≤ 0 — a zero threshold would make any
    // count pass vacuously, masking real gaps
    if (!Number.isFinite(num) || num <= 0) {
      return rule.threshold;
    }

    return num;
  } catch {
    return rule.threshold;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Schema Validation Helpers
// ═══════════════════════════════════════════════════════════════════════════

export function validateState(state, caller) {
  if (typeof state !== 'object' || state === null || Array.isArray(state)) {
    throw new Error(`${caller}: state 必须是普通对象 (plain dict)，不能是 null 或数组`);
  }
}

/**
 * Throw if any rule is invalid.
 * Each rule must have: key (string), say (string), and at least one of
 * schema (with safeParse) or check (function).
 */
export function validateRules(rules, caller) {
  if (!Array.isArray(rules) || rules.length === 0) {
    throw new Error(`${caller}: rules 必须是非空数组`);
  }
  rules.forEach((r, i) => {
    if (typeof r.key !== 'string' || r.key.length === 0) {
      throw new Error(`${caller}: rules[${i}].key 必须是非空字符串`);
    }
    if (typeof r.say !== 'string') {
      throw new Error(`${caller}: rules[${i}].say 必须是字符串`);
    }
    if (!r.schema && !r.check) {
      throw new Error(`${caller}: rules[${i}] (key="${r.key}") 必须提供 schema 或 check`);
    }
    if (r.schema && typeof r.schema.safeParse !== 'function') {
      throw new Error(`${caller}: rules[${i}].schema 必须是 Zod schema（需有 safeParse 方法）`);
    }
    if (r.check && typeof r.check !== 'function') {
      throw new Error(`${caller}: rules[${i}].check 必须是函数`);
    }
  });
}

/**
 * Map ZodError issues to plain diagnostics array.
 */
export function zodErrors(error) {
  return error.issues.map(i => ({
    field:    i.path.join('.'),
    code:     i.code,
    message:  i.message,
    received: i.received,
    expected: i.expected,
  }));
}


// ═══════════════════════════════════════════════════════════════════════════
// File Listing & Declaration Helpers
// ═══════════════════════════════════════════════════════════════════════════

export function listMatchingBundleFiles(bundlePath, target) {
  const targetDir = join(bundlePath, dirname(target));
  const pattern = basename(target);
  if (!existsSync(targetDir) || !statSync(targetDir).isDirectory()) return [];
  const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '[^/]*') + '$');
  return readdirSync(targetDir)
    .filter((f) => regex.test(f))
    .map((f) => ({
      relPath: join(dirname(target), f),
      absPath: join(targetDir, f),
    }));
}

export function getDeclaredReferencePaths(bundlePath) {
  let declarations = [];
  try {
    declarations = readSubmittedWorkUnitDeclarations(bundlePath);
  } catch {
    declarations = [];
  }
  const paths = new Set();
  for (const decl of declarations) {
    for (const entry of decl.output_files || []) {
      if (entry.role === 'reference') paths.add(entry.path);
    }
  }
  return paths;
}


export function readOutputDeclarations(bundlePath) {
  const file = join(bundlePath, 'rb_output_declarations.jsonl');
  if (!existsSync(file)) return [];
  const raw = readFileSync(file, 'utf-8').trim();
  if (!raw) return [];
  return raw.split('\n').map((line) => JSON.parse(line));
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function hashValue(value) {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function computeWorkUnitLedgerRecordHash(row) {
  const { ledger_record_hash: _existing, ...base } = row;
  return hashValue(base);
}

function loadSubmittedWorkUnitIndex(bundlePath) {
  const indexPath = join(bundlePath, '_work_units', '_index.json');
  if (!existsSync(indexPath)) return null;
  return WorkUnitIndexSchema.parse(JSON.parse(readFileSync(indexPath, 'utf-8')));
}

function isWorkUnitLikeLedgerRow(row) {
  return row && typeof row === 'object' && typeof row.work_id === 'string' && row.work_id.startsWith('wu-');
}

function collectWorkUnitLedgerRowIssues(row, index) {
  const parsed = WorkUnitLedgerRecordSchema.safeParse(row);
  if (!parsed.success) {
    if (!isWorkUnitLikeLedgerRow(row)) return { row: null, issues: [] };
    return {
      row: null,
      issues: [`work-unit declaration schema invalid for ${row.work_id}: ${zodErrors(parsed.error).map((i) => `${i.field || '<root>'} ${i.message}`).join(', ')}`],
    };
  }

  const ledgerRow = parsed.data;
  const issues = [];
  const expectedHash = computeWorkUnitLedgerRecordHash(row);
  if (ledgerRow.ledger_record_hash !== expectedHash) {
    issues.push(`ledger_record_hash mismatch for ${ledgerRow.work_id}`);
  }

  const indexRecord = index?.work_units?.[ledgerRow.work_id];
  if (!indexRecord) {
    issues.push(`submitted work-unit declaration missing index record: ${ledgerRow.work_id}`);
  } else {
    if (indexRecord.status !== 'submitted') {
      issues.push(`submitted work-unit declaration index status is ${indexRecord.status}: ${ledgerRow.work_id}`);
    }
    for (const field of ['queue_item_id', 'wave', 'kind', 'producer_rule', 'creation_reason', 'receipt_nonce']) {
      if (ledgerRow[field] !== indexRecord[field]) issues.push(`ledger/index mismatch for ${ledgerRow.work_id}: ${field}`);
    }
    if (ledgerRow.work_unit_ref !== indexRecord.paths.work_unit_dir) issues.push(`ledger/index mismatch for ${ledgerRow.work_id}: work_unit_ref`);
    if (ledgerRow.result_ref !== indexRecord.paths.result_ref) issues.push(`ledger/index mismatch for ${ledgerRow.work_id}: result_ref`);
    if (ledgerRow.runtime_receipt_ref !== indexRecord.paths.runtime_receipt_ref) issues.push(`ledger/index mismatch for ${ledgerRow.work_id}: runtime_receipt_ref`);
    if (ledgerRow.result_hash !== indexRecord.result_hash) issues.push(`ledger/index mismatch for ${ledgerRow.work_id}: result_hash`);
    if (ledgerRow.ledger_record_hash !== indexRecord.ledger_record_hash) issues.push(`ledger/index mismatch for ${ledgerRow.work_id}: ledger_record_hash`);
  }

  return { row: ledgerRow, issues };
}

/**
 * Read Engine-accepted work-unit submission declarations.
 *
 * This is the authoritative delegated-output reader for production checks that
 * need submitted work-unit coverage. The plain readOutputDeclarations() helper
 * remains a raw JSONL reader while old gate surfaces are being replaced.
 */
export function readSubmittedWorkUnitDeclarations(bundlePath) {
  const rawRows = readOutputDeclarations(bundlePath);
  if (rawRows.length === 0) return [];

  let index = null;
  try {
    index = loadSubmittedWorkUnitIndex(bundlePath);
  } catch (error) {
    throw new Error(`work-unit index invalid while reading declarations: ${error.message}`);
  }

  const submittedRows = [];
  const issues = [];
  for (const row of rawRows) {
    const checked = collectWorkUnitLedgerRowIssues(row, index);
    issues.push(...checked.issues);
    if (checked.row && checked.issues.length === 0) submittedRows.push(checked.row);
  }

  if (issues.length > 0) {
    throw new Error(`invalid submitted work-unit declaration ledger: ${issues.join('; ')}`);
  }
  return submittedRows;
}
