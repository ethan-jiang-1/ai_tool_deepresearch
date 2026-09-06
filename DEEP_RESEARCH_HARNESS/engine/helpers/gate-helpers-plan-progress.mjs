// gate-helpers-plan-progress.mjs
// Plan progress + trace event readers (W3 carve).
// @impl GSK-013, PHS-006, PHS-010

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

// Gates a rerun cycle re-executes, in manifest lifecycle order. Used to
// pre-populate a newly spawned cycle block and by reconcile to rebuild one.
export const CYCLE_PROGRESS_GATES = [
  'seed-topics-ready',
  'wave0-complete',
  'wave1-complete',
  'wave2-complete',
  'hitl2-recorded',
  'readiness-passed',
  'rerun-ready',
];

// Engine-owned cycle block header format: `### Rerun cycle <N> (spawned <ISO ts>)`.
const CYCLE_HEADER_PATTERN = /^### Rerun cycle (\d+) \(spawned (.+)\)$/;

// Partition Progress section lines into blocks: a baseline block (no header)
// followed by zero or more cycle blocks. Header lines are kept on the block so
// the section can be rebuilt verbatim. Trailing blank lines are dropped from a
// block when the next header starts — the rebuild re-emits exactly one blank
// separator before each header, keeping parse(rebuild(x)) == x stable across
// repeated gate passes.
function parseProgressBlocks(lines) {
  const blocks = [];
  let current = { header: null, ordinal: 0, spawnTs: null, lines: [] };
  blocks.push(current);
  for (const line of lines) {
    const match = line.match(CYCLE_HEADER_PATTERN);
    if (match) {
      while (current.lines.length > 0 && current.lines[current.lines.length - 1].trim() === '') {
        current.lines.pop();
      }
      current = { header: line, ordinal: Number(match[1]), spawnTs: match[2], lines: [] };
      blocks.push(current);
      continue;
    }
    current.lines.push(line);
  }
  return blocks;
}

// Flip the first line whose trimmed text is `- [ ] <gate>` / `- [x] <gate>`
// (with optional parenthesized timestamp) into `checkedLine`. Boundary-anchored
// so `seed-topics-ready` never matches `seed-topics` style prefixes.
function flipGateLine(lines, gateName, checkedLine) {
  const pattern = new RegExp(`^\\s*-\\s*\\[[ x]\\]\\s*${gateName}(?:\\s*\\(|\\s*$)`);
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      lines[i] = checkedLine;
      return true;
    }
  }
  return false;
}

export function writePlanProgress(bundlePath, gateName) {
  try {
    const planPath = join(bundlePath, 'rb_plan.md');
    if (!existsSync(planPath)) return { outcome: 'failed', reason: 'plan_missing' };
    const content = readFileSync(planPath, 'utf-8');
    const ts = new Date().toISOString();
    const checkedLine = `- [x] ${gateName} (${ts})`;

    const section = canonicalSectionContent(content, 'Progress');
    if (!section) return { outcome: 'failed', reason: 'canonical_progress_missing' };

    const rawLines = section.content.split('\n');
    const leadingBlank = rawLines.length > 0 && rawLines[0] === '';
    const lines = section.content.trim().split('\n');

    const blocks = parseProgressBlocks(lines);
    // Current block = last cycle block, or the baseline block while no cycle
    // block exists (lifecycle is strictly sequential per cycle).
    const current = blocks[blocks.length - 1];

    // A `rerun-ready` pass grows the Progress section: after flipping, spawn
    // the next cycle block pre-populated unchecked. Spawn is a transition
    // effect — it fires only when this call flips the current block's
    // `rerun-ready` line from unchecked to checked AND the next-ordinal block
    // is not already present. A refresh of an already-checked line never
    // spawns, so re-running the gate updates the timestamp without
    // duplicating the block.
    const hadUncheckedRerunReady = gateName === 'rerun-ready'
      && current.lines.some((line) => /^\s*-\s*\[\s\]\s*rerun-ready(?:\s*\(|\s*$)/.test(line));

    // Flip in the current block; append a checked line there when the gate is
    // not pre-listed (compatible with the historical whole-section append).
    if (!flipGateLine(current.lines, gateName, checkedLine)) {
      current.lines.push(checkedLine);
    }

    if (gateName === 'rerun-ready' && hadUncheckedRerunReady) {
      const maxOrdinal = blocks.reduce((max, block) => Math.max(max, block.ordinal), 0);
      const nextOrdinal = maxOrdinal + 1;
      const alreadySpawned = blocks.some((block) => block.ordinal === nextOrdinal);
      if (!alreadySpawned) {
        const block = {
          header: `### Rerun cycle ${nextOrdinal} (spawned ${ts})`,
          ordinal: nextOrdinal,
          spawnTs: ts,
          lines: [],
        };
        for (const gate of CYCLE_PROGRESS_GATES) block.lines.push(`- [ ] ${gate}`);
        blocks.push(block);
      }
    }

    // Rebuild the section content, keeping the historical leading blank.
    const parts = [];
    for (const block of blocks) {
      if (block.header) {
        if (parts.length > 0) parts.push('');
        parts.push(block.header);
      }
      parts.push(...block.lines);
    }
    const updatedSection = `${leadingBlank ? '\n' : ''}${parts.join('\n')}\n`;
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
