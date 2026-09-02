// assemble-delta.mjs — C3c: RWG 三个巨无霸拆为 7 个主题 requirement。
// 硬约束：内容行逐字节守恒（唯一豁免：M3 已知替换行）。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const mainPath = 'openspec/specs/research/research-wave-gate-implementation/spec.md';
const lines = readFileSync(mainPath, 'utf8').split('\n');

const M3_MARKER = 'SHALL not be a second success predicate';
const M3_NEW = 'The old target expression `reference/*{topic}*.md` SHALL not act as a second success predicate: the gate definition still declares it as the `count_floor` target, and the convergence evaluator preempts that raw count whenever a materialization/backing root exists.';

// 已知替换（M3）：内容守恒检查前对 REMOVED 侧应用
const SUBSTITUTIONS = [[M3_MARKER, M3_NEW]];

const blocks = [
  {
    oldHeading: '### Requirement: Wave1 complete gate rule set',
    paras: {
      A1: ['The Wave1 complete gate definition SHALL include work-unit provenance checks', 'Wave1 reference-format checks SHALL evaluate the existing common metadata keys,', 'The same reviewed-and-manifest-bound submitted-backing reader SHALL select', 'For each current canonical Topic, the gate SHALL obtain current reference-floor', 'The accepted eight-column `reference/_INDEX.md` table remains required for', 'These checks remain deterministic process/structure checks.'],
      A2: ['When a current Topic declares the optional focus-coverage block,', 'A structurally valid `covered` result contributes'],
    },
    scenMap: { A1: [[0, 11]], A2: [[12, 15]] }, // 场景序号闭区间
    newHeadings: {
      A1: 'Wave1 complete gate rule set SHALL validate provenance, depth contracts, and reference format',
      A2: 'Wave1 focus-coverage limit SHALL stay inside the existing degradation partition',
    },
  },
  {
    oldHeading: '### Requirement: Gate CLI evaluates wave1 rules from definition',
    paras: {
      B1: ['The Wave1 gate CLI SHALL evaluate work-unit provenance rule types,', '`question_list_has_four_sections` SHALL use a typed', 'Wave1 semantic Markdown checks SHALL protect'],
      B2: ['Formal gate and side-effect-free Wave1 inspect SHALL consume', 'Wave1 inspect composition SHALL keep', 'The convergence result SHALL return', '1. unusable canonical', 'For this purpose, submitted Wave1 backing', 'When no submitted work-unit row can supply', 'An invalid/missing index table SHALL produce', 'All Wave0/Wave1/Wave2 shared evaluator roots'],
    },
    scenMap: { B1: [[4, 4], [6, 6], [7, 7], [10, 11]], B2: [[0, 3], [5, 5], [8, 9]] },
    newHeadings: {
      B1: 'Wave1 gate CLI SHALL evaluate definition-owned rule families and typed semantic sections',
      B2: 'Wave1 inspect and gate SHALL consume one shared pure convergence result',
    },
  },
  {
    oldHeading: '### Requirement: Blocking judgment contracts SHALL close across producer, authority, checker, diagnostic, and guard',
    paras: {
      C1: ['Each blocking deterministic Wave gate', 'A specialized rule that can fail', 'Blocking rules SHALL protect'],
      C2: ['For Wave1 reference closeout', 'Formal lifecycle checks such as'],
      C3: ['The existing Wave0 source-metadata array fact', 'The work-unit candidate adapter', 'All adapters SHALL call that same', 'Implementation SHALL remove inlined Wave-only'],
    },
    scenMap: { C1: [[3, 3], [4, 6], [8, 8], [9, 9]], C2: [[0, 2], [7, 7], [10, 12], [18, 19]], C3: [[13, 17], [20, 22]] },
    newHeadings: {
      C1: 'Blocking Wave rules SHALL use one closed contract chain with truth-type authority',
      C2: 'Wave1 closeout classification and prerequisite masking SHALL own root short-circuit',
      C3: 'Wave adapters SHALL share one target-level direct-output operation',
    },
  },
];

function unitize(body) {
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
  return merged;
}

