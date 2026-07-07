#!/usr/bin/env node
// check-gate-wave0-complete.mjs — evaluates gate-wave0-complete rules
// @impl GSK-001, GSK-002, GSK-004, RWG-004, RWG-007, FRE-003
// Usage: node check-gate-wave0-complete.mjs --bundle <path> --current-node <fileRef> [--transitions <path>]

import { existsSync, statSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  parseGateCliArgs,
  tryLoadGateDefinition,
  validateNodeGateBinding,
  resolveRouting,
  buildGateResult,
  emitGateResult,
  writeGateAttempt,
  checkPhaseHandoffPreflight,
  derivePhaseFromGate,
  readBundlePlan,
  readBundleProfile,
  resolveThreshold,
  checkCacheCoverage,
  checkWorkUnitLedgerExists,
  checkWorkUnitOutputCoverage,
  checkWorkUnitSubmissionPresence,
  checkDelegatedBypassSuspected,
  detectDelegatedBypassSuspicion,
  readTraceEvents,
  scanTemplateNotExpanded,
  readYamlArraySafe,
} from '../../engine/helpers/gate-helpers.mjs';
import {
  ReferenceMetadataArraySchema,
} from '../../schema/index.mjs';
import { countReferences } from '../../engine/helpers/ref-count.mjs';

const args = parseGateCliArgs();
if (args.error) { emitGateResult(args.error, { bundlePath: args.bundle }); }

// Load gate definition
const { definition, error: defError } = tryLoadGateDefinition('wave0-complete', args.currentNode || null);
if (defError) { emitGateResult(defError, { bundlePath: args.bundle }); }

// Validate node/gate binding
const bindingError = validateNodeGateBinding(args.currentNode, definition.gate);
if (bindingError) {
  const result = {
    check: { passed: false, gate: definition.gate, currentNodeRef: args.currentNode, next: null },
    routing: { kind: 'invalid_input', next: null, detail: bindingError },
    inspect: [bindingError],
    advice: ['Verify --current-node matches the phase for this gate.'],
  };
  emitGateResult(result, { bundlePath: args.bundle });
}

const handoffPreflight = checkPhaseHandoffPreflight(args.bundle, args.currentNode);
if (!handoffPreflight.ok) {
  const routing = resolveRouting(args.transitions, args.currentNode, 'failed');
  const result = buildGateResult({
    passed: false,
    gate: definition.gate,
    currentNodeRef: args.currentNode,
    routing,
    inspect: handoffPreflight.inspect || [handoffPreflight.reason || 'Lifecycle handoff preflight failed'],
    advice: handoffPreflight.advice || ['Follow the handoff remedy and rerun this gate.'],
    extraCheck: { handoff_preflight: false },
    attemptNumber: args.attempt ?? 0,
  });
  writeGateAttempt(args.bundle, result, { strictTrace: result.check?.passed === true && result.check?.next != null });
  emitGateResult(result);
}

const bundlePath = args.bundle;
const inspect = [];
const advice = [];
const failedRuleIds = new Set();
const maskedRuleIds = new Set();
let allPassed = true;

// ── Cached parsers (lazy) ──
let _planCache = null;
function getPlan() {
  if (_planCache) return _planCache;
  _planCache = readBundlePlan(bundlePath);
  return _planCache;
}

let _statusCache = null;
function getStatus() {
  if (_statusCache) return _statusCache;
  const p = join(bundlePath, 'rb_status.json');
  if (!existsSync(p)) return null;
  _statusCache = JSON.parse(readFileSync(p, 'utf-8'));
  return _statusCache;
}

let _profileCache = null;
function getProfile() {
  if (_profileCache !== null) return _profileCache;
  _profileCache = readBundleProfile(bundlePath);
  return _profileCache;
}

/**
 * Get topic keys from topic_registry. Returns [] if registry is empty or missing.
 */
function getTopicKeys() {
  const plan = getPlan();
  if (!plan || !Array.isArray(plan.topic_registry) || plan.topic_registry.length === 0) return [];
  return plan.topic_registry.map(t => t.slug);
}

