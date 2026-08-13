#!/usr/bin/env node
// check-gate-hitl1-recorded.mjs — evaluates gate-hitl1-recorded rules
// @impl GSK-001, GSK-002, GSK-004, GSK-008, PRG-002, PRG-005, PRG-007, PRP-011, RES-002
// Usage: node check-gate-hitl1-recorded.mjs --bundle <path> --current-node <fileRef> [--transitions <path>]

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve as resolveFsPath } from 'node:path';
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
} from '../../engine/helpers/gate-helpers.mjs';
import {
  buildContractEvaluation,
  makeContractFinding,
  makeDefinitionRuleFinding,
} from '../../engine/helpers/wave-contract-findings.mjs';
import { ProfileSchema } from '../../schema/index.mjs';
import { inspectCanonicalTopicState } from '../../engine/helpers/canonical-topic-state.mjs';
import {
  buildResearchStyleApplyCommand,
  evaluateResearchStyleProjectionFreshness,
  hasOnlyResearchStyleProjectionIssues,
  readResearchStyleDefinition,
} from '../../engine/helpers/research-style-projection.mjs';

const args = parseGateCliArgs();
if (args.error) { emitGateResult(args.error, { bundlePath: args.bundle }); }

const { definition, error: defError } = tryLoadGateDefinition('hitl1-recorded', args.currentNode || null);
if (defError) { emitGateResult(defError, { bundlePath: args.bundle }); }

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
const maskedRuleIds = new Set();
let checksRun = 1;

function resolveObjectPath(object, pathText) {
  return pathText.split('/').reduce((value, key) => value?.[key], object);
}

function exactTarget(target) {
  if (typeof target !== 'string') return target;
  const [file, jsonPath] = target.split('#/');
  const absolute = resolveFsPath(bundlePath, file);
  return jsonPath ? `${absolute}#/${jsonPath}` : absolute;
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

let profileRead = null;
function readProfile() {
  if (profileRead) return profileRead;
  const profilePath = join(bundlePath, 'rb_profile.yaml');
  if (!existsSync(profilePath)) {
    profileRead = { value: null, error: 'file absent', exists: false };
    return profileRead;
  }
  try {
    profileRead = { value: parseYaml(readFileSync(profilePath, 'utf-8')), error: null, exists: true };
  } catch (error) {
    profileRead = { value: null, error: error.message || String(error), exists: true };
  }
  return profileRead;
}

let statusRead = null;
function readStatus() {
  if (statusRead) return statusRead;
  const statusPath = join(bundlePath, 'rb_status.json');
  if (!existsSync(statusPath)) {
    statusRead = { value: null, error: 'file absent', exists: false };
    return statusRead;
  }
  try {
    statusRead = { value: JSON.parse(readFileSync(statusPath, 'utf-8')), error: null, exists: true };
  } catch (error) {
    statusRead = { value: null, error: error.message || String(error), exists: true };
  }
  return statusRead;
}

function profileSchemaFinding(rule, failure) {
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
    writeTo: `ProfileSchema owner contract boundary for ${surface}`,
    repair: 'Restore a schema-valid profile through the owning HITL/profile path; do not guess fields from Gate prose.',
    detail: `[${rule.id}] ${failure.detail}`,
    maskedByRuleId: failure.maskedByRuleId || null,
  });
}

function researchAccessFinding(rule, failure) {
  const profileCoordinate = `${resolveFsPath(bundlePath, 'rb_profile.yaml')}#/research_access`;
  return makeContractFinding({
    id: rule.id,
    ruleId: rule.id,
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: 'required_structure',
    surface: exactTarget(rule.target),
    expected: failure.expected,
    observed: failure.observed,
    missingFact: failure.missingFact,
    repairKind: 'agent_action',
    writeTo: profileCoordinate,
    repair: 'Run the bounded HITL1 direct-sample probe, record its direct result, and rerun this Gate.',
    detail: `[${rule.id}] ${failure.detail}`,
    maskedByRuleId: failure.maskedByRuleId || null,
  });
}

function recordedAtFinding(rule, failure) {
  const surface = exactTarget(rule.target);
  return makeContractFinding({
    id: rule.id,
    ruleId: rule.id,
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: 'required_structure',
    surface,
    expected: failure.expected,
    observed: failure.observed,
    missingFact: failure.missingFact,
    repairKind: 'agent_action',
    writeTo: surface,
    repair: 'Record the actual ISO 8601 HITL1 decision timestamp, then rerun this Gate.',
    detail: `[${rule.id}] ${failure.detail}`,
    maskedByRuleId: failure.maskedByRuleId || null,
  });
}

