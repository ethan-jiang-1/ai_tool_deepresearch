#!/usr/bin/env node
// drift-resync-metrics-snapshot.mjs — 计划 `drift-resync-locks-hygiene-and-work-unit-deepening` 的
// 配套度量快照工具（非 authority、非框架面，随 plan 存放）。纯 Node 内置，无依赖，只读。
// 用法: node _backlog/plans/drift-resync-metrics-snapshot.mjs [projectRoot]
// 输出: markdown 度量表（stdout），粘贴进 plan 的快照节。每次测量口径完全一致，保证 before/after 可比。

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = process.argv[2] ? resolve(process.argv[2]) : process.cwd();

function walk(dir, out = [], filter = () => true) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir).sort()) {
    if (name === 'node_modules' || name === '.git') continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out, filter);
    else if (filter(p)) out.push(p);
  }
  return out;
}
const countLines = (p) => readFileSync(p, 'utf8').split('\n').length;
const countMatches = (text, re) => (text.match(re) || []).length;

// ── 1. Spec 层 ─────────────────────────────────────────────
const specFiles = walk(join(ROOT, 'openspec/specs'), [], (p) => p.endsWith('.md'));
const guidanceFiles = walk(join(ROOT, 'openspec/guidance'), [], (p) => p.endsWith('.md'));
let specLines = 0, specReq = 0, specScen = 0;
const perSpec = [];
for (const f of specFiles) {
  const t = readFileSync(f, 'utf8');
  const lines = countLines(f);
  const req = countMatches(t, /^### Requirement:/gm);
  const scen = countMatches(t, /^#### Scenario:/gm);
  specLines += lines; specReq += req; specScen += scen;
  perSpec.push({ f: relative(ROOT, f), lines, req, scen });
}
perSpec.sort((a, b) => b.lines - a.lines);
const top10 = perSpec.slice(0, 10);
// 巨型场景墙（单 requirement ≥20 场景）
const walls = [];
for (const { f, lines: _l, req: _r, scen: _s } of perSpec) {
  const t = readFileSync(join(ROOT, f), 'utf8');
  const blocks = t.split(/^### Requirement:/m).slice(1);
  for (const b of blocks) {
    const n = countMatches(b, /^#### Scenario:/gm);
    if (n >= 20) {
      walls.push({ f, title: b.split('\n')[0].trim().slice(0, 60), n });
    }
  }
}
walls.sort((a, b) => b.n - a.n);

// ── 2. Engine 层 ───────────────────────────────────────────
const engineFiles = walk(join(ROOT, 'DEEP_RESEARCH_HARNESS/engine'), [], (p) => p.endsWith('.mjs'));
let engineLines = 0;
const perEngine = [];
for (const f of engineFiles) {
  const lines = countLines(f);
  engineLines += lines;
  perEngine.push({ f: relative(ROOT, f), lines });
}
perEngine.sort((a, b) => b.lines - a.lines);
const wuFiles = perEngine.filter((e) => /work-unit-/.test(e.f));

// ── 3. 词汇锁与守卫 ────────────────────────────────────────
const schemaText = walk(join(ROOT, 'DEEP_RESEARCH_HARNESS/schema'), [], (p) => p.endsWith('.mjs'))
  .map((p) => readFileSync(p, 'utf8')).join('\n');
const engineText = engineFiles.map((p) => readFileSync(p, 'utf8')).join('\n');
const allEngineSchema = schemaText + engineText;
const zodEnumCount = countMatches(schemaText, /z\.enum\(/g);
const frozenCount = countMatches(allEngineSchema, /Object\.freeze\(\[/g);
const lock = (needle) => allEngineSchema.includes(needle);
const governanceChecks = walk(join(ROOT, 'openspec/governance'), [], (p) => /check-.*\.mjs$/.test(p)).length;
const testFiles = walk(join(ROOT, 'tests'), [], (p) => p.endsWith('.test.mjs'));
let testScen = 0;
for (const f of testFiles) testScen += countMatches(readFileSync(f, 'utf8'), /\btest\(/g);

// ── 4. 计划专属进度探针（C1–C4 落地后翻转） ────────────────
const probes = {
  'C1: spec 复述 `semantic_boundary` 作 gate-hint kind': (() => { const p = join(ROOT, 'openspec/specs/engine/check-inspect-feedback/spec.md'); if (!existsSync(p)) return 'CLEARED/ABSENT'; const t = readFileSync(p, 'utf8'); return (t.includes('`semantic_boundary`') && /gate-hint\s+kinds/.test(t)) ? 'OPEN(残渣仍在)' : 'CLEARED/ABSENT'; })(),
  'C2: WORK_UNIT_ATTEMPT_DISPOSITIONS 导出存在': lock('WORK_UNIT_ATTEMPT_DISPOSITIONS') ? 'PRESENT' : 'ABSENT',
  'C2: WORK_UNIT_CANDIDATE_PROJECTION_ACTIONS 提升存在': lock('WORK_UNIT_CANDIDATE_PROJECTION_ACTIONS') ? 'PRESENT' : 'ABSENT',
  'C2: 新治理 checker 存在': existsSync(join(ROOT, 'openspec/governance/check-spec-enum-restatements.mjs')) ? 'PRESENT' : 'ABSENT',
  'C2: 死代码 allowNonceNormalization 残留': engineText.includes('allowNonceNormalization') ? 'PRESENT(死代码未清)' : 'CLEARED',
  'C2: 死代码 receipt_binding_identity_autofilled 残留': engineText.includes('receipt_binding_identity_autofilled') ? 'PRESENT(死代码未清)' : 'CLEARED',
  'C2: forcedTimeoutAudit 携带 preflight_candidate_projection': /preflight_candidate_projection/.test(engineText) ? 'PRESENT' : 'ABSENT(未实现)',
  'C2/B4: actor 自由文本字段已改名 actor_guidance': engineText.includes('actor_guidance') ? 'RENAMED' : 'NOT-YET',
  'C4: snapshot 模块已提取': engineFiles.some((p) => p.endsWith('work-unit-submit-snapshot.mjs')) ? 'DONE' : 'NOT-YET',
  'C4: late-retry 模块已提取': engineFiles.some((p) => p.endsWith('work-unit-submit-late-retry.mjs')) ? 'DONE' : 'NOT-YET',
  'C4: declaration-recovery 模块已提取': engineFiles.some((p) => p.endsWith('work-unit-submit-declaration-recovery.mjs')) ? 'DONE' : 'NOT-YET',
  'C4: transaction-primitives/projection 已分层': engineFiles.some((p) => p.endsWith('work-unit-transaction-primitives.mjs')) ? 'DONE' : 'NOT-YET',
};

// ── 输出 ───────────────────────────────────────────────────
const L = [];
L.push('## 度量快照（机器口径，重复运行可比）');
L.push('');
L.push('| # | 指标 | 值 |');
L.push('|---|---|---|');
L.push(`| 1 | spec 文件数 | ${specFiles.length} |`);
L.push(`| 2 | spec 总行数 | ${specLines} |`);
L.push(`| 3 | requirement 总数 | ${specReq} |`);
L.push(`| 4 | scenario 总数 | ${specScen} |`);
L.push(`| 5 | guidance md 文件数 | ${guidanceFiles.length} |`);
L.push(`| 6 | Top-10 最重 spec 合计行数 | ${top10.reduce((s, x) => s + x.lines, 0)} |`);
L.push(`| 7 | 单 requirement ≥20 场景的"场景墙"数 | ${walls.length}（合计 ${walls.reduce((s, x) => s + x.n, 0)} 场景） |`);
L.push(`| 8 | engine .mjs 文件数 / 总行数 | ${engineFiles.length} / ${engineLines} |`);
L.push(`| 9 | work-unit-* 模块数 | ${wuFiles.length} |`);
L.push(`| 10 | 最大 engine 文件行数 | ${perEngine[0].f} = ${perEngine[0].lines} |`);
L.push(`| 11 | schema z.enum 数 / 冻结数组数（词汇锁广度） | ${zodEnumCount} / ${frozenCount} |`);
L.push(`| 12 | governance check 数 | ${governanceChecks} |`);
L.push(`| 13 | tests/**/*.test.mjs 文件数 / test() 调用数 | ${testFiles.length} / ${testScen} |`);
L.push('');
L.push('### Top-10 最重 spec');
L.push('');
L.push('| spec | 行 | req | scen |');
L.push('|---|---|---|---|');
for (const x of top10) L.push(`| ${x.f.replace('openspec/specs/', '')} | ${x.lines} | ${x.req} | ${x.scen} |`);
L.push('');
L.push('### 场景墙（单 requirement ≥20 场景）');
L.push('');
if (walls.length === 0) L.push('（无）');
else {
  L.push('| spec / requirement | 场景数 |');
  L.push('|---|---|');
  for (const w of walls) L.push(`| ${w.f.replace('openspec/specs/', '')} → ${w.title} | ${w.n} |`);
}
L.push('');
L.push('### Top-5 最大 engine 文件');
L.push('');
L.push('| 文件 | 行 |');
L.push('|---|---|');
for (const x of perEngine.slice(0, 5)) L.push(`| ${x.f} | ${x.lines} |`);
L.push('');
L.push('### 计划进度探针');
L.push('');
L.push('| 探针 | 状态 |');
L.push('|---|---|');
for (const [k, v] of Object.entries(probes)) L.push(`| ${k} | ${v} |`);
console.log(L.join('\n'));