/**
 * Expand {topic} placeholder in target string.
 * If target contains {topic}, return one entry per registry topic.
 * If not, return a single entry with topic=null.
 */
function expandTopicTarget(target) {
  const topics = getTopicKeys();
  if (target.includes('{topic}')) {
    if (topics.length === 0) return []; // empty registry → no expansions, rule fails below
    return topics.map(t => ({ topic: t, resolved: target.replace(/\{topic\}/g, t) }));
  }
  return [{ topic: null, resolved: target }];
}

function scopedRuleId(ruleId, topic) {
  return topic ? `${ruleId}:${topic}` : ruleId;
}

function markMasked(ruleId, topic) {
  maskedRuleIds.add(scopedRuleId(ruleId, topic));
  return ' [masked:true upstream_schema_failure]';
}

const DEGRADATION_FATIGUE_THRESHOLD = 3;
const STOP_NO_DEGRADABLE_NODES = new Set([
  'phases/phase-wave0.md',
  'phases/phase-wave1.md',
  'phases/phase-wave2.md',
]);
const DEGRADATION_ELIGIBLE_RULE_IDS = new Set([
  'shared_ref_count_floor',
  'per_topic_count_floor',
]);

function baseRuleId(ruleId) {
  return String(ruleId || '').split(':')[0];
}

function engineVisibleAttemptCount() {
  const events = readTraceEvents(bundlePath);
  let startIndex = -1;
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].event === 'load_complete' && events[i].entry === args.currentNode) {
      startIndex = i;
      break;
    }
  }
  return events
    .slice(startIndex + 1)
    .filter((event) => event.event === 'gate_attempt' && event.gate === definition.gate && event.currentNodeRef === args.currentNode)
    .length + 1;
}

function maybeDegradedHandoff() {
  if (allPassed) return null;
  if (!STOP_NO_DEGRADABLE_NODES.has(args.currentNode)) return null;

  const effectiveAttemptCount = Math.max(args.attempt ?? 0, engineVisibleAttemptCount());
  if (effectiveAttemptCount < DEGRADATION_FATIGUE_THRESHOLD) return null;

  const failed = [...failedRuleIds].sort();
  const ineligible = failed.filter((ruleId) => !DEGRADATION_ELIGIBLE_RULE_IDS.has(baseRuleId(ruleId)));
  if (failed.length === 0 || ineligible.length > 0) {
    inspect.push(`[degraded_not_eligible] Fatigue threshold reached, but runtime-truth or structural blocker(s) remain: ${ineligible.join(', ') || 'unclassified failure'}`);
    return null;
  }

  const passRouting = resolveRouting(args.transitions, args.currentNode, 'passed');
  if (passRouting.kind !== 'next' || !passRouting.next) {
    inspect.push(`[degraded_not_eligible] Normal pass route is unavailable for ${args.currentNode}; cannot emit degraded handoff.`);
    return null;
  }

  inspect.push(`[degraded] Fatigue threshold reached; carrying forward degradation-eligible quality rule(s): ${failed.join(', ')}`);
  advice.push('[degraded] Consume check.next through enter-phase and advance-status. This is a legal handoff witness only, not a clean quality pass or target-phase completion proof.');

  return {
    routing: passRouting,
    extraCheck: {
      degraded: true,
      degraded_reason: 'fatigue_threshold_reached_with_only_degradation_eligible_quality_rules',
      degraded_rules: failed,
      degradation_attempt_count: effectiveAttemptCount,
    },
  };
}