function styleProjectionFinding(freshness) {
  const profilePath = resolveFsPath(bundlePath, 'rb_profile.yaml');
  const command = buildResearchStyleApplyCommand({
    bundlePath,
    selectedProfile: freshness.selected_profile,
  });
  const stateDetail = freshness.state === 'absent'
    ? 'is absent'
    : freshness.state === 'partial'
      ? 'is partial or structurally invalid'
      : 'does not match the current selected-profile projection';
  return makeContractFinding({
    id: 'style_projection_freshness',
    ruleId: 'style_projection_freshness',
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: 'required_structure',
    surface: `${profilePath}#/research_style_params`,
    expected: {
      selected_profile: freshness.selected_profile,
      committed_topic_count: freshness.topic_count,
      research_style_params: freshness.expected_params,
    },
    observed: {
      state: freshness.state,
      research_style_params: freshness.observed_params,
      differing_fields: freshness.differing_fields || [],
      missing_fields: freshness.missing_fields || [],
      unexpected_fields: freshness.unexpected_fields || [],
    },
    missingFact: `research_style_params ${stateDetail} for selected profile '${freshness.selected_profile}' at committed topic count ${freshness.topic_count}.`,
    repairKind: 'engine_operation',
    writeTo: command,
    repair: `Run the existing style projection command, then rerun this same Gate: ${command}`,
    detail: `[style_projection_freshness] research_style_params ${stateDetail} for '${freshness.selected_profile}' and committed topic count ${freshness.topic_count}.`,
  });
}

function styleProjectionConfigurationFinding(detail, observed = null) {
  return makeContractFinding({
    id: 'style_projection_freshness',
    ruleId: 'style_projection_freshness',
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: 'configuration_integrity',
    surface: 'Research style definition / freshness evaluator contract',
    expected: 'The selected profile resolves to a valid static research style definition.',
    observed,
    missingFact: detail,
    repairKind: 'missing_contract',
    writeTo: 'Research style definition and freshness evaluator implementation boundary',
    repair: 'Repair the static style-definition contract before rerunning this Gate.',
    detail: `[style_projection_freshness] ${detail}`,
  });
}

