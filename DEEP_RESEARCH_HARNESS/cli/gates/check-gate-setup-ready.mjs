#!/usr/bin/env node
// check-gate-setup-ready.mjs — evaluates gate-setup-ready rules
// @impl GSK-001, GSK-002, GSK-004, PRG-006, PRG-007, FRE-003
// Usage: node check-gate-setup-ready.mjs --bundle <path> --current-node <fileRef> [--transitions <path>]

import { existsSync, statSync, readFileSync } from 'node:fs';
import { join, basename, resolve as resolveFsPath } from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  parseGateCliArgs,
  tryLoadGateDefinition,
  checkNodeGateBinding,
  resolveRouting,
  buildGateResult,
  emitGateResult,
  writeGateAttempt,
  checkPhaseHandoffPreflight,
  readBundlePlan,
  stripMdFrontmatter,
  writePlanProgress,
} from '../../engine/helpers/gate-helpers.mjs';
import { stripSuppliedControlsForTemplateScan } from '../../engine/helpers/plan-hostfile-sections.mjs';
import {
  buildContractEvaluation,
  makeContractFinding,
  makeDefinitionRuleFinding,
} from '../../engine/helpers/wave-contract-findings.mjs';
import {
  ProfileSchema,
  StatusSchema,
  QueueSchema,
  PlanSchema,
} from '../../schema/index.mjs';
import { normalizeBundleBasename } from '../../engine/helpers/bundle-identity.mjs';

const args = parseGateCliArgs();
if (args.error) { emitGateResult(args.error, { bundlePath: args.bundle }); }

// Load gate definition
const { definition, error: defError } = tryLoadGateDefinition('setup-ready', args.currentNode || null);
if (defError) { emitGateResult(defError, { bundlePath: args.bundle }); }

// Validate node/gate binding
const binding = checkNodeGateBinding(args.currentNode, definition.gate);
if (!binding.ok) {
  const result = buildGateResult({
    passed: false,
    gate: definition.gate,
    currentNodeRef: args.currentNode,
    routing: { kind: 'invalid_input', next: null, detail: binding.reason },
    inspect: binding.inspect,
    advice: binding.advice,
    findings: binding.findings,
    bundlePath: args.bundle,
    attemptNumber: args.attempt ?? 0,
  });
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
    findings: handoffPreflight.findings || [],
    bundlePath: args.bundle,
    extraCheck: { handoff_preflight: false },
    attemptNumber: args.attempt ?? 0,
  });
  writeGateAttempt(args.bundle, result, { strictTrace: result.check?.passed === true && result.check?.next != null });
  emitGateResult(result);
}

const bundlePath = args.bundle;
const findings = [];
const prerequisiteRoots = new Map();
let checksRun = 0;

// ── Cached parsers (lazy) ──
let _profileCache = null;
function getProfile() {
  if (_profileCache) return _profileCache;
  const p = join(bundlePath, 'rb_profile.yaml');
  if (!existsSync(p)) return null;
  _profileCache = parseYaml(readFileSync(p, 'utf-8'));
  return _profileCache;
}

let _statusCache = null;
function getStatus() {
  if (_statusCache) return _statusCache;
  const p = join(bundlePath, 'rb_status.json');
  if (!existsSync(p)) return null;
  _statusCache = JSON.parse(readFileSync(p, 'utf-8'));
  return _statusCache;
}

let _planCache = null;
function getPlan() {
  if (_planCache) return _planCache;
  _planCache = readBundlePlan(bundlePath);
  return _planCache;
}

function resolvePath(obj, pathStr) {
  return pathStr.split('/').reduce((o, k) => o?.[k], obj);
}

function targetFile(target) {
  return typeof target === 'string' ? target.split('#/')[0] : null;
}

function exactTarget(target) {
  const file = targetFile(target);
  if (!file) return target;
  const absolute = resolveFsPath(bundlePath, file);
  return typeof target === 'string' && target.includes('#/')
    ? `${absolute}#/${target.split('#/')[1]}`
    : absolute;
}