const out = ['## REMOVED Requirements', ''];
const addedBlocks = [];
const removedLines = [];
const addedContent = [];
for (const b of blocks) {
  const s = lines.indexOf(b.oldHeading);
  if (s === -1) throw new Error('heading not found: ' + b.oldHeading);
  let e = lines.length;
  for (let i = s + 1; i < lines.length; i++) if (lines[i].startsWith('### Requirement: ')) { e = i; break; }
  while (e > s && lines[e - 1].trim() === '') e--;
  const removedBlock = lines.slice(s, e);
  out.push(...removedBlock, '');
  removedLines.push(...removedBlock.filter(l => l.trim() !== '' && !l.startsWith('### Requirement: ')));
  const units = unitize(lines.slice(s + 1, e));
  const prose = units.filter(u => !u[0].startsWith('#### Scenario: '));
  const scen = units.filter(u => u[0].startsWith('#### Scenario: '));
  const nameOf = u => u[0].slice('#### Scenario: '.length);
  const assignedP = new Map(); const assignedS = new Map();
  for (const p of prose) {
    const grp = Object.keys(b.paras).find(k => b.paras[k].some(pre => p[0].startsWith(pre)));
    if (!grp) throw new Error('unmapped prose: ' + JSON.stringify(p[0].slice(0, 70)));
    if (!assignedP.has(grp)) assignedP.set(grp, []);
    assignedP.get(grp).push(p);
  }
  for (const [grp, ranges] of Object.entries(b.scenMap)) {
    for (const r of ranges) {
      if (!Array.isArray(r)) continue;
      for (let i = r[0]; i <= r[1]; i++) {
        if (!assignedS.has(grp)) assignedS.set(grp, []);
        assignedS.get(grp).push(scen[i]);
      }
    }
  }
  const declared = Object.values(b.scenMap).flat().filter(Array.isArray).reduce((acc, r) => acc + r[1] - r[0] + 1, 0);
  if (declared !== scen.length) throw new Error(`${b.oldHeading.slice(18, 50)}: declared ${declared} != actual ${scen.length}`);
  for (const key of Object.keys(b.newHeadings)) {
    addedBlocks.push('### Requirement: ' + b.newHeadings[key], '');
    addedContent.push('### Requirement: ' + b.newHeadings[key]);
    for (const p of (assignedP.get(key) || [])) {
      let lines2 = p;
      if (SUBSTITUTIONS.length) {
        lines2 = p.map(l => {
          for (const [marker, rep] of SUBSTITUTIONS) if (l.includes(marker)) return rep;
          return l;
        });
      }
      addedBlocks.push(...lines2, ''); addedContent.push(...lines2);
    }
    for (const u of (assignedS.get(key) || [])) { addedBlocks.push(...u, ''); addedContent.push(...u); }
    while (addedBlocks.length && addedBlocks[addedBlocks.length - 1].trim() === '') addedBlocks.pop();
    addedBlocks.push('');
  }
}
out.push('## ADDED Requirements', '', ...addedBlocks);
const content = arr => arr.filter(l => l.trim() !== '' && !l.startsWith('### Requirement: ') && !l.startsWith('## '));
const count = arr => { const m = new Map(); for (const l of arr) m.set(l, (m.get(l) || 0) + 1); return m; };
const a = count(content(removedLines).map(l => { for (const [marker, rep] of SUBSTITUTIONS) if (l.includes(marker)) return rep; return l; }));
const b = count(content(addedBlocks));
let bad = 0;
for (const [l, c] of a) if ((b.get(l) || 0) !== c) { bad++; if (bad < 4) console.error('MISSING:', JSON.stringify(l.slice(0, 70))); }
for (const [l, c] of b) if ((a.get(l) || 0) !== c) { bad++; if (bad < 4) console.error('EXTRA:', JSON.stringify(l.slice(0, 70))); }
if (bad) throw new Error('conservation failed: ' + bad + ' | removedDistinct=' + a.size + ' addedDistinct=' + b.size);
const dir = 'openspec/changes/2026-09-01-slim-rwg-requirements/specs/research/research-wave-gate-implementation';
mkdirSync(dir, { recursive: true });
writeFileSync(dir + '/spec.md', out.join('\n') + '\n');
console.log('delta OK: 3 blocks removed, 7 added, conservation 100% (含 M3 已知替换)');
