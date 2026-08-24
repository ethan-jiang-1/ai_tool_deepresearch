#!/usr/bin/env node
// check-gate-seed-topics-ready.mjs — evaluates gate-seed-topics-ready rules
// @impl GSK-001, GSK-002, GSK-004, GSK-008, STM-003, STM-007, PRG-007, FRE-003
// Usage: node check-gate-seed-topics-ready.mjs --bundle <path> --current-node <fileRef> [--transitions <path>]

import { existsSync, statSync, readFileSync, readdirSync } from 'node:fs';
import { join, basename, extname, resolve as resolveFsPath } from 'node:path';
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
} from '../../engine/helpers/gate-helpers.mjs';
import {
  buildContractEvaluation,
  makeContractFinding,
  makeDefinitionRuleFinding,
} from '../../engine/helpers/wave-contract-findings.mjs';
import { inspectCanonicalTopicState, inspectSeedTopicsAuthoringAuthorization } from '../../engine/helpers/canonical-topic-state.mjs';
import {
  evaluateSeedInitializationStructure,
  evaluateSeedTopicAuthoring,
} from '../../engine/helpers/seed-topic-authoring-evaluator.mjs';

const args = parseGateCliArgs();
if (args.error) { emitGateResult(args.error, { bundlePath: args.bundle }); }

const { definition, error: defError } = tryLoadGateDefinition('seed-topics-ready', args.currentNode || null);
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

let planCache = null;
function getPlan() {
  if (planCache) return planCache;
  planCache = readBundlePlan(bundlePath);
  return planCache;
}

let diskSeedsCache = null;
function getDiskSeeds() {
  if (diskSeedsCache) return diskSeedsCache;
  const directory = join(bundlePath, 'seed_topics');
  if (!existsSync(directory) || !statSync(directory).isDirectory()) {
    diskSeedsCache = [];
    return diskSeedsCache;
  }
  diskSeedsCache = readdirSync(directory)
    .filter((file) => extname(file) === '.md')
    .map((file) => {
      const filePath = join(directory, file);
      const relativePath = join('seed_topics', file);
      const filenameStem = basename(file, '.md');
      return { filenameStem, relativePath, absolutePath: filePath, raw: readFileSync(filePath, 'utf-8') };
    });
  return diskSeedsCache;
}

function registrySlugs() {
  const plan = getPlan();
  return Array.isArray(plan?.topic_registry) ? plan.topic_registry.map((topic) => topic.slug) : [];
}

function canonicalTopicForSeed(seed) {
  const plan = getPlan();
  return Array.isArray(plan?.topic_registry)
    ? plan.topic_registry.find((topic) => topic.slug === seed.filenameStem) || null
    : null;
}

function evaluateCanonicalSeed(seed) {
  const topic = canonicalTopicForSeed(seed);
  return topic ? evaluateSeedTopicAuthoring({ raw: seed.raw, relativePath: seed.relativePath, topic }) : null;
}

function slugSetFinding(rule, failure) {
  return makeContractFinding({
    id: failure.id || rule.id,
    ruleId: rule.id,
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: failure.userDecision ? 'recorded_human_decision' : 'binding_integrity',
    surface: failure.surface,
    expected: failure.expected,
    observed: failure.observed,
    missingFact: failure.missingFact,
    repairKind: failure.userDecision ? 'user_decision' : 'agent_action',
    writeTo: failure.userDecision ? 'phases/phase-hitl1.md' : failure.writeTo,
    repair: failure.userDecision
      ? 'The existing HITL1 owner must record the missing Topic decision; after canonical topic-state materialization, rerun this same Gate.'
      : 'Repair the named seed projection so it matches the canonical registry, then rerun this Gate.',
    detail: `[${rule.id}] ${failure.detail}`,
    maskedByRuleId: failure.maskedByRuleId || null,
  });
}

