// assemble-delta.mjs — C3d: AGQ "Producer rule topic_deepening"（294 行）拆为 3 个主题 requirement。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const mainPath = 'openspec/specs/agent/agentic-queue/spec.md';
const lines = readFileSync(mainPath, 'utf8').split('\n');

const oldHeading = '### Requirement: Producer rule topic_deepening';
const paras = {
  D1: ['The Agentic Queue system SHALL recognize `topic_deepening` as a valid', 'A primary paired-artifact task card with `producer_rule: topic_deepening` SHALL', '| Field | Required | Default / Derived From |', '`payload.assignment_mode` SHALL be a closed `primary|supplementary`', 'An explicitly supplementary `topic_deepening` task that only acquires new', 'When the Wave1 reference-convergence evaluator has exhausted current submitted', 'The paired and supplementary shapes SHALL be selected from `assignment_mode`'],
  D2: ['An already-enqueued, not-yet-claimed Wave1 item that lacks `assignment_mode`', 'Assignment-mode repair SHALL target exactly one `status: queued`', 'Before mutation, repair SHALL clone the loaded queue', 'Successful repair SHALL append one structured `queue_assignment_mode_repaired`'],
  D3: ['For a multi-item work-unit claim, the Engine SHALL validate assignment mode,', 'Task cards with `producer_rule: topic_deepening` SHALL NOT predeclare'],
};
const scenRanges = { D1: [[0, 5]], D2: [[6, 14]], D3: [[15, 15]] };
const newHeadings = {
  D1: 'Producer rule topic_deepening SHALL bind primary paired or supplementary deepening demand',
  D2: 'Assignment-mode repair SHALL stay a single audited queue repair operation',
  D3: 'Multi-item topic_deepening claims SHALL validate assignment modes without partial allocation',
};

const s = lines.indexOf(oldHeading);
if (s === -1) throw new Error('old heading not found');
let e = lines.length;
for (let i = s + 1; i < lines.length; i++) if (lines[i].startsWith('### Requirement: ')) { e = i; break; }
while (e > s && lines[e - 1].trim() === '') e--;
const removedBlock = lines.slice(s, e);
const removedLines = removedBlock.filter(l => l.trim() !== '' && !l.startsWith('### Requirement: '));

const body = lines.slice(s + 1, e);
const units = []; let cur = null;
for (const l of body) {
  if (l.trim() === '') { if (cur) { units.push(cur); cur = null; } continue; }
  if (l.startsWith('#### Scenario: ')) { if (cur) units.push(cur); cur = [l]; continue; }
  if (!cur) cur = [l]; else cur.push(l);
}
if (cur) units.push(cur);
const merged = [];
for (const u of units) {
  if (merged.length && !u[0].startsWith('#### Scenario: ') && (u[0].startsWith('- ') || u[0].startsWith('> ') || /^\d+\.\s/.test(u[0]))) merged[merged.length - 1].push(...u);
  else merged.push(u);
}
const prose = merged.filter(u => !u[0].startsWith('#### Scenario: '));
const scen = merged.filter(u => u[0].startsWith('#### Scenario: '));
const assignedP = new Map(); const assignedS = new Map();
for (const p of prose) {
  const grp = Object.keys(paras).find(k => paras[k].some(pre => p[0].startsWith(pre)));
  if (!grp) throw new Error('unmapped prose: ' + JSON.stringify(p[0].slice(0, 70)));
  if (!assignedP.has(grp)) assignedP.set(grp, []);
  assignedP.get(grp).push(p);
}
let declared = 0;
for (const [grp, ranges] of Object.entries(scenRanges)) {
  for (const r of ranges) for (let i = r[0]; i <= r[1]; i++) {
    if (!assignedS.has(grp)) assignedS.set(grp, []);
    assignedS.get(grp).push(scen[i]); declared++;
  }
}
if (declared !== scen.length) throw new Error(`declared ${declared} != actual ${scen.length}`);

const out = ['## REMOVED Requirements', '', ...removedBlock, '', '## ADDED Requirements', ''];
const addedBlocks = [];
for (const key of Object.keys(newHeadings)) {
  addedBlocks.push('### Requirement: ' + newHeadings[key], '');
  for (const p of (assignedP.get(key) || [])) { addedBlocks.push(...p, ''); }
  for (const u of (assignedS.get(key) || [])) { addedBlocks.push(...u, ''); }
  while (addedBlocks.length && addedBlocks[addedBlocks.length - 1].trim() === '') addedBlocks.pop();
  addedBlocks.push('');
}
const content = arr => arr.filter(l => l.trim() !== '' && !l.startsWith('### Requirement: ') && !l.startsWith('## '));
const count = arr => { const m = new Map(); for (const l of arr) m.set(l, (m.get(l) || 0) + 1); return m; };
const a = count(content(removedLines)); const b = count(content(addedBlocks));
let bad = 0;
for (const [l, c] of a) if ((b.get(l) || 0) !== c) { bad++; if (bad < 4) console.error('MISSING:', JSON.stringify(l.slice(0, 70))); }
for (const [l, c] of b) if ((a.get(l) || 0) !== c) { bad++; if (bad < 4) console.error('EXTRA:', JSON.stringify(l.slice(0, 70))); }
if (bad) throw new Error('conservation failed: ' + bad);
const dir = 'openspec/changes/2026-09-01-slim-agq-requirements/specs/agent/agentic-queue';
mkdirSync(dir, { recursive: true });
writeFileSync(dir + '/spec.md', out.join('\n') + '\n' + addedBlocks.join('\n') + '\n');
console.log('delta OK: 1 block removed (294 lines), 3 added, scenarios:', scen.length, ', conservation 100%');
