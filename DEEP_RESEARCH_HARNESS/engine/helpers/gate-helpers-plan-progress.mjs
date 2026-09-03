// gate-helpers-plan-progress.mjs
// Plan progress + trace event readers (W3 carve).
// @impl GSK-013

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

// @impl TRW-007: trace events count as completion evidence only when they carry the
// canonical bundle identity — the bundle directory basename (e.g. dpt_rb_<name>) —
// NOT the rb_status.json#/bundle short name (which matches forged hand-written events).
// A missing `writer` field is tolerated for pre-change historical events; a present
// `writer` must be a non-empty string to be an accepted trace-writer identity.
export function readCanonicalTraceEvents(bundlePath, eventName = null) {
  const canonicalBundle = basename(bundlePath);
  return readTraceEvents(bundlePath, eventName).filter((entry) => {
    if (entry.bundle !== canonicalBundle) return false;
    if (entry.writer !== undefined) {
      return typeof entry.writer === 'string' && entry.writer.trim().length > 0;
    }
    return true;
  });
}