function configurationFinding(rule, detail, observed = null) {
  return makeContractFinding({
    id: rule.id,
    ruleId: rule.id,
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: 'configuration_integrity',
    surface: `Gate checker dispatch for ${definition.gate}/${rule.id}`,
    expected: `Implemented deterministic checker '${rule.check}'.`,
    observed: observed ?? rule.check,
    missingFact: detail,
    repairKind: 'missing_contract',
    writeTo: `Gate checker implementation boundary for ${definition.gate}/${rule.id}`,
    repair: 'Repair the Gate checker contract before rerunning this checkpoint.',
    detail: `[${rule.id}] ${detail}`,
  });
}

function checkerOwnedFinding(rule, failure) {
  const maskedByRuleId = failure.maskedByRuleId || null;
  if (rule.check === 'schema_valid') {
    const surface = exactTarget(rule.target);
    return makeContractFinding({
      id: rule.id,
      ruleId: rule.id,
      findingSource: 'checker',
      classification: 'blocking',
      blockingBasis: failure.fileMissing ? 'required_structure' : 'authority_integrity',
      surface,
      expected: failure.expected,
      observed: failure.observed,
      missingFact: failure.missingFact,
      repairKind: 'missing_contract',
      writeTo: `Schema-valid owner contract boundary for ${surface} (${rule.schema})`,
      repair: `Restore ${surface} through its existing schema owner before rerunning this Gate; do not bypass or hand-edit deterministic authority without an accepted owner path.`,
      detail: `[${rule.id}] ${failure.detail}`,
      maskedByRuleId,
    });
  }

  if (rule.check === 'cross_field') {
    const bundleRoot = resolveFsPath(bundlePath);
    return makeContractFinding({
      id: rule.id,
      ruleId: rule.id,
      findingSource: 'checker',
      classification: 'blocking',
      blockingBasis: 'binding_integrity',
      surface: `${bundleRoot}; ${resolveFsPath(bundlePath, 'rb_plan.md')}#/plan_basename; ${resolveFsPath(bundlePath, 'rb_profile.yaml')}#/plan_basename`,
      expected: failure.expected,
      observed: failure.observed,
      missingFact: failure.missingFact,
      repairKind: 'missing_contract',
      writeTo: `Canonical bundle-basename binding boundary for ${bundleRoot}`,
      repair: 'The current runtime exposes no safe in-place basename rebinding operation. Resolve that owner contract before rerunning this Gate; do not rename the bundle or patch binding authority by hand.',
      detail: `[${rule.id}] ${failure.detail}`,
      maskedByRuleId,
    });
  }

  return configurationFinding(rule, failure.missingFact, failure.observed);
}

