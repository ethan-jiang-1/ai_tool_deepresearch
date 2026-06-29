#!/usr/bin/env node
// check-gate-wave1-complete.mjs — evaluates gate-wave1-complete rules
// @impl GSK-001, GSK-002, GSK-004, RWG-005, RWG-007, FRE-003
// Usage: node check-gate-wave1-complete.mjs --bundle <path> --current-node <fileRef> [--transitions <path>]

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
  readBundlePlan,
  readBundleProfile,
  resolveThreshold,
  checkContentDedup,
  listMatchingBundleFiles,
  checkReferenceFormatFiles,
  checkReferenceSourceUrls,
  checkReferenceKeyFactsMinLines,
  checkReferenceLedgerCoverage,
} from '../../engine/helpers/gate-helpers.mjs';

const args = parseGateCliArgs();
if (args.error) { emitGateResult(args.error); }

// Load gate definition
const { definition, error: defError } = tryLoadGateDefinition('wave1-complete', args.currentNode || null);
if (defError) { emitGateResult(defError); }

// Validate node/gate binding
const bindingError = validateNodeGateBinding(args.currentNode, definition.gate);
if (bindingError) {
  const result = {
    check: { passed: false, gate: definition.gate, currentNodeRef: args.currentNode, next: null },
    routing: { kind: 'invalid_input', next: null, detail: bindingError },
    inspect: [bindingError],
    advice: ['Verify --current-node matches the phase for this gate.'],
  };
  emitGateResult(result);
}

const bundlePath = args.bundle;
const inspect = [];
const advice = [];
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
 * Read YAML array from a file. Returns parsed array or null if file missing/unparseable.
 */
