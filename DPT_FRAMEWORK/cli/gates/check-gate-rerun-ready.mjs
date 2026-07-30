#!/usr/bin/env node
// check-gate-rerun-ready.mjs — evaluates gate-rerun-ready rules
// @impl GSK-002, GSK-004, GSK-008, REI-003, RES-002
// Usage: node check-gate-rerun-ready.mjs --bundle <path> --current-node <fileRef> [--transitions <path>]

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
  evaluateRerunAvailability,
} from '../../engine/helpers/gate-helpers.mjs';
import {
  buildContractEvaluation,
  makeContractFinding,
  makeDefinitionRuleFinding,
} from '../../engine/helpers/wave-contract-findings.mjs';
import { buildCanonicalTopicRegistryFact } from '../../engine/helpers/topic-registry-fact.mjs';
import { evaluateCanonicalSeedBindings } from '../../engine/helpers/canonical-topic-state.mjs';
import { evaluateRerunDirection } from '../../engine/helpers/rerun-direction.mjs';
import { ProfileSchema } from '../../schema/index.mjs';
import {
  buildResearchStyleApplyCommand,
  evaluateResearchStyleProjectionFreshness,
  hasOnlyResearchStyleProjectionIssues,
  readResearchStyleDefinition,
} from '../../engine/helpers/research-style-projection.mjs';

const args = parseGateCliArgs();
if (args.error) { emitGateResult(args.error, { bundlePath: args.bundle }); }

const { definition, error: defError } = tryLoadGateDefinition('rerun-ready', args.currentNode || null);
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
const maskedRuleIds = new Set();
let checksRun = 1;

function resolveObjectPath(object, pathText) {
  return pathText.split('/').reduce((value, key) => value?.[key], object);
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
    profileRead = { value: null, exists: false, error: 'file absent' };
    return profileRead;
  }
  try {
    profileRead = { value: parseYaml(readFileSync(profilePath, 'utf-8')), exists: true, error: null };
  } catch (error) {
    profileRead = { value: null, exists: true, error: error.message || String(error) };
  }
  return profileRead;
}

const profile = readProfile();
const profileSchema = profile.value ? ProfileSchema.safeParse(profile.value) : null;
const profileHasNonStyleSchemaIssue = Boolean(
  profileSchema && !profileSchema.success && !hasOnlyResearchStyleProjectionIssues(profileSchema.error.issues),
);
const rerunAvailability = profile.value
  ? evaluateRerunAvailability({ definition, profile: profile.value, includeNextIncrement: false })
  : null;
let profileParentRuleId = null;
if (!profile.value
  || profileHasNonStyleSchemaIssue
  || profile.value?.research_profile === 'not_selected'
  || (rerunAvailability?.supported === false && /profile|HITL2 parent/.test(rerunAvailability.reason))) {
  profileParentRuleId = 'rerun_profile_prerequisite';
  const schemaIssues = profileHasNonStyleSchemaIssue
    ? profileSchema.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')
    : null;
  findings.push(makeContractFinding({
    id: profileParentRuleId,
    ruleId: profileParentRuleId,
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: profile.exists ? 'authority_integrity' : 'required_structure',
    surface: resolveFsPath(bundlePath, 'rb_profile.yaml'),
    expected: 'The accepted HITL2 rerun decision profile exists, parses as YAML, and has object-shaped checkpoint/HITL2 parents.',
    observed: { file_exists: profile.exists, parsed: Boolean(profile.value), error: profile.error, schema_issues: schemaIssues, evaluator_reason: rerunAvailability?.reason || null },
    missingFact: !profile.value
      ? `Rerun cannot read its accepted HITL2 decision profile because rb_profile.yaml is ${profile.exists ? 'unparseable' : 'absent'}${profile.error ? `: ${profile.error}` : '.'}`
      : profileHasNonStyleSchemaIssue
        ? `Rerun cannot use its profile because rb_profile.yaml violates ProfileSchema outside research_style_params: ${schemaIssues}.`
        : profile.value?.research_profile === 'not_selected'
          ? 'Rerun cannot refresh style projection because no selected research_profile is recorded.'
      : `Rerun cannot interpret its accepted HITL2 decision profile: ${rerunAvailability.reason}.`,
    repairKind: 'missing_contract',
    writeTo: 'Accepted HITL2 profile recovery boundary for rerun',
    repair: 'Restore the accepted HITL2 decision profile through its owning lifecycle path; do not reconstruct rationale or rerun count by hand.',
  }));
  maskedRuleIds.add('rerun_rationale_present');
  maskedRuleIds.add('rerun_count_valid');
}