// ── Rule evaluation ──
for (const rule of definition.rules) {
  if (rule.check === 'placeholder') continue;
  checksRun += 1;

  let failure = null;
  let findingOverride = null;

  try {
    if (rule.check === 'file_exists') {
      const targetPath = join(bundlePath, rule.target);
      if (!existsSync(targetPath)) {
        failure = {
          surface: rule.target,
          expected: 'Required file exists.',
          observed: { exists: false },
          missingFact: `Required setup file '${rule.target}' is absent.`,
          detail: `Missing file: ${rule.target}`,
        };
        prerequisiteRoots.set(rule.target, rule.id);
      }
    } else if (rule.check === 'dir_exists') {
      const targetPath = join(bundlePath, rule.target);
      const exists = existsSync(targetPath);
      const isDirectory = exists && statSync(targetPath).isDirectory();
      if (!isDirectory) {
        failure = {
          surface: rule.target,
          expected: 'Required directory exists and is a directory.',
          observed: { exists, is_directory: isDirectory },
          missingFact: `Required setup directory '${rule.target}' is absent or is not a directory.`,
          detail: `Missing directory: ${rule.target}`,
        };
        prerequisiteRoots.set(rule.target, rule.id);
      }
    } else if (rule.check === 'schema_valid') {
      const target = rule.target;
      const schemaName = rule.schema;
      let parsed;
      if (target === 'rb_plan.md' && schemaName === 'PlanSchema') {
        const plan = getPlan();
        if (!plan) {
          failure = {
            expected: `${schemaName} accepts parsed ${target}.`,
            observed: { file_exists: existsSync(join(bundlePath, target)), parsed: false },
            missingFact: `${target} is missing or its Markdown frontmatter cannot be parsed for ${schemaName}.`,
            detail: 'rb_plan.md not found or unparseable frontmatter',
            fileMissing: !existsSync(join(bundlePath, target)),
          };
        }
        else parsed = PlanSchema.safeParse(plan);
      } else if (target === 'rb_profile.yaml' && schemaName === 'ProfileSchema') {
        const profile = getProfile();
        if (!profile) {
          failure = {
            expected: `${schemaName} accepts parsed ${target}.`,
            observed: { file_exists: existsSync(join(bundlePath, target)), parsed: false },
            missingFact: `${target} is missing or cannot be parsed for ${schemaName}.`,
            detail: 'rb_profile.yaml not found or unparseable',
            fileMissing: !existsSync(join(bundlePath, target)),
          };
        }
        else parsed = ProfileSchema.safeParse(profile);
      } else if (target === 'rb_status.json' && schemaName === 'StatusSchema') {
        const status = getStatus();
        if (!status) {
          failure = {
            expected: `${schemaName} accepts parsed ${target}.`,
            observed: { file_exists: existsSync(join(bundlePath, target)), parsed: false },
            missingFact: `${target} is missing or cannot be parsed for ${schemaName}.`,
            detail: 'rb_status.json not found or unparseable',
            fileMissing: !existsSync(join(bundlePath, target)),
          };
        }
        else parsed = StatusSchema.safeParse(status);
      } else if (target === 'rb_queue.json' && schemaName === 'QueueSchema') {
        const qPath = join(bundlePath, 'rb_queue.json');
        if (!existsSync(qPath)) {
          failure = {
            expected: `${schemaName} accepts parsed ${target}.`,
            observed: { file_exists: false },
            missingFact: `${target} is absent, so ${schemaName} cannot be evaluated.`,
            detail: 'rb_queue.json not found',
            fileMissing: true,
          };
        }
        else {
          const queue = JSON.parse(readFileSync(qPath, 'utf-8'));
          parsed = QueueSchema.safeParse(queue);
        }
      } else {
        const detail = `Unknown schema target: ${target}/${schemaName} — must fail (check type not implemented)`;
        findingOverride = configurationFinding(rule, detail, { target, schema: schemaName });
      }
      if (parsed && !parsed.success) {
        const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
        failure = {
          expected: `${schemaName} accepts parsed ${target}.`,
          observed: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
          missingFact: `${target} violates ${schemaName}: ${issues}`,
          detail: `${schemaName} validation failed for ${target}: ${issues}`,
          fileMissing: false,
        };
      }
      if (failure) {
        const parentRoot = prerequisiteRoots.get(target) || null;
        failure.maskedByRuleId = parentRoot;
        if (!parentRoot) prerequisiteRoots.set(target, rule.id);
      }
    } else if (rule.check === 'field_value') {
      const [, jsonPath] = rule.target.split('#/');
      const profile = getProfile();
      if (!profile) {
        failure = {
          surface: rule.target,
          expected: rule.value,
          observed: { parsed_profile: false },
          missingFact: `Cannot verify ${rule.target} because rb_profile.yaml is missing or unparseable.`,
          detail: 'rb_profile.yaml not found or unparseable',
          maskedByRuleId: prerequisiteRoots.get('rb_profile.yaml') || null,
        };
      }
      else {
        const value = resolvePath(profile, jsonPath);
        if (rule.operator === 'equal' && value !== rule.value) {
          failure = {
            surface: rule.target,
            expected: rule.value,
            observed: value,
            missingFact: `${rule.target} must equal '${rule.value}', but the observed value is '${value}'.`,
            detail: `${rule.target}: expected "${rule.value}", got "${value}"`,
          };
        }
      }
    } else if (rule.check === 'field_non_empty') {
      const target = rule.target;
      if (target.includes('#/')) {
        // YAML field path variant (existing logic)
        const [, jsonPath] = target.split('#/');
        const profile = getProfile();
        if (!profile) {
          failure = {
            surface: target,
            expected: 'Non-empty value.',
            observed: { parsed_profile: false },
            missingFact: `Cannot verify ${target} because rb_profile.yaml is missing or unparseable.`,
            detail: 'rb_profile.yaml not found or unparseable',
            maskedByRuleId: prerequisiteRoots.get('rb_profile.yaml') || null,
          };
        }
        else {
          const value = resolvePath(profile, jsonPath);
          if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
            failure = {
              surface: target,
              expected: 'Non-empty value.',
              observed: value ?? null,
              missingFact: `${target} is empty or missing.`,
              detail: `${target} is empty or missing`,
            };
          }
        }
      } else if (target.endsWith('.md')) {
        // File body variant: strip frontmatter, check remaining content non-empty
        const filePath = join(bundlePath, target);
        if (!existsSync(filePath)) {
          failure = {
            surface: target,
            expected: 'Non-empty Markdown body after frontmatter.',
            observed: { file_exists: false },
            missingFact: `Cannot verify the body of '${target}' because the file is absent.`,
            detail: `File not found: ${target}`,
            maskedByRuleId: prerequisiteRoots.get(target) || null,
          };
        } else {
          const content = readFileSync(filePath, 'utf-8');
          const bodyContent = stripMdFrontmatter(content);
          if (bodyContent.length === 0) {
            failure = {
              surface: target,
              expected: 'Non-empty Markdown body after frontmatter.',
              observed: { body_length: 0 },
              missingFact: `${target} has no content after its frontmatter.`,
              detail: `${target} is empty (no content after frontmatter)`,
              maskedByRuleId: prerequisiteRoots.get(target) || null,
            };
          }
        }
      } else {
        const detail = `Unknown field_non_empty target: ${target} — must contain '#/' (YAML path) or end with '.md' (file body)`;
        findingOverride = configurationFinding(rule, detail, target);
      }
    } else if (rule.check === 'pattern_match') {
      const target = rule.target;
      const filePath = join(bundlePath, target);
      if (!existsSync(filePath)) {
        failure = {
          surface: target,
          expected: rule.negate ? `Pattern ${rule.pattern} is absent.` : `Pattern ${rule.pattern} is present.`,
          observed: { file_exists: false },
          missingFact: `Cannot evaluate pattern ${rule.pattern} because '${target}' is absent.`,
          detail: `File not found for pattern_match: ${target}`,
          maskedByRuleId: prerequisiteRoots.get(target) || null,
        };
      } else {
        const content = readFileSync(filePath, 'utf-8');
        const bodyContent = stripSuppliedControlsForTemplateScan(stripMdFrontmatter(content));
        const re = new RegExp(rule.pattern);
        const matched = re.test(bodyContent);
        if (rule.negate) {
          if (matched) {
            failure = {
              surface: target,
              expected: `Pattern ${rule.pattern} is absent.`,
              observed: { matched: true },
              missingFact: `${target} still contains a required-fill marker matching ${rule.pattern}.`,
              detail: `Forbidden required-fill marker in ${target}: ${rule.pattern}`,
              maskedByRuleId: prerequisiteRoots.get(target) || null,
            };
          }
        } else {
          if (!matched) {
            failure = {
              surface: target,
              expected: `Pattern ${rule.pattern} is present.`,
              observed: { matched: false },
              missingFact: `${target} does not contain required structure matching ${rule.pattern}.`,
              detail: `Missing required pattern in ${target}: ${rule.pattern}`,
              maskedByRuleId: prerequisiteRoots.get(target) || null,
            };
          }
        }
      }
    } else if (rule.check === 'status_value') {
      const [file, jsonPath] = rule.target.split('#/');
      const status = getStatus();
      if (!status) {
        failure = {
          surface: rule.target,
          expected: rule.expected,
          observed: { parsed_status: false },
          missingFact: `Cannot verify ${rule.target} because ${file} is missing or unparseable.`,
          detail: `${file} not found or unparseable`,
          maskedByRuleId: prerequisiteRoots.get(file) || null,
        };
      }
      else {
        const value = jsonPath.split('/').reduce((obj, key) => obj?.[key], status);
        if (value !== rule.expected) {
          failure = {
            surface: rule.target,
            expected: rule.expected,
            observed: value,
            missingFact: `${rule.target} must equal '${rule.expected}', but the observed value is '${value}'.`,
            detail: `${rule.target}: expected "${rule.expected}", got "${value}"`,
            maskedByRuleId: prerequisiteRoots.get(file) || null,
          };
        }
      }
    } else if (rule.check === 'cross_field') {
      // basename consistency check
      const bundleName = basename(bundlePath);
      const normalized = normalizeBundleBasename(bundleName);
      if (normalized === null) {
        failure = {
          expected: 'Bundle basename normalizes under dpt_rb_<name> or dpt_disp_<name>_<hex> and equals both recorded plan_basename values.',
          observed: { bundle_basename: bundleName, normalized: null },
          missingFact: `Bundle directory name '${bundleName}' does not match the accepted naming pattern.`,
          detail: `Bundle directory name "${bundleName}" does not match accepted naming pattern (dpt_rb_<name> or dpt_disp_<name>_<hex>).`,
        };
      } else {
        const plan = getPlan();
        const profile = getProfile();
        const planBasename = plan?.plan_basename;
        const profileBasename = profile?.plan_basename;
        if (normalized !== planBasename) {
          failure = {
            expected: { normalized_bundle_basename: normalized, plan_basename: normalized, profile_basename: normalized },
            observed: { normalized_bundle_basename: normalized, plan_basename: planBasename, profile_basename: profileBasename },
            missingFact: `Normalized bundle basename '${normalized}' does not equal rb_plan.md#/plan_basename '${planBasename}'.`,
            detail: `Basename mismatch: normalized bundle basename "${normalized}" != rb_plan.md plan_basename "${planBasename}"`,
          };
        } else if (normalized !== profileBasename) {
          failure = {
            expected: { normalized_bundle_basename: normalized, plan_basename: normalized, profile_basename: normalized },
            observed: { normalized_bundle_basename: normalized, plan_basename: planBasename, profile_basename: profileBasename },
            missingFact: `Normalized bundle basename '${normalized}' does not equal rb_profile.yaml#/plan_basename '${profileBasename}'.`,
            detail: `Basename mismatch: normalized bundle basename "${normalized}" != rb_profile.yaml plan_basename "${profileBasename}"`,
          };
        }
      }
      if (failure) {
        failure.maskedByRuleId = prerequisiteRoots.get('rb_plan.md') || prerequisiteRoots.get('rb_profile.yaml') || null;
      }
    } else {
      const detail = `Unknown check type: ${rule.check} — must fail (check type not implemented)`;
      findingOverride = configurationFinding(rule, detail);
    }
  } catch (err) {
    const safeMsg = (err.message || String(err)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
    failure = {
      surface: rule.target || `Gate checker dispatch for ${definition.gate}/${rule.id}`,
      expected: `Rule '${rule.id}' evaluates its direct authority without parser/runtime error.`,
      observed: safeMsg,
      missingFact: `Rule '${rule.id}' could not evaluate its direct authority: ${safeMsg}`,
      detail: `Error evaluating rule ${rule.id}: ${safeMsg}`,
      maskedByRuleId: prerequisiteRoots.get(targetFile(rule.target)) || null,
      fileMissing: false,
    };
    if (rule.check === 'schema_valid') {
      failure.expected = `${rule.schema} accepts parsed ${rule.target}.`;
      failure.missingFact = `${rule.target} cannot be parsed or evaluated for ${rule.schema}: ${safeMsg}`;
      failure.detail = `${rule.schema} evaluation failed for ${rule.target}: ${safeMsg}`;
      const parentRoot = prerequisiteRoots.get(rule.target) || null;
      failure.maskedByRuleId = parentRoot;
      if (!parentRoot) prerequisiteRoots.set(rule.target, rule.id);
    } else if (rule.check === 'cross_field') {
      failure.maskedByRuleId = prerequisiteRoots.get('rb_plan.md') || prerequisiteRoots.get('rb_profile.yaml') || null;
    }
  }

  if (findingOverride) findings.push(findingOverride);
  else if (failure) findings.push(rule.finding.source === 'definition'
    ? makeDefinitionRuleFinding({
        rule,
        bundlePath,
        surface: failure.surface,
        expected: failure.expected,
        observed: failure.observed,
        missingFact: failure.missingFact,
        detail: `[${rule.id}] ${failure.detail}`,
        maskedByRuleId: failure.maskedByRuleId || null,
      })
    : checkerOwnedFinding(rule, failure));
}

