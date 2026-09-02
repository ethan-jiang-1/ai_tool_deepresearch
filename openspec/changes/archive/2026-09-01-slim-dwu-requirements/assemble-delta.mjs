// assemble-delta.mjs — C3e: DWU 七条巨无霸拆为 15 个主题 requirement（supersession 136 行保留不动）。
// 硬约束：REMOVED 与 ADDED 内容行多重集合全等（逐字节）。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const mainPath = 'openspec/specs/agent/delegated-work-units/spec.md';
const lines = readFileSync(mainPath, 'utf8').split('\n');

const spec = [
  { old: '### Requirement: Work-unit envelope SHALL carry binding surfaces',
    paras: { a: ['> req: DEW-004', 'Each work-unit envelope SHALL include the Engine-owned', 'Every new claim SHALL write one complete current profile'], b: ['Every Engine reader of a claimed, submitted, timed-out', 'Generated task, starter, checklist and result-schema'] },
    scen: { a: [[0, 3], [9, 11], [21, 21], [23, 24]], b: [[4, 8], [12, 20], [22, 22]] },
    heads: { a: 'Work-unit envelopes SHALL carry Engine-owned index records and complete claim profiles', b: 'Envelope readers and generated projections SHALL stay consistent with the claim profile' } },
  { old: '### Requirement: Submit SHALL be the only successful delegated completion transition',
    paras: { a: ['> req: DEW-005', 'Normal `submit` and the existing audited `late-submit`', 'Before a positive submit, duplicate replay, late-submit'], b: ['For a complete current attempt, the submit owner SHALL'] },
    scen: { a: [[0, 4], [8, 8], [11, 13]], b: [[5, 7], [9, 10], [14, 15]] },
    heads: { a: 'Submit SHALL remain the only successful delegated completion authority', b: 'Successful submit SHALL complete queue demand and record contribution boundaries' } },
  { old: '### Requirement: Work-unit tasks SHALL expose bundle-root absolute pat',
    oldPrefix: '### Requirement: Work-unit tasks SHALL expose bundle-root absolute',
    paras: { a: ['> req: DEW-009', 'Generated work-unit task Markdown and any Agent-facing', 'The task SHALL instruct the actor to use supplied', 'The beacon SHALL remain a read-only binding surface', 'For a current actor-bound production claim, the Engine', 'For each non-empty required_outputs[] entry'], b: ['Existing-authority reads SHALL validate their prerequisite', 'The required verification SHALL cover declared', 'For a current-version work unit, index, manifest and beacon', 'The generated task SHALL require the actor to write', 'Generated guidance SHALL distinguish a current', 'Canonical role/shared guidance SHALL describe'] },
    scen: { a: [[0, 3], [6, 6], [10, 11]], b: [[4, 5], [7, 9], [12, 16]] },
    heads: { a: 'Work-unit tasks SHALL carry absolute bundle-root paths and the read-only beacon', b: 'Task verification and generated guidance SHALL bind required outputs and role contracts' } },
  { old: '### Requirement: Work-unit submit SHALL canonicalize only bounded',
    paras: { a: ['> req: DEW-012', '`operate-work-unit submit` SHALL run a narrow', 'Allowed canonicalization is limited to:', 'Runtime receipt `detail` is optional diagnostic'], b: ['Accepted submit transactions SHALL persist canonical', 'This requirement SHALL NOT remove the existing'] },
    scen: { a: [[0, 7]], b: [[8, 14]] },
    heads: { a: 'Submit canonicalization SHALL stay a narrow bounded stage', b: 'Accepted submits SHALL persist canonical authority without widening the boundary' } },
  { old: '### Requirement: Work-unit dry-submit SHALL preflight',
    paras: { a: ['> req: DEW-013', 'The work-unit CLI SHALL provide a dry-submit preflight', 'Dry-submit and formal submit SHALL obtain `output_files`', 'Dry-submit SHALL be read-only.', 'Dry-submit output SHALL be structured enough', 'Dry-submit SHALL mirror formal submit candidate', 'Dry-submit SHALL avoid validation branches', 'Dry-submit SHALL accumulate independently evaluable'],
      b: ['For the changed submit contract, independent-root', 'Prerequisite short-circuiting SHALL be local.', 'Agent-facing fallback and submit-repair guidance', 'Generated `task.md` guidance SHALL use the same', 'Dry-submit SHALL keep provenance strict.', 'For a current assignment_contract_version, dry-submit', 'Heading level, case, surrounding whitespace', 'Each dry-submit invocation SHALL acquire a fresh', 'The reader contract protects the trusted local', 'The neutral target module SHALL return only', 'Mechanical SHALL apply only to a parseable', 'Dry-submit SHALL combine the complete', 'Generated actor guidance SHALL expose the exact'] },
    scen: { a: [[0, 8]], b: [[9, 28]] },
    heads: { a: 'Dry-submit SHALL be a read-only structured preflight mirroring submit semantics', b: 'Dry-submit SHALL keep provenance strict through one neutral target module' } },
  { old: '### Requirement: Timeout terminalization SHALL be guarded',
    paras: { a: ['> req: DEW-014', 'The work-unit CLI SHALL provide a timeout preflight', 'Timeout preflight SHALL accept an explicit current', '`recommended_action` SHALL be a closed value', 'Timeout-preflight output SHALL be validated', 'The timeout-preflight helper/API SHALL accept', 'Timeout eligibility SHALL be progress-aware.', 'Engine-observed progress SHALL come from'],
      b: ['Timeout preflight SHALL be read-only by default.', 'If a candidate result exists, timeout preflight', '`operate-work-unit timeout` SHALL run the same', 'Any Engine-owned timeout terminalization path', 'The timeout command and Engine/API timeout path', 'When timeout-preflight evaluates a present candidate', 'Unsafe reader roots, contract drift', 'Every emitted timeout preflight result SHALL'] },
    scen: { a: [[0, 7]], b: [[8, 22]] },
    heads: { a: 'Timeout preflight SHALL be a progress-aware read-only recommendation', b: 'Timeout terminalization SHALL run the same guard with explicit audit' } },
  { old: '### Requirement: Submit SHALL expose a bounded integrity preflight',
    paras: { a: ['> req: DEW-023', 'Normal submit and dry-submit SHALL evaluate one shared', 'Work-unit transaction acquisition contention', '`timeout-preflight` SHALL read the same direct'],
      b: ['The transaction helper SHALL expose `journal_disposition`', 'A journal\'s transient `started` state'],
      c: ['The transaction helper SHALL release its owner lock', '`operate-work-unit recover-transaction <bundle>'] },
    scen: { a: [[0, 3]], b: [[4, 11]], c: [[12, 16]] },
    heads: { a: 'Submit integrity SHALL share one read-only transaction fact', b: 'Journal disposition SHALL be a closed enum with declared recovery boundaries', c: 'Transaction recovery SHALL settle journals without stealing locks' } },
];