function rerunCountFinding(rule, failure) {
  const limitReached = failure.kind === 'limit_reached';
  return makeContractFinding({
    id: rule.id,
    ruleId: rule.id,
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: limitReached ? 'recorded_human_decision' : 'authority_integrity',
    surface: resolveFsPath(bundlePath, 'rb_profile.yaml') + '#/human_decision_checkpoints/hitl2/rerun_count',
    expected: failure.expected,
    observed: failure.observed,
    missingFact: failure.missingFact,
    repairKind: limitReached ? 'user_decision' : 'missing_contract',
    writeTo: limitReached
      ? 'Rerun limit decision boundary: accept current results or start a new Deep Research run'
      : 'HITL2 rerun-count authority contract boundary',
    repair: limitReached
      ? 'The accepted rerun limit has been reached. The existing HITL2/new-run decision owner must resolve accept-current-results versus start-new-run semantics before this same Gate can be rerun.'
      : 'Restore a valid recorded rerun count through the owning HITL2/profile contract.',
    detail: `[${rule.id}] ${failure.detail}`,
    maskedByRuleId: failure.maskedByRuleId || null,
  });
}

function structureFinding(rule, failure) {
  return makeContractFinding({
    id: rule.id,
    ruleId: rule.id,
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: 'required_structure',
    surface: failure.missing.map((target) => resolveFsPath(bundlePath, target)).join('; '),
    expected: { required_directories: rule.targets },
    observed: { missing_directories: failure.missing },
    missingFact: `Rerun bundle structure is missing required director${failure.missing.length === 1 ? 'y' : 'ies'}: ${failure.missing.join(', ')}.`,
    repairKind: 'missing_contract',
    writeTo: `Bundle-integrity recovery boundary for ${resolveFsPath(bundlePath)}`,
    repair: 'Restore the missing bundle structure and its owned contents through a sanctioned bundle/lifecycle path; empty directory creation alone is not accepted recovery.',
    detail: `[${rule.id}] ${failure.detail}`,
  });
}