const ruleEvaluation = buildContractEvaluation({ checksRun, findings });
const outcome = ruleEvaluation.passed ? 'passed' : 'failed';
const routing = resolveRouting(args.transitions, args.currentNode, outcome);
const routingFailed = ['invalid_input', 'config_error'].includes(routing.kind);
const evaluation = buildContractEvaluation({
  checksRun,
  findings: [...ruleEvaluation.findings, ...(routing.findings || [])],
  maskedRuleIds: ruleEvaluation.masked_rule_ids,
});

const result = buildGateResult({
  passed: ruleEvaluation.passed && !routingFailed,
  gate: definition.gate,
  currentNodeRef: args.currentNode,
  routing,
  inspect: [...ruleEvaluation.inspect, ...(routing.inspect || [])],
  advice: [...ruleEvaluation.advice, ...(routing.advice || [])],
  findings: evaluation.findings,
  bundlePath,
  extraCheck: {
    failed_rule_ids: evaluation.failed_rule_ids,
    masked_rule_ids: evaluation.masked_rule_ids,
  },
  attemptNumber: args.attempt ?? 0,
});

if (result.check.passed) {
  const staged = writeGateAttempt(bundlePath, result, { setupReadyStaged: true });
  if (staged.ok) {
    emitGateResult(result);
  } else {
    const failedRouting = resolveRouting(args.transitions, args.currentNode, 'failed');
    const failureEvaluation = buildContractEvaluation({
      findings: [...(staged.finding?.findings || []), ...(failedRouting.findings || [])],
    });
    const failedResult = buildGateResult({
      passed: false,
      gate: definition.gate,
      currentNodeRef: args.currentNode,
      routing: failedRouting,
      inspect: [...(staged.finding?.inspect || ['setup-ready route persistence failed']), ...(failedRouting.inspect || [])],
      advice: [...(staged.finding?.advice || []), ...(failedRouting.advice || [])],
      findings: failureEvaluation.findings,
      bundlePath,
      extraCheck: {
        failed_rule_ids: failureEvaluation.failed_rule_ids,
        masked_rule_ids: failureEvaluation.masked_rule_ids,
        trace_durable: false,
        gate_attempt_write_failed: true,
      },
      attemptNumber: args.attempt ?? 0,
    });
    emitGateResult(failedResult);
  }
} else {
  try {
    writeGateAttempt(bundlePath, result, { strictTrace: false });
  } catch {
    // Failed/non-routing attempts retain the existing diagnostic tolerance.
  }
  emitGateResult(result);
}
