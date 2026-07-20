// @impl IOC-001, IOC-002, IOC-003, CHI-001, RWG-018

import { existsSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve as resolvePath } from 'node:path';
import { parse as parseYaml } from 'yaml';

import { ReferenceMetadataArraySchema } from '../../schema/index.mjs';
import { countReferences } from './ref-count.mjs';
import {
  checkCacheCoverage,
  checkReferenceFormatFiles,
  checkReferenceIndexCoverage,
  checkReferenceLedgerCoverage,
  checkReferenceSourceUrls,
  parseMarkdownSemanticSections,
} from './gate-helpers-checks.mjs';
import {
  checkDelegatedBypassSuspected,
  checkSubmittedDeclarationRecovery,
  checkWorkUnitLedgerExists,
  checkWorkUnitOutputCoverage,
  checkWorkUnitSubmissionPresence,
  scanDelegatedBypassSuspicion,
} from './gate-helpers-provenance.mjs';
import {
  listMatchingBundleFiles,
  readBundlePlan,
  readBundleProfile,
  resolveThreshold,
  stripMdFrontmatter,
} from './gate-helpers-readers.mjs';
import { readYamlArraySafe } from './gate-helpers-serial.mjs';
import {
  checkWave1DepthReviewContract,
  checkWave2FindingIndexContract,
  topicSlugFromDepthReviewTarget,
} from './wave-depth-contracts.mjs';
import { checkPhaseQueueDrained } from './phase-queue-drain.mjs';
import { evaluateRerunDirection } from './rerun-direction.mjs';
import {
  buildContractEvaluation,
  makeContractFinding,
  makeDefinitionRuleFinding,
} from './wave-contract-findings.mjs';