function rerunDirectionFinding(rule, { surface, expected, observed, missingFact, writeTo, repair, idSuffix = 'structure', repairKind = 'agent_action' }) {
  return makeContractFinding({
    id: `${rule.id}:${idSuffix}`,
    ruleId: rule.id,
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: 'required_structure',
    surface,
    expected,
    observed,
    missingFact,
    repairKind,
    writeTo,
    repair,
    detail: `[${rule.id}] ${missingFact}`,
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
    repair: `Run the existing style projection command before rerun_count increment, then rerun this same Gate: ${command}`,
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

let canonicalTopicRegistryFact = null;

function evaluateRerunDirectionStructure(rule) {
  if (profileParentRuleId || findings.some((finding) => finding.rule_id === 'rerun_rationale_present')) return { findings: [], masked: true };
  let registry;
  try {
    registry = buildCanonicalTopicRegistryFact(bundlePath);
    canonicalTopicRegistryFact = registry;
  } catch (error) {
    return {
      findings: [rerunDirectionFinding(rule, {
        idSuffix: 'plan_prerequisite', repairKind: 'missing_contract', surface: resolveFsPath(bundlePath, 'rb_plan.md'),
        expected: 'A readable canonical plan-bound Topic registry.', observed: error.message || String(error),
        missingFact: 'Rerun direction scope cannot be derived because canonical rb_plan.md is unavailable.',
        writeTo: `node DPT_FRAMEWORK/cli/operate-topic-state.mjs inspect --bundle ${resolveFsPath(bundlePath)}`,
        repair: 'Repair canonical Topic state through its existing owner, then rerun this same Gate.',
      })],
      masked: true,
    };
  }
  const bindings = evaluateCanonicalSeedBindings(bundlePath, { topic_registry: registry.topic_registry });
  const invalidBinding = bindings.find((binding) => !binding.ok);
  if (invalidBinding) {
    return {
      findings: [rerunDirectionFinding(rule, {
        idSuffix: 'seed_binding', repairKind: 'missing_contract', surface: resolveFsPath(bundlePath, invalidBinding.fact_refs[1]),
        expected: 'A plan-bound UID/slug/id/title/must_answer/scope/dependency seed binding.', observed: invalidBinding.reason_code,
        missingFact: `Canonical seed binding is ${invalidBinding.reason_code} for ${invalidBinding.slug}.`,
        writeTo: `node DPT_FRAMEWORK/cli/operate-topic-state.mjs inspect --bundle ${resolveFsPath(bundlePath)}`,
        repair: 'Repair canonical Topic state through its existing owner, then rerun this same Gate.',
      })],
      masked: true,
    };
  }
  const profileCount = profile.value?.human_decision_checkpoints?.hitl2?.rerun_count ?? 0;
  for (const binding of bindings) {
    const seedPath = join(bundlePath, 'seed_topics', `${binding.slug}.md`);
    const direction = evaluateRerunDirection(readFileSync(seedPath, 'utf8'), profileCount);
    const currentOrFuture = direction.has_direction && (direction.rerun_count === null || direction.rerun_count >= profileCount);
    if (!currentOrFuture || direction.state === 'stale' || direction.state === 'legacy_unbound') continue;
    const root = direction.structural_roots[0];
    if (root || direction.state === 'invalid') {
      const field = root?.field || 'direction';
      return { findings: [rerunDirectionFinding(rule, {
        idSuffix: `${binding.slug}:${field}`, surface: `${resolveFsPath(seedPath)}#/${field}`,
        expected: 'One complete, unambiguous canonical current/future rerun direction.',
        observed: { state: direction.state, rerun_count: direction.rerun_count, structural_root: root || null },
        missingFact: `Seed ${binding.slug} has an invalid rerun direction at ${field}.`, writeTo: `${resolveFsPath(seedPath)}#/${field}`,
        repair: 'Repair this direction through a sanctioned retained topic-state input, then rerun this same Gate.',
      })], masked: false };
    }
    if (direction.state === 'future') {
      return { findings: [rerunDirectionFinding(rule, {
        idSuffix: `${binding.slug}:count_sync`, surface: resolveFsPath(bundlePath, 'rb_profile.yaml') + '#/human_decision_checkpoints/hitl2/rerun_count',
        expected: { rerun_count: direction.rerun_count }, observed: profileCount,
        missingFact: `Seed ${binding.slug} has complete future direction round ${direction.rerun_count}; profile count must synchronize before this Gate can pass.`,
        writeTo: 'phases/phase-rerun.md#/profile-count-owner',
        repair: 'Increment the existing profile rerun_count owner, then rerun this same Gate.',
      })], masked: false };
    }
  }
  return { findings: [], masked: false };
}

for (const rule of definition.rules) {
  if (rule.check === 'placeholder') continue;
  checksRun += 1;

  let failure = null;
  let findingOverride = null;

  try {
    if (rule.check === 'field_non_empty') {
      const [, jsonPath] = rule.target.split('#/');
      if (profileParentRuleId) {
        continue;
      }
      const value = resolveObjectPath(profile.value, jsonPath);
      const empty = value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
      if (empty) {
        failure = {
          surface: rule.target,
          expected: 'Non-empty rerun rationale recorded from HITL2.',
          observed: value ?? null,
          missingFact: `${rule.target} is empty or missing, so the requested rerun semantics are not recorded.`,
          detail: `${rule.target} is empty or missing`,
          maskedByRuleId: profileParentRuleId,
        };
      }
    } else if (rule.check === 'rerun_count_limit') {
      if (profileParentRuleId) continue;
      if (!rerunAvailability.supported) {
        findingOverride = configurationFinding(rule, rerunAvailability.reason);
      } else if (!rerunAvailability.available) {
        failure = {
          expected: { operator: 'less_than', value: rerunAvailability.exclusiveLimit },
          observed: rerunAvailability.evaluatedCount,
          missingFact: `${rule.target} is ${rerunAvailability.evaluatedCount}, but the accepted rerun limit requires a value below ${rerunAvailability.exclusiveLimit}.`,
          detail: `${rule.target}: rerun_count is ${rerunAvailability.evaluatedCount}, must be < ${rerunAvailability.exclusiveLimit}`,
          kind: 'limit_reached',
        };
      }
    } else if (rule.check === 'structural') {
      const missing = rule.targets.filter((target) => !existsSync(join(bundlePath, target)));
      if (missing.length > 0) {
        failure = {
          missing,
          detail: missing.map((target) => `Missing directory: ${target}/`).join('; '),
        };
      }
    } else if (rule.check === 'rerun_direction_structure') {
      const directionCheck = evaluateRerunDirectionStructure(rule);
      if (directionCheck.masked) maskedRuleIds.add(rule.id);
      findings.push(...directionCheck.findings);
    } else {
      findingOverride = configurationFinding(rule, `Unknown check type: ${rule.check} — must fail (check type not implemented)`);
    }
  } catch (error) {
    const safeMessage = (error.message || String(error)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
    findingOverride = configurationFinding(rule, `Rule '${rule.id}' could not evaluate its direct authority: ${safeMessage}`, safeMessage);
  }

  if (findingOverride) findings.push(findingOverride);
  else if (failure) {
    if (rule.id === 'rerun_count_valid') findings.push(rerunCountFinding(rule, failure));
    else if (rule.id === 'bundle_structure_valid') findings.push(structureFinding(rule, failure));
    else findings.push(makeDefinitionRuleFinding({
      rule,
      bundlePath,
      surface: failure.surface,
      expected: failure.expected,
      observed: failure.observed,
      missingFact: failure.missingFact,
      detail: `[${rule.id}] ${failure.detail}`,
      maskedByRuleId: failure.maskedByRuleId || null,
    }));
  }
}

if (findings.length > 0) {
  maskedRuleIds.add('style_projection_freshness');
} else if (!canonicalTopicRegistryFact) {
  maskedRuleIds.add('style_projection_freshness');
  findings.push(styleProjectionConfigurationFinding(
    'Rerun readiness completed without its existing canonical topic-state fact.',
  ));
} else {
  checksRun += 1;
  const selectedProfile = profile.value?.research_profile;
  try {
    const freshness = evaluateResearchStyleProjectionFreshness({
      selectedProfile,
      styleDefinition: readResearchStyleDefinition(selectedProfile),
      topicCount: canonicalTopicRegistryFact.topic_registry.length,
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
  const failureEvaluation = buildContractEvaluation({ findings: [...(error.findings || []), ...(failedRouting.findings || [])] });
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
