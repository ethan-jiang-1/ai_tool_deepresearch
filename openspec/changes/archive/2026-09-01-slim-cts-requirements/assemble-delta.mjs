// assemble-delta.mjs — C3b: 将 CTS 两个巨无霸 requirement 拆为 7 个主题 requirement。
// 硬约束：内容行逐字节守恒（非空、非标题行多重集合全等），场景全数映射，未知即失败。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const mainPath = 'openspec/specs/research/canonical-topic-state/spec.md';
const lines = readFileSync(mainPath, 'utf8').split('\n');

const headings = {
  B3R1: 'Topic-state apply SHALL run one atomic prepared workspace with exact recovery',
  B3R2: 'Topic-state input SHALL bind canonical identity and materialize plan, seed, and enrichment intent',
  B3R3: 'Sanctioned lifecycle windows SHALL authorize every canonical topic mutation',
  B4R1: 'Topic-state operations SHALL NOT touch non-topic authority surfaces',
  B4R2: 'Wave projection packets SHALL be the one strict seed-projection write seam',
  B4R3: 'Projection apply SHALL be authorized inside the route-bound loaded Wave phase with exact slot postconditions',
  B4R4: 'Layout mutation and post-final reentry SHALL stay bounded sanctioned operations',
};

const paraMap = {
  B3R1: ['The framework SHALL expose one helper', 'For `mutate_layout`, the same workspace', 'Recovery SHALL be explicit', 'The caller SHALL retain the explicit apply-input file', 'The prepared manifest SHALL record'],
  B3R2: ['When an accepted `add_topic` entry', 'When an existing UID-bound seed', '`apply` SHALL additionally accept one mutually exclusive `enrich_seed`', 'For `enrich_seed`, the Engine SHALL resolve', 'Canonical binding equality SHALL mean', 'Before rendering `enrich_seed`', 'One apply input SHALL contain exactly one of', 'Existing pre-v0.50 seeds', 'The topic-state input/result contract SHALL use schema version'],
  B3R3: ['For sanctioned rerun only, every `add_topic`', 'The topic-state input schema SHALL validate direction structure', 'Rerun apply SHALL render/replace exactly one canonical', 'For layout mutation, `affected_topic_uids`', 'Before workspace creation, `apply` SHALL authorize mutation', 'Post-final rerun apply SHALL be authorized', '`set_rerun_direction` and `mutate_layout` SHALL be authorized', '`update_intent`, `set_rerun_direction` and `mutate_layout` SHALL reject'],
  B4R1: ['Topic-state operations SHALL NOT mutate queue', '`operate-topic-state` SHALL expose a read-only', 'The only non-help topic-state forms'],
  B4R2: ['The existing `apply` seam SHALL additionally admit', 'When `apply` reaches the existing Zod input validator'],
  B4R3: ['Projection apply SHALL be authorized only inside', 'Every slot selected by a packet', 'Before prepared publication, the staged'],
  B4R4: ['The only layout operation SHALL be', 'When a committed topic-state operation changes', 'ReopenResearchPass SHALL widen only'],
};