function readYamlArray(filePath) {
  if (!existsSync(filePath)) return null;
  const raw = readFileSync(filePath, 'utf-8');
  try {
    const parsed = parseYaml(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Expand {topic} placeholder in target string.
 */
function expandTopicTarget(target) {
  const topics = getTopicKeys();
  if (target.includes('{topic}')) {
    if (topics.length === 0) return [];
    return topics.map(t => ({ topic: t, resolved: target.replace(/\{topic\}/g, t) }));
  }
  return [{ topic: null, resolved: target }];
}

// ── Rule evaluation ──
for (const rule of definition.rules) {
  if (rule.check === 'placeholder') continue;

  // Expand {topic} placeholder in target string (for file_exists, pattern_match, etc.)
  const targets = expandTopicTarget(rule.target);

  if (targets.length === 0) {
    allPassed = false;
    inspect.push(`Empty topic_registry: cannot expand "{topic}" placeholder in rule ${rule.id}.`);
    advice.push(rule.failure_message);
    continue;
  }

  for (const tgt of targets) {
    const resolvedTarget = tgt.resolved;
    let rulePassed = true;
    let ruleDetail = null;

    try {
      if (rule.check === 'file_exists') {
        const targetPath = join(bundlePath, resolvedTarget);
        if (!existsSync(targetPath)) {
          rulePassed = false;
          ruleDetail = `Missing file: ${resolvedTarget}`;
          if (tgt.topic) ruleDetail += ` (topic: ${tgt.topic})`;
        }
      } else if (rule.check === 'dir_exists') {
        const targetPath = join(bundlePath, resolvedTarget);
        if (!existsSync(targetPath) || !statSync(targetPath).isDirectory()) {
          rulePassed = false;
          ruleDetail = `Missing directory: ${resolvedTarget}`;
        }
      } else if (rule.check === 'field_value') {
        // For status-like field value checks
        const [file, jsonPath] = rule.target.split('#/');
        if (file === 'rb_status.json') {
          const status = getStatus();
          if (!status) {
            rulePassed = false;
            ruleDetail = 'rb_status.json not found';
          } else {
            const value = jsonPath.split('/').reduce((obj, key) => obj?.[key], status);
            if (rule.operator === 'equal' && value !== rule.value) {
              rulePassed = false;
              ruleDetail = `${rule.target}: expected "${rule.value}", got "${value}"`;
            }
          }
        }
      } else if (rule.check === 'field_non_empty') {
        const [file, jsonPath] = rule.target.split('#/');
        if (file === 'rb_status.json') {
          const status = getStatus();
          if (!status) {
            rulePassed = false;
            ruleDetail = 'rb_status.json not found';
          } else {
            const value = jsonPath.split('/').reduce((obj, key) => obj?.[key], status);
            if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
              rulePassed = false;
              ruleDetail = `${rule.target} is empty or missing`;
            }
          }
        }
      } else if (rule.check === 'pattern_match') {
        // Determine what to match against
        let content;
        let matchedFiles = []; // for glob mode: list of {path, content}
        if (rule.target === 'basename') {
          // Legacy: match against bundle directory basename
          content = join(bundlePath, '..'); // Actually need the basename
          // Not applicable in wave1 — skip with warning
          ruleDetail = `pattern_match with target="basename" not supported in wave1 gate — must fail (check type not implemented)`;
        } else if (resolvedTarget.includes('*')) {
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
            // No files to check — for negate=true this is a pass (nothing to find),
            // for negate=false this is a fail (required marker not present anywhere)
            if (!rule.negate) {
              rulePassed = false;
              ruleDetail = `No files matching glob ${resolvedTarget} for pattern_match`;
              if (tgt.topic) ruleDetail += ` (topic: ${tgt.topic})`;
            }
          }
        } else {
          // File content mode: target is a file path (relative to bundle root)
          const filePath = join(bundlePath, resolvedTarget);
          if (!existsSync(filePath)) {
            rulePassed = false;
            ruleDetail = `Cannot read file for pattern_match: ${resolvedTarget}`;
            if (tgt.topic) ruleDetail += ` (topic: ${tgt.topic})`;
          } else {
            content = readFileSync(filePath, 'utf-8');
          }
        }

        // Evaluate pattern against content (single-file mode) or matched files (glob mode)
        if (ruleDetail === null) {
          const re = new RegExp(rule.pattern, 'i');

          if (matchedFiles.length > 0) {
            // Glob mode: check each matched file
            for (const mf of matchedFiles) {
              let fileContent;
              try {
                fileContent = readFileSync(mf.path, 'utf-8');
              } catch {
                continue; // skip unreadable files
              }
              const matched = re.test(fileContent);

              if (rule.negate) {
                // negate=true: find pattern → FAIL
                if (matched) {
                  rulePassed = false;
                  const cleanDesc = (rule.failure_message || rule.pattern).replace(/\{topic\}/g, tgt.topic || '{topic}');
                  ruleDetail = `Forbidden content in ${mf.relPath}: ${cleanDesc}`;
                  if (tgt.topic) ruleDetail += ` (topic: ${tgt.topic})`;
                  break; // one violator is enough to fail
                }
              } else {
                // negate=false: find pattern → PASS
                // If we find the pattern in at least one file, check passes for this target
                // We don't break — wait until after the loop to decide
              }
            }

            // For negate=false in glob mode: FAIL only if NO file matched the pattern
            if (!rule.negate && rulePassed) {
              const anyMatched = matchedFiles.some(mf => {
                try { return re.test(readFileSync(mf.path, 'utf-8')); } catch { return false; }
              });
              if (!anyMatched) {
                rulePassed = false;
                const cleanDesc = (rule.failure_message || rule.pattern).replace(/\{topic\}/g, tgt.topic || '{topic}');
                ruleDetail = `Required marker not found in any file matching ${resolvedTarget}: ${cleanDesc}`;
                if (tgt.topic) ruleDetail += ` (topic: ${tgt.topic})`;
              }
            }
          } else if (content !== undefined) {
            // Single-file mode: existing behavior
            const matched = re.test(content);

            if (rule.negate) {
              if (matched) {
                rulePassed = false;
                const cleanDesc = (rule.failure_message || rule.pattern).replace(/\{topic\}/g, tgt.topic || '{topic}');
                ruleDetail = `Forbidden content in ${resolvedTarget}: ${cleanDesc}`;
                if (tgt.topic) ruleDetail += ` (topic: ${tgt.topic})`;
              }
            } else {
              if (!matched) {
                rulePassed = false;
                const cleanDesc = (rule.failure_message || rule.pattern).replace(/\{topic\}/g, tgt.topic || '{topic}');
                ruleDetail = `Required marker not found in ${resolvedTarget}: ${cleanDesc}`;
                if (tgt.topic) ruleDetail += ` (topic: ${tgt.topic})`;
              }
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
      } else if (rule.check === 'count_floor') {
        const threshold = resolveThreshold(rule, getProfile());
        let count = 0;
        if (resolvedTarget.includes('*')) {
          // Glob mode: count files matching wildcard pattern
          const targetDir = join(bundlePath, dirname(resolvedTarget));
          const pattern = basename(resolvedTarget);
          if (existsSync(targetDir) && statSync(targetDir).isDirectory()) {
            const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '[^/]*') + '$');
            count = readdirSync(targetDir).filter(f => regex.test(f)).length;
          }
          if (count < threshold) {
            rulePassed = false;
            ruleDetail = `Count floor not met for ${resolvedTarget}: ${count} files (threshold: ${threshold})`;
            if (tgt.topic) ruleDetail += ` (topic: ${tgt.topic})`;
          }
        } else {
          // YAML mode: count array entries
          const filePath = join(bundlePath, resolvedTarget);
          const arr = readYamlArray(filePath);
          count = arr ? arr.length : 0;
          if (count < threshold) {
            rulePassed = false;
            ruleDetail = `Count floor not met for ${resolvedTarget}: ${count} entries (threshold: ${threshold})`;
            if (tgt.topic) ruleDetail += ` (topic: ${tgt.topic})`;
          }
        }
      } else if (rule.check === 'content_dedup') {
        const dedupResult = checkContentDedup(bundlePath, rule.threshold || {});
        if (!dedupResult.passed) {
          rulePassed = false;
          ruleDetail = dedupResult.inspect.join('; ');
          for (const a of dedupResult.advice) advice.push(a);
        }
      } else if (rule.check === 'reference_format') {
        const files = listMatchingBundleFiles(bundlePath, resolvedTarget);
        const result = checkReferenceFormatFiles(files);
        if (!result.passed) {
          rulePassed = false;
          ruleDetail = result.inspect.join('; ');
        }
      } else if (rule.check === 'reference_source_url_article_level') {
        const files = listMatchingBundleFiles(bundlePath, resolvedTarget);
        const result = checkReferenceSourceUrls(files);
        if (!result.passed) {
          rulePassed = false;
          ruleDetail = result.inspect.join('; ');
        }
      } else if (rule.check === 'reference_key_facts_min_lines') {
        const files = listMatchingBundleFiles(bundlePath, resolvedTarget);
        const result = checkReferenceKeyFactsMinLines(files, rule.min_lines || 5);
        if (!result.passed) {
          rulePassed = false;
          ruleDetail = result.inspect.join('; ');
        }
      } else if (rule.check === 'reference_ledger_coverage') {
        const files = listMatchingBundleFiles(bundlePath, resolvedTarget);
        const result = checkReferenceLedgerCoverage(bundlePath, files);
        if (!result.passed) {
          rulePassed = false;
          ruleDetail = result.inspect.join('; ');
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
      inspect.push(ruleDetail);
      advice.push(tgt.topic ? rule.failure_message.replace(/\{topic\}/g, tgt.topic) : rule.failure_message);
    }
  }
}

const outcome = allPassed ? 'passed' : 'failed';
const routing = resolveRouting(args.transitions, args.currentNode, outcome);

const result = buildGateResult({
  passed: allPassed,
  gate: definition.gate,
  currentNodeRef: args.currentNode,
  routing,
  inspect,
  advice,
});

writeGateAttempt(bundlePath, result);

emitGateResult(result);
