#!/usr/bin/env node
// check-gate-wave2-complete.mjs — evaluates gate-wave2-complete rules
// @impl GSK-001, GSK-002, GSK-004, RWG-006, RWG-007, RWG-008
// Usage: node check-gate-wave2-complete.mjs --bundle <path> --current-node <fileRef> [--transitions <path>]

import { existsSync, readFileSync, appendFileSync } from 'node:fs';
import { join, resolve as resolvePath } from 'node:path';
import {
  parseGateCliArgs,
  loadGateDefinition,
  validateNodeGateBinding,
  resolveRouting,
  buildGateResult,
  emitGateResult,
  readTraceEvents,
} from '../../engine/helpers/gate-helpers.mjs';

const args = parseGateCliArgs();

// Load gate definition
const definition = loadGateDefinition('wave2-complete');

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

  let rulePassed = true;
  let ruleDetail = null;

  try {
    if (rule.check === 'file_exists') {
      const targetPath = join(bundlePath, rule.target);
      if (!existsSync(targetPath)) {
        rulePassed = false;
        ruleDetail = `Missing file: ${rule.target}`;
      }
    } else if (rule.check === 'field_non_empty') {
      // Read the file and check it's non-empty
      const filePath = join(bundlePath, rule.target);
      if (!existsSync(filePath)) {
        rulePassed = false;
        ruleDetail = `File not found: ${rule.target}`;
      } else {
        const content = readFileSync(filePath, 'utf-8').trim();
        // Strip YAML frontmatter if present (handles both empty and populated frontmatter)
        const bodyContent = content.replace(/^---[\s\S]*?---\n?/, '').trim();
        if (bodyContent.length === 0) {
          rulePassed = false;
          ruleDetail = `${rule.target} is empty (no content after frontmatter)`;
        }
      }
    } else if (rule.check === 'cross_field' && rule.mode === 'markdown_link_resolution') {
      const synthesisPath = join(bundlePath, rule.target);
      if (!existsSync(synthesisPath)) {
        rulePassed = false;
        ruleDetail = `Synthesis file not found: ${rule.target}`;
      } else {
        const content = readFileSync(synthesisPath, 'utf-8');
        const links = extractMarkdownLinks(content);
        const mdLinks = links.filter(l => l.path.endsWith('.md'));

        if (mdLinks.length === 0) {
          rulePassed = false;
          ruleDetail = `No Markdown links to .md artifacts found in ${rule.target}`;
        } else {
          // Resolve each link relative to the synthesis directory
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
            // Rule passes, but list dead links in advice if any
            if (deadLinks.length > 0) {
              ruleDetail = null; // pass
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
    } else if (rule.check === 'trace_event_present') {
      const events = readTraceEvents(bundlePath, rule.target);
      if (events.length === 0) {
        rulePassed = false;
        ruleDetail = `Trace event "${rule.target}" not found in rb_trace.jsonl`;
      }
    } else {
      ruleDetail = `Unknown check type: ${rule.check} (mode: ${rule.mode || 'n/a'}) — skipped`;
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

// Append runtime audit entry to rb_trace.jsonl (PRG-007)
try {
  const tracePath = join(bundlePath, 'rb_trace.jsonl');
  const traceEntry = JSON.stringify({
    ts: new Date().toISOString(),
    event: 'gate_attempt',
    gate: definition.gate,
    passed: allPassed,
    currentNodeRef: args.currentNode,
    next: result.check.next,
    inspect_count: inspect.length,
    advice_count: advice.length,
  });
  appendFileSync(tracePath, traceEntry + '\n');
} catch {
  // Trace write failure must not affect gate output
}

emitGateResult(result);