const scenMap = {
  B3R1: ['Crash after a partial accepted commit resumes exact bytes', 'Crash after plan replacement resumes exact seed bytes', 'Unchanged listed topic does not widen quiescence', 'Byte-identical target is workspace-free', 'Crash before prepared publication is not overclaimed', 'Late drift is not overwritten or deleted', 'Late drift is not overwritten', 'Accepted recovery survives lifecycle drift', 'Writer postcondition fails closed'],
  B3R2: ['Historical mutable plan stops at inspect boundary', 'Legacy migration input has no writer path', 'Registry-external topic requires explicit adoption', 'Multi-topic approval is one accepted change set', 'Rerun add commits complete seed skeleton and direction before descendant work', 'New seed uses accepted wave-specific placeholders only', 'Existing seed enrichment survives canonical mutation', 'Structured enrichment accepts only Agent-owned fields', 'Canonical or unknown input key fails before write', 'Lexical body suffix survives enrichment', 'Parsed canonical values survive YAML round trip', 'Must-answer drift is reported and repaired before completion', 'Unparseable frontmatter does not trigger guessed salvage', 'Current seed task does not block its enrichment writer', 'Legacy duplicate body remains non-authoritative', 'Topic-state minor contract remains additive'],
  B3R3: ['Active work blocks semantic, direction, or layout mutation', 'Active work blocks semantic mutation', 'Legal HITL1 window authorizes initial materialization', 'Sanctioned rerun authorizes canonical mutation forms', 'Sanctioned rerun authorizes migration and refinement', 'Post-final recovery witness authorizes existing topic operations', 'Layout mutation preserves historical content coordinates', 'Forged or stale rerun context cannot mutate', 'Post-final topic recovery retains complete original witness', 'Direction-only supplement does not fake intent mutation', 'Rerun direction mapping fails before workspace publication', 'Setup and rerun entries authorize seed enrichment', 'Generic inspect does not mint a Seed Topics writer'],
  B4R1: ['Schema projection is discoverable but cannot authorize mutation', 'Refined form is not advertised without real-schema verification', 'Help never evaluates topic state', 'Packet transaction does not rewrite plan authority', 'Packet transaction does not rewrite profile authority'],
  B4R2: ['Packet uses the existing atomic writer', 'Invalid apply gives safe field-level feedback before workspace creation', 'Wave projection discriminator feedback is context-precise', 'A multi-Wave slot does not broaden a selected Wave\'s value', 'Wave0 entry uses its contribution-owned ordinal', 'Packet cannot select another Wave\'s slot', 'Current authority identity is required', 'Missing reference reports one actionable writer root', 'Existing malformed neighbor blocks publication', 'Rerun is idempotent and Wave2 preserves Wave1 questions', 'Legal packet atomically upgrades its declared legacy heading', 'Repeated readable headings are not a writable target'],
  B4R3: ['Projection authorization does not create a new lifecycle'],
  B4R4: ['Unrecognized layout remains read-compatible but is not guessed', 'Bounded layout mutation uses the existing authority path', 'Layout mutation reports missing TopicTreeEvolution layout mutation capability', 'Historical topic removal remains blocked', 'Human-directed request does not bypass reentry', 'Post-final apply requires committed ReopenResearchPass reentry', 'Post-final apply remains unavailable', 'Post-final reentry does not adopt topics by itself', 'No length change does not invent style work', 'Structured style handoff retains the existing writer'],
};

function splitBlock(startLine, endLine) {
  const body = lines.slice(startLine + 1, endLine); // without heading
  // top-level blocks: split on blank lines; paragraphs/lists/tables/scenarios
  const units = [];
  let cur = null;
  for (const l of body) {
    if (l.trim() === '') { if (cur) { units.push(cur); cur = null; } continue; }
    if (l.startsWith('#### Scenario: ')) { if (cur) units.push(cur); cur = [l]; continue; }
    if (!cur) cur = [l]; else cur.push(l);
  }
  if (cur) units.push(cur);
  for (const u of units) { while (u.length && u[u.length - 1].trim() === '') u.pop(); }
  // 松散列表（空行分隔的 bullet 块）无条件并回前一个单元（场景标题除外）
  const merged = [];
  for (const u of units) {
    if (merged.length && !u[0].startsWith('#### Scenario: ') && (u[0].startsWith('- ') || u[0].startsWith('> '))) {
      merged[merged.length - 1].push(...u);
    } else merged.push(u);
  }
  units.length = 0; units.push(...merged);
  const prose = units.filter(u => !u[0].startsWith('#### Scenario: '));
  const scen = units.filter(u => u[0].startsWith('#### Scenario: '));
  const nameOf = u => u[0].slice('#### Scenario: '.length);
  const assignedP = new Map(); const assignedS = new Map();
  for (const p of prose) {
    const grp = Object.keys(paraMap).find(k => paraMap[k].some(pre => p[0].startsWith(pre)));
    if (!grp) throw new Error('unmapped prose block: ' + JSON.stringify(p[0].slice(0, 70)));
    if (!assignedP.has(grp)) assignedP.set(grp, []);
    assignedP.get(grp).push(p);
  }
  for (const s of scen) {
    const name = nameOf(s);
    const grp = Object.keys(scenMap).find(k => scenMap[k].includes(name));
    if (!grp) throw new Error('unmapped scenario: ' + name);
    if (assignedS.has(name)) throw new Error('duplicate scenario: ' + name);
    if (!assignedS.has(grp)) assignedS.set(grp, []);
    assignedS.get(grp).push(s);
  }
  return { prose: assignedP, scen: assignedS, proseCount: prose.length, scenCount: scen.length };
}