const topicState = inspectCanonicalTopicState({ bundlePath });
if (topicState.mode !== 'canonical' || topicState.passed !== true) {
  const blocker = topicState.blockers?.[0];
  findings.push(blocker?.finding || makeContractFinding({
    id: 'canonical_topic_state_prerequisite',
    ruleId: 'canonical_topic_state_prerequisite',
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: 'configuration_integrity',
    surface: 'Canonical topic-state inspection contract',
    expected: 'Canonical topic-state inspection returns a concrete blocker finding.',
    observed: { mode: topicState.mode, passed: topicState.passed },
    missingFact: 'Canonical topic-state prerequisite failed without a helper-owned blocker finding.',
    repairKind: 'missing_contract',
    writeTo: 'Canonical topic-state blocker finding boundary',
    repair: 'Repair the canonical topic-state helper contract before rerunning this Gate.',
  }));
} else if (topicState.topics.length === 0) {
  findings.push(makeContractFinding({
    id: 'canonical_topic_state:empty_registry',
    ruleId: 'canonical_topic_state_prerequisite',
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: 'required_structure',
    surface: `${resolveFsPath(bundlePath, 'rb_plan.md')}#/topic_registry`,
    expected: 'At least one user-approved canonical Topic exists before HITL1 can be recorded.',
    observed: { topic_count: 0 },
    missingFact: 'HITL1 has no approved canonical Topic intent to record.',
    repairKind: 'user_decision',
    writeTo: 'phases/phase-hitl1.md',
    repair: 'Collect the minimum Topic decision in HITL1, then apply it through the canonical topic-state owner.',
  }));
}

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
          expected: 'Required profile file exists.',
          observed: { exists: false },
          missingFact: `Required HITL1 profile file '${rule.target}' is absent.`,
          detail: `Missing file: ${rule.target}`,
        };
        prerequisiteRoots.set(rule.target, rule.id);
      }
    } else if (rule.check === 'schema_valid') {
      if (rule.target !== 'rb_profile.yaml' || rule.schema !== 'ProfileSchema') {
        findingOverride = configurationFinding(rule, `Unknown schema target: ${rule.target}/${rule.schema}`, {
          target: rule.target,
          schema: rule.schema,
        });
      } else {
        const profile = readProfile();
        if (!profile.value) {
          failure = {
            expected: 'ProfileSchema accepts parsed rb_profile.yaml.',
            observed: { file_exists: profile.exists, parsed: false, error: profile.error },
            missingFact: `rb_profile.yaml is ${profile.exists ? 'unparseable' : 'absent'}, so ProfileSchema cannot validate it${profile.error ? `: ${profile.error}` : '.'}`,
            detail: `ProfileSchema validation failed: ${profile.error || 'rb_profile.yaml not found'}`,
            fileMissing: !profile.exists,
          };
        } else {
          const parsed = ProfileSchema.safeParse(profile.value);
          if (!parsed.success && !hasOnlyResearchStyleProjectionIssues(parsed.error.issues)) {
            const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
            failure = {
              expected: 'ProfileSchema accepts parsed rb_profile.yaml.',
              observed: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
              missingFact: `rb_profile.yaml violates ProfileSchema: ${issues}`,
              detail: `ProfileSchema validation failed: ${issues}`,
              fileMissing: false,
            };
          }
        }
        if (failure) {
          const parentRoot = prerequisiteRoots.get(rule.target) || null;
          failure.maskedByRuleId = parentRoot;
          if (!parentRoot) prerequisiteRoots.set(rule.target, rule.id);
        }
      }
    } else if (rule.check === 'field_value' || rule.check === 'field_non_empty') {
      const [file, jsonPath] = rule.target.split('#/');
      if (!file || !jsonPath || file !== 'rb_profile.yaml') {
        findingOverride = configurationFinding(rule, `Unsupported profile field target: ${rule.target}`, rule.target);
      } else {
        const profile = readProfile();
        const parentRoot = prerequisiteRoots.get(file) || null;
        if (!profile.value) {
          failure = {
            surface: rule.target,
            expected: rule.check === 'field_non_empty' ? 'Non-empty value.' : rule.value,
            observed: { parsed_profile: false, error: profile.error },
            missingFact: `Cannot verify ${rule.target} because rb_profile.yaml is missing or unparseable.`,
            detail: `Cannot evaluate ${rule.target}: ${profile.error || 'profile unavailable'}`,
            maskedByRuleId: parentRoot,
          };
        } else {
          const value = resolveObjectPath(profile.value, jsonPath);
          if (rule.id === 'research_access_available' && parentRoot === 'profile_schema_valid') {
            maskedRuleIds.add(rule.id);
            continue;
          }
          // PRG-002/PRG-010: a schema-valid completed current direct-sample
          // observation satisfies the recorded-observation rule regardless of
          // available/unavailable status. `profile_schema_valid` already enforces
          // the current-format shape and content/status invariant, so the Gate
          // applies no availability threshold to current-format observations.
          if (rule.id === 'research_access_available'
            && Array.isArray(profile.value.research_access?.sample_observations)) {
            continue;
          }
          if (rule.check === 'field_non_empty') {
            const empty = value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
            if (empty) {
              if (rule.id === 'hitl1_recorded_at_non_empty'
                && resolveObjectPath(profile.value, 'human_decision_checkpoints/hitl1/status') !== 'recorded') {
                maskedRuleIds.add(rule.id);
                continue;
              }
              failure = {
                surface: rule.target,
                expected: 'Non-empty value.',
                observed: value ?? null,
                missingFact: `${rule.target} is empty or missing.`,
                detail: `${rule.target} is empty or missing`,
                maskedByRuleId: parentRoot,
              };
            }
          } else if (rule.operator === 'equal') {
            if (value !== rule.value) {
              failure = {
                surface: rule.target,
                expected: rule.value,
                observed: value ?? null,
                missingFact: `${rule.target} must equal '${rule.value}', but the observed value is '${value}'.`,
                detail: `${rule.target}: expected "${rule.value}", got "${value}"`,
                maskedByRuleId: parentRoot,
              };
              if (rule.id === 'hitl1_status_recorded') maskedRuleIds.add('hitl1_recorded_at_non_empty');
            }
          } else if (rule.operator === 'not_equal') {
            if (value === rule.value) {
              failure = {
                surface: rule.target,
                expected: `Value differs from '${rule.value}'.`,
                observed: value,
                missingFact: `${rule.target} is still '${rule.value}', so the HITL1 choice has not been recorded.`,
                detail: `${rule.target} is still "${rule.value}" (should not be)`,
                maskedByRuleId: parentRoot,
              };
            }
          } else {
            findingOverride = configurationFinding(rule, `Unsupported field_value operator: ${rule.operator}`, rule.operator);
          }
        }
      }
    } else if (rule.check === 'status_value') {
      const [file, jsonPath] = rule.target.split('#/');
      const status = readStatus();
      if (!status.value) {
        failure = {
          surface: rule.target,
          expected: rule.expected,
          observed: { parsed_status: false, error: status.error },
          missingFact: `Cannot verify ${rule.target} because ${file} is missing or unparseable.`,
          detail: `${file} not found or unparseable: ${status.error || 'unknown error'}`,
        };
      } else {
        const value = resolveObjectPath(status.value, jsonPath);
        if (value !== rule.expected) {
          failure = {
            surface: rule.target,
            expected: rule.expected,
            observed: value,
            missingFact: `${rule.target} must equal '${rule.expected}', but the observed value is '${value}'.`,
            detail: `${rule.target}: expected "${rule.expected}", got "${value}"`,
          };
        }
      }
    } else {
      findingOverride = configurationFinding(rule, `Unknown check type: ${rule.check} — must fail (check type not implemented)`);
    }
  } catch (error) {
    const safeMessage = (error.message || String(error)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
    failure = {
      surface: rule.target || `Gate checker dispatch for ${definition.gate}/${rule.id}`,
      expected: `Rule '${rule.id}' evaluates its direct authority without parser/runtime error.`,
      observed: safeMessage,
      missingFact: `Rule '${rule.id}' could not evaluate its direct authority: ${safeMessage}`,
      detail: `Error evaluating rule ${rule.id}: ${safeMessage}`,
      maskedByRuleId: prerequisiteRoots.get(typeof rule.target === 'string' ? rule.target.split('#/')[0] : null) || null,
    };
  }

  if (findingOverride) {
    findings.push(findingOverride);
  } else if (failure) {
    if (rule.id === 'profile_schema_valid') findings.push(profileSchemaFinding(rule, failure));
    else if (rule.id === 'research_access_available') findings.push(researchAccessFinding(rule, failure));
    else if (rule.id === 'hitl1_recorded_at_non_empty') findings.push(recordedAtFinding(rule, failure));
    else findings.push(makeDefinitionRuleFinding({
      rule,
      bundlePath,
      surface: failure.surface,
      expected: failure.expected,
      observed: failure.observed,
      missingFact: failure.missingFact,
      detail: `[${rule.id}] ${failure.detail}`,
      maskedByRuleId: failure.maskedByRuleId || null,
      maskedRuleIds: rule.id === 'hitl1_status_recorded' && failure
        ? ['hitl1_recorded_at_non_empty']
        : [],
    }));
  }
}