function emitAfterDurableAttempt(result) {
  try {
    writeGateAttempt(bundlePath, result, { strictTrace: result.check?.passed === true && result.check?.next != null });
  } catch (err) {
    const safeMsg = (err.message || String(err)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
    const failedRouting = resolveRouting(args.transitions, args.currentNode, 'failed');
    const failedResult = buildGateResult({
      passed: false,
      gate: definition.gate,
      currentNodeRef: args.currentNode,
      routing: failedRouting,
      inspect: [`[trace_durable] FAIL: could not durably append gate_attempt trace event: ${safeMsg}`],
      advice: ['Fix rb_trace.jsonl trace durability and rerun the gate through the Engine path; do not hand-edit status to simulate handoff.'],
      extraCheck: {
        trace_durable: false,
        gate_attempt_write_failed: true,
        suppressed_pass_degraded: result.check?.degraded === true,
      },
      attemptNumber: args.attempt ?? 0,
    });
    try { writeGateAttempt(bundlePath, failedResult); } catch { /* ignore secondary diagnostics */ }
    emitGateResult(failedResult);
  }
}

/**
 * Read YAML array from a file. Uses centralized safe reader with repair.
 * Returns parsed array or null if file missing/unparseable.
 * Emits actionable parse error diagnostics to gate inspect on failure.
 */
function readYamlArray(filePath) {
  const result = readYamlArraySafe(filePath, bundlePath);
  if (!result.ok) {
    inspect.push(`[parse_error] ${result.error}`);
    return null;
  }
  if (result.repaired) {
    inspect.push(`[yaml_repaired] ${filePath}: ${result.repairDetail}`);
  }
  return Array.isArray(result.data) ? result.data : null;
}

function readSourceYamlForSchema(filePath, resolvedTarget) {
  const result = readYamlArraySafe(filePath, bundlePath);
  if (!result.ok) {
    return { ok: false, detail: `[parse_error] ${result.error}` };
  }
  if (!Array.isArray(result.data)) {
    const keys = result.data && typeof result.data === 'object'
      ? Object.keys(result.data)
      : [];
    const found = keys.length > 0 ? ` Found object keys: ${keys.join(', ')}` : ` Found ${result.data === null ? 'null' : typeof result.data}.`;
    return {
      ok: false,
      detail: `source.yaml must be a top-level YAML array at ${resolvedTarget}.${found} Entries must start at the document top level with "- ". Wrappers such as sources:, wave:, or topic: are invalid for this parser.`,
    };
  }
  if (result.repaired) {
    inspect.push(`[yaml_repaired] ${filePath}: ${result.repairDetail}`);
  }
  return { ok: true, data: result.data };
}

function sourceSchemaIssues(error) {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : '<root>';
    return `[${path}] ${issue.message}`;
  }).join('; ');
}

// ── Pre-rule scan: template_not_expanded diagnostics ──
const templateScanFindings = scanTemplateNotExpanded(bundlePath);
if (templateScanFindings.findings.length > 0) {
  for (const f of templateScanFindings.findings) {
    inspect.push(`[template_not_expanded] ${f.file}: ${f.field} contains unexpanded template variable: ${f.value}`);
  }
}