function safeMessage(error) {
  return (error?.message || String(error)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
}

function scopedRuleId(ruleId, topic) {
  return topic ? `${ruleId}:${topic}` : ruleId;
}

function failureFinding(bundlePath, rule, {
  topic = null,
  surface = null,
  detail,
  expected = null,
  observed = null,
  missingFact = null,
  repair = null,
  id = null,
  blockingBasis = null,
  repairKind = null,
  writeTo = null,
} = {}) {
  if (rule?.finding?.source === 'definition') {
    return makeDefinitionRuleFinding({
      rule,
      bundlePath,
      topic,
      surface: surface || rule.target || null,
      expected,
      observed,
      missingFact,
      detail,
      repair,
    });
  }
  return makeContractFinding({
    id: id || scopedRuleId(rule.id, topic),
    ruleId: rule.id,
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis,
    surface: surface || rule.target || null,
    expected,
    observed,
    missingFact,
    repairKind,
    writeTo,
    repair,
    detail,
  });
}

function configurationFinding(bundlePath, rule, detail, observed = null) {
  return failureFinding(bundlePath, rule, {
    surface: `Gate checker dispatch for ${rule.id}`,
    expected: `Implemented deterministic checker '${rule.check}'.`,
    observed: observed ?? rule.check,
    missingFact: detail,
    detail: `[${rule.id}] ${detail}`,
    blockingBasis: 'configuration_integrity',
    repairKind: 'missing_contract',
    writeTo: `Gate checker implementation boundary for ${rule.id}`,
    repair: 'Repair the Gate checker contract before rerunning this checkpoint.',
  });
}

function topicRegistryPrerequisiteFinding(bundlePath, wave, detail, observed = null) {
  const ruleId = `${wave}_topic_registry_prerequisite`;
  return makeContractFinding({
    id: ruleId,
    ruleId,
    findingSource: 'checker',
    classification: 'blocking',
    blockingBasis: 'authority_integrity',
    surface: resolvePath(bundlePath, 'rb_plan.md'),
    expected: 'A readable canonical topic_registry with at least one registered Topic.',
    observed,
    missingFact: detail,
    repairKind: 'engine_operation',
    writeTo: `node DPT_FRAMEWORK/cli/operate-topic-state.mjs inspect --bundle ${resolvePath(bundlePath)}`,
    repair: 'Inspect and repair canonical topic state through operate-topic-state, then rerun this checkpoint.',
    detail: `[${ruleId}] ${detail}`,
  });
}

function localCheckerFinding(bundlePath, rule, {
  topic = null,
  suffix,
  blockingBasis,
  surface,
  expected,
  observed,
  missingFact,
  repairKind = 'agent_action',
  writeTo = null,
  repair,
  detail,
}) {
  const resolvedSurface = surface && !String(surface).startsWith('/') ? resolvePath(bundlePath, surface) : surface;
  return failureFinding(bundlePath, rule, {
    topic,
    id: `${rule.id}${topic ? `:${topic}` : ''}:${suffix}`,
    surface: resolvedSurface,
    expected,
    observed,
    missingFact,
    blockingBasis,
    repairKind,
    writeTo: writeTo || resolvedSurface,
    repair,
    detail,
  });
}

function advisoryFinding(rule, detail, index = 0) {
  return makeContractFinding({
    id: `${rule.id}:advisory:${index + 1}`,
    ruleId: rule.id,
    classification: 'advisory',
    surface: rule.target || null,
    detail,
  });
}

function topicLayouts(bundlePath) {
  const plan = readBundlePlan(bundlePath);
  return Array.isArray(plan?.topic_registry) ? plan.topic_registry.map((topic) => ({
    topic: topic.slug,
    accepted: [topic.slug, ...(topic.previous_layouts || []).map((layout) => layout.slug)],
  })) : [];
}

function topicSlugs(bundlePath) {
  return topicLayouts(bundlePath).map((layout) => layout.topic);
}

function expandRuleTargets(bundlePath, rule, layouts = null) {
  if (!String(rule.target || '').includes('{topic}')) return [{ topic: null, resolved: rule.target }];
  return (layouts || topicLayouts(bundlePath)).map((layout) => {
    const currentOnly = String(rule.target).startsWith('seed_topics/');
    const alternatives = (currentOnly ? [layout.topic] : layout.accepted).map((slug) => rule.target.replace(/\{topic\}/g, slug));
    return { topic: layout.topic, resolved: alternatives[0], alternatives };
  });
}

function firstExistingTarget(bundlePath, target, { directory = false } = {}) {
  return (target.alternatives || [target.resolved]).find((candidate) => {
    const absolute = join(bundlePath, candidate);
    return existsSync(absolute) && (!directory || statSync(absolute).isDirectory());
  }) || target.resolved;
}

function matchingAlternativeFiles(bundlePath, target) {
  const byPath = new Map();
  for (const candidate of target.alternatives || [target.resolved]) {
    for (const file of listMatchingBundleFiles(bundlePath, candidate)) byPath.set(file.relPath, file);
  }
  return [...byPath.values()];
}

function globRegex(pattern) {
  return new RegExp(`^${basename(pattern).replace(/\./g, '\\.').replace(/\*/g, '[^/]*')}$`);
}

function readStatus(bundlePath) {
  const path = join(bundlePath, 'rb_status.json');
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
}

function readJsonPath(value, path) {
  return String(path || '').split('/').filter(Boolean).reduce((current, key) => current?.[key], value);
}

function evaluatePattern(bundlePath, rule, resolvedTarget, topic, { stripFrontmatter = false } = {}) {
  const files = resolvedTarget.includes('*')
    ? listMatchingBundleFiles(bundlePath, resolvedTarget)
    : [{ relPath: resolvedTarget, absPath: join(bundlePath, resolvedTarget) }];
  if (files.length === 0) {
    return rule.negate
      ? { passed: true }
      : { passed: false, detail: `No files matching glob ${resolvedTarget} for pattern_match${topic ? ` (topic: ${topic})` : ''}` };
  }

  const regex = new RegExp(rule.pattern, 'i');
  let anyMatched = false;
  for (const file of files) {
    if (!existsSync(file.absPath)) {
      return { passed: false, detail: `Cannot read file for pattern_match: ${file.relPath}${topic ? ` (topic: ${topic})` : ''}` };
    }
    const raw = readFileSync(file.absPath, 'utf8');
    const content = stripFrontmatter ? stripMdFrontmatter(raw) : raw;
    const matched = regex.test(content);
    anyMatched = anyMatched || matched;
    if (rule.negate && matched) {
      return { passed: false, detail: `Forbidden content in ${file.relPath}: ${(rule.failure_message || rule.pattern).replace(/\{topic\}/g, topic || '{topic}')}${topic ? ` (topic: ${topic})` : ''}` };
    }
  }
  if (!rule.negate && !anyMatched) {
    const label = files.length > 1 ? `any file matching ${resolvedTarget}` : resolvedTarget;
    return { passed: false, detail: `Required marker not found in ${label}: ${(rule.failure_message || rule.pattern).replace(/\{topic\}/g, topic || '{topic}')}${topic ? ` (topic: ${topic})` : ''}` };
  }
  return { passed: true };
}

function evaluateCountFloor(bundlePath, rule, resolvedTarget, topic, alternatives = [resolvedTarget]) {
  const threshold = resolveThreshold(rule, readBundleProfile(bundlePath));
  if (resolvedTarget.includes('*') && resolvedTarget.startsWith('reference/')) {
    const result = countReferences(bundlePath, { source: 'ledger', targetGlobs: alternatives, topic: undefined });
    if (result.count >= threshold) return { passed: true };
    const uncountable = result.uncountable.length > 0
      ? ` [${result.uncountable.length} uncountable: ${result.uncountable.map((item) => item.reason).join('; ')}]`
      : '';
    return { passed: false, detail: `Count floor not met for ${resolvedTarget}: ${result.count} countable references (threshold: ${threshold})${uncountable}${topic ? ` (topic: ${topic})` : ''}` };
  }
  if (resolvedTarget.includes('*')) {
    const files = listMatchingBundleFiles(bundlePath, resolvedTarget);
    if (files.length >= threshold) return { passed: true };
    return { passed: false, detail: `Count floor not met for ${resolvedTarget}: ${files.length} files (threshold: ${threshold})${topic ? ` (topic: ${topic})` : ''}` };
  }

  const yaml = readYamlArraySafe(join(bundlePath, resolvedTarget));
  const count = yaml.ok && Array.isArray(yaml.data) ? yaml.data.length : 0;
  if (count >= threshold) return { passed: true, yaml };
  return { passed: false, detail: `Count floor not met for ${resolvedTarget}: ${count} entries (threshold: ${threshold})${topic ? ` (topic: ${topic})` : ''}`, yaml };
}

function checkQuestionListSections(content) {
  const sections = parseMarkdownSemanticSections(content);
  const required = [
    'topic investigation targets',
    'question reconciliation',
    'emergent question protocol',
    'exploration / exploitation decision',
  ];
  const missing = required.filter((section) => !(sections.get(section) || '').trim());
  return missing.length === 0
    ? { passed: true }
    : { passed: false, detail: `Missing or empty semantic question-list section(s): ${missing.join(', ')}` };
}

function checkSourceUrlMarker(content) {
  const candidates = String(content || '').match(/https?:\/\/[^\s<>\]"']+/gi) || [];
  const hasParseableUrl = candidates.some((candidate) => {
    const value = candidate.replace(/[),.;:!?]+$/, '');
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  });
  return hasParseableUrl
    ? { passed: true }
    : { passed: false, detail: 'No parseable http(s) source URL found in evidence-summary.md' };
}

function checkKeyFindingsContent(content) {
  const section = parseMarkdownSemanticSections(content).get('key findings') || '';
  return section.split(/\r?\n/).some((line) => line.trim() && !/^<!--/.test(line.trim()))
    ? { passed: true }
    : { passed: false, detail: 'Key Findings section is missing or empty' };
}

function checkLedgerSections(content) {
  const sections = parseMarkdownSemanticSections(content);
  const required = [
    'cross-topic scan matrix',
    'wave1 legacy questions',
    'cross-topic resolutions',
    'emergent cross-topic questions',
    'exploration decisions',
    'hitl2 handoff',
  ];
  const missing = required.filter((section) => !(sections.get(section) || '').trim());
  return missing.length === 0
    ? { passed: true }
    : { passed: false, detail: `cross-topic-ledger.md missing or empty semantic section(s): ${missing.join(', ')}` };
}

function readProfileRerunCount(bundlePath) {
  try {
    const profile = readBundleProfile(bundlePath);
    return profile?.human_decision_checkpoints?.hitl2?.rerun_count ?? 0;
  } catch { return 0; }
}

function checkRerunAddFullSynthesis(bundlePath, pairFacts) {
  const topics = topicSlugs(bundlePath);
  const profileRerunCount = readProfileRerunCount(bundlePath);
  const addTopics = topics.filter((topic) => {
    const seedPath = join(bundlePath, 'seed_topics', `${topic}.md`);
    if (!existsSync(seedPath)) return false;
    const content = readFileSync(seedPath, 'utf8');
    const direction = evaluateRerunDirection(content, profileRerunCount);
    if (direction.state !== 'matching' && !(direction.state === 'legacy_unbound' && direction.has_direction)) return false;
    return direction.fields.action === 'add';
  });
  if (addTopics.length === 0) return { passed: true, active: false };

  const synthesisPath = join(bundlePath, 'artifacts/wave2/synthesis.md');
  const synthesis = existsSync(synthesisPath) ? readFileSync(synthesisPath, 'utf8') : '';
  const deltaIssue = /^##\s+Delta Synthesis\b/m.test(synthesis)
    ? `Rerun action:add topic(s) ${addTopics.join(', ')} cannot use Delta Synthesis mode`
    : null;
  const pairMasked = !pairFacts?.usable;
  const pairIssue = !pairMasked && !pairFacts.complete
    ? `Rerun action:add structured pair coverage is incomplete; missing pair(s): ${pairFacts.missing_pairs.map((pair) => pair.join(' / ')).join(', ')}`
    : null;
  return {
    passed: !deltaIssue && !pairIssue,
    active: true,
    pair_masked: pairMasked,
    delta_issue: deltaIssue,
    pair_issue: pairIssue,
    detail: [deltaIssue, pairIssue].filter(Boolean).join('; '),
  };
}

function declarationGapContext(bundlePath, definition) {
  const parentRule = definition.rules.find((rule) => rule.check === 'work_unit_submission_presence');
  if (!parentRule) return null;
  const check = checkSubmittedDeclarationRecovery(bundlePath, parentRule);
  return check.passed ? null : { parentRule, check };
}

function ruleDependsOnSubmittedDeclaration(rule, parentRule) {
  if (rule.id === parentRule.id) return true;
  if (['cache_coverage', 'work_unit_ledger_exists', 'work_unit_output_coverage', 'delegated_bypass_suspected', 'depth_review_contract', 'reference_ledger_coverage'].includes(rule.check)) return true;
  return rule.check === 'count_floor' && String(rule.target || '').startsWith('reference/');
}

function maskDeclarationDependentRules(definition, parentRule) {
  return definition.rules
    .filter((rule) => rule.id !== parentRule.id && ruleDependsOnSubmittedDeclaration(rule, parentRule))
    .map((rule) => rule.id);
}

function checkMarkdownLinkResolution(bundlePath, rule, resolvedTarget) {
  const filePath = join(bundlePath, resolvedTarget);
  if (!existsSync(filePath)) return { passed: false, detail: `Synthesis file not found: ${resolvedTarget}` };
  const links = [...readFileSync(filePath, 'utf8').matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)]
    .map((match) => match[2])
    .filter((path) => path.endsWith('.md'));
  if (links.length === 0) return { passed: false, detail: `No Markdown links to .md artifacts found in ${resolvedTarget}` };
  const baseDir = join(bundlePath, rule.resolve_relative_to || 'artifacts/wave2');
  const valid = links.filter((path) => existsSync(resolvePath(baseDir, path)));
  const dead = links.filter((path) => !existsSync(resolvePath(baseDir, path)));
  const minimum = rule.min_valid_refs || 1;
  if (valid.length < minimum) return { passed: false, detail: `Only ${valid.length} valid artifact reference(s) found (need ≥${minimum}). Dead links: ${dead.join(', ')}` };
  return { passed: true, advisory: dead.length > 0 ? `Note: ${dead.length} dead link(s) found but ${valid.length} valid — gate passes. Dead links: ${dead.join(', ')}` : null };
}