if (findings.length > 0) {
  maskedRuleIds.add('style_projection_freshness');
} else {
  checksRun += 1;
  const profile = readProfile();
  const selectedProfile = profile.value?.research_profile;
  try {
    const freshness = evaluateResearchStyleProjectionFreshness({
      selectedProfile,
      styleDefinition: readResearchStyleDefinition(selectedProfile),
      topicCount: topicState.topics.length,
      researchStyleParams: profile.value?.research_style_params,
    });
    if (!freshness.passed) {
      if (freshness.state === 'style_definition_invalid' || freshness.state === 'selected_profile_unusable') {
        findings.push(styleProjectionConfigurationFinding(
          freshness.error || `Selected profile '${selectedProfile ?? 'null'}' is unavailable to the style freshness evaluator.`,
          freshness,
        ));
      } else {
        findings.push(styleProjectionFinding(freshness));
      }
    }
  } catch (error) {
    findings.push(styleProjectionConfigurationFinding(
      `Cannot load the selected research style definition: ${error.message || String(error)}`,
      { selected_profile: selectedProfile ?? null },
    ));
  }
}

const ruleEvaluation = buildContractEvaluation({
  checksRun,
  findings,
  maskedRuleIds: [...maskedRuleIds],
});
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

try {
  writeGateAttempt(bundlePath, result, { strictTrace: result.check?.passed === true && result.check?.next != null });
} catch (error) {
  const failedRouting = resolveRouting(args.transitions, args.currentNode, 'failed');
  const failureEvaluation = buildContractEvaluation({
    findings: [...(error.findings || []), ...(failedRouting.findings || [])],
  });
  const failedResult = buildGateResult({
    passed: false,
    gate: definition.gate,
    currentNodeRef: args.currentNode,
    routing: failedRouting,
    inspect: [...(error.inspect || [error.message || String(error)]), ...(failedRouting.inspect || [])],
    advice: [...(error.advice || []), ...(failedRouting.advice || [])],
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
  try { writeGateAttempt(bundlePath, failedResult); } catch { /* secondary diagnostic only */ }
  emitGateResult(failedResult);
}

emitGateResult(result);