// ── Rule evaluation ──
const schemaFailedTopics = new Set();
for (const rule of definition.rules) {
  if (rule.check === 'placeholder') continue;

  // Expand {topic} targets — each expansion is a sub-check; rule passes only if ALL pass
  const expansions = expandTopicTarget(rule.target);
  if (expansions.length === 0 && rule.target.includes('{topic}')) {
    // Empty topic_registry with {topic} placeholder → fail
    allPassed = false;
    inspect.push(`Empty topic_registry: cannot expand "{topic}" placeholder in rule ${rule.id}. Complete HITL1 to populate topic_registry.`);
    advice.push(rule.failure_message);
    continue;
  }

  for (const exp of expansions) {
    const resolvedTarget = exp.resolved;
    let rulePassed = true;
    let ruleDetail = null;

    try {
      if (rule.check === 'file_exists') {
        const targetPath = join(bundlePath, resolvedTarget);
        if (!existsSync(targetPath)) {
          rulePassed = false;
          ruleDetail = `Missing file: ${resolvedTarget}`;
          if (exp.topic) ruleDetail += ` (topic: ${exp.topic})`;
        }
      } else if (rule.check === 'dir_exists') {
        const targetPath = join(bundlePath, resolvedTarget);
        if (!existsSync(targetPath) || !statSync(targetPath).isDirectory()) {
          rulePassed = false;
          ruleDetail = `Missing directory: ${resolvedTarget}`;
        }
      } else if (rule.check === 'schema_valid') {
        const filePath = join(bundlePath, resolvedTarget);
        const sourceYaml = readSourceYamlForSchema(filePath, resolvedTarget);
        if (!sourceYaml.ok) {
          rulePassed = false;
          ruleDetail = sourceYaml.detail;
          if (exp.topic) ruleDetail += ` (topic: ${exp.topic})`;
          if (exp.topic) schemaFailedTopics.add(exp.topic);
        } else {
          const parsed = ReferenceMetadataArraySchema.safeParse(sourceYaml.data);
          if (!parsed.success) {
            rulePassed = false;
            const issues = sourceSchemaIssues(parsed.error);
            ruleDetail = `Schema validation failed for ${resolvedTarget}: ${issues}`;
            if (exp.topic) ruleDetail += ` (topic: ${exp.topic})`;
            if (exp.topic) schemaFailedTopics.add(exp.topic);
          }
        }
      } else if (rule.check === 'count_floor') {
        const threshold = resolveThreshold(rule, getProfile());
        let count = 0;
        if (resolvedTarget.includes('*') && resolvedTarget.startsWith('reference/')) {
          // EEX-003: Use Engine ledger countReferences() for reference globs
          // Only countable (quality-filtered) declared references count
          const refResult = countReferences(bundlePath, {
            source: 'ledger',
            targetGlob: resolvedTarget,
            topic: exp.topic || undefined,
          });
          count = refResult.count;
          if (count < threshold) {
            rulePassed = false;
            ruleDetail = `Count floor not met for ${resolvedTarget}: ${count} countable references (threshold: ${threshold})`;
            if (refResult.uncountable.length > 0) {
              ruleDetail += ` [${refResult.uncountable.length} uncountable: ${refResult.uncountable.map(u => u.reason).join('; ')}]`;
            }
            if (exp.topic) ruleDetail += ` (topic: ${exp.topic})`;
            if (exp.topic && schemaFailedTopics.has(exp.topic)) {
              ruleDetail += markMasked(rule.id, exp.topic);
            }
          }
        } else if (resolvedTarget.includes('*')) {
          // Glob mode (non-reference): count files matching wildcard pattern
          const targetDir = join(bundlePath, dirname(resolvedTarget));
          const pattern = basename(resolvedTarget);
          if (existsSync(targetDir) && statSync(targetDir).isDirectory()) {
            const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '[^/]*') + '$');
            count = readdirSync(targetDir).filter(f => regex.test(f)).length;
          }
          if (count < threshold) {
            rulePassed = false;
            ruleDetail = `Count floor not met for ${resolvedTarget}: ${count} files (threshold: ${threshold})`;
            if (exp.topic) ruleDetail += ` (topic: ${exp.topic})`;
            if (exp.topic && schemaFailedTopics.has(exp.topic)) {
              ruleDetail += markMasked(rule.id, exp.topic);
            }
          }
        } else {
          // YAML mode: count array entries
          const filePath = join(bundlePath, resolvedTarget);
          const arr = readYamlArray(filePath);
          count = arr ? arr.length : 0;
          if (count < threshold) {
            rulePassed = false;
            ruleDetail = `Count floor not met for ${resolvedTarget}: ${count} entries (threshold: ${threshold})`;
            if (exp.topic) ruleDetail += ` (topic: ${exp.topic})`;
            if (exp.topic && schemaFailedTopics.has(exp.topic)) {
              ruleDetail += markMasked(rule.id, exp.topic);
            }
          }
        }
      } else if (rule.check === 'status_value') {
        const [file, jsonPath] = rule.target.split('#/');
        const status = getStatus();
        if (!status) {
          rulePassed = false;
          ruleDetail = 'rb_status.json not found';
        } else {
          const value = jsonPath.split('/').reduce((obj, key) => obj?.[key], status);
          if (value !== rule.expected) {
            rulePassed = false;
            ruleDetail = `${rule.target}: expected "${rule.expected}", got "${value}"`;
          }
        }
      } else if (rule.check === 'pattern_match') {
        // pattern_match with optional glob support in target path
        let content;
        let matchedFiles = [];
        if (resolvedTarget.includes('*')) {
          // Glob mode: target contains wildcard — expand to matching files
          const targetDir = join(bundlePath, dirname(resolvedTarget));
          const globPattern = basename(resolvedTarget);
          if (existsSync(targetDir) && statSync(targetDir).isDirectory()) {
            const regex = new RegExp('^' + globPattern.replace(/\./g, '\\.').replace(/\*/g, '[^/]*') + '$');
            const files = readdirSync(targetDir).filter(f => regex.test(f));
            matchedFiles = files.map(f => ({
              path: join(targetDir, f),
              relPath: join(dirname(resolvedTarget), f),
            }));
          }
          if (matchedFiles.length === 0) {
            if (!rule.negate) {
              rulePassed = false;
              ruleDetail = `No files matching glob ${resolvedTarget} for pattern_match`;
              if (exp.topic) ruleDetail += ` (topic: ${exp.topic})`;
            }
          }
        } else {
          // Single-file mode
          const filePath = join(bundlePath, resolvedTarget);
          if (!existsSync(filePath)) {
            rulePassed = false;
            ruleDetail = `Cannot read file for pattern_match: ${resolvedTarget}`;
            if (exp.topic) ruleDetail += ` (topic: ${exp.topic})`;
          } else {
            content = readFileSync(filePath, 'utf-8');
          }
        }

        if (ruleDetail === null) {
          const re = new RegExp(rule.pattern, 'i');

          if (matchedFiles.length > 0) {
            // Glob mode: check each matched file
            for (const mf of matchedFiles) {
              let fileContent;
              try { fileContent = readFileSync(mf.path, 'utf-8'); } catch { continue; }
              const matched = re.test(fileContent);

              if (rule.negate) {
                if (matched) {
                  rulePassed = false;
                  const cleanDesc = (rule.failure_message || rule.pattern).replace(/\{topic\}/g, exp.topic || '{topic}');
                  ruleDetail = `Forbidden content in ${mf.relPath}: ${cleanDesc}`;
                  if (exp.topic) ruleDetail += ` (topic: ${exp.topic})`;
                  break;
                }
              }
            }
            if (!rule.negate && rulePassed) {
              const anyMatched = matchedFiles.some(mf => {
                try { return re.test(readFileSync(mf.path, 'utf-8')); } catch { return false; }
              });
              if (!anyMatched) {
                rulePassed = false;
                const cleanDesc = (rule.failure_message || rule.pattern).replace(/\{topic\}/g, exp.topic || '{topic}');
                ruleDetail = `Required marker not found in any file matching ${resolvedTarget}: ${cleanDesc}`;
                if (exp.topic) ruleDetail += ` (topic: ${exp.topic})`;
              }
            }
          } else if (content !== undefined) {
            const matched = re.test(content);
            if (rule.negate) {
              if (matched) {
                rulePassed = false;
                const cleanDesc = (rule.failure_message || rule.pattern).replace(/\{topic\}/g, exp.topic || '{topic}');
                ruleDetail = `Forbidden content in ${resolvedTarget}: ${cleanDesc}`;
                if (exp.topic) ruleDetail += ` (topic: ${exp.topic})`;
              }
            } else {
              if (!matched) {
                rulePassed = false;
                const cleanDesc = (rule.failure_message || rule.pattern).replace(/\{topic\}/g, exp.topic || '{topic}');
                ruleDetail = `Required marker not found in ${resolvedTarget}: ${cleanDesc}`;
                if (exp.topic) ruleDetail += ` (topic: ${exp.topic})`;
              }
            }
          }
        }
      } else if (rule.check === 'cache_coverage') {
        const ccResult = checkCacheCoverage(bundlePath);
        if (!ccResult.passed) {
          rulePassed = false;
          ruleDetail = ccResult.inspect.join('; ');
        } else if (ccResult.inspect.length > 0) {
          // Warnings (empty trails) — emit to inspect but don't fail
          for (const line of ccResult.inspect) inspect.push(line);
        }
        for (const a of ccResult.advice) advice.push(a);
      } else if (rule.check === 'work_unit_ledger_exists') {
        const ledgerResult = checkWorkUnitLedgerExists(bundlePath, rule);
        if (!ledgerResult.passed) {
          rulePassed = false;
          ruleDetail = ledgerResult.inspect.join('; ');
        }
        for (const line of ledgerResult.inspect) inspect.push(line);
        for (const a of ledgerResult.advice) advice.push(a);
      } else if (rule.check === 'work_unit_output_coverage') {
        const coverageResult = checkWorkUnitOutputCoverage(bundlePath, rule);
        if (!coverageResult.passed) {
          rulePassed = false;
          ruleDetail = coverageResult.inspect.join('; ');
        }
        for (const line of coverageResult.inspect) inspect.push(line);
        for (const a of coverageResult.advice) advice.push(a);
      } else if (rule.check === 'work_unit_submission_presence') {
        const presenceResult = checkWorkUnitSubmissionPresence(bundlePath, rule);
        if (!presenceResult.passed) {
          rulePassed = false;
          ruleDetail = presenceResult.inspect.join('; ');
        }
        for (const line of presenceResult.inspect) inspect.push(line);
        for (const a of presenceResult.advice) advice.push(a);
      } else if (rule.check === 'delegated_bypass_suspected') {
        const bypassCheck = checkDelegatedBypassSuspected(bundlePath, { ...rule, gate: definition.gate });
        if (!bypassCheck.passed) {
          rulePassed = false;
          ruleDetail = bypassCheck.inspect.join('; ');
        }
        for (const line of bypassCheck.inspect) inspect.push(line);
        for (const a of bypassCheck.advice) advice.push(a);
      } else if (rule.check === 'trace_event_present') {
        const events = readTraceEvents(bundlePath, rule.target);
        if (!events || events.length === 0) {
          rulePassed = false;
          ruleDetail = `Trace event "${rule.target}" not found in rb_trace.jsonl`;
        }
      } else {
        rulePassed = false;
      ruleDetail = `Unknown check type: ${rule.check} — must fail (check type not implemented)`;
      }
    } catch (err) {
      rulePassed = false;
      const safeMsg = (err.message || String(err)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
      ruleDetail = `Error evaluating rule ${rule.id} (${resolvedTarget}): ${safeMsg}`;
    }

    if (!rulePassed) {
      allPassed = false;
      failedRuleIds.add(scopedRuleId(rule.id, exp.topic));
      inspect.push(ruleDetail);
      advice.push(exp.topic ? rule.failure_message.replace(/\{topic\}/g, exp.topic) : rule.failure_message);
    }
  }
}

const degradedHandoff = maybeDegradedHandoff();
const passedForHandoff = allPassed || Boolean(degradedHandoff);
const outcome = passedForHandoff ? 'passed' : 'failed';
const routing = degradedHandoff?.routing || resolveRouting(args.transitions, args.currentNode, outcome);

// Work-unit delegated bypass suspicion detection before emitting gate result
const phase = derivePhaseFromGate(definition.gate);
const bypassResult = detectDelegatedBypassSuspicion(bundlePath, phase, definition.gate);
if (bypassResult.suspected) {
  inspect.push(`[delegated_bypass_suspected] Phase ${phase} artifacts found without submitted work-unit provenance: ${(bypassResult.provenanceMissing || []).join('; ')}`);
}

const result = buildGateResult({
  passed: passedForHandoff,
  gate: definition.gate,
  currentNodeRef: args.currentNode,
  routing,
  inspect,
  advice,
  extraCheck: {
    failed_rule_ids: [...failedRuleIds],
    masked_rule_ids: [...maskedRuleIds],
    ...(degradedHandoff?.extraCheck || {}),
  },
  attemptNumber: args.attempt ?? 0,
});

emitAfterDurableAttempt(result);

emitGateResult(result);
