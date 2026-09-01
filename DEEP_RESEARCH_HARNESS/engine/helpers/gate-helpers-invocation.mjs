// gate-helpers-invocation.mjs
// CLI invocation, definition loading, node binding, and routing (W3 carve).
// @impl GSK-002, GSK-003, GSK-010

import { parseArgs } from 'node:util';
import { existsSync, readFileSync, writeFileSync, appendFileSync, readdirSync, statSync, mkdirSync, openSync, closeSync, renameSync, rmSync } from 'node:fs';
import { join, dirname, basename, relative, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { parse as parseYaml } from 'yaml';
import { readGateDefinitionSnapshot } from '../../schema/contracts/gate-definition.mjs';
import { resolveNodeTransitionDetailed } from '../ask-next.mjs';
import { parseMdFrontmatter } from './gate-helpers-readers.mjs';
import { isValidCarriedTargetReceipt } from './wave-carried-target-receipts.mjs';
import { validateCompositionHandoffReceipt } from './composition-handoff.mjs';
import { continuationForGateResult } from './continuation-cue.mjs';
import {
  buildContractEvaluation,
  makeContractFinding,
  projectFindingCompatibility,
} from './wave-contract-findings.mjs';
import { canonicalSectionContent } from './plan-hostfile-sections.mjs';
import {
  buildGateResult,
} from './gate-helpers-result.mjs';
import {
  __dirname,
} from './gate-helpers-core.mjs';

export function gateHelperFailure(input) {
  return projectFindingCompatibility(makeContractFinding({
    findingSource: 'checker',
    classification: 'blocking',
    ...input,
  }));
}

export function gateFailureResult({ gate, currentNodeRef, routing, failure, bundlePath = null }) {
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

export function extractAttemptFromArgv(argv) {
  const idx = argv.indexOf('--attempt');
  if (idx === -1) return undefined;
  if (idx >= argv.length - 1) return '';
  const next = argv[idx + 1];
  // If next value looks like another option, treat as bare flag
  if (next.startsWith('-')) return '';
  return next;
}

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
      expected: 'A selected current run bundle path supplied through --bundle.',
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

export function loadGateDefinition(gateKey) {
  const defPath = join(__dirname, '..', '..', 'schema', 'gate_definitions', `gate-${gateKey}.definition.json`);
  return readGateDefinitionSnapshot(defPath).definition;
}

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

export function loadManifest() {
  const manifestPath = join(__dirname, '..', '..', 'workflows', 'manifest.json');
  const raw = readFileSync(manifestPath, 'utf-8');
  return JSON.parse(raw);
}

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
