#!/usr/bin/env node
// check-gate-readiness-passed.mjs — evaluates gate-readiness-passed rules
// @impl GSK-001, GSK-002, GSK-004, CDG-004
// Usage: node check-gate-readiness-passed.mjs --bundle <path> --current-node <fileRef> [--transitions <path>]

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  parseGateCliArgs,
  tryLoadGateDefinition,
  loadManifest,
  validateNodeGateBinding,
  resolveRouting,
  buildGateResult,
  emitGateResult,
  writeGateAttempt,
  readTraceEvents,
} from '../../engine/helpers/gate-helpers.mjs';

const args = parseGateCliArgs();
if (args.error) { emitGateResult(args.error, { bundlePath: args.bundle }); }

// Load gate definition
const { definition, error: defError } = tryLoadGateDefinition('readiness-passed', args.currentNode || null);
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
    } else if (rule.check === 'dir_non_empty') {
      const dirPath = join(bundlePath, rule.target);
      if (!existsSync(dirPath)) {
        rulePassed = false;
        ruleDetail = `Missing directory: ${rule.target}`;
      } else {
        const entries = readdirSync(dirPath);
        if (entries.length === 0) {
          rulePassed = false;
          ruleDetail = `Directory ${rule.target} is empty`;
        }
      }
    } else if (rule.check === 'trace_has_all_gates') {
      // Derive expected prior gate set from manifest topology (no hardcoded threshold).
      // The manifest is the read-only authority for lifecycle phase ordering.
      const manifest = loadManifest();
      const currentIdx = manifest.phases.findIndex(p => p.node === args.currentNode);
      if (currentIdx === -1) {
        rulePassed = false;
        ruleDetail = `Current node "${args.currentNode}" not found in manifest phases — cannot derive prior gate set`;
      } else {
        const priorGates = manifest.phases
          .slice(0, currentIdx)
          .filter(p => p.gate !== null)
          .map(p => p.gate);
        const events = readTraceEvents(bundlePath);
        // Collect gate names that have at least one gate_attempt(passed=true)
        const passedGateNames = new Set();
        for (const e of events) {
          if (e.event === rule.target) {
            const matchOk = !rule.match
              || Object.entries(rule.match).every(([k, v]) => e[k] === v);
            if (matchOk) passedGateNames.add(e.gate);
          }
        }
        const missing = priorGates.filter(g => !passedGateNames.has(g));
        if (missing.length > 0) {
          rulePassed = false;
          const found = priorGates.filter(g => passedGateNames.has(g));
          ruleDetail = `Missing gate_attempt(passed=true) for: ${missing.join(', ')}. Expected ${priorGates.length} prior gate(s): ${priorGates.join(', ')}. Found: ${found.length > 0 ? found.join(', ') : 'none'}.`;
        }
      }
    } else if (rule.check === 'yaml_parse') {
      const yamlPath = join(bundlePath, rule.target);
      if (!existsSync(yamlPath)) {
        rulePassed = false;
        ruleDetail = `Missing file: ${rule.target}`;
      } else {
        try {
          parseYaml(readFileSync(yamlPath, 'utf-8'));
        } catch (err) {
          rulePassed = false;
          ruleDetail = `YAML parse error in ${rule.target}: ${err.message}`;
        }
      }
    } else if (rule.check === 'jsonl_parse') {
      const jsonlPath = join(bundlePath, rule.target);
      if (!existsSync(jsonlPath)) {
        rulePassed = false;
        ruleDetail = `Missing file: ${rule.target}`;
      } else {
        // Validate JSONL parseability directly from raw file
        const raw = readFileSync(jsonlPath, 'utf-8');
        const lines = raw.split('\n').filter(l => l.trim());
        const badLines = [];
        lines.forEach((line, i) => {
          try { JSON.parse(line); } catch {
            badLines.push(i + 1);
          }
        });
        if (badLines.length > 0) {
          rulePassed = false;
          ruleDetail = `${rule.target} has ${badLines.length} unparseable line(s): ${badLines.slice(0, 5).join(', ')}${badLines.length > 5 ? '...' : ''}`;
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
          ruleDetail = `${rule.target}: expected "${rule.expected}", got "${JSON.stringify(value)}"`;
        }
      }
    } else {
      rulePassed = false;
      ruleDetail = `Unknown check type: ${rule.check} — must fail (check type not implemented)`;
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

writeGateAttempt(bundlePath, result);

emitGateResult(result);
