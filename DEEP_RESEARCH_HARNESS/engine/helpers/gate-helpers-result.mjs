// gate-helpers-result.mjs
// Result envelope, hints, and continuation projection (W3 carve).
// @impl GSK-004, CHI-003

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
  WORKFLOW_NODES_DIR,
} from './gate-helpers-core.mjs';

export function uniqueMessages(messages) {
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

export function shellArg(value) {
  const text = String(value);
  if (/^[A-Za-z0-9_./:@+-]+$/.test(text)) return text;
  return `'${text.replace(/'/g, `'"'"'`)}'`;
}

export function checkpointRerunCommand({ gate, currentNodeRef, bundlePath, checkpointCommand }) {
  if (typeof checkpointCommand === 'string' && checkpointCommand.trim()) return checkpointCommand.trim();
  const gateKey = typeof gate === 'string' && gate.trim() ? gate.trim() : '<gate-name>';
  const bundleArg = typeof bundlePath === 'string' && bundlePath.trim()
    ? shellArg(resolvePath(bundlePath))
    : '<bundle-path>';
  const nodeArg = typeof currentNodeRef === 'string' && currentNodeRef.trim()
    ? shellArg(currentNodeRef.trim())
    : '<current-node-ref>';
  return `node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-${gateKey}.mjs --bundle ${bundleArg} --current-node ${nodeArg}`;
}

export function printableFact(value) {
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value); } catch { return String(value); }
}

export function missingFactFromFinding(finding) {
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
  // Preserve checker-owned structured detail for the durable diagnostic without
  // expanding the public Gate envelope beyond its existing summary surface.
  Object.defineProperty(result, 'findings', { value: findings, enumerable: false });

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

export function readWorkflowNodeFrontmatter(nodeRef) {
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

export function projectGateContinuation({ passed, gate, currentNodeRef, next }) {
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
