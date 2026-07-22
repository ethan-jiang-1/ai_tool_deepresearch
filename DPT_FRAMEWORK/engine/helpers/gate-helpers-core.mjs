// gate-helpers-core.mjs — Gate CLI lifecycle: args, loading, routing, results, trace, checkpoints
// @impl GSK-001, GSK-002, GSK-004, SWE-001
// Canonical location: DPT_FRAMEWORK/engine/helpers/gate-helpers-core.mjs
//
// Re-exported by gate-helpers.mjs for backward compatibility.

import { parseArgs } from 'node:util';
import { existsSync, readFileSync, writeFileSync, appendFileSync, readdirSync, statSync, mkdirSync, openSync, closeSync, renameSync, rmSync } from 'node:fs';
import { join, dirname, basename, relative, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { parse as parseYaml } from 'yaml';
import { readGateDefinitionSnapshot } from '../../schema/contracts/gate-definition.mjs';
import { resolveNodeTransitionDetailed } from '../ask-next.mjs';
import { parseMdFrontmatter } from './gate-helpers-readers.mjs';
import { continuationForGateResult } from './continuation-cue.mjs';
import {
  buildContractEvaluation,
  makeContractFinding,
  projectFindingCompatibility,
} from './wave-contract-findings.mjs';
import { canonicalSectionContent } from './plan-hostfile-sections.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKFLOW_NODES_DIR = join(__dirname, '..', '..', 'workflows', 'nodes');

function gateHelperFailure(input) {
  return projectFindingCompatibility(makeContractFinding({
    findingSource: 'checker',
    classification: 'blocking',
    ...input,
  }));
}

function gateFailureResult({ gate, currentNodeRef, routing, failure, bundlePath = null }) {
  return buildGateResult({
    passed: false,
    gate,
    currentNodeRef,
    routing,
    inspect: failure.inspect,
    advice: failure.advice,
    findings: failure.findings,
    bundlePath,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Gate CLI Shared Utilities
// ═══════════════════════════════════════════════════════════════════════════

// ─── CLI Argument Parsing ──────────────────────────────────────────────────

/**
 * Extract --attempt value from raw process.argv manually.
 * Used as fallback when parseArgs throws on ambiguous --attempt values
 * (bare flag, negative numbers, values starting with -).
 *
 * @param {string[]} argv — raw process.argv
 * @returns {string|undefined} the raw attempt value, or undefined
 */
function extractAttemptFromArgv(argv) {
  const idx = argv.indexOf('--attempt');
  if (idx === -1) return undefined;
  if (idx >= argv.length - 1) return '';
  const next = argv[idx + 1];
  // If next value looks like another option, treat as bare flag
  if (next.startsWith('-')) return '';
  return next;
}

/**
 * Parse standard gate CLI arguments.
 *
 * On success returns `{ bundle, currentNode, transitions, attempt, args, error: null }`.
 * On failure (missing required args) returns `{ error }` with a structured
 * error ready to emit as JSON. Never calls process.exit() — the caller
 * decides how to emit the error.
 *
 * @returns {{ bundle?: string, currentNode?: string, transitions?: string, attempt?: number, args?: object, error?: { check: object, routing: object, inspect: string[], advice: string[] } | null }}
 *
 * @impl GSK-006
 */
export function parseGateCliArgs() {
  // Parse known options first. We parse --attempt separately because
  // node:util parseArgs with type:'string' throws on bare flag and
  // on values starting with '-' (e.g. negative numbers). We handle
  // those as fallback-to-0 cases per GSK-006.
  let parseResult;
  try {
    parseResult = parseArgs({
      options: {
        bundle: { type: 'string' },
        'current-node': { type: 'string' },
        transitions: { type: 'string' },
        attempt: { type: 'string' },
      },
      allowPositionals: true,
      strict: false,
    });
  } catch (err) {
    // parseArgs may throw on ambiguous --attempt values (bare flag,
    // negative numbers, values starting with -). Retry without --attempt
    // by rebuilding argv with --attempt and its value removed.
    if (err.code === 'ERR_PARSE_ARGS_INVALID_OPTION_VALUE' ||
        err.code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION') {
      const rawAttempt = extractAttemptFromArgv(process.argv);
      // Strip only --attempt from argv (not its value — the value is
      // ambiguous and should be re-interpreted by parseArgs naturally).
      const cleanedArgv = process.argv.filter(a => a !== '--attempt');
      // Re-parse with cleaned argv
      parseResult = parseArgs({
        args: cleanedArgv,
        options: {
          bundle: { type: 'string' },
          'current-node': { type: 'string' },
          transitions: { type: 'string' },
        },
        allowPositionals: true,
        strict: false,
      });
      parseResult.values.attempt = rawAttempt;
    } else {
      throw err;
    }
  }

  const { values } = parseResult;

  if (!values.bundle) {
    const failure = gateHelperFailure({
      id: 'gate_invocation_bundle_required',
      ruleId: 'gate_invocation_bundle_required',
      blockingBasis: 'invocation_contract',
      surface: 'Gate CLI invocation --bundle',
      expected: 'A selected active bundle path supplied through --bundle.',
      observed: 'argument absent',
      missingFact: 'Required Gate invocation argument --bundle is missing.',
      repairKind: 'engine_operation',
      writeTo: 'Gate CLI invocation argument --bundle',
      detail: 'Missing required argument: --bundle <path>',
      repair: 'Provide --bundle <path> pointing to an active run or disposable bundle.',
    });
    return {
      error: gateFailureResult({
        gate: '(unknown)',
        currentNodeRef: null,
        routing: { kind: 'invalid_input', next: null, detail: failure.reason },
        failure,
      }),
    };
  }

  if (!values['current-node']) {
    const failure = gateHelperFailure({
      id: 'gate_invocation_current_node_required',
      ruleId: 'gate_invocation_current_node_required',
      blockingBasis: 'invocation_contract',
      surface: 'Gate CLI invocation --current-node',
      expected: 'A canonical workflow node fileRef supplied through --current-node.',
      observed: 'argument absent',
      missingFact: 'Required Gate invocation argument --current-node is missing.',
      repairKind: 'engine_operation',
      writeTo: 'Gate CLI invocation argument --current-node',
      detail: 'Missing required argument: --current-node <fileRef>',
      repair: 'Provide --current-node <fileRef> (e.g. phases/phase-wave0.md).',
    });
    return {
      bundle: values.bundle,
      error: gateFailureResult({
        gate: '(unknown)',
        currentNodeRef: null,
        routing: { kind: 'invalid_input', next: null, detail: failure.reason },
        failure,
        bundlePath: values.bundle,
      }),
    };
  }

  // Parse --attempt: Agent-reported retry hint (GSK-006)
  // Must be a base-10 non-negative integer. Fall back to 0 on:
  // missing, bare flag, empty value, unparseable, negative, non-integer.
  // IMPORTANT: when --attempt value is empty or followed by another option,
  // we must NOT consume the next option token.
  let attempt = 0;
  if (values.attempt !== undefined && values.attempt !== null) {
    if (values.attempt === '' || values.attempt === true) {
      // bare flag or --attempt followed by another option → fallback 0
      attempt = 0;
    } else {
      const parsed = Number(values.attempt);
      if (Number.isFinite(parsed) && Number.isInteger(parsed) && parsed >= 0) {
        attempt = parsed;
      }
      // else: unparseable/negative/non-integer → fallback 0
    }
  }

  const transitionsPath = values.transitions
    || join(__dirname, '..', '..', 'workflows', 'transitions.chain.json');

  return {
    bundle: values.bundle,
    currentNode: values['current-node'],
    transitions: transitionsPath,
    attempt,
    args: values,
    error: null,
  };
}

// ─── Gate Definition Loading ───────────────────────────────────────────────

/**
 * Load a gate definition JSON file.
 *
 * @param {string} gateKey — e.g. 'wave0-complete'
 * @returns {{ gate: string, rules: Array }}
 */
export function loadGateDefinition(gateKey) {
  const defPath = join(__dirname, '..', '..', 'schema', 'gate_definitions', `gate-${gateKey}.definition.json`);
  return readGateDefinitionSnapshot(defPath).definition;
}

/**
 * Safe wrapper around loadGateDefinition — never throws.
 * Returns `{ definition, error }` where one is always null.
 * On success, error is null and definition is the parsed gate definition.
 * On failure, definition is null and error is a valid gate result object ready to emit.
 *
 * @param {string} gateKey — e.g. 'wave0-complete'
 * @param {string|null} currentNodeRef — for the error result's check.currentNodeRef
 * @returns {{ definition?: object|null, error?: object|null }}
 */
export function tryLoadGateDefinition(gateKey, currentNodeRef = null) {
  try {
    const definition = loadGateDefinition(gateKey);
    return { definition, error: null };
  } catch (err) {
    const safeMsg = (err.message || String(err)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
    const failure = gateHelperFailure({
      id: 'gate_definition_contract_invalid',
      ruleId: 'gate_definition_contract_invalid',
      blockingBasis: 'configuration_integrity',
      surface: `gate-${gateKey}.definition.json`,
      expected: 'Definition bytes parse through the shared Gate-definition Zod contract.',
      observed: safeMsg,
      missingFact: `Gate definition '${gateKey}' is missing or violates the shared definition contract: ${safeMsg}`,
      repairKind: 'missing_contract',
      writeTo: `Gate definition contract boundary for '${gateKey}'`,
      detail: `Gate definition '${gateKey}' is missing or unparseable: ${safeMsg}`,
      repair: `Verify gate-${gateKey}.definition.json exists and satisfies the shared Gate-definition contract.`,
    });
    return {
      definition: null,
      error: gateFailureResult({
        gate: gateKey,
        currentNodeRef,
        routing: { kind: 'config_error', next: null, detail: failure.reason },
        failure,
      }),
    };
  }
}

/**
 * Load the workflow manifest.
 *
 * @returns {{ phases: Array, shared: Array }}
 */
export function loadManifest() {
  const manifestPath = join(__dirname, '..', '..', 'workflows', 'manifest.json');
  const raw = readFileSync(manifestPath, 'utf-8');
  return JSON.parse(raw);
}

// ─── Binding Validation ────────────────────────────────────────────────────

/**
 * Validate that the current-node fileRef is bound to the expected gate
 * according to the workflow manifest.
 *
 * Returns null on success, or an error message string on mismatch.
 *
 * @param {string} currentNodeRef — e.g. 'phases/phase-wave0.md'
 * @param {string} gateKey — e.g. 'wave0-complete'
 * @returns {string|null} error message or null if valid
 *
 * @impl GSK-004
 */
export function checkNodeGateBinding(currentNodeRef, gateKey) {
  const manifest = loadManifest();
  const phase = manifest.phases.find(p => p.node === currentNodeRef);
  const expectedPhase = manifest.phases.find((candidate) => candidate.gate === gateKey);

  if (!phase) {
    const failure = gateHelperFailure({
      id: 'gate_node_binding_unknown_node',
      ruleId: 'gate_node_binding_unknown_node',
      blockingBasis: 'binding_integrity',
      surface: 'workflows/manifest.json#/phases',
      expected: `A manifest phase bound to current-node '${currentNodeRef}'.`,
      observed: 'no matching phase',
      missingFact: `current-node '${currentNodeRef}' is not registered in workflow manifest phases.`,
      repairKind: 'engine_operation',
      writeTo: `Gate CLI invocation --current-node for gate '${gateKey}'`,
      detail: `current-node "${currentNodeRef}" not found in manifest phases`,
      repair: 'Invoke the Gate with the canonical phase node registered for this Gate.',
      checkpointContext: expectedPhase?.node ? { currentNodeRef: expectedPhase.node } : null,
    });
    return { ok: false, expectedNodeRef: expectedPhase?.node || null, ...failure };
  }

  if (phase.gate !== gateKey) {
    const failure = gateHelperFailure({
      id: 'gate_node_binding_mismatch',
      ruleId: 'gate_node_binding_mismatch',
      blockingBasis: 'binding_integrity',
      surface: `workflows/manifest.json#/phases/${currentNodeRef}`,
      expected: `Gate '${gateKey}' bound to '${expectedPhase?.node || '<unregistered>'}'.`,
      observed: `current-node '${currentNodeRef}' is bound to gate '${phase.gate}'.`,
      missingFact: `Gate/current-node binding mismatch: '${currentNodeRef}' is not the node for gate '${gateKey}'.`,
      repairKind: expectedPhase?.node ? 'engine_operation' : 'missing_contract',
      writeTo: expectedPhase?.node
        ? `Gate CLI invocation --current-node ${expectedPhase.node}`
        : `Workflow manifest binding for gate '${gateKey}'`,
      detail: `Gate binding mismatch: current-node "${currentNodeRef}" expects gate "${phase.gate}" but CLI is for gate "${gateKey}"`,
      repair: expectedPhase?.node
        ? `Invoke this Gate with --current-node ${expectedPhase.node}.`
        : `Gate '${gateKey}' has no registered manifest node.`,
      checkpointContext: expectedPhase?.node ? { currentNodeRef: expectedPhase.node } : null,
    });
    return { ok: false, expectedNodeRef: expectedPhase?.node || null, ...failure };
  }

  return { ok: true, phase };
}

export function validateNodeGateBinding(currentNodeRef, gateKey) {
  const result = checkNodeGateBinding(currentNodeRef, gateKey);
  return result.ok ? null : result.reason;
}

// ─── Routing Integration ───────────────────────────────────────────────────

/**
 * Call the detailed router and return the routing result.
 *
 * @param {string} transitionsPath
 * @param {string} currentNodeRef
 * @param {string} outcome — 'passed' or 'failed'
 * @param {object} [context] — caller-owned routing context
 * @returns {{ kind: string, next: string|null, detail?: string }}
 */
export function resolveRouting(transitionsPath, currentNodeRef, outcome, context = {}) {
  const routing = resolveNodeTransitionDetailed(transitionsPath, currentNodeRef, outcome, context);
  if (['invalid_input', 'config_error'].includes(routing.kind)) {
    const configurationFailure = routing.kind === 'config_error';
    const failure = gateHelperFailure({
      id: configurationFailure ? 'gate_routing_configuration_invalid' : 'gate_routing_invocation_invalid',
      ruleId: configurationFailure ? 'gate_routing_configuration_invalid' : 'gate_routing_invocation_invalid',
      blockingBasis: configurationFailure ? 'configuration_integrity' : 'invocation_contract',
      surface: transitionsPath || 'Gate routing invocation',
      expected: 'A valid transition table, current node, and accepted outcome.',
      observed: routing.detail || routing.kind,
      missingFact: routing.detail || `Gate routing failed with ${routing.kind}.`,
      repairKind: configurationFailure ? 'missing_contract' : 'engine_operation',
      writeTo: configurationFailure
        ? 'Workflow transition-table contract boundary'
        : 'Gate routing invocation arguments',
      detail: routing.detail || `Gate routing failed with ${routing.kind}.`,
      repair: configurationFailure
        ? 'Repair the workflow transition-table contract before rerunning this Gate.'
        : 'Correct the Gate routing invocation and rerun the same checkpoint.',
    });
    Object.defineProperties(routing, {
      finding: { value: failure.finding, enumerable: false },
      findings: { value: failure.findings, enumerable: false },
      inspect: { value: failure.inspect, enumerable: false },
      advice: { value: failure.advice, enumerable: false },
    });
  }
  return routing;
}

// ─── Result Construction ───────────────────────────────────────────────────

/**
 * Build the standard gate result object.
 *
 * @param {object} opts
 * @param {boolean} opts.passed — whether the gate check passed
 * @param {string} opts.gate — gate key
 * @param {string} opts.currentNodeRef — canonical node fileRef
 * @param {object} opts.routing — detailed router result
 * @param {string[]} [opts.inspect] — diagnostic messages
 * @param {string[]} [opts.advice] — guidance messages
 * @param {object[]} [opts.findings] — structured root findings from the detecting checker
 * @param {string} [opts.bundlePath] — resolved or resolvable active bundle path
 * @param {string} [opts.checkpointCommand] — exact checkpoint command override
 * @param {object} [opts.extraCheck] — extra fields to merge into check
 * @param {number} [opts.attemptNumber] — Agent-reported retry hint (GSK-006), default 0
 * @param {number} [opts.fatigueThreshold] — threshold for fatigue diagnostics (GSK-006), default 3
 * @returns {{ check: object, routing: object, inspect: string[], advice: string[], hints: object[] }}
 *
 * @impl GSK-002, GSK-006
 */
function uniqueMessages(messages) {
  const seen = new Set();
  const result = [];
  for (const message of messages) {
    const key = String(message || '').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(message);
  }
  return result;
}

function shellArg(value) {
  const text = String(value);
  if (/^[A-Za-z0-9_./:@+-]+$/.test(text)) return text;
  return `'${text.replace(/'/g, `'"'"'`)}'`;
}

function checkpointRerunCommand({ gate, currentNodeRef, bundlePath, checkpointCommand }) {
  if (typeof checkpointCommand === 'string' && checkpointCommand.trim()) return checkpointCommand.trim();
  const gateKey = typeof gate === 'string' && gate.trim() ? gate.trim() : '<gate-name>';
  const bundleArg = typeof bundlePath === 'string' && bundlePath.trim()
    ? shellArg(resolvePath(bundlePath))
    : '<bundle-path>';
  const nodeArg = typeof currentNodeRef === 'string' && currentNodeRef.trim()
    ? shellArg(currentNodeRef.trim())
    : '<current-node-ref>';
  return `node DPT_FRAMEWORK/cli/gates/check-gate-${gateKey}.mjs --bundle ${bundleArg} --current-node ${nodeArg}`;
}

function printableFact(value) {
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value); } catch { return String(value); }
}

function missingFactFromFinding(finding) {
  if (typeof finding.missing_fact === 'string' && finding.missing_fact.trim()) return finding.missing_fact.trim();
  const parts = [];
  if (finding.surface) parts.push(`surface ${finding.surface}`);
  if (finding.expected !== null && finding.expected !== undefined) parts.push(`expected ${printableFact(finding.expected)}`);
  if (finding.observed !== null && finding.observed !== undefined) parts.push(`observed ${printableFact(finding.observed)}`);
  return parts.join('; ');
}

export function projectGateHints({
  passed,
  gate,
  currentNodeRef,
  bundlePath = null,
  checkpointCommand = null,
  findings = [],
} = {}) {
  if (passed || !Array.isArray(findings) || findings.length === 0) return [];
  const evaluation = buildContractEvaluation({ findings });
  const seen = new Set();
  const hints = [];

  for (const finding of evaluation.findings) {
    if (finding.classification !== 'blocking' || finding.masked_by_rule_id) continue;
    const missingFact = missingFactFromFinding(finding);
    if (!finding.repair_kind || !finding.write_to || !missingFact) continue;
    const findingCheckpoint = finding.checkpoint_context || {};
    const rerun = checkpointRerunCommand({
      gate,
      currentNodeRef: findingCheckpoint.currentNodeRef || currentNodeRef,
      bundlePath: findingCheckpoint.bundlePath || bundlePath,
      checkpointCommand: findingCheckpoint.checkpointCommand || checkpointCommand,
    });
    const hint = {
      rule_id: finding.rule_id,
      repair_kind: finding.repair_kind,
      missing_fact: missingFact,
      write_to: finding.write_to,
      rerun,
    };
    const key = JSON.stringify(hint);
    if (seen.has(key)) continue;
    seen.add(key);
    hints.push(hint);
  }
  return hints;
}

export function buildGateResult({
  passed,
  gate,
  currentNodeRef,
  routing,
  inspect = [],
  advice = [],
  findings = [],
  bundlePath = null,
  checkpointCommand = null,
  extraCheck = {},
  attemptNumber = 0,
  fatigueThreshold = 3,
}) {
  const checkNext = routing.kind === 'next' ? routing.next : null;

  let checkFields = {
    passed,
    gate,
    currentNodeRef,
    next: checkNext,
    ...extraCheck,
  };

  const finalInspect = uniqueMessages(inspect);
  let finalAdvice = uniqueMessages(advice);

  // GSK-006: Fatigue diagnostics — injected when Agent-reported attemptNumber
  // reaches fatigueThreshold AND the gate did not pass. Pass + high attempt
  // count is normal (try, try, succeed). Only fail + threshold triggers.
  // IMPORTANT: advice must be stop-mode-safe — must NOT unconditionally
  // declare the current invocation is stop:no.
  if (!passed && attemptNumber >= fatigueThreshold) {
    checkFields.fatigue_warning = true;
    checkFields.step_back = true;

    finalAdvice.push(
      `[fatigue] Agent-reported retry hint (--attempt ${attemptNumber}) has reached the fatigue threshold (${fatigueThreshold}). Consider stepping back rather than retrying the same repair.`,
      '[fatigue] Re-read the phase instructions — particularly §0 (ABSOLUTE PROHIBITION) and §5 (Gate Command). Verify you are running the correct CLI and interpreting inspect/advice correctly.',
      '[fatigue] If this invocation is for a stop:no phase, remember: gate failure is not an emergency. User-facing surfacing is prohibited, including questions, progress updates, idle/no-work summaries, and A/B choices. Switch strategies, record a silent degradation, or hold in place.',
    );
  }

  const result = {
    check: checkFields,
    routing,
    inspect: finalInspect,
    advice: finalAdvice,
    hints: projectGateHints({
      passed,
      gate,
      currentNodeRef,
      bundlePath,
      checkpointCommand,
      findings,
    }),
  };

  const gateContinuation = projectGateContinuation({
    passed,
    gate,
    currentNodeRef,
    next: checkNext,
  });
  if (gateContinuation.continuation) result.continuation = gateContinuation.continuation;
  if (gateContinuation.diagnostic) result.continuation_diagnostic = gateContinuation.diagnostic;

  return result;
}

function readWorkflowNodeFrontmatter(nodeRef) {
  if (typeof nodeRef !== 'string' || nodeRef.length === 0) {
    return { ok: false, reason: 'missing currentNodeRef' };
  }
  try {
    const raw = readFileSync(join(WORKFLOW_NODES_DIR, nodeRef), 'utf-8');
    return { ok: true, frontmatter: parseMdFrontmatter(raw) };
  } catch (err) {
    return { ok: false, reason: err.message || String(err) };
  }
}

function projectGateContinuation({ passed, gate, currentNodeRef, next }) {
  if (typeof currentNodeRef !== 'string' || currentNodeRef.length === 0) return {};
  const frontmatterResult = readWorkflowNodeFrontmatter(currentNodeRef);
  if (!frontmatterResult.ok) {
    return {
      diagnostic: `continuation omitted: cannot read current node frontmatter for ${currentNodeRef}: ${frontmatterResult.reason}`,
    };
  }

  const continuation = continuationForGateResult({
    frontmatter: frontmatterResult.frontmatter,
    passed,
    next,
    nodeRef: currentNodeRef,
    gate,
  });
  return continuation ? { continuation } : {};
}

// ─── Output and Exit ───────────────────────────────────────────────────────

/**
 * Emit the gate result as JSON to stdout and exit with the correct code.
 *
 * Exit code rules (GSK-002):
 *   passed=true  → exit(0)
 *   passed=false → exit(1)
 *   routing.kind is invalid_input | config_error → exit(2)
 *
 * @param {object} result — from buildGateResult()
 *
 * @impl GSK-002
 */
export function emitGateResult(result, { bundlePath } = {}) {
  // Log early gate errors when bundle path is available
  if (bundlePath && result.check && !result.check.passed) {
    try {
      writeGateAttempt(bundlePath, result);
    } catch {
      // Audit write failure must not affect gate output
    }
  }

  // Gate output can exceed a pipe's small kernel buffer once structured hints
  // are present. Reopen stdout through /dev/stdout to obtain a blocking file
  // description, so process.exit() cannot truncate the machine-readable JSON.
  const payload = `${JSON.stringify(result, null, 2)}\n`;
  let outputFd = null;
  try {
    outputFd = openSync('/dev/stdout', 'w');
    writeFileSync(outputFd, payload);
  } catch {
    process.stdout.write(payload);
  } finally {
    if (outputFd !== null) closeSync(outputFd);
  }

  // no_transition is a normal runtime outcome (chain table intentionally sparse),
  // NOT a configuration error. Only invalid_input and config_error signal real
  // misconfiguration warranting exit code 2.
  const routingErrorKinds = ['invalid_input', 'config_error'];
  if (routingErrorKinds.includes(result.routing.kind)) {
    process.exit(2);
  }

  process.exit(result.check.passed ? 0 : 1);
}

// ─── Audit Infrastructure (Logger + Trace) ──────────────────────────────────

import { readBundleName, logToRun } from '../logger.mjs';

function readDiagnostic(bundlePath, diagnosticPath) {
  if (!diagnosticPath) return null;
  try {
    return JSON.parse(readFileSync(join(bundlePath, diagnosticPath), 'utf-8'));
  } catch {
    return null;
  }
}

function classifyAttemptTrend({ passed, newlyPassing, stillFailing, regressed, previousFailures }) {
  if (!previousFailures) return 'first';
  if (passed) return 'converging';
  if (regressed.length > 0) return 'regressed';
  if (newlyPassing.length > 0 && stillFailing.length > 0) return 'converging';
  return 'stalled';
}

function comparableFailuresFromDiagnostic(diagnostic) {
  if (!diagnostic) return null;
  if (Array.isArray(diagnostic.check?.failed_rule_ids)) return diagnostic.check.failed_rule_ids;
  if (Array.isArray(diagnostic.failed_rule_ids)) return diagnostic.failed_rule_ids;
  return null;
}

function comparableFailuresFromResult(result) {
  if (Array.isArray(result.check?.failed_rule_ids)) return result.check.failed_rule_ids;
  return null;
}

function gateAttemptWindow(events, currentNodeRef) {
  let startIndex = -1;
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.event === 'load_complete' && e.entry === currentNodeRef) {
      startIndex = i;
      break;
    }
  }
  return events.slice(startIndex + 1);
}

function applyEngineAttemptDiagnostics(bundlePath, result, fatigueThreshold = 3) {
  try {
    const { check, inspect, advice } = result;
    const events = gateAttemptWindow(readTraceEvents(bundlePath), check.currentNodeRef)
      .filter(e => e.gate === check.gate && e.currentNodeRef === check.currentNodeRef);
    const attemptCount = events.length + 1;
    const previous = events.length > 0 ? events[events.length - 1] : null;
    const previousDiag = readDiagnostic(bundlePath, previous?.diagnostic_path);
    const previousFailures = comparableFailuresFromDiagnostic(previousDiag);
    const currentFailures = comparableFailuresFromResult(result);

    const comparable = previousFailures !== null && currentFailures !== null;
    const previousSet = new Set(comparable ? previousFailures : []);
    const currentSet = new Set(currentFailures || []);
    const newlyPassing = comparable ? [...previousSet].filter(item => !currentSet.has(item)) : [];
    const stillFailing = comparable
      ? [...currentSet].filter(item => previousSet.has(item))
      : [...currentSet];
    const regressed = comparable ? [...currentSet].filter(item => !previousSet.has(item)) : [];
    const attemptTrend = classifyAttemptTrend({
      passed: check.passed,
      newlyPassing,
      stillFailing,
      regressed,
      previousFailures: comparable ? previousFailures : null,
    });

    check.attempt_count = attemptCount;
    check.attempt_trend = attemptTrend;
    check.newly_passing = newlyPassing;
    check.still_failing = stillFailing;
    check.regressed = regressed;

    if (check.passed && attemptCount >= fatigueThreshold && check.next) {
      check.fatigue_warning = true;
      advice.push(
        `[autonomous_continuation] Gate passed after ${attemptCount} Engine-visible attempt(s). Consume check.next through enter-phase: node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle ${bundlePath} --node ${check.next}`,
        '[autonomous_continuation] Preserve this Gate verdict and follow the active rule and legal handoff. High Gate friction does not authorize framework-initiated questions, progress, or premature delivery.',
      );
    }
  } catch {
    // Diagnostics are advisory and must not change gate truth.
  }
}

/**
 * Derive phase from gate name.
 * e.g. 'wave0-complete' → 'wave0', 'wave1-complete' → 'wave1'
 *
 * @param {string} gateKey — gate key from definition
 * @returns {string} phase identifier
 */
export function derivePhaseFromGate(gateKey) {
  const match = (gateKey || '').match(/^(wave\d+|instantiation|setup|seed-topics|hitl1|hitl2|readiness|rerun|final)/);
  return match ? match[1] : (gateKey || 'unknown');
}

function traceDurabilityError(error, bundlePath, result) {
  if (error?.finding) return error;
  const message = (error?.message || String(error)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
  const gate = result?.check?.gate || '(unknown)';
  const failure = gateHelperFailure({
    id: 'gate_attempt_trace_not_durable',
    ruleId: 'gate_attempt_trace_not_durable',
    blockingBasis: 'authority_integrity',
    surface: `${bundlePath}/rb_trace.jsonl`,
    expected: 'The formal Gate attempt is durably appended through the Engine trace writer.',
    observed: message,
    missingFact: `Gate '${gate}' could not durably record its gate_attempt trace event: ${message}`,
    repairKind: 'missing_contract',
    writeTo: `Gate attempt trace durability boundary for '${gate}'`,
    detail: `[trace_durable] FAIL: could not durably append gate_attempt trace event: ${message}`,
    repair: 'Restore the Engine-owned trace durability boundary, then rerun the same Gate; do not hand-edit trace or status authority.',
  });
  Object.assign(error, failure);
  return error;
}

/**
 * Write a gate attempt to both audit destinations: logger and trace.
 *
 * Logger (`_logs/run.log`): uses logToRun() with unified envelope format
 * (Design D6.1). msg fixed to 'gate_attempt'; gate-specific info (gate,
 * passed, currentNodeRef, next, inspect_count, advice_count) enters the
 * detail JSON. Writes file-only — no console output.
 *
 * Trace (`rb_trace.jsonl`): structured `gate_attempt` JSONL event with
 * `bundle`, `phase`, and `diagnostic_path` fields for cross-sink stitching
 * (Design D2, TRW-001, TRW-002).
 *
 * Write failures are silently caught by default for legacy failed/non-routing
 * attempts. Covered successful handoffs pass strictTrace=true so a non-durable
 * authoritative gate_attempt cannot be reported as a successful route.
 *
 * @param {string} bundlePath — path to the active runtime context
 * @param {object} result — gate result from buildGateResult()
 * @param {{ strictTrace?: boolean }} [options]
 * @returns {void}
 *
 * @impl GSK-005, LOC-001, LOC-002, TRW-001, TRW-002, TRW-003, TRW-004
 */
export function writeGateAttempt(bundlePath, result, options = {}) {
  if (options.setupReadyStaged === true) return writeSetupReadyStagedAttempt(bundlePath, result);
  const { strictTrace = false } = options;
  try {
    applyEngineAttemptDiagnostics(bundlePath, result);
    const { check, routing, inspect, advice } = result;
    const bundle = readBundleName(bundlePath);
    const phase = derivePhaseFromGate(check.gate);

    // 1. Precompute diagnostic path and write diagnostic BEFORE logging
    //    so run.log can include the verified diagnostic_path pointer.
    let logDetail;
    const level = check.passed ? 'info' : 'warn';

    const iso = new Date().toISOString();
    const isoFile = iso.replace(/:/g, '-');
    const diagnosticPath = `_diagnostics/gates/${isoFile}-${check.gate}.json`;

    if (!check.passed) {
      // Write failure diagnostic artifact first so we know whether it succeeded
      const diagResult = writeGateFailureDiagnostic(bundlePath, result, diagnosticPath);

      logDetail = {
        gate: check.gate, currentNodeRef: check.currentNodeRef, next: check.next,
        routing_kind: routing.kind,
        inspect: inspect.slice(0, 5), advice: advice.slice(0, 3),
        phase,
      };

      if (diagResult.ok) {
        logDetail.diagnostic_path = diagnosticPath;
      } else {
        logDetail.diagnostic_write_failed = true;
        logDetail.diagnostic_write_reason = diagResult.reason;
      }
    } else {
      // TRW-004: Write lightweight pass diagnostic
      const passDiagResult = writeGatePassDiagnostic(bundlePath, result, diagnosticPath);

      logDetail = {
        gate: check.gate, currentNodeRef: check.currentNodeRef, next: check.next,
        inspect_count: inspect.length, advice_count: advice.length,
        phase,
      };
      if (check.degraded === true) {
        logDetail.degraded = true;
        logDetail.degraded_reason = check.degraded_reason || null;
        logDetail.degraded_rules = check.degraded_rules || [];
      }

      if (passDiagResult.ok) {
        logDetail.diagnostic_path = diagnosticPath;
      }
    }

    // 2. Logger — via logToRun with unified envelope (Design D6.1)
    logToRun(bundlePath, level, 'gate_attempt', logDetail);

    // 3. Trace — structured evidence with bundle, phase, diagnostic_path (TRW-001, TRW-002)
    try {
      const tracePath = join(bundlePath, 'rb_trace.jsonl');
      const ts = new Date().toISOString();
      const traceEntry = {
        ts,
        bundle,
        event: 'gate_attempt',
        kind: 'gate_attempt',
        gate: check.gate,
        phase,
        passed: check.passed,
        currentNodeRef: check.currentNodeRef,
        next: check.next,
        inspect_count: inspect.length,
        advice_count: advice.length,
      };
      if (check.degraded === true) {
        traceEntry.degraded = true;
        traceEntry.degraded_reason = check.degraded_reason || null;
        traceEntry.degraded_rules = check.degraded_rules || [];
      }
      // TRW-001: Include diagnostic_path when available
      if (logDetail.diagnostic_path) {
        traceEntry.diagnostic_path = logDetail.diagnostic_path;
      }
      appendFileSync(tracePath, JSON.stringify(traceEntry) + '\n');
    } catch (err) {
      if (strictTrace) throw traceDurabilityError(err, bundlePath, result);
      // Trace write failure silently ignored
    }

    // 4. Checkpoint manifest — durable reentry artifact (RRD-001)
    writeCheckpointManifest(bundlePath, result);
  } catch (err) {
    if (strictTrace) throw traceDurabilityError(err, bundlePath, result);
    // Audit write failure must not affect gate output
  }
}

function setupRoutePersistenceFinding(bundlePath, result, stage, error) {
  const message = (error?.message || String(error)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
  return gateHelperFailure({
    id: 'setup_ready_route_persistence_failed',
    ruleId: 'setup_ready_route_persistence_failed',
    blockingBasis: 'authority_integrity',
    surface: `${bundlePath}/${stage}`,
    expected: 'One route-pending checkpoint and its bound setup-ready gate_attempt trace are durably recorded before handoff.',
    observed: message,
    missingFact: `setup-ready content rules passed, but the legal route handoff could not persist ${stage}: ${message}`,
    repairKind: 'missing_contract',
    writeTo: `Setup-ready route persistence boundary (${stage})`,
    repair: 'Restore the direct persistence boundary and rerun the same setup-ready Gate; do not hand-edit checkpoint, trace, status, or Progress authority.',
    detail: `[authority_integrity] setup-ready route persistence failed at ${stage}: ${message}`,
  });
}

function planHashRecord(bundlePath) {
  const planPath = join(bundlePath, 'rb_plan.md');
  const bytes = readFileSync(planPath);
  const stat = statSync(planPath);
  return { sha256: createHash('sha256').update(bytes).digest('hex'), size: stat.size, mtime: stat.mtime.toISOString() };
}

function writeSetupRoutePendingDiagnostic(bundlePath, result, gateAttemptId) {
  const iso = new Date().toISOString();
  const isoFile = iso.replace(/:/g, '-');
  const diagnosticPath = `_diagnostics/gates/${isoFile}-setup-ready-route-pending.json`;
  mkdirSync(join(bundlePath, '_diagnostics', 'gates'), { recursive: true });
  const bundle = readBundleName(bundlePath);
  writeFileSync(join(bundlePath, diagnosticPath), JSON.stringify({
    schema_version: '1.0.0',
    kind: 'setup_ready_route_pending',
    created_at: iso,
    bundle,
    gate_attempt_id: gateAttemptId,
    route_state: 'pending',
    content_evaluation_ref: {
      gate: result.check.gate,
      passed: result.check.passed,
      currentNodeRef: result.check.currentNodeRef,
      candidate_next: result.check.next,
    },
    inspect: result.inspect,
    advice: result.advice,
  }, null, 2));
  logToRun(bundlePath, 'info', 'route_pending', { gate: result.check.gate, gate_attempt_id: gateAttemptId, diagnostic_path: diagnosticPath });
  return diagnosticPath;
}

function writeSetupRoutePendingCheckpoint(bundlePath, result, gateAttemptId) {
  const iso = new Date().toISOString();
  const isoFile = iso.replace(/:/g, '-');
  const ckptDir = join(bundlePath, '_checkpoints');
  mkdirSync(ckptDir, { recursive: true });
  const plan = planHashRecord(bundlePath);
  const manifest = {
    schema_version: '1.0.0',
    created_at: iso,
    bundle: readBundleName(bundlePath),
    trigger: 'setup_route_pending',
    gate_attempt_id: gateAttemptId,
    route_state: 'pending',
    content_evaluation_ref: {
      gate: result.check.gate,
      passed: result.check.passed,
      currentNodeRef: result.check.currentNodeRef,
      candidate_next: result.check.next,
    },
    hashes: { 'rb_plan.md': plan },
  };
  const filename = `${isoFile}-setup-ready.json`;
  writeFileSync(join(ckptDir, filename), JSON.stringify(manifest, null, 2), { flag: 'wx' });
  return { checkpoint_ref: `_checkpoints/${filename}`, plan_sha256: plan.sha256 };
}

// Setup-ready alone needs final host-file bytes to be bound before exposing
// check.next. It deliberately returns an outcome instead of throwing, so its
// caller cannot accidentally create a second ordinary audit/checkpoint.
function writeSetupReadyStagedAttempt(bundlePath, result) {
  const { check } = result;
  if (check?.gate !== 'setup-ready' || check.passed !== true || !check.next) {
    return { ok: false, finding: setupRoutePersistenceFinding(bundlePath, result, 'staged-input', new Error('setupReadyStaged requires a passed setup-ready result with check.next')) };
  }
  const gateAttemptId = randomUUID();
  try {
    const diagnosticPath = writeSetupRoutePendingDiagnostic(bundlePath, result, gateAttemptId);
    const progress = writePlanProgress(bundlePath, check.gate);
    const binding = writeSetupRoutePendingCheckpoint(bundlePath, result, gateAttemptId);
    const traceEntry = {
      ts: new Date().toISOString(),
      bundle: readBundleName(bundlePath),
      event: 'gate_attempt',
      kind: 'gate_attempt',
      gate: check.gate,
      phase: derivePhaseFromGate(check.gate),
      passed: true,
      currentNodeRef: check.currentNodeRef,
      next: check.next,
      inspect_count: result.inspect.length,
      advice_count: result.advice.length,
      diagnostic_path: diagnosticPath,
      gate_attempt_id: gateAttemptId,
      checkpoint_ref: binding.checkpoint_ref,
      plan_sha256: binding.plan_sha256,
    };
    appendFileSync(join(bundlePath, 'rb_trace.jsonl'), `${JSON.stringify(traceEntry)}\n`);
    return { ok: true, gate_attempt_id: gateAttemptId, checkpoint_ref: binding.checkpoint_ref, plan_sha256: binding.plan_sha256, progress };
  } catch (error) {
    return { ok: false, gate_attempt_id: gateAttemptId, finding: setupRoutePersistenceFinding(bundlePath, result, 'route_handoff', error) };
  }
}

/**
 * Write a checkpoint manifest at _checkpoints/<iso>-<gate>.json after a gate attempt.
 * Called from writeGateAttempt(). Never throws — failures silently ignored.
 *
 * Manifest records schema_version, created_at, bundle, trigger, gate_result_ref,
 * normalized_target, status_snapshot, topic_registry_summary, queue_summary,
 * artifact_inventory, cursors (ledger/trace/log line counts), and hashes
 * (sha256/size/mtime for control files). No artifact content copying.
 *
 * @param {string} bundlePath
 * @param {object} result — gate result from buildGateResult()
 * @returns {void}
 *
 * @impl RRD-001
 */
export function writeCheckpointManifest(bundlePath, result) {
  try {
    const { check } = result;
    const iso = new Date().toISOString();
    const isoFile = iso.replace(/:/g, '-');
    const ckptDir = join(bundlePath, '_checkpoints');
    mkdirSync(ckptDir, { recursive: true });

    const bundle = (() => {
      try { return readBundleName(bundlePath); } catch { return basename(bundlePath); }
    })();

    // ── normalized_target from manifest ──
    let normalizedTarget = null;
    try {
      const manifest = loadManifest();
      const phase = manifest.phases.find(p => p.gate === check.gate);
      if (phase) {
        const phaseKey = basename(phase.node, '.md').replace(/^phase-/, '');
        normalizedTarget = {
          status_gate: (check.gate || '').replace(/-/g, '_'),
          gate_key: check.gate,
          node_ref: phase.node,
          phase_key: phaseKey,
        };
      }
    } catch { /* manifest load failure → normalized_target stays null */ }

    // ── status snapshot ──
    let statusSnapshot = null;
    try {
      const sp = join(bundlePath, 'rb_status.json');
      if (existsSync(sp)) {
        const raw = JSON.parse(readFileSync(sp, 'utf-8'));
        statusSnapshot = {
          current_gate: raw.current_gate || null,
          next_gate: raw.next_gate || null,
          state: raw.state || null,
        };
      }
    } catch { /* ignore */ }

    // ── topic registry summary ──
    let topicRegistrySummary = null;
    try {
      const pp = join(bundlePath, 'rb_plan.md');
      if (existsSync(pp)) {
        const fm = parseMdFrontmatter(readFileSync(pp, 'utf-8'));
        if (fm.topic_registry && Array.isArray(fm.topic_registry)) {
          topicRegistrySummary = {
            count: fm.topic_registry.length,
            slugs: fm.topic_registry.map(t => t.slug).filter(Boolean),
          };
        }
      }
    } catch { /* ignore */ }

    // ── queue summary ──
    let queueSummary = null;
    try {
      const qp = join(bundlePath, 'rb_queue.json');
      if (existsSync(qp)) {
        const q = JSON.parse(readFileSync(qp, 'utf-8'));
        const activeCount = Array.isArray(q.active_window) ? q.active_window.length : 0;
        const inFlightCount = q.delegated_in_flight && typeof q.delegated_in_flight === 'object'
          ? Object.keys(q.delegated_in_flight).length
          : 0;
        queueSummary = {
          queue_health: q.queue_health || null,
          active_count: activeCount,
          delegated_in_flight_count: inFlightCount,
          pool_count: Array.isArray(q.refill_pool) ? q.refill_pool.length : 0,
        };
      }
    } catch { /* ignore */ }

    // ── artifact inventory (one level deep for seed_topics/ and reference/) ──
    const artifactInventory = {};
    const shallowDirs = ['seed_topics', 'reference'];
    for (const dir of shallowDirs) {
      const dp = join(bundlePath, dir);
      if (existsSync(dp) && statSync(dp).isDirectory()) {
        try {
          artifactInventory[dir] = readdirSync(dp).filter(f => {
            try { return statSync(join(dp, f)).isFile(); } catch { return false; }
          });
        } catch { artifactInventory[dir] = []; }
      }
    }
    // Recursive for artifacts/
    const artifactsDir = join(bundlePath, 'artifacts');
    if (existsSync(artifactsDir) && statSync(artifactsDir).isDirectory()) {
      const walk = (dir, base) => {
        const result = [];
        try {
          for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const rel = join(base, entry.name);
            if (entry.isFile()) result.push(rel);
            else if (entry.isDirectory()) result.push(...walk(join(dir, entry.name), rel));
          }
        } catch { /* ignore */ }
        return result;
      };
      artifactInventory['artifacts'] = walk(artifactsDir, 'artifacts');
    }

    // ── cursors ──
    const cursors = {};
    const cursorFiles = {
      ledger_lines: join(bundlePath, 'rb_output_declarations.jsonl'),
      trace_lines: join(bundlePath, 'rb_trace.jsonl'),
      log_lines: join(bundlePath, '_logs', 'run.log'),
    };
    for (const [key, fp] of Object.entries(cursorFiles)) {
      try {
        if (existsSync(fp)) {
          cursors[key] = readFileSync(fp, 'utf-8').split('\n').filter(l => l.trim()).length;
        } else {
          cursors[key] = 0;
        }
      } catch { cursors[key] = -1; }
    }

    // ── hashes for control files ──
    const hashes = {};
    const controlFiles = ['rb_status.json', 'rb_queue.json', 'rb_plan.md', 'rb_profile.yaml', 'rb_output_declarations.jsonl'];
    for (const cf of controlFiles) {
      const fp = join(bundlePath, cf);
      try {
        if (existsSync(fp)) {
          const content = readFileSync(fp);
          const st = statSync(fp);
          hashes[cf] = {
            sha256: createHash('sha256').update(content).digest('hex'),
            size: st.size,
            mtime: st.mtime.toISOString(),
          };
        }
      } catch { /* skip unreadable control file */ }
    }

    // ── Write manifest ──
    const manifest = {
      schema_version: '1.0.0',
      created_at: iso,
      bundle,
      trigger: 'gate_attempt',
      gate_result_ref: {
        gate: check.gate,
        passed: check.passed,
        currentNodeRef: check.currentNodeRef,
        next: check.next,
        degraded: check.degraded === true,
      },
      normalized_target: normalizedTarget,
      status_snapshot: statusSnapshot,
      topic_registry_summary: topicRegistrySummary,
      queue_summary: queueSummary,
      artifact_inventory: artifactInventory,
      cursors,
      hashes,
    };

    const ckptPath = join(ckptDir, `${isoFile}-${check.gate}.json`);
    writeFileSync(ckptPath, JSON.stringify(manifest, null, 2));
  } catch {
    // Checkpoint write failure silently ignored — must not affect gate output
  }
}

// ─── Gate Failure Diagnostics ─────────────────────────────────────────────

/**
 * Write full gate failure diagnostics to _diagnostics/gates/<iso>-<gate>.json.
 * Called from writeGateAttempt() when check.passed === false.
 *
 * Preserves the complete check/routing/inspect/advice for post-mortem debugging.
 * Also writes a compact trace event pointing to the diagnostic artifact so
 * rb_trace.jsonl stays lean while providing a durable pointer.
 *
 * @param {string} bundlePath
 * @param {object} result — gate result from buildGateResult()
 * @param {string} [precomputedPath] — optional precomputed diagnostic path to avoid recomputing ISO timestamp
 * @returns {{ ok: boolean, path?: string, reason?: string }}
 *
 * @impl RRD-004
 */
export function writeGateFailureDiagnostic(bundlePath, result, precomputedPath = null) {
  try {
    const { check, routing, inspect, advice, hints = [] } = result;
    if (check.passed) return { ok: true }; // Only write on failure

    const iso = new Date().toISOString();
    const isoFile = iso.replace(/:/g, '-');
    const diagDir = join(bundlePath, '_diagnostics', 'gates');
    mkdirSync(diagDir, { recursive: true });

    const bundle = (() => {
      try { return readBundleName(bundlePath); } catch { return basename(bundlePath); }
    })();

    const diagnosticPath = precomputedPath || `_diagnostics/gates/${isoFile}-${check.gate}.json`;

    const diagnostic = {
      schema_version: '1.0.0',
      kind: 'gate_failure_detail',
      created_at: iso,
      bundle,
      source_event_ref: null, // filled by caller if trace entry was written first
      gate: check.gate,
      currentNodeRef: check.currentNodeRef,
      check,
      routing,
      inspect,
      advice,
      hints,
    };

    writeFileSync(join(bundlePath, diagnosticPath), JSON.stringify(diagnostic, null, 2));

    // Write compact trace pointer
    try {
      const tracePath = join(bundlePath, 'rb_trace.jsonl');
      const traceEntry = JSON.stringify({
        ts: iso,
        bundle,
        event: 'diagnostic',
        kind: 'gate_failure_detail',
        gate: check.gate,
        passed: false,
        diagnostic_path: diagnosticPath,
      });
      appendFileSync(tracePath, traceEntry + '\n');
    } catch { /* trace write failure silently ignored */ }

    return { ok: true, path: diagnosticPath };
  } catch (err) {
    const safeMsg = (err.message || String(err)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
    return { ok: false, reason: safeMsg };
  }
}

/**
 * Write a lightweight gate pass diagnostic to _diagnostics/gates/<iso>-<gate>.json.
 * Called from writeGateAttempt() when check.passed === true.
 *
 * Contains schema_version, created_at, bundle, gate, passed: true, and a
 * rules_summary for before/after comparison across attempts.
 *
 * @param {string} bundlePath
 * @param {object} result — gate result from buildGateResult()
 * @param {string} [precomputedPath] — optional precomputed diagnostic path
 * @returns {{ ok: boolean, path?: string, reason?: string }}
 *
 * @impl TRW-004
 */
export function writeGatePassDiagnostic(bundlePath, result, precomputedPath = null) {
  try {
    const { check, routing, inspect = [], advice = [], hints = [] } = result;
    if (!check.passed) return { ok: true }; // Only write on pass

    const iso = new Date().toISOString();
    const isoFile = iso.replace(/:/g, '-');
    const diagDir = join(bundlePath, '_diagnostics', 'gates');
    mkdirSync(diagDir, { recursive: true });

    const bundle = (() => {
      try { return readBundleName(bundlePath); } catch { return basename(bundlePath); }
    })();

    const diagnosticPath = precomputedPath || `_diagnostics/gates/${isoFile}-${check.gate}.json`;

    const diagnostic = {
      schema_version: '1.0.0',
      created_at: iso,
      bundle,
      gate: check.gate,
      passed: true,
      phase: derivePhaseFromGate(check.gate),
      degraded: check.degraded === true,
      check,
      inspect,
      advice,
      hints,
      rules_summary: {
        currentNodeRef: check.currentNodeRef,
        next: check.next,
        routing_kind: routing.kind,
      },
    };

    writeFileSync(join(bundlePath, diagnosticPath), JSON.stringify(diagnostic, null, 2));
    return { ok: true, path: diagnosticPath };
  } catch (err) {
    const safeMsg = (err.message || String(err)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
    return { ok: false, reason: safeMsg };
  }
}

// ─── Plan Progress Writer ────────────────────────────────────────────────────

/**
 * Flip a gate's checkbox in rb_plan.md ## Progress section.
 *
 * Reads the plan file, finds the Progress section, and flips the line matching
 * the given gate from `- [ ]` to `- [x] <gate> (<ISO8601 ts>)`. Idempotent:
 * if already `- [x]`, updates the timestamp without duplicating. If the gate
 * is not found in the pre-populated checklist, appends a new checked line.
 *
 * Wrapped in try/catch — failure to update Progress MUST NOT affect gate
 * output or exit code.
 *
 * @param {string} bundlePath — path to the active runtime context
 * @param {string} gateName — e.g. 'setup-ready'
 * @returns {void}
 *
 * @impl PHS-006
 */
export function writePlanProgress(bundlePath, gateName) {
  try {
    const planPath = join(bundlePath, 'rb_plan.md');
    if (!existsSync(planPath)) return { outcome: 'failed', reason: 'plan_missing' };
    const content = readFileSync(planPath, 'utf-8');
    const ts = new Date().toISOString();
    const checkedLine = `- [x] ${gateName} (${ts})`;
    const uncheckedPattern = `- [ ] ${gateName}`;
    const checkedPattern = `- [x] ${gateName}`;

    const section = canonicalSectionContent(content, 'Progress');
    if (!section) return { outcome: 'failed', reason: 'canonical_progress_missing' };
    const leadingBlank = section.content.startsWith('\n');
    const lines = section.content.trim().split('\n');
    let found = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(uncheckedPattern)) {
        lines[i] = checkedLine;
        found = true;
        break;
      }
      if (lines[i].includes(checkedPattern)) {
        // Already checked — update timestamp only
        lines[i] = checkedLine;
        found = true;
        break;
      }
    }

    if (!found) {
      // Gate not in pre-populated list — append
      lines.unshift(checkedLine);
    }

    const updatedSection = `${leadingBlank ? '\n' : ''}${lines.join('\n')}\n`;
    const next = `${content.slice(0, section.contentStart)}${updatedSection}${content.slice(section.end)}`;
    if (next === content) return { outcome: 'unchanged' };
    const tempPath = `${planPath}.progress-${process.pid}-${Date.now()}.tmp`;
    try {
      writeFileSync(tempPath, next, { flag: 'wx' });
      renameSync(tempPath, planPath);
    } finally {
      if (existsSync(tempPath)) rmSync(tempPath, { force: true });
    }
    return { outcome: 'committed' };
  } catch (error) {
    return { outcome: 'failed', reason: error.message || String(error) };
  }
}

// ─── Trace Reading ─────────────────────────────────────────────────────────

/**
 * Read trace events from rb_trace.jsonl, optionally filtered by event name.
 * Wave and seed-topics gate CLIs are the first to read rb_trace.jsonl
 * (pre-research gates only wrote to it). This shared reader avoids
 * duplicating JSONL parsing across 4 CLIs (3 wave + 1 seed-topics).
 *
 * @param {string} bundlePath — path to the active runtime context
 * @param {string|null} eventName — if provided, only return events matching this name
 * @returns {object[]}
 */
export function readTraceEvents(bundlePath, eventName = null) {
  const tracePath = join(bundlePath, 'rb_trace.jsonl');
  if (!existsSync(tracePath)) return [];
  const raw = readFileSync(tracePath, 'utf-8').trim();
  if (!raw) return [];
  const events = raw.split('\n').map(line => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);
  if (eventName) return events.filter(e => e.event === eventName);
  return events;
}