function evaluateStatusRule(bundlePath, rule) {
  const [file, path] = String(rule.target || '').split('#/');
  if (file !== 'rb_status.json') return { passed: false, detail: `Unsupported status target: ${rule.target}` };
  const status = readStatus(bundlePath);
  if (!status) return { passed: false, detail: 'rb_status.json not found' };
  const value = readJsonPath(status, path);
  if (rule.check === 'status_value' && value !== rule.expected) return { passed: false, detail: `${rule.target}: expected "${rule.expected}", got "${value}"` };
  if (rule.check === 'field_value' && rule.operator === 'equal' && value !== rule.value) return { passed: false, detail: `${rule.target}: expected "${rule.value}", got "${value}"` };
  if (rule.check === 'field_non_empty' && (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0))) return { passed: false, detail: `${rule.target} is empty or missing` };
  return { passed: true };
}

export function evaluateWave0Contract(bundlePath, definition, { topicRegistryFact = null } = {}) {
  const findings = [];
  const maskedRuleIds = [];
  const sourceStates = new Map();
  const sourceData = new Map();
  let layouts;
  try {
    layouts = topicRegistryFact?.wave_layouts || topicLayouts(bundlePath);
  } catch (error) {
    return buildContractEvaluation({
      findings: [topicRegistryPrerequisiteFinding(bundlePath, 'wave0', `Wave0 cannot read canonical topic_registry: ${safeMessage(error)}`, safeMessage(error))],
    });
  }
  if (layouts.length === 0) {
    return buildContractEvaluation({
      findings: [topicRegistryPrerequisiteFinding(bundlePath, 'wave0', 'Wave0 cannot expand per-topic contracts because canonical topic_registry is empty.', { topic_count: 0 })],
    });
  }
  const declarationGap = declarationGapContext(bundlePath, definition);
  if (declarationGap) {
    findings.push(...declarationGap.check.findings);
    maskedRuleIds.push(...maskDeclarationDependentRules(definition, declarationGap.parentRule));
  }
  const bypassSuspicion = declarationGap
    ? { suspected: false, phase: 'wave0', artifactsFound: [], provenanceMissing: [] }
    : scanDelegatedBypassSuspicion(bundlePath, 'wave0');
  let checksRun = 0;

  for (const rule of definition.rules) {
    if (rule.check === 'placeholder' || rule.check === 'trace_event_present') continue;
    if (declarationGap && ruleDependsOnSubmittedDeclaration(rule, declarationGap.parentRule)) continue;
    const targets = expandRuleTargets(bundlePath, rule, layouts);

    for (const expandedTarget of targets) {
      const target = { ...expandedTarget, resolved: ['file_exists', 'schema_valid', 'count_floor', 'pattern_match'].includes(rule.check) ? firstExistingTarget(bundlePath, expandedTarget) : expandedTarget.resolved };
      const id = scopedRuleId(rule.id, target.topic);
      if (rule.id === 'per_topic_reference_schema_valid' && sourceStates.get(target.topic) === 'missing') {
        maskedRuleIds.push(id);
        continue;
      }
      if (rule.id === 'per_topic_count_floor' && sourceStates.has(target.topic) && sourceStates.get(target.topic) !== 'valid') {
        maskedRuleIds.push(id);
        continue;
      }
      checksRun += 1;
      let result = { passed: true };
      try {
        if (rule.check === 'file_exists') {
          result.passed = existsSync(join(bundlePath, target.resolved));
          if (!result.passed) result.detail = `Missing file: ${target.resolved}${target.topic ? ` (topic: ${target.topic})` : ''}`;
          if (rule.id === 'per_topic_source_yaml_exists') sourceStates.set(target.topic, result.passed ? 'present' : 'missing');
        } else if (rule.check === 'dir_exists') {
          const path = join(bundlePath, target.resolved);
          result.passed = existsSync(path) && statSync(path).isDirectory();
          if (!result.passed) result.detail = `Missing directory: ${target.resolved}`;
        } else if (rule.check === 'schema_valid') {
          const yaml = readYamlArraySafe(join(bundlePath, target.resolved));
          if (!yaml.ok || !Array.isArray(yaml.data)) {
            const keys = yaml.data && typeof yaml.data === 'object' ? Object.keys(yaml.data) : [];
            const detail = yaml.ok
              ? `source.yaml must be a top-level YAML array at ${target.resolved}.${keys.length > 0 ? ` Found object keys: ${keys.join(', ')}` : ''}`
              : `[parse_error] ${yaml.error}`;
            result = {
              passed: false,
              detail,
              findings: [localCheckerFinding(bundlePath, rule, {
                topic: target.topic,
                suffix: 'yaml_array',
                blockingBasis: yaml.ok ? 'required_structure' : 'authority_integrity',
                surface: target.resolved,
                expected: 'A top-level YAML array accepted by ReferenceMetadataArraySchema.',
                observed: yaml.ok ? { type: Array.isArray(yaml.data) ? 'array' : typeof yaml.data, object_keys: keys } : yaml.error,
                missingFact: yaml.ok
                  ? `${target.resolved} must be a top-level YAML array, but the observed value is not an array.`
                  : `${target.resolved} cannot be parsed as YAML: ${yaml.error}`,
                repair: `Repair ${target.resolved} as a top-level YAML array with the required source fields.`,
                detail,
              })],
            };
            sourceStates.set(target.topic, 'invalid');
          } else {
            const parsed = ReferenceMetadataArraySchema.safeParse(yaml.data);
            if (!parsed.success) {
              const issues = parsed.error.issues.map((issue) => `[${issue.path.join('.') || '<root>'}] ${issue.message}`);
              const detail = `Schema validation failed for ${target.resolved}: ${issues.join('; ')}`;
              result = {
                passed: false,
                detail,
                findings: issues.map((issue, index) => localCheckerFinding(bundlePath, rule, {
                  topic: target.topic,
                  suffix: `schema:${index + 1}`,
                  blockingBasis: 'authority_integrity',
                  surface: target.resolved,
                  expected: 'ReferenceMetadataArraySchema accepts every source entry.',
                  observed: issue,
                  missingFact: `${target.resolved} violates ReferenceMetadataArraySchema: ${issue}`,
                  repair: `Repair the named source entry field in ${target.resolved}.`,
                  detail: `Schema validation failed for ${target.resolved}: ${issue}`,
                })),
              };
              sourceStates.set(target.topic, 'invalid');
            } else {
              sourceStates.set(target.topic, 'valid');
              sourceData.set(target.topic, yaml.data);
            }
          }
        } else if (rule.check === 'count_floor' && rule.id === 'per_topic_count_floor' && sourceData.has(target.topic)) {
          const threshold = resolveThreshold(rule, readBundleProfile(bundlePath));
          const count = sourceData.get(target.topic).length;
          result = count >= threshold ? { passed: true } : { passed: false, detail: `Count floor not met for ${target.resolved}: ${count} entries (threshold: ${threshold}) (topic: ${target.topic})` };
        } else if (rule.check === 'count_floor') {
          result = evaluateCountFloor(bundlePath, rule, target.resolved, target.topic, target.alternatives);
        } else if (rule.check === 'pattern_match') {
          result = evaluatePattern(bundlePath, rule, target.resolved, target.topic);
        } else if (rule.check === 'status_value') {
          result = evaluateStatusRule(bundlePath, rule);
        } else if (rule.check === 'phase_queue_drained') {
          const check = checkPhaseQueueDrained(bundlePath, { phase: 'wave0' });
          result = { passed: check.passed, detail: check.inspect.join('; '), repair: check.advice.join(' '), findings: check.findings };
        } else if (rule.check === 'cache_coverage') {
          const check = checkCacheCoverage(bundlePath, { rule });
          result = { passed: check.passed, detail: check.inspect.join('; '), repair: check.advice.join(' '), findings: check.findings || [] };
        } else if (rule.check === 'work_unit_ledger_exists') {
          const check = checkWorkUnitLedgerExists(bundlePath, rule);
          result = { passed: check.passed, detail: check.inspect.join('; '), repair: check.advice.join(' '), findings: check.findings || [] };
        } else if (rule.check === 'work_unit_output_coverage') {
          const check = checkWorkUnitOutputCoverage(bundlePath, rule);
          result = { passed: check.passed, detail: check.inspect.join('; '), repair: check.advice.join(' '), findings: check.findings || [] };
        } else if (rule.check === 'work_unit_submission_presence') {
          const check = checkWorkUnitSubmissionPresence(bundlePath, rule);
          result = { passed: check.passed, detail: check.inspect.join('; '), repair: check.advice.join(' '), findings: check.findings || [] };
        } else if (rule.check === 'delegated_bypass_suspected') {
          const check = checkDelegatedBypassSuspected(bundlePath, rule);
          result = { passed: check.passed, detail: check.inspect.join('; '), repair: check.advice.join(' '), findings: check.findings || [] };
        } else {
          result = { passed: false, findings: [configurationFinding(bundlePath, rule, `Unknown check type: ${rule.check} — must fail (check type not implemented)`)] };
        }
      } catch (error) {
        result = { passed: false, findings: [configurationFinding(bundlePath, rule, `Error evaluating rule ${rule.id} (${target.resolved}): ${safeMessage(error)}`, safeMessage(error))] };
      }
      if (Array.isArray(result.findings)) findings.push(...result.findings);
      if (!result.passed && (!Array.isArray(result.findings) || result.findings.length === 0)) {
        findings.push(failureFinding(bundlePath, rule, {
          topic: target.topic,
          surface: target.resolved,
          detail: result.detail,
          expected: result.expected,
          observed: result.observed,
          missingFact: result.missingFact || result.detail,
          repair: result.repair,
        }));
      }
    }
  }

  return buildContractEvaluation({ checksRun, findings, maskedRuleIds, bypassSuspicion });
}