const out = ['## REMOVED Requirements', ''];
const addedBlocks = [];
const removedLines = [];
let totalScen = 0;
for (const b of spec) {
  const s = lines.findIndex(l => l.startsWith(b.oldPrefix || b.old));
  if (s === -1) throw new Error('heading not found: ' + b.old);
  let e = lines.length;
  for (let i = s + 1; i < lines.length; i++) if (lines[i].startsWith('### Requirement: ')) { e = i; break; }
  while (e > s && lines[e - 1].trim() === '') e--;
  const removedBlock = lines.slice(s, e);
  out.push(...removedBlock, '');
  removedLines.push(...removedBlock.filter(l => l.trim() !== '' && !l.startsWith('### Requirement: ')));
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
    const grp = Object.keys(b.paras).find(k => b.paras[k].some(pre => p[0].startsWith(pre)));
    if (!grp) throw new Error('unmapped prose: ' + JSON.stringify(p[0].slice(0, 70)));
    if (!assignedP.has(grp)) assignedP.set(grp, []);
    assignedP.get(grp).push(p);
  }
  let declared = 0;
  for (const [grp, ranges] of Object.entries(b.scen)) {
    for (const r of ranges) for (let i = r[0]; i <= r[1]; i++) {
      if (!assignedS.has(grp)) assignedS.set(grp, []);
      assignedS.get(grp).push(scen[i]); declared++;
    }
  }
  if (declared !== scen.length) throw new Error(`${b.old.slice(18, 50)}: declared ${declared} != actual ${scen.length}`);
  totalScen += scen.length;
  for (const key of Object.keys(b.heads)) {
    addedBlocks.push('### Requirement: ' + b.heads[key], '');
    for (const p of (assignedP.get(key) || [])) { addedBlocks.push(...p, ''); }
    for (const u of (assignedS.get(key) || [])) { addedBlocks.push(...u, ''); }
    while (addedBlocks.length && addedBlocks[addedBlocks.length - 1].trim() === '') addedBlocks.pop();
    addedBlocks.push('');
  }
}
out.push('## ADDED Requirements', '', ...addedBlocks);
const content = arr => arr.filter(l => l.trim() !== '' && !l.startsWith('### Requirement: ') && !l.startsWith('## '));
const count = arr => { const m = new Map(); for (const l of arr) m.set(l, (m.get(l) || 0) + 1); return m; };
const a = count(content(removedLines)); const b = count(content(addedBlocks));
let bad = 0;
for (const [l, c] of a) if ((b.get(l) || 0) !== c) { bad++; if (bad < 4) console.error('MISSING:', JSON.stringify(l.slice(0, 70))); }
for (const [l, c] of b) if ((a.get(l) || 0) !== c) { bad++; if (bad < 4) console.error('EXTRA:', JSON.stringify(l.slice(0, 70))); }
if (bad) throw new Error('conservation failed: ' + bad);
const dir = 'openspec/changes/2026-09-01-slim-dwu-requirements/specs/agent/delegated-work-units';
mkdirSync(dir, { recursive: true });
writeFileSync(dir + '/spec.md', out.join('\n') + '\n');
console.log('delta OK: 7 blocks removed, 15 added, scenarios:', totalScen, ', conservation 100%');
