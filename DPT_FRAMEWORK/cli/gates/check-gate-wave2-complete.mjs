#!/usr/bin/env node
// check-gate-wave2-complete.mjs — evaluates gate-wave2-complete rules
// @impl GSK-001, GSK-002, GSK-004, RWG-006, RWG-007, RWG-008
// Usage: node check-gate-wave2-complete.mjs --bundle <path> --current-node <fileRef> [--transitions <path>]

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve as resolvePath, basename } from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  parseGateCliArgs,
  tryLoadGateDefinition,
  validateNodeGateBinding,
  resolveRouting,
  buildGateResult,
  emitGateResult,
  writeGateAttempt,
  stripMdFrontmatter,
} from '../../engine/helpers/gate-helpers.mjs';

const args = parseGateCliArgs();
if (args.error) { emitGateResult(args.error); }

// Load gate definition
const { definition, error: defError } = tryLoadGateDefinition('wave2-complete', args.currentNode || null);
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
  const p = join(bundlePath, 'rb_plan.md');
  if (!existsSync(p)) return null;
  const raw = readFileSync(p, 'utf-8');
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;
  try {
    _planCache = parseYaml(fmMatch[1]);
  } catch {
    _planCache = null;
  }
  return _planCache;
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
 */
function expandTopicTarget(target) {
  const topics = getTopicKeys();
  if (target.includes('{topic}')) {
    if (topics.length === 0) return [];
    return topics.map(t => ({ topic: t, resolved: target.replace(/\{topic\}/g, t) }));
  }
  return [{ topic: null, resolved: target }];
}

/**
 * Parse Markdown links from content.
 * Returns array of { label, path } objects for all [label](path) matches.
 */
function extractMarkdownLinks(content) {
  const links = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    links.push({ label: m[1], path: m[2] });
  }
  return links;
}

/**
 * Resolve a relative link path against a base directory (the synthesis file location).
 */
function resolveLinkTarget(linkPath, baseDir) {
  return resolvePath(baseDir, linkPath);
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
      } else if (rule.check === 'field_non_empty') {
        const filePath = join(bundlePath, resolvedTarget);
        if (!existsSync(filePath)) {
          rulePassed = false;
          ruleDetail = `File not found: ${resolvedTarget}`;
          if (tgt.topic) ruleDetail += ` (topic: ${tgt.topic})`;
        } else {
          const content = readFileSync(filePath, 'utf-8');
          const bodyContent = stripMdFrontmatter(content);
          if (bodyContent.length === 0) {
            rulePassed = false;
            ruleDetail = `${resolvedTarget} is empty (no content after frontmatter)`;
            if (tgt.topic) ruleDetail += ` (topic: ${tgt.topic})`;
          }
        }
      } else if (rule.check === 'pattern_match') {
        const filePath = join(bundlePath, resolvedTarget);
        if (!existsSync(filePath)) {
          rulePassed = false;
          ruleDetail = `Cannot read file for pattern_match: ${resolvedTarget}`;
          if (tgt.topic) ruleDetail += ` (topic: ${tgt.topic})`;
        } else {
          const content = readFileSync(filePath, 'utf-8');
          const bodyContent = stripMdFrontmatter(content);
          const re = new RegExp(rule.pattern);
          const matched = re.test(bodyContent);

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
      } else if (rule.check === 'yaml_parse') {
        const filePath = join(bundlePath, resolvedTarget);
        if (!existsSync(filePath)) {
          rulePassed = false;
          ruleDetail = `File not found: ${resolvedTarget}`;
        } else {
          try {
            parseYaml(readFileSync(filePath, 'utf-8'));
          } catch (err) {
            rulePassed = false;
            ruleDetail = `YAML parse error in ${resolvedTarget}: ${err.message}`;
          }
        }
      } else if (rule.check === 'cross_field' && rule.mode === 'markdown_link_resolution') {
        const synthesisPath = join(bundlePath, resolvedTarget);
        if (!existsSync(synthesisPath)) {
          rulePassed = false;
          ruleDetail = `Synthesis file not found: ${resolvedTarget}`;
        } else {
          const content = readFileSync(synthesisPath, 'utf-8');
          const links = extractMarkdownLinks(content);
          const mdLinks = links.filter(l => l.path.endsWith('.md'));

          if (mdLinks.length === 0) {
            rulePassed = false;
            ruleDetail = `No Markdown links to .md artifacts found in ${resolvedTarget}`;
          } else {
            const synthesisDir = join(bundlePath, rule.resolve_relative_to || 'artifacts/wave2');
            const validLinks = [];
            const deadLinks = [];

            for (const link of mdLinks) {
              const resolved = resolveLinkTarget(link.path, synthesisDir);
              if (existsSync(resolved)) {
                validLinks.push(link.path);
              } else {
                deadLinks.push(link.path);
              }
            }

            const minValid = rule.min_valid_refs || 1;
            if (validLinks.length >= minValid) {
              if (deadLinks.length > 0) {
                advice.push(`Note: ${deadLinks.length} dead link(s) found but ${validLinks.length} valid — gate passes. Dead links: ${deadLinks.join(', ')}`);
              }
            } else {
              rulePassed = false;
              ruleDetail = `Only ${validLinks.length} valid artifact reference(s) found (need ≥${minValid}). Dead links: ${deadLinks.join(', ')}`;
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
      } else {
        rulePassed = false;
        ruleDetail = `Unknown check type: ${rule.check} (mode: ${rule.mode || 'n/a'}) — must fail (check type not implemented)`;
      }
    } catch (err) {
      rulePassed = false;
      const safeMsg = (err.message || String(err)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
      ruleDetail = `Error evaluating rule ${rule.id}: ${safeMsg}`;
    }

    if (!rulePassed) {
      allPassed = false;
      inspect.push(ruleDetail);
      advice.push(rule.failure_message);
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