export function evaluateWave1Contract(bundlePath, definition, { topicRegistryFact = null } = {}) {
  const findings = [];
  const maskedRuleIds = [];
  const missingFiles = new Set();
  let layouts;
  try {
    layouts = topicRegistryFact?.wave_layouts || topicLayouts(bundlePath);
  } catch (error) {
    return buildContractEvaluation({
      findings: [topicRegistryPrerequisiteFinding(bundlePath, 'wave1', `Wave1 cannot read canonical topic_registry: ${safeMessage(error)}`, safeMessage(error))],
    });
  }
  if (layouts.length === 0) {
    return buildContractEvaluation({
      findings: [topicRegistryPrerequisiteFinding(bundlePath, 'wave1', 'Wave1 cannot expand per-topic contracts because canonical topic_registry is empty.', { topic_count: 0 })],
    });
  }
  const declarationGap = declarationGapContext(bundlePath, definition);
  if (declarationGap) {
    findings.push(...declarationGap.check.findings);
    maskedRuleIds.push(...maskDeclarationDependentRules(definition, declarationGap.parentRule));
  }
  const bypassSuspicion = declarationGap
    ? { suspected: false, phase: 'wave1', artifactsFound: [], provenanceMissing: [] }
    : scanDelegatedBypassSuspicion(bundlePath, 'wave1');
  let checksRun = 0;

  for (const rule of definition.rules) {
    if (rule.check === 'placeholder' || rule.check === 'trace_event_present') continue;
    if (declarationGap && ruleDependsOnSubmittedDeclaration(rule, declarationGap.parentRule)) continue;
    const targets = expandRuleTargets(bundlePath, rule, layouts);

    for (const expandedTarget of targets) {
      const target = { ...expandedTarget, resolved: ['file_exists', 'dir_exists', 'depth_review_contract', 'count_floor', 'pattern_match'].includes(rule.check) ? firstExistingTarget(bundlePath, expandedTarget, { directory: rule.check === 'dir_exists' }) : expandedTarget.resolved };
      const id = scopedRuleId(rule.id, target.topic);
      if (rule.check === 'pattern_match' && missingFiles.has(target.resolved)) {
        maskedRuleIds.push(id);
        continue;
      }
      checksRun += 1;
      let result = { passed: true };
      try {
        if (rule.check === 'file_exists') {
          result.passed = existsSync(join(bundlePath, target.resolved));
          if (!result.passed) {
            missingFiles.add(target.resolved);
            result.detail = `Missing file: ${target.resolved}${target.topic ? ` (topic: ${target.topic})` : ''}`;
          }
        } else if (rule.check === 'dir_exists') {
          const path = join(bundlePath, target.resolved);
          result.passed = existsSync(path) && statSync(path).isDirectory();
          if (!result.passed) result.detail = `Missing directory: ${target.resolved}`;
        } else if (['field_value', 'field_non_empty', 'status_value'].includes(rule.check)) {
          result = evaluateStatusRule(bundlePath, rule);
        } else if (rule.check === 'pattern_match') {
          if (['question_list_has_four_sections', 'source_url_present', 'key_findings_non_empty'].includes(rule.id)) {
            const content = readFileSync(join(bundlePath, target.resolved), 'utf8');
            if (rule.id === 'question_list_has_four_sections') result = checkQuestionListSections(content);
            else if (rule.id === 'source_url_present') result = checkSourceUrlMarker(content);
            else result = checkKeyFindingsContent(content);
            if (!result.passed) {
              result.findings = [localCheckerFinding(bundlePath, rule, {
                topic: target.topic,
                suffix: 'semantic_structure',
                blockingBasis: 'required_structure',
                surface: target.resolved,
                expected: rule.id === 'question_list_has_four_sections'
                  ? 'All four required question-list semantic sections are present and non-empty.'
                  : rule.id === 'source_url_present'
                    ? 'evidence-summary.md contains at least one parseable http(s) source URL.'
                    : 'The Key Findings semantic section is present and non-empty.',
                observed: result.detail,
                missingFact: result.detail,
                repair: `Repair the named semantic content in ${target.resolved}.`,
                detail: result.detail,
              })];
            }
          } else {
            result = evaluatePattern(bundlePath, rule, target.resolved, target.topic);
          }
        } else if (rule.check === 'count_floor') {
          result = evaluateCountFloor(bundlePath, rule, target.resolved, target.topic, target.alternatives);
        } else if (rule.check === 'phase_queue_drained') {
          const check = checkPhaseQueueDrained(bundlePath, { phase: 'wave1' });
          result = { passed: check.passed, detail: check.inspect.join('; '), repair: check.advice.join(' '), findings: check.findings };
        } else if (rule.check === 'cache_coverage') {
          const check = checkCacheCoverage(bundlePath, { rule });
          result = { passed: check.passed, detail: check.inspect.join('; '), repair: check.advice.join(' '), findings: check.findings || [] };
        } else if (rule.check === 'reference_format') {
          const check = checkReferenceFormatFiles(matchingAlternativeFiles(bundlePath, target), { rule, bundlePath });
          result = { passed: check.passed, detail: check.inspect.join('; '), findings: check.findings || [] };
        } else if (rule.check === 'reference_source_url_parseable') {
          const check = checkReferenceSourceUrls(matchingAlternativeFiles(bundlePath, target), { rule });
          result = { passed: check.passed, detail: check.inspect.join('; '), findings: check.findings || [] };
        } else if (rule.check === 'reference_ledger_coverage') {
          const check = checkReferenceLedgerCoverage(bundlePath, matchingAlternativeFiles(bundlePath, target), { rule });
          result = { passed: check.passed, detail: check.inspect.join('; '), findings: check.findings || [] };
        } else if (rule.check === 'reference_index_coverage') {
          const check = checkReferenceIndexCoverage(bundlePath, matchingAlternativeFiles(bundlePath, target), { sourceLayer: rule.source_layer || null, rule });
          result = { passed: check.passed, detail: check.inspect.join('; '), repair: check.advice.join(' '), findings: check.findings || [] };
        } else if (rule.check === 'depth_review_contract') {
          const topic = topicSlugFromDepthReviewTarget(target.resolved) || target.topic || rule.topic;
          const check = checkWave1DepthReviewContract(bundlePath, { topic, rule });
          maskedRuleIds.push(...(check.masked_rule_ids || []).map((masked) => scopedRuleId(rule.id, `${topic}:${masked}`)));
          result = { passed: check.passed, detail: check.inspect.join('; '), repair: check.advice.join(' '), findings: check.findings || [] };
          (check.diagnostics || []).forEach((line, index) => findings.push(advisoryFinding(rule, line, index)));
        } else if (rule.check === 'work_unit_ledger_exists') {
          const check = checkWorkUnitLedgerExists(bundlePath, rule);
          result = { passed: check.passed, detail: check.inspect.join('; '), repair: check.advice.join(' '), findings: check.findings || [] };
        } else if (rule.check === 'work_unit_output_coverage') {
          const check = checkWorkUnitOutputCoverage(bundlePath, rule);
          result = { passed: check.passed, detail: check.inspect.join('; '), repair: check.advice.join(' '), findings: check.findings || [] };
        } else if (rule.check === 'work_unit_submission_presence') {
          const check = checkWorkUnitSubmissionPresence(bundlePath, rule);
          result = { passed: check.passed, detail: check.inspect.join('; '), repair: check.advice.join(' '), findings: check.findings || [] };
        } else if (rule.check === 'delegated_bypass_suspected') {
          const check = checkDelegatedBypassSuspected(bundlePath, rule);
          result = { passed: check.passed, detail: check.inspect.join('; '), repair: check.advice.join(' '), findings: check.findings || [] };
        } else {
          result = { passed: false, findings: [configurationFinding(bundlePath, rule, `Unknown check type: ${rule.check} — must fail (check type not implemented)`)] };
        }
      } catch (error) {
        result = { passed: false, findings: [configurationFinding(bundlePath, rule, `Error evaluating rule ${rule.id} (${target.resolved}): ${safeMessage(error)}`, safeMessage(error))] };
      }
      if (Array.isArray(result.findings)) findings.push(...result.findings);
      if (!result.passed && (!Array.isArray(result.findings) || result.findings.length === 0)) {
        findings.push(failureFinding(bundlePath, rule, {
          topic: target.topic,
          surface: target.resolved,
          detail: result.detail,
          expected: result.expected,
          observed: result.observed,
          missingFact: result.missingFact || result.detail,
          repair: result.repair,
        }));
      }
    }
  }

  return buildContractEvaluation({ checksRun, findings, maskedRuleIds, bypassSuspicion });
}