const topicState = inspectCanonicalTopicState({ bundlePath });
const seedAuthoringAuthorization = inspectSeedTopicsAuthoringAuthorization({ bundlePath });
let canonicalParentRuleId = null;
if (topicState.mode !== 'canonical' || topicState.passed !== true) {
  canonicalParentRuleId = 'canonical_topic_state_prerequisite';
  const blocker = topicState.blockers?.[0];
  const authoringEntry = getDiskSeeds()
    .map((seed) => ({ seed, topic: canonicalTopicForSeed(seed), evaluation: evaluateCanonicalSeed(seed) }))
    .find(({ evaluation }) => evaluation && !evaluation.passed);
  const authoring = authoringEntry?.evaluation;
  const writerFinding = seedAuthoringAuthorization.ok && authoring && ['canonical_binding_mismatch', 'frontmatter_invalid'].includes(authoring.reason_code)
    ? makeContractFinding({
      id: `canonical_topic_state:${authoring.reason_code}`,
      ruleId: canonicalParentRuleId,
      findingSource: 'checker',
      classification: 'blocking',
      blockingBasis: 'binding_integrity',
      surface: authoring.relative_path,
      expected: authoring.expected,
      observed: authoring.observed,
      missingFact: authoring.missing_fact,
      repairKind: authoring.reason_code === 'canonical_binding_mismatch' ? 'engine_operation' : 'agent_action',
      writeTo: authoring.reason_code === 'canonical_binding_mismatch'
        ? `node DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs apply --bundle ${resolveFsPath(bundlePath, '.')} --input <retained-enrich-seed-${authoringEntry.topic.topic_uid}.json>`
        : authoring.write_to,
      repair: authoring.reason_code === 'canonical_binding_mismatch'
        ? 'Submit the retained complete enrich_seed input through canonical topic-state, then rerun this same Gate.'
        : 'Repair only the reported frontmatter syntax coordinate, run canonical topic-state enrich_seed, then rerun this same Gate.',
      detail: `Canonical seed authoring failed: ${authoring.reason_code}`,
    })
    : null;
  findings.push(writerFinding || blocker?.finding || makeContractFinding({
    id: canonicalParentRuleId,
    ruleId: canonicalParentRuleId,
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
  canonicalParentRuleId = 'canonical_topic_state_prerequisite';
  findings.push(makeContractFinding({
    id: 'canonical_topic_state:empty_registry',
    ruleId: canonicalParentRuleId,
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: 'recorded_human_decision',
    surface: `${resolveFsPath(bundlePath, 'rb_plan.md')}#/topic_registry`,
    expected: 'At least one approved canonical Topic exists before seed materialization.',
    observed: { topic_count: 0 },
    missingFact: 'The canonical Topic registry is empty, so there is no semantic Topic intent to materialize.',
    repairKind: 'user_decision',
    writeTo: 'phases/phase-hitl1.md',
    repair: 'The existing HITL1 owner must record the missing Topic decision; apply it through topic-state, then rerun this same Gate.',
  }));
}

if (canonicalParentRuleId) {
  for (const rule of definition.rules) maskedRuleIds.add(rule.id);
}

let seedDirectoryRoot = null;

for (const rule of definition.rules) {
  if (rule.check === 'placeholder') continue;
  checksRun += 1;

  try {
    if (rule.check === 'dir_non_empty') {
      const targetPath = join(bundlePath, rule.target);
      const exists = existsSync(targetPath);
      const isDirectory = exists && statSync(targetPath).isDirectory();
      const extension = (rule.glob || '*.md').replace('*', '');
      const files = isDirectory ? readdirSync(targetPath).filter((file) => extname(file) === extension) : [];
      if (!isDirectory || files.length === 0) {
        seedDirectoryRoot = rule.id;
        findings.push(makeDefinitionRuleFinding({
          rule,
          bundlePath,
          surface: rule.target,
          expected: `Directory contains at least one ${rule.glob || '*.md'} file.`,
          observed: { exists, is_directory: isDirectory, matching_file_count: files.length },
          missingFact: `Seed directory '${rule.target}' is ${!isDirectory ? 'absent or not a directory' : 'empty'}.`,
          detail: `[${rule.id}] ${!isDirectory ? `Directory ${rule.target} does not exist` : `Directory ${rule.target} is empty`}`,
          maskedByRuleId: canonicalParentRuleId,
          maskedRuleIds: ['slug_consistency', 'per_file_title_non_empty', 'per_file_slug_stem_consistency'],
        }));
      }
    } else if (rule.check === 'cross_field' && rule.mode === 'slug_consistency') {
      const diskSeeds = getDiskSeeds();
      if (rule.scope === 'per_file') {
        for (const seed of diskSeeds) {
          const authoring = evaluateCanonicalSeed(seed);
          if (!authoring || authoring.passed || authoring.reason_code !== 'canonical_binding_mismatch' || authoring.write_to !== `${seed.relativePath}#/slug`) continue;
          findings.push(slugSetFinding(rule, {
            id: `${rule.id}:${seed.filenameStem}`,
            surface: `${seed.relativePath}; ${seed.relativePath}#/slug`,
            expected: { filename_stem: seed.filenameStem, frontmatter_slug: seed.filenameStem },
            observed: authoring.observed,
            missingFact: authoring.missing_fact,
            writeTo: `${seed.relativePath}#/slug`,
            detail: `${seed.relativePath}: canonical slug binding failed`,
            maskedByRuleId: canonicalParentRuleId || seedDirectoryRoot,
          }));
        }
      } else {
        const expectedSlugs = registrySlugs();
        const diskSlugs = diskSeeds.map((seed) => seed.filenameStem);
        if (expectedSlugs.length === 0) {
          findings.push(slugSetFinding(rule, {
            id: `${rule.id}:empty_registry`,
            surface: `${resolveFsPath(bundlePath, 'rb_plan.md')}#/topic_registry`,
            expected: 'At least one approved canonical Topic slug.',
            observed: { registry_slugs: [] },
            missingFact: 'The canonical Topic registry is empty, so seed slug materialization requires a HITL1 decision.',
            detail: 'topic_registry is empty; no Topic intent exists to materialize.',
            userDecision: true,
            maskedByRuleId: canonicalParentRuleId,
          }));
        } else {
          const diskSet = new Set(diskSlugs);
          const registrySet = new Set(expectedSlugs);
          const missing = expectedSlugs.filter((slug) => !diskSet.has(slug));
          const extra = diskSlugs.filter((slug) => !registrySet.has(slug));
          if (missing.length > 0 || extra.length > 0) {
            findings.push(slugSetFinding(rule, {
              surface: `${resolveFsPath(bundlePath, 'rb_plan.md')}#/topic_registry; ${resolveFsPath(bundlePath, 'seed_topics')}`,
              expected: { registry_slugs: expectedSlugs },
              observed: { disk_slugs: diskSlugs, missing, extra },
              missingFact: `Seed slug set differs from the canonical registry${missing.length ? `; missing: ${missing.join(', ')}` : ''}${extra.length ? `; extra: ${extra.join(', ')}` : ''}.`,
              writeTo: resolveFsPath(bundlePath, 'seed_topics'),
              detail: `Slug consistency failed${missing.length ? `; missing: ${missing.join(', ')}` : ''}${extra.length ? `; extra: ${extra.join(', ')}` : ''}`,
              maskedByRuleId: canonicalParentRuleId || seedDirectoryRoot,
            }));
          }
        }
      }
    } else if (rule.check === 'field_non_empty') {
      const diskSeeds = getDiskSeeds();
      if (diskSeeds.length === 0) {
        maskedRuleIds.add(rule.id);
        continue;
      }
      for (const seed of diskSeeds) {
        const authoring = evaluateCanonicalSeed(seed);
        if (!authoring || authoring.passed || authoring.reason_code !== 'canonical_binding_mismatch' || authoring.write_to !== `${seed.relativePath}#/title`) continue;
        findings.push(makeDefinitionRuleFinding({
          rule,
          bundlePath,
          slug: seed.filenameStem,
          surface: `seed_topics/<slug>.md#/title`,
          expected: 'Non-empty seed title.',
          observed: authoring.observed,
          missingFact: authoring.missing_fact,
          detail: `[${rule.id}] ${seed.relativePath} canonical title binding failed`,
          maskedByRuleId: canonicalParentRuleId || seedDirectoryRoot,
        }));
      }
    } else if (rule.check === 'seed_initialization_structure') {
      if (canonicalParentRuleId || seedDirectoryRoot) {
        maskedRuleIds.add(rule.id);
        continue;
      }
      for (const seed of getDiskSeeds()) {
        const structure = evaluateSeedInitializationStructure({ raw: seed.raw, relativePath: seed.relativePath });
        if (structure.passed) continue;
        findings.push(makeContractFinding({
          id: `${rule.id}:${seed.filenameStem}`,
          ruleId: rule.id,
          findingSource: 'checker',
          classification: 'blocking',
          blockingBasis: 'required_structure',
          surface: seed.relativePath,
          expected: structure.expected,
          observed: structure.observed,
          missingFact: structure.missing_fact,
          repairKind: 'agent_action',
          writeTo: `${seed.relativePath}#seed-initialization`,
          detail: `[${rule.id}] ${seed.relativePath}: ${structure.missing_fact}`,
          repair: 'Edit only the bounded seed-initialization region through the current seed materialization/enrichment loop: replace every template pending placeholder line with authored content or an explicitly rephrased gap stating the specific missing fact, preserve the Engine-owned appendix, then rerun this Gate.',
        }));
        break;
      }
    } else if (rule.check !== 'placeholder') {
      findings.push(configurationFinding(rule, `Unknown check type: ${rule.check} (mode: ${rule.mode || 'n/a'}) — must fail (check type not implemented)`));
    }
  } catch (error) {
    const safeMessage = (error.message || String(error)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
    findings.push(configurationFinding(rule, `Rule '${rule.id}' could not evaluate its direct authority: ${safeMessage}`, safeMessage));
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
