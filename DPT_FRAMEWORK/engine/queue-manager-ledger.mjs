// @impl FRE-005
// Queue Manager delegated provenance and output declaration ledger validation.

import { existsSync, mkdirSync, readFileSync, appendFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

import { SlotResult, validateRuntimeReceipt, resolveSlotFromResultRef } from './subagent-relay.mjs';
import { logEvent, traceEntry } from './queue-manager-core.mjs';

// ============================================================
// Internal: output declaration ledger (AGO-003, AGO-004)
// ============================================================

export const OutputDeclarationLedgerRecord = z.object({
  declared_at: z.string(),
  work_id: z.string().min(1),
  producer_rule: z.string().min(1),
  slot_result_ref: z.string().min(1),
  runtime_receipt_ref: z.string(),
  output_files: z.array(z.object({
    path: z.string().min(1),
    role: z.string(),
    source_url: z.string().optional(),
    source_slug: z.string().optional(),
  })),
  cache_trails: z.array(z.string()),
  creation_reason: z.string().min(1),
});

const LEDGER_FILE = 'rb_output_declarations.jsonl';

/**
 * Derive a creation_reason string from the queue work item and slot result.
 * Engine derives from runtime state; Agent does not write ledger directly.
 *
 * @param {object} current — queue work item (the completed task)
 * @param {object} slotResult — committed relay slot result
 * @returns {string} non-empty creation_reason, truncated to 500 chars
 */
export function deriveCreationReason(current, slotResult) {
  const base = current.action || current.title || `Queue work: ${current.work_id}`;
  const prefix = current.targets?.delegates?.to === 'sub-agent' ? 'Delegated: ' : '';
  const summary = (slotResult.summary && slotResult.summary.trim())
    ? ` — ${slotResult.summary.trim()}`
    : '';
  const rerunAction = current.lineage?.rerun_action;
  const rerunRationale = current.lineage?.rerun_rationale;
  const rerunSuffix = rerunAction
    ? ` [rerun: ${rerunAction}${rerunRationale ? ` — ${rerunRationale}` : ''}]`
    : '';
  return `${prefix}${base}${summary}${rerunSuffix}`.slice(0, 500);
}

export function appendOutputDeclarationLedger(bundleDir, current, slotResultRef, slotResult, verifiedCacheTrails = null) {
  const file = path.join(bundleDir, LEDGER_FILE);
  mkdirSync(bundleDir, { recursive: true });
  const receiptRef = slotResultRef.replace(/\/result\.json$/, '/runtime-receipt.jsonl');
  // Use Engine-verified cache trails when available; fall back to raw declaration
  // (raw fallback only for legacy bundles without the validation refinement)
  const cacheTrails = verifiedCacheTrails !== null
    ? verifiedCacheTrails
    : (slotResult.cache_trails || []);
  const record = {
    declared_at: new Date().toISOString(),
    work_id: current.work_id,
    producer_rule: current.producer_rule || 'unknown',
    slot_result_ref: slotResultRef,
    runtime_receipt_ref: receiptRef,
    output_files: slotResult.output_files || [],
    cache_trails: cacheTrails,
    creation_reason: deriveCreationReason(current, slotResult),
  };
  OutputDeclarationLedgerRecord.parse(record);
  appendFileSync(file, JSON.stringify(record) + '\n');
  traceEntry('ledger_appended', { source: 'agq-ledger', kind: 'ledger_append', work_id: current.work_id, slot_result_ref: slotResultRef });
  logEvent('info', 'ledger_append', { kind: 'ledger_append', work_id: current.work_id });
}

// ============================================================
// Internal: delegated completion validation (AGQ-017)
// ============================================================

export function validateDelegatedCompletion(current, parsedResult, bundleDir) {
  const issues = [];

  // 1. Require slot_result_ref
  if (!parsedResult.slot_result_ref) {
    issues.push('delegated task requires slot_result_ref — committed relay slot result provenance missing');
    return { passed: false, inspect: issues, advice: issues.join('; ') };
  }

  // 2. Load committed slot result from disk
  let slotResult;
  try {
    const resultPath = path.join(bundleDir, parsedResult.slot_result_ref);
    if (!existsSync(resultPath)) {
      issues.push(`committed slot result not found: ${parsedResult.slot_result_ref}`);
      return { passed: false, inspect: issues, advice: issues.join('; ') };
    }
    const raw = JSON.parse(readFileSync(resultPath, 'utf-8'));
    const parsed = SlotResult.safeParse(raw);
    if (!parsed.success) {
      issues.push(`slot result schema invalid: ${parsed.error.message}`);
      return { passed: false, inspect: issues, advice: issues.join('; ') };
    }
    slotResult = parsed.data;
  } catch (err) {
    issues.push(`failed to read slot result: ${err.message}`);
    return { passed: false, inspect: issues, advice: issues.join('; ') };
  }

  // 3. Validate output_files[] and cache_trails[] present
  if (!slotResult.output_files) {
    issues.push('slot result missing output_files[] declaration');
  }
  if (!slotResult.cache_trails) {
    issues.push('slot result missing cache_trails[] declaration');
  }
  if (issues.length > 0) return { passed: false, inspect: issues, advice: issues.join('; ') };

  // 4. Pure runtime receipt validation
  let slotForReceipt;
  try {
    slotForReceipt = resolveSlotFromResultRef(parsedResult.slot_result_ref, bundleDir);
  } catch (err) {
    issues.push(`cannot resolve slot from result ref: ${err.message}`);
    return { passed: false, inspect: issues, advice: issues.join('; ') };
  }
  const receiptCheck = validateRuntimeReceipt(slotForReceipt, bundleDir);
  if (!receiptCheck.passed) {
    issues.push(`runtime receipt invalid: ${receiptCheck.error}`);
    return { passed: false, inspect: issues, advice: issues.join('; ') };
  }

  // 5. Validate output_files[]: bundle-relative, files exist, no escape
  for (const entry of slotResult.output_files) {
    if (path.isAbsolute(entry.path) || entry.path.includes('..')) {
      issues.push(`output_files path escapes bundle: ${entry.path}`);
      continue;
    }
    if (!existsSync(path.join(bundleDir, entry.path))) {
      issues.push(`declared output file missing: ${entry.path}`);
    }
  }
  if (issues.length > 0) return { passed: false, inspect: issues, advice: issues.join('; ') };

  // 6. Validate cache_trails[]: separate unsafe (hard-fail) from incomplete (warning + filter)
  // @impl CRC-005, AGO-006
  const hardIssues = [];
  const cacheWarnings = [];
  const verifiedCacheTrails = [];

  for (const trail of slotResult.cache_trails) {
    // 6a. Hard-fail: path escape
    if (path.isAbsolute(trail) || trail.includes('..')) {
      hardIssues.push(`cache_trails path escapes bundle: ${trail}`);
      continue;
    }

    // 6b. Hard-fail: not under _cache/
    if (!trail.startsWith('_cache/')) {
      hardIssues.push(`cache_trails path not under _cache/: ${trail}`);
      continue;
    }

    const trailFull = path.join(bundleDir, trail);

    // 6c. Hard-fail: parent cache directory (has sNN_* subdirs but not the 3 files directly)
    if (existsSync(trailFull) && statSync(trailFull).isDirectory()) {
      const directFiles = readdirSync(trailFull).filter(f => {
        try { return statSync(path.join(trailFull, f)).isFile(); } catch { return false; }
      });
      const hasThreeFiles = ['websearch.json', 'page.md', 'meta.json']
        .every(f => directFiles.includes(f));
      const subdirs = readdirSync(trailFull).filter(f => {
        try { return statSync(path.join(trailFull, f)).isDirectory(); } catch { return false; }
      });

      if (!hasThreeFiles && subdirs.length > 0) {
        hardIssues.push(`cache_trails path is a parent directory, not a leaf source dir: ${trail} (contains subdirectories but no cache files)`);
        continue;
      }

      // 6d. Warning: incomplete leaf (directory exists but missing one or more 3 files)
      if (!hasThreeFiles && subdirs.length === 0) {
        const missing = ['websearch.json', 'page.md', 'meta.json']
          .filter(f => !directFiles.includes(f));
        for (const m of missing) {
          cacheWarnings.push(`cache trail ${trail} missing ${m} — trail filtered from ledger`);
        }
        logEvent('warn', 'cache_trail_incomplete', { trail, missing });
        traceEntry('cache_trail_warning', {
          source: 'agq-complete',
          kind: 'cache_trail_incomplete',
          trail,
          missing,
          work_id: current.work_id,
        });
        continue;
      }

      // 6e. Verified: directory exists with all 3 files
      verifiedCacheTrails.push(trail);
    } else {
      // Directory doesn't exist — Phase 1 warning, not hard-fail
      cacheWarnings.push(`cache trail directory missing: ${trail} — trail filtered from ledger`);
      logEvent('warn', 'cache_trail_missing', { trail });
      traceEntry('cache_trail_warning', {
        source: 'agq-complete',
        kind: 'cache_trail_missing',
        trail,
        work_id: current.work_id,
      });
    }
  }

  // Hard-fail if any unsafe/non-leaf trails
  if (hardIssues.length > 0) {
    for (const hi of hardIssues) issues.push(hi);
  }
  // Aggregate warnings for incomplete trails (don't fail complete)
  if (cacheWarnings.length > 0) {
    logEvent('warn', 'cache_trail_warnings', { count: cacheWarnings.length, warnings: cacheWarnings });
  }
  // Emit warning if cache_trails is empty on a reference-producing task
  if (slotResult.cache_trails.length === 0) {
    const hasReferenceOutput = (slotResult.output_files || []).some(f => f.role === 'reference');
    if (hasReferenceOutput) {
      logEvent('warn', 'cache_trail_empty', {
        work_id: current.work_id,
        detail: 'cache_trails is empty on a reference-producing task — gate cache_coverage will report gap',
      });
      traceEntry('cache_trail_warning', {
        source: 'agq-complete',
        kind: 'cache_trail_empty',
        work_id: current.work_id,
        detail: 'cache_trails is empty on a reference-producing task',
      });
    }
  }

  if (issues.length > 0) return { passed: false, inspect: issues, advice: issues.join('; ') };

  // 7. Check standard receipt/writes consistency with declared output files
  if (parsedResult.writes && parsedResult.writes.length > 0) {
    const declared = new Set(slotResult.output_files.map((f) => f.path));
    for (const w of parsedResult.writes) {
      if (!declared.has(w)) {
        issues.push(`write receipt declares ${w} but not in slot result output_files`);
      }
    }
  }
  if (issues.length > 0) return { passed: false, inspect: issues, advice: issues.join('; ') };

  return { passed: true, slotResult, verifiedCacheTrails };
}