export function evaluateWave2Contract(bundlePath, definition, { topicRegistryFact = null, findingIndexFact = null } = {}) {
  const findings = [];
  const maskedRuleIds = [];
  const missingFiles = new Set();
  const invalidYaml = new Set();
  let layouts;
  try {
    layouts = topicRegistryFact?.wave_layouts || topicLayouts(bundlePath);
  } catch (error) {
    return buildContractEvaluation({
      findings: [topicRegistryPrerequisiteFinding(bundlePath, 'wave2', `Wave2 cannot read canonical topic_registry: ${safeMessage(error)}`, safeMessage(error))],
    });
  }
  if (layouts.length === 0) {
    return buildContractEvaluation({
      findings: [topicRegistryPrerequisiteFinding(bundlePath, 'wave2', 'Wave2 cannot expand per-topic contracts because canonical topic_registry is empty.', { topic_count: 0 })],
    });
  }
  const declarationGap = declarationGapContext(bundlePath, definition);
  if (declarationGap) {
    findings.push(...declarationGap.check.findings);
    maskedRuleIds.push(...maskDeclarationDependentRules(definition, declarationGap.parentRule));
  }
  const bypassSuspicion = declarationGap
    ? { suspected: false, phase: 'wave2', artifactsFound: [], provenanceMissing: [] }
    : scanDelegatedBypassSuspicion(bundlePath, 'wave2');
  let checksRun = 0;
  let findingIndexCheck = null;
  const getFindingIndexCheck = (rule) => {
    if (!findingIndexCheck) findingIndexCheck = checkWave2FindingIndexContract(bundlePath, { rule, loadedFact: findingIndexFact });
    return findingIndexCheck;
  };

  for (const rule of definition.rules) {
    if (rule.check === 'placeholder' || rule.check === 'trace_event_present') continue;
    if (declarationGap && ruleDependsOnSubmittedDeclaration(rule, declarationGap.parentRule)) continue;
    const targets = expandRuleTargets(bundlePath, rule, layouts);

    for (const target of targets) {
      const id = scopedRuleId(rule.id, target.topic);
      if (rule.id === 'index_yaml_parse' && missingFiles.has(target.resolved)) {
        maskedRuleIds.push(id);
        continue;
      }
      if (rule.id === 'finding_index_contract' && (missingFiles.has(target.resolved) || invalidYaml.has(target.resolved))) {
        maskedRuleIds.push(id);
        continue;
      }
      if (['synthesis_non_empty', 'synthesis_finding_id_ref', 'cross_artifact_references', 'wave1_evidence_ref'].includes(rule.id) && missingFiles.has(target.resolved)) {
        maskedRuleIds.push(id);
        continue;
      }
      if (['ledger_non_empty', 'ledger_fixed_sections'].includes(rule.id) && missingFiles.has(target.resolved)) {
        maskedRuleIds.push(id);
        continue;
      }
      checksRun += 1;
      let result = { passed: true };
      try {
        if (rule.check === 'file_exists') {
          result.passed = existsSync(join(bundlePath, target.resolved));
          if (!result.passed) {
            missingFiles.add(target.resolved);
            result.detail = `Missing file: ${target.resolved}${target.topic ? ` (topic: ${target.topic})` : ''}`;
          }
        } else if (rule.check === 'field_non_empty') {
          const path = join(bundlePath, target.resolved);
          const content = existsSync(path) ? stripMdFrontmatter(readFileSync(path, 'utf8')) : '';
          result = content.length > 0 ? { passed: true } : { passed: false, detail: `${target.resolved} is empty (no content after frontmatter)` };
        } else if (rule.check === 'pattern_match') {
          if (rule.id === 'ledger_fixed_sections') {
            result = checkLedgerSections(readFileSync(join(bundlePath, target.resolved), 'utf8'));
            if (!result.passed) result.findings = [localCheckerFinding(bundlePath, rule, {
              suffix: 'semantic_sections',
              blockingBasis: 'required_structure',
              surface: target.resolved,
              expected: 'All six required Wave2 cross-topic ledger semantic sections are present and non-empty.',
              observed: result.detail,
              missingFact: result.detail,
              repair: `Add the missing semantic ledger section(s) to ${target.resolved}.`,
              detail: result.detail,
            })];
          } else {
            result = evaluatePattern(bundlePath, rule, target.resolved, target.topic, { stripFrontmatter: true });
            if (!result.passed && rule.finding?.source === 'checker') result.findings = [localCheckerFinding(bundlePath, rule, {
              topic: target.topic,
              suffix: 'pattern_contract',
              blockingBasis: 'binding_integrity',
              surface: target.resolved,
              expected: 'Required Wave2 evidence/reference binding marker is present.',
              observed: result.detail,
              missingFact: result.detail,
              repair: `Repair the missing Wave2 binding marker in ${target.resolved}.`,
              detail: result.detail,
            })];
          }
        } else if (rule.check === 'yaml_parse') {
          const path = join(bundlePath, target.resolved);
          try { parseYaml(readFileSync(path, 'utf8')); }
          catch (error) {
            invalidYaml.add(target.resolved);
            const detail = `YAML parse error in ${target.resolved}: ${safeMessage(error)}`;
            result = { passed: false, detail, findings: [localCheckerFinding(bundlePath, rule, {
              suffix: 'yaml_parse',
              blockingBasis: 'authority_integrity',
              surface: target.resolved,
              expected: 'Parseable YAML for the Wave2 finding index.',
              observed: safeMessage(error),
              missingFact: `${target.resolved} cannot be parsed as YAML: ${safeMessage(error)}`,
              repair: `Repair ${target.resolved} as parseable YAML.`,
              detail,
            })] };
          }
        } else if (rule.check === 'cross_field' && rule.mode === 'markdown_link_resolution') {
          result = checkMarkdownLinkResolution(bundlePath, rule, target.resolved);
          if (!result.passed) result.findings = [localCheckerFinding(bundlePath, rule, {
            suffix: 'markdown_link_resolution',
            blockingBasis: 'binding_integrity',
            surface: target.resolved,
            expected: `At least ${rule.min_valid_refs || 1} valid Markdown artifact link(s) resolve relative to ${rule.resolve_relative_to || 'artifacts/wave2'}.`,
            observed: result.detail,
            missingFact: result.detail,
            repair: `Repair the Markdown artifact links in ${target.resolved}.`,
            detail: result.detail,
          })];
          if (result.advisory) {
            findings.push(makeContractFinding({
              id: `${rule.id}:dead_links`,
              ruleId: rule.id,
              classification: 'advisory',
              surface: target.resolved,
              detail: result.advisory,
              repair: result.advisory,
            }));
          }
        } else if (rule.check === 'status_value') {
          result = evaluateStatusRule(bundlePath, rule);
        } else if (rule.check === 'phase_queue_drained') {
          const check = checkPhaseQueueDrained(bundlePath, { phase: 'wave2' });
          result = { passed: check.passed, detail: check.inspect.join('; '), repair: check.advice.join(' '), findings: check.findings };
        } else if (rule.check === 'rerun_add_full_synthesis') {
          const pairCheck = getFindingIndexCheck(definition.rules.find((candidate) => candidate.check === 'finding_index_contract') || rule);
          result = checkRerunAddFullSynthesis(bundlePath, pairCheck.pair_facts);
          if (result.pair_masked && !result.delta_issue) maskedRuleIds.push(rule.id);
          result.findings = [
            ...(result.delta_issue ? [localCheckerFinding(bundlePath, rule, {
              suffix: 'delta_synthesis',
              blockingBasis: 'required_structure',
              surface: 'artifacts/wave2/synthesis.md',
              expected: 'Rerun action:add uses full Wave2 synthesis rather than Delta Synthesis.',
              observed: result.delta_issue,
              missingFact: result.delta_issue,
              repair: 'Rewrite artifacts/wave2/synthesis.md through the full action:add synthesis path, then rerun the same checkpoint.',
              detail: result.delta_issue,
            })] : []),
            ...(result.pair_issue ? [localCheckerFinding(bundlePath, rule, {
              suffix: 'pair_universe',
              blockingBasis: 'required_structure',
              surface: 'artifacts/wave2/finding-index.yaml',
              expected: 'Rerun action:add structured pair coverage equals the exact canonical pair universe.',
              observed: result.pair_issue,
              missingFact: result.pair_issue,
              repair: 'Add the exact missing structured pair entries and coherent counts to finding-index.yaml, then rerun the same checkpoint.',
              detail: result.pair_issue,
            })] : []),
          ];
        } else if (rule.check === 'finding_index_contract') {
          const check = getFindingIndexCheck(rule);
          maskedRuleIds.push(...(check.masked_rule_ids || []).map((masked) => `${rule.id}:${masked}`));
          result = { passed: check.passed, detail: check.inspect.join('; '), repair: check.advice.join(' '), findings: check.findings || [] };
        } else if (rule.check === 'reference_index_coverage') {
          const check = checkReferenceIndexCoverage(bundlePath, listMatchingBundleFiles(bundlePath, target.resolved), { sourceLayer: rule.source_layer || null, rule });
          result = { passed: check.passed, detail: check.inspect.join('; '), repair: check.advice.join(' '), findings: check.findings || [] };
        } else if (rule.check === 'work_unit_ledger_exists') {
          const check = checkWorkUnitLedgerExists(bundlePath, rule);
          result = { passed: check.passed, detail: check.inspect.join('; '), repair: check.advice.join(' '), findings: check.findings || [] };
        } else if (rule.check === 'work_unit_output_coverage') {
          const check = checkWorkUnitOutputCoverage(bundlePath, rule);
          result = { passed: check.passed, detail: check.inspect.join('; '), repair: check.advice.join(' '), findings: check.findings || [] };
        } else if (rule.check === 'work_unit_submission_presence') {
          const check = checkWorkUnitSubmissionPresence(bundlePath, rule);
          result = { passed: check.passed, detail: check.inspect.join('; '), repair: check.advice.join(' '), findings: check.findings || [] };
        } else if (rule.check === 'delegated_bypass_suspected') {
          const check = checkDelegatedBypassSuspected(bundlePath, rule);
          result = { passed: check.passed, detail: check.inspect.join('; '), repair: check.advice.join(' '), findings: check.findings || [] };
        } else {
          result = { passed: false, findings: [configurationFinding(bundlePath, rule, `Unknown check type: ${rule.check} (mode: ${rule.mode || 'n/a'}) — must fail (check type not implemented)`)] };
        }
      } catch (error) {
        result = { passed: false, findings: [configurationFinding(bundlePath, rule, `Error evaluating rule ${rule.id}: ${safeMessage(error)}`, safeMessage(error))] };
      }
      if (Array.isArray(result.findings)) findings.push(...result.findings);
      if (!result.passed && (!Array.isArray(result.findings) || result.findings.length === 0)) {
        findings.push(failureFinding(bundlePath, rule, {
          topic: target.topic,
          surface: target.resolved,
          detail: result.detail,
          expected: result.expected,
          observed: result.observed,
          missingFact: result.missingFact || result.detail,
          repair: result.repair,
        }));
      }
    }
  }

  return buildContractEvaluation({ checksRun, findings, maskedRuleIds, bypassSuspicion });
}
