// check-project-reqs.mjs — 项目级 Requirement ID registry 一致性检查
// Usage: node check-project-reqs.mjs [projectRoot]
//
// Requirement ID 只有一个硬约束: 全局唯一, 只增不删, 永不复用 (openspec/governance/req-registry.yaml)。
// 一个 id 有三种合法存在状态, 三态都不是则为 "孤儿" (疑似丢失/漏 sync):
//   alive   — 出现在 openspec/specs/ (OpenSpec main spec, 当前要构建的)
//   pending — 出现在 openspec/changes/<active>/specs/ (未归档 change 的 delta)
//   retired — 在 openspec/governance/req-registry.yaml 该行标记 [DEPRECATED] (合法废弃, id 占位永不复用)
//
// 四项检查:
//   1. duplicate      — 同一 id 被 ≥2 个不同的 main spec 文件 **声明** (归属冲突)
//   2. unregistered   — 出现在 specs/delta 但 registry 没有 (BUG-\d+ 是 bug ID, 不是 req ID, 不参与)
//   3. orphan         — registry 有, 但三态都不是 (静默丢失探测器)
//   4. reusedRetired  — 未归档 change **声明** 了已 [DEPRECATED] 的 id (禁止旧 id 指新语义)
//
// 声明 vs 引用: 只有 `> req: XXX-001, ...` 头部行算"声明"(归属)。正文 prose 里的
// 交叉引用 (如 "see GSK-002"、"per WNC-009") 只算"引用"——引用参与 unregistered/orphan
// 存在性判定, 但不参与 duplicate/reusedRetired 归属判定。

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

const root = process.argv[2] || process.cwd();
const registryPath = join(root, 'openspec', 'governance', 'req-registry.yaml');
const specsDir = join(root, 'openspec', 'specs');
const changesDir = join(root, 'openspec', 'changes');

if (!existsSync(registryPath)) {
  console.error('Registry not found:', registryPath);
  process.exit(1);
}

const registry = parseYaml(readFileSync(registryPath, 'utf-8'));
const ID_RE = /^[A-Z]{3}-\d{3}$/;
const allEntries = Object.entries(registry).filter(([k]) => ID_RE.test(k));
const retired = new Set(
  allEntries.filter(([, v]) => String(v).toUpperCase().includes('DEPRECATED')).map(([k]) => k),
);
const registered = new Set(allEntries.map(([k]) => k));

function stripFencedCodeBlocks(content) {
  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  const output = [];
  let activeFence = null;

  for (const line of lines) {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})(.*)$/);
    if (!activeFence) {
      if (fenceMatch) {
        activeFence = {
          marker: fenceMatch[1][0],
          length: fenceMatch[1].length,
        };
        output.push('');
      } else {
        output.push(line);
      }
      continue;
    }

    output.push('');
    const closingMatch = line.match(/^\s*(`{3,}|~{3,})\s*$/);
    if (
      closingMatch &&
      closingMatch[1][0] === activeFence.marker &&
      closingMatch[1].length >= activeFence.length
    ) {
      activeFence = null;
    }
  }

  return output.join('\n');
}

// 分别收集 main spec 和未归档 change delta 的 id + 来源文件。
// 每条 occurrence 标记 declared: true (出现在 `> req:` 头部行) 或 false (prose 引用)。
const REQ_HEADER_RE = /^\s*>\s*req:\s*(.+)$/;
const BUG_ID_RE = /^BUG-\d+$/;

const specOccurrences = [];
const deltaOccurrences = [];
function walkInto(dir, sink) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkInto(full, sink);
    else if (entry.name.endsWith('.md')) {
      const content = stripFencedCodeBlocks(readFileSync(full, 'utf-8'));
      for (const line of content.split('\n')) {
        const headerMatch = line.match(REQ_HEADER_RE);
        const declared = headerMatch !== null;
        for (const m of line.matchAll(/[A-Z]{3}-\d{3}/g)) {
          if (BUG_ID_RE.test(m[0])) continue; // bug ID, 不是 req ID
          sink.push({ id: m[0], file: full, declared });
        }
      }
    }
  }
}

walkInto(specsDir, specOccurrences);
if (existsSync(changesDir)) {
  for (const entry of readdirSync(changesDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === 'archive') continue;
    const deltaSpecs = join(changesDir, entry.name, 'specs');
    if (!existsSync(deltaSpecs)) continue;
    const before = deltaOccurrences.length;
    walkInto(deltaSpecs, deltaOccurrences);
  }
}

const specIdSet = new Set(specOccurrences.map((o) => o.id));
const deltaIdSet = new Set(deltaOccurrences.map((o) => o.id));
const allSeen = new Set([...specIdSet, ...deltaIdSet]);
const deltaDeclaredSet = new Set(deltaOccurrences.filter((o) => o.declared).map((o) => o.id));

// 1. duplicate: 同一 id 被 ≥2 个不同 main spec 文件**声明**归属 (prose 交叉引用不算)
const specIdFiles = new Map();
for (const { id, file, declared } of specOccurrences) {
  if (!declared) continue;
  if (!specIdFiles.has(id)) specIdFiles.set(id, new Set());
  specIdFiles.get(id).add(file);
}
const duplicates = [...specIdFiles.entries()].filter(([, files]) => files.size > 1).map(([id]) => id);

// 2. unregistered: 声明与引用都参与 (typo 探测); BUG-\d+ 已在收集时排除
const unregistered = [...allSeen].filter((id) => !registered.has(id));
// 3. orphan (三态都不是): 声明与引用都算存在证据
const orphans = [...registered].filter(
  (id) => !retired.has(id) && !specIdSet.has(id) && !deltaIdSet.has(id),
);
// 4. reused retired: 未归档 change **声明**了 [DEPRECATED] id (delta prose 提及历史不算)
const reusedRetired = [...deltaDeclaredSet].filter((id) => retired.has(id));

let failed = false;
if (duplicates.length > 0) {
  console.error('Duplicate IDs (same id in ≥2 spec files):');
  for (const id of duplicates) {
    const files = [...specIdFiles.get(id)].map((f) => f.replace(root + '/', ''));
    console.error(`  ${id}: ${files.join(', ')}`);
  }
  failed = true;
}
if (unregistered.length > 0) {
  console.error('Unregistered IDs (in specs/delta but not in registry):', unregistered.join(', '));
  failed = true;
}
if (orphans.length > 0) {
  console.error('Orphan IDs (in registry but not alive / pending / retired):');
  for (const id of orphans) console.error(`  ${id}: ${String(registry[id]).trim()}`);
  console.error('  合法废弃 → 在 openspec/governance/req-registry.yaml 该行加 [DEPRECATED];疑似丢失 → 从 archive 找回或重建正文进 main spec。');
  failed = true;
}
if (reusedRetired.length > 0) {
  console.error('Reused retired IDs (active change re-adds a [DEPRECATED] id):', reusedRetired.join(', '));
  failed = true;
}
if (failed) process.exit(1);

console.log(
  `All project requirement IDs consistent: ${registered.size} registered` +
  ` (${retired.size} retired, ${orphans.length} orphan), ${specOccurrences.length + deltaOccurrences.length} occurrences in main specs/active deltas.`,
);
