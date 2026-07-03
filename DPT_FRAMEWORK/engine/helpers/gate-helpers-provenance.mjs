// gate-helpers-provenance.mjs — Relay provenance gate checks + bypass detection
// @impl RPG-001, RPG-002, RPG-004, RPG-005
// Canonical location: DPT_FRAMEWORK/engine/helpers/gate-helpers-provenance.mjs
//
// Re-exported by gate-helpers.mjs for backward compatibility.

import { existsSync, readFileSync, readdirSync, statSync, appendFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { readOutputDeclarations, readBundlePlan, listMatchingBundleFiles } from './gate-helpers-readers.mjs';
import { readBundleName, logToRun } from '../logger.mjs';

// ═══════════════════════════════════════════════════════════════════════════
// Relay Provenance Gate Checks (RPG-001, RPG-002, RPG-004, RPG-005)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check that scoped output declaration ledger entries exist in
 * rb_output_declarations.jsonl.
 *
 * Proves delegated relay completion happened in the scoped phase.
 * Does NOT by itself prove every expected artifact/reference is covered.
 *
 * Rule config:
 *   - wave: 'wave0' | 'wave1' | 'wave2'
 *   - producer_rule (optional): filter by producer_rule field
 *   - role (optional): filter by output_files[].role
 *   - work_id_pattern (optional): regex pattern to match work_id
 *
 * @param {string} bundlePath
 * @param {object} rule — gate definition rule with scope fields
 * @returns {{ passed: boolean, inspect: string[], advice: string[], records?: object[] }}
 *
 * @impl RPG-001
 */
export function checkOutputDeclarationLedgerExists(bundlePath, rule) {
  const inspect = [];
  const advice = [];
  const declarations = readOutputDeclarations(bundlePath);

  if (declarations.length === 0) {
    return {
      passed: false,
      inspect: ['rb_output_declarations.jsonl is missing or empty — no delegated relay completions recorded'],
      advice: ['Run delegated Sub-agent tasks through the relay pipeline and complete() to populate the output declaration ledger.'],
      records: [],
    };
  }

  // Scope filter: wave
  const scoped = declarations.filter((d) => {
    if (rule.wave) {
      const waveNum = rule.wave.replace('wave', '');
      const workIdMatch = d.work_id && d.work_id.startsWith(`${rule.wave}-`);
      const pathMatch = (d.output_files || []).some((f) => f.path && f.path.includes(`/wave${waveNum}/`));
      const slotMatch = d.slot_result_ref && d.slot_result_ref.includes(`_subagents/wave_${String(waveNum).padStart(2, '0')}/`);
      if (!workIdMatch && !pathMatch && !slotMatch) return false;
    }
    if (rule.producer_rule && d.producer_rule !== rule.producer_rule) return false;
    if (rule.role) {
      const hasRole = (d.output_files || []).some((f) => f.role === rule.role);
      if (!hasRole) return false;
    }
    if (rule.work_id_pattern) {
      const re = new RegExp(rule.work_id_pattern);
      if (!re.test(d.work_id || '')) return false;
    }
    return true;
  });

  if (scoped.length === 0) {
    const scopeDesc = [];
    if (rule.wave) scopeDesc.push(`wave=${rule.wave}`);
    if (rule.producer_rule) scopeDesc.push(`producer_rule=${rule.producer_rule}`);
    const scopeStr = scopeDesc.length > 0 ? scopeDesc.join(', ') : 'any';
    return {
      passed: false,
      inspect: [`No scoped output declaration ledger entries found (${scopeStr}). Total ledger records: ${declarations.length}.`],
      advice: ['Complete delegated relay tasks for the current wave to populate scoped ledger records.'],
      records: [],
    };
  }

  return {
    passed: true,
    inspect: [`Found ${scoped.length} scoped output declaration ledger record(s).`],
    advice: [],
    records: scoped,
  };
}

/**
 * Check output declaration coverage: verify current-phase artifacts/references
 * being evaluated are declared in Engine-written rb_output_declarations.jsonl.
 *
 * Rule config:
 *   - wave: 'wave0' | 'wave1' | 'wave2'
 *   - output_selectors: { expected_from_topic_registry?, glob?, roles?, producer_rule? }
 *
 * Files found on disk but absent from matching ledger records are reported as
 * orphan/direct-written outputs and do NOT satisfy this check.
 *
 * @param {string} bundlePath
 * @param {object} rule — gate definition rule with scope + output selectors
 * @returns {{ passed: boolean, inspect: string[], advice: string[], orphans?: string[] }}
 *
 * @impl RPG-001, RPG-004
 */
export function checkOutputDeclarationCoverage(bundlePath, rule) {
  const inspect = [];
  const advice = [];
  const declarations = readOutputDeclarations(bundlePath);

  // First, determine expected outputs based on selectors
  const expectedPaths = new Set();
  const selectors = rule.output_selectors || {};

  if (selectors.expected_from_topic_registry) {
    const plan = readBundlePlan(bundlePath);
    if (plan && Array.isArray(plan.topic_registry)) {
      for (const topic of plan.topic_registry) {
        for (const template of selectors.expected_from_topic_registry) {
          expectedPaths.add(template.replace(/\{topic\}/g, topic.slug));
        }
      }
    }
  }

  if (selectors.glob) {
    for (const pattern of (Array.isArray(selectors.glob) ? selectors.glob : [selectors.glob])) {
      const matches = listMatchingBundleFiles(bundlePath, pattern);
      for (const m of matches) {
        if (m.relPath) expectedPaths.add(m.relPath);
      }
    }
  }

  // If no expected outputs (e.g., Wave2 pure synthesis with no cross-ref files),
  // coverage check vacuously passes — nothing to verify.
  if (expectedPaths.size === 0) {
    return {
      passed: true,
      inspect: ['No expected outputs to check — coverage vacuously passed (no matching files or topic outputs found).'],
      advice: [],
      orphans: [],
    };
  }

  // There ARE expected outputs — ledger must exist
  if (declarations.length === 0) {
    const orphanList = [...expectedPaths];
    return {
      passed: false,
      inspect: orphanList.map((p) => `Orphan/direct-written output not in ledger: ${p}`).concat([
        'rb_output_declarations.jsonl is missing or empty — cannot verify output coverage',
      ]),
      advice: ['Run delegated Sub-agent tasks through the relay pipeline. Files exist on disk but are not declared in the ledger.'],
      orphans: orphanList,
    };
  }

  const waveNum = (rule.wave || '').replace('wave', '');
  const scopedLedger = declarations.filter((d) => {
    if (!waveNum) return true;
    const workIdMatch = d.work_id && d.work_id.startsWith(`${rule.wave}-`);
    const pathMatch = (d.output_files || []).some((f) => f.path && f.path.includes(`/wave${waveNum}/`));
    const slotMatch = d.slot_result_ref && d.slot_result_ref.includes(`_subagents/wave_${String(waveNum).padStart(2, '0')}/`);
    if (rule.producer_rule && d.producer_rule !== rule.producer_rule) return false;
    return workIdMatch || pathMatch || slotMatch;
  });

  // Collect all declared output paths from scoped ledger
  const declaredPaths = new Set();
  for (const d of scopedLedger) {
    for (const entry of (d.output_files || [])) {
      declaredPaths.add(entry.path);
    }
  }

  // Check coverage: each expected path must be in declaredPaths
  const orphans = [];
  let allCovered = true;

  for (const expected of expectedPaths) {
    if (!declaredPaths.has(expected)) {
      allCovered = false;
      orphans.push(expected);
      inspect.push(`Orphan/direct-written output not in ledger: ${expected}`);
    }
  }

  if (orphans.length > 0) {
    advice.push('Files exist on disk but are not declared in rb_output_declarations.jsonl. These may have been written directly (bypassing relay). Re-run through delegated relay tasks to produce proper ledger coverage.');
    return { passed: false, inspect, advice, orphans };
  }

  return {
    passed: true,
    inspect: [`All ${expectedPaths.size} expected output(s) covered by ledger declarations.`],
    advice: [],
    orphans: [],
  };
}

/**
 * Check successful current-wave subagent slot binding.
 *
 * Scans only the configured wave directory (_subagents/wave_NN/slot_MM/).
 * A slot counts only with successful terminal marker:
 *   - _status.json.status === 'done'
 *   - result.json exists, parses, status === 'done'
 *
 * @param {string} bundlePath
 * @param {object} rule — gate definition rule with wave field
 * @returns {{ passed: boolean, inspect: string[], advice: string[], successfulSlots?: object[] }}
 *
 * @impl RPG-002
 */
export function checkSubagentSlotPresence(bundlePath, rule) {
  const inspect = [];
  const advice = [];

  const waveNum = (rule.wave || '').replace('wave', '');
  if (!waveNum) {
    return {
      passed: false,
      inspect: ['subagent_slot_presence rule missing wave field'],
      advice: ['Add "wave": "wave0" (or wave1/wave2) to the rule configuration.'],
    };
  }

  const waveDirName = `wave_${String(waveNum).padStart(2, '0')}`;
  const waveDir = join(bundlePath, '_subagents', waveDirName);

  if (!existsSync(waveDir) || !statSync(waveDir).isDirectory()) {
    return {
      passed: false,
      inspect: [`Subagent wave directory missing: _subagents/${waveDirName}/`],
      advice: ['Dispatch relay slots for the current wave before expecting gate pass.'],
      successfulSlots: [],
    };
  }

  let slotDirs = [];
  try {
    slotDirs = readdirSync(waveDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.startsWith('slot_'))
      .map((d) => d.name);
  } catch {
    return {
      passed: false,
      inspect: [`Cannot read subagent wave directory: _subagents/${waveDirName}/`],
      advice: ['Verify the wave directory exists and is readable.'],
      successfulSlots: [],
    };
  }

  if (slotDirs.length === 0) {
    return {
      passed: false,
      inspect: [`No slot directories found in _subagents/${waveDirName}/`],
      advice: ['Dispatch relay slots for the current wave.'],
      successfulSlots: [],
    };
  }

  const successfulSlots = [];
  const failedSlots = [];

  for (const slotName of slotDirs) {
    const slotDir = join(waveDir, slotName);
    const statusPath = join(slotDir, '_status.json');
    const resultPath = join(slotDir, 'result.json');

    if (!existsSync(statusPath)) {
      failedSlots.push({ slot: slotName, reason: '_status.json missing' });
      continue;
    }

    let status;
    try {
      status = JSON.parse(readFileSync(statusPath, 'utf-8'));
    } catch {
      failedSlots.push({ slot: slotName, reason: '_status.json unparseable' });
      continue;
    }

    if (status.status !== 'done') {
      failedSlots.push({ slot: slotName, reason: `status is '${status.status || 'unknown'}' (expected 'done')` });
      continue;
    }

    if (!existsSync(resultPath)) {
      failedSlots.push({ slot: slotName, reason: 'result.json missing' });
      continue;
    }

    let result;
    try {
      result = JSON.parse(readFileSync(resultPath, 'utf-8'));
    } catch {
      failedSlots.push({ slot: slotName, reason: 'result.json unparseable' });
      continue;
    }

    if (result.status !== 'done') {
      failedSlots.push({ slot: slotName, reason: `result.status is '${result.status || 'unknown'}' (expected 'done')` });
      continue;
    }

    successfulSlots.push({
      slot: slotName,
      slotKey: result.slotKey,
      roleAgentKey: result.roleAgentKey,
      resultPath: `_subagents/${waveDirName}/${slotName}/result.json`,
    });
  }

  if (successfulSlots.length === 0) {
    inspect.push(`No successful relay slots in _subagents/${waveDirName}/. ${failedSlots.length} slot(s) checked, all failed/pending.`);
    for (const fs of failedSlots) {
      inspect.push(`  ${fs.slot}: ${fs.reason}`);
    }
    advice.push('All relay slots for this wave failed or are incomplete. Re-dispatch and ensure successful completion.');
    return { passed: false, inspect, advice, successfulSlots: [] };
  }

  return {
    passed: true,
    inspect: [`${successfulSlots.length} successful relay slot(s) found in _subagents/${waveDirName}/.`],
    advice: [],
    successfulSlots,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Relay Bypass Suspicion Detection (RPG-005, TRW-003)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect and record relay bypass suspicion in trace and log.
 * Always-on diagnostic instrumentation — runs before emitting gate result.
 *
 * Phase-aware:
 *   Wave0/Wave1: current-wave artifacts without current-wave output
 *     declaration coverage or successful slot binding trigger suspicion.
 *   Wave2: pure synthesis/backfill artifacts do NOT trigger.
 *     Only reference/00-cross-*.md, search/gap-fill evidence, or
 *     finding-index search claims without Wave2 provenance trigger.
 *
 * @param {string} bundlePath
 * @param {string} phase — derived from gate (e.g. 'wave0', 'wave1', 'wave2')
 * @param {string} gate — gate key
 * @returns {{ suspected: boolean, artifactsFound?: string[], provenanceMissing?: string[] }}
 *
 * @impl RPG-005, TRW-003
 */
export function detectRelayBypassSuspicion(bundlePath, phase, gate) {
  try {
    const artifactsFound = [];
    const provenanceMissing = [];
    let suspected = false;

    if (phase === 'wave0' || phase === 'wave1') {
      const waveDir = `artifacts/${phase}`;
      const waveFull = join(bundlePath, waveDir);

      if (existsSync(waveFull) && statSync(waveFull).isDirectory()) {
        const waveFiles = [];
        const walkDir = (dir, base) => {
          try {
            for (const entry of readdirSync(dir, { withFileTypes: true })) {
              const rel = join(base, entry.name);
              if (entry.isFile()) waveFiles.push(rel);
              else if (entry.isDirectory()) walkDir(join(dir, entry.name), rel);
            }
          } catch { /* ignore */ }
        };
        walkDir(waveFull, waveDir);

        if (waveFiles.length > 0) {
          artifactsFound.push(...waveFiles);

          const declarations = readOutputDeclarations(bundlePath);
          const waveNum = phase.replace('wave', '');
          const wavePad = String(waveNum).padStart(2, '0');

          const hasCurrentWaveLedger = declarations.some((d) => {
            const slotMatch = d.slot_result_ref && d.slot_result_ref.includes(`_subagents/wave_${wavePad}/`);
            const pathMatch = (d.output_files || []).some((f) => f.path && f.path.includes(`/${phase}/`));
            const workIdMatch = d.work_id && d.work_id.startsWith(`${phase}-`);
            return slotMatch || pathMatch || workIdMatch;
          });

          if (!hasCurrentWaveLedger) {
            provenanceMissing.push(`No ${phase}-scoped output declaration ledger records`);
          }

          const slotDir = join(bundlePath, '_subagents', `wave_${wavePad}`);
          let hasSuccessfulSlot = false;
          if (existsSync(slotDir) && statSync(slotDir).isDirectory()) {
            try {
              const slotDirs = readdirSync(slotDir, { withFileTypes: true })
                .filter((d) => d.isDirectory() && d.name.startsWith('slot_'));
              for (const sd of slotDirs) {
                const sp = join(slotDir, sd.name, '_status.json');
                const rp = join(slotDir, sd.name, 'result.json');
                if (existsSync(sp) && existsSync(rp)) {
                  try {
                    const st = JSON.parse(readFileSync(sp, 'utf-8'));
                    const rs = JSON.parse(readFileSync(rp, 'utf-8'));
                    if (st.status === 'done' && rs.status === 'done') {
                      hasSuccessfulSlot = true;
                      break;
                    }
                  } catch { /* skip */ }
                }
              }
            } catch { /* ignore */ }
          }

          if (!hasSuccessfulSlot) {
            provenanceMissing.push(`No successful ${phase} relay slot binding`);
          }

          suspected = !hasCurrentWaveLedger || !hasSuccessfulSlot;
        }
      }
    } else if (phase === 'wave2') {
      const searchIndicators = [];

      const crossDir = join(bundlePath, 'reference');
      if (existsSync(crossDir) && statSync(crossDir).isDirectory()) {
        try {
          const crossFiles = readdirSync(crossDir).filter((f) => f.startsWith('00-cross-'));
          if (crossFiles.length > 0) {
            searchIndicators.push(...crossFiles.map((f) => `reference/${f}`));
          }
        } catch { /* ignore */ }
      }

      const findingIndexPath = join(bundlePath, 'artifacts', 'wave2', 'finding-index.yaml');
      if (existsSync(findingIndexPath)) {
        try {
          const raw = readFileSync(findingIndexPath, 'utf-8');
          const findingIndex = parseYaml(raw);
          if (findingIndex && Array.isArray(findingIndex.findings)) {
            for (const f of findingIndex.findings) {
              if (f.decision === 'exploit_search' || f.decision === 'explore_search' || f.search_required === true) {
                searchIndicators.push(`finding:${f.id || 'unknown'}`);
              }
              if (f.subagent_receipt_refs && Array.isArray(f.subagent_receipt_refs) && f.subagent_receipt_refs.length > 0) {
                searchIndicators.push(`finding:${f.id || 'unknown'}(receipts)`);
              }
            }
          }
        } catch { /* ignore */ }
      }

      if (searchIndicators.length > 0) {
        artifactsFound.push(...searchIndicators);

        const declarations = readOutputDeclarations(bundlePath);
        const hasWave2Ledger = declarations.some((d) => {
          const slotMatch = d.slot_result_ref && d.slot_result_ref.includes('_subagents/wave_02/');
          const pathMatch = (d.output_files || []).some((f) => f.path && f.path.includes('/wave2/'));
          return slotMatch || pathMatch;
        });

        if (!hasWave2Ledger) {
          provenanceMissing.push('No wave2-scoped output declaration ledger records');
        }

        const w2SlotDir = join(bundlePath, '_subagents', 'wave_02');
        let hasWave2Slot = false;
        if (existsSync(w2SlotDir) && statSync(w2SlotDir).isDirectory()) {
          try {
            for (const sd of readdirSync(w2SlotDir, { withFileTypes: true })) {
              if (!sd.isDirectory() || !sd.name.startsWith('slot_')) continue;
              const sp = join(w2SlotDir, sd.name, '_status.json');
              const rp = join(w2SlotDir, sd.name, 'result.json');
              if (existsSync(sp) && existsSync(rp)) {
                try {
                  const st = JSON.parse(readFileSync(sp, 'utf-8'));
                  const rs = JSON.parse(readFileSync(rp, 'utf-8'));
                  if (st.status === 'done' && rs.status === 'done') { hasWave2Slot = true; break; }
                } catch { /* skip */ }
              }
            }
          } catch { /* ignore */ }
        }

        if (!hasWave2Slot) provenanceMissing.push('No successful wave2 relay slot binding');
        suspected = !hasWave2Ledger || !hasWave2Slot;
      }
    }

    if (suspected) {
      try {
        const tracePath = join(bundlePath, 'rb_trace.jsonl');
        const bundle = (() => {
          try { return readBundleName(bundlePath); } catch { return basename(bundlePath); }
        })();
        const ts = new Date().toISOString();
        const traceEntry = JSON.stringify({
          ts,
          bundle,
          event: 'relay_bypass_suspected',
          kind: 'relay_bypass_suspected',
          gate,
          phase,
          artifacts_found: artifactsFound,
          provenance_missing: provenanceMissing,
        });
        appendFileSync(tracePath, traceEntry + '\n');
      } catch { /* trace write failure silently ignored */ }

      logToRun(bundlePath, 'warn', 'relay_bypass_suspected', {
        gate,
        phase,
        artifacts_found: artifactsFound.slice(0, 10),
        provenance_missing: provenanceMissing,
      });
    }

    return { suspected, artifactsFound, provenanceMissing };
  } catch {
    return { suspected: false };
  }
}
