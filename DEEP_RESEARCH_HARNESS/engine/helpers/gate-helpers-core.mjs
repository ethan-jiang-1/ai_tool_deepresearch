// gate-helpers-core.mjs — Gate CLI lifecycle: args, loading, routing, results, trace, checkpoints
// @impl GSK-001, GSK-002, GSK-004, SWE-001
// Canonical location: DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-core.mjs
//
// Re-exported by gate-helpers.mjs for backward compatibility.

// Navigation: public API — parseGateCliArgs, loadGateDefinition, tryLoadGateDefinition, loadManifest, checkNodeGateBinding, validateNodeGateBinding, resolveRouting, projectGateHints, buildGateResult, emitGateResult, derivePhaseFromGate, writeGateAttempt, writeCheckpointManifest, writeGateFailureDiagnostic, …

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


export const __dirname = dirname(fileURLToPath(import.meta.url));

export const WORKFLOW_NODES_DIR = join(__dirname, '..', '..', 'workflows', 'nodes');

// Facade re-exports: public names whose implementations moved to the carved modules (W3b).
export {
  parseGateCliArgs,
  loadGateDefinition,
  tryLoadGateDefinition,
  loadManifest,
  checkNodeGateBinding,
  validateNodeGateBinding,
  resolveRouting,
} from './gate-helpers-invocation.mjs';
export {
  projectGateHints,
  buildGateResult,
} from './gate-helpers-result.mjs';
export {
  emitGateResult,
  derivePhaseFromGate,
  writeGateAttempt,
  writeCheckpointManifest,
  writeGateFailureDiagnostic,
  writeGatePassDiagnostic,
} from './gate-helpers-attempt-audit.mjs';
export {
  writePlanProgress,
  readTraceEvents,
  readCanonicalTraceEvents,
} from './gate-helpers-plan-progress.mjs';