function blockRange(heading) {
  const start = lines.indexOf(heading);
  if (start === -1) throw new Error('heading not found: ' + heading);
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) if (lines[i].startsWith('### Requirement: ')) { end = i; break; }
  while (end > start && lines[end - 1].trim() === '') end--;
  return [start, end];
}

const oldHeadings = [
  '### Requirement: Canonical topic mutation SHALL atomically materialize plan and seed intent',
  '### Requirement: Topic-state operations SHALL preserve scope and authority boundaries',
];

const out = ['## REMOVED Requirements', ''];
const newLines = [];
let totalScen = 0;
for (const oh of oldHeadings) {
  const [s, e] = blockRange(oh);
  out.push(...lines.slice(s, e), '');
  newLines.push(...lines.slice(s, e).filter(l => l.trim() !== '' && !l.startsWith('### Requirement: ')));
}
out.push('## ADDED Requirements', '');
for (const key of Object.keys(headings)) {
  const [s, e] = blockRange(oldHeadings[key.startsWith('B3') ? 0 : 1]);
  const { prose, scen } = splitBlock(s, e);
  out.push('### Requirement: ' + headings[key], '');
  newLines.push('### Requirement: ' + headings[key]);
  for (const p of (prose.get(key) || [])) { out.push(...p, ''); newLines.push(...p); }
  for (const name of (scenMap[key] || [])) {
    const u = (scen.get(key) || []).find(x => x[0].slice('#### Scenario: '.length) === name);
    if (!u) throw new Error('scenario declared but not found in block: ' + name);
    out.push(...u, ''); newLines.push(...u); totalScen++;
  }
  while (out.length && out[out.length - 1].trim() === '') out.pop();
  out.push('');
}
const content = arr => arr.filter(l => l.trim() !== '' && !l.startsWith('### Requirement: ') && !l.startsWith('## '));
const count = arr => { const m = new Map(); for (const l of arr) m.set(l, (m.get(l) || 0) + 1); return m; };
const remIdx = out.indexOf('## REMOVED Requirements');
const addIdx = out.indexOf('## ADDED Requirements');
const rLines = content(out.slice(remIdx, addIdx));
const aLines = content(out.slice(addIdx));
const a = count(rLines);
const b = count(aLines);
let bad = 0;
for (const [l, c] of a) if ((b.get(l) || 0) !== c) { bad++; if (bad < 4) console.error('MISSING:', JSON.stringify(l.slice(0, 70))); }
for (const [l, c] of b) if ((a.get(l) || 0) !== c) { bad++; if (bad < 4) console.error('EXTRA:', JSON.stringify(l.slice(0, 70))); }
if (bad) throw new Error('conservation failed: ' + bad + ' | removed=' + rLines.length + ' added=' + aLines.length);
const dir = 'openspec/changes/2026-09-01-slim-cts-requirements/specs/research/canonical-topic-state';
mkdirSync(dir, { recursive: true });
writeFileSync(dir + '/spec.md', out.join('\n') + '\n');
console.log('delta OK: 2 blocks removed, 7 added, scenarios mapped:', totalScen, ', conservation 100%');
